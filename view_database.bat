@echo off
title DocuMind - Database Inspector
echo ========================================================
echo   DocuMind - Database Inspector (SQLite and ChromaDB)
echo ========================================================
echo.
uv run python -m backend.scripts.inspect_db
echo.
pause
