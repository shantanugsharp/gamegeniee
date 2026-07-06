"""
User profile: SQLite storage + preference vector.

Concepts:
- Cold start: brand-new user has no likes → recommendations are query-only.
- Warm start: after a few thumbs, we compute a preference vector as
      pref = normalize(mean(liked_embeddings) - alpha * mean(disliked_embeddings))
  and blend it into the query embedding. This is a classic recsys move —
  a lightweight collaborative-filtering flavor that costs nothing extra.
- `seen`: we track what we've shown so we don't repeat.
"""
import sqlite3
import time
from pathlib import Path
from typing import Optional, Dict, List

import numpy as np

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "profiles.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    created_at INTEGER
);
CREATE TABLE IF NOT EXISTS feedback (
    user_id TEXT NOT NULL,
    app_id  INTEGER NOT NULL,
    kind    TEXT NOT NULL CHECK(kind IN ('like','dislike','seen')),
    ts      INTEGER NOT NULL,
    PRIMARY KEY (user_id, app_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);

-- Query-level feedback: "these results didn't answer my question".
-- Distinct from thumbs on individual games. Used to tune slot prompts.
CREATE TABLE IF NOT EXISTS query_feedback (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    query   TEXT NOT NULL,
    note    TEXT,
    ts      INTEGER NOT NULL
);
"""


class Profile:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as c:
            c.executescript(SCHEMA)

    def _conn(self):
        return sqlite3.connect(self.db_path)

    def ensure_user(self, user_id: str) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT OR IGNORE INTO users(user_id, created_at) VALUES (?, ?)",
                (user_id, int(time.time())),
            )

    def record(self, user_id: str, app_id: int, kind: str) -> None:
        assert kind in ("like", "dislike", "seen")
        self.ensure_user(user_id)
        with self._conn() as c:
            c.execute(
                "INSERT OR REPLACE INTO feedback(user_id, app_id, kind, ts) VALUES (?, ?, ?, ?)",
                (user_id, app_id, kind, int(time.time())),
            )

    def get_feedback(self, user_id: str) -> Dict[str, List[int]]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT app_id, kind FROM feedback WHERE user_id = ?",
                (user_id,),
            ).fetchall()
        out: Dict[str, List[int]] = {"like": [], "dislike": [], "seen": []}
        for app_id, kind in rows:
            out[kind].append(app_id)
        return out

    def record_query_feedback(self, user_id: str, query: str, note: str = "") -> None:
        self.ensure_user(user_id)
        with self._conn() as c:
            c.execute(
                "INSERT INTO query_feedback(user_id, query, note, ts) VALUES (?, ?, ?, ?)",
                (user_id, query, note, int(time.time())),
            )

    def preference_vector(
        self,
        user_id: str,
        embeddings: np.ndarray,
        app_id_to_row: Dict[int, int],
        alpha: float = 0.5,
    ) -> Optional[np.ndarray]:
        """
        pref = normalize(mean(liked) - alpha * mean(disliked))

        Returns None when the user has zero likes (nothing meaningful to blend).
        """
        fb = self.get_feedback(user_id)
        like_rows = [app_id_to_row[a] for a in fb["like"] if a in app_id_to_row]
        dislike_rows = [app_id_to_row[a] for a in fb["dislike"] if a in app_id_to_row]
        if not like_rows:
            return None

        pos = embeddings[like_rows].mean(axis=0)
        vec = pos - alpha * embeddings[dislike_rows].mean(axis=0) if dislike_rows else pos
        norm = float(np.linalg.norm(vec))
        return vec / norm if norm > 0 else None
