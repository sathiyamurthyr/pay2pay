import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_finance_accounting_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Finance Dashboard Metrics
        metrics_res = await ac.get("/api/v1/finance/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        assert metrics_res.json()["trial_balance_status"] == "BALANCED"

        # 3. List Accounting Periods
        periods_res = await ac.get("/api/v1/finance/periods", headers=headers)
        assert periods_res.status_code == 200
        periods = periods_res.json()
        assert len(periods) >= 1
        period_id = periods[0]["public_id"]

        # 4. Close Accounting Period
        close_res = await ac.post(f"/api/v1/finance/periods/{period_id}/close", headers=headers)
        assert close_res.status_code == 200
        assert close_res.json()["status"] == "CLOSED"

        # 5. Fetch Trial Balance
        tb_res = await ac.get("/api/v1/finance/trial-balance", headers=headers)
        assert tb_res.status_code == 200
        tb_data = tb_res.json()
        assert tb_data["is_balanced"] is True

        # 6. Fetch Financial Statement (Balance Sheet & P&L)
        bs_res = await ac.get("/api/v1/finance/statements/BALANCE_SHEET", headers=headers)
        assert bs_res.status_code == 200
        assert bs_res.json()["statement_type"] == "BALANCE_SHEET"

        # 7. Post Manual Double-Entry Journal Entry
        jnl_res = await ac.post("/api/v1/finance/journals", headers=headers, json={
            "debit_account_code": "1001_BANK_HDFC",
            "credit_account_code": "3001_MDR_REVENUE",
            "amount": 25000.0,
            "narration": "Manual adjustment entry for bank interest credit"
        })
        assert jnl_res.status_code == 200
        assert jnl_res.json()["status"] == "POSTED"

        # 8. Bank Reconciliation Match Action
        recon_res = await ac.post("/api/v1/finance/bank-reconciliation/match", headers=headers, json={
            "statement_line_id": str(uuid.uuid4())
        })
        assert recon_res.status_code == 200
        assert recon_res.json()["status"] == "MATCHED"
