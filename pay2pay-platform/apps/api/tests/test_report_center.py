import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368"
TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68"

@pytest.mark.asyncio
async def test_report_center_catalog_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/report-center/reports",
            params={"retailer_id": RETAILER_ID, "tenant_id": TENANT_ID}
        )
        assert res.status_code == 200
        data = res.json()
        assert "categories" in data
        assert len(data["categories"]) >= 4

@pytest.mark.asyncio
async def test_report_center_summary_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/report-center/summary",
            params={
                "report_type": "payout",
                "retailer_id": RETAILER_ID,
                "tenant_id": TENANT_ID,
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert "metrics" in data
        assert len(data["metrics"]) >= 4

@pytest.mark.asyncio
async def test_report_center_grid_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/report-center/grid",
            params={
                "report_type": "payout",
                "retailer_id": RETAILER_ID,
                "tenant_id": TENANT_ID,
                "page": 1,
                "limit": 10
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "pagination" in data
