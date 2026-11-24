@echo off
title DocuMind - Production RAG Service
echo ========================================================
echo   DocuMind - AI Document Intelligence Platform
echo ========================================================
echo.
echo Starting FastAPI & ChromaDB server at http://127.0.0.1:8000/ ...
echo Your default web browser will open automatically once ready.
echo Press Ctrl+C in this window to stop the server anytime.
echo.

:: Launch background watcher to automatically open default browser once server is responsive
start /b "" powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i=0; $i -lt 30; $i++) { Start-Sleep -Milliseconds 500; try { $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop; if ($resp.StatusCode -eq 200) { break } } catch {} }; Start-Process 'http://127.0.0.1:8000/'"

uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
