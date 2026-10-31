#!/usr/bin/env bash
# run_all.sh — Launch SecondBrain full stack (Backend + Frontend) concurrently
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

echo "================================================================="
echo "  SecondBrain Diligence War Room — Full Stack Launcher"
echo "  Backend: http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "================================================================="

# Trap exit signals to gracefully terminate both background processes
trap 'echo "Shutting down SecondBrain servers..."; kill 0' EXIT INT TERM

# 1. Start Backend
echo "Starting Backend (FastAPI + Uvicorn)..."
cd "${BACKEND_DIR}"
if [ -d ".venv" ]; then
    .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
else
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
fi
BACKEND_PID=$!

# Wait for backend health check
echo "Waiting for Backend to report healthy..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo "Backend is live at http://localhost:8000 (health check OK)"
        break
    fi
    sleep 0.5
done

# 2. Start Frontend
echo "Starting Frontend (Next.js)..."
cd "${FRONTEND_DIR}"
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
echo "Both services are running. Press Ctrl+C to terminate."
wait
