"""
Unit and integration tests for query embedding and chunk retrieval.
"""
import pytest
from unittest.mock import AsyncMock, patch
import uuid

from backend.ingestion.chunker import Chunk
from backend.ingestion.vector_store import get_vector_store
from backend.retrieval import retrieve_chunks
from backend.schemas import RetrievedChunk


@pytest.mark.asyncio
async def test_empty_query_returns_empty():
    res = await retrieve_chunks("   ")
    assert res == []


@pytest.mark.asyncio
async def test_retrieval_with_threshold_and_filter():
    store = get_vector_store()
    doc_id = str(uuid.uuid4())
    chunk_id = f"{doc_id}-chunk-0"

    # Insert a real test chunk with known dummy embedding
    sample_embedding = [0.05] * 768
    sample_chunk = Chunk(
        chunk_id=chunk_id,
        doc_id=doc_id,
        filename="retrieval_test.pdf",
        file_type="pdf",
        text="The SLS core stage produces 2.0 million pounds of thrust.",
        chunk_index=0,
        total_chunks=1,
        char_start=0,
        char_end=58,
        page_number=3,
        section_title=None,
    )
    store.add_chunks(
        chunks=[sample_chunk],
        embeddings=[sample_embedding],
        file_hash=f"hash-{doc_id}",
        page_count=5,
    )

    try:
        # Mock embed_query to return the identical embedding vector
        with patch("backend.retrieval.embed_query", new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = sample_embedding

            # 1. Normal retrieval with low threshold
            results = await retrieve_chunks(
                question="How much thrust does SLS produce?",
                top_k=5,
                similarity_threshold=0.3,
                doc_ids=[doc_id],
            )
            assert len(results) == 1
            chunk = results[0]
            assert isinstance(chunk, RetrievedChunk)
            assert chunk.doc_id == doc_id
            assert chunk.filename == "retrieval_test.pdf"
            assert chunk.page == 3
            assert chunk.similarity_score >= 0.3

            # 2. Strict threshold that filters out
            high_thresh_results = await retrieve_chunks(
                question="How much thrust does SLS produce?",
                top_k=5,
                similarity_threshold=0.9999,
                doc_ids=[doc_id],
            )
            # If similarity is not strictly >= 0.9999, it gets filtered
            assert all(c.similarity_score >= 0.9999 for c in high_thresh_results)

            # 3. Filtering by non-matching doc_id
            mismatch_results = await retrieve_chunks(
                question="How much thrust does SLS produce?",
                doc_ids=["non-existent-doc-id"],
            )
            assert len(mismatch_results) == 0

    finally:
        # Cleanup test document from vector database
        store.delete_document(doc_id)
