"""FastAPI Application entrypoint for SecondBrain."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contracts.schemas import MekoStatus
from app.config import settings
from app.llm import get_usage
from app.routes.deals import router as deals_router
from app.routes.events import router as events_router

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
