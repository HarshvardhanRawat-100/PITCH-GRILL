"""Tests for FastAPI deal endpoints, security headers, rate limiting, and delete cleanup."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import _POST_RATE_LIMITS, app
from app.store import get_deal, save_deal
from contracts.schemas import Deal


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert "model" in data
        assert "gemini_calls" in data
        assert "meko" in data


@pytest.mark.asyncio
async def test_security_headers_present():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_deal_demo_creation_and_lifecycle():
    settings.MOCK = True
    _POST_RATE_LIMITS.clear()  # reset rate limits for test
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create demo deal
        resp = await client.post("/api/deals?demo=true")
        assert resp.status_code == 201
        data = resp.json()
        deal_id = data["deal_id"]
        assert deal_id.startswith("deal_")

        # Get deal
        resp_get = await client.get(f"/api/deals/{deal_id}")
        assert resp_get.status_code == 200
        deal_data = resp_get.json()
        assert deal_data["id"] == deal_id

        # Delete deal
        resp_del = await client.delete(f"/api/deals/{deal_id}")
        assert resp_del.status_code == 200
        assert resp_del.json()["deleted"] is True

        # Verify not found
        resp_get2 = await client.get(f"/api/deals/{deal_id}")
        assert resp_get2.status_code == 404


@pytest.mark.asyncio
async def test_delete_flow_cleans_files_and_calls_memory(monkeypatch):
    """Test that DELETE /api/deals/{id} deletes uploaded PDF, snapshot, and calls memory.forget_deal."""
    deal_id = "deal_test_cleanup_123"
    deal = Deal(id=deal_id, status="ready")
    save_deal(deal)

    # Create dummy files to verify cleanup
    upload_file = settings.DATA_DIR / "uploads" / f"{deal_id}.pdf"
    upload_file.write_bytes(b"%PDF-1.4 mock content")
    snapshot_file = settings.DATA_DIR / f"{deal_id}.json"
    snapshot_file.write_text("{}")

    assert upload_file.exists()
    assert snapshot_file.exists()

    # Mock memory.forget_deal
    mock_memory = MagicMock()
    mock_forget = AsyncMock(return_value=1)
    mock_memory.forget_deal = mock_forget

    import sys

    mock_memory_pkg = MagicMock()
    mock_memory_pkg.get_memory.return_value = mock_memory
    monkeypatch.setitem(sys.modules, "app.memory", mock_memory_pkg)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.delete(f"/api/deals/{deal_id}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

    # 1. State removed
    assert get_deal(deal_id) is None
    # 2. Files unlinked
    assert not upload_file.exists()
    assert not snapshot_file.exists()
    # 3. memory.forget_deal called
    mock_forget.assert_awaited_once_with(deal_id)


@pytest.mark.asyncio
async def test_rate_limiter_blocks_excessive_post_requests(monkeypatch):
    """Verify that more than 20 POST requests in a minute from the same IP receive HTTP 429."""
    # Patch run_pipeline to no-op so background tasks don't sleep
    monkeypatch.setattr("app.routes.deals.run_pipeline", AsyncMock())
    _POST_RATE_LIMITS.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First 20 should succeed
        for i in range(20):
            resp = await client.post("/api/deals?demo=true")
            assert resp.status_code == 201

        # 21st request should be rate-limited
        resp_blocked = await client.post("/api/deals?demo=true")
        assert resp_blocked.status_code == 429
        assert resp_blocked.json()["detail"]["error"]["code"] == "rate_limit_exceeded"

    _POST_RATE_LIMITS.clear()
