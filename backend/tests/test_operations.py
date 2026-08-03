import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_operations_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Operations Telemetry Health
        health_res = await ac.get("/api/v1/operations/health", headers=headers)
        assert health_res.status_code == 200
        assert health_res.json()["system_status"] == "HEALTHY"

        # 3. List Feature Flags
        flags_res = await ac.get("/api/v1/operations/feature-flags", headers=headers)
        assert flags_res.status_code == 200
        flags = flags_res.json()
        assert len(flags) >= 4
        flag_key = flags[0]["flag_key"]

        # 4. Toggle Feature Flag
        toggle_res = await ac.post(f"/api/v1/operations/feature-flags/{flag_key}/toggle", headers=headers)
        assert toggle_res.status_code == 200

        # 5. List Background Queues
        q_res = await ac.get("/api/v1/operations/queues", headers=headers)
        assert q_res.status_code == 200
        assert len(q_res.json()) >= 4

        # 6. List System Alerts
        alt_res = await ac.get("/api/v1/operations/alerts", headers=headers)
        assert alt_res.status_code == 200
        alerts = alt_res.json()
        assert len(alerts) >= 1
        alert_id = alerts[0]["public_id"]

        # 7. Resolve System Alert
        res_res = await ac.post(f"/api/v1/operations/alerts/{alert_id}/resolve", headers=headers)
        assert res_res.status_code == 200
        assert res_res.json()["status"] == "RESOLVED"

        # 8. Maintenance Status & Toggle
        m_res = await ac.get("/api/v1/operations/maintenance", headers=headers)
        assert m_res.status_code == 200

        mt_res = await ac.post("/api/v1/operations/maintenance/toggle", headers=headers)
        assert mt_res.status_code == 200
        assert mt_res.json()["is_maintenance_mode"] == True
