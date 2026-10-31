"""Tests for SSE streaming generator."""

import pytest
from contracts.schemas import Deal

from app.sse import event_generator
from app.store import append_event, delete_deal, save_deal


@pytest.mark.asyncio
async def test_sse_event_generator():
    deal_id = "test_sse_deal"
    deal = Deal(id=deal_id, status="ready")
    save_deal(deal)

    # Append 2 events
    append_event(deal_id, "stage", {"stage": "parsing", "progress": 0.1})
    append_event(deal_id, "stage", {"stage": "extracting", "progress": 0.3})

    gen = event_generator(deal_id, since=0, heartbeat_interval=1.0)

    # First event
    ev1 = await anext(gen)
    assert "event: stage" in ev1
    assert "parsing" in ev1

    # Second event
    ev2 = await anext(gen)
    assert "event: stage" in ev2
    assert "extracting" in ev2

    # Clean up
    await gen.aclose()
    delete_deal(deal_id)
