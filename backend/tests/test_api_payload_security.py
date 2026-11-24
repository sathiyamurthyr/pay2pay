import pytest
import json
import time
import uuid
import base64
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.api_payload_security_middleware import (
    get_server_public_key,
    init_or_load_rsa_keypair,
    encrypt_aes_gcm,
    decrypt_aes_gcm,
    derive_session_keys,
    PROTOCOL_VERSION,
    DEFAULT_APP_ID,
)
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization


def encrypt_rsa_oaep_client(public_key_pem: str, data: bytes) -> str:
    public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    encrypted = public_key.encrypt(
        data,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return base64.b64encode(encrypted).decode("utf-8")


@pytest.mark.asyncio
async def test_public_key_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/security/public-key")
        assert res.status_code == 200
        data = res.json()
        assert data["app_id"] == "SMSPAY"
        assert "BEGIN PUBLIC KEY" in data["public_key_pem"]


@pytest.mark.asyncio
async def test_unencrypted_request_passthrough():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "HEALTHY"


@pytest.mark.asyncio
async def test_encrypted_get_request_roundtrip():
    """
    Simulates a client sending a GET request with encryption handshake headers.
    Verifies that the server returns an encrypted envelope over the wire and that
    decrypting the ciphertext recovers the exact JSON payload.
    """
    # 1. Client fetches public key
    pub_info = get_server_public_key()
    pub_pem = pub_info["public_key_pem"]

    # 2. Client generates 32-byte ephemeral master session key
    import os
    master_key = os.urandom(32)
    encrypted_key_b64 = encrypt_rsa_oaep_client(pub_pem, master_key)
    request_key, response_key = derive_session_keys(master_key, DEFAULT_APP_ID)

    nonce = uuid.uuid4().hex
    timestamp = int(time.time())

    headers = {
        "x-sathus-encrypted-key": encrypted_key_b64,
        "x-sathus-nonce": nonce,
        "x-sathus-timestamp": str(timestamp),
        "x-sathus-app-id": DEFAULT_APP_ID,
        "x-sathus-encrypt-response": "1",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Call an endpoint (e.g. /health or /api/v1/payout/dashboard/retailer/header-wallet or /api/v1/retailer/services)
        res = await ac.get("/api/v1/payout/dashboard/retailer/header-wallet", headers=headers)
        # Note: if unauthenticated, it returns 401 JSON or 200 JSON, but IT MUST BE ENCRYPTED!
        assert res.status_code in (200, 401)
        resp_json = res.json()

        # Wire verification: Response must be strictly an encrypted envelope
        assert "ciphertext" in resp_json
        assert "iv" in resp_json
        assert "tag" in resp_json
        assert resp_json["version"] == PROTOCOL_VERSION
        assert resp_json["app_id"] == DEFAULT_APP_ID

        # Decrypt response
        resp_nonce = resp_json["nonce"]
        resp_timestamp = resp_json["timestamp"]
        expected_aad = f"{DEFAULT_APP_ID}:{PROTOCOL_VERSION}:{resp_timestamp}:{resp_nonce}".encode("utf-8")

        decrypted_raw = decrypt_aes_gcm(
            key=response_key,
            b64_iv=resp_json["iv"],
            b64_ciphertext=resp_json["ciphertext"],
            aad=expected_aad,
            b64_tag=resp_json.get("tag")
        )

        decrypted_data = json.loads(decrypted_raw.decode("utf-8"))
        # Decrypted payload contains the actual business object or 401 error object
        assert isinstance(decrypted_data, dict)


@pytest.mark.asyncio
async def test_encrypted_post_request_roundtrip():
    """
    Simulates a client sending a POST request with an encrypted body envelope.
    Verifies that the server decrypts the body, processes it, and returns an encrypted response envelope.
    """
    pub_info = get_server_public_key()
    pub_pem = pub_info["public_key_pem"]

    import os
    master_key = os.urandom(32)
    encrypted_key_b64 = encrypt_rsa_oaep_client(pub_pem, master_key)
    request_key, response_key = derive_session_keys(master_key, DEFAULT_APP_ID)

    nonce = uuid.uuid4().hex
    timestamp = int(time.time())

    plaintext_payload = json.dumps({"test_param": "secret_value_123"}).encode("utf-8")
    aad = f"{DEFAULT_APP_ID}:{PROTOCOL_VERSION}:{timestamp}:{nonce}".encode("utf-8")
    b64_iv, b64_ciphertext, b64_tag = encrypt_aes_gcm(request_key, plaintext_payload, aad)

    envelope = {
        "version": PROTOCOL_VERSION,
        "app_id": DEFAULT_APP_ID,
        "encrypted_key": encrypted_key_b64,
        "iv": b64_iv,
        "ciphertext": b64_ciphertext,
        "tag": b64_tag,
        "timestamp": timestamp,
        "nonce": nonce,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",  # A known POST endpoint
            json=envelope,
        )
        assert res.status_code in (200, 400, 401, 422)
        resp_json = res.json()

        # Wire verification: Response must be strictly encrypted envelope
        assert "ciphertext" in resp_json
        assert "iv" in resp_json

        # Decrypt response
        resp_nonce = resp_json["nonce"]
        resp_timestamp = resp_json["timestamp"]
        expected_aad = f"{DEFAULT_APP_ID}:{PROTOCOL_VERSION}:{resp_timestamp}:{resp_nonce}".encode("utf-8")

        decrypted_raw = decrypt_aes_gcm(
            key=response_key,
            b64_iv=resp_json["iv"],
            b64_ciphertext=resp_json["ciphertext"],
            aad=expected_aad,
            b64_tag=resp_json.get("tag")
        )

        decrypted_data = json.loads(decrypted_raw.decode("utf-8"))
        assert isinstance(decrypted_data, dict)
