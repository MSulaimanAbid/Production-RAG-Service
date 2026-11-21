"""
FastAPI application entry point.

This module contains ONLY:
  - Application factory and lifespan
  - Route definitions (thin — all logic delegated to service modules)
  - Middleware configuration
  - Exception handlers

Business logic belongs in ingestion/, retrieval.py, generation.py, guardrails.py.
"""
from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import configure_logging, get_settings
from backend.schemas import (
    AskRequest,
    AskResponse,
    DocumentListResponse,
    DocumentResponse,
    ErrorResponse,
    HealthResponse,
    ServiceStatus,
)

# ── Bootstrap ──────────────────────────────────────────────────────────────────
settings = get_settings()
configure_logging(settings.log_level)
logger = structlog.get_logger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup and clean up on shutdown."""
    logger.info("Starting up RAG service", version=settings.app_version)

    # Lazy imports to avoid circular deps at module level
    from backend.ingestion.vector_store import get_vector_store
    from backend.config import get_settings

    cfg = get_settings()
    cfg.upload_dir.mkdir(parents=True, exist_ok=True)
    cfg.chroma_persist_dir.mkdir(parents=True, exist_ok=True)

    # Initialize ChromaDB collection (creates if not exists)
    vector_store = get_vector_store()
    logger.info("ChromaDB initialized", collection=cfg.chroma_collection_name)

    yield  # Application runs here

    logger.info("Shutting down RAG service")


# ── App factory ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Production-grade Retrieval-Augmented Generation service. "
        "Upload documents, ask questions, get grounded answers with citations."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files ──────────────────────────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
from pathlib import Path
_frontend_dir = Path("frontend")
_frontend_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_frontend_dir)), name="static")


# ── Request ID middleware ──────────────────────────────────────────────────────
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Attach a unique request ID to every request and log latency."""
    request_id = str(uuid.uuid4())[:8]
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start = time.monotonic()
    response = await call_next(request)
    latency_ms = int((time.monotonic() - start) * 1000)

    logger.info(
        "HTTP request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        latency_ms=latency_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


# ── Global exception handlers ─────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Return consistent error response shape for all HTTP exceptions."""
    request_id = structlog.contextvars.get_contextvars().get("request_id")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=_status_to_error_code(exc.status_code),
            detail=exc.detail,
            request_id=request_id,
        ).model_dump(mode="json"),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected exceptions to guarantee JSON error response format."""
    request_id = structlog.contextvars.get_contextvars().get("request_id")
    logger.error("Unhandled server exception", error=str(exc), path=request.url.path, exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_SERVER_ERROR",
            detail=str(exc) or "An internal server error occurred.",
            request_id=request_id,
        ).model_dump(mode="json"),
    )


def _status_to_error_code(status: int) -> str:
    """Map HTTP status codes to short error code strings."""
    return {
        400: "BAD_REQUEST",
        404: "NOT_FOUND",
        409: "CONFLICT",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMIT_EXCEEDED",
        503: "SERVICE_UNAVAILABLE",
    }.get(status, "ERROR")


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── Frontend Single Page Application ──────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def serve_frontend() -> Any:
    """Serve the modern React + Tailwind web application interface."""
    from fastapi.responses import FileResponse
    from pathlib import Path

    index_path = Path("frontend") / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({"message": f"Welcome to {settings.app_name} API. Visit /docs for OpenAPI specs."})

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check the status of all system components.",
    tags=["System"],
)
async def health_check() -> HealthResponse:
    """Return health status of vector DB, embedding service, and LLM."""
    from datetime import datetime, timezone
    from backend.ingestion.vector_store import get_vector_store

    vector_store = get_vector_store()

    # Check ChromaDB
    try:
        doc_count = vector_store.get_document_count()
        vdb_status = ServiceStatus(status="ok")
    except Exception as e:
        doc_count = 0
        vdb_status = ServiceStatus(status="error", detail=str(e))

    # TODO: add lightweight embedding + LLM ping in Phase 7
    embed_status = ServiceStatus(status="ok")
    llm_status = ServiceStatus(status="ok")

    overall = "ok" if all(
        s.status == "ok" for s in [vdb_status, embed_status, llm_status]
    ) else "degraded"

    return HealthResponse(
        status=overall,
        version=settings.app_version,
        vector_db=vdb_status,
        embedding_service=embed_status,
        llm_service=llm_status,
        document_count=doc_count,
        timestamp=datetime.now(timezone.utc),
    )


@app.get(
    "/api/config",
    summary="Get runtime configuration",
    description="Return non-sensitive public configuration parameters for the UI.",
    tags=["System"],
)
async def get_config() -> dict[str, Any]:
    """Return public application configuration for the settings and overview panels."""
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "llm_model": settings.llm_model,
        "embedding_model": settings.active_embedding_model,
        "chunk_size": settings.active_chunk_size,
        "chunk_overlap": settings.active_chunk_overlap,
        "similarity_threshold": settings.similarity_threshold,
        "retrieval_top_k": settings.retrieval_top_k,
        "max_file_size_mb": settings.max_file_size_mb,
        "allowed_extensions": settings.allowed_extensions,
    }


# ── Documents ──────────────────────────────────────────────────────────────────
@app.post(
    "/api/documents",
    response_model=DocumentResponse,
    status_code=201,
    summary="Upload and ingest a document",
    description=(
        "Upload a PDF or DOCX file. The service validates, extracts, chunks, "
        "embeds, and stores the document. Returns 409 if the file already exists."
    ),
    tags=["Documents"],
    responses={
        400: {"model": ErrorResponse, "description": "Empty file or no extractable text"},
        409: {"model": ErrorResponse, "description": "Duplicate document"},
        415: {"model": ErrorResponse, "description": "Unsupported file type"},
        503: {"model": ErrorResponse, "description": "Embedding service unavailable"},
    },
)
async def upload_document(file: UploadFile = File(...)) -> DocumentResponse:
    """Ingest an uploaded document through the full pipeline."""
    from backend.ingestion.pipeline import ingest_document
    from backend.guardrails import validate_upload

    # Guardrail: validate file before reading content
    await validate_upload(file)

    # Run the full ingestion pipeline
    result = await ingest_document(file)
    return result


@app.get(
    "/api/documents",
    response_model=DocumentListResponse,
    summary="List all documents",
    description="Return a list of all ingested documents and their metadata.",
    tags=["Documents"],
)
async def list_documents() -> DocumentListResponse:
    """List all documents currently stored in the system."""
    from backend.ingestion.vector_store import get_vector_store

    vector_store = get_vector_store()
    documents = vector_store.list_documents()
    return DocumentListResponse(documents=documents, total=len(documents))


@app.get(
    "/api/documents/{doc_id}",
    response_model=DocumentResponse,
    summary="Get document details",
    description="Return full metadata for a specific document by its ID.",
    tags=["Documents"],
    responses={404: {"model": ErrorResponse, "description": "Document not found"}},
)
async def get_document(doc_id: str) -> DocumentResponse:
    """Get metadata for a single document."""
    from backend.ingestion.vector_store import get_vector_store

    vector_store = get_vector_store()
    doc = vector_store.get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
    return doc


@app.delete(
    "/api/documents/{doc_id}",
    status_code=204,
    summary="Delete a document",
    description=(
        "Delete a document and ALL its associated vectors from the database. "
        "Deleted content will never appear in future answers."
    ),
    tags=["Documents"],
    responses={404: {"model": ErrorResponse, "description": "Document not found"}},
)
async def delete_document(doc_id: str) -> None:
    """Delete a document and all its vectors."""
    from backend.ingestion.vector_store import get_vector_store

    vector_store = get_vector_store()
    deleted = vector_store.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
    logger.info("Document deleted", doc_id=doc_id)


# ── Ask ────────────────────────────────────────────────────────────────────────
@app.post(
    "/api/ask",
    response_model=AskResponse,
    summary="Ask a question",
    description=(
        "Embed the question, retrieve relevant chunks, and generate a grounded answer "
        "with validated citations. Returns a refusal if the documents cannot answer."
    ),
    tags=["QA"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or blocked question"},
        503: {"model": ErrorResponse, "description": "LLM or embedding service unavailable"},
    },
)
async def ask_question(request: AskRequest) -> AskResponse:
    """Full RAG pipeline: retrieve relevant chunks and generate a grounded answer."""
    from backend.guardrails import validate_question
    from backend.retrieval import retrieve_chunks
    from backend.generation import generate_answer

    start = time.monotonic()

    # Guardrail: validate question before any API calls
    await validate_question(request.question)

    # Retrieve relevant chunks
    chunks = await retrieve_chunks(
        question=request.question,
        top_k=request.top_k,
        similarity_threshold=request.similarity_threshold,
        doc_ids=request.doc_ids,
    )

    # Generate grounded answer
    answer_data = await generate_answer(
        question=request.question,
        chunks=chunks,
    )

    latency_ms = int((time.monotonic() - start) * 1000)

    return AskResponse(
        question=request.question,
        answer=answer_data["answer"],
        citations=answer_data["citations"],
        retrieved_chunks=chunks,
        chunk_count=len(chunks),
        answerable=answer_data["answerable"],
        latency_ms=latency_ms,
    )
