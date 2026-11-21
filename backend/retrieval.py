"""
Retrieval engine: embed query -> vector search -> similarity threshold filtering -> rank.

This module is stateless and pure: it takes a search query and returns ranked,
filtered chunks adhering to the RetrievedChunk schema.
"""
from __future__ import annotations

import structlog

from backend.config import get_settings
from backend.ingestion.embedder import embed_query
from backend.ingestion.vector_store import get_vector_store
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
    Retrieve and filter the most relevant document chunks for a given query.

    Pipeline:
      1. Embed the query with task_type='retrieval_query'
      2. Query ChromaDB for top_k nearest neighbors using cosine metric
      3. Discard chunks with similarity_score < similarity_threshold
      4. Map raw results into typed RetrievedChunk models
      5. Order by similarity_score descending

    Args:
        question: Natural language question.
        top_k: Number of candidate chunks to fetch (defaults to config: 5).
        similarity_threshold: Minimum cosine similarity score (defaults to config: 0.35).
        doc_ids: Optional list of doc_ids to constrain the search space.

    Returns:
        List of RetrievedChunk models sorted by relevance.
    """
    k = top_k if top_k is not None else settings.retrieval_top_k
    threshold = similarity_threshold if similarity_threshold is not None else settings.similarity_threshold

    clean_question = question.strip()
    if not clean_question:
        logger.warning("Empty question passed to retrieval engine")
        return []

    # 1. Embed the search query
    try:
        query_vector = await embed_query(clean_question)
    except Exception as e:
        logger.error("Failed to generate embedding for query", error=str(e), question=clean_question)
        raise RuntimeError(f"Query embedding generation failed: {e}") from e

    # 2. Query ChromaDB
    vector_store = get_vector_store()
    raw_results = vector_store.query(
        query_embedding=query_vector,
        top_k=k,
        doc_ids=doc_ids,
    )

    if not raw_results:
        logger.info("No matching chunks found in vector database", question=clean_question)
        return []

    # 3. Filter by similarity threshold
    filtered_chunks: list[RetrievedChunk] = []
    for item in raw_results:
        score = item["similarity_score"]
        if score < threshold:
            logger.debug(
                "Chunk filtered out by threshold",
                chunk_id=item["chunk_id"],
                score=score,
                threshold=threshold,
            )
            continue

        meta = item.get("metadata", {})
        page_val = meta.get("page")
        page_num = int(page_val) if page_val is not None and int(page_val) > 0 else None

        section_val = meta.get("section")
        section_title = str(section_val).strip() if section_val else None

        filtered_chunks.append(
            RetrievedChunk(
                chunk_id=item["chunk_id"],
                doc_id=str(meta.get("doc_id", "")),
                filename=str(meta.get("filename", "")),
                file_type=str(meta.get("file_type", "")),
                page=page_num,
                section=section_title,
                chunk_index=int(meta.get("chunk_index", 0)),
                text=item["text"],
                similarity_score=score,
            )
        )

    # Sort descending by similarity score
    filtered_chunks.sort(key=lambda c: c.similarity_score, reverse=True)

    logger.info(
        "Retrieval complete",
        question=clean_question[:50],
        retrieved_count=len(filtered_chunks),
        top_score=filtered_chunks[0].similarity_score if filtered_chunks else 0.0,
    )

    return filtered_chunks
