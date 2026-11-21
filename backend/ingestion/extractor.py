"""
Text extraction from PDF and DOCX files.

Supported formats:
  - PDF  -> pdfplumber (primary) with pypdf fallback
  - DOCX -> python-docx

Returns structured page/section data with metadata for downstream chunking.
Handles tables, headers, and detects scanned/empty documents.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
import docx
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class ExtractedPage:
    """Represents a single extracted page or section from a document."""
    page_number: int | None       # 1-indexed; None for DOCX sections
    section_title: str | None     # Heading text; None for PDFs
    text: str                     # Extracted text content
    has_tables: bool = False      # Whether tables were detected
    is_empty: bool = field(init=False)

    def __post_init__(self) -> None:
        self.is_empty = not bool(self.text.strip())


@dataclass
class ExtractionResult:
    """Full extraction result for a document."""
    filename: str
    file_type: str                # 'pdf' or 'docx'
    pages: list[ExtractedPage]
    total_pages: int
    full_text: str                # Concatenated text for chunking
    extraction_warnings: list[str] = field(default_factory=list)


def extract_pdf_sync(file_path: Path) -> ExtractionResult:
    """
    Extract text from a PDF file using pdfplumber with pypdf fallback.

    Args:
        file_path: Path to the PDF file on disk.

    Returns:
        ExtractionResult with page-level text and metadata.

    Raises:
        ValueError: If PDF is empty or has no extractable text (e.g. scanned image).
    """
    filename = file_path.name
    extracted_pages: list[ExtractedPage] = []
    warnings: list[str] = []

    # Attempt primary extraction with pdfplumber
    try:
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            if total_pages == 0:
                raise ValueError(f"PDF '{filename}' contains 0 pages.")

            for idx, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                tables = page.extract_tables() or []
                has_tables = len(tables) > 0

                # If tables found, append formatted table text to preserve tabular context
                if has_tables:
                    table_texts: list[str] = []
                    for t in tables:
                        table_str = "\n".join(
                            " | ".join(str(cell).strip() if cell is not None else "" for cell in row)
                            for row in t if any(row)
                        )
                        if table_str:
                            table_texts.append(table_str)
                    if table_texts:
                        page_text = f"{page_text}\n\n[Tables Extracted]:\n" + "\n\n".join(table_texts)

                extracted_pages.append(
                    ExtractedPage(
                        page_number=idx,
                        section_title=None,
                        text=page_text,
                        has_tables=has_tables,
                    )
                )

    except Exception as e:
        logger.warning("pdfplumber extraction failed; attempting pypdf fallback", filename=filename, error=str(e))
        warnings.append(f"pdfplumber failed: {e}; used pypdf fallback")
        extracted_pages = []

        try:
            reader = PdfReader(str(file_path))
            total_pages = len(reader.pages)
            if total_pages == 0:
                raise ValueError(f"PDF '{filename}' contains 0 pages.")

            for idx, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                extracted_pages.append(
                    ExtractedPage(
                        page_number=idx,
                        section_title=None,
                        text=page_text,
                        has_tables=False,
                    )
                )
        except Exception as fallback_err:
            logger.error("Both pdfplumber and pypdf failed to extract text", filename=filename, error=str(fallback_err))
            raise ValueError(f"Could not read PDF '{filename}': {fallback_err}") from fallback_err

    # Check for empty text (scanned PDF edge case)
    non_empty_pages = [p for p in extracted_pages if not p.is_empty]
    full_text = "\n\n".join(p.text for p in non_empty_pages)

    if not full_text.strip():
        logger.warning("No extractable text found in PDF (likely scanned)", filename=filename)
        raise ValueError(
            f"PDF '{filename}' contains no extractable text. Scanned PDFs without OCR are not supported."
        )

    return ExtractionResult(
        filename=filename,
        file_type="pdf",
        pages=extracted_pages,
        total_pages=len(extracted_pages),
        full_text=full_text,
        extraction_warnings=warnings,
    )


def extract_docx_sync(file_path: Path) -> ExtractionResult:
    """
    Extract text from a DOCX file using python-docx.
    Preserves heading hierarchy as section metadata and extracts tables inline.

    Args:
        file_path: Path to the DOCX file on disk.

    Returns:
        ExtractionResult with section-based text and metadata.

    Raises:
        ValueError: If the DOCX is empty or contains no extractable text.
    """
    filename = file_path.name

    try:
        doc = docx.Document(str(file_path))
    except Exception as e:
        logger.error("Failed to open DOCX file", filename=filename, error=str(e))
        raise ValueError(f"Could not read DOCX '{filename}': {e}") from e

    extracted_pages: list[ExtractedPage] = []
    current_section = "Overview"
    current_section_texts: list[str] = []

    # Process paragraphs
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        if para.style and para.style.name and para.style.name.startswith("Heading"):
            # Flush previous section
            if current_section_texts:
                extracted_pages.append(
                    ExtractedPage(
                        page_number=None,
                        section_title=current_section,
                        text="\n".join(current_section_texts),
                        has_tables=False,
                    )
                )
                current_section_texts = []
            current_section = text
        else:
            current_section_texts.append(text)

    # Process tables in DOCX
    has_tables = len(doc.tables) > 0
    if has_tables:
        table_lines: list[str] = []
        for t in doc.tables:
            for row in t.rows:
                cells = [c.text.strip() for c in row.cells]
                if any(cells):
                    table_lines.append(" | ".join(cells))
        if table_lines:
            current_section_texts.append("\n[Document Tables]:\n" + "\n".join(table_lines))

    # Flush final section
    if current_section_texts:
        extracted_pages.append(
            ExtractedPage(
                page_number=None,
                section_title=current_section,
                text="\n".join(current_section_texts),
                has_tables=has_tables,
            )
        )

    non_empty = [p for p in extracted_pages if not p.is_empty]
    full_text = "\n\n".join(p.text for p in non_empty)

    if not full_text.strip():
        logger.warning("No extractable text found in DOCX", filename=filename)
        raise ValueError(f"DOCX '{filename}' contains no extractable text.")

    return ExtractionResult(
        filename=filename,
        file_type="docx",
        pages=extracted_pages,
        total_pages=len(extracted_pages),
        full_text=full_text,
    )


async def extract_document(file_path: Path, file_type: str) -> ExtractionResult:
    """
    Async router to extract text from a file based on file type.

    Args:
        file_path: Path to the document file.
        file_type: 'pdf' or 'docx'.

    Returns:
        ExtractionResult
    """
    file_type_clean = file_type.lower().strip().replace(".", "")
    if file_type_clean == "pdf":
        return extract_pdf_sync(file_path)
    elif file_type_clean == "docx":
        return extract_docx_sync(file_path)
    else:
        raise ValueError(f"Unsupported file type: '{file_type}'. Supported types are 'pdf' and 'docx'.")
