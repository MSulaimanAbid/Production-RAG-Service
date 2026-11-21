"""
Retrieval and answer quality metrics.

Implements:
  - Hit Rate@K
  - Recall@K
  - Mean Reciprocal Rank (MRR)
"""
from __future__ import annotations


def hit_rate_at_k(results: list[dict], k: int) -> float:
    """Fraction of questions where the correct chunk appears in top-K results."""
    # Implemented in Phase 11
    raise NotImplementedError


def recall_at_k(results: list[dict], k: int) -> float:
    """Average fraction of relevant chunks retrieved in top-K."""
    # Implemented in Phase 11
    raise NotImplementedError


def mean_reciprocal_rank(results: list[dict]) -> float:
    """Mean reciprocal rank of the first correct chunk across all questions."""
    # Implemented in Phase 11
    raise NotImplementedError
