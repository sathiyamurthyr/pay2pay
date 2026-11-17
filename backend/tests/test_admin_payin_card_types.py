import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def get_admin_auth_headers(ac: AsyncClient, email: str = "admin@smspay.store") -> dict:
    resp = await ac.post("/api/v1/auth/login", json={
        "email_or_username": email,
        "password": "Admin@123"
    })
    if resp.status_code == 200:
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}

@pytest.mark.asyncio
async def test_admin_card_types_endpoint():
    """Verify admin card types API returns authoritative database records, counts, and networks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = await get_admin_auth_headers(ac)
        assert "Authorization" in headers

        resp = await ac.get("/api/v1/admin/payin/card-types", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["total"] == 8
        assert data["active_count"] == 8
        assert data["inactive_count"] == 0
        assert "networks" in data
        assert "VISA" in data["networks"]
        assert "MASTERCARD" in data["networks"]
        assert "RUPAY" in data["networks"]
        assert len(data["card_types"]) == 8

        # Test filtering by network: RUPAY
        resp_rupay = await ac.get("/api/v1/admin/payin/card-types?network=RUPAY", headers=headers)
        assert resp_rupay.status_code == 200
        data_rupay = resp_rupay.json()
        assert data_rupay["total"] == 8  # Global DB count preserved
        assert data_rupay["filtered_total"] == 2  # CREDIT_RUPAY, DEBIT_RUPAY
        assert len(data_rupay["card_types"]) == 2
        for ct in data_rupay["card_types"]:
            assert ct["card_network"] == "RUPAY"

        # Test search query: "Corporate"
        resp_search = await ac.get("/api/v1/admin/payin/card-types?search=corporate", headers=headers)
        assert resp_search.status_code == 200
        data_search = resp_search.json()
        assert data_search["filtered_total"] == 2
        for ct in data_search["card_types"]:
            assert "CORP" in ct["card_type_code"]

        # Test status filter: DISABLED
        resp_dis = await ac.get("/api/v1/admin/payin/card-types?status=DISABLED", headers=headers)
        assert resp_dis.status_code == 200
        data_dis = resp_dis.json()
        assert data_dis["filtered_total"] == 0

        # Test toggle endpoint
        # Toggle card 1 to disabled
        toggle_off = await ac.post("/api/v1/admin/payin/card-types/1/toggle", json={"is_enabled": False}, headers=headers)
        assert toggle_off.status_code == 200
        assert toggle_off.json()["is_enabled"] is False

        # Verify DB and API reflects inactive_count = 1
        resp_after_toggle = await ac.get("/api/v1/admin/payin/card-types", headers=headers)
        data_after = resp_after_toggle.json()
        assert data_after["active_count"] == 7
        assert data_after["inactive_count"] == 1

        # Toggle back to enabled
        toggle_on = await ac.post("/api/v1/admin/payin/card-types/1/toggle", json={"is_enabled": True}, headers=headers)
        assert toggle_on.status_code == 200
        assert toggle_on.json()["is_enabled"] is True

        # Verify restored to 8 active
        resp_restored = await ac.get("/api/v1/admin/payin/card-types", headers=headers)
        assert resp_restored.json()["active_count"] == 8
