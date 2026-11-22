import os
import base64
import json
import pytest
from app.application.crypto_service import (
    AESGCMCipher,
    RetailerCryptoService,
    CryptoDecryptionError
)
from app.main import app
from app.application.dependencies import get_current_token_payload
from starlette.testclient import TestClient


def test_aes_gcm_cipher_roundtrip():
    key = os.urandom(32)
    plaintext = b"Confidential Retailer Record: Invoice amount 45000.50"
    aad = b"PAY2PAY:RET_902523:INVOICE:INV_8899"

    envelope = AESGCMCipher.encrypt(key, plaintext, aad)
    assert envelope["v"] == 1
    assert envelope["alg"] == "AES-256-GCM"
    assert "iv" in envelope
    assert "ciphertext" in envelope
    assert "tag" in envelope

    # Verify IV is 12 bytes and tag is 16 bytes
    iv_bytes = base64.b64decode(envelope["iv"])
    tag_bytes = base64.b64decode(envelope["tag"])
    assert len(iv_bytes) == 12
    assert len(tag_bytes) == 16

    # Decrypt
    decrypted = AESGCMCipher.decrypt(key, envelope, aad)
    assert decrypted == plaintext


def test_iv_is_unique_per_operation():
    key = os.urandom(32)
    plaintext = b"Static payload to encrypt multiple times"

    envelope1 = AESGCMCipher.encrypt(key, plaintext)
    envelope2 = AESGCMCipher.encrypt(key, plaintext)

    assert envelope1["iv"] != envelope2["iv"]
    assert envelope1["ciphertext"] != envelope2["ciphertext"]


def test_tampered_ciphertext_fails_closed():
    key = os.urandom(32)
    plaintext = b"Critical Settlement Instruction"
    aad = b"PAY2PAY:RET_1:SETTLEMENT:TX_1"

    envelope = AESGCMCipher.encrypt(key, plaintext, aad)

    # 1-bit tampering in ciphertext
    raw_ct = bytearray(base64.b64decode(envelope["ciphertext"]))
    raw_ct[0] ^= 0x01  # Flip one bit
    tampered_envelope = {**envelope, "ciphertext": base64.b64encode(raw_ct).decode("utf-8")}

    with pytest.raises(CryptoDecryptionError) as exc_info:
        AESGCMCipher.decrypt(key, tampered_envelope, aad)
    assert "integrity verification check failed" in str(exc_info.value)


def test_tampered_tag_fails_closed():
    key = os.urandom(32)
    plaintext = b"Critical Settlement Instruction"
    aad = b"PAY2PAY:RET_1:SETTLEMENT:TX_1"

    envelope = AESGCMCipher.encrypt(key, plaintext, aad)

    # 1-bit tampering in authentication tag
    raw_tag = bytearray(base64.b64decode(envelope["tag"]))
    raw_tag[-1] ^= 0x01  # Flip one bit
    tampered_envelope = {**envelope, "tag": base64.b64encode(raw_tag).decode("utf-8")}

    with pytest.raises(CryptoDecryptionError) as exc_info:
        AESGCMCipher.decrypt(key, tampered_envelope, aad)
    assert "integrity verification check failed" in str(exc_info.value)


def test_tampered_aad_fails_closed():
    key = os.urandom(32)
    plaintext = b"Private Retailer Order Note"
    aad1 = b"PAY2PAY:RET_1:ORDER_NOTE:ORD_1001"
    aad2 = b"PAY2PAY:RET_1:ORDER_NOTE:ORD_1002"  # Different resource ID

    envelope = AESGCMCipher.encrypt(key, plaintext, aad1)

    with pytest.raises(CryptoDecryptionError):
        AESGCMCipher.decrypt(key, envelope, aad2)


def test_empty_string_and_unicode_payloads():
    key = os.urandom(32)

    # Empty payload
    empty_env = AESGCMCipher.encrypt(key, b"", b"aad")
    assert AESGCMCipher.decrypt(key, empty_env, b"aad") == b""

    # Unicode & special characters (Hindi, Tamil, Currency symbols, Emojis)
    unicode_text = "₹45,000.50 — पेमेंट सक्सेसফুল! 🎉 வணிகர் குறிப்பு: ரகசிய விவரங்கள்"
    unicode_env = AESGCMCipher.encrypt(key, unicode_text.encode("utf-8"), b"aad")
    decrypted_unicode = AESGCMCipher.decrypt(key, unicode_env, b"aad").decode("utf-8")
    assert decrypted_unicode == unicode_text


