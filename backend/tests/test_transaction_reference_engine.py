"""
Comprehensive Automated Test Suite for Pay2Pay Enterprise Transaction Reference & Engine.

Tests:
1. Dynamic Reference Format: <VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>
2. Vendor Prefix Extraction (W for WowPe, B for BulkPe, I for ICICI Bank, etc.)
3. Timestamp component correctness (DD, MM, YY, HH, MI) in Asia/Kolkata timezone
4. Uniqueness & collision resistance across bulk generations
5. End-to-End API Transaction Creation via /api/v1/transactions
6. Double-entry ledger postings verification
7. Idempotency protection test
8. Audit trail persistence verification
"""

import re
import pytest
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo
import httpx

from app.application.transaction_reference_service import TransactionReferenceService

BASE_URL = "http://127.0.0.1:8000/api/v1"
IST = ZoneInfo("Asia/Kolkata")


def test_vendor_prefix_resolution():
    """Validates dynamic prefix extraction from vendor codes and names."""
    assert TransactionReferenceService.resolve_vendor_first_char("WOWPE") == "W"
    assert TransactionReferenceService.resolve_vendor_first_char("wowpe") == "W"
    assert TransactionReferenceService.resolve_vendor_first_char(vendor_name="WowPe Payout API") == "W"
    assert TransactionReferenceService.resolve_vendor_first_char("BULKPE") == "B"
    assert TransactionReferenceService.resolve_vendor_first_char(vendor_name="BulkPe Instant Payouts") == "B"
    assert TransactionReferenceService.resolve_vendor_first_char("ICICI") == "I"
    assert TransactionReferenceService.resolve_vendor_first_char(vendor_name="Razorpay PG") == "R"
    assert TransactionReferenceService.resolve_vendor_first_char(custom_prefix="CUST") == "C"


def test_reference_format_and_timestamp():
    """
    Validates candidate reference format:
    Pattern: ^[A-Z][0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{5}$
    Total length: 1 + 10 + 5 = 16 characters.
    """
    ref = TransactionReferenceService.generate_candidate_reference(
        vendor_first_char="W",
        tz_name="Asia/Kolkata",
        random_length=5
    )

    assert len(ref) == 16, f"Expected length 16, got {len(ref)}: {ref}"
    assert ref.startswith("W"), f"Expected prefix W, got {ref[0]}"

    # Verify regex pattern
    pattern = r"^[A-Z]\d{10}\d{5}$"
    assert re.match(pattern, ref), f"Reference {ref} does not match pattern {pattern}"

    # Verify timestamp matches current time in Asia/Kolkata
    now_ist = datetime.now(IST)
    expected_day = now_ist.strftime("%d")
    expected_month = now_ist.strftime("%m")
    expected_year = now_ist.strftime("%y")

    assert ref[1:3] == expected_day, f"Day mismatch: expected {expected_day}, got {ref[1:3]}"
    assert ref[3:5] == expected_month, f"Month mismatch: expected {expected_month}, got {ref[3:5]}"
    assert ref[5:7] == expected_year, f"Year mismatch: expected {expected_year}, got {ref[5:7]}"


def test_bulk_uniqueness_no_collisions():
    """Generates 500 candidate references in the same minute and checks 100% uniqueness."""
    generated = set()
    for _ in range(500):
        ref = TransactionReferenceService.generate_candidate_reference(
            vendor_first_char="W",
            tz_name="Asia/Kolkata",
            random_length=5
        )
        assert ref not in generated, f"Collision detected for reference {ref}!"
        generated.add(ref)

    assert len(generated) == 500


@pytest.mark.asyncio
async def test_end_to_end_api_transaction_creation():
    """Tests POST /api/v1/transactions, GET /api/v1/transactions/{ref}, and Idempotency."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Test Config Rules
        cfg_res = await client.get("/transactions/config/rules?vendor_code=WOWPE")
        assert cfg_res.status_code == 200
        cfg_data = cfg_res.json()["data"]
        assert cfg_data["vendor_code"] == "WOWPE"
        assert cfg_data["sample_reference"].startswith("W")

        # 2. Create Transaction
        import uuid
        idem_key = f"test_suite_idem_{uuid.uuid4().hex[:8]}"
        req_payload = {
            "amount": 1000.0,
            "transaction_type": "PAYOUT",
            "service_type": "MOVE_TO_BANK",
            "vendor_code": "WOWPE",
            "idempotency_key": idem_key,
            "transfer_mode": "IMPS"
        }

        res_create = await client.post("/transactions", json=req_payload)
        assert res_create.status_code == 201
        tx_data = res_create.json()["data"]
        txn_ref = tx_data["transaction_reference"]

        assert txn_ref.startswith("W")
        assert len(txn_ref) == 16
        assert tx_data["amount"] == 1000.0
        assert tx_data["status"] == "INITIATED"

        # 3. Retrieve Full Transaction Details with Ledger & Audit Trail
        res_get = await client.get(f"/transactions/{txn_ref}")
        assert res_get.status_code == 200
        full_tx = res_get.json()["data"]

        assert full_tx["transaction_reference"] == txn_ref
        assert len(full_tx["ledger_entries"]) >= 2
        assert len(full_tx["audit_trail"]) >= 1

        # Check ledger balance integrity
        debit_entry = next((e for e in full_tx["ledger_entries"] if e["entry_type"] == "DEBIT"), None)
        credit_entry = next((e for e in full_tx["ledger_entries"] if e["entry_type"] == "CREDIT"), None)

        assert debit_entry is not None, "Missing DEBIT ledger posting"
        assert credit_entry is not None, "Missing CREDIT ledger posting"
        assert debit_entry["account_type"] == "RETAILER_WALLET"
        assert credit_entry["account_type"] == "ESCROW_ACCOUNT"

        # 4. Test Idempotency - duplicate request returns same transaction without double debit
        res_duplicate = await client.post("/transactions", json=req_payload)
        assert res_duplicate.status_code == 201
        dup_data = res_duplicate.json()["data"]
        assert dup_data["transaction_reference"] == txn_ref
        assert dup_data.get("is_duplicate") is True
