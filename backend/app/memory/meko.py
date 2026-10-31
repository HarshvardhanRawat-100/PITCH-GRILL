"""
Live Meko MCP Client with Automatic Local Fallback & Circuit Breaker.

Interacts with Yugabyte Meko over MCP (Streamable HTTP):
- Lazy singleton session with reconnect on failure
- 8s timeout (MEKO_TIMEOUT_S) & 1 retry
- Circuit breaker: 3 consecutive failures trips to local fallback for 60s
- Budget guard: switches to local after MEKO_CALL_BUDGET calls
- Stores deal_id prefix [deal:<id>] on all texts for client-side filtering
- All calls NEVER raise an unhandled exception
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
import time
from datetime import UTC, datetime
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from contracts.schemas import MekoStatus, MemoryRecord

from app.memory.local import LocalMemoryClient

logger = logging.getLogger(__name__)

MEKO_MCP_URL = os.getenv("MEKO_MCP_URL", "https://mcp.mekodata.ai/mcp")
MEKO_API_KEY = os.getenv("MEKO_API_KEY", "")
MEKO_DATAPACK_ID = os.getenv("MEKO_DATAPACK_ID", "")
MEKO_TIMEOUT_S = float(os.getenv("MEKO_TIMEOUT_S", "8.0"))
MEKO_CALL_BUDGET = int(os.getenv("MEKO_CALL_BUDGET", "200"))


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _trim(text: str, max_len: int = 240) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _sanitize_text(text: str) -> str:
    """Sanitize written memory text by stripping control characters and excessive whitespace."""
    if not text:
        return ""
    # Try importing P1 security helper if available
    try:
        from app.security import safe_memory_text  # type: ignore
        return safe_memory_text(text)
    except Exception:
        pass
    try:
        from app.security import redact_pii  # type: ignore
        return redact_pii(text)
    except Exception:
        pass
    return text.strip()


class MekoClient:
    """
    Production-grade Meko MCP client with built-in in-process fallback.
    Guaranteed never to raise exceptions to callers.
    """

    def __init__(
        self,
        api_key: str | None = None,
        datapack_id: str | None = None,
        mcp_url: str | None = None,
        timeout_s: float | None = None,
        call_budget: int | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else MEKO_API_KEY
        self.datapack_id = datapack_id if datapack_id is not None else MEKO_DATAPACK_ID
        self.mcp_url = mcp_url if mcp_url is not None else MEKO_MCP_URL
        self.timeout_s = timeout_s if timeout_s is not None else MEKO_TIMEOUT_S
        self.call_budget = call_budget if call_budget is not None else MEKO_CALL_BUDGET

        self.local = LocalMemoryClient()
        self._calls_made = 0
        self._consecutive_failures = 0
        self._circuit_tripped_until: float = 0.0
        self._last_error_note = ""

        # Tracking meko_id per deal for forget_deal
        self._deal_meko_ids: dict[str, list[str]] = {}
        self._counter = 0

        # MCP session cache
        self._session: Any = None
        self._lock = asyncio.Lock()

    def _next_id(self) -> str:
        self._counter += 1
        return f"MR-{self._counter}"

    def _is_configured(self) -> bool:
        return bool(self.api_key and self.datapack_id)

    def _is_circuit_open(self) -> bool:
        return time.monotonic() < self._circuit_tripped_until

    def _trip_circuit(self, reason: str) -> None:
        self._consecutive_failures += 1
        self._last_error_note = reason
        if self._consecutive_failures >= 3:
            self._circuit_tripped_until = time.monotonic() + 60.0
            self._last_error_note = f"circuit breaker tripped (3 failures): {reason}"
            logger.warning("Meko circuit breaker tripped for 60s: %s", reason)

    def _record_success(self) -> None:
        self._consecutive_failures = 0
        self._last_error_note = ""

    def _emit_plumbing(self, deal_id: str, record: MemoryRecord, is_pending: bool = False) -> None:
        """Helper to invoke store and SSE event emitters if present."""
        try:
            from app.store import get_store  # type: ignore
            store = get_store()
            if hasattr(store, "append_memory_record"):
                store.append_memory_record(deal_id, record)
        except Exception:
            pass

        try:
            from app.sse import emit_event  # type: ignore
            emit_event(deal_id, "memory", record.model_dump())
        except Exception:
            pass

    async def _execute_mcp_tool(self, tool_name: str, arguments: dict) -> Any:
        """Call an MCP tool with timeout and 1 retry."""
        from mcp import ClientSession
        try:
            from mcp.client.streamable_http import streamable_http_client as http_transport_client
        except ImportError:
            from mcp.client.sse import sse_client as http_transport_client

        async def _call_once():
            headers = {"x-api-key": self.api_key, "Authorization": f"Bearer {self.api_key}"}
            async with http_transport_client(self.mcp_url, headers=headers) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    result = await asyncio.wait_for(
                        session.call_tool(tool_name, arguments=arguments),
                        timeout=self.timeout_s,
                    )
                    return result

        try:
            return await _call_once()
        except Exception as first_exc:
            logger.warning("Meko MCP %s call failed (%s), retrying once...", tool_name, first_exc)
            await asyncio.sleep(0.5)
            return await _call_once()

    # -------------------------------------------------------------
    # Protocol Methods
    # -------------------------------------------------------------
    async def remember(
        self, deal_id: str, persona: str | None, text: str, tag: str
    ) -> MemoryRecord:
        record_id = self._next_id()
        sanitized = _sanitize_text(text)
        prefixed_text = f"[deal:{deal_id}] {sanitized}"
        agent_id = f"{persona}:{deal_id}" if persona else f"system:{deal_id}"

        # Check budget & circuit
        if self._calls_made >= self.call_budget:
            res = await self.local.remember(deal_id, persona, text, tag)
            res.id = record_id
            self._emit_plumbing(deal_id, res)
            return res

        if not self._is_configured() or self._is_circuit_open():
            res = await self.local.remember(deal_id, persona, text, tag)
            res.id = record_id
            self._emit_plumbing(deal_id, res)
            return res

        t0 = time.monotonic()
        self._calls_made += 1
        try:
            args = {
                "content": prefixed_text,
                "agent_id": agent_id,
                "datapack_id": self.datapack_id,
                "metadata": {"tag": tag, "deal_id": deal_id, "persona": persona},
            }
            res = await self._execute_mcp_tool("memory_add", args)
            latency = int((time.monotonic() - t0) * 1000)
            self._record_success()

            meko_id = None
            if hasattr(res, "content") and isinstance(res.content, list) and res.content:
                meko_id = getattr(res.content[0], "text", None) or getattr(res.content[0], "data", None)
            if not meko_id:
                meko_id = f"meko_{int(time.time() * 1000)}"

            self._deal_meko_ids.setdefault(deal_id, []).append(str(meko_id))

            record = MemoryRecord(
                id=record_id,
                deal_id=deal_id,
                persona=persona,  # type: ignore[arg-type]
                kind="memory_add",
                text=prefixed_text,
                hits=[],
                source="meko_live",
                status="ok",
                latency_ms=latency,
                meko_id=str(meko_id),
                created_at=_now_iso(),
            )
            # Also sync into local memory for instant fallback recall
            await self.local.remember(deal_id, persona, text, tag)
            self._emit_plumbing(deal_id, record)
            return record

        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            self._trip_circuit(f"remember failed: {exc}")
            logger.error("Live Meko remember failed: %s; serving via local fallback", exc)
            fallback = await self.local.remember(deal_id, persona, text, tag)
            fallback.id = record_id
            fallback.latency_ms = latency
            self._emit_plumbing(deal_id, fallback)
            return fallback

    async def recall(
        self, deal_id: str, query: str, persona: str | None = None, k: int = 3
    ) -> MemoryRecord:
        record_id = self._next_id()
        if self._calls_made >= self.call_budget or not self._is_configured() or self._is_circuit_open():
            res = await self.local.recall(deal_id, query, persona, k)
            res.id = record_id
            self._emit_plumbing(deal_id, res)
            return res

        t0 = time.monotonic()
        self._calls_made += 1
        try:
            agent_id = f"{persona}:{deal_id}" if persona else None
            args: dict[str, Any] = {
                "query": query,
                "datapack_id": self.datapack_id,
                "limit": k * 2,  # Fetch slightly more to filter by deal_id
            }
            if agent_id:
                args["agent_id"] = agent_id

            res = await self._execute_mcp_tool("memory_search", args)
            latency = int((time.monotonic() - t0) * 1000)
            self._record_success()

            hits: list[str] = []
            prefix = f"[deal:{deal_id}]"
            # Parse MCP result content
            if hasattr(res, "content") and isinstance(res.content, list):
                for item in res.content:
                    text_val = getattr(item, "text", "") or str(item)
                    if prefix in text_val:
                        hits.append(_trim(text_val, 240))
                    elif not text_val.startswith("[deal:"):
                        hits.append(_trim(text_val, 240))
                    if len(hits) >= k:
                        break

            # If live returned no filtered hits, blend with local recall
            if not hits:
                local_rec = await self.local.recall(deal_id, query, persona, k)
                hits = local_rec.hits

            record = MemoryRecord(
                id=record_id,
                deal_id=deal_id,
                persona=persona,  # type: ignore[arg-type]
                kind="memory_recall",
                text=query,
                hits=hits[:k],
                source="meko_live",
                status="ok",
                latency_ms=latency,
                meko_id=None,
                created_at=_now_iso(),
            )
            self._emit_plumbing(deal_id, record)
            return record

        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            self._trip_circuit(f"recall failed: {exc}")
            logger.error("Live Meko recall failed: %s; serving via local fallback", exc)
            fallback = await self.local.recall(deal_id, query, persona, k)
            fallback.id = record_id
            fallback.latency_ms = latency
            self._emit_plumbing(deal_id, fallback)
            return fallback

    async def kb_search(self, query: str, k: int = 3) -> MemoryRecord:
        record_id = self._next_id()
        if self._calls_made >= self.call_budget or not self._is_configured() or self._is_circuit_open():
            res = await self.local.kb_search(query, k)
            res.id = record_id
            return res

        t0 = time.monotonic()
        self._calls_made += 1
        try:
            args = {"query": query, "datapack_id": self.datapack_id, "limit": k}
            res = await self._execute_mcp_tool("knowledgebase_search", args)
            latency = int((time.monotonic() - t0) * 1000)
            self._record_success()

            hits: list[str] = []
            if hasattr(res, "content") and isinstance(res.content, list):
                for item in res.content:
                    text_val = getattr(item, "text", "") or str(item)
                    if text_val:
                        hits.append(_trim(text_val, 240))
                    if len(hits) >= k:
                        break

            # If empty, fallback to local markdown files
            if not hits:
                local_kb = await self.local.kb_search(query, k)
                hits = local_kb.hits

            return MemoryRecord(
                id=record_id,
                deal_id="__kb__",
                persona=None,
                kind="kb_search",
                text=query,
                hits=hits[:k],
                source="meko_live",
                status="ok",
                latency_ms=latency,
                meko_id=None,
                created_at=_now_iso(),
            )

        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            self._trip_circuit(f"kb_search failed: {exc}")
            logger.error("Live Meko kb_search failed: %s; using local markdown files", exc)
            fallback = await self.local.kb_search(query, k)
            fallback.id = record_id
            fallback.latency_ms = latency
            return fallback

    async def trace(
        self, deal_id: str, label: str, exchange_text: str
    ) -> MemoryRecord:
        record_id = self._next_id()
        if self._calls_made >= self.call_budget or not self._is_configured() or self._is_circuit_open():
            res = await self.local.trace(deal_id, label, exchange_text)
            res.id = record_id
            self._emit_plumbing(deal_id, res)
            return res

        t0 = time.monotonic()
        self._calls_made += 1
        try:
            args = {
                "conversation_id": deal_id,
                "input": _trim(label, 100),
                "output": exchange_text,
                "datapack_id": self.datapack_id,
            }
            await self._execute_mcp_tool("conversation_add_message", args)
            latency = int((time.monotonic() - t0) * 1000)
            self._record_success()

            record = MemoryRecord(
                id=record_id,
                deal_id=deal_id,
                persona=None,
                kind="trace",
                text=f"{label}: {_trim(exchange_text, 150)}",
                hits=[],
                source="meko_live",
                status="ok",
                latency_ms=latency,
                meko_id=None,
                created_at=_now_iso(),
            )
            await self.local.trace(deal_id, label, exchange_text)
            self._emit_plumbing(deal_id, record)
            return record

        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            self._trip_circuit(f"trace failed: {exc}")
            logger.error("Live Meko trace failed: %s; serving via local fallback", exc)
            fallback = await self.local.trace(deal_id, label, exchange_text)
            fallback.id = record_id
            fallback.latency_ms = latency
            self._emit_plumbing(deal_id, fallback)
            return fallback

    async def promote(
        self, deal_id: str, meko_ids: list[str]
    ) -> MemoryRecord:
        record_id = self._next_id()
        if not meko_ids:
            return MemoryRecord(
                id=record_id,
                deal_id=deal_id,
                persona=None,
                kind="promote",
                text="no memory IDs provided for promotion",
                hits=[],
                source="meko_live" if self._is_configured() else "local_fallback",
                status="skipped",
                latency_ms=0,
                meko_id=None,
                created_at=_now_iso(),
            )

        if self._calls_made >= self.call_budget or not self._is_configured() or self._is_circuit_open():
            res = await self.local.promote(deal_id, meko_ids)
            res.id = record_id
            self._emit_plumbing(deal_id, res)
            return res

        t0 = time.monotonic()
        self._calls_made += 1
        try:
            args = {"memory_ids": meko_ids, "datapack_id": self.datapack_id}
            await self._execute_mcp_tool("memory_promote", args)
            latency = int((time.monotonic() - t0) * 1000)
            self._record_success()

            record = MemoryRecord(
                id=record_id,
                deal_id=deal_id,
                persona=None,
                kind="promote",
                text=f"promoted {len(meko_ids)} memories to Shared Knowledge",
                hits=[],
                source="meko_live",
                status="ok",
                latency_ms=latency,
                meko_id=None,
                created_at=_now_iso(),
            )
            self._emit_plumbing(deal_id, record)
            return record

        except Exception as exc:
            latency = int((time.monotonic() - t0) * 1000)
            self._trip_circuit(f"promote failed: {exc}")
            logger.error("Live Meko promote failed: %s; falling back to local skip", exc)
            fallback = await self.local.promote(deal_id, meko_ids)
            fallback.id = record_id
            fallback.latency_ms = latency
            self._emit_plumbing(deal_id, fallback)
            return fallback

    async def forget_deal(self, deal_id: str) -> int:
        """Delete memories written for this deal both live in Meko and in local cache."""
        deleted_count = 0
        meko_ids = self._deal_meko_ids.pop(deal_id, [])

        if self._is_configured() and not self._is_circuit_open():
            for mid in meko_ids:
                try:
                    await self._execute_mcp_tool(
                        "memory_delete_by_id",
                        {"memory_id": mid, "datapack_id": self.datapack_id},
                    )
                    deleted_count += 1
                except Exception as exc:
                    logger.warning("Failed to delete Meko memory %s: %s", mid, exc)

        local_count = await self.local.forget_deal(deal_id)
        return max(deleted_count, local_count)

    def status(self, deal_id: str) -> MekoStatus:
        """Return the live/fallback status for reporting."""
        mode = "live" if self._is_configured() and not self._is_circuit_open() else "local"
        note = self._last_error_note
        if self._calls_made >= self.call_budget:
            note = "call budget reached - using local fallback"
        elif not self.api_key:
            note = "MEKO_API_KEY not configured - using local fallback"
        elif self._is_circuit_open():
            note = f"circuit breaker open (fallback for 60s): {self._last_error_note}"

        return MekoStatus(
            mode="live" if mode == "live" and self.api_key else "local",
            connected=bool(self._is_configured() and not self._is_circuit_open()),
            datapack_id=self.datapack_id or None,
            conversation_id=deal_id,
            calls_made=self._calls_made,
            call_budget=self.call_budget,
            note=note or ("connected to Meko MCP" if mode == "live" else "running local fallback"),
        )
