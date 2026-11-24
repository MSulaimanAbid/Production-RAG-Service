"""
Pydantic v2 request and response schemas for the RAG API.

All schemas use strict typing and include OpenAPI example values
to populate the /docs interface automatically.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


# ── Shared / sub-models ────────────────────────────────────────────────────────

class ChunkMetadata(BaseModel):
    """Metadata attached to every stored document chunk."""

    chunk_id: str = Field(..., description="Unique chunk identifier (UUID)")
    doc_id: str = Field(..., description="Parent document identifier (UUID)")
    filename: str = Field(..., description="Original filename of the source document")
    file_type: str = Field(..., description="File type: 'pdf' or 'docx'")
    page: int | None = Field(None, description="Source page number (1-indexed, PDF only)")
    section: str | None = Field(None, description="Section heading (DOCX only)")
    chunk_index: int = Field(..., description="Position of this chunk within the document (0-indexed)")
    total_chunks: int = Field(..., description="Total number of chunks in the document")
    char_start: int = Field(..., description="Character offset where this chunk starts in the full text")
    char_end: int = Field(..., description="Character offset where this chunk ends in the full text")


class RetrievedChunk(BaseModel):
    """A chunk returned from vector search, with its similarity score."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    doc_id: str = Field(..., description="Parent document identifier")
    filename: str = Field(..., description="Source document filename")
    file_type: str = Field(..., description="File type: 'pdf' or 'docx'")
    page: int | None = Field(None, description="Page number")
    section: str | None = Field(None, description="Section heading")
    chunk_index: int = Field(..., description="Chunk position in document")
    text: str = Field(..., description="The actual chunk text")
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score (0.0–1.0, higher is more relevant)",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "chunk_id": "abc123-chunk-5",
                "doc_id": "abc123",
                "filename": "policy.pdf",
                "file_type": "pdf",
                "page": 3,
                "section": None,
                "chunk_index": 5,
                "text": "Remote employees are entitled to 20 days of annual leave...",
                "similarity_score": 0.87,
            }
        }
    }


class Citation(BaseModel):
    """A validated citation pointing to an actually-retrieved chunk."""

    chunk_id: str = Field(..., description="The chunk this citation refers to")
    doc_id: str = Field(..., description="Parent document identifier")
    filename: str = Field(..., description="Source document filename")
    page: int | None = Field(None, description="Page number")
    section: str | None = Field(None, description="Section heading")
    excerpt: str = Field(..., description="Short excerpt from the cited chunk (first 200 chars)")


# ── Document endpoints ─────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    """Metadata for a successfully ingested document."""

    doc_id: str = Field(..., description="Unique document identifier (UUID)")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File type: 'pdf' or 'docx'")
    file_hash: str = Field(..., description="SHA-256 hash of the file (used for dedup detection)")
    chunk_count: int = Field(..., description="Number of chunks stored in the vector database")
    page_count: int | None = Field(None, description="Total pages (PDFs only)")
    created_at: datetime = Field(..., description="Ingestion timestamp (UTC)")
    message: str = Field(default="Document ingested successfully")

    model_config = {
        "json_schema_extra": {
            "example": {
                "doc_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "filename": "policy.pdf",
                "file_type": "pdf",
                "file_hash": "e3b0c44298fc1c149afb",
                "chunk_count": 42,
                "page_count": 10,
                "created_at": "2026-11-21T07:30:00Z",
                "message": "Document ingested successfully",
            }
        }
    }


class DocumentListItem(BaseModel):
    """Summary of a document shown in the listing endpoint."""

    doc_id: str
    filename: str
    file_type: str
    chunk_count: int
    page_count: int | None
    created_at: datetime


class DocumentListResponse(BaseModel):
    """Response for GET /api/documents."""

    documents: list[DocumentListItem]
    total: int = Field(..., description="Total number of documents in the system")


