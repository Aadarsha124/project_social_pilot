# SocialPilot AI — backend + RAG scaffold

Pipeline: ingest → chunk/index (RAG) → analyze → generate → verify claims → store → export.

```
pip install -r requirements.txt
cp .env.example .env        # configure Ollama or hosted model
pytest -q
uvicorn api.main:app --reload   # docs at http://localhost:8000/docs
```

- `core/rag/` — line-aware chunking, BM25, optional Ollama embeddings, RRF hybrid retriever
- `core/evidence.py` — claim -> source excerpt checks, invented-number detection
- `core/pipeline.py` — what any frontend should call
