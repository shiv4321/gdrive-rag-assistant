from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    google_service_account_json: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/callback"

    pinecone_api_key: str
    pinecone_index_name: str = "drive-doc-index"
    pinecone_host: str = "https://drive-doc-p3ex16d.svc.aped-4627-b74a.pinecone.io"

    openai_api_key: str

    embedding_model: str = "llama-text-embed-v2"
    embedding_dimension: int = 1024

    chunk_size: int = 512
    chunk_overlap: int = 64

    top_k_results: int = 5

    openai_model: str = "gpt-4o-mini"
    max_answer_tokens: int = 512

    app_env: str = "development"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
