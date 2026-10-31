"""Server-Sent Events (SSE) streaming engine with replay and heartbeat."""
import asyncio
import json
import logging
from typing import AsyncGenerator

from contracts.schemas import SSEEvent
from app.store import get_events, subscribe, unsubscribe

logger = logging.getLogger("app.sse")


def format_sse(event_type: str, data: dict, event_id: int) -> str:
    """Format an SSE message with id, event, and JSON data."""
    payload = json.dumps(data)
    return f"id: {event_id}\nevent: {event_type}\ndata: {payload}\n\n"


async def event_generator(
    deal_id: str,
    since: int = 0,
    heartbeat_interval: float = 15.0,
) -> AsyncGenerator[str, None]:
    """Stream events for a deal: replay buffered events, then tail live ones."""
    queue = subscribe(deal_id)
    last_seq = since

    try:
        # 1. Replay buffered events with seq > since
        buffered = get_events(deal_id, since=since)
        for event in buffered:
            last_seq = max(last_seq, event.seq)
            yield format_sse(event.type, event.model_dump(), event.seq)

        # 2. Tail live events with heartbeat
        while True:
            try:
                # Wait for next event or heartbeat timeout
                event: SSEEvent = await asyncio.wait_for(
                    queue.get(), timeout=heartbeat_interval
                )
                if event.seq > last_seq:
                    last_seq = event.seq
                    yield format_sse(event.type, event.model_dump(), event.seq)
            except asyncio.TimeoutError:
                # Send SSE comment heartbeat
                yield ": ping\n\n"

    except asyncio.CancelledError:
        logger.debug("SSE client disconnected from deal %s", deal_id)
    finally:
        unsubscribe(deal_id, queue)
