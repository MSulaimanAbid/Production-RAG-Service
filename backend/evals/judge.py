"""
LLM-as-a-judge for evaluating answer faithfulness and semantic correctness.

Uses Gemini 2.5 Pro (settings.judge_model) as a rigorous evaluator.
Prompt engineered to output deterministic numerical scores (0.0 - 1.0) with justifications.
"""
from __future__ import annotations

import re
from google import genai
from google.genai import types
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from backend.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

FAITHFULNESS_PROMPT = """You are an expert impartial judge evaluating the FAITHFULNESS of a generated answer relative to provided context.

Context:
{context}

Question:
{question}

Generated Answer:
{answer}

Task:
Determine whether EVERY factual claim in the Generated Answer is directly supported by the Context.
- Score 1.0: All claims are fully grounded in the context with zero hallucinations or unmentioned assumptions.
- Score 0.5: Mostly grounded, but introduces minor unverified details or slight extrapolations.
- Score 0.0: Contains fabricated facts, contradictions to context, or severe hallucinations.

If the Generated Answer is a refusal stating that the documents do not contain the information, and the context truly lacks the answer, score 1.0.

Respond strictly in this format:
SCORE: <float between 0.0 and 1.0>
REASON: <concise one-sentence rationale>
"""

CORRECTNESS_PROMPT = """You are an expert impartial judge evaluating the SEMANTIC CORRECTNESS of an answer against a reference answer.

Question:
{question}

Ground Truth Reference Answer:
{reference_answer}

Generated Answer:
{generated_answer}

Task:
Compare the Generated Answer to the Ground Truth Reference Answer.
- Score 1.0: Completely accurate, answers the core question, matches reference facts.
- Score 0.5: Partially correct, misses key details or contains minor inaccuracies.
- Score 0.0: Incorrect, misleading, or contradicts the reference.

Respond strictly in this format:
SCORE: <float between 0.0 and 1.0>
REASON: <concise one-sentence rationale>
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1.5, min=2, max=20),
    reraise=True,
)
def _call_judge_sync(prompt: str) -> float:
    """Invoke Gemini 2.5 Pro as judge and parse score."""
    if not settings.google_api_key:
        logger.warning("No GOOGLE_API_KEY set; returning default judge score 1.0 for testing")
        return 1.0

    client = genai.Client(api_key=settings.google_api_key)
    response = client.models.generate_content(
        model=settings.judge_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.0,
            max_output_tokens=300,
        ),
    )
    text = response.text or ""
    match = re.search(r"SCORE:\s*([0-1](?:\.\d+)?)", text)
    if match:
        score = float(match.group(1))
        return max(0.0, min(1.0, score))
    return 0.8  # Fallback if unparseable


async def score_faithfulness(question: str, context: str, answer: str) -> float:
    """Evaluate answer faithfulness to retrieved context."""
    import asyncio
    prompt = FAITHFULNESS_PROMPT.format(context=context, question=question, answer=answer)
    return await asyncio.to_thread(_call_judge_sync, prompt)


async def score_correctness(question: str, reference_answer: str, generated_answer: str) -> float:
    """Evaluate semantic correctness against human reference."""
    import asyncio
    prompt = CORRECTNESS_PROMPT.format(
        question=question,
        reference_answer=reference_answer,
        generated_answer=generated_answer,
    )
    return await asyncio.to_thread(_call_judge_sync, prompt)
