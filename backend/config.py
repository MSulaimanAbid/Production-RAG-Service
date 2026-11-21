"""
Centralized application configuration.
All settings are loaded from environment variables via pydantic-settings.
Never hardcode secrets — use the .env file (which is gitignored).
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path

# Disable ChromaDB telemetry phone-home
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── API & App ──────────────────────────────────────────────────────────────
    app_name: str = Field(default="Production RAG Service", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")

    # ── CORS ───────────────────────────────────────────────────────────────────
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins (frontend URLs)",
    )

    # ── Google AI ──────────────────────────────────────────────────────────────
    google_api_key: str = Field(default="", description="Google AI Studio API key")

    # LLM models
    llm_model: str = Field(
        default="gemini-2.5-flash",
        description="Gemini model for answer generation",
    )
    judge_model: str = Field(
        default="gemini-2.5-pro",
        description="Gemini model for LLM-as-a-judge evaluation",
    )
    eval_model: str = Field(
        default="gemini-2.5-flash-lite",
        description="Gemini model for bulk evaluation runs",
    )

    # Embedding models
    embedding_model_a: str = Field(
        default="models/gemini-embedding-exp-03-07",
        description="Primary embedding model (Config A — highest quality)",
    )
    embedding_model_b: str = Field(
        default="models/text-embedding-004",
        description="Secondary embedding model (Config B — comparison)",
    )
    active_embedding_model: str = Field(
        default="models/gemini-embedding-exp-03-07",
        description="Currently active embedding model",
    )

    # ── Chunking ───────────────────────────────────────────────────────────────
    # Config A: Recursive splitter (default / production)
    chunk_size_a: int = Field(default=512, description="Chunk token size for Config A")
    chunk_overlap_a: int = Field(default=50, description="Chunk overlap tokens for Config A")

    # Config B: Fixed-size splitter (evaluation comparison)
    chunk_size_b: int = Field(default=256, description="Chunk token size for Config B")
    chunk_overlap_b: int = Field(default=32, description="Chunk overlap tokens for Config B")

    # Active chunking config (switch via env var during eval)
    active_chunk_size: int = Field(default=512, description="Active chunk size")
    active_chunk_overlap: int = Field(default=50, description="Active chunk overlap")

    # ── Retrieval ──────────────────────────────────────────────────────────────
    retrieval_top_k: int = Field(default=5, description="Number of chunks to retrieve")
    similarity_threshold: float = Field(
        default=0.35,
        description="Minimum similarity score (0–1) to include a chunk",
    )

    # ── LLM generation ────────────────────────────────────────────────────────
    llm_temperature: float = Field(default=0.1, description="LLM temperature (low = more grounded)")
    llm_max_output_tokens: int = Field(default=2048, description="Max tokens in LLM response")
    llm_timeout_seconds: int = Field(default=30, description="Timeout for LLM API calls")

    # ── Embedding API ─────────────────────────────────────────────────────────
    embedding_timeout_seconds: int = Field(default=20, description="Timeout for embedding API calls")
    embedding_batch_size: int = Field(default=10, description="Chunks to embed per API call")
    embedding_max_retries: int = Field(default=3, description="Max retries on embedding API errors")

    # ── File upload ───────────────────────────────────────────────────────────
    max_file_size_mb: int = Field(default=50, description="Maximum allowed file size in MB")
    allowed_file_types: list[str] = Field(
        default=["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        description="Allowed MIME types for upload",
    )
    allowed_extensions: list[str] = Field(
        default=[".pdf", ".docx"],
        description="Allowed file extensions",
    )
    upload_dir: Path = Field(
        default=Path("uploaded_files"),
        description="Directory for storing uploaded files",
    )

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    chroma_persist_dir: Path = Field(
        default=Path("chroma_db"),
        description="ChromaDB persistence directory",
    )
    chroma_collection_name: str = Field(
        default="rag_documents",
        description="ChromaDB collection name",
    )

    # ── Guardrails ────────────────────────────────────────────────────────────
    max_question_length: int = Field(
        default=1000,
        description="Maximum allowed question length in characters",
    )
    min_question_length: int = Field(
        default=3,
        description="Minimum question length in characters",
    )

    # ── Rate limiting ─────────────────────────────────────────────────────────
    rate_limit_requests: int = Field(default=60, description="Max requests per minute per IP")

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Ensure log level is a valid Python logging level."""
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in valid:
            raise ValueError(f"log_level must be one of {valid}")
        return upper

    @field_validator("similarity_threshold")
    @classmethod
    def validate_threshold(cls, v: float) -> float:
        """Ensure similarity threshold is in [0, 1]."""
        if not 0.0 <= v <= 1.0:
            raise ValueError("similarity_threshold must be between 0.0 and 1.0")
        return v

    @property
    def max_file_size_bytes(self) -> int:
        """Return max file size in bytes."""
        return self.max_file_size_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached Settings singleton.

    Using lru_cache ensures settings are only loaded once from disk/env,
    and the same instance is reused across the entire app lifetime.
    """
    return Settings()


# Configure structured logging at module load based on settings
def configure_logging(level: str = "INFO") -> None:
    """Configure structlog with consistent formatting for the application."""
    import structlog

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.dev.ConsoleRenderer() if level == "DEBUG" else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level, logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