def test_large_json_payload():
    key = os.urandom(32)
    large_data = {
        "transactions": [
            {
                "id": f"TXN_{i}",
                "amount": 1000.0 + i,
                "notes": f"Bulk ledger item {i} with customer phone +9198765{i:05d}",
                "payload": "A" * 200
            }
            for i in range(250)  # ~100 KB payload
        ]
    }
    raw_bytes = json.dumps(large_data).encode("utf-8")
    env = AESGCMCipher.encrypt(key, raw_bytes, b"large_test")
    dec_bytes = AESGCMCipher.decrypt(key, env, b"large_test")
    assert json.loads(dec_bytes.decode("utf-8")) == large_data


def test_retailer_crypto_service_hkdf_isolation():
    tenant_id = "tenant-001"
    ret_a = "retailer-alpha"
    ret_b = "retailer-beta"

    key_a = RetailerCryptoService.derive_retailer_key(tenant_id, ret_a)
    key_b = RetailerCryptoService.derive_retailer_key(tenant_id, ret_b)

    assert len(key_a) == 32
    assert len(key_b) == 32
    assert key_a != key_b, "Different retailers must receive distinct derived keys"


def test_retailer_crypto_service_cross_retailer_decryption_rejected():
    tenant_id = "tenant-001"
    data = {
        "customer_phone": "+91 9876543210",
        "settlement_amount": 45000.50,
        "private_notes": "Urgent delivery requested with discounted margin."
    }

    # Encrypt for retailer A
    enc_res = RetailerCryptoService.encrypt_data(
        tenant_id=tenant_id,
        retailer_id="retailer-A",
        resource_type="CUSTOMER_DATA",
        data=data,
        resource_id="CUST_8899"
    )

    # Decrypt as retailer A -> Succeeds
    dec_res_a = RetailerCryptoService.decrypt_data(
        tenant_id=tenant_id,
        retailer_id="retailer-A",
        resource_type="CUSTOMER_DATA",
        envelope=enc_res["encrypted_envelope"],
        resource_id="CUST_8899"
    )
    assert dec_res_a["success"] is True
    assert dec_res_a["decrypted_data"] == data

    # Attempt decrypt as retailer B -> Fails closed
    with pytest.raises(CryptoDecryptionError):
        RetailerCryptoService.decrypt_data(
            tenant_id=tenant_id,
            retailer_id="retailer-B",
            resource_type="CUSTOMER_DATA",
            envelope=enc_res["encrypted_envelope"],
            resource_id="CUST_8899"
        )


def test_api_endpoints_encrypt_and_decrypt():
    # Mock authenticated retailer token dependency
    mock_payload = {
        "sub": "99999999-9999-9999-9999-999999999999",
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "retailer_id": "99999999-9999-9999-9999-999999999999",
        "roles": ["RETAILER"],
    }
    app.dependency_overrides[get_current_token_payload] = lambda: mock_payload

    client = TestClient(app)
    try:
        sample_data = {
            "customer_phone": "+91 9876543210",
            "settlement_amount": 45000.50,
            "private_notes": "Urgent delivery requested with discounted margin."
        }

        # 1. Encrypt API Call
        enc_resp = client.post(
            "/api/v1/retailer/crypto/encrypt",
            json={
                "resource_type": "CUSTOMER_DATA",
                "resource_id": "ord_554433",
                "data": sample_data
            }
        )
        assert enc_resp.status_code == 200, enc_resp.text
        enc_body = enc_resp.json()
        assert enc_body["success"] is True
        assert enc_body["key_version"] == 1
        envelope = enc_body["encrypted_envelope"]
        assert envelope["v"] == 1
        assert envelope["alg"] == "AES-256-GCM"
        assert "iv" in envelope
        assert "ciphertext" in envelope
        assert "tag" in envelope

        # 2. Decrypt API Call
        dec_resp = client.post(
            "/api/v1/retailer/crypto/decrypt",
            json={
                "resource_type": "CUSTOMER_DATA",
                "resource_id": "ord_554433",
                "encrypted_envelope": envelope
            }
        )
        assert dec_resp.status_code == 200, dec_resp.text
        dec_body = dec_resp.json()
        assert dec_body["success"] is True
        assert dec_body["decrypted_data"] == sample_data

        # 3. Tampered Decrypt API Call -> Must fail closed with HTTP 400
        tampered_env = {**envelope, "tag": base64.b64encode(os.urandom(16)).decode("utf-8")}
        tampered_resp = client.post(
            "/api/v1/retailer/crypto/decrypt",
            json={
                "resource_type": "CUSTOMER_DATA",
                "resource_id": "ord_554433",
                "encrypted_envelope": tampered_env
            }
        )
        assert tampered_resp.status_code == 400
        tampered_body = tampered_resp.json()
        assert tampered_body["success"] is False
        assert "integrity verification check failed" in tampered_body["detail"]

    finally:
        app.dependency_overrides.pop(get_current_token_payload, None)
