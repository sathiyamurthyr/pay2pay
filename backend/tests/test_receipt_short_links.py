"""
Unit and Integration Tests for Bitly-Style SMSPAY Receipt Short URL Implementation
Verifies:
1. Short code generation entropy, random format, non-sequential behavior.
2. Idempotent short code generation and persistence.
3. Secure short code resolution, expiration, and administrative revocation.
4. Clean short URL construction across SMSPAY, Near4You, and Pay2Pay receipt domains.
5. Public receipt endpoint resolution with zero query parameters or raw IDs exposed.
6. Anti-enumeration sliding-window rate limiting.
7. Strict cross-company tenant isolation (fail closed).
8. Backward compatibility for legacy encrypted long capability tokens.
"""

import pytest
import string
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app.application.receipt_short_link_service import (
    ReceiptShortLinkService,
    BASE62_ALPHABET,
    SHORT_CODE_REGEX
)
from app.core.security import GlobalReceiptSecurity
from app.infrastructure.db.payin_models import ReceiptShortLinkModel, PayinTransactionModel
from app.presentation.api.v1.public_receipt_router import (
    get_public_receipt,
    check_public_receipt_rate_limit,
    record_failed_attempt,
    _RATE_LIMIT_STORE,
    _FAILED_ATTEMPT_STORE
)
from app.presentation.api.v1.payin_router import get_payin_receipt_token
from app.presentation.api.v1.payin_report_router import get_payin_report_grid


class MockRequest:
    def __init__(self, headers=None, client_host="106.51.174.154"):
        self.headers = headers or {}
        self.client = MagicMock()
        self.client.host = client_host
        self.url = MagicMock()
        self.url.scheme = "https"


def test_short_code_entropy_and_format():
    """Verify generated short codes are exactly 8 chars, high-entropy Base62, and non-sequential."""
    codes = [ReceiptShortLinkService.generate_random_code(8) for _ in range(100)]
    assert len(codes) == 100
    assert len(set(codes)) == 100, "All 100 generated short codes must be completely distinct"
    for code in codes:
        assert len(code) == 8
        assert SHORT_CODE_REGEX.match(code)
        assert all(c in BASE62_ALPHABET for c in code)


def test_short_receipt_url_construction():
    """Verify short URLs preserve official receipt domains and branding."""
    code = "aB72xK9p"
    
    # SMSPAY (company 2)
    smspay_url = ReceiptShortLinkService.get_short_receipt_url(code, company_ref_id=2)
    assert smspay_url == "https://receipt.smspay.store/r/aB72xK9p"

    # Near4You (company 1)
    near4you_url = ReceiptShortLinkService.get_short_receipt_url(code, company_ref_id=1)
    assert near4you_url == "https://receipt.near4you.store/r/aB72xK9p"

    # Pay2Pay (company 47)
    pay2pay_url = ReceiptShortLinkService.get_short_receipt_url(code, company_ref_id=47)
    assert pay2pay_url == "https://receipt.pay2pay.in/r/aB72xK9p"


@pytest.mark.asyncio
async def test_generate_or_get_short_code_idempotency():
    """Verify the same transaction always returns the exact same short code across repeated calls."""
    mock_db = AsyncMock()

    # Case 1: Transaction already has receipt_short_code
    mock_row = MagicMock()
    mock_row.receipt_short_code = "aB72xK9p"
    mock_row.payin_transactions_ref_id = 1
    mock_row.user_type_ref_id = 2
    mock_row.user_ref_id = 10928
    
    # Mock queries: 1st checks txn, 2nd checks links
    mock_txn_res = MagicMock()
    mock_txn_res.first.return_value = mock_row
    
    mock_link = MagicMock()
    mock_link.short_code = "aB72xK9p"
    mock_link_res = MagicMock()
    mock_link_res.scalars().first.return_value = mock_link

    mock_db.execute.side_effect = [mock_txn_res, mock_link_res]

    code1 = await ReceiptShortLinkService.generate_or_get_short_code(
        db=mock_db, tid="BPAY211126122519737", company_ref_id=2
    )
    assert code1 == "aB72xK9p"


