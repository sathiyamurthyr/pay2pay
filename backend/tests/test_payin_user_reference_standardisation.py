import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from fastapi import HTTPException

from app.application.user_type_service import UserTypeService
from app.application.payin_service import PayInService
from app.infrastructure.db.payin_models import (
    PayinTransactionModel,
    PayinCallbackLogModel,
    PayinApiLogModel,
    PayinAuditLogModel
)
from app.presentation.api.v1.payin_router import extract_auth_context
from app.presentation.api.v1.payin_report_router import (
    resolve_payin_auth_context,
    get_payin_report_grid,
    get_payin_transaction_details
)


class MockRequest:
    def __init__(self, headers=None, cookies=None):
        self.headers = headers or {}
        self.cookies = cookies or {}


@pytest.mark.asyncio
async def test_dynamic_user_type_resolution():
    """Verify dynamic resolution of user_type_ref_id and code directly from public.user_type."""
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.fetchall.return_value = [
        (1, "ADMIN", "Admin"),
        (2, "RETAILER", "Retailer"),
        (3, "DISTRIBUTOR", "Distributor"),
        (4, "SD", "Super Distributor"),
        (5, "CRM", "CRM"),
        (6, "RM", "Regional Manager"),
    ]
    mock_db.execute.return_value = mock_res

    # Force dynamic DB load
    await UserTypeService.load_from_db(mock_db, force=True)

    ret_id = await UserTypeService.get_user_type_ref_id(mock_db, "RETAILER")
    dist_id = await UserTypeService.get_user_type_ref_id(mock_db, "DISTRIBUTOR")
    sd_id = await UserTypeService.get_user_type_ref_id(mock_db, "SD")
    admin_id = await UserTypeService.get_user_type_ref_id(mock_db, "ADMIN")

    assert ret_id == 2
    assert dist_id == 3
    assert sd_id == 4
    assert admin_id == 1

    ret_code = await UserTypeService.get_user_type_code(mock_db, 2)
    dist_code = await UserTypeService.get_user_type_code(mock_db, 3)
    sd_code = await UserTypeService.get_user_type_code(mock_db, 4)
    admin_code = await UserTypeService.get_user_type_code(mock_db, 1)

    assert ret_code == "RETAILER"
    assert dist_code == "DISTRIBUTOR"
    assert sd_code == "SD"
    assert admin_code == "ADMIN"


@pytest.mark.asyncio
async def test_resolve_payin_user_context_roles():
    """Verify role-independent context resolution into the 3 standard columns."""
    mock_db = AsyncMock()

    # Retailer
    ret_ctx = await UserTypeService.resolve_payin_user_context(
        mock_db,
        {"company_ref_id": 2, "roles": ["RETAILER"], "retailer_ref_id": 10928}
    )
    assert ret_ctx["company_ref_id"] == 2
    assert ret_ctx["user_type_code"] == "RETAILER"
    assert ret_ctx["user_type_ref_id"] == 2
    assert ret_ctx["user_ref_id"] == 10928

    # Distributor
    dist_ctx = await UserTypeService.resolve_payin_user_context(
        mock_db,
        {"company_ref_id": 2, "roles": ["DISTRIBUTOR"], "distributor_ref_id": 4001}
    )
    assert dist_ctx["company_ref_id"] == 2
    assert dist_ctx["user_type_code"] == "DISTRIBUTOR"
    assert dist_ctx["user_type_ref_id"] == 3
    assert dist_ctx["user_ref_id"] == 4001

    # Super Distributor
    sd_ctx = await UserTypeService.resolve_payin_user_context(
        mock_db,
        {"company_ref_id": 2, "roles": ["SUPER_DISTRIBUTOR"], "super_distributor_ref_id": 3001}
    )
    assert sd_ctx["company_ref_id"] == 2
    assert sd_ctx["user_type_code"] == "SD"
    assert sd_ctx["user_type_ref_id"] == 4
    assert sd_ctx["user_ref_id"] == 3001

    # Admin
    admin_ctx = await UserTypeService.resolve_payin_user_context(
        mock_db,
        {"company_ref_id": 2, "roles": ["ADMIN"], "admin_user_ref_id": 101}
    )
    assert admin_ctx["company_ref_id"] == 2
    assert admin_ctx["user_type_code"] == "ADMIN"
    assert admin_ctx["user_type_ref_id"] == 1
    assert admin_ctx["user_ref_id"] == 101


