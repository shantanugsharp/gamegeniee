# GameGenie — Deployment Playbook

Two deploys: backend on Hugging Face Spaces, frontend on Vercel, then point
`gamegenie.space` at Vercel.

## 0. Prereqs

- Hugging Face account
- Vercel account (sign up with GitHub)
- Git LFS installed locally — `brew install git-lfs && git lfs install`
- Namecheap login (for DNS)
- `GROQ_API_KEY` in hand

---

## 1. Backend → Hugging Face Spaces

### 1a. Create a Space

1. Go to https://huggingface.co/new-space
2. **Name:** `gamegenie-api` (or anything — this becomes part of the URL)
3. **SDK:** Docker → **Blank template**
4. **Visibility:** Public (or Private if you prefer)
5. Click **Create Space**

### 1b. Add the Groq secret

In the new Space → **Settings** → **Repository secrets** → **New secret**:

- **Name:** `GROQ_API_KEY`
- **Value:** paste your Groq key

### 1c. Push code + data

The Space is a git repo. From your machine:

```bash
cd /Users/indianrenters/personal/game-recommender/backend

# One-time: init LFS if you haven't
git lfs install

# Init the backend as its own git repo
git init -b main

# The .gitattributes file (already in repo) tracks the big index files via LFS.
# Verify:
git lfs track   # should list *.parquet, *.pkl, *.npy, *.index

# Stage everything except venv / caches (via .dockerignore + .gitignore patterns)
git add .

# Optional but recommended sanity: git status | grep -v data
git commit -m "Initial GameGenie backend"

# Link to the Space repo. Replace YOUR_USERNAME + your Space name.
git remote add origin https://huggingface.co/spaces/YOUR_USERNAME/gamegenie-api

# HF asks for username + a "Write" access token as password.
# Create one at https://huggingface.co/settings/tokens (New token → Write).
git push -u origin main
```

Expected upload: ~365 MB (LFS chunks). Takes 5-10 min on decent internet.
When push completes, HF starts building the Docker image (~5-8 min).

### 1d. Confirm it's live

Watch the build logs in the Space UI. Once it says "Running", hit:

```
https://YOUR_USERNAME-gamegenie-api.hf.space/health
```

Should return `{"status":"ok","warm":false}`.

First `/chat` call cold-starts the retriever (~10s). Subsequent calls: ~2s.

**Copy this URL** — the frontend needs it.

---

## 2. Frontend → Vercel

### 2a. Push the frontend to GitHub

Vercel deploys from git.

```bash
cd /Users/indianrenters/personal/game-recommender

# Init the whole repo (or the frontend only)
git init -b main
git add .
git commit -m "GameGenie initial commit"

# Create a GitHub repo (via web UI, https://github.com/new) named e.g. `gamegenie`
# then:
git remote add origin git@github.com:YOUR_GITHUB/gamegenie.git
git push -u origin main
```

### 2b. Import into Vercel

1. Go to https://vercel.com/new
2. **Import Git Repository** → pick your `gamegenie` repo
3. **Root directory:** `frontend`
4. **Framework Preset:** Next.js (auto-detected)
5. **Environment variables** — add these two:
   - `NEXT_PUBLIC_API_BASE` → your HF Space URL from step 1d (e.g. `https://YOUR_USERNAME-gamegenie-api.hf.space`)
   - `NEXT_PUBLIC_SITE_URL` → `https://gamegenie.space`
6. Click **Deploy**

Build takes ~90s. First live URL: `gamegenie-abc123.vercel.app`

### 2c. Verify

Open the Vercel URL. Make sure:
- `/` shows landing
- `/chat` chat works (cold-starts HF Space)
- `/genres/roguelike` shows games
- `/sitemap.xml` has ~2000 URLs

---

## 3. Custom domain: gamegenie.space → Vercel

### 3a. Add domain in Vercel

1. In your Vercel project → **Settings** → **Domains**
2. Add `gamegenie.space`
3. Vercel shows you 2 DNS records to add — remember the values

### 3b. Point DNS in Namecheap

1. Namecheap → **Domain List** → **Manage** next to gamegenie.space
2. **Advanced DNS** tab
3. Delete any pre-existing `A`, `CNAME`, or "URL Redirect" records for `@` and `www`
4. Add these two:
   - **Type:** `A Record` — **Host:** `@` — **Value:** `76.76.21.21` — **TTL:** Automatic
   - **Type:** `CNAME Record` — **Host:** `www` — **Value:** `cname.vercel-dns.com` — **TTL:** Automatic
5. Save

### 3c. Wait for propagation

Usually 5-30 min. Vercel auto-issues a Let's Encrypt SSL cert once DNS resolves.

Test: `https://gamegenie.space` should load.

---

## 4. Tighten CORS in the backend

Once the frontend is live at gamegenie.space, replace the permissive CORS in
`backend/app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gamegenie.space",
        "https://www.gamegenie.space",
        # keep your Vercel preview domain during dev:
        "https://gamegenie-git-main-YOUR_TEAM.vercel.app",
    ],
    ...
)
```

Commit + push to HF (triggers rebuild).

---

## 5. Ongoing dev

- **Backend code change:** `git commit && git push` from `backend/`. HF rebuilds.
- **Frontend code change:** `git commit && git push` from repo root. Vercel rebuilds.
- **Update the game index:** re-run `python scripts/01_fetch_clean.py && python scripts/02_build_indexes.py`
  locally, then `git commit && git push` from `backend/`. LFS tracks the new blobs.

---

## Troubleshooting

- **HF build fails at pip install:** confirm `requirements.txt` is in `backend/` root.
- **`GROQ_API_KEY` not set** at runtime: double-check the Secret name spelled correctly in Space Settings.
- **Chat returns CORS error:** you tightened CORS but forgot the Vercel preview domain. Loosen temporarily or add the preview URL.
- **DNS not resolving:** use https://dnschecker.org/#A/gamegenie.space to watch propagation.
- **Cold start > 20s:** the retriever loads 365 MB. Consider HF Space Persistent Storage ($5/mo) to keep the container warm.
