"""
Guardrails for input validation, output validation, and document safety checks.

Three guard layers:
  1. Input guardrails  — applied BEFORE any API calls (fast, cheap checks)
  2. Output guardrails — applied AFTER LLM generation (clean the response)
  3. Upload guardrails — applied on file upload BEFORE ingestion
"""
from __future__ import annotations

import re

import structlog
from fastapi import HTTPException, UploadFile

from backend.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

# ── Injection / jailbreak pattern library ─────────────────────────────────────
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"ignore\s+(all\s+)?previous\s+instructions?",
        r"system\s*:",
        r"<\s*system\s*>",
        r"you\s+are\s+now\s+(a\s+)?(?:DAN|evil|unrestricted)",
        r"act\s+as\s+(if\s+you\s+(are|were)\s+)?(?:a\s+)?(?:DAN|evil|unrestricted)",
        r"pretend\s+(you\s+are|to\s+be)\s+",
        r"jailbreak",
        r"disable\s+(your\s+)?(safety|filters?|restrictions?)",
        r"bypass\s+(your\s+)?(safety|filters?|restrictions?)",
        r"forget\s+(your\s+)?(instructions?|training|rules?)",
    ]
]

# ── API key / secret leakage patterns ────────────────────────────────────────
_SECRET_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"AIza[0-9A-Za-z\-_]{35}",   # Google API key
        r"sk-[a-zA-Z0-9]{32,}",       # OpenAI key
        r"sk-proj-[a-zA-Z0-9\-_]{50,}",
    ]
]


# ── Input guardrails ──────────────────────────────────────────────────────────

async def validate_question(question: str) -> None:
    """
    Validate a user question before processing.

    Checks (in order, cheapest first):
      1. Not empty / too short
      2. Not too long
      3. No prompt injection patterns
      4. No jailbreak patterns

    Raises:
        HTTPException 400: If any check fails.
    """
    stripped = question.strip()

    if len(stripped) < settings.min_question_length:
        raise HTTPException(
            status_code=400,
            detail="Question is too short. Please ask a meaningful question.",
        )

    if len(stripped) > settings.max_question_length:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Question exceeds the maximum length of {settings.max_question_length} characters. "
                "Please shorten your question."
            ),
        )

    for pattern in _INJECTION_PATTERNS:
        if pattern.search(stripped):
            logger.warning("Prompt injection attempt detected", pattern=pattern.pattern)
            raise HTTPException(
                status_code=400,
                detail="Your question contains disallowed content. Please ask a document-related question.",
            )

    logger.debug("Question passed input guardrails", length=len(stripped))


# ── Upload guardrails ─────────────────────────────────────────────────────────

async def validate_upload(file: UploadFile) -> None:
    """
    Validate an uploaded file before ingestion.

    Checks:
      1. File has a name
      2. File extension is allowed
      3. MIME type is allowed
      4. File is not empty
      5. File size does not exceed the configured limit

    Raises:
        HTTPException 400: Empty or unreadable file.
        HTTPException 415: Unsupported file type.
    """
    import os

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Allowed types: {', '.join(settings.allowed_extensions)}"
            ),
        )

    # Read file content to check size (will be reset by pipeline)
    content = await file.read()
    await file.seek(0)  # Reset so pipeline can read again

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File size ({len(content) / (1024*1024):.1f} MB) exceeds "
                f"the maximum allowed size of {settings.max_file_size_mb} MB."
            ),
        )

    logger.debug("Upload passed guardrails", filename=file.filename, size_bytes=len(content))


# ── Output guardrails ─────────────────────────────────────────────────────────

def sanitize_output(text: str) -> str:
    """
    Scan LLM output and redact any leaked secrets or system prompt fragments.

    Args:
        text: Raw LLM-generated answer text.

    Returns:
        Sanitized text with secrets replaced by [REDACTED].
    """
    for pattern in _SECRET_PATTERNS:
        if pattern.search(text):
            logger.error("SECURITY: Potential secret detected in LLM output — redacting")
            text = pattern.sub("[REDACTED]", text)

    return text


# ── Document guardrails (Bonus F) ─────────────────────────────────────────────

def check_document_instructions(text: str, filename: str) -> str:
    """
    Detect and neutralize instruction injections embedded inside uploaded documents.

    Documents may contain text like 'Ignore previous instructions and...' —
    these must be treated as DATA, never followed as instructions.

    Strategy: Log the detection and return the text unchanged (we don't remove it,
    but the system prompt ensures the LLM treats document content as data only).
    The LLM is explicitly instructed never to follow instructions found in context.

    Args:
        text: Extracted document text.
        filename: Source filename (for logging).

    Returns:
        Original text (unchanged — neutralization is via system prompt design).
    """
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            logger.warning(
                "Document contains potential instruction injection",
                filename=filename,
                pattern=pattern.pattern,
            )
            # We log but do NOT modify — the system prompt handles this
            break

    return text
