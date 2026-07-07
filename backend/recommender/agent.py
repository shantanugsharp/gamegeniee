"""
Conversation orchestrator.

Ties the whole pipeline together:
    query
      → slot extraction (Groq)
      → clarify OR
          → hard filters + profile blend → hybrid retrieve → rerank
          → rationale generation (Groq)
          → mark seen
"""
from typing import Optional, List, Dict

import random
import numpy as np

from .profile import Profile
from .retrieval import Retriever
from .slots import extract_slots
from .explain import (
    generate_rationales,
    explain_game_for_user,
    explain_genre as _explain_genre_llm,
    taste_summary as _taste_summary_llm,
)
from .chat import chat_reply, off_topic_reply


class Agent:
    def __init__(self, retriever: Retriever, profile: Profile):
        self.retriever = retriever
        self.profile = profile

    def respond(
        self,
        user_id: str,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
        recent_games: Optional[List[dict]] = None,
        top_n: int = 8,
    ) -> dict:
        # 1. Slot extraction + intent classification (one Groq call)
        slots = extract_slots(query, conversation_history)
        intent = slots.get("intent", "recommend")

        # 2a. Off-topic — canned reply, zero LLM cost
        if intent == "off_topic":
            return {
                "type": "chat",
                "message": off_topic_reply(),
                "slots": slots,
                "recommendations": [],
            }

        # 2b. In-scope chat — game-related conversation, followups, meta
        if intent == "chat":
            reply = chat_reply(query, conversation_history, recent_games)
            return {
                "type": "chat",
                "message": reply,
                "slots": slots,
                "recommendations": [],
            }

        # 3. Clarify path (recommend intent but query too vague)
        if slots.get("clarify"):
            return {
                "type": "clarify",
                "message": slots["clarify"],
                "slots": slots,
                "recommendations": [],
            }

        # 3. Filters + profile vector
        fb = self.profile.get_feedback(user_id)
        filters = {
            "multiplayer": slots.get("multiplayer"),
            "singleplayer": slots.get("singleplayer"),
            "platform": slots.get("platform"),
            "price_max": slots.get("price_max"),
            "genres": slots.get("genres"),
            "tier": slots.get("tier"),
            "avoid_tags": slots.get("avoid_tags"),
            "avoid_app_ids": fb.get("dislike", []),
        }
        pref = self.profile.preference_vector(
            user_id,
            self.retriever.embeddings,
            self.retriever.app_id_to_row,
        )

        # 4. Retrieve
        search_text = slots.get("search_text") or query
        recs = self.retriever.search(
            search_text,
            filters=filters,
            preference_vec=pref,
            top_n=top_n,
        )

        # 5. Rationales
        liked_names: List[str] = []
        for aid in fb.get("like", [])[:5]:
            row = self.retriever.app_id_to_row.get(aid)
            if row is not None:
                liked_names.append(str(self.retriever.games.iloc[row]["name"]))

        rationales = generate_rationales(query, recs, liked_game_names=liked_names)
        for r, rat in zip(recs, rationales):
            r["rationale"] = rat

        # 6. Mark seen
        for r in recs:
            self.profile.record(user_id, r["app_id"], "seen")

        return {
            "type": "recommendations",
            "message": f"Found {len(recs)} games matching your request.",
            "slots": slots,
            "recommendations": recs,
        }

    # ---------- New AI features ----------

    def surprise(self, filters: Optional[dict] = None) -> Optional[dict]:
        """Pick one random game, popularity-weighted, respecting optional filters."""
        mask = self.retriever.apply_filters(filters or {})
        df = self.retriever.games
        allowed_indices = df.index if mask is None else df.index[mask]
        if len(allowed_indices) == 0:
            return None
        pos = df.loc[allowed_indices, "positive_reviews"].values.astype(float)
        weights = np.log1p(pos)
        s = weights.sum()
        if s <= 0:
            picked = int(random.choice(list(allowed_indices)))
        else:
            picked = int(np.random.choice(list(allowed_indices), p=weights / s))
        return self.retriever._row_to_dict(picked, 1.0)

    def explain_game(self, user_id: str, slug: str) -> Optional[dict]:
        game = self.retriever.get_by_slug(slug)
        if not game:
            return None
        fb = self.profile.get_feedback(user_id)
        liked = []
        for aid in fb.get("like", [])[:5]:
            row = self.retriever.app_id_to_row.get(aid)
            if row is not None:
                liked.append(self.retriever._row_to_dict(row, 1.0))
        pitch = explain_game_for_user(game, liked)
        return {"game": game, "pitch": pitch}

    def explain_genre(self, genre: str) -> dict:
        # Grab top 5 highest-rated games in this genre as canonical examples
        wanted = genre.lower()
        matches: List[int] = []
        for i, s in enumerate(self.retriever._genre_tag_sets):
            if wanted in s or any(wanted in t for t in s):
                matches.append(i)
        examples: List[dict] = []
        if matches:
            top = sorted(
                matches,
                key=lambda i: -int(self.retriever.games.iloc[i]["positive_reviews"]),
            )[:5]
            examples = [self.retriever._row_to_dict(i, 1.0) for i in top]
        explanation = _explain_genre_llm(genre, examples)
        return {"genre": genre, "explanation": explanation, "examples": examples}

    def taste_summary(self, user_id: str) -> dict:
        fb = self.profile.get_feedback(user_id)
        liked_ids = fb.get("like", [])
        liked_games = []
        for aid in liked_ids:
            row = self.retriever.app_id_to_row.get(aid)
            if row is not None:
                liked_games.append(self.retriever._row_to_dict(row, 1.0))
        summary = _taste_summary_llm(liked_games)
        return {
            "count": len(liked_ids),
            "summary": summary,
            "liked": liked_games,
        }