def test_extract_auth_context_router():
    """Verify router-level extract_auth_context yields standardized reference fields."""
    req = MockRequest(headers={"host": "smspay.store"})
    
    # Retailer payload
    ctx = extract_auth_context({
        "company_ref_id": 2,
        "roles": ["RETAILER"],
        "retailer_ref_id": 10928,
        "tenant_id": "TNT-1"
    }, req)
    assert ctx["company_ref_id"] == 2
    assert ctx["user_ref_id"] == 10928
    assert ctx["user_type_code"] == "RETAILER"

    # Distributor payload
    ctx_dist = extract_auth_context({
        "company_ref_id": 2,
        "roles": ["DISTRIBUTOR"],
        "distributor_ref_id": 5001,
        "tenant_id": "TNT-1"
    }, req)
    assert ctx_dist["company_ref_id"] == 2
    assert ctx_dist["user_ref_id"] == 5001
    assert ctx_dist["user_type_code"] == "DISTRIBUTOR"


def test_payin_models_user_reference_columns():
    """Verify SQLAlchemy models have the 3 standard columns."""
    txn = PayinTransactionModel(
        tid="TEST_TID_001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928
    )
    assert txn.company_ref_id == 2
    assert txn.user_type_ref_id == 2
    assert txn.user_ref_id == 10928

    cb = PayinCallbackLogModel(
        tid="TEST_TID_001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        payin_vendor_ref_id=1,
        callback_status="SUCCESS",
        payload={}
    )
    assert cb.company_ref_id == 2
    assert cb.user_type_ref_id == 2
    assert cb.user_ref_id == 10928

    api_log = PayinApiLogModel(
        tid="TEST_TID_001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        vendor_name="BANKME",
        api_type="COLLECT",
        endpoint="/test",
        http_method="POST"
    )
    assert api_log.company_ref_id == 2
    assert api_log.user_type_ref_id == 2
    assert api_log.user_ref_id == 10928

    audit = PayinAuditLogModel(
        company_ref_id=2,
        user_type_ref_id=1,
        user_ref_id=101,
        actor_ref_id=101,
        action_type="TEST_ACTION",
        entity_type="test",
        entity_ref_id=1
    )
    assert audit.company_ref_id == 2
    assert audit.user_type_ref_id == 1
    assert audit.user_ref_id == 101


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_reconcile_wallet_credit_standard_columns(mock_wallet_sp):
    """Verify wallet credit passes standard company_ref_id, user_type_ref_id, user_ref_id."""
    mock_db = AsyncMock()
    mock_wallet_res = MagicMock()
    mock_wallet_res.success = True
    mock_wallet_res.txn_id = "LEDGER-TXN-123"
    mock_wallet_sp.return_value = mock_wallet_res

    # Mock retailer lookup query
    ret_row = MagicMock()
    ret_row.public_id = "RET-UUID-001"
    ret_row.retailer_code = "RT10928"
    mock_db_res = MagicMock()
    mock_db_res.scalars.return_value.first.return_value = ret_row
    mock_db.execute.return_value = mock_db_res

    txn = PayinTransactionModel(
        tid="TID-TEST-WALLET-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=1000.0,
        retailer_credit=980.0,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS", "bankme_ref": "BME-123"},
        provider_status="SUCCESS",
        provider_ref_id="BME-123",
        source="TEST"
    )

    assert res["status"] == "SUCCESS"
    assert txn.ledger_txn_id == "LEDGER-TXN-123"

    # Assert DTO passed to WalletAdjustmentService
    mock_wallet_sp.assert_called_once()
    passed_dto = mock_wallet_sp.call_args[1]["dto"]
    assert passed_dto.company_ref_id == 2
    assert passed_dto.user_type_ref_id == 2
    assert passed_dto.user_ref_id == 10928
    assert passed_dto.amount == 980.0


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_report_grid_standard_columns(mock_auth):
    """Verify PayIn report grid queries and returns the 3 standard columns."""
    mock_auth.return_value = {
        "company_ref_id": 2,
        "user_type_ref_id": 2,
        "user_ref_id": 10928,
        "user_type_code": "RETAILER",
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    # Mock count query
    count_row = (1, 1000.0, 20.0, 3.6, 1020.0, 980.0, 1)
    mock_count_res = MagicMock()
    mock_count_res.fetchone.return_value = count_row

    # Mock data query
    data_row = MagicMock()
    data_row._mapping = {
        "payin_transactions_ref_id": 1,
        "tid": "BPAY201126105974253",
        "merchant_ref_id": "ORD-001",
        "provider_ref_id": "BME-999",
        "company_ref_id": 2,
        "company_name": "SMSPAY",
        "company_code": "SMSPAY",
        "user_type_ref_id": 2,
        "user_ref_id": 10928,
        "user_type_name": "Retailer",
        "user_type_code": "RETAILER",
        "retailer_ref_id": 10928,
        "retailer_code": "RT10928",
        "retailer_name": "Sathus Retailer",
        "payin_vendor_ref_id": 1,
        "vendor_code": "BANKME",
        "vendor_name": "BankMe Gateway",
        "pay_mode_ref_id": 1,
        "payment_mode": "UPI",
        "payment_mode_name": "UPI",
        "card_network": "UPI",
        "cust_name": "Customer A",
        "cust_mobile": "9876543210",
        "txn_amount": 1000.0,
        "total_charges": 20.0,
        "customer_payable": 1020.0,
        "retailer_credit": 980.0,
        "txn_status": "SUCCESS",
        "created_at": datetime.now(timezone.utc),
    }
    mock_data_res = MagicMock()
    mock_data_res.fetchall.return_value = [data_row]

    mock_db.execute.side_effect = [mock_count_res, mock_data_res]

    result = await get_payin_report_grid(request=req, db=mock_db)

    assert result["success"] is True
    assert len(result["data"]["items"]) == 1
    item = result["data"]["items"][0]
    assert item["company_ref_id"] == 2
    assert item["user_type_ref_id"] == 2
    assert item["user_ref_id"] == 10928
    assert item["user_type_name"] == "Retailer"
    assert item["user_type_code"] == "RETAILER"


@pytest.mark.asyncio
@patch("app.presentation.api.v1.payin_report_router.resolve_payin_auth_context", new_callable=AsyncMock)
async def test_payin_cross_company_access_blocked(mock_auth):
    """Verify cross-company access to PayIn transaction details is strictly blocked (fail closed)."""
    mock_auth.return_value = {
        "company_ref_id": 2,  # Authenticated for SMSPay
        "user_type_ref_id": 2,
        "user_ref_id": 10928,
        "user_type_code": "RETAILER",
        "retailer_ref_id": 10928,
        "is_admin": False,
        "is_super_admin": False,
    }
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    # Mock transaction belonging to company_ref_id = 1 (Near4You)
    diff_company_row = MagicMock()
    diff_company_row._mapping = {
        "payin_transactions_ref_id": 2,
        "tid": "BPAY_DIFF_COMPANY",
        "company_ref_id": 1,  # Different company!
        "user_type_ref_id": 2,
        "user_ref_id": 10928,
        "retailer_ref_id": 10928,
        "txn_status": "SUCCESS"
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = diff_company_row
    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc_info:
        await get_payin_transaction_details(tid="BPAY_DIFF_COMPANY", request=req, db=mock_db)
    
    assert exc_info.value.status_code == 403
    assert "Cross-company access is prohibited" in exc_info.value.detail
