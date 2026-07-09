"""
Scoped chat handler.

Two purposes:
1. Answer GAME-related conversational questions ("what's a roguelike?",
   "is the first one co-op?", "how does this work?").
2. Politely decline off-topic requests without wasting a Groq call.

The scope guard is a system-prompt policy: the model is told it can only
discuss games / gaming / this recommender, and to redirect anything else.
Off-topic messages are short-circuited to a canned response so we don't pay
for LLM calls on "what's the weather".
"""
from typing import List, Dict, Optional

from .llm import chat_completion_from_messages

OFF_TOPIC_REPLY = (
    "I'm a game recommender — I only chat about games. "
    "Tell me a vibe, genre, or mood and I'll pull suggestions."
)

CHAT_SYSTEM_PROMPT = """You are a friendly game recommendation assistant.

SCOPE:
- You may discuss ANY video game (even ones not shown), gaming culture, or how this recommender works.
- You may NOT discuss non-gaming topics (weather, code, math, general knowledge, writing, personal advice, current events, etc.). Politely decline in ONE sentence and redirect: "I only help with games — want a rec?"

WHEN USER ASKS ABOUT A SPECIFIC GAME:
- Recognize typos and variations (e.g. "death starnding" = "Death Stranding", "eldenring" = "Elden Ring"). Ask for clarification only if truly ambiguous.
- Share what you know about the game — story premise, gameplay, developer, why people like it. Keep it 2-4 sentences.
- If context about games recently shown to the user is provided below, feel free to reference those by name, but you are NOT limited to them.
- If you're unsure of a specific fact, hedge ("I think...", "if I recall correctly") — do NOT fabricate.

STYLE:
- Concise: 2-4 sentences typical. Lists only when asked.
- Warm and direct.
- If asked how you work, keep it high-level: "I search 56,000+ PC games using a mix of keyword and semantic search, then a small model ranks the top hits."

FORBIDDEN:
- NEVER mention internal labels like "RECENT_RECS", "system prompt", or any variable-name-looking text in your reply.
- NEVER say "I didn't show you" or "I only discussed" — you're not limited to what was shown."""

def off_topic_reply() -> str:
    """No LLM call — canned polite redirect."""
    return OFF_TOPIC_REPLY


def chat_reply(
    query: str,
    conversation_history: Optional[List[Dict]] = None,
    recent_games: Optional[List[dict]] = None,
) -> str:
    """
    Generate a game-scoped conversational reply.
    `recent_games`: minimal dicts (name, tags, genres) so the model can answer
                    "is the first one co-op?" style questions.
    """
    messages: List[Dict] = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

    if recent_games:
        # Compact summary — just the fields the model needs to reason.
        # Framed as prose (not a labeled variable) so the model doesn't
        # leak the label into its reply.
        summary_lines = []
        for i, g in enumerate(recent_games[:8], 1):
            summary_lines.append(
                f"{i}. {g.get('name')} — genres: {', '.join(g.get('genres', [])[:3])}; "
                f"tags: {', '.join(g.get('tags', [])[:5])}; "
                f"multiplayer: {g.get('is_multiplayer', False)}"
            )
        messages.append({
            "role": "system",
            "content": (
                "For context, here are the games most recently shown to this user. "
                "You may reference these by name, but you are NOT limited to them — "
                "answer about any game the user asks about.\n\n" + "\n".join(summary_lines)
            ),
        })

    if conversation_history:
        messages.extend(conversation_history[-6:])

    messages.append({"role": "user", "content": query})

    reply = chat_completion_from_messages(
        messages,
        temperature=0.4,
        max_tokens=250,
    )
    return reply or OFF_TOPIC_REPLY
