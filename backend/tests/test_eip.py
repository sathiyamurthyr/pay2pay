import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_integration_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. EIP Dashboard Metrics
        metrics_res = await ac.get("/api/v1/eip/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        assert metrics_res.json()["requests_per_minute"] >= 0

        # 3. Create Integration Partner
        p_res = await ac.post("/api/v1/eip/partners", headers=headers, json={
            "partner_name": "Axis Bank Host-to-Host Node",
            "category": "BANK"
        })
        assert p_res.status_code == 200
        assert p_res.json()["status"] == "ACTIVE"

        # 4. List Connectors
        conn_res = await ac.get("/api/v1/eip/connectors", headers=headers)
        assert conn_res.status_code == 200
        assert len(conn_res.json()) >= 1

        # 5. List Webhook Deliveries
        dels_res = await ac.get("/api/v1/eip/webhooks/deliveries", headers=headers)
        assert dels_res.status_code == 200
        deliveries = dels_res.json()
        assert len(deliveries) >= 1
        delivery_id = deliveries[0]["public_id"]

        # 6. Replay Webhook Delivery Event
        replay_res = await ac.post(f"/api/v1/eip/webhooks/replay/{delivery_id}", headers=headers)
        assert replay_res.status_code == 200
        assert replay_res.json()["status"] == "SUCCESS"

        # 7. List Events
        events_res = await ac.get("/api/v1/eip/events", headers=headers)
        assert events_res.status_code == 200
        assert len(events_res.json()) >= 1

        # 8. List Developer Apps
        apps_res = await ac.get("/api/v1/eip/developer/apps", headers=headers)
        assert apps_res.status_code == 200
        assert len(apps_res.json()) >= 1
