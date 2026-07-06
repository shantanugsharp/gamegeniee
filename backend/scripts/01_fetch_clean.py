"""
Download the Kaggle Steam Games dataset, clean it, save as parquet.

Usage:
    python scripts/01_fetch_clean.py                # full dataset (~80k games)
    python scripts/01_fetch_clean.py --sample 500   # test on a small subset

Concepts:
- Data cleaning: real datasets are messy. We drop DLCs, adult content, low-review
  games, and anything with an empty description. Better retrieval starts here.
- Feature engineering: we derive `is_multiplayer`, `platforms`, `slug`, and
  `embed_text` (what the embedding model actually sees) from raw fields.
- Parquet vs CSV: parquet is columnar, typed, and 5-10x smaller than CSV. It
  preserves Python lists as native arrow arrays instead of stringifying them.
"""
import argparse
import json
import re
from pathlib import Path

from dotenv import load_dotenv

# Load .env so KAGGLE_USERNAME / KAGGLE_KEY are visible to kagglehub before import
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import kagglehub
import pandas as pd
from tqdm import tqdm

DATASET = "fronkongames/steam-games-dataset"
BACKEND_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = BACKEND_DIR / "data"
OUT_PATH = OUT_DIR / "games.parquet"

BLOCKED_TERMS = {"Sexual Content", "Nudity", "NSFW", "Adult Only"}

# Publishers/developers we treat as AAA anchors. Substring match on lowercased
# publisher+developer strings so variants like "Ubisoft Montreal" also count.
AAA_PUBLISHERS = {
    "activision", "blizzard entertainment", "electronic arts", " ea ", "ea games",
    "ea sports", "ubisoft", "rockstar games", "take-two", "take two",
    "2k games", "2k publishing", "sony interactive", "microsoft studios",
    "xbox game studios", "bethesda", "zenimax", "square enix", "bandai namco",
    "capcom", "sega", "konami", "warner bros", "wb games", "cd projekt",
    "koei tecmo", "focus entertainment", "paradox interactive", "epic games",
    "505 games", "deep silver", "koch media", "annapurna", "devolver digital",
}


def compute_tier(publishers, developers, genres, tags, positive_reviews):
    """
    Derived tier from signals we already have. Buckets tuned pragmatically:
    - `aaa`  — a known big publisher/dev AND at least a moderate reception
    - `indie`— has an "Indie" genre/tag AND not massively popular
    - `mid`  — everything else (well-liked non-AAA titles like Hades, Balatro,
               Hollow Knight land here — not perfect but honest given signals)
    """
    hay = " ".join([str(x).lower() for x in (publishers or []) + (developers or [])])
    is_aaa_pub = any(p in hay for p in AAA_PUBLISHERS)
    has_indie = any("indie" in str(x).lower() for x in (genres or []) + (tags or []))

    if is_aaa_pub and positive_reviews >= 5000:
        return "aaa"
    if has_indie and positive_reviews < 100000:
        return "indie"
    return "mid"


