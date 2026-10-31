"""Checklist routes: retrieve and patch diligence checklist items."""
import logging
from typing import Literal

from contracts.schemas import ChecklistItem
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.store import append_event, get_deal, save_deal
from app.tools import checklist as checklist_tool

logger = logging.getLogger("app.routes.checklist")

router = APIRouter(prefix="/api/deals/{deal_id}/checklist", tags=["checklist"])


class ChecklistStatusUpdate(BaseModel):
    status: Literal["todo", "addressed", "uploaded"]


@router.get("", response_model=list[ChecklistItem])
async def get_checklist(deal_id: str) -> list[ChecklistItem]:
    """Retrieve the current data room checklist for a deal."""
    deal = get_deal(deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "deal_not_found", "message": f"Deal {deal_id} not found"}},
        )

    # If deal has no checklist yet, generate it
    if not deal.checklist:
        items = await checklist_tool.generate(deal)
        return items

    return deal.checklist


@router.patch("/{item_id}", response_model=ChecklistItem)
async def update_checklist_item_status(deal_id: str, item_id: str, body: ChecklistStatusUpdate) -> ChecklistItem:
    """Update status of a specific checklist item (todo, addressed, uploaded)."""
    deal = get_deal(deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "deal_not_found", "message": f"Deal {id} not found"}},
        )

    target_item = None
    for item in deal.checklist:
        if item.id == item_id:
            item.status = body.status
            target_item = item
            break

    if not target_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "item_not_found", "message": f"Checklist item {item_id} not found in deal {id}"}},
        )

    save_deal(deal)
    append_event(deal.id, "checklist", {"items": [i.model_dump() for i in deal.checklist]})
    return target_item
