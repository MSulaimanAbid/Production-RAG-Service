"""
FastAPI dependency injection factories.

Use these with FastAPI's Depends() to inject shared resources into routes
without creating them on every request.
"""
from __future__ import annotations

from functools import lru_cache

from backend.config import Settings, get_settings


def get_settings_dep() -> Settings:
    """Dependency for injecting application settings."""
    return get_settings()
