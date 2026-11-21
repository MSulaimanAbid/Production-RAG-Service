"""
Text chunking strategies.

Config A: RecursiveCharacterTextSplitter (512 tokens, 50 overlap) - production default
Config B: CharacterTextSplitter fixed-size (256 tokens, 32 overlap) - eval comparison
"""
from __future__ import annotations

from dataclasses import dataclass

from backend.config import get_settings

settings = get_settings()


@dataclass
class Chunk:
    """A single text chunk with its associated metadata."""
    text: str
    chunk_index: int
    total_chunks: int
    char_start: int
    char_end: int
    page_number: int | None
    section_title: str | None


def chunk_text(
    text: str,
    page_map: list[tuple[int, str]] | None = None,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    strategy: str = "recursive",
) -> list[Chunk]:
    """
    Split text into chunks using the specified strategy.

    Args:
        text: Full document text to split.
        page_map: Optional list of (char_offset, page_number) for page attribution.
        chunk_size: Override the configured chunk size (tokens).
        chunk_overlap: Override the configured overlap (tokens).
        strategy: 'recursive' (Config A) or 'fixed' (Config B).

    Returns:
        List of Chunk objects with metadata.
    """
    # Implemented in Phase 4
    raise NotImplementedError("Chunking implemented in Phase 4")
