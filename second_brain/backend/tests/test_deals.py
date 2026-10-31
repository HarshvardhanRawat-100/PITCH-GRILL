"""Tests for FastAPI deal endpoints and health check."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app


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
async def test_deal_demo_creation_and_lifecycle():
    settings.MOCK = True
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
