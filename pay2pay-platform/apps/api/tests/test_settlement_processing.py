import random
import pytest
from datetime import date
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_settlement_processing_pipeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload Bank File to populate Staging Table
        mach_res = await ac.get("/api/v1/machines", headers=headers)
        machines = mach_res.json()["items"]
        target_tid = machines[0]["tid"]
        target_mid = machines[0]["mid"]

        rand_ref = f"TXNPROC{random.randint(1000, 9999)}"
        csv_content = f"TxnReference,MID,TID,Amount\n{rand_ref},{target_mid},{target_tid},20000.0"

        upload_res = await ac.post("/api/v1/settlement-intake/upload", json={
            "bank_name": "ICICI",
            "settlement_date": str(date.today()),
            "file_content_csv": csv_content,
            "original_file_name": f"icici_batch_{rand_ref}.csv"
        }, headers=headers)
        assert upload_res.status_code == 200

        # 3. Process Settlement Batch Pipeline
        proc_res = await ac.post("/api/v1/settlement-processing/process-batch", json={
            "settlement_date": str(date.today())
        }, headers=headers)
        assert proc_res.status_code == 200, f"Batch processing failed: {proc_res.text}"
        txns = proc_res.json()
        assert len(txns) >= 1
        first_txn = txns[0]
        assert first_txn["status"] == "COMPLETED"
        assert first_txn["gross_amount"] == 20000.0
        assert first_txn["net_amount"] < 20000.0  # Net after MDR, GST, TDS

        # 4. Verify Double-Entry Accounting Journals Posted
        j_res = await ac.get("/api/v1/settlement-processing/journals", headers=headers)
        assert j_res.status_code == 200
        journals = j_res.json()
        assert len(journals) >= 1
        entries = journals[0]["entries"]
        assert len(entries) >= 4  # Debit Bank, Credit Wallet, Credit MDR Revenue, Credit GST Payable

        # 5. Fetch Settlement Processing Telemetry Metrics
        m_res = await ac.get("/api/v1/settlement-processing/dashboard/metrics", headers=headers)
        assert m_res.status_code == 200
        metrics = m_res.json()
        assert metrics["completed_settlements_count"] >= 1
        assert metrics["total_wallet_credits"] > 0
