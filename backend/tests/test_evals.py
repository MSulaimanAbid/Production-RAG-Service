"""
Unit tests for RAG evaluation metrics calculations.
"""
from backend.evals.metrics import (
    citation_precision,
    hit_rate_at_k,
    mean_reciprocal_rank,
    unanswerable_accuracy,
)


def test_hit_rate_at_k():
    records = [
        {
            "answerable_ground_truth": True,
            "expected_source_doc": "policy.docx",
            "retrieved_chunks": [{"filename": "policy.docx"}, {"filename": "other.pdf"}],
        },
        {
            "answerable_ground_truth": True,
            "expected_source_doc": "artemis.pdf",
            "retrieved_chunks": [{"filename": "unrelated.docx"}],
        },
        {
            # Unanswerable question should be ignored in hit rate calculation
            "answerable_ground_truth": False,
            "expected_source_doc": None,
            "retrieved_chunks": [],
        },
    ]
    # 1 hit out of 2 answerable questions = 0.5
    hr = hit_rate_at_k(records, k=2)
    assert hr == 0.5


def test_mean_reciprocal_rank():
    records = [
        {
            "answerable_ground_truth": True,
            "expected_source_doc": "policy.docx",
            # Hit is at rank 1 -> 1/1 = 1.0
            "retrieved_chunks": [{"filename": "policy.docx"}],
        },
        {
            "answerable_ground_truth": True,
            "expected_source_doc": "artemis.pdf",
            # Hit is at rank 2 -> 1/2 = 0.5
            "retrieved_chunks": [{"filename": "other.docx"}, {"filename": "artemis.pdf"}],
        },
        {
            "answerable_ground_truth": True,
            "expected_source_doc": "missing.pdf",
            # No hit -> 0.0
            "retrieved_chunks": [{"filename": "other.docx"}],
        },
    ]
    # MRR = (1.0 + 0.5 + 0.0) / 3 = 0.5
    mrr = mean_reciprocal_rank(records, k=5)
    assert mrr == 0.5


def test_unanswerable_accuracy():
    records = [
        {"answerable_ground_truth": False, "system_answerable": False},
        {"answerable_ground_truth": False, "system_answerable": False},
        {"answerable_ground_truth": False, "system_answerable": True},  # Failure: hallucinated answer
        {"answerable_ground_truth": True, "system_answerable": True},   # Should not be counted
    ]
    # 2 correct refusals out of 3 = 2/3 = 0.6667
    acc = unanswerable_accuracy(records)
    assert acc == 0.6667


def test_citation_precision():
    records = [
        {"citations": [{"chunk_id": "c1"}, {"chunk_id": "c2"}]},
        {"citations": []},
    ]
    prec = citation_precision(records)
    assert prec == 1.0
