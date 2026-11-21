"""
Unit and integration tests for grounded answer generation, citation validation, and refusal logic.
"""
from unittest.mock import patch
import pytest

from backend.generation import (
    REFUSAL_MESSAGE,
    extract_and_validate_citations,
    format_context_prompt,
    generate_answer,
)
from backend.schemas import RetrievedChunk


@pytest.fixture
def sample_chunks() -> list[RetrievedChunk]:
    return [
        RetrievedChunk(
            chunk_id="doc-1-chunk-0",
            doc_id="doc-1",
            filename="acme_remote_policy.docx",
            file_type="docx",
            page=None,
            section="Section 3: Equipment",
            chunk_index=0,
            text="Remote employees receive a one-time equipment setup stipend of up to $1,200 USD.",
            similarity_score=0.91,
        ),
        RetrievedChunk(
            chunk_id="doc-2-chunk-2",
            doc_id="doc-2",
            filename="artemis_mission.pdf",
            file_type="pdf",
            page=4,
            section=None,
            chunk_index=2,
            text="The SLS core stage is powered by four RS-25 engines.",
            similarity_score=0.88,
        ),
    ]


def test_format_context_prompt(sample_chunks):
    prompt = format_context_prompt("What is the equipment stipend?", sample_chunks)
    assert "acme_remote_policy.docx" in prompt
    assert "Section 3: Equipment" in prompt
    assert "$1,200 USD" in prompt
    assert "What is the equipment stipend?" in prompt


def test_extract_and_validate_citations_success(sample_chunks):
    answer = (
        "Remote workers can claim up to $1,200 USD for their home office setup. "
        "[Source: acme_remote_policy.docx, Section 3: Equipment]"
    )
    cleaned_answer, citations = extract_and_validate_citations(answer, sample_chunks)
    assert len(citations) == 1
    assert citations[0].filename == "acme_remote_policy.docx"
    assert citations[0].section == "Section 3: Equipment"
    assert citations[0].chunk_id == "doc-1-chunk-0"


def test_extract_and_validate_citations_rejects_hallucination(sample_chunks):
    answer = (
        "According to the CEO, bonuses are 50%. "
        "[Source: secret_compensation_guide.pdf, page 99]"
    )
    cleaned_answer, citations = extract_and_validate_citations(answer, sample_chunks)
    assert len(citations) == 0
    # Hallucinated citation text should be removed
    assert "secret_compensation_guide.pdf" not in cleaned_answer


@pytest.mark.asyncio
async def test_generate_answer_refusal_when_no_chunks():
    res = await generate_answer("What is the CEO salary?", chunks=[])
    assert res["answerable"] is False
    assert res["citations"] == []
    assert REFUSAL_MESSAGE in res["answer"]


@pytest.mark.asyncio
async def test_generate_answer_grounded_mock(sample_chunks):
    mock_llm_text = (
        "Eligible employees receive an equipment stipend of up to $1,200 USD. "
        "[Source: acme_remote_policy.docx, Section 3: Equipment]"
    )
    with patch("backend.generation._call_gemini_sync", return_value=mock_llm_text):
        res = await generate_answer("What is the equipment stipend?", chunks=sample_chunks)
        assert res["answerable"] is True
        assert len(res["citations"]) == 1
        assert res["citations"][0].filename == "acme_remote_policy.docx"
        assert "$1,200 USD" in res["answer"]
