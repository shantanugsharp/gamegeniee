
"""
FastAPI wrapper — the actual HTTP surface.

Endpoints:
    GET  /health              → smoke test
    POST /chat                → main recommendation endpoint
    POST /feedback            → thumbs up / down (updates profile)
    GET  /games/{slug}        → single game detail + similar games (for SEO pages)
    GET  /games?limit=&offset= → paginated list (for sitemap + browse)

Run locally:ß
    cd backend
    source .venv/bin/activate
    uvicorn app:app --reload --port 8000

Test:
    curl http://localhost:8000/health
    curl -X POST http://localhost:8000/chat \\
      -H 'content-type: application/json' \\
      -d '{"user_id":"demo","message":"chill co-op puzzle"}'
"""
from pathlib import Path
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv

# Load .env before importing anything that reads env vars
load_dotenv(Path(__file__).resolve().parent / ".env")

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from recommender.retrieval import Retriever
from recommender.profile import Profile
from recommender.agent import Agent


app = FastAPI(title="Game Recommender API", version="0.1.0")

# CORS: permissive in dev; tighten to your Vercel domain in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Lazy singletons ----
# Loading FAISS + embeddings + BM25 costs a few seconds. Do it on first request,
# not at import time, so `uvicorn --reload` stays snappy during dev.
_retriever: Optional[Retriever] = None
_profile: Optional[Profile] = None
_agent: Optional[Agent] = None


def get_retriever() -> Retriever:
    global _retriever
    if _retriever is None:
        _retriever = Retriever(use_reranker=True)
    return _retriever


def get_profile() -> Profile:
    global _profile
    if _profile is None:
        _profile = Profile()
    return _profile


def get_agent() -> Agent:
    global _agent
    if _agent is None:
        _agent = Agent(get_retriever(), get_profile())
    return _agent


# ---- Schemas ----
class ChatIn(BaseModel):
    user_id: str = Field(..., description="Client-generated stable ID")
    message: str
    history: Optional[List[Dict[str, str]]] = None
    # Frontend passes the last shown recommendation slate here so chat/followups
    # ("is the first one co-op?") can be answered with grounded context.
    recent_games: Optional[List[Dict[str, Any]]] = None
    top_n: int = 8


class FeedbackIn(BaseModel):
    user_id: str
    app_id: int
    kind: str  # 'like' | 'dislike'


class QueryFeedbackIn(BaseModel):
    user_id: str
    query: str
    note: Optional[str] = ""


# ---- Endpoints ----
@app.get("/health")
def health() -> Dict[str, Any]:
    ready = _retriever is not None
    return {"status": "ok", "warm": ready}


@app.post("/chat")
def chat(req: ChatIn) -> Dict[str, Any]:
    return get_agent().respond(
        user_id=req.user_id,
        query=req.message,
        conversation_history=req.history or [],
        recent_games=req.recent_games or [],
        top_n=req.top_n,
    )


@app.post("/feedback")
def feedback(req: FeedbackIn) -> Dict[str, bool]:
    if req.kind not in ("like", "dislike"):
        raise HTTPException(400, "kind must be 'like' or 'dislike'")
    get_profile().record(req.user_id, req.app_id, req.kind)
    return {"ok": True}


@app.post("/feedback/query")
def query_feedback(req: QueryFeedbackIn) -> Dict[str, bool]:
    """User signals 'the results didn't match my request'. Logged for prompt tuning."""
    get_profile().record_query_feedback(req.user_id, req.query, req.note or "")
    return {"ok": True}


@app.get("/games/{slug}")
def game_detail(slug: str) -> Dict[str, Any]:
    r = get_retriever()
    game = r.get_by_slug(slug)
    if not game:
        raise HTTPException(404, "not found")
    game["similar"] = r.similar(slug, top_n=8)
    return game


@app.get("/games")
def list_games(
    limit: int = 100,
    offset: int = 0,
    genre: Optional[str] = None,
    tier: Optional[str] = None,
) -> Dict[str, Any]:
    r = get_retriever()
    df = r.games
    if genre:
        wanted = genre.lower()
        # Exact match first, then substring fallback for hyphenation variance
        # ("Roguelike" -> "Rogue-like", "Deckbuilder" -> "Deck Building").
        mask_exact = pd.Series(
            [wanted in s for s in r._genre_tag_sets],
            index=r.games.index,
        )
        if mask_exact.sum() < 30:
            mask_exact = pd.Series(
                [any(wanted in t for t in s) for s in r._genre_tag_sets],
                index=r.games.index,
            )
        df = df[mask_exact]
    if tier:
        df = df[df["tier"] == tier.lower()]
    df = df.sort_values("positive_reviews", ascending=False)
    total = len(df)
    slice_ = df.iloc[offset : offset + limit]
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "genre": genre,
        "tier": tier,
        "games": [
            {
                "app_id": int(g["app_id"]),
                "slug": str(g["slug"]),
                "name": str(g["name"]),
                "short_description": str(g["short_description"])[:200],
                "header_image": str(g["header_image"]),
                "tier": str(g.get("tier", "mid")),
                "review_score": float(g["review_score"]),
                "positive_reviews": int(g["positive_reviews"]),
            }
            for _, g in slice_.iterrows()
        ],
    }


@app.get("/surprise")
def surprise(
    genre: Optional[str] = None,
    tier: Optional[str] = None,
    price_max: Optional[float] = None,
    multiplayer: Optional[bool] = None,
) -> Dict[str, Any]:
    filters: Dict[str, Any] = {}
    if genre: filters["genres"] = [genre]
    if tier: filters["tier"] = tier
    if price_max is not None: filters["price_max"] = price_max
    if multiplayer is not None: filters["multiplayer"] = multiplayer
    game = get_agent().surprise(filters)
    if not game:
        raise HTTPException(404, "no game matches those filters")
    return game


@app.get("/games/{slug}/explain")
def game_explain(slug: str, user_id: str = "anon") -> Dict[str, Any]:
    result = get_agent().explain_game(user_id, slug)
    if not result:
        raise HTTPException(404, "not found")
    return result


@app.get("/genres/{genre}/explain")
def genre_explain(genre: str) -> Dict[str, Any]:
    return get_agent().explain_genre(genre)


@app.get("/profile/{user_id}/taste-summary")
def taste_summary_endpoint(user_id: str) -> Dict[str, Any]:
    return get_agent().taste_summary(user_id)


@app.get("/genres")
def list_genres() -> Dict[str, Any]:
    """Returns top genres/tags with counts — powers the genre landing pages."""
    r = get_retriever()
    from collections import Counter
    c: Counter = Counter()
    for s in r._genre_tag_sets:
        c.update(s)
    # Skip generic ones + require reasonable size
    skip = {"indie", "casual", "singleplayer", "multiplayer", "great soundtrack", "colorful"}
    top = [
        {"slug": name, "count": count}
        for name, count in c.most_common(60)
        if name not in skip and count >= 100
    ]
    return {"genres": top[:40]}