def slugify(text: str) -> str:
    """Turn 'Portal 2' into 'portal-2' for URL paths."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")[:80]


def build_embed_text(name: str, genres: list, tags: list, categories: list, desc: str) -> str:
    """
    The single text blob the embedding model reads for each game.

    Ordering matters — models weight earlier tokens more. We lead with name and
    structured signals (genres/tags), then description prose. Separator '|' is
    just a soft cue to the model that these are distinct fields.
    """
    parts = [
        name,
        "Genres: " + ", ".join(genres) if genres else "",
        "Tags: " + ", ".join(tags[:15]) if tags else "",  # cap tags — long tails hurt more than help
        "Categories: " + ", ".join(categories) if categories else "",
        desc[:1500],  # cap desc — MiniLM truncates at 256 tokens anyway
    ]
    return " | ".join(p for p in parts if p and p.strip())


def load_games_json(dataset_path: Path) -> dict:
    """kagglehub gives us a directory; find games.json inside it."""
    for candidate in dataset_path.rglob("games.json"):
        print(f"Loading {candidate.name} ({candidate.stat().st_size / 1e6:.1f} MB) ...")
        with open(candidate, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"games.json not found under {dataset_path}")


def clean_and_transform(games: dict, sample: int = None) -> pd.DataFrame:
    """
    Iterate raw entries, filter garbage, derive useful fields.

    Filter rules (tuned to keep quality high):
    - name and description both non-empty, description at least 40 chars
    - at least 10 combined reviews (drops asset flips and dead releases)
    - no blocked adult categories
    """
    rows = []
    items = list(games.items())
    if sample:
        # oversample — we'll filter down. Ratio ~5x is empirically enough.
        items = items[:sample * 5]

    for app_id, g in tqdm(items, desc="Cleaning"):
        name = (g.get("name") or "").strip()
        desc = (g.get("about_the_game") or g.get("detailed_description") or "").strip()

        if not name or not desc or len(desc) < 40:
            continue

        pos = int(g.get("positive", 0) or 0)
        neg = int(g.get("negative", 0) or 0)
        if pos + neg < 10:
            continue

        categories = g.get("categories") or []
        genres = g.get("genres") or []
        if any(t in BLOCKED_TERMS for t in categories + genres):
            continue

        # tags can be dict (tag -> vote count) or list depending on dataset version
        raw_tags = g.get("tags")
        if isinstance(raw_tags, dict):
            # sort by vote count descending
            tag_list = [k for k, _ in sorted(raw_tags.items(), key=lambda kv: -kv[1])]
        elif isinstance(raw_tags, list):
            tag_list = list(raw_tags)
        else:
            tag_list = []

        cats_lower = [c.lower() for c in categories]
        is_multiplayer = any(
            ("multi-player" in c) or ("co-op" in c) or ("pvp" in c) or ("online" in c)
            for c in cats_lower
        )
        is_singleplayer = any("single-player" in c for c in cats_lower)

        platforms = []
        if g.get("windows"): platforms.append("Windows")
        if g.get("mac"): platforms.append("Mac")
        if g.get("linux"): platforms.append("Linux")

        try:
            app_id_int = int(app_id)
        except (TypeError, ValueError):
            continue

        developers = g.get("developers", []) or []
        publishers = g.get("publishers", []) or []
        tier = compute_tier(publishers, developers, genres, tag_list, pos)

        rows.append({
            "app_id": app_id_int,
            "name": name,
            "slug": f"{slugify(name)}-{app_id_int}",
            "description": desc,
            "short_description": desc[:280],
            "genres": genres,
            "tags": tag_list[:20],
            "categories": categories,
            "is_multiplayer": is_multiplayer,
            "is_singleplayer": is_singleplayer,
            "platforms": platforms,
            "price": float(g.get("price", 0.0) or 0.0),
            "release_date": g.get("release_date", "") or "",
            "positive_reviews": pos,
            "negative_reviews": neg,
            "review_score": pos / (pos + neg) if (pos + neg) else 0.0,
            "tier": tier,
            "header_image": g.get("header_image", "") or "",
            "developers": developers,
            "publishers": publishers,
            "embed_text": build_embed_text(name, genres, tag_list, categories, desc),
        })

        if sample and len(rows) >= sample:
            break

    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=None,
                        help="Only keep the first N cleaned games (for fast local testing)")
    args = parser.parse_args()

    print(f"Downloading {DATASET} via kagglehub ...")
    dataset_path = Path(kagglehub.dataset_download(DATASET))
    print(f"Downloaded to: {dataset_path}")

    games = load_games_json(dataset_path)
    print(f"Loaded {len(games):,} raw entries")

    df = clean_and_transform(games, sample=args.sample)
    print(f"After cleaning: {len(df):,} games")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)

    print(f"\nSaved to {OUT_PATH} ({OUT_PATH.stat().st_size / 1e6:.1f} MB)")
    print("\nSample rows:")
    print(df[["name", "tier", "is_multiplayer", "review_score", "positive_reviews"]].head(5).to_string(index=False))
    print("\nTier breakdown:")
    print(df["tier"].value_counts().to_string())


if __name__ == "__main__":
    main()
