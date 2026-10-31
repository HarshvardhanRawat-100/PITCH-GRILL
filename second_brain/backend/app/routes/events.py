"""SSE events route."""

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.sse import event_generator

router = APIRouter(prefix="/api/deals", tags=["events"])


@router.get("/{deal_id}/events")
async def stream_deal_events(
    deal_id: str,
    since: int = Query(default=0, ge=0, description="Replay events strictly greater than this seq"),
):
    """Subscribe to the SSE event stream for a deal.

    Replays buffered events with seq > since, then streams new events as they occur.
    Heartbeats are emitted every 15 seconds.
    """
    return StreamingResponse(
        event_generator(deal_id, since=since),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
