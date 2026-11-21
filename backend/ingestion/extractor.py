"""
Text extraction from PDF and DOCX files.

Supported formats:
  - PDF  -> pdfplumber (primary) with pypdf fallback
  - DOCX -> python-docx

Returns structured page/section data with metadata for downstream chunking.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class ExtractedPage:
    """Represents a single extracted page or section from a document."""
    page_number: int | None     # 1-indexed; None for DOCX sections
    section_title: str | None   # Heading text; None for PDFs
    text: str                   # Extracted text content
    has_tables: bool = False    # Whether tables were detected
    is_empty: bool = field(init=False)

    def __post_init__(self) -> None:
        self.is_empty = not bool(self.text.strip())


@dataclass
class ExtractionResult:
    """Full extraction result for a document."""
    filename: str
    file_type: str              # 'pdf' or 'docx'
    pages: list[ExtractedPage]
    total_pages: int
    full_text: str              # Concatenated text for chunking
    extraction_warnings: list[str] = field(default_factory=list)


async def extract_pdf(file_path: Path) -> ExtractionResult:
    """
    Extract text from a PDF file using pdfplumber with pypdf fallback.

    Args:
        file_path: Path to the saved PDF file.

    Returns:
        ExtractionResult with per-page text and metadata.
    """
    # Implemented in Phase 4
    raise NotImplementedError("PDF extraction implemented in Phase 4")


async def extract_docx(file_path: Path) -> ExtractionResult:
    """
    Extract text from a DOCX file using python-docx.

    Args:
        file_path: Path to the saved DOCX file.

    Returns:
        ExtractionResult with section-based text and metadata.
    """
    # Implemented in Phase 4
    raise NotImplementedError("DOCX extraction implemented in Phase 4")


async def extract_document(file_path: Path, file_type: str) -> ExtractionResult:
    """
    Route to the correct extractor based on file type.

    Args:
        file_path: Path to the document file.
        file_type: 'pdf' or 'docx'

    Returns:
        ExtractionResult
    """
    if file_type == "pdf":
        return await extract_pdf(file_path)
    elif file_type == "docx":
        return await extract_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
