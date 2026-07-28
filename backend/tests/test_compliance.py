import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_compliance_config_report_and_metrics():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Update Tenant Configuration
        rand_c = random.randint(1000, 9999)
        cfg_res = await ac.post("/api/v1/compliance/configurations", json={
            "config_key": f"MAX_DAILY_PAYOUT_{rand_c}",
            "config_value": "500000.00",
            "data_type": "FLOAT",
            "description": "Maximum allowed daily bank payout threshold per retailer"
        }, headers=headers)
        assert cfg_res.status_code == 200, f"Tenant configuration failed: {cfg_res.text}"
        c_data = cfg_res.json()
        assert c_data["config_value"] == "500000.00"

        # 3. List Tenant Configurations
        list_cfg_res = await ac.get("/api/v1/compliance/configurations", headers=headers)
        assert list_cfg_res.status_code == 200
        assert len(list_cfg_res.json()) >= 1

        # 4. Generate Compliance Tax Report (GSTR-1 Summary)
        rep_res = await ac.post("/api/v1/compliance/reports/generate", json={
            "report_type": "GSTR_1_SUMMARY",
            "tax_period": "2026-07"
        }, headers=headers)
        assert rep_res.status_code == 200, f"Compliance report generation failed: {rep_res.text}"
        r_data = rep_res.json()
        assert r_data["status"] == "FINALIZED"
        assert r_data["report_number"].startswith("REP-202607-")

        # 5. List Compliance Reports
        reps_res = await ac.get("/api/v1/compliance/reports", headers=headers)
        assert reps_res.status_code == 200
        assert len(reps_res.json()) >= 1

        # 6. Fetch Compliance Dashboard Metrics
        metrics_res = await ac.get("/api/v1/compliance/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_data = metrics_res.json()
        assert m_data["system_health_status"] == "HEALTHY"
        assert m_data["generated_reports_count"] >= 1
