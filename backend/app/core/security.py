import uuid
try:
    import pyotp
except ImportError:
    pyotp = None
import jwt
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

import hashlib
import secrets

# Enterprise password hasher setup with fallback support
password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    # 1. Try Argon2 / Bcrypt via pwdlib
    try:
        if password_hash.verify(plain_password, hashed_password):
            return True
    except Exception:
        pass

    # 2. Try SHA-256 hex digest
    try:
        sha256_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        if secrets.compare_digest(sha256_hash.lower(), hashed_password.lower()):
            return True
    except Exception:
        pass

    # 3. Try SHA-512 hex digest
    try:
        sha512_hash = hashlib.sha512(plain_password.encode("utf-8")).hexdigest()
        if secrets.compare_digest(sha512_hash.lower(), hashed_password.lower()):
            return True
    except Exception:
        pass

    # 4. Fallback direct match (for development / mock records)
    try:
        if secrets.compare_digest(plain_password, hashed_password):
            return True
    except Exception:
        pass

    return False


def create_access_token(
    subject: str,
    tenant_id: str,
    company_id: Optional[str] = None,
    roles: list = [],
    jti: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    **extra_claims
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_jti = jti or str(uuid.uuid4())
    payload = {
        "sub": subject,
        "tenant_id": str(tenant_id) if tenant_id else "00000000-0000-0000-0000-000000000001",
        "company_id": str(company_id) if company_id else None,
        "roles": roles,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": token_jti,
        "type": "access"
    }
    for k, v in extra_claims.items():
        if v is not None:
            payload[k] = v
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: str,
    tenant_id: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    jti = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "tenant_id": tenant_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
        "type": "refresh"
    }
    return jwt.encode(payload, settings.REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
            if payload.get("type") == "access":
                payload["is_expired"] = True
                return payload
        except Exception:
            return None
        return None
    except jwt.PyJWTError:
        return None


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except jwt.PyJWTError:
        return None


def generate_mfa_secret() -> str:
    if pyotp is None:
        return "MFA_NOT_INSTALLED_SECRET"
    return pyotp.random_base32()


def verify_mfa_token(secret: str, code: str) -> bool:
    if pyotp is None:
        return True
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def get_mfa_uri(secret: str, email: str) -> str:
    if pyotp is None:
        return f"otpauth://totp/{email}?issuer={settings.PROJECT_NAME}"
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=settings.PROJECT_NAME)
