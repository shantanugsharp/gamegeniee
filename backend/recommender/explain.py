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
import os
from typing import List, Optional

from groq import Groq

MODEL = "llama-3.3-70b-versatile"

_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set in env")
        _client = Groq(api_key=api_key)
    return _client


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
        resp = _get_client().chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=800,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        by_id = {int(r["id"]): str(r["text"]) for r in data.get("rationales", []) if "id" in r and "text" in r}
    except (json.JSONDecodeError, KeyError, ValueError):
        by_id = {}

    fallback = f'Matches your search: "{query}".'
    return [by_id.get(i, fallback) for i in range(len(games))]
