import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    llm_model: str = os.getenv("LLM_MODEL", "llama3.1:8b")
    llm_timeout_s: float = float(os.getenv("LLM_TIMEOUT_S", "120"))
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    use_embeddings: bool = os.getenv("USE_EMBEDDINGS", "0") == "1"
    embed_model: str = os.getenv("EMBED_MODEL", "nomic-embed-text")
    github_token: str = os.getenv("GITHUB_TOKEN", "")
    db_path: str = os.getenv("DB_PATH", "data/socialpilot.db")

    # Ingestion limits
    max_files: int = 25
    max_file_bytes: int = 60_000
    max_total_bytes: int = 400_000
    http_timeout_s: float = 15.0

    # RAG
    chunk_chars: int = 1200
    top_k: int = 6


settings = Settings()
