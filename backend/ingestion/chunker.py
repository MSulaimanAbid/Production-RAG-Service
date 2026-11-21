"""
Text chunking strategies with page and section metadata attribution.

Config A: RecursiveCharacterTextSplitter (512 tokens / 50 overlap) - production default
Config B: CharacterTextSplitter (256 tokens / 32 overlap) - evaluation comparison
"""
from __future__ import annotations

from dataclasses import dataclass

from langchain_text_splitters import CharacterTextSplitter, RecursiveCharacterTextSplitter
import structlog

from backend.config import get_settings
from backend.ingestion.extractor import ExtractedPage

logger = structlog.get_logger(__name__)
settings = get_settings()


@dataclass
class Chunk:
    """A single text chunk with its associated metadata."""
    chunk_id: str
    doc_id: str
    filename: str
    file_type: str
    text: str
    chunk_index: int
    total_chunks: int
    char_start: int
    char_end: int
    page_number: int | None
    section_title: str | None


def get_text_splitter(
    strategy: str = "recursive",
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
):
    """Factory to instantiate text splitters for Config A or Config B."""
    size = chunk_size or settings.active_chunk_size
    overlap = chunk_overlap or settings.active_chunk_overlap

    if strategy.lower() == "fixed":
        return CharacterTextSplitter(
            separator=". ",
            chunk_size=size,
            chunk_overlap=overlap,
            is_separator_regex=False,
        )
    else:
        # Default: recursive splitter (Config A)
        return RecursiveCharacterTextSplitter(
            chunk_size=size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            keep_separator=True,
        )


def chunk_extracted_pages(
    doc_id: str,
    filename: str,
    file_type: str,
    pages: list[ExtractedPage],
    strategy: str = "recursive",
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    """
    Split extracted pages into discrete chunks while preserving page numbers and section headers.

    Args:
        doc_id: Unique document UUID.
        filename: Original file name.
        file_type: 'pdf' or 'docx'.
        pages: List of ExtractedPage objects from the extractor.
        strategy: 'recursive' or 'fixed'.
        chunk_size: Optional token/char size override.
        chunk_overlap: Optional overlap override.

    Returns:
        List of Chunk objects ready for embedding and storage.
    """
    splitter = get_text_splitter(strategy=strategy, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    raw_chunks: list[dict] = []
    global_char_offset = 0

    for page in pages:
        if page.is_empty:
            continue

        page_text = page.text
        sub_chunks = splitter.split_text(page_text)

        page_char_offset = 0
        for text_chunk in sub_chunks:
            text_chunk_clean = text_chunk.strip()
            if not text_chunk_clean:
                continue

            # Calculate relative offsets within page/section
            start_in_page = page_text.find(text_chunk_clean, page_char_offset)
            if start_in_page == -1:
                start_in_page = page_char_offset
            end_in_page = start_in_page + len(text_chunk_clean)
            page_char_offset = end_in_page

            raw_chunks.append({
                "text": text_chunk_clean,
                "page_number": page.page_number,
                "section_title": page.section_title,
                "char_start": global_char_offset + start_in_page,
                "char_end": global_char_offset + end_in_page,
            })

        global_char_offset += len(page_text) + 2  # account for join newlines

    total_chunks = len(raw_chunks)
    logger.info(
        "Document chunked",
        filename=filename,
        total_chunks=total_chunks,
        strategy=strategy,
    )

    chunks: list[Chunk] = []
    for idx, raw in enumerate(raw_chunks):
        chunk_id = f"{doc_id}-chunk-{idx}"
        chunks.append(
            Chunk(
                chunk_id=chunk_id,
                doc_id=doc_id,
                filename=filename,
                file_type=file_type,
                text=raw["text"],
                chunk_index=idx,
                total_chunks=total_chunks,
                char_start=raw["char_start"],
                char_end=raw["char_end"],
                page_number=raw["page_number"],
                section_title=raw["section_title"],
            )
        )

    return chunks
