"""
Embedding generation using Google GenAI SDK with batching and retries.

Supports:
  - Config A: gemini-embedding-001 (highest quality, 3072 dims)
  - Config B: gemini-embedding-2 (3072 dims)

Never logs API keys. Batches requests and handles transient rate-limiting.
"""
from __future__ import annotations

import asyncio
import re
import time
from typing import Literal

from google import genai
from google.genai import types
import structlog

from backend.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


def _embed_batch_sync(
    texts: list[str],
    model: str,
    task_type: Literal["retrieval_document", "retrieval_query"] = "retrieval_document",
) -> list[list[float]]:
    """Synchronous single-batch embedding call with adaptive Free-Tier rate limit handling."""
    if not settings.google_api_key:
        raise ValueError(
            "GOOGLE_API_KEY is not configured in .env. Please set a valid key from Google AI Studio."
        )

    clean_model = model.replace("models/", "")
    client = genai.Client(api_key=settings.google_api_key)

    max_attempts = max(5, settings.embedding_max_retries)
    last_err: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.embed_content(
                model=clean_model,
                contents=texts,
            )
            if not response or not response.embeddings:
                raise RuntimeError(f"Embedding API returned empty embedding for model '{clean_model}'")
            return [e.values for e in response.embeddings]
        except Exception as e:
            last_err = e
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                # Extract wait time from Google's response or default to 35 seconds
                wait_time = 35
                match = re.search(r"retry in (\d+(?:\.\d+)?)s", err_str, re.IGNORECASE)
                if match:
                    wait_time = int(float(match.group(1))) + 2
                logger.warning(
                    "Hit Free Tier rate limit; sleeping before retrying batch",
                    model=clean_model,
                    attempt=attempt,
                    wait_seconds=wait_time,
                )
                time.sleep(wait_time)
            elif attempt < max_attempts:
                time.sleep(3)
            else:
                break

    if last_err:
        raise last_err
    raise RuntimeError(f"Failed to embed batch after {max_attempts} attempts.")


async def embed_texts(
    texts: list[str],
    model: str | None = None,
    task_type: Literal["retrieval_document", "retrieval_query"] = "retrieval_document",
) -> list[list[float]]:
    """
    Generate dense vector embeddings for a list of text strings.
    Automatically batches texts according to embedding_batch_size to respect API quotas.

    Args:
        texts: List of text strings to embed.
        model: Model name override (defaults to active_embedding_model).
        task_type: 'retrieval_document' for chunk storage, 'retrieval_query' for questions.

    Returns:
        List of embedding vectors (floats).
    """
    if not texts:
        return []

    active_model = model or settings.active_embedding_model
    batch_size = settings.embedding_batch_size
    all_embeddings: list[list[float]] = []

    logger.debug(
        "Generating embeddings",
        total_texts=len(texts),
        model=active_model,
        batch_size=batch_size,
    )

    for i in range(0, len(texts), batch_size):
        if i > 0:
            await asyncio.sleep(2.0)
        batch = texts[i:i + batch_size]
        batch_vectors = await asyncio.to_thread(
            _embed_batch_sync,
            texts=batch,
            model=active_model,
            task_type=task_type,
        )
        all_embeddings.extend(batch_vectors)

    return all_embeddings


async def embed_query(query: str, model: str | None = None) -> list[float]:
    """
    Embed a single search query with task_type='retrieval_query'.

    Args:
        query: User question string.
        model: Optional model override.

    Returns:
        Single embedding vector as list of floats.
    """
    vectors = await embed_texts(
        texts=[query],
        model=model,
        task_type="retrieval_query",
    )
    return vectors[0]
