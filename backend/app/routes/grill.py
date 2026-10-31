from typing import Any

from pydantic import BaseModel

try:
    from fastapi import APIRouter, BackgroundTasks, HTTPException, status
except ImportError:
    APIRouter = None  # type: ignore
    BackgroundTasks = None  # type: ignore
    HTTPException = Exception  # type: ignore
    status = None  # type: ignore

from app.agents.grill import get_deal, start_grill, submit_answer


class AnswerRequest(BaseModel):
    turn_id: str
    answer: str


if APIRouter is not None:
    router = APIRouter(prefix="/api/deals", tags=["grill"])

    @router.post("/{deal_id}/grill/start")
    async def route_start_grill(deal_id: str) -> dict[str, Any]:
        deal = get_deal(deal_id)
        if deal is None:
            raise HTTPException(status_code=404, detail="Deal not found")
        first_turn = await start_grill(deal_id, deal=deal)
        return {"first_turn": first_turn.model_dump()}

    @router.post("/{deal_id}/grill/answer", status_code=202)
    async def route_submit_answer(
        deal_id: str,
        body: AnswerRequest,
        background_tasks: BackgroundTasks,
    ) -> dict[str, Any]:
        deal = get_deal(deal_id)
        if deal is None:
            raise HTTPException(status_code=404, detail="Deal not found")

        active_turns = [t for t in deal.grill_turns if t.answer is None]
        active_turn_ids = {t.id for t in active_turns}

        # Check if idempotent repeat on answered turn
        answered_turn = next((t for t in deal.grill_turns if t.id == body.turn_id and t.answer is not None), None)
        if answered_turn:
            return {"accepted": True, "note": "idempotent_repeat"}

        # Reject answers for non-active turns
        if body.turn_id not in active_turn_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Turn {body.turn_id} is not the currently active turn",
            )

        if background_tasks is not None:
            background_tasks.add_task(submit_answer, deal_id, body.turn_id, body.answer, deal=deal)
        else:
            await submit_answer(deal_id, body.turn_id, body.answer, deal=deal)

        return {"accepted": True}
else:
    router = None  # type: ignore
