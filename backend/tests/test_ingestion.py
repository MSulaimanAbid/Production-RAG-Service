"""Tests for document extraction, cleaning, and chunking."""
import pytest


def test_clean_text_normalizes_whitespace():
    from backend.ingestion.cleaner import clean_text
    raw = "  Hello   world \n\n\n\n next line  "
    cleaned = clean_text(raw)
    assert cleaned == "Hello world \n\n next line"
