"""
ChromaDB vector store interface.

Single responsibility: all ChromaDB operations go through this module.
No other module should import chromadb directly.
"""
from __future__ import annotations

from functools import lru_cache

import chromadb
import structlog

from backend.config import get_settings
from backend.schemas import DocumentListItem, DocumentResponse

logger = structlog.get_logger(__name__)
settings = get_settings()


class VectorStore:
    """Wrapper around a ChromaDB collection for the RAG system."""

    def __init__(self) -> None:
        client_settings = chromadb.config.Settings(
            anonymized_telemetry=False,
            is_persistent=True,
        )
        self._client = chromadb.PersistentClient(
            path=str(settings.chroma_persist_dir),
            settings=client_settings,
        )
        self._collection = self._client.get_or_create_collection(
            name=settings.chroma_collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "VectorStore initialized",
            collection=settings.chroma_collection_name,
            persist_dir=str(settings.chroma_persist_dir),
        )

    def get_document_count(self) -> int:
        """Return the total number of unique documents stored."""
        # Queries unique document IDs from stored chunk metadata
        try:
            results = self._collection.get(include=["metadatas"])
            if not results or not results["metadatas"]:
                return 0
            doc_ids = {m.get("doc_id") for m in results["metadatas"] if m and "doc_id" in m}
            return len(doc_ids)
        except Exception:
            return 0

    def list_documents(self) -> list[DocumentListItem]:
        """Return summary metadata for all stored documents."""
        # Implemented in Phase 4
        return []

    def get_document(self, doc_id: str) -> DocumentResponse | None:
        """Return full metadata for a document by ID, or None if not found."""
        # Implemented in Phase 4
        return None

    def delete_document(self, doc_id: str) -> bool:
        """Delete all vectors for a document."""
        # Implemented in Phase 4
        return False

    def document_exists_by_hash(self, file_hash: str) -> str | None:
        """Check if a document with this SHA-256 hash already exists."""
        # Implemented in Phase 4
        return None

    def add_chunks(
        self,
        doc_id: str,
        chunks: list[dict],
        embeddings: list[list[float]],
        document_metadata: dict,
    ) -> None:
        """Store chunk embeddings and metadata in ChromaDB."""
        # Implemented in Phase 4
        raise NotImplementedError("add_chunks implemented in Phase 4")

    def query(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        doc_ids: list[str] | None = None,
    ) -> list[dict]:
        """Run a similarity search against the collection."""
        # Implemented in Phase 5
        raise NotImplementedError("query implemented in Phase 5")


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    """Return the singleton VectorStore instance."""
    return VectorStore()
