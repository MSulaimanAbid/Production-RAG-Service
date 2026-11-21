"""
Unit and integration tests for document extraction, cleaning, chunking, and vector storage.
"""
from pathlib import Path
import pytest
import uuid

from backend.ingestion.cleaner import clean_text
from backend.ingestion.extractor import extract_pdf_sync, extract_docx_sync
from backend.ingestion.chunker import chunk_extracted_pages
from backend.ingestion.vector_store import get_vector_store
from backend.ingestion.chunker import Chunk


def test_clean_text_normalizes_whitespace():
    raw = "  Hello   world \n\n\n\n next line  "
    cleaned = clean_text(raw)
    assert cleaned == "Hello world \n\n next line"


def test_clean_text_fixes_hyphenation():
    raw = "This is a trans-\nformer architecture."
    cleaned = clean_text(raw)
    assert "transformer" in cleaned


def test_extract_pdf_success():
    pdf_path = Path("corpus/pdfs/attention_is_all_you_need.pdf")
    assert pdf_path.exists(), "Corpus PDF must exist for tests"
    res = extract_pdf_sync(pdf_path)
    assert res.file_type == "pdf"
    assert res.total_pages > 0
    assert "Attention" in res.full_text


def test_extract_docx_success():
    docx_path = Path("corpus/docx/acme_global_remote_work_policy.docx")
    assert docx_path.exists(), "Corpus DOCX must exist for tests"
    res = extract_docx_sync(docx_path)
    assert res.file_type == "docx"
    assert len(res.pages) > 0
    assert "Remote Work" in res.full_text


def test_chunker_assigns_metadata():
    from backend.ingestion.extractor import ExtractedPage
    pages = [
        ExtractedPage(page_number=1, section_title=None, text="Page 1 sentence one. Page 1 sentence two."),
        ExtractedPage(page_number=2, section_title=None, text="Page 2 sentence one. Page 2 sentence two."),
    ]
    chunks = chunk_extracted_pages(
        doc_id="test-doc-123",
        filename="test.pdf",
        file_type="pdf",
        pages=pages,
        chunk_size=50,
        chunk_overlap=10,
    )
    assert len(chunks) >= 2
    for c in chunks:
        assert c.doc_id == "test-doc-123"
        assert c.filename == "test.pdf"
        assert c.page_number in (1, 2)


def test_vector_store_crud():
    store = get_vector_store()
    test_doc_id = str(uuid.uuid4())
    test_hash = f"hash-{test_doc_id}"

    sample_chunk = Chunk(
        chunk_id=f"{test_doc_id}-chunk-0",
        doc_id=test_doc_id,
        filename="crud_test.docx",
        file_type="docx",
        text="This is a test chunk for CRUD testing in ChromaDB.",
        chunk_index=0,
        total_chunks=1,
        char_start=0,
        char_end=49,
        page_number=None,
        section_title="Testing",
    )
    dummy_embedding = [0.1] * 768  # 768 dims

    # Add chunk
    store.add_chunks(
        chunks=[sample_chunk],
        embeddings=[dummy_embedding],
        file_hash=test_hash,
        page_count=None,
    )

    # Check duplicate detection by hash
    existing_id = store.document_exists_by_hash(test_hash)
    assert existing_id == test_doc_id

    # Get document
    doc = store.get_document(test_doc_id)
    assert doc is not None
    assert doc.doc_id == test_doc_id
    assert doc.filename == "crud_test.docx"

    # Query document
    results = store.query(query_embedding=dummy_embedding, top_k=1, doc_ids=[test_doc_id])
    assert len(results) == 1
    assert results[0]["chunk_id"] == f"{test_doc_id}-chunk-0"
    assert results[0]["similarity_score"] > 0.0

    # Delete document
    deleted = store.delete_document(test_doc_id)
    assert deleted is True

    # Verify no longer present
    doc_after = store.get_document(test_doc_id)
    assert doc_after is None
