"""
Embedding generation using Google Generative AI.

Supports batched async embedding with retry logic via tenacity.
Never logs the API key.
"""
from __future__ import annotations

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from backend.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


@retry(
    stop=stop_after_attempt(settings.embedding_max_retries),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def embed_texts(texts: list[str], model: str | None = None) -> list[list[float]]:
    """
    Generate embeddings for a list of text strings.

    Args:
        texts: List of text strings to embed.
        model: Embedding model override (defaults to active_embedding_model).

    Returns:
        List of embedding vectors (one per input text).
    """
    # Implemented in Phase 4
    raise NotImplementedError("Embedding implemented in Phase 4")


async def embed_query(query: str, model: str | None = None) -> list[float]:
    """
    Embed a single query string.

    Args:
        query: Question text to embed.
        model: Embedding model override.

    Returns:
        Embedding vector for the query.
    """
    vectors = await embed_texts([query], model=model)
    return vectors[0]