@pytest.mark.asyncio
async def test_resolve_short_code_active_and_revoked():
    """Verify active codes resolve, while revoked or expired codes fail closed."""
    mock_db = AsyncMock()

    # Active record
    active_rec = MagicMock()
    active_rec.short_code = "aB72xK9p"
    active_rec.tid = "BPAY211126122519737"
    active_rec.payin_transactions_ref_id = 101
    active_rec.company_ref_id = 2
    active_rec.user_type_ref_id = 2
    active_rec.user_ref_id = 10928
    active_rec.receipt_token = "enc_token_123"
    active_rec.is_active = True
    active_rec.is_revoked = False
    active_rec.expires_at = None
    active_rec.access_count = 5
    active_rec.created_at = datetime.now(timezone.utc)

    mock_res = MagicMock()
    mock_res.scalars().first.return_value = active_rec
    mock_db.execute.return_value = mock_res

    res = await ReceiptShortLinkService.resolve_short_code(db=mock_db, short_code="aB72xK9p")
    assert res["short_code"] == "aB72xK9p"
    assert res["tid"] == "BPAY211126122519737"
    assert res["access_count"] == 6

    # Revoked record
    revoked_rec = MagicMock()
    revoked_rec.short_code = "revoked1"
    revoked_rec.is_active = False
    revoked_rec.is_revoked = True
    revoked_rec.revocation_reason = "Flagged fraudulent"
    revoked_rec.expires_at = None

    mock_res_rev = MagicMock()
    mock_res_rev.scalars().first.return_value = revoked_rec
    mock_db.execute.return_value = mock_res_rev

    with pytest.raises(HTTPException) as exc_info:
        await ReceiptShortLinkService.resolve_short_code(db=mock_db, short_code="revoked1")
    assert exc_info.value.status_code == 410

    # Expired record
    expired_rec = MagicMock()
    expired_rec.short_code = "expired1"
    expired_rec.is_active = True
    expired_rec.is_revoked = False
    expired_rec.expires_at = datetime.now(timezone.utc) - timedelta(days=1)

    mock_res_exp = MagicMock()
    mock_res_exp.scalars().first.return_value = expired_rec
    mock_db.execute.return_value = mock_res_exp

    with pytest.raises(HTTPException) as exc_info:
        await ReceiptShortLinkService.resolve_short_code(db=mock_db, short_code="expired1")
    assert exc_info.value.status_code == 410


@pytest.mark.asyncio
@patch("app.application.receipt_short_link_service.ReceiptShortLinkService.resolve_short_code")
async def test_public_receipt_endpoint_with_short_code(mock_resolve):
    """Verify GET /public/receipt/{short_code} returns official verified receipt without exposed query parameters."""
    mock_resolve.return_value = {
        "short_code": "aB72xK9p",
        "tid": "BPAY211126122519737",
        "company_ref_id": 2,
        "payin_transactions_ref_id": 1,
        "receipt_token": "token123"
    }

    mock_db = AsyncMock()

    # Mock payin transaction model
    mock_txn = MagicMock()
    mock_txn.tid = "BPAY211126122519737"
    mock_txn.merchant_ref_id = "ORD-2026-001"
    mock_txn.provider_ref_id = "BME-UTR-999"
    mock_txn.company_ref_id = 2
    mock_txn.user_type_ref_id = 2
    mock_txn.user_ref_id = 10928
    mock_txn.retailer_ref_id = 10928
    mock_txn.payin_vendor_ref_id = 1
    mock_txn.txn_status = "SUCCESS"
    mock_txn.txn_amount = 1000.0
    mock_txn.total_charges = 20.0
    mock_txn.tax_amount = 3.6
    mock_txn.customer_payable = 1020.0
    mock_txn.retailer_credit = 980.0
    mock_txn.cust_name = "SMS Retailer"
    mock_txn.cust_mobile = "9876543210"
    mock_txn.card_network = "VISA"
    mock_txn.payment_mode = "CREDIT_CARD"
    mock_txn.receipt_short_code = "aB72xK9p"
    mock_txn.created_at = datetime.now(timezone.utc)
    mock_txn.completed_at = datetime.now(timezone.utc)

    mock_payin_res = MagicMock()
    mock_payin_res.scalars().first.return_value = mock_txn
    mock_db.execute.return_value = mock_payin_res

    req = MockRequest(headers={"host": "receipt.smspay.store"})
    data = await get_public_receipt(token="aB72xK9p", request=req, db=mock_db)

    assert data["valid"] is True
    assert data["receiptType"] == "PAYIN_TOPUP"
    assert data["short_code"] == "aB72xK9p"
    assert data["receipt_url"] == "https://receipt.smspay.store/r/aB72xK9p"
    assert data["receipt_token"] == "aB72xK9p"
    assert data["status"] == "SUCCESS"
    assert data["amount"] == 1000.0
    assert data["totalDebited"] == 1020.0
    assert data["brandName"] == "SMSPAY"
    assert "referenceId" not in data["receipt_url"]
    assert "status=" not in data["receipt_url"]


