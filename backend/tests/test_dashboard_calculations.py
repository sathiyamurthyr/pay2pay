import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from app.presentation.api.v1.payin_report_router import (
    get_payin_report_summary,
    get_payin_report_grid
)
from app.presentation.api.v1.transaction_report_router import get_transaction_report


class MockRequest:
    def __init__(self, headers=None, query_params=None, cookies=None):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.cookies = cookies or {}


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_report_calculations_exclude_failed(mock_auth):
    """
    Test P0 requirement:
    Failed transactions must be excluded from Total Volume, Total Credit, and all financial totals.
    Example from prompt:
      Txn 1: SUCCESS - Rs. 3,456.00 (Retailer Credit: Rs. 3,456.00)
      Txn 2: FAILED  - Rs. 138.65 (Retailer Credit: Rs. 138.65)
    Expected:
      Total Volume: 3,456.00
      Total Credit: 3,456.00
      Successful Transactions: 1
      Failed Transactions: 1
      Success Rate: 50.0%
    """
    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    executed_sqls = []

    mock_row = MagicMock()
    mock_row._mapping = {
        "total_transactions": 2,
        "total_volume": 3456.00,  # Only Txn 1 (SUCCESS) included
        "total_customer_payable": 3456.00,
        "total_retailer_credit": 3456.00,
        "total_charges": 0.00,
        "total_mdr": 0.00,
        "total_gst": 0.00,
        "successful_transactions": 1,
        "successful_amount": 3456.00,
        "successful_credit": 3456.00,
        "pending_transactions": 0,
        "pending_amount": 0.00,
        "failed_transactions": 1,
        "failed_amount": 138.65,
        "reversed_transactions": 0,
        "reversed_amount": 0.00,
    }

    async def mock_execute(stmt, params=None):
        sql_text = str(stmt)
        executed_sqls.append(sql_text)
        res = MagicMock()
        res.fetchone.return_value = mock_row
        return res

    mock_db.execute = mock_execute

    summary_resp = await get_payin_report_summary(
        request=req,
        from_date="2026-11-22",
        to_date="2026-11-22",
        db=mock_db
    )

    # 1. Verify response data
    data = summary_resp["data"]
    assert data["total_transactions"] == 2
    assert data["total_volume"] == 3456.00
    assert data["total_retailer_credit"] == 3456.00
    assert data["successful_transactions"] == 1
    assert data["failed_transactions"] == 1
    assert data["success_rate"] == 50.0

    # 2. Verify SQL generated enforces status filtering for volume and credit
    assert len(executed_sqls) > 0
    sql = executed_sqls[0]
    assert "CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.txn_amount ELSE 0.0 END" in sql
    assert "CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.retailer_credit ELSE 0.0 END" in sql


@pytest.mark.asyncio
@patch("app.presentation.api.v1.transaction_report_router.resolve_auth_context", new_callable=AsyncMock)
async def test_wallet_transaction_report_calculations_exclude_failed(mock_auth):
    """
    Test P0 requirement for central wallet transaction report:
      Txn 1: SUCCESS Credit - Rs. 3,456.00
      Txn 2: FAILED  Debit  - Rs. 138.65
    Expected:
      Total Volume: Rs. 3,456.00
      Total Credit: Rs. 3,456.00
      Total Debit: Rs. 0.00
      Successful Transactions: 1
      Failed Transactions: 1
      Success Rate: 50.0%
    """
    mock_auth_ctx = MagicMock()
    mock_auth_ctx.tenant_ref_id = 1
    mock_auth_ctx.company_ref_id = 2
    mock_auth_ctx.user_ref_id = 10928
    mock_auth_ctx.user_type = "RETAILER"
    mock_auth_ctx.regional_manager_ref_id = None
    mock_auth.return_value = mock_auth_ctx

    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    executed_sqls = []

    # summary_row:
    # 0: total_transactions = 2
    # 1: total_volume = 3456.00 (Txn 1 only)
    # 2: total_credit = 3456.00 (Txn 1 only)
    # 3: total_debit = 0.00 (Txn 2 was FAILED, so 0)
    # 4: successful_transactions = 1
    # 5: pending_transactions = 0
    # 6: failed_transactions = 1
    # 7: reversed_transactions = 0
    mock_summary_row = (2, Decimal("3456.00"), Decimal("3456.00"), Decimal("0.00"), 1, 0, 1, 0)

    async def mock_execute(stmt, params=None):
        sql_text = str(stmt)
        executed_sqls.append(sql_text)
        res = MagicMock()
        res.fetchone.return_value = mock_summary_row
        res.fetchall.return_value = []
        return res

    mock_db.execute = mock_execute

    resp = await get_transaction_report(
        request=req,
        page=1,
        limit=25,
        from_date="2026-11-22",
        to_date="2026-11-22",
        service=None,
        entry_type=None,
        entry=None,
        status=None,
        wallet=None,
        user_type=None,
        user_type_ref_id=None,
        user_ref_id=None,
        retailer_ref_id=None,
        search=None,
        sort_by="date_time",
        sort_order="DESC",
        db=mock_db
    )

    summary = resp["summary"]
    assert summary["total_transactions"] == 2
    assert summary["total_volume"] == 3456.00
    assert summary["total_credit"] == 3456.00
    assert summary["total_debit"] == 0.00
    assert summary["successful_transactions"] == 1
    assert summary["failed_transactions"] == 1
    assert summary["success_rate"] == 50.0

    # Verify generated SQL checks status for volume, credit, and debit
    assert len(executed_sqls) > 0
    summary_sql = executed_sqls[0]
    assert "CASE WHEN UPPER(t.status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.amount ELSE 0.0 END" in summary_sql
    assert "CASE WHEN UPPER(t.status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') AND UPPER(t.entry_type) IN ('CREDIT', 'CR') THEN t.amount ELSE 0.0 END" in summary_sql
    assert "CASE WHEN UPPER(t.status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') AND UPPER(t.entry_type) IN ('DEBIT', 'DR') THEN t.amount ELSE 0.0 END" in summary_sql
