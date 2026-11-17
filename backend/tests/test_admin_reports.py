import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_admin_reports_all_modules():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Payout Transaction Report Summary
        r1_sum = await ac.get("/api/v1/admin/reports/payout-transactions/summary")
        assert r1_sum.status_code == 200, f"Payout summary failed: {r1_sum.text}"
        data1_sum = r1_sum.json()
        assert data1_sum["status"] == "SUCCESS"
        assert "total_payout_amount" in data1_sum["data"]
        assert "successful_count" in data1_sum["data"]

        # 1b. Payout Transaction Report List
        r1_list = await ac.get("/api/v1/admin/reports/payout-transactions?page=1&limit=10")
        assert r1_list.status_code == 200
        data1_list = r1_list.json()
        assert data1_list["status"] == "SUCCESS"
        assert "items" in data1_list["data"]

        # 1c. Payout Transaction Report Export CSV
        r1_exp = await ac.get("/api/v1/admin/reports/payout-transactions/export")
        assert r1_exp.status_code == 200
        assert "text/csv" in r1_exp.headers.get("content-type", "")

        # 2. Transaction Ledger Report Summary
        r2_sum = await ac.get("/api/v1/admin/reports/transaction-ledger/summary")
        assert r2_sum.status_code == 200
        data2_sum = r2_sum.json()
        assert data2_sum["status"] == "SUCCESS"
        assert "opening_balance" in data2_sum["data"]
        assert "closing_balance" in data2_sum["data"]

        # 2b. Transaction Ledger Report List
        r2_list = await ac.get("/api/v1/admin/reports/transaction-ledger?page=1&limit=10")
        assert r2_list.status_code == 200
        data2_list = r2_list.json()
        assert data2_list["status"] == "SUCCESS"

        # 3. Tax Report Summary & List
        r3_sum = await ac.get("/api/v1/admin/reports/tax/summary?financial_year=FY2025-26")
        assert r3_sum.status_code == 200
        data3_sum = r3_sum.json()
        assert data3_sum["status"] == "SUCCESS"
        assert "total_taxable_amount" in data3_sum["data"]
        assert "total_gst" in data3_sum["data"]

        r3_list = await ac.get("/api/v1/admin/reports/tax?financial_year=FY2025-26&page=1&limit=10")
        assert r3_list.status_code == 200

        # 4. Daily Open & Close Report Summary & List
        r4_sum = await ac.get("/api/v1/admin/reports/daily-open-close/summary")
        assert r4_sum.status_code == 200
        data4_sum = r4_sum.json()
        assert data4_sum["status"] == "SUCCESS"
        assert "reconciliation_summary" in data4_sum["data"]

        r4_list = await ac.get("/api/v1/admin/reports/daily-open-close?entity_type=ALL&page=1&limit=10")
        assert r4_list.status_code == 200
        data4_list = r4_list.json()
        assert data4_list["status"] == "SUCCESS"
        assert len(data4_list["data"]["items"]) >= 3
