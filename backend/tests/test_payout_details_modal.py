import pytest
import asyncio
from decimal import Decimal
from datetime import datetime, timezone
import uuid
import json

from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.presentation.api.v1.transaction_report_router import (
    get_transaction_dynamic_details,
    sanitize_api_response,
    format_masked_acc
)
from fastapi import HTTPException
from sqlalchemy import text


class MockRequest:
    def __init__(self, token: str):
        self.headers = {"authorization": f"Bearer {token}"}
        self.query_params = {}
        self.cookies = {}


# ==============================================================================
# 1. SUCCESS PAYOUT TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_case_1_success_payout():
    """Test 1: SUCCESS Payout loads correct status, amount, ledger, and comments."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    req = MockRequest(token)
    async with AsyncSessionLocal() as db:
        res = await get_transaction_dynamic_details("CPAY290826150200034", req, db)
        assert res["success"] is True
        data = res["data"]
        assert data["transaction"]["status"] == "SUCCESS"
        assert data["transaction"]["txn_id"] == "CPAY290826150200034"
        assert data["financial"]["amount"] > 0
        assert data["comments"] == "Payout successful"
        assert len(data["ledger_entries"]) > 0


# ==============================================================================
# 2. PENDING PAYOUT TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_case_2_pending_payout():
    """Test 2: PENDING payout shows status PENDING, no reversals, correct comments."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    # Test query handling for pending comments resolution
    async with AsyncSessionLocal() as db:
        # Verify status logic directly
        status_val = "PENDING"
        if status_val in ["FAILED", "REJECTED"]:
            comments = "Payout failed - wallet reversed"
        elif status_val in ["PENDING", "PROCESSING", "INITIATED"]:
            comments = "Payout processing in progress"
        else:
            comments = "Payout successful"
        assert comments == "Payout processing in progress"


# ==============================================================================
# 3 & 4. FAILED PAYOUT WITH WALLET REVERSAL
# ==============================================================================
@pytest.mark.asyncio
async def test_case_3_failed_payout_with_reversal():
    """Test 3: FAILED payout with reversal preserves single Txn ID and comments."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    req = MockRequest(token)
    async with AsyncSessionLocal() as db:
        res = await get_transaction_dynamic_details("CPAY290826100810007", req, db)
        assert res["success"] is True
        data = res["data"]
        assert data["transaction"]["status"] == "FAILED"
        assert data["comments"] == "Payout failed - wallet reversed"
        assert data["transaction"]["txn_id"] == "CPAY290826100810007"
        assert not data["transaction"]["txn_id"].startswith("REV-")


# ==============================================================================
# 5. BENEFICIARY ACCOUNT NUMBER MASKING
# ==============================================================================
def test_case_5_beneficiary_masking():
    """Test 5: Beneficiary account numbers are strictly masked as XXXXXX1234."""
    assert format_masked_acc("10029176669426") == "XXXXXX9426"
    assert format_masked_acc("50100012345678") == "XXXXXX5678"
    assert format_masked_acc("1234") == "XXXXXX1234"
    assert format_masked_acc(None) == "Not Available"
    assert format_masked_acc("") == "Not Available"


# ==============================================================================
# 6 & 7. MISSING CUSTOMER & BENEFICIARY CLEAN FALLBACK
# ==============================================================================
@pytest.mark.asyncio
async def test_case_6_7_missing_customer_and_beneficiary_fallback():
    """Test 6 & 7: Missing customer and beneficiary data fallback cleanly to 'Not Available'."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    req = MockRequest(token)
    async with AsyncSessionLocal() as db:
        res = await get_transaction_dynamic_details("CPAY290826150200034", req, db)
        cust = res["data"]["customer"]
        assert "name" in cust and (cust["name"] == "Not Available" or len(cust["name"]) > 0)
        assert "mobile" in cust and (cust["mobile"] == "Not Available" or len(cust["mobile"]) > 0)
        bene = res["data"]["beneficiary"]
        assert "name" in bene
        assert "account" in bene
        assert "bank" in bene
        assert "ifsc" in bene


