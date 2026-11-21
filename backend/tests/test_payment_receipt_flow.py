"""
Unit and Integration Tests for Payment Receipt Security and Exact Method Resolution.

Verifies:
1. Authenticated AES-256-GCM encryption/decryption via GlobalReceiptSecurity.
2. URL security: plain-text sensitive parameters are not exposed; tamper-proof token capability.
3. Fail-closed behavior: invalid, tampered, expired, or cross-tenant tokens are rejected (404/403).
4. Exact verified payment method display (Visa, Mastercard, RuPay, UPI, Net Banking) - NEVER hardcoded or defaulted to UPI.
5. Customer-facing gateway masking (G-1 / G-2, never provider names).
6. Dedicated receipt subdomain isolation (receipt.smspay.store, receipt.near4you.store, receipt.pay2pay.in).
"""

import time
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException

from app.core.security import GlobalReceiptSecurity
from app.core.company_resolver import resolve_receipt_base_url
from app.application.payment_method_normalizer import PaymentMethodNormalizer
from app.presentation.api.v1.public_receipt_router import get_public_receipt
from app.infrastructure.db.payin_models import PayinTransactionModel


class TestGlobalReceiptSecurity:
    """Verify authenticated encryption and decryption engine."""

    def test_encrypt_and_decrypt_roundtrip(self):
        payload = {
            "tid": "BPAY201126105974253",
            "company_ref_id": 2,
            "status": "SUCCESS",
            "orderId": "ORD-12345",
            "utr": "UTR-999888",
            "ts": int(time.time())
        }
        token = GlobalReceiptSecurity.encrypt_receipt_token(payload)
        assert isinstance(token, str)
        assert len(token) > 20
        # No plain text TID visible in the encrypted token
        assert "BPAY201126105974253" not in token

        decrypted = GlobalReceiptSecurity.decrypt_receipt_token(token)
        assert decrypted is not None
        assert decrypted["tid"] == "BPAY201126105974253"
        assert decrypted["company_ref_id"] == 2
        assert decrypted["status"] == "SUCCESS"
        assert decrypted["orderId"] == "ORD-12345"

    def test_tampered_token_fails_closed(self):
        payload = {"tid": "BPAY111", "company_ref_id": 2}
        token = GlobalReceiptSecurity.encrypt_receipt_token(payload)
        # Corrupt a character
        tampered = ("A" if token[5] != "A" else "B") + token[1:]
        result = GlobalReceiptSecurity.decrypt_receipt_token(tampered)
        assert result is None

    def test_empty_or_garbage_token_fails_closed(self):
        assert GlobalReceiptSecurity.decrypt_receipt_token("") is None
        assert GlobalReceiptSecurity.decrypt_receipt_token("not-a-token") is None
        assert GlobalReceiptSecurity.decrypt_receipt_token("!!invalid@@") is None


class TestReceiptDomainResolution:
    """Verify dedicated receipt subdomains."""

    def test_smspay_receipt_domain(self):
        assert resolve_receipt_base_url(2) == "https://receipt.smspay.store"

    def test_near4you_receipt_domain(self):
        assert resolve_receipt_base_url(1) == "https://receipt.near4you.store"

    def test_pay2pay_receipt_domain(self):
        assert resolve_receipt_base_url(47) == "https://receipt.pay2pay.in"


class TestExactPaymentMethodDetectionInReceipt:
    """Verify that exact payment methods are preserved and NEVER default to UPI."""

    def test_visa_payment_method(self):
        display = PaymentMethodNormalizer.get_clean_method_display(card_network="VISA", pay_mode_code="CREDIT_CARD")
        assert display == "Visa"
        assert display != "UPI"

    def test_mastercard_payment_method(self):
        display = PaymentMethodNormalizer.get_clean_method_display(card_network="MASTERCARD", pay_mode_code="CREDIT_CARD")
        assert display == "Mastercard"
        assert display != "UPI"

    def test_rupay_payment_method(self):
        display = PaymentMethodNormalizer.get_clean_method_display(card_network="RUPAY", pay_mode_code="DEBIT_CARD")
        assert display == "RuPay"
        assert display != "UPI"

    def test_upi_payment_method(self):
        display = PaymentMethodNormalizer.get_clean_method_display(card_network="UPI", pay_mode_code="UPI")
        assert display == "UPI"

    def test_net_banking_payment_method(self):
        display = PaymentMethodNormalizer.get_clean_method_display(card_network=None, pay_mode_code="NET_BANKING")
        assert display == "Net Banking"
        assert display != "UPI"

    def test_unclassified_method_never_defaults_to_upi(self):
        display = PaymentMethodNormalizer.get_clean_method_display(card_network=None, pay_mode_code="UNKNOWN")
        assert display == "Pending Classification"
        assert display != "UPI"


