import os
import json
import time
import uuid
import base64
import logging
from pathlib import Path
from typing import Callable, Optional, Tuple, Dict, Any, List

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

logger = logging.getLogger("api_payload_security")

# Constants
PROTOCOL_VERSION = "1.0"
DEFAULT_APP_ID = "SMSPAY"
DEFAULT_KEY_ID = "smspay-v1-prod"
REQUEST_INFO = b"sathus:crypto:request:v1"
RESPONSE_INFO = b"sathus:crypto:response:v1"

EXEMPT_PREFIXES = (
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/v1/security/public-key",
    "/api/v1/public-key",
    "/uploads",
    "/static",
    "/branding",
    "/favicon.ico",
)

# Secrets storage
SECRETS_DIR = Path(__file__).resolve().parent.parent.parent / ".secrets"
PRIVATE_KEY_PATH = SECRETS_DIR / "api_payload_rsa_private.pem"
PUBLIC_KEY_PATH = SECRETS_DIR / "api_payload_rsa_public.pem"

_SERVER_PRIVATE_KEY_PEM: Optional[str] = None
_SERVER_PUBLIC_KEY_PEM: Optional[str] = None


def init_or_load_rsa_keypair() -> Tuple[str, str]:
    """
    Loads the persistent RSA-2048 keypair or generates a fresh one if not present.
    """
    global _SERVER_PRIVATE_KEY_PEM, _SERVER_PUBLIC_KEY_PEM

    if _SERVER_PRIVATE_KEY_PEM and _SERVER_PUBLIC_KEY_PEM:
        return _SERVER_PRIVATE_KEY_PEM, _SERVER_PUBLIC_KEY_PEM

    SECRETS_DIR.mkdir(parents=True, exist_ok=True)

    if PRIVATE_KEY_PATH.exists() and PUBLIC_KEY_PATH.exists():
        try:
            priv = PRIVATE_KEY_PATH.read_text(encoding="utf-8").strip()
            pub = PUBLIC_KEY_PATH.read_text(encoding="utf-8").strip()
            if "BEGIN RSA PRIVATE KEY" in priv or "BEGIN PRIVATE KEY" in priv:
                _SERVER_PRIVATE_KEY_PEM = priv
                _SERVER_PUBLIC_KEY_PEM = pub
                return _SERVER_PRIVATE_KEY_PEM, _SERVER_PUBLIC_KEY_PEM
        except Exception as e:
            logger.warning(f"Could not load existing RSA keypair: {e}. Generating new keypair.")

    # Generate new RSA-2048 keypair
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode("utf-8")

    pub_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")

    try:
        PRIVATE_KEY_PATH.write_text(priv_pem, encoding="utf-8")
        PUBLIC_KEY_PATH.write_text(pub_pem, encoding="utf-8")
    except Exception as e:
        logger.warning(f"Could not write RSA keys to disk: {e}")

    _SERVER_PRIVATE_KEY_PEM = priv_pem
    _SERVER_PUBLIC_KEY_PEM = pub_pem
    return _SERVER_PRIVATE_KEY_PEM, _SERVER_PUBLIC_KEY_PEM


def resolve_app_id_from_request(request: Optional[Request] = None, explicit_app_id: Optional[str] = None) -> str:
    """
    Dynamically resolves the application identifier based on:
    1. Explicit valid app_id (NEAR4YOU, SMSPAY, PAY2PAY)
    2. x-sathus-app-id header
    3. Host / Origin / Referer domain inspection:
       - near4you.store, *.near4you.store -> NEAR4YOU
       - smspay.store, *.smspay.store -> SMSPAY
       - pay2pay.in, *.pay2pay.in -> PAY2PAY
    4. Fallback default: PAY2PAY
    """
    if explicit_app_id and str(explicit_app_id).strip().upper() in ("NEAR4YOU", "SMSPAY", "PAY2PAY"):
        return str(explicit_app_id).strip().upper()

    if request:
        hdr_app = request.headers.get("x-sathus-app-id")
        if hdr_app and str(hdr_app).strip().upper() in ("NEAR4YOU", "SMSPAY", "PAY2PAY"):
            return str(hdr_app).strip().upper()

        forwarded = (request.headers.get("x-forwarded-host") or "").lower()
        host = (request.headers.get("host") or "").lower()
        origin = (request.headers.get("origin") or "").lower()
        referer = (request.headers.get("referer") or "").lower()

        combined = f"{forwarded} {host} {origin} {referer}"
        if "near4you" in combined:
            return "NEAR4YOU"
        if "smspay" in combined:
            return "SMSPAY"
        if "pay2pay" in combined:
            return "PAY2PAY"

    return "PAY2PAY"


