"""
Build FAISS (semantic) + BM25 (keyword) indexes from data/games.parquet.

Usage:
    python scripts/02_build_indexes.py

Concepts:
--------
Embeddings (dense retrieval):
    A model reads text and outputs a fixed-size vector. Semantically similar
    text → geometrically close vectors. "chill" and "relaxing" end up near
    each other even though they share no words. We use all-MiniLM-L6-v2:
    - 384 dimensions
    - ~80MB, runs on CPU in milliseconds per doc
    - Trained on 1B+ sentence pairs. It's tiny but shockingly good.

FAISS IndexFlatIP:
    - "Flat" = brute-force, exhaustive search. Exact — no accuracy loss.
    - "IP" = inner product. If vectors are L2-normalized (which we do below),
      inner product equals cosine similarity.
    - For 80k games this runs in ~5-10ms per query on CPU. Fine.
    - If you scale to 10M+ vectors, swap for IndexHNSWFlat (approximate but
      much faster). Same API, different internals.

BM25 (sparse retrieval):
    Classic keyword ranking, no ML. For each query term, scores each doc by:
    - term frequency in the doc (with saturation — 10th occurrence matters
      less than 2nd)
    - inverse document frequency (rare terms weigh more)
    - doc length normalization (short docs don't get an unfair boost)
    Great at exact matches ("stardew" → Stardew Valley). Terrible at synonyms.
    That's exactly why we pair it with dense retrieval — complementary strengths.

Why store both?
    Hybrid retrieval (BM25 + dense, fused with RRF) beats either alone by 10-20%
    on standard benchmarks. This is what modern search stacks do.
"""
import pickle
import re
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
GAMES_PATH = DATA_DIR / "games.parquet"

EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_SIZE = 64

# Simple word tokenizer for BM25. We don't need anything fancy — BM25 works
# on token overlap, not linguistic structure.
TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


def tokenize(text: str) -> list:
    return TOKEN_RE.findall(text.lower())


def main():
    if not GAMES_PATH.exists():
        raise SystemExit(f"Missing {GAMES_PATH}. Run 01_fetch_clean.py first.")

    print(f"Loading {GAMES_PATH.name} ...")
    df = pd.read_parquet(GAMES_PATH)
    print(f"Loaded {len(df):,} games")

    print(f"\nLoading embedding model: {EMBED_MODEL}")
    print("(first run downloads ~80MB from HuggingFace)")
    model = SentenceTransformer(EMBED_MODEL)
    dim = model.get_sentence_embedding_dimension()
    print(f"Embedding dimension: {dim}")

    # ---- 1. Dense embeddings + FAISS ----
    print("\nEmbedding all games (this is the slow step on CPU) ...")
    texts = df["embed_text"].tolist()
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,  # L2-normalize so inner product == cosine
    ).astype("float32")
    print(f"Embeddings shape: {embeddings.shape}")

    np.save(DATA_DIR / "embeddings.npy", embeddings)

    print("Building FAISS index ...")
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    faiss.write_index(index, str(DATA_DIR / "faiss.index"))
    print(f"FAISS index: {index.ntotal:,} vectors")

    # ---- 2. BM25 sparse index ----
    print("\nTokenizing for BM25 ...")
    tokenized = [tokenize(t) for t in tqdm(texts)]
    print("Building BM25 index (this holds the full inverted index in RAM) ...")
    bm25 = BM25Okapi(tokenized)
    with open(DATA_DIR / "bm25.pkl", "wb") as f:
        pickle.dump(bm25, f)

    # ---- 3. ID map — lets the API resolve FAISS row index → app_id/slug ----
    id_map = df[["app_id", "slug", "name"]].reset_index(drop=True)
    id_map.to_parquet(DATA_DIR / "id_map.parquet", index=False)

    # ---- Summary ----
    print("\nFiles written to data/:")
    for name in ["faiss.index", "embeddings.npy", "bm25.pkl", "id_map.parquet"]:
        p = DATA_DIR / name
        print(f"  {p.name:20s} {p.stat().st_size / 1e6:>7.1f} MB")

    print("\nSanity check — nearest neighbors for a random game:")
    q_idx = 0
    q_vec = embeddings[q_idx:q_idx + 1]
    scores, idxs = index.search(q_vec, 5)
    print(f"  Query: {df.iloc[q_idx]['name']}")
    for score, i in zip(scores[0], idxs[0]):
        print(f"    {score:.3f}  {df.iloc[i]['name']}")


if __name__ == "__main__":
    main()
