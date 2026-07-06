---
title: GameGenie API
emoji: 🧞
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# GameGenie — Backend API

FastAPI service powering the GameGenie recommender. Hybrid BM25 + FAISS retrieval,
cross-encoder reranking, MMR diversification, and Llama-3.3-70B via Groq for slot
extraction, rationale generation, and scoped chat.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/health` | liveness probe |
| POST | `/chat` | main recommendation / chat endpoint |
| POST | `/feedback` | thumbs-up/down a game |
| POST | `/feedback/query` | flag "these results didn't match" |
| GET  | `/games` | paginated browse (`?limit=&offset=&genre=&tier=`) |
| GET  | `/games/{slug}` | game detail + similar games |
| GET  | `/genres` | top canonical genres with counts |

## Configuration

Set as **Space Secret** in the HF Spaces UI (Settings → Repository secrets):

- `GROQ_API_KEY` — from console.groq.com

## Data

The index files under `data/` (~365 MB total) ship in the repo via Git LFS.
No Kaggle or external download happens at runtime.

## Local dev

```bash
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
