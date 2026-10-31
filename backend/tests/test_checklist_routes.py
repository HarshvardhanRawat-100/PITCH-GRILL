"""Integration tests for checklist HTTP endpoints."""
import pytest
from contracts.schemas import ChecklistItem, Deal
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.routes.checklist import router
from app.store import save_deal


@pytest.fixture
def app_with_checklist() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.mark.asyncio
async def test_get_and_patch_checklist(app_with_checklist: FastAPI):
    deal = Deal(
        id="deal_chk_routes_test",
        checklist=[
            ChecklistItem(
                id="D-1",
                title="Cap Table",
                why="Validate ownership",
                finding_id=None,
                priority="P0",
                owner="finance",
                status="todo",
                india_specific=False,
            )
        ],
    )
    save_deal(deal)

    transport = ASGITransport(app=app_with_checklist)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET list
        resp = await client.get("/api/deals/deal_chk_routes_test/checklist")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["id"] == "D-1"
        assert items[0]["status"] == "todo"

        # 2. PATCH status to uploaded
        patch_resp = await client.patch(
            "/api/deals/deal_chk_routes_test/checklist/D-1",
            json={"status": "uploaded"},
        )
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["id"] == "D-1"
        assert updated["status"] == "uploaded"

        # 3. Verify GET returns updated status
        verify_resp = await client.get("/api/deals/deal_chk_routes_test/checklist")
        assert verify_resp.status_code == 200
        assert verify_resp.json()[0]["status"] == "uploaded"

        # 4. Unknown item returns 404
        bad_item = await client.patch(
            "/api/deals/deal_chk_routes_test/checklist/D-999",
            json={"status": "addressed"},
        )
        assert bad_item.status_code == 404

        # 5. Unknown deal returns 404
        bad_deal = await client.get("/api/deals/non_existent_deal/checklist")
        assert bad_deal.status_code == 404
