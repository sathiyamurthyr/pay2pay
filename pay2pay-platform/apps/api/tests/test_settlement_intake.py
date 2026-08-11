import random
import pytest
from datetime import date
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_settlement_file_intake_and_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Machine Inventory TID for mapping
        mach_res = await ac.get("/api/v1/machines", headers=headers)
        machines = mach_res.json()["items"]
        target_tid = machines[0]["tid"]
        target_mid = machines[0]["mid"]

        # 3. Prepare CSV Settlement Content
        rand_ref = f"TXN2026{random.randint(1000, 9999)}"
        csv_content = f"TxnReference,MID,TID,Amount\n{rand_ref},{target_mid},{target_tid},12500.0\nINVALID_REF,MID_UNKNOWN,TID_UNKNOWN,500.0"

        # 4. Upload Settlement File
        upload_res = await ac.post("/api/v1/settlement-intake/upload", json={
            "bank_name": "HDFC",
            "settlement_date": str(date.today()),
            "file_content_csv": csv_content,
            "original_file_name": f"hdfc_batch_{rand_ref}.csv"
        }, headers=headers)
        assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
        u_data = upload_res.json()
        assert u_data["status"] == "PARTIALLY_REJECTED"

        # 5. List Uploaded Settlement Files
        files_res = await ac.get("/api/v1/settlement-intake/files", headers=headers)
        assert files_res.status_code == 200
        assert len(files_res.json()) >= 1

        # 6. Check Staged Valid Records
        stage_res = await ac.get("/api/v1/settlement-intake/staging", headers=headers)
        assert stage_res.status_code == 200
        assert len(stage_res.json()) >= 1

        # 7. Check Isolated Rejects
        reject_res = await ac.get("/api/v1/settlement-intake/rejects", headers=headers)
        assert reject_res.status_code == 200
        assert len(reject_res.json()) >= 1

        # 8. Fetch Telemetry Metrics
        metrics_res = await ac.get("/api/v1/settlement-intake/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_data = metrics_res.json()
        assert m_data["total_files_uploaded"] >= 1
        assert m_data["rejected_records_count"] >= 1
