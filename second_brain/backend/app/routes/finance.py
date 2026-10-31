"""Finance routes: baseline financial analysis and interactive scenario computation."""
import json
import logging
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app import store
from app.config import settings
from app.tools.finance_engine import compute
from app.tools.finance_glue import compute_base
from contracts.schemas import FinanceRequest, FinanceResult, FinancialInputs

logger = logging.getLogger("app.routes.finance")

router = APIRouter(prefix="/api/deals", tags=["finance"])

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"


def _load_finance_fixture() -> FinanceResult | None:
    """Load and validate the finance.json fixture."""
    fixture_path = FIXTURES_DIR / "finance.json"
    if not fixture_path.exists():
        return None
    try:
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return FinanceResult.model_validate(data)
    except (OSError, json.JSONDecodeError, ValueError) as e:
        logger.error("Failed to load finance fixture from %s: %s", fixture_path, e)
        return None


@router.get("/{deal_id}/finance", response_model=FinanceResult)
async def get_deal_finance(deal_id: str):
    """Retrieve base financial model results for a deal.

    In MOCK mode: serves fixtures/finance.json without store lookup.
    Otherwise:
    - Unknown deal -> 404 deal_not_found
    - deal.finance if set -> returns deal.finance
    - deal.deck present -> computes base from deck (no persistence)
    - otherwise -> 409 deck_not_ready
    """
    if settings.MOCK:
        fixture = _load_finance_fixture()
        if fixture is None:
            return JSONResponse(
                status_code=503,
                content={
                    "error": {
                        "code": "fixture_missing",
                        "message": "finance.json fixture not found or unreadable",
                    }
                },
            )
        return fixture

    deal = store.get_deal(deal_id)
    if not deal:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "deal_not_found",
                    "message": f"Deal {deal_id} not found",
                }
            },
        )

    if deal.finance is not None:
        return deal.finance

    if deal.deck is not None:
        return compute_base(deal.deck)

    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "deck_not_ready",
                "message": "Deck facts not available for deal",
            }
        },
    )


@router.post("/{deal_id}/finance/compute", response_model=FinanceResult)
async def compute_deal_finance(deal_id: str, request: FinanceRequest):
    """Pure and stateless scenario computation.

    Does not modify deal or call save_deal.
    In MOCK mode: base inputs come from fixtures/finance.json.
    Otherwise:
    - Unknown deal -> 404 deal_not_found
    - Base inputs from deal.finance.inputs or deal.deck.financial_inputs
    - Missing deck/inputs -> 409 deck_not_ready
    """
    if settings.MOCK:
        fixture = _load_finance_fixture()
        if fixture is None:
            return JSONResponse(
                status_code=503,
                content={
                    "error": {
                        "code": "fixture_missing",
                        "message": "finance.json fixture not found or unreadable",
                    }
                },
            )
        base_inputs = fixture.inputs
        return compute(base_inputs, request)

    deal = store.get_deal(deal_id)
    if not deal:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "deal_not_found",
                    "message": f"Deal {deal_id} not found",
                }
            },
        )

    base_inputs: FinancialInputs | None = None
    if deal.finance is not None and deal.finance.inputs is not None:
        base_inputs = deal.finance.inputs
    elif deal.deck is not None and deal.deck.financial_inputs is not None:
        base_inputs = deal.deck.financial_inputs

    if base_inputs is None:
        return JSONResponse(
            status_code=409,
            content={
                "error": {
                    "code": "deck_not_ready",
                    "message": "Deck facts not available for deal",
                }
            },
        )

    return compute(base_inputs, request)
