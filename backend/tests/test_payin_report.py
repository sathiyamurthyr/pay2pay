import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from app.presentation.api.v1.payin_report_router import (
    get_payin_report_summary,
    get_payin_report_grid,
    get_payin_transaction_details,
    export_payin_report,
    map_gateway_label
)


class MockRequest:
    def __init__(self, headers=None, query_params=None, cookies=None):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.cookies = cookies or {}


def test_map_gateway_label():
    assert map_gateway_label(1, "BANKME") == "G-1"
    assert map_gateway_label(2, "EASEBUZZ") == "G-2"
    assert map_gateway_label(1, None) == "G-1"
    assert map_gateway_label(None, "BANKME_PAYIN") == "G-1"
    assert map_gateway_label(None, None) == "G-1"


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_report_summary_endpoint(mock_auth):
    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    mock_row = MagicMock()
    mock_row._mapping = {
        "total_transactions": 25,
        "total_volume": 1250000.00,
        "total_customer_payable": 1275000.00,
        "total_retailer_credit": 1250000.00,
        "total_charges": 25000.00,
        "total_mdr": 21186.44,
        "total_gst": 3813.56,
        "successful_transactions": 23,
        "successful_amount": 1200000.00,
        "successful_credit": 1200000.00,
        "pending_transactions": 1,
        "pending_amount": 30000.00,
        "failed_transactions": 1,
        "failed_amount": 20000.00,
        "reversed_transactions": 0,
        "reversed_amount": 0.0,
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_res

    res = await get_payin_report_summary(
        request=req,
        from_date="2026-11-01",
        to_date="2026-11-20",
        company_ref_id=None,
        retailer_ref_id=None,
        status="ALL",
        gateway=None,
        payment_mode=None,
        search=None,
        db=mock_db
    )

    assert res["success"] is True
    data = res["data"]
    assert data["total_transactions"] == 25
    assert data["total_volume"] == 1250000.00
    assert data["total_customer_payable"] == 1275000.00
    assert data["total_retailer_credit"] == 1250000.00
    assert data["total_gst"] == 3813.56
    assert data["successful_transactions"] == 23
    assert data["success_rate"] == 92.0


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_report_grid_endpoint(mock_auth):
    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    # 1. Count query mock
    count_row = (1, 50000.0, 1000.0, 152.54, 51000.0, 50000.0)
    count_res = MagicMock()
    count_res.fetchone.return_value = count_row

    # 2. Data query mock
    now_dt = datetime.now(timezone.utc)
    data_row = MagicMock()
    data_row._mapping = {
        "payin_transactions_ref_id": 101,
        "tid": "PIN-20261118-001",
        "merchant_ref_id": "ORD-9991",
        "provider_ref_id": "BM-REF-8882",
        "company_ref_id": 2,
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "company_code": "SMSPAY",
        "retailer_ref_id": 10928,
        "retailer_code": "SMSP-R902523",
        "retailer_name": "Inspel Collections",
        "payin_vendor_ref_id": 1,
        "vendor_code": "BANKME",
        "vendor_name": "BankMe Collections",
        "pay_mode_ref_id": 1,
        "payment_mode": "UPI",
        "payment_mode_name": "Unified Payments Interface",
        "card_network": None,
        "cust_name": "Sathya Murthy",
        "cust_mobile": "9025232475",
        "cust_email": "sathya@smspay.store",
        "txn_amount": 50000.00,
        "mdr_pct": 0.015,
        "mdr_fixed": 0.0,
        "mdr_amount": 750.00,
        "tax_amount": 135.00,
        "total_charges": 885.00,
        "customer_payable": 50885.00,
        "retailer_credit": 50000.00,
        "company_mdr_liability": 0.0,
        "currency": "INR",
        "mdr_treatment": "SURCHARGE_CUSTOMER",
        "txn_status": "SUCCESS",
        "provider_status": "PAID",
        "provider_resp_code": "00",
        "provider_resp_msg": "Payment Successful",
        "failure_reason": None,
        "ledger_txn_id": "LEDG-PIN-001",
        "initiated_at": now_dt,
        "completed_at": now_dt,
        "created_at": now_dt,
        "updated_at": now_dt
    }
    data_res = MagicMock()
    data_res.fetchall.return_value = [data_row]

    mock_db.execute.side_effect = [count_res, data_res]

    res = await get_payin_report_grid(
        request=req,
        from_date="2026-11-01",
        to_date="2026-11-20",
        company_ref_id=None,
        retailer_ref_id=None,
        status="ALL",
        gateway=None,
        payment_mode=None,
        search=None,
        page=1,
        limit=10,
        sort_by="created_at",
        sort_dir="desc",
        db=mock_db
    )

    assert res["success"] is True
    items = res["items"]
    assert len(items) == 1
    it = items[0]
    assert it["tid"] == "PIN-20261118-001"
    assert it["reference_id"] == "ORD-9991"
    assert it["retailer_name"] == "Inspel Collections"
    assert it["gateway"] == "G-1"
    assert it["vendor_name"] == "G-1"  # Customer-facing labels G-1 / G-2 only
    assert it["payment_mode"] == "UPI"
    assert it["amount"] == 50000.00
    assert it["gst"] == 135.00
    assert it["total_charges"] == 885.00
    assert it["total_amount"] == 50885.00
    assert it["retailer_credit"] == 50000.00
    assert it["status"] == "SUCCESS"

    totals = res["footer_totals"]
    assert totals["total_transactions"] == 1
    assert totals["total_amount"] == 50000.00
    assert totals["total_gst"] == 152.54


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_transaction_details_endpoint(mock_auth):
    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    now_dt = datetime.now(timezone.utc)
    mock_row = MagicMock()
    mock_row._mapping = {
        "payin_transactions_ref_id": 101,
        "tid": "PIN-20261118-001",
        "merchant_ref_id": "ORD-9991",
        "provider_ref_id": "BM-REF-8882",
        "company_ref_id": 2,
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "company_code": "SMSPAY",
        "retailer_ref_id": 10928,
        "retailer_code": "SMSP-R902523",
        "retailer_name": "Inspel Collections",
        "payin_vendor_ref_id": 1,
        "vendor_code": "BANKME",
        "vendor_name": "BankMe Collections",
        "pay_mode_ref_id": 1,
        "payment_mode": "UPI",
        "payment_mode_name": "Unified Payments Interface",
        "card_network": None,
        "cust_name": "Sathya Murthy",
        "cust_mobile": "9025232475",
        "cust_email": "sathya@smspay.store",
        "txn_amount": 50000.00,
        "mdr_pct": 0.015,
        "mdr_fixed": 0.0,
        "mdr_amount": 750.00,
        "tax_amount": 135.00,
        "total_charges": 885.00,
        "customer_payable": 50885.00,
        "retailer_credit": 50000.00,
        "company_mdr_liability": 0.0,
        "currency": "INR",
        "mdr_treatment": "SURCHARGE_CUSTOMER",
        "customer_payable_policy": "WITH_MDR",
        "txn_status": "SUCCESS",
        "provider_status": "PAID",
        "provider_resp_code": "00",
        "provider_resp_msg": "Payment Successful",
        "callback_status": "SUCCESS",
        "idempotency_key": "IDEMP-PIN-001",
        "failure_reason": None,
        "ledger_txn_id": "LEDG-PIN-001",
        "initiated_at": now_dt,
        "completed_at": now_dt,
        "created_at": now_dt,
        "updated_at": now_dt
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_res

    res = await get_payin_transaction_details(
        tid="PIN-20261118-001",
        request=req,
        db=mock_db
    )

    assert res["success"] is True
    data = res["data"]
    assert data["tid"] == "PIN-20261118-001"
    assert data["gateway"] == "G-1"
    assert data["amount"] == 50000.00
    assert data["gst"] == 135.00
    assert data["customer_payable"] == 50885.00
    assert data["retailer_credit"] == 50000.00


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_export_payin_report_csv(mock_auth):
    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    now_dt = datetime.now(timezone.utc)
    mock_row = MagicMock()
    mock_row._mapping = {
        "payin_transactions_ref_id": 101,
        "tid": "PIN-20261118-001",
        "merchant_ref_id": "ORD-9991",
        "provider_ref_id": "BM-REF-8882",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "retailer_code": "SMSP-R902523",
        "retailer_name": "Inspel Collections",
        "payin_vendor_ref_id": 1,
        "vendor_code": "BANKME",
        "payment_mode": "UPI",
        "cust_mobile": "9025232475",
        "txn_amount": 50000.00,
        "mdr_amount": 750.00,
        "tax_amount": 135.00,
        "total_charges": 885.00,
        "customer_payable": 50885.00,
        "retailer_credit": 50000.00,
        "txn_status": "SUCCESS",
        "created_at": now_dt,
        "completed_at": now_dt
    }
    mock_res = MagicMock()
    mock_res.fetchall.return_value = [mock_row]
    mock_db.execute.return_value = mock_res

    response = await export_payin_report(
        request=req,
        from_date="2026-11-01",
        to_date="2026-11-20",
        db=mock_db
    )

    assert response.status_code == 200
    assert response.media_type == "text/csv"
    csv_text = response.body.decode("utf-8")
    assert "TID" in csv_text
    assert "Gateway" in csv_text
    assert "GST (₹)" in csv_text
    assert "MobileNo" in csv_text
    assert "9025232475" in csv_text
    assert "G-1" in csv_text
    assert "PIN-20261118-001" in csv_text
    # Retailer export must NEVER contain Admin-only fields
    assert "ReferenceID" not in csv_text
    assert "Retailer" not in csv_text
    assert "Vendor" not in csv_text


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_export_payin_report_csv_admin(mock_auth):
    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": None,
        "is_admin": True,
        "is_super_admin": True,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    now_dt = datetime.now(timezone.utc)
    mock_row = MagicMock()
    mock_row._mapping = {
        "payin_transactions_ref_id": 101,
        "tid": "PIN-20261118-001",
        "merchant_ref_id": "ORD-9991",
        "provider_ref_id": "BM-REF-8882",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "retailer_code": "SMSP-R902523",
        "retailer_name": "Inspel Collections",
        "payin_vendor_ref_id": 1,
        "vendor_code": "BANKME",
        "vendor_name": "BankMe Collections",
        "payment_mode": "UPI",
        "cust_mobile": "9025232475",
        "txn_amount": 50000.00,
        "mdr_amount": 750.00,
        "tax_amount": 135.00,
        "total_charges": 885.00,
        "customer_payable": 50885.00,
        "retailer_credit": 50000.00,
        "txn_status": "SUCCESS",
        "created_at": now_dt,
        "completed_at": now_dt
    }
    mock_res = MagicMock()
    mock_res.fetchall.return_value = [mock_row]
    mock_db.execute.return_value = mock_res

    response = await export_payin_report(
        request=req,
        from_date="2026-11-01",
        to_date="2026-11-20",
        portal="admin",
        db=mock_db
    )

    assert response.status_code == 200
    assert response.media_type == "text/csv"
    csv_text = response.body.decode("utf-8")
    lines = [line.strip() for line in csv_text.strip().split("\n")]
    header = lines[0]
    row = lines[1]

    # Verify Admin-only columns are present in Header
    assert "ReferenceID" in header
    assert "Retailer" in header
    assert "Vendor" in header
    assert "TID" in header
    assert "Gateway" in header

    # Verify row values
    assert "ORD-9991" in row
    assert "Inspel Collections" in row
    assert "G-1" in row
    assert "50000.00" in row


def test_build_payin_filters_dynamic_parameters():
    from app.presentation.api.v1.payin_report_router import _build_payin_filters

    auth_ctx = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "user_ref_id": 10928,
        "user_type_ref_id": 2,
        "is_admin": False,
        "is_super_admin": False,
    }

    # All-time preset (blank dates) omits date bounds while keeping tenant & user scope
    where_all, params_all, start_all, end_all, comp_all = _build_payin_filters(
        auth_ctx,
        from_date="",
        to_date="",
        status="ALL",
        gateway="ALL",
        payment_mode="ALL",
    )
    assert start_all is None and end_all is None
    assert comp_all == 2
    assert "t.created_at" not in where_all
    assert params_all["comp_ref"] == 2
    assert params_all["eff_user_ref"] == 10928

    # Full filter combination: custom date range, TID, formatted mobile, gateway G-3, card network, status, search
    where_full, params_full, start_full, end_full, _ = _build_payin_filters(
        auth_ctx,
        from_date="2026-11-01",
        to_date="2026-11-26",
        tid="PIN-123",
        mobile="+91 9025232475",
        status="SUCCESS",
        gateway="G-3",
        payment_mode="VISA",
        search="Sathya",
    )
    assert start_full is not None and end_full is not None
    assert "t.created_at >= :start_dt" in where_full
    assert "t.created_at <= :end_dt" in where_full
    assert params_full["tid_val"] == "%PIN-123%"
    assert params_full["mob_val"] == "%9025232475%"
    assert params_full["gw_ref_id"] == 3
    assert params_full["pm_net"] == "VISA"
    assert params_full["s"] == "%Sathya%"
    assert "UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')" in where_full


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_filter_options_dynamic(mock_auth):
    from app.presentation.api.v1.payin_report_router import get_payin_report_filter_options

    mock_auth.return_value = {
        "company_ref_id": 2,
        "retailer_ref_id": 10928,
        "user_ref_id": 10928,
        "user_type_ref_id": 2,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    vendors_res = MagicMock()
    vendors_res.fetchall.return_value = [(1, "BANKME"), (3, "CUSTOMGW")]
    dist_res = MagicMock()
    dist_res.fetchall.return_value = [(3, "CUSTOMGW", "CORPORATE", "CREDIT_CARD")]
    mock_db.execute.side_effect = [vendors_res, dist_res]

    res = await get_payin_report_filter_options(request=req, company_ref_id=None, db=mock_db)
    assert res["success"] is True
    gw_values = {g["value"] for g in res["data"]["gateways"]}
    method_values = {m["value"] for m in res["data"]["methods"]}
    assert {"G-1", "G-2", "G-3"}.issubset(gw_values)
    assert {"UPI", "VISA", "NETBANKING"}.issubset(method_values)
    assert "CORPORATE_CARD" in method_values


