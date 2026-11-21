"""
pytest fixtures shared across all test modules.

Key fixtures:
  - client: AsyncClient for FastAPI endpoint testing
  - settings_override: Overrides settings for isolated tests
  - sample_pdf_path / sample_docx_path: Paths to test fixture files
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Async HTTP client for testing FastAPI endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
