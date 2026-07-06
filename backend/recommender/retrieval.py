"""
Hybrid retrieval: hard filters → BM25 + FAISS → RRF fusion → cross-encoder rerank.

Concepts:
-----------
- **Hard filters first.** If the user asked for multiplayer, drop every solo-only
  game before any vector math. Boolean masks are microsecond-cheap; embedding
  ops on the rejected set are wasted.

- **BM25 vs dense.** BM25 wins on keyword-heavy queries ("stardew", "portal").
  Dense embeddings win on descriptive/synonym queries ("relaxing farming sim").
  Neither dominates. Combining them beats either alone.

- **Reciprocal Rank Fusion (RRF).** For each candidate that shows up across
  multiple ranked lists, add `1 / (k + rank)` across lists. k=60 is the
  well-tested default. No score-scale reconciliation needed — you just fuse ranks.

- **Cross-encoder rerank.** For top-N candidates, feed (query, doc) pairs through
  a small model that outputs a *true* relevance score. Slower than dense
  retrieval, more accurate. This is the "cheap recall, expensive precision"
  two-stage pattern used in production search.
"""
import pickle
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import faiss
import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


class Retriever:
    def __init__(self, use_reranker: bool = True):
        print("[Retriever] Loading games.parquet ...")
        self.games = pd.read_parquet(DATA_DIR / "games.parquet").reset_index(drop=True)

        print("[Retriever] Loading FAISS index ...")
        self.faiss_index = faiss.read_index(str(DATA_DIR / "faiss.index"))

        print("[Retriever] Loading embeddings ...")
        self.embeddings = np.load(DATA_DIR / "embeddings.npy")

        print("[Retriever] Loading BM25 ...")
        with open(DATA_DIR / "bm25.pkl", "rb") as f:
            self.bm25: BM25Okapi = pickle.load(f)

        self.app_id_to_row = {int(a): i for i, a in enumerate(self.games["app_id"])}
        self.slug_to_row = {s: i for i, s in enumerate(self.games["slug"])}

        # Precomputed lowercase genre+tag set per game — for fast filter matching.
        # Steam splits its taxonomy: `genres` is broad (Casual/Indie/Action),
        # `tags` is specific (Puzzle/Roguelike/Metroidvania). Filter matches either.
        # NB: parquet gives us numpy arrays, so `x or []` blows up — check for None.
        def _to_set(x) -> set:
            if x is None:
                return set()
            return {str(t).lower() for t in x}

        genres_col = self.games["genres"].tolist()
        tags_col = self.games["tags"].tolist()
        self._genre_tag_sets: List[set] = [
            _to_set(genres_col[i]) | _to_set(tags_col[i])
            for i in range(len(self.games))
        ]

        self._encoder = None
        self._reranker = None
        self._use_reranker = use_reranker

        print(f"[Retriever] Ready — {len(self.games):,} games")

    # --- Lazy model loading ---
    @property
    def encoder(self):
        if self._encoder is None:
            from sentence_transformers import SentenceTransformer
            print("[Retriever] Loading sentence encoder ...")
            self._encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        return self._encoder

    @property
    def reranker(self):
        if self._reranker is None and self._use_reranker:
            from sentence_transformers import CrossEncoder
            print("[Retriever] Loading cross-encoder reranker ...")
            self._reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        return self._reranker

    # --- Query embedding (with optional profile blend) ---
    def embed_query(
        self,
        text: str,
        blend_with: Optional[np.ndarray] = None,
        blend_alpha: float = 0.3,
    ) -> np.ndarray:
        q = self.encoder.encode([text], normalize_embeddings=True)[0].astype("float32")
        if blend_with is not None:
            q = q + blend_alpha * blend_with.astype("float32")
            n = float(np.linalg.norm(q))
            if n > 0:
                q = q / n
        return q

    # --- Hard filters -> boolean mask over the game table ---
    def apply_filters(self, filters: dict) -> Optional[np.ndarray]:
        if not filters:
            return None
        mask = np.ones(len(self.games), dtype=bool)
        applied = False

        if filters.get("multiplayer") is True:
            mask &= self.games["is_multiplayer"].values
            applied = True
        if filters.get("singleplayer") is True:
            mask &= self.games["is_singleplayer"].values
            applied = True

        platform = filters.get("platform")
        if platform:
            plat = str(platform).capitalize()
            mask &= self.games["platforms"].apply(
                lambda p: plat in self._safe_list(p)
            )
            applied = True

        pmax = filters.get("price_max")
        if pmax is not None:
            mask &= self.games["price"].values <= float(pmax)
            applied = True

        tier = filters.get("tier")
        if tier and "tier" in self.games.columns:
            mask &= self.games["tier"].values == str(tier).lower()
            applied = True

        avoid_tags = filters.get("avoid_tags") or []
        if avoid_tags:
            unwanted = {t.lower() for t in avoid_tags}
            # Drop any game whose genre/tag set intersects the avoid set.
            avoid_mask = np.fromiter(
                (not (unwanted & s) for s in self._genre_tag_sets),
                dtype=bool,
                count=len(self._genre_tag_sets),
            )
            mask &= avoid_mask
            applied = True

        genres = filters.get("genres") or []
        if genres:
            wanted = {g.lower() for g in genres}
            # 1) exact match against the game's genre+tag set
            genre_mask = np.fromiter(
                (bool(wanted & s) for s in self._genre_tag_sets),
                dtype=bool,
                count=len(self._genre_tag_sets),
            )
            # 2) substring fallback — catches LLM English vs Steam's canonical hyphenation:
            #    "roguelike" → "rogue-like", "deckbuilder" → "deck building", etc.
            MIN_HITS = 30
            if genre_mask.sum() < MIN_HITS:
                genre_mask = np.fromiter(
                    (any(w in t for t in s for w in wanted) for s in self._genre_tag_sets),
                    dtype=bool,
                    count=len(self._genre_tag_sets),
                )
            # 3) soft filter — if we STILL can't find a decent pool, drop the filter
            #    entirely and rely on BM25 + embeddings to find the intent.
            if genre_mask.sum() >= MIN_HITS:
                mask &= genre_mask
                applied = True

        avoid_ids = set(filters.get("avoid_app_ids") or [])
        if avoid_ids:
            mask &= ~self.games["app_id"].isin(avoid_ids).values
            applied = True

        return mask if applied else None

    # --- Dense retrieval (FAISS) ---
    def dense_search(
        self,
        query_vec: np.ndarray,
        allowed_mask: Optional[np.ndarray],
        k: int = 200,
    ) -> List[Tuple[int, float]]:
        if allowed_mask is None:
            scores, idxs = self.faiss_index.search(query_vec[None, :], k)
            return [(int(i), float(s)) for i, s in zip(idxs[0], scores[0]) if i >= 0]
        widen = min(k * 5, len(self.games))
        scores, idxs = self.faiss_index.search(query_vec[None, :], widen)
        out = []
        for i, s in zip(idxs[0], scores[0]):
            if i >= 0 and allowed_mask[i]:
                out.append((int(i), float(s)))
                if len(out) >= k:
                    break
        return out

    # --- Sparse retrieval (BM25) ---
    def sparse_search(
        self,
        query_text: str,
        allowed_mask: Optional[np.ndarray],
        k: int = 200,
    ) -> List[Tuple[int, float]]:
        tokens = TOKEN_RE.findall(query_text.lower())
        if not tokens:
            return []
        scores = self.bm25.get_scores(tokens)
        if allowed_mask is not None:
            scores = np.where(allowed_mask, scores, -np.inf)
        n = len(scores)
        k_eff = min(k, n)
        top_k = np.argpartition(-scores, k_eff - 1)[:k_eff]
        top_k = top_k[np.argsort(-scores[top_k])]
        return [(int(i), float(scores[i])) for i in top_k if scores[i] > 0]

    # --- Reciprocal Rank Fusion (with optional popularity nudge) ---
    def rrf_fuse(
        self,
        lists: List[List[Tuple[int, float]]],
        k: int = 60,
        popularity_weight: float = 0.15,
    ) -> List[Tuple[int, float]]:
        """
        RRF: score(doc) = sum(1 / (k + rank_in_list_i)) across ranked lists.

        Popularity nudge: add `w * log1p(positive_reviews) / log1p(max)`. This
        stops obscure 15-review games from tying with polished hits. Weight is
        deliberately small (~0.15) — nudge, not override. The retrieval signal
        still dominates.
        """
        rrf: Dict[int, float] = {}
        for lst in lists:
            for rank, (row, _) in enumerate(lst):
                rrf[row] = rrf.get(row, 0.0) + 1.0 / (k + rank + 1)

        if popularity_weight > 0 and rrf and "positive_reviews" in self.games.columns:
            rows = list(rrf.keys())
            pos = self.games["positive_reviews"].iloc[rows].values.astype(float)
            max_log = float(np.log1p(self.games["positive_reviews"].max() or 1))
            if max_log > 0:
                bonus = np.log1p(pos) / max_log
                for row, b in zip(rows, bonus):
                    rrf[row] += popularity_weight * float(b)

        return sorted(rrf.items(), key=lambda kv: -kv[1])

    # --- Cross-encoder rerank ---
    def rerank_candidates(
        self,
        query_text: str,
        candidates: List[Tuple[int, float]],
        top_n: int = 10,
    ) -> List[Tuple[int, float]]:
        if not candidates or self.reranker is None:
            return candidates[:top_n]
        pairs = [(query_text, str(self.games.iloc[row]["embed_text"])[:512]) for row, _ in candidates]
        scores = self.reranker.predict(pairs, show_progress_bar=False)
        rescored = [(row, float(s)) for (row, _), s in zip(candidates, scores)]
        rescored.sort(key=lambda x: -x[1])
        return rescored[:top_n]

    # --- MMR diversification ---
    def mmr_diversify(
        self,
        candidates: List[Tuple[int, float]],
        top_n: int = 10,
        lambda_: float = 0.7,
    ) -> List[Tuple[int, float]]:
        """
        Maximum Marginal Relevance: picks the next candidate that maximises
            lambda * relevance - (1 - lambda) * max_similarity_to_already_selected
        A common query problem: top-N are all near-duplicates. MMR spreads them out
        so a "roguelike" query returns Slay the Spire + Hades + Dead Cells,
        not five deck-builders. lambda=0.7 is a solid default (70% relevance / 30% diversity).
        """
        if len(candidates) <= top_n:
            return candidates
        # Normalize scores to [0,1] for stable MMR arithmetic
        raw = np.array([s for _, s in candidates], dtype="float32")
        rmin, rmax = raw.min(), raw.max()
        norm = (raw - rmin) / (rmax - rmin + 1e-9) if rmax > rmin else np.ones_like(raw)

        selected = [0]  # start with the top-ranked
        remaining = list(range(1, len(candidates)))
        while remaining and len(selected) < top_n:
            sel_rows = [candidates[i][0] for i in selected]
            sel_embs = self.embeddings[sel_rows]  # (k, dim), already L2-normalized
            best_i, best_mmr = remaining[0], -1e9
            for i in remaining:
                row = candidates[i][0]
                emb = self.embeddings[row]
                sim_to_sel = float(np.max(sel_embs @ emb))  # inner product == cosine (norm'd)
                mmr = lambda_ * float(norm[i]) - (1 - lambda_) * sim_to_sel
                if mmr > best_mmr:
                    best_mmr, best_i = mmr, i
            selected.append(best_i)
            remaining.remove(best_i)
        return [candidates[i] for i in selected]

    # --- Top-level search ---
    def search(
        self,
        query_text: str,
        filters: Optional[dict] = None,
        preference_vec: Optional[np.ndarray] = None,
        top_n: int = 10,
        rerank_pool: int = 50,
    ) -> List[dict]:
        filters = filters or {}
        query_vec = self.embed_query(query_text, blend_with=preference_vec)
        allowed = self.apply_filters(filters)

        dense = self.dense_search(query_vec, allowed, k=rerank_pool * 4)
        sparse = self.sparse_search(query_text, allowed, k=rerank_pool * 4)
        fused = self.rrf_fuse([dense, sparse])[:rerank_pool]

        # Rerank a wide pool, then diversify down to top_n so results don't clone each other.
        reranked = self.rerank_candidates(query_text, fused, top_n=min(top_n * 3, len(fused)))
        diversified = self.mmr_diversify(reranked, top_n=top_n, lambda_=0.7)
        return [self._row_to_dict(row, score) for row, score in diversified]

    # --- Detail lookups (for /games/:slug) ---
    def get_by_slug(self, slug: str) -> Optional[dict]:
        row = self.slug_to_row.get(slug)
        if row is None:
            return None
        return self._row_to_dict(row, 1.0)

    def similar(self, slug: str, top_n: int = 8) -> List[dict]:
        row = self.slug_to_row.get(slug)
        if row is None:
            return []
        vec = self.embeddings[row]
        scores, idxs = self.faiss_index.search(vec[None, :], top_n + 1)
        out = []
        for i, s in zip(idxs[0], scores[0]):
            if int(i) != row and i >= 0:
                out.append(self._row_to_dict(int(i), float(s)))
        return out[:top_n]

    @staticmethod
    def _safe_list(x) -> list:
        """Parquet gives numpy arrays; `x or []` blows up on truthiness checks."""
        return list(x) if x is not None else []

    _YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")

    def _row_to_dict(self, row: int, score: float) -> dict:
        g = self.games.iloc[row]
        devs = self._safe_list(g["developers"])
        release_date = str(g["release_date"] or "")
        year_match = self._YEAR_RE.search(release_date)
        app_id = int(g["app_id"])
        return {
            "app_id": app_id,
            "name": str(g["name"]),
            "slug": str(g["slug"]),
            "short_description": str(g["short_description"]),
            "genres": self._safe_list(g["genres"]),
            "tags": self._safe_list(g["tags"])[:8],
            "platforms": self._safe_list(g["platforms"]),
            "is_multiplayer": bool(g["is_multiplayer"]),
            "price": float(g["price"]),
            "review_score": float(g["review_score"]),
            "positive_reviews": int(g["positive_reviews"]) if "positive_reviews" in g else 0,
            "tier": str(g["tier"]) if "tier" in g else "mid",
            "developer": devs[0] if devs else "",
            "release_year": year_match.group(0) if year_match else "",
            "steam_url": f"https://store.steampowered.com/app/{app_id}",
            "header_image": str(g["header_image"]),
            "score": float(score),
        }