def get_server_public_key(request: Optional[Request] = None) -> Dict[str, str]:
    """
    Public key retrieval payload for frontend key negotiation with dynamic domain-scoped app_id.
    """
    app_id = resolve_app_id_from_request(request)
    key_id = f"{app_id.lower()}-v1-prod"
    _, pub_pem = init_or_load_rsa_keypair()
    return {
        "app_id": app_id,
        "key_id": key_id,
        "version": PROTOCOL_VERSION,
        "public_key_pem": pub_pem,
    }


def decrypt_rsa_oaep(private_key_pem: str, b64_encrypted_data: str) -> bytes:
    """
    Decrypts base64 RSA-OAEP ciphertext with private key PEM using SHA-256.
    """
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode("utf-8"),
        password=None
    )
    encrypted_bytes = base64.b64decode(b64_encrypted_data)
    return private_key.decrypt(
        encrypted_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )


def derive_session_keys(master_key: bytes, app_id: str) -> Tuple[bytes, bytes]:
    """
    Derives separate (request_key, response_key) from a master session key using HKDF-SHA256.
    """
    salt = app_id.encode("utf-8")
    hkdf_req = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=REQUEST_INFO,
    )
    request_key = hkdf_req.derive(master_key)

    hkdf_res = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=RESPONSE_INFO,
    )
    response_key = hkdf_res.derive(master_key)
    return request_key, response_key


def encrypt_aes_gcm(key: bytes, plaintext: bytes, aad: Optional[bytes] = None) -> Tuple[str, str, str]:
    """
    Encrypts plaintext using AES-256-GCM.
    Returns (base64_iv, base64_ciphertext_with_tag, base64_tag).
    """
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    combined = aesgcm.encrypt(iv, plaintext, aad)
    tag = combined[-16:]
    b64_iv = base64.b64encode(iv).decode("utf-8")
    b64_ciphertext = base64.b64encode(combined).decode("utf-8")
    b64_tag = base64.b64encode(tag).decode("utf-8")
    return b64_iv, b64_ciphertext, b64_tag


def decrypt_aes_gcm(
    key: bytes,
    b64_iv: str,
    b64_ciphertext: str,
    aad: Optional[bytes] = None,
    b64_tag: Optional[str] = None
) -> bytes:
    """
    Decrypts base64 AES-256-GCM ciphertext.
    """
    iv = base64.b64decode(b64_iv)
    ciphertext_bytes = base64.b64decode(b64_ciphertext)
    if b64_tag:
        tag_bytes = base64.b64decode(b64_tag)
        if not ciphertext_bytes.endswith(tag_bytes):
            ciphertext_bytes = ciphertext_bytes + tag_bytes
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext_bytes, aad)


class NonceStore:
    """In-memory replay attack prevention with timestamp window validation."""
    def __init__(self, tolerance_seconds: int = 300):
        self.tolerance = tolerance_seconds
        self._seen: Dict[str, float] = {}

    def validate_and_record(self, nonce: str, timestamp: int):
        now = time.time()
        if abs(now - timestamp) > self.tolerance:
            raise ValueError(f"Request timestamp expired or skewed beyond {self.tolerance}s.")
        self._cleanup(now)
        if nonce in self._seen:
            raise ValueError("Replay attack detected: nonce has already been used.")
        self._seen[nonce] = now

    def _cleanup(self, now: float):
        cutoff = now - self.tolerance
        expired = [n for n, ts in self._seen.items() if ts < cutoff]
        for n in expired:
            self._seen.pop(n, None)


