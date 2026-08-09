import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368"
TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68"

@pytest.mark.asyncio
async def test_raise_complaint_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "transaction_id": str(uuid.uuid4()),
            "reason": "DELAYED",
            "description": "Bank confirmation delayed for over 10 minutes",
            "retailer_id": RETAILER_ID,
            "tenant_id": TENANT_ID
        }
        res = await ac.post("/api/v1/report-center/complaint", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert "complaint_id" in data
        assert data["complaint_id"].startswith("CMP-")
