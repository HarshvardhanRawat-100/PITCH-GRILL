"""
Memory API route.

Endpoints:
    GET /api/deals/{id}/memory?q=... -> MemoryRecord
    GET /api/deals/{id}/memory/status -> MekoStatus
    GET /api/deals/{id}/memory/log -> List[MemoryRecord] (returns all deal memory events)
"""
from __future__ import annotations

import json
import os
import sys
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from contracts.schemas import MemoryRecord, MekoStatus
from backend.app.memory import get_memory

router = APIRouter(prefix="/api/deals", tags=["memory"])

FIXTURE_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "fixtures", "memory_log.json")
)


def _load_fixture_records() -> List[MemoryRecord]:
    try:
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [MemoryRecord.model_validate(item) for item in data]
    except Exception:
        return []


@router.get("/{deal_id}/memory", response_model=MemoryRecord)
async def query_deal_memory(
    deal_id: str,
    q: str = Query(..., description="Query string for memory recall"),
    k: int = Query(3, ge=1, le=10, description="Max number of hits to return"),
    persona: Optional[str] = Query(None, description="Optional persona filter"),
) -> MemoryRecord:
    """
    Query the memory layer for a specific deal.
    Powers the 'Ask the memory' box in the frontend.
    When MOCK=1, matches against fixtures/memory_log.json if found.
    """
    is_mock = os.getenv("MOCK", "").strip().lower() in ("1", "true")

    if is_mock:
        fixtures = _load_fixture_records()
        # Look for existing recall record or matching keyword
        q_lower = q.lower()
        for rec in fixtures:
            if rec.kind == "memory_recall" and (q_lower in rec.text.lower() or rec.text.lower() in q_lower):
                return rec

        # Synthesize from fixtures if keywords match
        matched_hits: List[str] = []
        for rec in fixtures:
            for word in q_lower.split():
                if len(word) > 3 and word in rec.text.lower():
                    matched_hits.append(rec.text[:240])
                    break
            if len(matched_hits) >= k:
                break

        if matched_hits:
            return MemoryRecord(
                id=f"MR-mock-{len(fixtures)+1}",
                deal_id=deal_id,
                persona=None,
                kind="memory_recall",
                text=q,
                hits=matched_hits,
                source="local_fallback",
                status="ok",
                latency_ms=12,
                meko_id=None,
                created_at="2026-10-31T10:20:00Z",
            )

    # Real / in-process execution via get_memory()
    client = get_memory()
    record = await client.recall(deal_id=deal_id, query=q, persona=persona, k=k)
    return record


@router.get("/{deal_id}/memory/status", response_model=MekoStatus)
async def get_deal_memory_status(deal_id: str) -> MekoStatus:
    """Return the current Meko status for the deal."""
    client = get_memory()
    return client.status(deal_id)


@router.get("/{deal_id}/memory/log", response_model=List[MemoryRecord])
async def get_deal_memory_log(deal_id: str) -> List[MemoryRecord]:
    """Return the full deal memory log. In mock mode, returns fixture data."""
    is_mock = os.getenv("MOCK", "").strip().lower() in ("1", "true")
    if is_mock:
        return _load_fixture_records()

    try:
        from backend.app.store import get_store  # type: ignore
        deal = get_store().get_deal(deal_id)
        if deal and deal.memory_log:
            return deal.memory_log
    except Exception:
        pass

    # Fallback to local memory client records or fixtures
    return _load_fixture_records()
