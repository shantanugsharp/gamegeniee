"""
Unified LLM interface with cascading fallback.

Order of tries:
    1. Groq llama-3.1-8b-instant   — primary. 5x the daily quota of 70B.
    2. Google Gemini 1.5 Flash     — fallback. Separate 1M tokens/day free tier.

Callers use one function: `chat_completion_from_messages(...)`.
Same messages format both underlying APIs, no model-specific logic outside this file.
"""
import os
import time
from typing import Dict, List, Optional

# Groq
from groq import Groq
try:
    # Groq SDK exposes rate limit exceptions in these paths across versions.
    from groq import RateLimitError as _GroqRateLimit  # type: ignore
except ImportError:
    try:
        from groq._exceptions import RateLimitError as _GroqRateLimit  # type: ignore
    except ImportError:
        _GroqRateLimit = Exception  # type: ignore

# Gemini
import google.generativeai as genai

# Model IDs
GROQ_PRIMARY_MODEL = "llama-3.1-8b-instant"     # higher daily TPD than 70B
# Gemini 1.5 was retired mid-2025; use current model.
# gemini-2.5-flash: free 250 RPD, 1M TPM. Solid fallback capacity.
GEMINI_MODEL       = "gemini-2.5-flash"

_groq_client: Optional[Groq] = None
_gemini_configured = False


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set")
        _groq_client = Groq(api_key=key)
    return _groq_client


def _ensure_gemini() -> None:
    global _gemini_configured
    if _gemini_configured:
        return
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY not set")
    genai.configure(api_key=key)
    _gemini_configured = True


def _log(msg: str) -> None:
    print(f"[llm] {msg}", flush=True)


def chat_completion_from_messages(
    messages: List[Dict],
    response_format: Optional[Dict] = None,
    temperature: float = 0.4,
    max_tokens: int = 500,
) -> str:
    """
    Try Groq first, fall back to Gemini on rate limit or any exception.
    Returns the response text (or empty string on complete failure).
    """
    # ---- 1. Groq ----
    try:
        resp = _get_groq().chat.completions.create(
            model=GROQ_PRIMARY_MODEL,
            messages=messages,
            response_format=response_format,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (resp.choices[0].message.content or "").strip()
    except _GroqRateLimit as e:
        _log(f"Groq rate-limited, falling back to Gemini: {e}")
    except Exception as e:
        _log(f"Groq errored ({type(e).__name__}), falling back to Gemini: {e}")

    # ---- 2. Gemini fallback ----
    try:
        return _gemini_from_messages(
            messages,
            response_format=response_format,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        _log(f"Gemini fallback also failed ({type(e).__name__}): {e}")
        # Return empty; callers should handle gracefully
        return ""


def _gemini_from_messages(
    messages: List[Dict],
    response_format: Optional[Dict],
    temperature: float,
    max_tokens: int,
) -> str:
    """Translate OpenAI-style messages → Gemini API call."""
    _ensure_gemini()

    # Split system content out; Gemini uses `system_instruction`, not a message role.
    system_texts: List[str] = []
    convo: List[Dict] = []
    for m in messages:
        role = m.get("role")
        content = m.get("content") or ""
        if role == "system":
            system_texts.append(content)
        elif role == "user":
            convo.append({"role": "user", "parts": [content]})
        elif role == "assistant":
            convo.append({"role": "model", "parts": [content]})

    system_instruction = "\n\n".join(system_texts) if system_texts else None

    gen_config: Dict = {
        "temperature": temperature,
        "max_output_tokens": max_tokens,
    }
    if response_format and response_format.get("type") == "json_object":
        gen_config["response_mime_type"] = "application/json"

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_instruction,
        generation_config=gen_config,
    )

    if not convo:
        return ""

    if len(convo) == 1:
        resp = model.generate_content(convo[0]["parts"][0])
    else:
        chat = model.start_chat(history=convo[:-1])
        resp = chat.send_message(convo[-1]["parts"][0])

    # Gemini can return responses with no text (safety filter, etc.)
    text = getattr(resp, "text", None) or ""
    return text.strip()
