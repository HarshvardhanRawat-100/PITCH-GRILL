"""FastAPI Application entrypoint for SecondBrain."""

import time
from collections import defaultdict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.llm import get_usage
from app.routes.deals import router as deals_router
from app.routes.events import router as events_router
from contracts.schemas import MekoStatus

app = FastAPI(
    title="SecondBrain for Founders — AI Diligence War Room",
    description="Multi-agent due-diligence platform powered by Google Gemini and Yugabyte Meko",
    version="1.0.0",
)

# Open CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiter: IP -> list of timestamps
_POST_RATE_LIMITS: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW_SECONDS = 60.0
RATE_LIMIT_MAX_REQUESTS = 20


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Rate limiting on POST endpoints
    if request.method == "POST":
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        # Clean older entries
        timestamps = [
            t for t in _POST_RATE_LIMITS[client_ip] if now - t < RATE_LIMIT_WINDOW_SECONDS
        ]
        if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": {
                        "error": {
                            "code": "rate_limit_exceeded",
                            "message": f"Rate limit of {RATE_LIMIT_MAX_REQUESTS} requests per minute exceeded.",
                        }
                    }
                },
            )
        timestamps.append(now)
        _POST_RATE_LIMITS[client_ip] = timestamps

    # 2. Process request
    response = await call_next(request)

    # 3. Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


# Mount routes
app.include_router(deals_router)
app.include_router(events_router)


@app.get("/")
async def root():
    return {
        "service": "SecondBrain Diligence War Room API",
        "version": "1.0.0",
        "mock_mode": settings.MOCK,
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint exposing Gemini and Meko operational status."""
    usage = get_usage()

    # Meko status: if P4's memory module is installed, use it; otherwise fallback
    meko_status = MekoStatus(
        mode=settings.MEKO_MODE,
        connected=False,
        datapack_id=settings.MEKO_DATAPACK_ID,
        call_budget=settings.MEKO_CALL_BUDGET,
        note="P4 memory package in local fallback mode",
    )
    try:
        from app.memory import get_memory

        mem = get_memory()
        if hasattr(mem, "status"):
            meko_status = mem.status()
    except Exception:
        pass

    return {
        "ok": True,
        "mock": settings.MOCK,
        "model": settings.LLM_MODEL,
        "gemini_calls": usage["calls"],
        "meko": meko_status.model_dump(),
    }
