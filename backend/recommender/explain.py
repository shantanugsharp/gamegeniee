"""
Generate a one-line rationale per recommended game, grounded on actual metadata.

Concepts:
- Grounding: we feed the LLM the game's real tags, genres, and (if any) the
  user's past likes. Without grounding, LLMs invent generic praise. With it,
  the rationale references *why* — tag matches, genre overlap, similarity to
  a previously-liked game.
- Batch, don't loop: one LLM call for all N rationales, not N calls. Cheaper
  and faster; the model sees the full slate and can differentiate rationales.
"""
import json
from typing import List, Optional

from .llm import chat_completion_from_messages


SYSTEM_PROMPT = (
    "You write concise, specific recommendation rationales grounded strictly in "
    "the game metadata provided. Never invent facts. Cite tags or genres by name. "
    "Each rationale is ONE sentence, max 20 words."
)


def generate_rationales(
    query: str,
    games: List[dict],
    liked_game_names: Optional[List[str]] = None,
) -> List[str]:
    if not games:
        return []

    liked_hint = ""
    if liked_game_names:
        liked_hint = f" The user previously liked: {', '.join(liked_game_names[:5])}."

    slate = [
        {
            "id": i,
            "name": g["name"],
            "genres": g.get("genres", [])[:3],
            "tags": g.get("tags", [])[:6],
            "multiplayer": g.get("is_multiplayer", False),
        }
        for i, g in enumerate(games)
    ]

    user_prompt = (
        f'User query: "{query}".{liked_hint}\n\n'
        "For each game, write ONE sentence (max 20 words) explaining why it fits. "
        "Reference specific tags or genres. If a past like is relevant, mention it briefly.\n\n"
        f"Games:\n{json.dumps(slate, indent=2)}\n\n"
        'Return JSON: {"rationales": [{"id": 0, "text": "..."}, ...]}'
    )

    try:
        raw = chat_completion_from_messages(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=800,
        )
        data = json.loads(raw or "{}")
        by_id = {int(r["id"]): str(r["text"]) for r in data.get("rationales", []) if "id" in r and "text" in r}
    except (json.JSONDecodeError, KeyError, ValueError):
        by_id = {}

    fallback = f'Matches your search: "{query}".'
    return [by_id.get(i, fallback) for i in range(len(games))]


# ---------- Personalized "Explain this game" pitch ----------
EXPLAIN_GAME_SYSTEM = (
    "You write specific, grounded 2-paragraph game pitches. Cite actual tags. "
    "No generic praise, no filler like 'in conclusion'."
)


def explain_game_for_user(game: dict, liked_games: Optional[List[dict]] = None) -> str:
    liked_hint = ""
    if liked_games:
        names = [g["name"] for g in liked_games[:5] if g.get("name")]
        if names:
            liked_hint = f"\nThe user previously liked: {', '.join(names)}."
    prompt = (
        f"Write a personalized 2-paragraph pitch for this game.\n\n"
        f"Game: {game['name']}\n"
        f"Genres: {', '.join(game.get('genres', []))}\n"
        f"Tags: {', '.join((game.get('tags') or [])[:10])}\n"
        f"Description: {game.get('short_description','')[:500]}\n"
        f"{liked_hint}\n\n"
        "Rules:\n"
        "- Paragraph 1 (50-70 words): what makes this game distinctive. Cite tags.\n"
        "- Paragraph 2 (50-70 words): whether it's a fit for THIS user. Reference past likes if relevant.\n"
        "- Ground every claim in the actual metadata.\n"
    )
    return chat_completion_from_messages(
        [
            {"role": "system", "content": EXPLAIN_GAME_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=400,
    )


# ---------- Genre deep-dive ----------
GENRE_EXPLAIN_SYSTEM = (
    "You explain video game genres clearly, concretely, and briefly. "
    "No abstract fluff. Real mechanics, real examples."
)


def explain_genre(genre_name: str, examples: Optional[List[dict]] = None) -> str:
    ex = ""
    if examples:
        names = [g["name"] for g in examples[:5] if g.get("name")]
        if names:
            ex = f"\nCanonical examples in our index: {', '.join(names)}."
    prompt = (
        f"Explain what a '{genre_name}' game is in 2 short paragraphs.\n"
        f"{ex}\n\n"
        "Rules:\n"
        "- Paragraph 1 (60-80 words): core definition — mechanics, structure, common themes.\n"
        "- Paragraph 2 (40-60 words): who tends to enjoy it and why.\n"
        "- Written for someone who's heard the term but doesn't know it deeply.\n"
        "- No 'in conclusion' phrases, no marketing tone."
    )
    return chat_completion_from_messages(
        [
            {"role": "system", "content": GENRE_EXPLAIN_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=400,
    )


# ---------- Taste summary ----------
TASTE_SUMMARY_SYSTEM = (
    "You write concise taste summaries in second person. "
    "Reference specific tags/themes that repeat across liked games. No fluff."
)


def taste_summary(liked_games: List[dict]) -> str:
    if not liked_games:
        return ("Give the genie a few thumbs-up and I'll figure out your taste.")
    if len(liked_games) < 5:
        return (
            f"You've liked {len(liked_games)} games so far — try a few more thumbs-up "
            "and I'll write you a proper taste profile."
        )
    lines = [
        f"- {g['name']} (tags: {', '.join((g.get('tags') or [])[:6])})"
        for g in liked_games[:15]
        if g.get("name")
    ]
    prompt = (
        "Write ONE paragraph (50-70 words) summarizing this gamer's taste based on liked games.\n\n"
        f"Liked games:\n" + "\n".join(lines) + "\n\n"
        "Rules:\n"
        "- Second person: 'You gravitate toward...'\n"
        "- Reference specific tags/vibes that repeat.\n"
        "- No 'overall', 'in conclusion', 'seems like'. Direct observations only."
    )
    return chat_completion_from_messages(
        [
            {"role": "system", "content": TASTE_SUMMARY_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=200,
    )
