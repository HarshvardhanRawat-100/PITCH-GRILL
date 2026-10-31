"""
MemoryClient Protocol — the contract all memory backends implement.

Every method MUST:
- Never raise (wrap in try/except, return a MemoryRecord with status="failed")
- Measure latency via time.monotonic
- Set source to "meko_live" or "local_fallback"
- Generate a unique id "MR-{counter}"
"""
from __future__ import annotations

import os
import sys
from datetime import UTC, datetime
from typing import Protocol, runtime_checkable

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from contracts.schemas import MekoStatus, MemoryRecord


@runtime_checkable
class MemoryClient(Protocol):
    """Protocol for all memory backends (live Meko, local fallback, off)."""

    async def remember(
        self, deal_id: str, persona: str | None, text: str, tag: str
    ) -> MemoryRecord:
        """Store a memory. tag: FINDING|CONCESSION|OPEN_QUESTION|DECISION."""
        ...

    async def recall(
        self, deal_id: str, query: str, persona: str | None = None, k: int = 3
    ) -> MemoryRecord:
        """Search memories for this deal. Returns .hits with trimmed snippets."""
        ...

    async def kb_search(self, query: str, k: int = 3) -> MemoryRecord:
        """Search the shared Knowledge Base."""
        ...

    async def trace(
        self, deal_id: str, label: str, exchange_text: str
    ) -> MemoryRecord:
        """Post a conversation trace entry (short label + exchange)."""
        ...

    async def promote(
        self, deal_id: str, meko_ids: list[str]
    ) -> MemoryRecord:
        """Promote memories to Shared Knowledge (one-way)."""
        ...

    async def forget_deal(self, deal_id: str) -> int:
        """Delete every memory written by this deal. Returns count deleted."""
        ...

    def status(self, deal_id: str) -> MekoStatus:
        """Return the current Meko status for this deal."""
        ...


class NullMemoryClient:
    """No-op memory client used when MEKO_MODE=off. Returns status='skipped'."""

    def __init__(self) -> None:
        self._counter = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"MR-{self._counter}"

    def _make_record(self, deal_id: str, kind: str, text: str) -> MemoryRecord:
        return MemoryRecord(
            id=self._next_id(),
            deal_id=deal_id,
            persona=None,
            kind=kind,  # type: ignore[arg-type]
            text=text,
            hits=[],
            source="local_fallback",
            status="skipped",
            latency_ms=0,
            meko_id=None,
            created_at=datetime.now(UTC).isoformat(),
        )

    async def remember(
        self, deal_id: str, persona: str | None, text: str, tag: str
    ) -> MemoryRecord:
        return self._make_record(deal_id, "memory_add", text)

    async def recall(
        self, deal_id: str, query: str, persona: str | None = None, k: int = 3
    ) -> MemoryRecord:
        return self._make_record(deal_id, "memory_recall", query)

    async def kb_search(self, query: str, k: int = 3) -> MemoryRecord:
        return self._make_record("__kb__", "kb_search", query)

    async def trace(
        self, deal_id: str, label: str, exchange_text: str
    ) -> MemoryRecord:
        return self._make_record(deal_id, "trace", label)

    async def promote(
        self, deal_id: str, meko_ids: list[str]
    ) -> MemoryRecord:
        return self._make_record(deal_id, "promote", f"skipped {len(meko_ids)} ids")

    async def forget_deal(self, deal_id: str) -> int:
        return 0

    def status(self, deal_id: str) -> MekoStatus:
        return MekoStatus(
            mode="off",
            connected=False,
            calls_made=0,
            call_budget=0,
            note="memory disabled (MEKO_MODE=off)",
        )