# ── Ask endpoint ───────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    """Request body for POST /api/ask."""

    question: Annotated[str, Field(
        min_length=3,
        max_length=1000,
        description="The question to answer using retrieved document context",
    )]
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of chunks to retrieve (1–20)",
    )
    similarity_threshold: float = Field(
        default=0.35,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score for a chunk to be included",
    )
    doc_ids: list[str] | None = Field(
        default=None,
        description="Optional list of doc_ids to restrict retrieval to specific documents",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "question": "What is the leave policy for remote employees?",
                "top_k": 5,
                "similarity_threshold": 0.35,
                "doc_ids": None,
            }
        }
    }


class AskResponse(BaseModel):
    """Full response from the question-answering endpoint."""

    question: str = Field(..., description="The original question")
    answer: str = Field(..., description="Generated answer grounded in retrieved context")
    citations: list[Citation] = Field(
        default_factory=list,
        description="Validated citations — each points to an actually-retrieved chunk",
    )
    retrieved_chunks: list[RetrievedChunk] = Field(
        default_factory=list,
        description="All retrieved chunks with their similarity scores",
    )
    chunk_count: int = Field(..., description="Total number of chunks retrieved")
    answerable: bool = Field(
        ...,
        description="True if the system found relevant context; False if it refused to answer",
    )
    latency_ms: int = Field(..., description="Total end-to-end latency in milliseconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "question": "What is the leave policy for remote employees?",
                "answer": "Remote employees receive 20 days of annual leave. [Source: policy.pdf, page 3]",
                "citations": [
                    {
                        "chunk_id": "abc-chunk-3",
                        "doc_id": "abc123",
                        "filename": "policy.pdf",
                        "page": 3,
                        "section": None,
                        "excerpt": "Remote employees are entitled to 20 days...",
                    }
                ],
                "retrieved_chunks": [],
                "chunk_count": 5,
                "answerable": True,
                "latency_ms": 1240,
            }
        }
    }


# ── Health endpoint ────────────────────────────────────────────────────────────

class ServiceStatus(BaseModel):
    """Status of an individual service dependency."""
    status: str = Field(..., description="'ok' or 'error'")
    detail: str | None = Field(None, description="Error detail if status is 'error'")


class HealthResponse(BaseModel):
    """System health check response."""

    status: str = Field(..., description="Overall system status: 'ok' or 'degraded'")
    version: str = Field(..., description="Application version")
    vector_db: ServiceStatus
    embedding_service: ServiceStatus
    llm_service: ServiceStatus
    document_count: int = Field(..., description="Total documents currently stored")
    timestamp: datetime = Field(..., description="Health check timestamp (UTC)")


# ── Error responses ────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standard error response body used across all error codes."""

    error: str = Field(..., description="Error type / short code")
    detail: str = Field(..., description="Human-readable error description")
    request_id: str | None = Field(None, description="Request trace ID for debugging")

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "DUPLICATE_DOCUMENT",
                "detail": "A document with this content already exists (doc_id: abc123).",
                "request_id": "req-xyz-789",
            }
        }
    }


# ── Auth endpoints ─────────────────────────────────────────────────────────────

class UserLoginRequest(BaseModel):
    """User credentials for authentication."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "admin@documind.ai",
                "password": "admin123"
            }
        }
    }


class UserRegisterRequest(BaseModel):
    """Registration request for creating a new user account."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (minimum 6 characters)")
    name: str = Field(..., min_length=2, description="User display name")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "securepassword",
                "name": "Alex Johnson"
            }
        }
    }


class UserResponse(BaseModel):
    """Public user identity information."""
    id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User email address")
    name: str = Field(..., description="User display name")
    role: str = Field(default="user", description="User role ('admin' or 'user')")
    created_at: str = Field(..., description="Account creation timestamp (ISO 8601)")


class TokenResponse(BaseModel):
    """JWT Bearer authentication token and user profile."""
    access_token: str = Field(..., description="Signed JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="Authenticated user profile")
