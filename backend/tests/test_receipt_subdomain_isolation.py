import pytest
from app.core.security import GlobalReceiptSecurity
from app.core.company_resolver import resolve_receipt_base_url


def test_global_receipt_security_encryption_roundtrip():
    payload = {
        "tid": "BPAY201126105974253",
        "company_ref_id": 2,
        "status": "SUCCESS",
        "orderId": "ORD987654321",
        "utr": "UTR1234567890",
        "ts": 1795173621
    }
    encrypted = GlobalReceiptSecurity.encrypt_receipt_token(payload)
    assert isinstance(encrypted, str)
    assert len(encrypted) > 20
    # URL safe characters check (no +, /, or = padding)
    assert "+" not in encrypted
    assert "/" not in encrypted
    assert "=" not in encrypted

    # Decrypt and verify payload
    decrypted = GlobalReceiptSecurity.decrypt_receipt_token(encrypted)
    assert decrypted is not None
    assert decrypted["tid"] == "BPAY201126105974253"
    assert decrypted["company_ref_id"] == 2
    assert decrypted["status"] == "SUCCESS"
    assert decrypted["orderId"] == "ORD987654321"
    assert decrypted["utr"] == "UTR1234567890"


def test_global_receipt_security_tamper_detection():
    payload = {"tid": "BPAY12345", "company_ref_id": 2}
    encrypted = GlobalReceiptSecurity.encrypt_receipt_token(payload)
    
    # Tamper with the token characters
    tampered = encrypted[:-2] + ("A" if encrypted[-2] != "A" else "B") + encrypted[-1]
    result = GlobalReceiptSecurity.decrypt_receipt_token(tampered)
    assert result is None

    # Invalid empty or non-string inputs fail closed
    assert GlobalReceiptSecurity.decrypt_receipt_token("") is None
    assert GlobalReceiptSecurity.decrypt_receipt_token(None) is None # type: ignore
    assert GlobalReceiptSecurity.decrypt_receipt_token("too_short") is None


def test_resolve_receipt_base_url_domains():
    # SMSPAY (company_ref_id: 2) -> https://receipt.smspay.store
    assert resolve_receipt_base_url(company_ref_id=2) == "https://receipt.smspay.store"

    # Near4You (company_ref_id: 1) -> https://receipt.near4you.store
    assert resolve_receipt_base_url(company_ref_id=1) == "https://receipt.near4you.store"

    # Pay2Pay (company_ref_id: 47) -> https://receipt.pay2pay.in
    assert resolve_receipt_base_url(company_ref_id=47) == "https://receipt.pay2pay.in"


def test_gateway_masking_customer_labels():
    from app.application.gateway_masking_service import GatewayMaskingService

    # Provider BANKME / ID 1 -> strictly "G-1"
    assert GatewayMaskingService.get_gateway_code(1) == "G-1"
    assert GatewayMaskingService.get_gateway_code("BANKME") == "G-1"
    assert GatewayMaskingService.get_masked_display_name("BANKME") == "Gateway G-1"

    # Provider EXISTING / ID 3 -> strictly "G-2"
    assert GatewayMaskingService.get_gateway_code(3) == "G-2"
    assert GatewayMaskingService.get_gateway_code("EXISTING") == "G-2"
    assert GatewayMaskingService.get_masked_display_name("EXISTING") == "Gateway G-2"
