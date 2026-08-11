import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_reporting_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Executive MIS Summary
        exec_res = await ac.get("/api/v1/reporting/executive-summary", headers=headers)
        assert exec_res.status_code == 200
        exec_data = exec_res.json()
        assert exec_data["total_settlement_volume"] >= 0.0

        # 3. Financial MIS Summary
        fin_res = await ac.get("/api/v1/reporting/financial-summary", headers=headers)
        assert fin_res.status_code == 200
        assert "company_revenue" in fin_res.json()

        # 4. List Report Definitions
        defs_res = await ac.get("/api/v1/reporting/definitions", headers=headers)
        assert defs_res.status_code == 200
        reports = defs_res.json()
        assert len(reports) >= 4
        report_id = reports[0]["public_id"]

        # 5. Trigger Report Execution
        exec_trigger_res = await ac.post("/api/v1/reporting/execute", json={
            "report_id": report_id,
            "export_format": "EXCEL"
        }, headers=headers)
        assert exec_trigger_res.status_code == 200
        assert exec_trigger_res.json()["execution_status"] == "COMPLETED"

        # 6. Create Report Schedule
        sch_res = await ac.post("/api/v1/reporting/schedules", json={
            "report_id": report_id,
            "frequency": "DAILY",
            "recipient_email": "finance@pay2pay.com",
            "format": "EXCEL"
        }, headers=headers)
        assert sch_res.status_code == 200
        assert sch_res.json()["status"] == "ACTIVE"

        # 7. List Daily Summaries
        ds_res = await ac.get("/api/v1/reporting/daily-summaries", headers=headers)
        assert ds_res.status_code == 200
        assert len(ds_res.json()) >= 5
