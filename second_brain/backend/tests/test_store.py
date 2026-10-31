"""Tests for store module: CRUD, monotonic events, and memory_log replacement."""
import pytest
from contracts.schemas import Deal, MemoryRecord
from app.store import append_event, delete_deal, get_deal, get_events, save_deal


def test_deal_crud_and_events():
    deal_id = "test_deal_123"
    deal = Deal(id=deal_id, status="created")
    save_deal(deal)

    retrieved = get_deal(deal_id)
    assert retrieved is not None
    assert retrieved.id == deal_id

    # Append events
    ev1 = append_event(deal_id, "stage", {"stage": "parsing", "progress": 0.1})
    ev2 = append_event(deal_id, "stage", {"stage": "extracting", "progress": 0.3})

    assert ev1.seq == 1
    assert ev2.seq == 2

    events = get_events(deal_id, since=1)
    assert len(events) == 1
    assert events[0].seq == 2

    # Clean up
    deleted = delete_deal(deal_id)
    assert deleted is True
    assert get_deal(deal_id) is None


def test_memory_log_replacement_in_store():
    deal_id = "test_memory_deal"
    deal = Deal(id=deal_id, status="ready")
    save_deal(deal)

    # 1. Append pending memory record
    rec_pending = MemoryRecord(
        id="MR-100",
        deal_id=deal_id,
        kind="memory_add",
        text="Sample finding memory",
        status="pending",
    )
    append_event(deal_id, "memory", rec_pending.model_dump())

    deal = get_deal(deal_id)
    assert len(deal.memory_log) == 1
    assert deal.memory_log[0].status == "pending"

    # 2. Append completed memory record with SAME id -> should replace in place
    rec_ok = MemoryRecord(
        id="MR-100",
        deal_id=deal_id,
        kind="memory_add",
        text="Sample finding memory",
        status="ok",
        latency_ms=120,
    )
    append_event(deal_id, "memory", rec_ok.model_dump())

    deal = get_deal(deal_id)
    assert len(deal.memory_log) == 1
    assert deal.memory_log[0].status == "ok"
    assert deal.memory_log[0].latency_ms == 120

    delete_deal(deal_id)
