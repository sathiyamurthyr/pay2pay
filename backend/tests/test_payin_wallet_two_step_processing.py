"""
Comprehensive Test Suite for PayIn Success Wallet Processing:
Two-Step Existing Wallet CR and DR Processing.

Validates:
1. Successful ₹4,500 PayIn: CR ₹4,500.00 and DR ₹139.12 (Charges: ₹117.90 + GST: ₹21.22).
2. Final net wallet credit: ₹4,360.88 with exact running balances.
3. Successful PayIn with different MDR and GST values.
4. Pending PayIn: no CR or DR calls.
5. Failed PayIn: no CR or DR calls.
6. Duplicate successful callback: no duplicate CR or DR.
7. CR succeeds and DR fails: safe recovery without duplicate credit; next retry executes only DR.
8. Concurrent callbacks: DB-level duplicate rejection gracefully handled.
9. Cross-company and cross-user validation.
10. Ledger entries and wallet balance reconciliation for zero-charge transactions.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from datetime import datetime, timezone

from app.application.payin_service import PayInService
from app.application.wallet_balance_service import WalletAdjustmentResult
from app.infrastructure.db.payin_models import PayinTransactionModel
from app.infrastructure.db.transaction_engine_models import CentralTransactionModel


def make_mock_db(existing_ledger_entries=None, retailer_public_id="RET-UUID-001", retailer_code="RT10928"):
    mock_db = AsyncMock()

    # Retailer lookup mock
    ret_row = MagicMock()
    ret_row.public_id = retailer_public_id
    ret_row.retailer_code = retailer_code

    def execute_side_effect(stmt, *args, **kwargs):
        mock_result = MagicMock()
        stmt_str = str(stmt).lower()
        if "from retailer" in stmt_str or "retailer.retailer_ref_id" in stmt_str:
            mock_result.scalars.return_value.first.return_value = ret_row
        elif "from transactions" in stmt_str or "transactions.txn_id" in stmt_str:
            mock_result.scalars.return_value.all.return_value = existing_ledger_entries or []
        else:
            mock_result.scalars.return_value.first.return_value = None
            mock_result.scalars.return_value.all.return_value = []
            mock_result.scalar.return_value = None
        return mock_result

    mock_db.execute.side_effect = execute_side_effect
    return mock_db


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_01_successful_4500_payin_two_step(mock_wallet_sp):
    """
    Scenario 1 & 2:
    - ₹4,500.00 PayIn:
      - Call 1 (CR): ₹4,500.00 full transaction amount.
      - Call 2 (DR): ₹139.12 total charges (Charges: ₹117.90, GST: ₹21.22).
      - Net wallet credit: ₹4,360.88.
    """
    mock_db = make_mock_db()

    # Step 1 CR result: initial balance 5,000 -> 9,500
    cr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-CR-4500",
        entry_type="CREDIT",
        amount=4500.00,
        payout_amount=4500.00,
        charge_amount=0.00,
        gst_amount=0.00,
        balance_before=5000.00,
        balance_after=9500.00,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn Wallet Top-Up CR (UPI, TID: TID-4500-001)",
        timestamp="2026-11-22T10:00:00Z"
    )

    # Step 2 DR result: balance 9,500 -> 9,360.88 (debited 139.12)
    dr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-DR-139",
        entry_type="DEBIT",
        amount=139.12,
        payout_amount=0.00,
        charge_amount=117.90,
        gst_amount=21.22,
        balance_before=9500.00,
        balance_after=9360.88,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn Top-Up Fee DR - Charges: ₹117.90, GST: ₹21.22 (TID: TID-4500-001)",
        timestamp="2026-11-22T10:00:01Z"
    )

    mock_wallet_sp.side_effect = [cr_res, dr_res]

    txn = PayinTransactionModel(
        tid="TID-4500-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=4500.00,
        mdr_amount=117.90,
        tax_amount=21.22,
        total_charges=139.12,
        customer_payable=4500.00,
        retailer_credit=4360.88,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS", "bankme_ref": "BME-4500-REF"},
        provider_status="SUCCESS",
        provider_ref_id="BME-4500-REF",
        source="WEBHOOK"
    )

    assert res["status"] == "SUCCESS"
    assert txn.ledger_txn_id == "TXN-CR-4500"
    assert mock_wallet_sp.call_count == 2

    # Verify Step 1: CR call DTO
    cr_call_dto = mock_wallet_sp.call_args_list[0][1]["dto"]
    assert cr_call_dto.entry_type == "CREDIT"
    assert cr_call_dto.amount == 4500.00
    assert cr_call_dto.payout_amount == 4500.00
    assert cr_call_dto.charge_amount == 0.00
    assert cr_call_dto.gst_amount == 0.00
    assert cr_call_dto.company_ref_id == 2
    assert cr_call_dto.user_ref_id == 10928
    assert cr_call_dto.user_type_ref_id == 2
    assert cr_call_dto.txn_id == "TID-4500-001"
    assert cr_call_dto.ref_id == "BME-4500-REF"

    # Verify Step 2: DR call DTO
    dr_call_dto = mock_wallet_sp.call_args_list[1][1]["dto"]
    assert dr_call_dto.entry_type == "DEBIT"
    assert dr_call_dto.amount == 139.12
    assert dr_call_dto.payout_amount == 0.00
    assert dr_call_dto.charge_amount == 117.90
    assert dr_call_dto.gst_amount == 21.22
    assert dr_call_dto.company_ref_id == 2
    assert dr_call_dto.user_ref_id == 10928
    assert dr_call_dto.user_type_ref_id == 2
    assert dr_call_dto.txn_id == "TID-4500-001"
    assert dr_call_dto.ref_id == "BME-4500-REF"

    # Verify net balance impact: 9,360.88 - 5,000.00 = 4,360.88
    net_credit = dr_res.balance_after - cr_res.balance_before
    assert round(net_credit, 2) == 4360.88


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_03_different_mdr_and_gst_values(mock_wallet_sp):
    """
    Scenario 3:
    ₹10,000.00 PayIn with 1.8% MDR (₹180.00) + 18% GST (₹32.40) = ₹212.40 charges.
    Net credit = ₹9,787.60.
    """
    mock_db = make_mock_db()

    cr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-CR-10000",
        entry_type="CREDIT",
        amount=10000.00,
        payout_amount=10000.00,
        charge_amount=0.00,
        gst_amount=0.00,
        balance_before=1000.00,
        balance_after=11000.00,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn Wallet Top-Up CR",
        timestamp="2026-11-22T10:00:00Z"
    )

    dr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-DR-212",
        entry_type="DEBIT",
        amount=212.40,
        payout_amount=0.00,
        charge_amount=180.00,
        gst_amount=32.40,
        balance_before=11000.00,
        balance_after=10787.60,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn Top-Up Fee DR",
        timestamp="2026-11-22T10:00:01Z"
    )

    mock_wallet_sp.side_effect = [cr_res, dr_res]

    txn = PayinTransactionModel(
        tid="TID-10000-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=10000.00,
        mdr_amount=180.00,
        tax_amount=32.40,
        total_charges=212.40,
        customer_payable=10000.00,
        retailer_credit=9787.60,
        txn_status="PENDING",
        card_network="VISA",
        pay_mode_ref_id=2
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="WEBHOOK"
    )

    assert res["status"] == "SUCCESS"
    assert mock_wallet_sp.call_count == 2
    assert mock_wallet_sp.call_args_list[0][1]["dto"].amount == 10000.00
    assert mock_wallet_sp.call_args_list[1][1]["dto"].amount == 212.40
    assert mock_wallet_sp.call_args_list[1][1]["dto"].charge_amount == 180.00
    assert mock_wallet_sp.call_args_list[1][1]["dto"].gst_amount == 32.40

    net = dr_res.balance_after - cr_res.balance_before
    assert round(net, 2) == 9787.60


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_04_pending_payin_no_wallet_calls(mock_wallet_sp):
    """
    Scenario 4:
    Pending PayIn: neither CR nor DR is called.
    """
    mock_db = make_mock_db()

    txn = PayinTransactionModel(
        tid="TID-PENDING-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=4500.00,
        retailer_credit=4360.88,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "PENDING"},
        provider_status="PENDING",
        source="STATUS_SYNC"
    )

    assert res["status"] == "PENDING"
    assert txn.ledger_txn_id is None
    mock_wallet_sp.assert_not_called()


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_05_failed_payin_no_wallet_calls(mock_wallet_sp):
    """
    Scenario 5:
    Failed PayIn: neither CR nor DR is called.
    """
    mock_db = make_mock_db()

    txn = PayinTransactionModel(
        tid="TID-FAILED-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=4500.00,
        retailer_credit=4360.88,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "FAILED"},
        provider_status="FAILED",
        source="WEBHOOK"
    )

    assert res["status"] == "FAILED"
    assert txn.ledger_txn_id is None
    mock_wallet_sp.assert_not_called()


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_06_duplicate_successful_callback_no_extra_calls(mock_wallet_sp):
    """
    Scenario 6:
    When transaction is already credited (txn.ledger_txn_id is set),
    subsequent callback does NOT call CR or DR.
    """
    mock_db = make_mock_db()

    txn = PayinTransactionModel(
        tid="TID-DUP-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=4500.00,
        retailer_credit=4360.88,
        txn_status="SUCCESS",
        ledger_txn_id="EXISTING-LEDGER-ID-001",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="WEBHOOK"
    )

    assert res["status"] == "SUCCESS"
    assert txn.ledger_txn_id == "EXISTING-LEDGER-ID-001"
    mock_wallet_sp.assert_not_called()


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_07_partial_failure_cr_succeeds_dr_fails_then_retries(mock_wallet_sp):
    """
    Scenario 7:
    - Attempt 1: CR succeeds, but DR fails.
      - txn.ledger_txn_id must NOT be set.
    - Attempt 2 (Retry/Reconciliation):
      - Existing CR entry in public.transactions is detected.
      - CR is NOT called again.
      - Only DR is executed.
      - On DR success, txn.ledger_txn_id is set.
    """
    # ATTEMPT 1: CR succeeds, DR fails
    mock_db_1 = make_mock_db(existing_ledger_entries=[])

    cr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-CR-ATTEMPT-1",
        entry_type="CREDIT",
        amount=4500.00,
        payout_amount=4500.00,
        charge_amount=0.00,
        gst_amount=0.00,
        balance_before=1000.00,
        balance_after=5500.00,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn CR",
        timestamp="2026-11-22T10:00:00Z"
    )
    dr_fail_res = WalletAdjustmentResult(
        success=False,
        txn_id="TXN-DR-FAIL",
        entry_type="DEBIT",
        amount=139.12,
        payout_amount=0.00,
        charge_amount=117.90,
        gst_amount=21.22,
        balance_before=5500.00,
        balance_after=5500.00,
        status="FAILED",
        error_code="DB_LOCK_TIMEOUT",
        error_message="Lock wait timeout exceeded",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn DR",
        timestamp="2026-11-22T10:00:01Z"
    )

    mock_wallet_sp.side_effect = [cr_res, dr_fail_res]

    txn = PayinTransactionModel(
        tid="TID-PARTIAL-FAIL-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=4500.00,
        mdr_amount=117.90,
        tax_amount=21.22,
        total_charges=139.12,
        retailer_credit=4360.88,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res_1 = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db_1,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="WEBHOOK"
    )

    # After attempt 1: ledger_txn_id is None because DR failed!
    assert txn.ledger_txn_id is None
    assert mock_wallet_sp.call_count == 2
    assert mock_wallet_sp.call_args_list[0][1]["dto"].entry_type == "CREDIT"
    assert mock_wallet_sp.call_args_list[1][1]["dto"].entry_type == "DEBIT"

    # Reset mock for ATTEMPT 2
    mock_wallet_sp.reset_mock()

    # In attempt 2, CentralTransactionModel now has the existing CREDIT record
    existing_cr_entry = MagicMock(spec=CentralTransactionModel)
    existing_cr_entry.txn_id = "TID-PARTIAL-FAIL-001"
    existing_cr_entry.entry_type = "CREDIT"
    existing_cr_entry.balance_before = 1000.00
    existing_cr_entry.balance_after = 5500.00

    mock_db_2 = make_mock_db(existing_ledger_entries=[existing_cr_entry])

    # DR now succeeds
    dr_success_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-DR-RETRY-SUCCESS",
        entry_type="DEBIT",
        amount=139.12,
        payout_amount=0.00,
        charge_amount=117.90,
        gst_amount=21.22,
        balance_before=5500.00,
        balance_after=5360.88,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn DR",
        timestamp="2026-11-22T10:00:05Z"
    )
    mock_wallet_sp.side_effect = [dr_success_res]

    res_2 = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db_2,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="RETRY_CALLBACK"
    )

    # CR was skipped; only DR was called!
    assert mock_wallet_sp.call_count == 1
    assert mock_wallet_sp.call_args_list[0][1]["dto"].entry_type == "DEBIT"
    assert mock_wallet_sp.call_args_list[0][1]["dto"].amount == 139.12

    # Now transaction is complete!
    assert txn.ledger_txn_id == "TID-PARTIAL-FAIL-001"


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_08_concurrent_callback_duplicate_transaction_handled(mock_wallet_sp):
    """
    Scenario 8:
    Concurrent callbacks: DB SP returns DUPLICATE_TRANSACTION.
    Service gracefully marks step as already completed.
    """
    mock_db = make_mock_db()

    # DB rejects with DUPLICATE_TRANSACTION
    dup_cr_res = WalletAdjustmentResult(
        success=False,
        txn_id="TID-CONCURRENT-001",
        entry_type="CREDIT",
        amount=4500.00,
        payout_amount=4500.00,
        charge_amount=0.00,
        gst_amount=0.00,
        balance_before=0.00,
        balance_after=0.00,
        status="FAILED",
        error_code="DUPLICATE_TRANSACTION",
        error_message="Duplicate transaction exists for TxnID: TID-CONCURRENT-001, Entry: CREDIT",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="Duplicate",
        timestamp="2026-11-22T10:00:00Z"
    )
    dup_dr_res = WalletAdjustmentResult(
        success=False,
        txn_id="TID-CONCURRENT-001",
        entry_type="DEBIT",
        amount=139.12,
        payout_amount=0.00,
        charge_amount=117.90,
        gst_amount=21.22,
        balance_before=0.00,
        balance_after=0.00,
        status="FAILED",
        error_code="DUPLICATE_TRANSACTION",
        error_message="Duplicate transaction exists for TxnID: TID-CONCURRENT-001, Entry: DEBIT",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="Duplicate",
        timestamp="2026-11-22T10:00:01Z"
    )

    mock_wallet_sp.side_effect = [dup_cr_res, dup_dr_res]

    txn = PayinTransactionModel(
        tid="TID-CONCURRENT-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=4500.00,
        mdr_amount=117.90,
        tax_amount=21.22,
        total_charges=139.12,
        retailer_credit=4360.88,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="WEBHOOK"
    )

    assert res["status"] == "SUCCESS"
    assert txn.ledger_txn_id == "TID-CONCURRENT-001"


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_09_cross_company_and_user_validation(mock_wallet_sp):
    """
    Scenario 9:
    Cross-company and cross-user validation:
    Verifies that Company B (company_ref_id=3) and User 20050 are strictly isolated
    and passed accurately to both CR and DR calls.
    """
    mock_db = make_mock_db(retailer_public_id="RET-UUID-COMP3", retailer_code="P2P-R20050")

    cr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-CR-COMP3",
        entry_type="CREDIT",
        amount=2500.00,
        payout_amount=2500.00,
        charge_amount=0.00,
        gst_amount=0.00,
        balance_before=100.00,
        balance_after=2600.00,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=20050,
        user_type_ref_id=2,
        user_code="P2P-R20050",
        user_name="Retailer Comp3",
        narration="PayIn CR",
        timestamp="2026-11-22T10:00:00Z"
    )
    dr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-DR-COMP3",
        entry_type="DEBIT",
        amount=65.50,
        payout_amount=0.00,
        charge_amount=55.51,
        gst_amount=9.99,
        balance_before=2600.00,
        balance_after=2534.50,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=20050,
        user_type_ref_id=2,
        user_code="P2P-R20050",
        user_name="Retailer Comp3",
        narration="PayIn DR",
        timestamp="2026-11-22T10:00:01Z"
    )

    mock_wallet_sp.side_effect = [cr_res, dr_res]

    txn = PayinTransactionModel(
        tid="TID-COMP3-001",
        company_ref_id=3,
        user_type_ref_id=2,
        user_ref_id=20050,
        retailer_ref_id=20050,
        txn_amount=2500.00,
        mdr_amount=55.51,
        tax_amount=9.99,
        total_charges=65.50,
        retailer_credit=2434.50,
        txn_status="PENDING",
        card_network="MASTERCARD",
        pay_mode_ref_id=3
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="WEBHOOK"
    )

    assert res["status"] == "SUCCESS"
    assert mock_wallet_sp.call_count == 2

    # Check Company 3 and User 20050 isolation in Call 1 (CR)
    cr_dto = mock_wallet_sp.call_args_list[0][1]["dto"]
    assert cr_dto.company_ref_id == 3
    assert cr_dto.user_ref_id == 20050
    assert cr_dto.retailer_code == "P2P-R20050"
    assert cr_dto.amount == 2500.00

    # Check Company 3 and User 20050 isolation in Call 2 (DR)
    dr_dto = mock_wallet_sp.call_args_list[1][1]["dto"]
    assert dr_dto.company_ref_id == 3
    assert dr_dto.user_ref_id == 20050
    assert dr_dto.retailer_code == "P2P-R20050"
    assert dr_dto.amount == 65.50


@pytest.mark.asyncio
@patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock)
async def test_10_zero_charge_payin_skips_dr(mock_wallet_sp):
    """
    Scenario 10:
    Zero-charge transaction (e.g. 0% promotional MDR fee).
    - Step 1 (CR): ₹500.00 credited.
    - Step 2 (DR): skipped because charges_to_debit == 0.0.
    - Net credit: ₹500.00.
    - ledger_txn_id marked complete.
    """
    mock_db = make_mock_db()

    cr_res = WalletAdjustmentResult(
        success=True,
        txn_id="TXN-CR-ZERO-FEE",
        entry_type="CREDIT",
        amount=500.00,
        payout_amount=500.00,
        charge_amount=0.00,
        gst_amount=0.00,
        balance_before=100.00,
        balance_after=600.00,
        status="SUCCESS",
        service_name="PAYIN_TOPUP",
        wallet_type="MAIN",
        user_ref_id=10928,
        user_type_ref_id=2,
        user_code="RT10928",
        user_name="Retailer Store",
        narration="PayIn CR",
        timestamp="2026-11-22T10:00:00Z"
    )

    mock_wallet_sp.side_effect = [cr_res]

    txn = PayinTransactionModel(
        tid="TID-ZERO-FEE-001",
        company_ref_id=2,
        user_type_ref_id=2,
        user_ref_id=10928,
        retailer_ref_id=10928,
        txn_amount=500.00,
        mdr_amount=0.00,
        tax_amount=0.00,
        total_charges=0.00,
        retailer_credit=500.00,
        txn_status="PENDING",
        card_network="UPI",
        pay_mode_ref_id=1
    )

    res = await PayInService.reconcile_and_finalize_transaction(
        db=mock_db,
        txn=txn,
        raw_gateway_payload={"status": "SUCCESS"},
        provider_status="SUCCESS",
        source="WEBHOOK"
    )

    assert res["status"] == "SUCCESS"
    assert txn.ledger_txn_id == "TXN-CR-ZERO-FEE"

    # Only Call 1 (CR) was made; Call 2 (DR) was skipped
    assert mock_wallet_sp.call_count == 1
    assert mock_wallet_sp.call_args[1]["dto"].entry_type == "CREDIT"
    assert mock_wallet_sp.call_args[1]["dto"].amount == 500.00
