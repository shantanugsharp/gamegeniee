"""
Query → structured slots via Groq (Llama 3.3 70B).

Concepts:
- LLMs are excellent at structured extraction if you describe the schema clearly
  and use JSON mode. Groq's JSON mode guarantees valid JSON syntax; the schema
  itself we enforce by describing it in the system prompt.
- `search_text` is the "cleaned up" query we feed to the embedding model.
  Rich, natural, includes implied concepts. E.g. "chill co-op puzzle" →
  "relaxing cooperative puzzle game with calm atmosphere".
- `clarify` lets the model ask ONE question back when the query is truly vague.
  We only surface this when it says so — otherwise recommend.
"""
import json
from typing import Optional, List, Dict

from .llm import chat_completion_from_messages


SYSTEM_PROMPT = """You are a game recommendation assistant. Parse each user message into a JSON object with EXACTLY these fields:

{
  "intent": "recommend" | "chat" | "off_topic",
    // "recommend"  -> user is describing a game they want / asking for suggestions
    // "chat"       -> user is asking about GAMES, gaming, this recommender, or a previous recommendation
    // "off_topic"  -> user is asking about something unrelated to games (weather, code, poetry, math, general knowledge, etc.)
  "search_text": string,           // REQUIRED if intent="recommend". Rich, natural restatement of what the user WANTS for semantic retrieval. NEVER include negated concepts here.
  "genres": string[],              // e.g. ["puzzle","roguelike","rpg","strategy","action","adventure","simulation","sports","racing","casual","indie","horror","platformer"]
  "mood": string | null,           // e.g. "relaxing","intense","cozy","dark","funny","atmospheric","competitive"
  "multiplayer": boolean | null,   // true if user wants co-op/multiplayer, false if solo-only, null if unclear
  "singleplayer": boolean | null,
  "platform": string | null,       // "Windows" | "Mac" | "Linux" | null
  "price_max": number | null,      // USD
  "session_length": string | null, // "short" | "long" | null
  "tier": string | null,           // "aaa" if user wants big-budget titles, "indie" if user wants indies, null otherwise
  "avoid_tags": string[],          // Concepts the user does NOT want. See NEGATION RULES below.
  "clarify": string | null         // ONE follow-up question if query is TOO vague; null otherwise
}

NEGATION RULES (very important):
- Watch for phrases like "not X", "no X", "avoid X", "without X", "except X", "hate X", "sick of X", "don't want X", "not like X", "nothing like X".
- Put the negated concept(s) into `avoid_tags` as short Steam-style tag words.
  Examples:
    "not resident evil"          -> avoid_tags: ["Horror", "Survival Horror", "Zombies"]
    "no zombies"                 -> avoid_tags: ["Zombies"]
    "action game, not horror"    -> avoid_tags: ["Horror"]
    "nothing like dark souls"    -> avoid_tags: ["Souls-like", "Difficult"]
    "no VR"                      -> avoid_tags: ["VR", "VR Only"]
    "avoid roguelikes"           -> avoid_tags: ["Roguelike", "Roguelite"]
- CRITICAL: Do NOT put the negated concept in `search_text`. If the user says "action game, not horror", `search_text` should be "action game" — never "action game not horror" (embeddings ignore "not" and will retrieve horror anyway).

INTENT RULES:
- "recommend": user is describing what they want to play, filtering, or asking for suggestions.
    Examples: "chill co-op puzzle", "something like Hades", "cheap RPG", "another one but easier", "give me an FPS".
- "chat": user is greeting, asking meta questions about how this works, asking about a previously-shown game,
    or talking about GAMES / gaming in general.
    Examples: "hi", "how does this work", "is that first one co-op?", "what's a roguelike?", "who made you",
              "which of these has the best story", "explain BM25", "what's your data source".
- "off_topic": anything NOT about games, gaming, or this app.
    Examples: "what's the weather", "write me a poem", "who is the president", "help me with my python code",
              "translate this", "tell me a joke", "2+2=?", "what should I eat".
- When in doubt between "recommend" and "chat", prefer "recommend" if a genre/mood/vibe is named.

Other rules:
- Only set `clarify` when intent="recommend" AND the query gives nothing to work with ("recommend a game", "surprise me").
- Return ONLY the JSON object. No prose."""


def extract_slots(query: str, conversation_history: Optional[List[Dict]] = None) -> dict:
    """
    Parse a user query into structured slots.

    conversation_history: recent turns as [{"role":"user"|"assistant","content": str}, ...]
                          (only the last ~6 are kept to bound tokens)
    """
    messages: List[Dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if conversation_history:
        messages.extend(conversation_history[-6:])
    messages.append({"role": "user", "content": query})

    raw = chat_completion_from_messages(
        messages,
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=400,
    ) or "{}"
    try:
        slots = json.loads(raw)
        if not isinstance(slots, dict):
            slots = {}
    except json.JSONDecodeError:
        slots = {}

    # Defaults + type normalisation
    intent = slots.get("intent")
    if intent not in ("recommend", "chat", "off_topic"):
        intent = "recommend"
    slots["intent"] = intent
    if not slots.get("search_text"):
        slots["search_text"] = query
    for b in ("multiplayer", "singleplayer"):
        v = slots.get(b)
        if isinstance(v, str):
            slots[b] = v.lower() in ("true", "yes")
    return slots
