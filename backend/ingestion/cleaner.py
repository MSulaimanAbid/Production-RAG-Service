"""
Text cleaning and normalization for extracted document content.
"""
from __future__ import annotations

import re
import unicodedata


def clean_text(text: str) -> str:
    """
    Normalize extracted document text for consistent chunking and embedding.

    Operations (in order):
      1. Unicode normalization (NFC)
      2. Remove null bytes and control characters
      3. Fix broken hyphenation (word-\\nnext -> wordnext)
      4. Normalize whitespace (collapse multiple spaces/newlines)
      5. Strip leading/trailing whitespace

    Args:
        text: Raw extracted text.

    Returns:
        Cleaned text string.
    """
    if not text:
        return ""

    # Unicode normalization
    text = unicodedata.normalize("NFC", text)

    # Remove null bytes and control chars (except tab and newline)
    text = "".join(ch for ch in text if ch in ("\t", "\n") or unicodedata.category(ch)[0] != "C")

    # Fix hyphenation across line breaks
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

    # Normalize excessive newlines and spaces
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()
