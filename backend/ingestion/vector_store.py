"""
ChromaDB vector store interface.

Single responsibility: all ChromaDB operations go through this module.
Features:
  - Persistent storage in settings.chroma_persist_dir
  - Cosine distance index
  - Chunk deduplication by file SHA-256 hash
  - Document deletion with vector cleanup
  - Metadata filtering by doc_id
"""
from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings
import structlog

from backend.config import get_settings
from backend.ingestion.chunker import Chunk
from backend.schemas import DocumentListItem, DocumentResponse

logger = structlog.get_logger(__name__)
settings = get_settings()


class VectorStore:
    """Wrapper around ChromaDB for storing, listing, querying, and deleting document vectors."""

    def __init__(self) -> None:
        settings.chroma_persist_dir.mkdir(parents=True, exist_ok=True)
        client_settings = ChromaSettings(
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
            current_chunks=self._collection.count(),
        )

    def get_document_count(self) -> int:
        """Return total number of unique documents currently stored."""
        try:
            results = self._collection.get(include=["metadatas"])
            if not results or not results.get("metadatas"):
                return 0
            doc_ids = {m.get("doc_id") for m in results["metadatas"] if m and "doc_id" in m}
            return len(doc_ids)
        except Exception as e:
            logger.error("Failed to count documents in vector store", error=str(e))
            return 0

    def document_exists_by_hash(self, file_hash: str) -> str | None:
        """
        Check if a document with this SHA-256 hash has already been ingested.

        Args:
            file_hash: SHA-256 hex digest of the uploaded file.

        Returns:
            Existing doc_id if duplicate found, None otherwise.
        """
        try:
            results = self._collection.get(
                where={"file_hash": file_hash},
                include=["metadatas"],
                limit=1,
            )
            if results and results.get("metadatas") and len(results["metadatas"]) > 0:
                first_meta = results["metadatas"][0]
                return str(first_meta.get("doc_id"))
        except Exception as e:
            logger.error("Error checking document duplicate hash", error=str(e))
        return None

    def add_chunks(
        self,
        chunks: list[Chunk],
        embeddings: list[list[float]],
        file_hash: str,
        page_count: int | None = None,
    ) -> None:
        """
        Store chunk text, embeddings, and rich metadata in ChromaDB.

        Args:
            chunks: List of Chunk dataclass objects.
            embeddings: Corresponding embedding vectors.
            file_hash: SHA-256 file hash for dedup tracking.
            page_count: Total pages if PDF.
        """
        if not chunks:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for chunk in chunks:
            ids.append(chunk.chunk_id)
            documents.append(chunk.text)
            metadatas.append({
                "doc_id": chunk.doc_id,
                "filename": chunk.filename,
                "file_type": chunk.file_type,
                "file_hash": file_hash,
                "chunk_index": chunk.chunk_index,
                "total_chunks": chunk.total_chunks,
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
                "page": chunk.page_number if chunk.page_number is not None else -1,
                "section": chunk.section_title or "",
                "page_count": page_count if page_count is not None else -1,
                "created_at": now_iso,
            })

        self._collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(
            "Stored chunks in ChromaDB",
            doc_id=chunks[0].doc_id,
            chunk_count=len(chunks),
        )

    def list_documents(self) -> list[DocumentListItem]:
        """
        Aggregate and list all unique documents stored in ChromaDB.

        Returns:
            List of DocumentListItem summaries sorted by creation time descending.
        """
        try:
            results = self._collection.get(include=["metadatas"])
            metadatas = results.get("metadatas") or []
        except Exception as e:
            logger.error("Failed to retrieve documents for listing", error=str(e))
            return []

        doc_map: dict[str, dict[str, Any]] = {}
        for m in metadatas:
            if not m or "doc_id" not in m:
                continue
            doc_id = str(m["doc_id"])
            if doc_id not in doc_map:
                created_raw = m.get("created_at")
                if isinstance(created_raw, str):
                    try:
                        created_dt = datetime.fromisoformat(created_raw)
                    except ValueError:
                        created_dt = datetime.now(timezone.utc)
                else:
                    created_dt = datetime.now(timezone.utc)

                page_cnt = int(m.get("page_count", -1))
                doc_map[doc_id] = {
                    "doc_id": doc_id,
                    "filename": str(m.get("filename", "")),
                    "file_type": str(m.get("file_type", "")),
                    "chunk_count": int(m.get("total_chunks", 1)),
                    "page_count": page_cnt if page_cnt > 0 else None,
                    "created_at": created_dt,
                }

        items = [
            DocumentListItem(
                doc_id=d["doc_id"],
                filename=d["filename"],
                file_type=d["file_type"],
                chunk_count=d["chunk_count"],
                page_count=d["page_count"],
                created_at=d["created_at"],
            )
            for d in doc_map.values()
        ]
        items.sort(key=lambda x: x.created_at, reverse=True)
        return items

    def get_document(self, doc_id: str) -> DocumentResponse | None:
        """
        Fetch complete document metadata by its doc_id.

        Args:
            doc_id: Unique document UUID.

        Returns:
            DocumentResponse if found, None otherwise.
        """
        results = self._collection.get(
            where={"doc_id": doc_id},
            include=["metadatas"],
            limit=1,
        )
        if not results or not results.get("metadatas") or len(results["metadatas"]) == 0:
            return None

        m = results["metadatas"][0]
        created_raw = m.get("created_at")
        try:
            created_dt = datetime.fromisoformat(str(created_raw))
        except (ValueError, TypeError):
            created_dt = datetime.now(timezone.utc)

        page_cnt = int(m.get("page_count", -1))
        return DocumentResponse(
            doc_id=doc_id,
            filename=str(m.get("filename", "")),
            file_type=str(m.get("file_type", "")),
            file_hash=str(m.get("file_hash", "")),
            chunk_count=int(m.get("total_chunks", 1)),
            page_count=page_cnt if page_cnt > 0 else None,
            created_at=created_dt,
            message="Document found",
        )

    def delete_document(self, doc_id: str) -> bool:
        """
        Delete a document and ALL associated chunks from ChromaDB.

        Args:
            doc_id: Document UUID to remove.

        Returns:
            True if document existed and was deleted, False if not found.
        """
        # First verify it exists
        existing = self._collection.get(
            where={"doc_id": doc_id},
            include=["metadatas"],
            limit=1,
        )
        if not existing or not existing.get("ids") or len(existing["ids"]) == 0:
            return False

        self._collection.delete(where={"doc_id": doc_id})
        logger.info("Deleted document vectors from ChromaDB", doc_id=doc_id)
        return True

    def query(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        doc_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Run cosine similarity search against stored chunk vectors.

        Args:
            query_embedding: Query embedding vector.
            top_k: Number of nearest neighbors to retrieve.
            doc_ids: Optional list of doc_ids to filter the search space.

        Returns:
            List of result dicts with chunk_id, text, metadata, and similarity score.
        """
        where_filter = None
        if doc_ids:
            if len(doc_ids) == 1:
                where_filter = {"doc_id": doc_ids[0]}
            else:
                where_filter = {"doc_id": {"$in": doc_ids}}

        total_stored = self._collection.count()
        if total_stored == 0:
            return []

        actual_k = min(top_k, total_stored)
        query_kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": actual_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            query_kwargs["where"] = where_filter

        raw_results = self._collection.query(**query_kwargs)

        formatted_results: list[dict[str, Any]] = []
        if not raw_results or not raw_results.get("ids") or len(raw_results["ids"]) == 0:
            return []

        ids = raw_results["ids"][0]
        docs = raw_results["documents"][0]
        metas = raw_results["metadatas"][0]
        dists = raw_results["distances"][0]

        for chunk_id, text, meta, dist in zip(ids, docs, metas, dists):
            # Convert cosine distance to cosine similarity: sim = 1.0 - distance
            # For normalized vectors, cosine distance is in [0, 2], sim in [-1, 1]
            similarity_score = max(0.0, min(1.0, 1.0 - dist))
            formatted_results.append({
                "chunk_id": chunk_id,
                "text": text,
                "metadata": meta,
                "similarity_score": round(similarity_score, 4),
            })

        return formatted_results


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    """Return the singleton VectorStore instance."""
    return VectorStore()
