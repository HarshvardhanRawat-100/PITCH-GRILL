"""
Local in-process memory fallback.

Provides the same MemoryClient interface using in-memory dicts.
Used when Meko is unreachable, over budget, or MEKO_MODE=local.
NEVER raises — every method is wrapped in try/except.
"""
from __future__ import annotations

import glob
import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from contracts.schemas import MemoryRecord, MekoStatus

logger = logging.getLogger(__name__)

MEKO_CALL_BUDGET = int(os.getenv("MEKO_CALL_BUDGET", "200"))


def _now_iso() -> str:
    """Return current UTC time as ISO8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _trim(text: str, max_len: int = 240) -> str:
    """Trim text to max_len chars, adding ellipsis if truncated."""
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _keyword_score(query: str, text: str) -> int:
    """Score text by how many query words appear in it (case-insensitive)."""
    query_words = set(query.lower().split())
    text_lower = text.lower()
    return sum(1 for w in query_words if w in text_lower)


class LocalMemoryClient:
    """In-process memory client. Stores everything in dicts keyed by deal_id."""

    def __init__(self) -> None:
        self._counter: int = 0
        # deal_id -> list of memory dicts
        self._memories: Dict[str, List[dict]] = defaultdict(list)
        # deal_id -> list of trace dicts
        self._traces: Dict[str, List[dict]] = defaultdict(list)
        # Calls counter (for status reporting)
        self._calls_made: int = 0
        # KB paragraphs cache (loaded on first kb_search)
        self._kb_paragraphs: Optional[List[str]] = None

    def _next_id(self) -> str:
        """Generate a unique MemoryRecord id."""
        self._counter += 1
        return f"MR-{self._counter}"

    def _make_record(
        self,
        deal_id: str,
        kind: str,
        text: str,
        persona: Optional[str] = None,
        hits: Optional[List[str]] = None,
        latency_ms: Optional[int] = None,
        status: str = "ok",
        note: str = "",
    ) -> MemoryRecord:
        """Build a MemoryRecord with local_fallback source."""
        return MemoryRecord(
            id=self._next_id(),
            deal_id=deal_id,
            persona=persona,  # type: ignore[arg-type]
            kind=kind,  # type: ignore[arg-type]
            text=text,
            hits=hits or [],
            source="local_fallback",
            status=status,  # type: ignore[arg-type]
            latency_ms=latency_ms,
            meko_id=None,
            created_at=_now_iso(),
        )

    async def remember(
        self, deal_id: str, persona: Optional[str], text: str, tag: str
    ) -> MemoryRecord:
        """Store a memory in the in-process dict."""
        t0 = time.monotonic()
        try:
            self._calls_made += 1
            prefixed_text = f"[deal:{deal_id}] {text}"
            entry = {
                "id": self._next_id(),
                "text": prefixed_text,
                "persona": persona,
                "tag": tag,
                "created_at": _now_iso(),
            }
            self._memories[deal_id].append(entry)
            # Reset counter since _next_id was called inside entry
            latency = int((time.monotonic() - t0) * 1000)
            record = self._make_record(
                deal_id=deal_id,
                kind="memory_add",
                text=prefixed_text,
                persona=persona,
                latency_ms=latency,
            )
            logger.info(
                "local.remember deal=%s tag=%s latency=%dms", deal_id, tag, latency
            )
            # TODO: store.append_memory_log(deal_id, record) — depends on P1 store.py
            # TODO: sse.emit(deal_id, "memory", record) — depends on P1 sse.py
            return record
        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            logger.error("local.remember failed: %s", exc)
            return self._make_record(
                deal_id=deal_id,
                kind="memory_add",
                text=text,
                persona=persona,
                latency_ms=latency,
                status="failed",
            )

    async def recall(
        self, deal_id: str, query: str, persona: Optional[str] = None, k: int = 3
    ) -> MemoryRecord:
        """Naive keyword-overlap search over stored memories for this deal."""
        t0 = time.monotonic()
        try:
            self._calls_made += 1
            memories = self._memories.get(deal_id, [])

            # Score each memory by keyword overlap
            scored = []
            for mem in memories:
                # Optionally filter by persona
                if persona and mem.get("persona") != persona:
                    continue
                score = _keyword_score(query, mem["text"])
                if score > 0:
                    scored.append((score, mem))

            # Sort by score descending, take top k
            scored.sort(key=lambda x: x[0], reverse=True)
            hits = [_trim(item[1]["text"]) for item in scored[:k]]

            latency = int((time.monotonic() - t0) * 1000)
            record = self._make_record(
                deal_id=deal_id,
                kind="memory_recall",
                text=query,
                persona=persona,
                hits=hits,
                latency_ms=latency,
            )
            logger.info(
                "local.recall deal=%s hits=%d latency=%dms",
                deal_id,
                len(hits),
                latency,
            )
            # TODO: store.append_memory_log(deal_id, record)
            # TODO: sse.emit(deal_id, "memory", record)
            return record
        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            logger.error("local.recall failed: %s", exc)
            return self._make_record(
                deal_id=deal_id,
                kind="memory_recall",
                text=query,
                persona=persona,
                latency_ms=latency,
                status="failed",
            )

    def _load_kb_paragraphs(self) -> List[str]:
        """Load KB markdown files from backend/kb/ and split into paragraphs."""
        if self._kb_paragraphs is not None:
            return self._kb_paragraphs

        paragraphs: List[str] = []
        kb_dir = os.path.join(os.path.dirname(__file__), "..", "..", "kb")
        kb_dir = os.path.normpath(kb_dir)

        if os.path.isdir(kb_dir):
            for md_file in glob.glob(os.path.join(kb_dir, "*.md")):
                try:
                    with open(md_file, "r", encoding="utf-8") as f:
                        content = f.read()
                    # Split by double newline into paragraphs
                    for para in content.split("\n\n"):
                        stripped = para.strip()
                        if stripped and len(stripped) > 20:
                            paragraphs.append(stripped)
                except Exception as exc:
                    logger.warning("Failed to read KB file %s: %s", md_file, exc)

        self._kb_paragraphs = paragraphs
        logger.info("Loaded %d KB paragraphs from %s", len(paragraphs), kb_dir)
        return paragraphs

    async def kb_search(self, query: str, k: int = 3) -> MemoryRecord:
        """Search over backend/kb/*.md files using keyword overlap."""
        t0 = time.monotonic()
        try:
            self._calls_made += 1
            paragraphs = self._load_kb_paragraphs()

            scored = []
            for para in paragraphs:
                score = _keyword_score(query, para)
                if score > 0:
                    scored.append((score, para))

            scored.sort(key=lambda x: x[0], reverse=True)
            hits = [_trim(para) for _, para in scored[:k]]

            latency = int((time.monotonic() - t0) * 1000)
            record = self._make_record(
                deal_id="__kb__",
                kind="kb_search",
                text=query,
                hits=hits,
                latency_ms=latency,
            )
            logger.info("local.kb_search hits=%d latency=%dms", len(hits), latency)
            return record
        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            logger.error("local.kb_search failed: %s", exc)
            return self._make_record(
                deal_id="__kb__",
                kind="kb_search",
                text=query,
                latency_ms=latency,
                status="failed",
            )

    async def trace(
        self, deal_id: str, label: str, exchange_text: str
    ) -> MemoryRecord:
        """Store a trace entry (just log it in local mode)."""
        t0 = time.monotonic()
        try:
            self._calls_made += 1
            entry = {
                "id": self._next_id(),
                "label": label,
                "exchange": exchange_text,
                "created_at": _now_iso(),
            }
            self._traces[deal_id].append(entry)

            latency = int((time.monotonic() - t0) * 1000)
            record = self._make_record(
                deal_id=deal_id,
                kind="trace",
                text=f"{label}: {_trim(exchange_text, 200)}",
                latency_ms=latency,
            )
            logger.info("local.trace deal=%s label=%s latency=%dms", deal_id, label, latency)
            # TODO: store.append_memory_log(deal_id, record)
            # TODO: sse.emit(deal_id, "memory", record)
            return record
        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            logger.error("local.trace failed: %s", exc)
            return self._make_record(
                deal_id=deal_id,
                kind="trace",
                text=f"{label}: {exchange_text[:100]}",
                latency_ms=latency,
                status="failed",
            )

    async def promote(
        self, deal_id: str, meko_ids: List[str]
    ) -> MemoryRecord:
        """No-op in local mode. Returns ok with a note."""
        t0 = time.monotonic()
        try:
            self._calls_made += 1
            latency = int((time.monotonic() - t0) * 1000)
            record = self._make_record(
                deal_id=deal_id,
                kind="promote",
                text=f"local mode - promotion skipped for {len(meko_ids)} ids",
                latency_ms=latency,
            )
            logger.info("local.promote deal=%s ids=%d (skipped)", deal_id, len(meko_ids))
            return record
        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            logger.error("local.promote failed: %s", exc)
            return self._make_record(
                deal_id=deal_id,
                kind="promote",
                text="promote failed",
                latency_ms=latency,
                status="failed",
            )

    async def forget_deal(self, deal_id: str) -> int:
        """Clear all memories for a deal. Returns count deleted."""
        try:
            count = len(self._memories.get(deal_id, []))
            self._memories.pop(deal_id, None)
            self._traces.pop(deal_id, None)
            logger.info("local.forget_deal deal=%s deleted=%d", deal_id, count)
            return count
        except Exception as exc:
            logger.error("local.forget_deal failed: %s", exc)
            return 0

    def status(self, deal_id: str) -> MekoStatus:
        """Return MekoStatus for local mode."""
        return MekoStatus(
            mode="local",
            connected=False,
            datapack_id=None,
            conversation_id=None,
            calls_made=self._calls_made,
            call_budget=MEKO_CALL_BUDGET,
            note="running in local fallback mode",
        )
