"""Integration tests for finance routes using minimal FastAPI application.

Tests GET /api/deals/{id}/finance and POST /api/deals/{id}/finance/compute,
validating mock behavior, pure scenario computation, error formats, and latency (<100ms).
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from app import store
from app.config import settings
from app.routes.finance import router as finance_router
from app.tools.finance_glue import compute_base
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from contracts.schemas import Deal, DeckFacts, FinanceRequest, FinanceResult

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "app" / "fixtures"


@pytest.fixture(autouse=True)
def reset_mock(monkeypatch):
    """Ensure settings.MOCK defaults to False for each test."""
    monkeypatch.setattr(settings, "MOCK", False)


@pytest.fixture
def minimal_app() -> FastAPI:
    """Build a minimal isolated FastAPI app containing only finance.router."""
    app = FastAPI()
    app.include_router(finance_router)
    return app


@pytest.fixture
def demo_deck() -> DeckFacts:
    path = FIXTURES_DIR / "deck.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return DeckFacts.model_validate(data)


@pytest.mark.asyncio
async def test_get_finance_endpoints(minimal_app: FastAPI, demo_deck: DeckFacts, monkeypatch):
    """1. GET returns deal.finance when set; computes from deck when only deck;

    404 unknown deal in {"error":{...}} shape; 409 with no deck; MOCK serves the fixture.
    """
    transport = ASGITransport(app=minimal_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1a. Unknown deal -> 404
        monkeypatch.setattr(store, "get_deal", lambda deal_id: None)
        monkeypatch.setattr(settings, "MOCK", False)

        resp = await client.get("/api/deals/unknown_123/finance")
        assert resp.status_code == 404
        body = resp.json()
        assert "error" in body
        assert body["error"]["code"] == "deal_not_found"

        # 1b. Deal with no deck -> 409
        deal_no_deck = Deal(id="deal_no_deck")
        monkeypatch.setattr(store, "get_deal", lambda deal_id: deal_no_deck)

        resp = await client.get("/api/deals/deal_no_deck/finance")
        assert resp.status_code == 409
        body = resp.json()
        assert "error" in body
        assert body["error"]["code"] == "deck_not_ready"

        # 1c. Deal with only deck -> computes base, does NOT call save_deal
        deal_deck_only = Deal(id="deal_deck_only", deck=demo_deck)
        mock_save = MagicMock()
        monkeypatch.setattr(store, "get_deal", lambda deal_id: deal_deck_only)
        monkeypatch.setattr(store, "save_deal", mock_save)

        resp = await client.get("/api/deals/deal_deck_only/finance")
        assert resp.status_code == 200
        body = resp.json()
        result = FinanceResult.model_validate(body)
        assert len(result.series) == 36
        assert mock_save.call_count == 0

        # 1d. Deal with finance already set
        precomputed = compute_base(demo_deck)
        deal_with_finance = Deal(id="deal_with_finance", deck=demo_deck, finance=precomputed)
        monkeypatch.setattr(store, "get_deal", lambda deal_id: deal_with_finance)

        resp = await client.get("/api/deals/deal_with_finance/finance")
        assert resp.status_code == 200
        result = FinanceResult.model_validate(resp.json())
        assert result.inputs.cac.value == demo_deck.financial_inputs.cac.value

        # 1e. MOCK mode serves fixture without store lookup
        mock_get_deal = MagicMock()
        monkeypatch.setattr(store, "get_deal", mock_get_deal)
        monkeypatch.setattr(settings, "MOCK", True)

        resp = await client.get("/api/deals/mock_deal/finance")
        assert resp.status_code == 200
        result = FinanceResult.model_validate(resp.json())
        assert result.horizon_months == 36
        assert mock_get_deal.call_count == 0


@pytest.mark.asyncio
async def test_post_compute_scenarios(minimal_app: FastAPI, demo_deck: DeckFacts, monkeypatch):
    """2. POST compute: overrides change result, mode toggle works, target_runway_months honoured,

    deal NOT mutated and save_deal NOT called, 404/409 cases, MOCK mode computes from fixture inputs.
    """
    transport = ASGITransport(app=minimal_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        monkeypatch.setattr(settings, "MOCK", False)

        deal = Deal(id="deal_compute", deck=demo_deck)
        deal.finance = compute_base(demo_deck)
        original_inputs_dump = deal.finance.inputs.model_dump()

        mock_save = MagicMock()
        monkeypatch.setattr(store, "get_deal", lambda deal_id: deal if deal_id == "deal_compute" else None)
        monkeypatch.setattr(store, "save_deal", mock_save)

        # 2a. Overrides change the result
        req = FinanceRequest(
            overrides={"cac": 5000.0},
            mode="hold_growth",
            target_runway_months=12,
        )
        resp = await client.post("/api/deals/deal_compute/finance/compute", json=req.model_dump())
        assert resp.status_code == 200
        res = FinanceResult.model_validate(resp.json())
        assert res.inputs.cac.value == 5000.0
        assert res.break_point.base_cac == 5000.0

        # Verify deal is NOT mutated and save_deal was NOT called
        assert mock_save.call_count == 0
        assert deal.finance.inputs.model_dump() == original_inputs_dump

        # 2b. Mode toggle works (hold_spend vs hold_growth)
        req_spend = FinanceRequest(
            overrides={"cac": 5000.0},
            mode="hold_spend",
            target_runway_months=12,
        )
        resp_spend = await client.post("/api/deals/deal_compute/finance/compute", json=req_spend.model_dump())
        assert resp_spend.status_code == 200
        res_spend = FinanceResult.model_validate(resp_spend.json())
        assert res_spend.mode == "hold_spend"
        # In hold_spend, spend is capped at base_cac * new_customers
        assert res_spend.series[0].acquisition_spend != res.series[0].acquisition_spend

        # 2c. target_runway_months is honoured
        req_18 = FinanceRequest(
            overrides={},
            mode="hold_growth",
            target_runway_months=18,
        )
        resp_18 = await client.post("/api/deals/deal_compute/finance/compute", json=req_18.model_dump())
        assert resp_18.status_code == 200
        res_18 = FinanceResult.model_validate(resp_18.json())
        assert res_18.break_point.target_runway_months == 18

        # 2d. 404 unknown deal
        resp_404 = await client.post("/api/deals/nonexistent/finance/compute", json=req.model_dump())
        assert resp_404.status_code == 404
        assert resp_404.json()["error"]["code"] == "deal_not_found"

        # 2e. 409 deal without deck or finance
        deal_empty = Deal(id="deal_empty")
        monkeypatch.setattr(store, "get_deal", lambda deal_id: deal_empty)
        resp_409 = await client.post("/api/deals/deal_empty/finance/compute", json=req.model_dump())
        assert resp_409.status_code == 409
        assert resp_409.json()["error"]["code"] == "deck_not_ready"

        # 2f. MOCK mode computes from fixture inputs dynamically
        monkeypatch.setattr(settings, "MOCK", True)
        mock_get_deal = MagicMock()
        monkeypatch.setattr(store, "get_deal", mock_get_deal)

        mock_req = FinanceRequest(
            overrides={"cac": 1200.0},
            mode="hold_growth",
            target_runway_months=12,
        )
        resp_mock = await client.post("/api/deals/any/finance/compute", json=mock_req.model_dump())
        assert resp_mock.status_code == 200
        res_mock = FinanceResult.model_validate(resp_mock.json())
        assert res_mock.inputs.cac.value == 1200.0
        assert mock_get_deal.call_count == 0


@pytest.mark.asyncio
async def test_post_compute_latency(minimal_app: FastAPI, demo_deck: DeckFacts, monkeypatch):
    """3. POST compute latency < 100 ms on the demo deck (best of 5)."""
    deal = Deal(id="deal_speed", deck=demo_deck)
    deal.finance = compute_base(demo_deck)
    monkeypatch.setattr(store, "get_deal", lambda deal_id: deal)
    monkeypatch.setattr(settings, "MOCK", False)

    req = FinanceRequest(
        overrides={"cac": 3200.0, "monthly_churn_pct": 3.5},
        mode="hold_growth",
        target_runway_months=12,
    ).model_dump()

    transport = ASGITransport(app=minimal_app)
    durations: list[float] = []

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Warmup
        await client.post("/api/deals/deal_speed/finance/compute", json=req)

        # 5 runs
        for _ in range(5):
            t0 = time.perf_counter()
            resp = await client.post("/api/deals/deal_speed/finance/compute", json=req)
            elapsed = time.perf_counter() - t0
            assert resp.status_code == 200
            durations.append(elapsed)

    best_ms = min(durations) * 1000.0
    assert best_ms < 100.0, f"Best latency was {best_ms:.2f} ms (expected < 100 ms)"
