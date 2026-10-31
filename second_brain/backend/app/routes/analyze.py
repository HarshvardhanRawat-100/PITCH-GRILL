from typing import Any, Dict

try:
    from fastapi import APIRouter, BackgroundTasks
except ImportError:
    APIRouter = None  # type: ignore
    BackgroundTasks = None  # type: ignore

from backend.app.agents.orchestrator import run_analysis

# If P1's run_pipeline exists in backend/app/main.py or ingest, guard the hook
try:
    from app.routes.deals import run_pipeline as p1_run_pipeline
except ImportError:
    try:
        from backend.app.routes.deals import run_pipeline as p1_run_pipeline
    except ImportError:
        p1_run_pipeline = None


if APIRouter is not None:
    router = APIRouter(prefix="/api/deals", tags=["analyze"])

    @router.post("/{deal_id}/analyze")
    async def trigger_analysis(
        deal_id: str, background_tasks: BackgroundTasks
    ) -> Dict[str, Any]:
        if background_tasks is not None:
            background_tasks.add_task(run_analysis, deal_id)
        else:
            await run_analysis(deal_id)
        return {"deal_id": deal_id, "status": "analyzing"}
else:
    router = None  # type: ignore


async def execute_deal_analysis(deal_id: str) -> Any:
    """Entrypoint called by P1's pipeline or background runner."""
    return await run_analysis(deal_id)
