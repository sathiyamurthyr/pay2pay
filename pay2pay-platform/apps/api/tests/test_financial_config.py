import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_financial_config_engine_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create MDR Configuration
        rand_k = random.randint(1000, 9999)
        mdr_res = await ac.post("/api/v1/financial-config", json={
            "config_code": f"MDR-COMP-{rand_k}",
            "config_type": "MDR",
            "config_name": f"Company Default MDR {rand_k}",
            "hierarchy_level": "COMPANY",
            "priority": 5,
            "version": "1.0",
            "remarks": "Standard 1.5% MDR rate for credit/debit swipes",
            "mdr": {
                "percentage": 1.5,
                "fixed_charge": 0.0,
                "minimum_charge": 0.0,
                "maximum_charge": 500.0,
                "gst_applicable": True,
                "priority": 5
            }
        }, headers=headers)
        assert mdr_res.status_code == 200, f"MDR creation failed: {mdr_res.text}"
        mdr_data = mdr_res.json()
        assert mdr_data["approval_status"] == "APPROVED"

        # 3. List Financial Configurations
        list_res = await ac.get("/api/v1/financial-config", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 4. Resolve Effective Configuration via 7-Tier Priority Chain
        eff_res = await ac.get("/api/v1/financial-config/resolve/effective?config_type=MDR", headers=headers)
        assert eff_res.status_code == 200
        eff_data = eff_res.json()
        assert eff_data["config_type"] == "MDR"

        # 5. Fetch Financial Config Telemetry Metrics
        metrics_res = await ac.get("/api/v1/financial-config/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_data = metrics_res.json()
        assert m_data["total_configs_count"] >= 1
