"""
LLM-as-a-judge for faithfulness and correctness evaluation.

Uses Gemini 2.5 Pro to score generated answers.
"""
from __future__ import annotations


async def score_faithfulness(question: str, context: str, answer: str) -> float:
    """
    Score how faithfully the answer is grounded in the provided context.

    Returns:
        Score from 0.0 (hallucinated) to 1.0 (fully grounded).
    """
    # Implemented in Phase 11
    raise NotImplementedError


async def score_correctness(question: str, reference_answer: str, generated_answer: str) -> float:
    """
    Score the semantic correctness of the generated answer vs. the reference.

    Returns:
        Score from 0.0 (wrong) to 1.0 (correct).
    """
    # Implemented in Phase 11
    raise NotImplementedError
