@echo off
title DocuMind - Production RAG Service
echo ========================================================
echo   DocuMind - AI Document Intelligence Platform
echo ========================================================
echo.
echo Starting FastAPI & ChromaDB server at http://127.0.0.1:8000/ ...
echo Press Ctrl+C in this window to stop the server anytime.
echo.
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