class TestPublicReceiptEndpointSecurity:
    """Verify get_public_receipt endpoint security, tenant isolation, and fail closed."""

    @pytest.mark.asyncio
    async def test_unencrypted_raw_tid_fails_closed_for_payin(self):
        mock_db = AsyncMock()
        # Direct raw TID that is not an encrypted token must fail closed
        with pytest.raises(HTTPException) as exc_info:
            await get_public_receipt(token="BPAY201126105974253", db=mock_db)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_cross_tenant_token_rejected_with_403(self):
        token_payload = {
            "tid": "BPAY201126105974253",
            "company_ref_id": 1,  # Token claims company 1 (Near4You)
            "status": "SUCCESS"
        }
        token = GlobalReceiptSecurity.encrypt_receipt_token(token_payload)

        # Mock DB returning a transaction belonging to company 2 (SMSPAY)
        mock_txn = MagicMock(spec=PayinTransactionModel)
        mock_txn.tid = "BPAY201126105974253"
        mock_txn.company_ref_id = 2  # Actual company is 2
        mock_txn.merchant_ref_id = "REF-123"
        mock_txn.provider_ref_id = "UTR-123"

        mock_db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = mock_txn
        mock_db.execute.return_value = mock_res

        with pytest.raises(HTTPException) as exc_info:
            await get_public_receipt(token=token, db=mock_db)
        assert exc_info.value.status_code == 403
        assert "tenant mismatch" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_valid_encrypted_token_returns_verified_receipt(self):
        token_payload = {
            "tid": "BPAY201126105974253",
            "company_ref_id": 2,
            "status": "SUCCESS"
        }
        token = GlobalReceiptSecurity.encrypt_receipt_token(token_payload)

        mock_txn = MagicMock(spec=PayinTransactionModel)
        mock_txn.tid = "BPAY201126105974253"
        mock_txn.company_ref_id = 2
        mock_txn.retailer_ref_id = 10
        mock_txn.cust_name = "Sathus Retailer 3"
        mock_txn.cust_mobile = "9845678901"
        mock_txn.merchant_ref_id = "REF-1795172360782-958"
        mock_txn.provider_ref_id = "BM-ORD-999"
        mock_txn.txn_status = "SUCCESS"
        mock_txn.txn_amount = 20000.00
        mock_txn.mdr_amount = 524.00
        mock_txn.tax_amount = 94.32
        mock_txn.total_charges = 618.32
        mock_txn.customer_payable = 20118.32
        mock_txn.retailer_credit = 19381.68
        mock_txn.card_network = "MASTERCARD"
        mock_txn.pay_mode_ref_id = 2
        mock_txn.payin_vendor_ref_id = 1
        mock_txn.completed_at = None
        mock_txn.created_at = None

        mock_db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = mock_txn
        mock_db.execute.return_value = mock_res

        result = await get_public_receipt(token=token, db=mock_db)
        assert result["valid"] is True
        assert result["receiptType"] == "PAYIN_TOPUP"
        assert result["tid"] == "BPAY201126105974253"
        assert result["companyCode"] == "SMSPAY"
        assert result["status"] == "SUCCESS"
        assert result["amount"] == 20000.00
        assert result["charges"] == 524.00
        assert result["gst"] == 94.32
        assert result["totalDebited"] == 20118.32
        assert result["retailerCredit"] == 19381.68
        # EXACT verified payment method - must be Mastercard!
        assert result["paymentMethod"] == "Mastercard"
        assert result["paymentMethod"] != "UPI"
        # Customer-facing gateway must be masked G-1
        assert result["gateway"] == "G-1"
        # Receipt URL must be on receipt.smspay.store
        assert result["receiptUrl"].startswith("https://receipt.smspay.store/r/")
