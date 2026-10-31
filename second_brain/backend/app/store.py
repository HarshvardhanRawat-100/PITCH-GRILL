"""In-memory store for Deal states, event history, and JSON snapshotting."""
import asyncio
import json
import logging
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set

from contracts.schemas import (
    ChecklistItem,
    Concession,
    CrossTalk,
    Deal,
    DeckFacts,
    FinalVerdict,
    FinanceResult,
    GrillTurn,
    LedgerEntry,
    MarketGrounding,
    MemoryRecord,
    Narrative,
    PersonaReport,
    ReadinessScore,
    SSEEvent,
    SSEType,
    TechSignals,
)
from app.config import settings

logger = logging.getLogger("app.store")

# In-memory storage
_DEALS: Dict[str, Deal] = {}
_EVENTS: Dict[str, List[SSEEvent]] = {}
_SUBSCRIBERS: Dict[str, Set[asyncio.Queue]] = {}


def _get_snapshot_path(deal_id: str) -> Path:
    return settings.DATA_DIR / f"{deal_id}.json"


def _write_snapshot(deal: Deal) -> None:
    """Save deal snapshot to backend/data/{deal_id}.json."""
    try:
        path = _get_snapshot_path(deal.id)
        with open(path, "w", encoding="utf-8") as f:
            f.write(deal.model_dump_json(indent=2))
    except Exception as e:
        logger.error("Failed to write snapshot for deal %s: %s", deal.id, e)


def get_deal(deal_id: str) -> Optional[Deal]:
    """Retrieve deal by ID from memory, or fallback to disk snapshot."""
    if deal_id in _DEALS:
        return _DEALS[deal_id]

    path = _get_snapshot_path(deal_id)
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                deal = Deal.model_validate_json(f.read())
                _DEALS[deal_id] = deal
                return deal
        except Exception as e:
            logger.error("Failed to restore snapshot for %s: %s", deal_id, e)
    return None


def save_deal(deal: Deal) -> Deal:
    """Save or update a deal in memory and persist a JSON snapshot."""
    _DEALS[deal.id] = deal
    _write_snapshot(deal)
    return deal


def get_events(deal_id: str, since: int = 0) -> List[SSEEvent]:
    """Get all events for a deal with seq > since."""
    events = _EVENTS.get(deal_id, [])
    return [e for e in events if e.seq > since]


def append_event(deal_id: str, event_type: SSEType, data: dict) -> SSEEvent:
    """Append a new SSE event monotonically, update Deal state, and notify subscribers."""
    deal = get_deal(deal_id)
    if not deal:
        deal = Deal(
            id=deal_id,
            status="created",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        _DEALS[deal_id] = deal

    if deal_id not in _EVENTS:
        _EVENTS[deal_id] = []

    seq = len(_EVENTS[deal_id]) + 1
    now_iso = datetime.now(timezone.utc).isoformat()

    event = SSEEvent(
        type=event_type,
        deal_id=deal_id,
        seq=seq,
        ts=now_iso,
        data=data,
    )
    _EVENTS[deal_id].append(event)

    # Apply event to deal state
    try:
        if event_type == "stage":
            st = data.get("stage")
            if st in ("parsing", "extracting", "analyzing"):
                deal.status = "parsing"
            elif st == "ready":
                deal.status = "ready"
        elif event_type == "deck":
            deal.deck = DeckFacts.model_validate(data)
        elif event_type == "finance":
            deal.finance = FinanceResult.model_validate(data)
        elif event_type == "market":
            deal.market = MarketGrounding.model_validate(data)
        elif event_type == "tech":
            deal.tech = TechSignals.model_validate(data)
        elif event_type == "persona_report":
            rep = PersonaReport.model_validate(data)
            # Avoid duplicate reports for same persona
            deal.reports = [r for r in deal.reports if r.persona != rep.persona] + [rep]
        elif event_type == "ledger":
            entries = data.get("entries", [])
            deal.ledger = [LedgerEntry.model_validate(e) for e in entries]
        elif event_type == "score":
            deal.score = ReadinessScore.model_validate(data)
        elif event_type == "checklist":
            items = data.get("items", [])
            deal.checklist = [ChecklistItem.model_validate(i) for i in items]
        elif event_type == "concession":
            deal.concessions.append(Concession.model_validate(data))
        elif event_type == "crosstalk":
            deal.crosstalk.append(CrossTalk.model_validate(data))
        elif event_type == "verdict":
            deal.verdicts.append(FinalVerdict.model_validate(data))
        elif event_type == "narrative":
            deal.narrative = Narrative.model_validate(data)
        elif event_type == "memory":
            # Meko MemoryRecord: REPLACE if id exists, else append
            rec = MemoryRecord.model_validate(data)
            existing_idx = next(
                (i for i, r in enumerate(deal.memory_log) if r.id == rec.id), None
            )
            if existing_idx is not None:
                deal.memory_log[existing_idx] = rec
            else:
                deal.memory_log.append(rec)
        elif event_type == "done":
            if data.get("phase") == "analysis":
                deal.status = "ready"
            elif data.get("phase") == "grill":
                deal.status = "complete"
    except Exception as e:
        logger.warning("Error applying event %s to deal %s: %s", event_type, deal_id, e)

    _write_snapshot(deal)

    # Fan out to live subscribers
    subscribers = _SUBSCRIBERS.get(deal_id, set())
    for queue in list(subscribers):
        try:
            queue.put_nowait(event)
        except Exception:
            pass

    return event


def subscribe(deal_id: str) -> asyncio.Queue:
    """Create a subscription queue for new events on a deal."""
    queue: asyncio.Queue = asyncio.Queue()
    if deal_id not in _SUBSCRIBERS:
        _SUBSCRIBERS[deal_id] = set()
    _SUBSCRIBERS[deal_id].add(queue)
    return queue


def unsubscribe(deal_id: str, queue: asyncio.Queue) -> None:
    """Remove a subscription queue."""
    if deal_id in _SUBSCRIBERS:
        _SUBSCRIBERS[deal_id].discard(queue)
        if not _SUBSCRIBERS[deal_id]:
            del _SUBSCRIBERS[deal_id]


def delete_deal(deal_id: str) -> bool:
    """Delete state, events, snapshot, and uploaded files for a deal."""
    _DEALS.pop(deal_id, None)
    _EVENTS.pop(deal_id, None)
    _SUBSCRIBERS.pop(deal_id, None)

    # Delete snapshot
    snap_path = _get_snapshot_path(deal_id)
    if snap_path.exists():
        snap_path.unlink()

    # Delete uploaded files
    upload_dir = settings.DATA_DIR / "uploads"
    for item in upload_dir.glob(f"{deal_id}*"):
        try:
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
        except Exception as e:
            logger.warning("Failed to remove uploaded item %s: %s", item, e)

    return True


def cleanup_expired_deals(ttl_seconds: int = 3600) -> int:
    """Remove deals older than TTL (default 60 minutes)."""
    now = datetime.now(timezone.utc)
    expired = []

    for deal_id, deal in list(_DEALS.items()):
        if deal.created_at:
            try:
                dt = datetime.fromisoformat(deal.created_at)
                if (now - dt).total_seconds() > ttl_seconds:
                    expired.append(deal_id)
            except Exception:
                pass

    for deal_id in expired:
        delete_deal(deal_id)

    return len(expired)
