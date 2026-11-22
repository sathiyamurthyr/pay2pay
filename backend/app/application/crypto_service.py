import os
import json
import base64
import logging
import hashlib
from typing import Optional, Dict, Any, Union
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag

from app.core.config import settings

logger = logging.getLogger("retailer_crypto_service")


class CryptoDecryptionError(Exception):
    """Raised when envelope decryption fails or integrity check fails."""
    pass


class AESGCMCipher:
    """
    Enterprise AES-256-GCM Authenticated Encryption with Associated Data (AEAD) Cipher.
    Guarantees both confidentiality and authenticity of sensitive data.
    """

    KEY_SIZE_BYTES = 32  # 256 bits
    IV_SIZE_BYTES = 12   # 96 bits (NIST SP 800-38D recommended for GCM)
    TAG_SIZE_BYTES = 16  # 128 bits

    @classmethod
    def encrypt(
        cls,
        key: bytes,
        plaintext_bytes: bytes,
        aad: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Encrypts plaintext bytes using AES-256-GCM with a fresh random 12-byte IV.
        Returns the standardized JSON envelope.
        """
        if not key or len(key) != cls.KEY_SIZE_BYTES:
            raise ValueError(f"AES-256 key must be exactly {cls.KEY_SIZE_BYTES} bytes (256 bits).")

        # 96-bit CSPRNG IV - generated freshly per encryption, never reused
        iv = os.urandom(cls.IV_SIZE_BYTES)
        aesgcm = AESGCM(key)

        # AESGCM.encrypt produces ciphertext + 16-byte tag
        combined = aesgcm.encrypt(iv, plaintext_bytes, aad)
        ciphertext_bytes = combined[:-cls.TAG_SIZE_BYTES]
        tag_bytes = combined[-cls.TAG_SIZE_BYTES:]

        return {
            "v": 1,
            "alg": "AES-256-GCM",
            "iv": base64.b64encode(iv).decode("utf-8"),
            "ciphertext": base64.b64encode(ciphertext_bytes).decode("utf-8"),
            "tag": base64.b64encode(tag_bytes).decode("utf-8")
        }

    @classmethod
    def decrypt(
        cls,
        key: bytes,
        envelope: Dict[str, Any],
        aad: Optional[bytes] = None
    ) -> bytes:
        """
        Decrypts an AES-256-GCM envelope and verifies cryptographic integrity via tag and AAD.
        Fails closed on any corruption, tampering, or invalid AAD.
        """
        if not key or len(key) != cls.KEY_SIZE_BYTES:
            raise ValueError(f"AES-256 key must be exactly {cls.KEY_SIZE_BYTES} bytes (256 bits).")

        if not isinstance(envelope, dict):
            raise CryptoDecryptionError("Invalid envelope: must be a JSON dictionary.")

        # Envelope schema validation
        version = envelope.get("v")
        alg = envelope.get("alg")
        iv_b64 = envelope.get("iv")
        ct_b64 = envelope.get("ciphertext")
        tag_b64 = envelope.get("tag")

        if version != 1:
            raise CryptoDecryptionError(f"Unsupported envelope version: {version}. Expected version 1.")
        if alg != "AES-256-GCM":
            raise CryptoDecryptionError(f"Unsupported algorithm: {alg}. Expected AES-256-GCM.")
        if not iv_b64 or not tag_b64:
            raise CryptoDecryptionError("Missing required envelope fields: 'iv' and 'tag' are required.")

        try:
            iv = base64.b64decode(iv_b64)
            if len(iv) != cls.IV_SIZE_BYTES:
                raise CryptoDecryptionError(f"Invalid IV length: expected {cls.IV_SIZE_BYTES} bytes, got {len(iv)}.")
            
            ciphertext = base64.b64decode(ct_b64 or "")
            tag = base64.b64decode(tag_b64)
            if len(tag) != cls.TAG_SIZE_BYTES:
                raise CryptoDecryptionError(f"Invalid authentication tag length: expected {cls.TAG_SIZE_BYTES} bytes, got {len(tag)}.")
            
            combined = ciphertext + tag
            aesgcm = AESGCM(key)
            decrypted = aesgcm.decrypt(iv, combined, aad)
            return decrypted
        except InvalidTag:
            # Constant-time comparison failed inside OpenSSL / cryptography AEAD
            raise CryptoDecryptionError("Decryption failed: integrity verification check failed (corrupted or tampered ciphertext).")
        except Exception as e:
            if isinstance(e, CryptoDecryptionError):
                raise
            raise CryptoDecryptionError(f"Decryption failed: {str(e)}")


class RetailerCryptoService:
    """
    Symmetric Envelope Encryption & Decryption Service for the Retailer App.
    Manages master key derivation, tenant/retailer key isolation with HKDF-SHA256,
    and AAD binding.
    """

    KEY_VERSION = 1

    @classmethod
    def _get_master_key(cls) -> bytes:
        """
        Loads the 256-bit master key from environment or derives securely from SECRET_KEY.
        Zero plaintext keys logged.
        """
        raw_key = getattr(settings, "RETAILER_MASTER_ENCRYPTION_KEY", None)
        if raw_key:
            clean = raw_key.strip()
            if len(clean) == 64:
                try:
                    return bytes.fromhex(clean)
                except ValueError:
                    pass
            try:
                decoded = base64.b64decode(clean)
                if len(decoded) == 32:
                    return decoded
            except Exception:
                pass
            return hashlib.sha256(clean.encode("utf-8")).digest()

        # Fallback deterministic derivation from SECRET_KEY
        fallback_secret = getattr(settings, "SECRET_KEY", "PAY2PAY_RETAILER_CRYPTO_FALLBACK_KEY_2026")
        return hashlib.sha256(f"{fallback_secret}:RETAILER_MASTER_ENCRYPTION_KEY_v1".encode("utf-8")).digest()

    @classmethod
    def derive_retailer_key(cls, tenant_id: str, retailer_id: str) -> bytes:
        """
        Derives a unique 256-bit symmetric encryption key per retailer/tenant using HKDF-SHA256.
        Ensures cryptographic isolation: a compromised key for one retailer cannot decrypt
        records of another.
        """
        master_key = cls._get_master_key()
        salt = str(tenant_id or "00000000-0000-0000-0000-000000000001").encode("utf-8")
        info = f"sathus:retailer:{retailer_id}:data_encryption_v{cls.KEY_VERSION}".encode("utf-8")

        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            info=info
        )
        return hkdf.derive(master_key)

    @classmethod
    def compute_aad(
        cls,
        tenant_id: str,
        retailer_id: str,
        resource_type: str,
        resource_id: Optional[str] = None
    ) -> bytes:
        """
        Computes Authenticated Additional Data (AAD) binding context.
        Prevents substitution / ciphertext reuse across different resource types or records.
        """
        clean_res_id = (resource_id or "").strip()
        aad_str = f"{tenant_id}:{retailer_id}:{resource_type.upper()}:{clean_res_id}"
        return aad_str.encode("utf-8")

    @classmethod
    def encrypt_data(
        cls,
        tenant_id: str,
        retailer_id: str,
        resource_type: str,
        data: Any,
        resource_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Encrypts arbitrary structured data (dict, list, string, number) for a retailer.
        Never logs plaintext payload.
        """
        key = cls.derive_retailer_key(tenant_id, retailer_id)
        aad = cls.compute_aad(tenant_id, retailer_id, resource_type, resource_id)

        if isinstance(data, (dict, list, int, float, bool)):
            plaintext_bytes = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        elif isinstance(data, str):
            plaintext_bytes = data.encode("utf-8")
        elif isinstance(data, bytes):
            plaintext_bytes = data
        else:
            plaintext_bytes = str(data).encode("utf-8")

        envelope = AESGCMCipher.encrypt(key, plaintext_bytes, aad)

        return {
            "success": True,
            "encrypted_envelope": envelope,
            "key_version": cls.KEY_VERSION,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    @classmethod
    def decrypt_data(
        cls,
        tenant_id: str,
        retailer_id: str,
        resource_type: str,
        envelope: Dict[str, Any],
        resource_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Decrypts an encrypted envelope for an authorized retailer session.
        Returns parsed JSON or string data.
        """
        key = cls.derive_retailer_key(tenant_id, retailer_id)
        aad = cls.compute_aad(tenant_id, retailer_id, resource_type, resource_id)

        decrypted_bytes = AESGCMCipher.decrypt(key, envelope, aad)
        decrypted_str = decrypted_bytes.decode("utf-8")

        try:
            parsed = json.loads(decrypted_str)
            return {
                "success": True,
                "decrypted_data": parsed
            }
        except (json.JSONDecodeError, ValueError):
            return {
                "success": True,
                "decrypted_data": decrypted_str
            }
