"""
Market route.

Endpoints:
    GET /api/deals/{id}/market -> MarketGrounding
    POST /api/deals/{id}/market/refresh -> MarketGrounding (triggers fresh search & emits SSE)
"""
from __future__ import annotations

import json
import os
import sys

from fastapi import APIRouter, HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from contracts.schemas import MarketGrounding
from backend.app.tools.market_search import load_cached_market_grounding, run as run_market_search

router = APIRouter(prefix="/api/deals", tags=["market"])

FIXTURE_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "fixtures", "market.json")
)


def _load_mock_market() -> MarketGrounding:
    try:
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            return MarketGrounding.model_validate(json.load(f))
    except Exception:
        return load_cached_market_grounding()


@router.get("/{deal_id}/market", response_model=MarketGrounding)
async def get_market_grounding(deal_id: str) -> MarketGrounding:
    """Return the market grounding results for this deal."""
    is_mock = os.getenv("MOCK", "").strip().lower() in ("1", "true")
    if is_mock:
        return _load_mock_market()

    try:
        from backend.app.store import get_store  # type: ignore
        deal = get_store().get_deal(deal_id)
        if deal and deal.market:
            return deal.market
    except Exception:
        pass

    return load_cached_market_grounding()


@router.post("/{deal_id}/market/refresh", response_model=MarketGrounding)
async def refresh_market_grounding(deal_id: str) -> MarketGrounding:
    """Trigger a refresh of live market search and update deal state."""
    is_mock = os.getenv("MOCK", "").strip().lower() in ("1", "true")
    if is_mock:
        return _load_mock_market()

    deck_facts = None
    try:
        from backend.app.store import get_store  # type: ignore
        deal = get_store().get_deal(deal_id)
        if deal and deal.deck:
            deck_facts = deal.deck
    except Exception:
        pass

    if not deck_facts:
        from contracts.schemas import DeckFacts
        deck_facts = DeckFacts(
            company_name="BolBot",
            one_liner="WhatsApp AI sales assistant for Indian SMEs",
            sector="SaaS / AI / SME Tech",
            tam_claim_inr=5000000000.0,
            no_competitor_claim=True,
        )

    result = await run_market_search(deck_facts)

    # Store and emit SSE event if available
    try:
        from backend.app.store import get_store  # type: ignore
        get_store().update_market(deal_id, result)
    except Exception:
        pass

    try:
        from backend.app.sse import emit_event  # type: ignore
        emit_event(deal_id, "market", result.model_dump())
    except Exception:
        pass

    return result