class ApiPayloadSecurityMiddleware(BaseHTTPMiddleware):
    """
    Transparent API Payload Encryption & Decryption Middleware.
    - Decrypts encrypted incoming request payloads.
    - Encrypts outgoing response payloads into standardized envelopes.
    - Protects GET, POST, PUT, DELETE, PATCH routes transparently.
    - Leaves exempt paths and unencrypted callers unmodified for seamless backward compatibility.
    """

    def __init__(self, app, app_id: str = DEFAULT_APP_ID):
        super().__init__(app)
        self.app_id = app_id
        self.nonce_store = NonceStore(tolerance_seconds=300)
        # Pre-initialize RSA keypair
        init_or_load_rsa_keypair()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # 1. Exempt path check
        for exempt in EXEMPT_PREFIXES:
            if path == exempt or path.startswith(exempt + "/"):
                return await call_next(request)

        # 2. Inspect headers or request body for encryption negotiation
        encrypted_key_hdr = request.headers.get("x-sathus-encrypted-key")
        nonce_hdr = request.headers.get("x-sathus-nonce")
        timestamp_hdr = request.headers.get("x-sathus-timestamp")
        app_id_hdr = request.headers.get("x-sathus-app-id")
        encrypt_response_hdr = request.headers.get("x-sathus-encrypt-response")

        body_envelope = None
        has_body_method = request.method in ("POST", "PUT", "PATCH")

        if has_body_method:
            body_bytes = await request.body()
            if body_bytes:
                try:
                    body_json = json.loads(body_bytes.decode("utf-8"))
                    if isinstance(body_json, dict) and "ciphertext" in body_json and "iv" in body_json:
                        body_envelope = body_json
                except Exception:
                    pass

        is_encrypted_request = bool(encrypted_key_hdr or body_envelope or encrypt_response_hdr)

        # 3. If neither header nor envelope is present, passthrough cleanly
        if not is_encrypted_request:
            return await call_next(request)

        try:
            # 4. Resolve session keys
            encrypted_key_b64 = encrypted_key_hdr or (body_envelope.get("encrypted_key") if body_envelope else None)
            nonce = nonce_hdr or (body_envelope.get("nonce") if body_envelope else None) or uuid.uuid4().hex
            timestamp = int(timestamp_hdr) if timestamp_hdr else (body_envelope.get("timestamp") if body_envelope else int(time.time()))
            # Derive authoritative domain-scoped app_id
            inferred_app_id = resolve_app_id_from_request(request)
            app_id_candidate = app_id_hdr or (body_envelope.get("app_id") if body_envelope else None)
            if app_id_candidate and str(app_id_candidate).strip().upper() in ("NEAR4YOU", "SMSPAY", "PAY2PAY"):
                app_id = str(app_id_candidate).strip().upper()
            else:
                app_id = inferred_app_id

            if not encrypted_key_b64:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Missing encrypted_key in headers or body envelope"}
                )

            # Replay protection
            self.nonce_store.validate_and_record(nonce, timestamp)

            # Decrypt master key & derive session keys
            priv_pem, _ = init_or_load_rsa_keypair()
            master_key = decrypt_rsa_oaep(priv_pem, encrypted_key_b64)
            request_key, response_key = derive_session_keys(master_key, app_id)

            # 5. Decrypt body if present
            if body_envelope:
                version = body_envelope.get("version", PROTOCOL_VERSION)
                aad_str = f"{app_id}:{version}:{timestamp}:{nonce}"
                decrypted_bytes = decrypt_aes_gcm(
                    key=request_key,
                    b64_iv=body_envelope["iv"],
                    b64_ciphertext=body_envelope["ciphertext"],
                    aad=aad_str.encode("utf-8"),
                    b64_tag=body_envelope.get("tag")
                )
                request._body = decrypted_bytes

                async def receive():
                    return {"type": "http.request", "body": decrypted_bytes, "more_body": False}
                request._receive = receive

            # 6. Execute inner application route
            response = await call_next(request)

            # 7. Encrypt outgoing response
            return await self._encrypt_response(response, response_key, app_id)

        except Exception as exc:
            logger.error(f"[ApiPayloadSecurityMiddleware] Error processing encrypted request {path}: {exc}", exc_info=True)
            return JSONResponse(
                status_code=400,
                content={"detail": f"Decryption/Security validation error: {str(exc)}"}
            )

    async def _encrypt_response(self, response: Response, response_key: bytes, app_id: str) -> Response:
        """
        Encrypts the response body into an EncryptedResponseEnvelope.
        """
        # Skip empty responses (204 No Content, 304 Not Modified)
        if response.status_code in (204, 304):
            return response

        # Read full response body
        response_body = [chunk async for chunk in response.body_iterator]
        raw_body = b"".join(response_body)

        if not raw_body:
            return response

        # Generate response envelope parameters
        response_timestamp = int(time.time())
        response_nonce = uuid.uuid4().hex
        aad_str = f"{app_id}:{PROTOCOL_VERSION}:{response_timestamp}:{response_nonce}"
        aad_bytes = aad_str.encode("utf-8")

        b64_iv, b64_ciphertext, b64_tag = encrypt_aes_gcm(
            key=response_key,
            plaintext=raw_body,
            aad=aad_bytes
        )

        resp_envelope = {
            "version": PROTOCOL_VERSION,
            "app_id": app_id,
            "iv": b64_iv,
            "ciphertext": b64_ciphertext,
            "tag": b64_tag,
            "timestamp": response_timestamp,
            "nonce": response_nonce
        }

        encrypted_json = json.dumps(resp_envelope).encode("utf-8")

        # Copy existing response headers and adjust
        headers = dict(response.headers)
        headers["content-type"] = "application/json"
        headers["content-length"] = str(len(encrypted_json))
        headers["x-sathus-encrypted"] = "1"

        return Response(
            content=encrypted_json,
            status_code=response.status_code,
            headers=headers,
            media_type="application/json"
        )
