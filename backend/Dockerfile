# GameGenie backend — FastAPI + FAISS + BM25 + Groq
# Runs on Hugging Face Spaces (Docker SDK). Listens on port 7860.

FROM python:3.11-slim

WORKDIR /app

# System deps for numpy/torch/faiss + certs for HTTPS to Groq + HF
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python deps first — layer caches across code-only changes
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Pre-download sentence-transformer + cross-encoder models into the image
# so the first request doesn't wait ~15s to download from HuggingFace.
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; \
SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); \
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# Application code + pre-built index data (via Git LFS in the repo)
COPY recommender ./recommender
COPY data ./data
COPY app.py .

# HF Spaces convention: 7860. Also honour $PORT if the platform overrides.
ENV PORT=7860
EXPOSE 7860

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}