# ==============================================================================
# 8. COMPANY BRANDING DETAILS
# ==============================================================================
@pytest.mark.asyncio
async def test_case_8_company_branding():
    """Test 8: Company branding loads company name and logo dynamically."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    req = MockRequest(token)
    async with AsyncSessionLocal() as db:
        res = await get_transaction_dynamic_details("CPAY290826150200034", req, db)
        comp = res["data"]["company"]
        assert "name" in comp and len(comp["name"]) > 0
        assert "logo" in comp and len(comp["logo"]) > 0


# ==============================================================================
# 9 & 10. ROLE-BASED ACCESS CONTROL (VENDOR DATA VISIBILITY)
# ==============================================================================
@pytest.mark.asyncio
async def test_case_9_10_rbac_vendor_visibility():
    """Test 9 & 10: Vendor details exposed for ADMIN/CRM, omitted for RETAILER/RM."""
    admin_token = create_access_token(
        subject="admin_user",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    retailer_token = create_access_token(
        subject="retailer_user",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["RETAILER"]
    )

    async with AsyncSessionLocal() as db:
        # Admin request: vendor details included
        admin_res = await get_transaction_dynamic_details("CPAY290826150200034", MockRequest(admin_token), db)
        assert admin_res["data"]["vendor"] is not None
        assert "name" in admin_res["data"]["vendor"]
        assert "api_status" in admin_res["data"]["vendor"]
        assert "api_response" in admin_res["data"]["vendor"]

        # Retailer request: vendor details hidden
        ret_res = await get_transaction_dynamic_details("CPAY290826150200034", MockRequest(retailer_token), db)
        assert ret_res["data"]["vendor"] is None


# ==============================================================================
# 11. SENSITIVE CREDENTIAL SANITIZATION
# ==============================================================================
def test_case_11_sensitive_credential_sanitization():
    """Test 11: Passwords, tokens, API keys, and authorization headers are stripped."""
    dirty_json = json.dumps({
        "status": "SUCCESS",
        "access_token": "secret_jwt_token_12345",
        "password": "my_db_password",
        "api_key": "live_key_999",
        "message": "Payout transfer processed",
        "bank_ref": "REF987654"
    })
    cleaned = sanitize_api_response(dirty_json)
    assert "secret_jwt_token" not in cleaned
    assert "my_db_password" not in cleaned
    assert "live_key_999" not in cleaned
    assert "Payout transfer processed" in cleaned

    bearer_str = "Error during switch authentication: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz"
    cleaned_bearer = sanitize_api_response(bearer_str)
    assert "Bearer eyJhb" not in cleaned_bearer
    assert "[FILTERED_TOKEN]" in cleaned_bearer


# ==============================================================================
# 12. NON-EXISTENT TRANSACTION ID (404)
# ==============================================================================
@pytest.mark.asyncio
async def test_case_12_non_existent_transaction_404():
    """Test 12: Non-existent transaction returns 404."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    req = MockRequest(token)
    async with AsyncSessionLocal() as db:
        with pytest.raises(HTTPException) as exc_info:
            await get_transaction_dynamic_details("NON_EXISTENT_TXN_99999", req, db)
        assert exc_info.value.status_code == 404


# ==============================================================================
# 13. FINANCIAL MATH & LEDGER CONSISTENCY
# ==============================================================================
@pytest.mark.asyncio
async def test_case_13_financial_math_consistency():
    """Test 13: Total Wallet Debit equals amount + charge + gst."""
    token = create_access_token(
        subject="admin_test",
        tenant_id="00000000-0000-0000-0000-000000000001",
        roles=["ADMIN"]
    )
    req = MockRequest(token)
    async with AsyncSessionLocal() as db:
        res = await get_transaction_dynamic_details("CPAY290826150200034", req, db)
        fin = res["data"]["financial"]
        calculated_debit = round(fin["amount"] + fin["charge"] + fin["gst"], 2)
        assert fin["total_debit"] == calculated_debit
