"""
Retrieval engine: embed query -> vector search -> filter -> (optional rerank).

This module is stateless - it takes a question and returns ranked chunks.
"""
from __future__ import annotations

import structlog

from backend.config import get_settings
from backend.schemas import RetrievedChunk

logger = structlog.get_logger(__name__)
settings = get_settings()


async def retrieve_chunks(
    question: str,
    top_k: int | None = None,
    similarity_threshold: float | None = None,
    doc_ids: list[str] | None = None,
) -> list[RetrievedChunk]:
    """
    Retrieve the most relevant document chunks for a question.

    Pipeline:
      1. Embed the question
      2. Query ChromaDB for top_k nearest neighbours
      3. Convert distances to similarity scores
      4. Filter chunks below similarity_threshold
      5. (Optional) Rerank with flashrank

    Args:
        question: User's natural language question.
        top_k: Number of chunks to retrieve. Defaults to settings value.
        similarity_threshold: Minimum score. Defaults to settings value.
        doc_ids: Restrict retrieval to these document IDs.

    Returns:
        List of RetrievedChunk objects, sorted by similarity descending.
    """
    # Implemented in Phase 5
    raise NotImplementedError("Retrieval implemented in Phase 5")