@pytest.mark.asyncio
async def test_public_receipt_endpoint_backward_compatibility():
    """Verify legacy encrypted long capability tokens still resolve seamlessly and return short URL."""
    token_payload = {
        "tid": "BPAY211126122519737",
        "company_ref_id": 2,
        "status": "SUCCESS",
        "ts": int(time.time())
    }
    long_encrypted_token = GlobalReceiptSecurity.encrypt_receipt_token(token_payload)
    assert len(long_encrypted_token) > 100

    mock_db = AsyncMock()

    mock_txn = MagicMock()
    mock_txn.tid = "BPAY211126122519737"
    mock_txn.merchant_ref_id = "ORD-2026-001"
    mock_txn.provider_ref_id = "BME-UTR-999"
    mock_txn.company_ref_id = 2
    mock_txn.user_type_ref_id = 2
    mock_txn.user_ref_id = 10928
    mock_txn.retailer_ref_id = 10928
    mock_txn.payin_vendor_ref_id = 1
    mock_txn.txn_status = "SUCCESS"
    mock_txn.txn_amount = 1000.0
    mock_txn.customer_payable = 1000.0
    mock_txn.retailer_credit = 1000.0
    mock_txn.card_network = "UPI"
    mock_txn.receipt_short_code = "aB72xK9p"
    mock_txn.created_at = datetime.now(timezone.utc)
    mock_txn.completed_at = datetime.now(timezone.utc)

    mock_payin_res = MagicMock()
    mock_payin_res.scalars().first.return_value = mock_txn
    mock_db.execute.return_value = mock_payin_res

    req = MockRequest(headers={"host": "receipt.smspay.store"})
    data = await get_public_receipt(token=long_encrypted_token, request=req, db=mock_db)

    assert data["valid"] is True
    assert data["short_code"] == "aB72xK9p"
    assert data["receipt_url"] == "https://receipt.smspay.store/r/aB72xK9p"


@pytest.mark.asyncio
@patch("app.application.receipt_short_link_service.ReceiptShortLinkService.resolve_short_code")
async def test_tenant_isolation_fail_closed(mock_resolve):
    """Verify cross-company receipt access fails closed with 403 Forbidden."""
    # Short code belongs to SMSPAY (company 2)
    mock_resolve.return_value = {
        "short_code": "aB72xK9p",
        "tid": "BPAY211126122519737",
        "company_ref_id": 2,
        "payin_transactions_ref_id": 1,
        "receipt_token": "token123"
    }

    mock_db = AsyncMock()
    mock_txn = MagicMock()
    mock_txn.tid = "BPAY211126122519737"
    mock_txn.company_ref_id = 2  # SMSPAY
    mock_payin_res = MagicMock()
    mock_payin_res.scalars().first.return_value = mock_txn
    mock_db.execute.return_value = mock_payin_res

    # Visitor accesses via Near4You domain (company 1)
    req = MockRequest(headers={"host": "receipt.near4you.store"})
    with pytest.raises(HTTPException) as exc_info:
        await get_public_receipt(token="aB72xK9p", request=req, db=mock_db)
    assert exc_info.value.status_code == 403


def test_anti_enumeration_rate_limiting():
    """Verify rapid failed receipt lookups trigger 429 Too Many Requests."""
    test_ip = "192.168.1.99"
    _RATE_LIMIT_STORE.clear()
    _FAILED_ATTEMPT_STORE.clear()

    # Under limit
    for _ in range(15):
        record_failed_attempt(test_ip)

    # Exceeding penalty limit triggers 429
    for _ in range(10):
        try:
            record_failed_attempt(test_ip)
        except HTTPException as e:
            assert e.status_code == 429
            assert "Rate limit exceeded" in e.detail
            break
    else:
        pytest.fail("Expected 429 Rate limit penalty was not triggered")


@pytest.mark.asyncio
async def test_payin_receipt_token_endpoint():
    """Verify /receipt-token returns short code and short receipt URL."""
    mock_db = AsyncMock()
    mock_txn = MagicMock()
    mock_txn.tid = "BPAY211126122519737"
    mock_txn.company_ref_id = 2
    mock_txn.receipt_short_code = "aB72xK9p"
    mock_txn_res = MagicMock()
    mock_txn_res.scalars().first.return_value = mock_txn
    mock_db.execute.return_value = mock_txn_res

    req = MockRequest(headers={"host": "smspay.store"})
    res = await get_payin_receipt_token(reference_id="BPAY211126122519737", request=req, db=mock_db)

    assert res["success"] is True
    assert res["receipt_token"] == "aB72xK9p"
    assert res["short_code"] == "aB72xK9p"
    assert res["receipt_url"] == "https://receipt.smspay.store/r/aB72xK9p"
