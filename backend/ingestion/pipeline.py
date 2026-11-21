"""
Document ingestion pipeline orchestrator.

Coordinates: validate -> compute hash -> detect duplicate (409) -> save -> extract (400)
            -> clean -> chunk -> embed (503 on API outage) -> store in ChromaDB (201).
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from pathlib import Path
import uuid

import structlog
from fastapi import HTTPException, UploadFile

from backend.config import get_settings
from backend.ingestion.chunker import chunk_extracted_pages
from backend.ingestion.cleaner import clean_text
from backend.ingestion.embedder import embed_texts
from backend.ingestion.extractor import ExtractedPage, extract_document
from backend.ingestion.vector_store import get_vector_store
from backend.schemas import DocumentResponse

logger = structlog.get_logger(__name__)
settings = get_settings()


async def ingest_document(file: UploadFile) -> DocumentResponse:
    """
    Execute the full end-to-end ingestion pipeline for an uploaded file.

    Args:
        file: Uploaded file object from FastAPI.

    Returns:
        DocumentResponse containing metadata, chunk counts, and doc_id.

    Raises:
        HTTPException 409: Duplicate file uploaded.
        HTTPException 400: No extractable text or corrupted file.
        HTTPException 415: Unsupported file type.
        HTTPException 503: External embedding service failure.
    """
    filename = file.filename or "unknown_file"
    ext = Path(filename).suffix.lower()

    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Only {settings.allowed_extensions} are supported.",
        )

    file_type = ext.replace(".", "")

    # Read binary content to compute SHA-256 hash
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file '{filename}' is completely empty (0 bytes).",
        )

    file_hash = hashlib.sha256(content).hexdigest()
    vector_store = get_vector_store()

    # Duplicate detection (PDF Section 3.B: "Detect duplicate uploads instead of storing same content twice")
    existing_id = vector_store.document_exists_by_hash(file_hash)
    if existing_id:
        logger.info("Duplicate document detected", filename=filename, existing_id=existing_id)
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate document. Content identical to existing document with doc_id '{existing_id}'.",
        )

    doc_id = str(uuid.uuid4())
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    saved_path = settings.upload_dir / f"{doc_id}_{filename}"

    # Write file to local disk for persistence
    try:
        with open(saved_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error("Failed to write uploaded file to disk", filename=filename, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.") from e

    # Text extraction
    try:
        extraction_result = await extract_document(saved_path, file_type)
    except ValueError as val_err:
        # Catch empty / scanned PDF errors and return 400 Bad Request
        logger.warning("Extraction rejected file", filename=filename, error=str(val_err))
        # Clean up file on disk
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as exc:
        logger.error("Unexpected error during text extraction", filename=filename, error=str(exc))
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to extract text from '{filename}': {exc}") from exc

    # Clean text within extracted pages
    cleaned_pages: list[ExtractedPage] = []
    for page in extraction_result.pages:
        cleaned_text = clean_text(page.text)
        cleaned_pages.append(
            ExtractedPage(
                page_number=page.page_number,
                section_title=page.section_title,
                text=cleaned_text,
                has_tables=page.has_tables,
            )
        )

    # Chunking
    chunks = chunk_extracted_pages(
        doc_id=doc_id,
        filename=filename,
        file_type=file_type,
        pages=cleaned_pages,
        strategy="recursive",
    )

    if not chunks:
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(
            status_code=400,
            detail=f"Could not produce text chunks from '{filename}'.",
        )

    # Embedding generation
    chunk_texts = [c.text for c in chunks]
    try:
        embeddings = await embed_texts(chunk_texts)
    except Exception as embed_err:
        logger.error("Embedding generation failed during ingestion", filename=filename, error=str(embed_err))
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(
            status_code=503,
            detail=f"Embedding service unavailable: {embed_err}",
        ) from embed_err

    # Storage in ChromaDB
    page_count = extraction_result.total_pages if file_type == "pdf" else None
    try:
        vector_store.add_chunks(
            chunks=chunks,
            embeddings=embeddings,
            file_hash=file_hash,
            page_count=page_count,
        )
    except Exception as store_err:
        logger.error("Failed to store chunks in vector database", error=str(store_err))
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(
            status_code=503,
            detail=f"Vector storage service unavailable: {store_err}",
        ) from store_err

    logger.info(
        "Document ingestion complete",
        doc_id=doc_id,
        filename=filename,
        chunk_count=len(chunks),
    )

    return DocumentResponse(
        doc_id=doc_id,
        filename=filename,
        file_type=file_type,
        file_hash=file_hash,
        chunk_count=len(chunks),
        page_count=page_count,
        created_at=datetime.now(timezone.utc),
        message="Document uploaded and ingested successfully.",
    )
