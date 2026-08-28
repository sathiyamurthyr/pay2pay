import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, or_, desc, text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.application.dependencies import get_current_token_payload
from app.infrastructure.db.models import AdminUserModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.db.session_security_models import (
    SessionAuditLogModel, RetailerSecuritySettingsModel, UserSecuritySettingsModel
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Security & Screen Lock Authentication"])

SETTINGS_STORE: Dict[str, Dict[str, Any]] = {}
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------

class UnlockPinRequest(BaseModel):
    pin: Optional[str] = None
    mpin: Optional[str] = None
    retailer_id: Optional[str] = None
    tenant_id: Optional[str] = None
    device_info: Optional[str] = None
    browser: Optional[str] = None
    os_name: Optional[str] = None
    ip_address: Optional[str] = None

class PinSetupRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=4, description="Exactly 4-digit security PIN")
    confirm_pin: str = Field(..., min_length=4, max_length=4, description="Confirm 4-digit security PIN")

class SecuritySettingsUpdateRequest(BaseModel):
    retailer_id: Optional[str] = None
    tenant_id: Optional[str] = None
    theme_mode: Optional[str] = Field("AUTO", description="AUTO | LIGHT | DARK")
    timezone: Optional[str] = Field("Asia/Kolkata", description="Configured Retailer Timezone")
    auto_lock_enabled: bool = True
    idle_timeout_minutes: int = Field(1, ge=0, le=60)
    warning_seconds: int = Field(30, ge=10, le=60)
    lock_on_minimize: bool = True
    lock_on_sleep: bool = True
    biometric_enabled: Optional[bool] = None


class SessionAuditRequest(BaseModel):
    retailer_id: Optional[str] = None
    tenant_id: Optional[str] = None
    event_type: str = Field(..., description="SESSION_LOCKED | TIMEOUT_WARNING | UNLOCK_SUCCESS | UNLOCK_FAILED | LOGOUT")
    device_info: Optional[str] = None
    browser: Optional[str] = None
    os_name: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# Helper function to resolve user security settings
async def get_or_create_user_security_settings(
    db: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID = DEFAULT_TENANT_ID,
    company_id: Optional[uuid.UUID] = None,
    portal: str = "RETAILER"
) -> UserSecuritySettingsModel:
    stmt = select(UserSecuritySettingsModel).where(
        and_(
            UserSecuritySettingsModel.user_id == user_id,
            UserSecuritySettingsModel.portal == portal
        )
    )
    sec = (await db.execute(stmt)).scalars().first()

    if not sec:
        sec = UserSecuritySettingsModel(
            public_id=uuid.uuid4(),
            user_id=user_id,
            tenant_id=tenant_id,
            company_id=company_id,
            portal=portal,
            security_pin_hash=None,
            pin_enabled=False,
            failed_attempt_count=0
        )
        db.add(sec)
        await db.commit()
        await db.refresh(sec)

    return sec


import hmac
import hashlib

MPIN_SECRET_SALT = "PAY2PAY_ENTERPRISE_MPIN_SALT_KEY_v1_2026"

def _hash_mpin(pin: str, customer_id_str: str) -> str:
    salt = f"{MPIN_SECRET_SALT}:{customer_id_str}".encode("utf-8")
    return hmac.new(salt, pin.encode("utf-8"), hashlib.sha256).hexdigest()

# ------------------------------------------------------------------------------
# UNLOCK API ENDPOINTS (Database-Backed Hash Verification)
# ------------------------------------------------------------------------------

@router.post("/auth/security/unlock", summary="Authenticate 4-Digit Security PIN to Unlock Screen")
@router.post("/session/unlock", summary="Re-authenticate Security PIN (Alias)")
@router.post("/auth/verify-pin", summary="Verify Security PIN (Alias)")
@router.post("/auth/pin/verify", summary="Verify Security PIN (Alias)")
@router.post("/verify-pin", summary="Verify Security PIN (Alias)")
async def unlock_screen_session(
    req: UnlockPinRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    clean_pin = (req.mpin or req.pin or "").strip()
    if not clean_pin or len(clean_pin) != 4 or not clean_pin.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security PIN must be exactly 4 numeric digits."
        )

    # 1. Resolve exact authenticated user context from token payload
    user_sub = payload.get("sub")
    user_role = payload.get("role", "RETAILER")
    mobile = payload.get("mobile_number") or payload.get("mobile") or payload.get("phone")
    clean_mobile = "".join(filter(str.isdigit, str(mobile)))[-10:] if mobile else None

    uid: Optional[uuid.UUID] = None
    if user_sub and user_sub != "default":
        try:
            uid = uuid.UUID(str(user_sub))
        except Exception:
            uid = None

    # 2. Strict User-Scoped Lookup in user_security_settings
    user_sec: Optional[UserSecuritySettingsModel] = None
    if uid:
        stmt_sec = select(UserSecuritySettingsModel).where(
            UserSecuritySettingsModel.user_id == uid,
            UserSecuritySettingsModel.portal == user_role
        )
        user_sec = (await db.execute(stmt_sec)).scalars().first()

    if not user_sec and clean_mobile:
        # Lookup user by mobile in auth_users to find exact user_id
        auth_stmt = select(AuthUserModel).where(AuthUserModel.mobile_number == clean_mobile)
        auth_user = (await db.execute(auth_stmt)).scalars().first()
        if auth_user and auth_user.user_id:
            uid = auth_user.user_id
            stmt_sec = select(UserSecuritySettingsModel).where(
                UserSecuritySettingsModel.user_id == uid
            )
            user_sec = (await db.execute(stmt_sec)).scalars().first()

    # Fallback to single active RETAILER security settings if user_id is generic
    if not user_sec:
        stmt_sec = select(UserSecuritySettingsModel).where(
            UserSecuritySettingsModel.portal == "RETAILER"
        ).order_by(desc(UserSecuritySettingsModel.created_date))
        user_sec = (await db.execute(stmt_sec)).scalars().first()

    # 3. If User Security Settings record exists with a PIN hash, verify strictly against THAT record
    if user_sec and user_sec.security_pin_hash:
        if verify_password(clean_pin, user_sec.security_pin_hash):
            user_sec.failed_attempt_count = 0
            user_sec.last_pin_verified_at = datetime.now(timezone.utc)
            await db.commit()
            return {
                "status": "UNLOCKED",
                "success": True,
                "unlocked": True,
                "message": "Session unlocked successfully.",
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
        else:
            user_sec.failed_attempt_count = (user_sec.failed_attempt_count or 0) + 1
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect Security PIN. Please enter your valid 4-digit PIN."
            )

    # 4. If no hash in user_security_settings, check specific customer record for this retailer's mobile
    if clean_mobile:
        mobile_variants = [clean_mobile, f"91{clean_mobile}", f"+91{clean_mobile}"]
        c_stmt = select(CustomerModel).where(CustomerModel.mobile_number.in_(mobile_variants))
        cust = (await db.execute(c_stmt)).scalars().first()
        if cust and cust.mpin_hash:
            if _hash_mpin(clean_pin, str(cust.public_id)) == cust.mpin_hash or verify_password(clean_pin, cust.mpin_hash):
                # Synchronize to user_security_settings so future unlocks are fast and Argon2-hashed
                effective_uid = uid or uuid.UUID("1072b5d2-0fd1-4323-a02a-03809d58b005")
                sec = await get_or_create_user_security_settings(db, effective_uid, DEFAULT_TENANT_ID, portal=user_role)
                sec.security_pin_hash = hash_password(clean_pin)
                sec.pin_enabled = True
                sec.failed_attempt_count = 0
                sec.last_pin_verified_at = datetime.now(timezone.utc)
                await db.commit()
                return {
                    "status": "UNLOCKED",
                    "success": True,
                    "unlocked": True,
                    "message": "Session unlocked successfully.",
                    "verified_at": datetime.now(timezone.utc).isoformat()
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect Security PIN. Please enter your valid 4-digit PIN."
                )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Incorrect Security PIN. Please enter your valid 4-digit PIN."
    )


# ------------------------------------------------------------------------------
# PIN SETUP & SECURITY MANAGEMENT ENDPOINTS
# ------------------------------------------------------------------------------

@router.post("/auth/security/pin/setup", summary="Setup or Update Security PIN")
async def setup_security_pin(
    req: PinSetupRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    if not req.pin.isdigit() or len(req.pin) != 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN must be exactly 4 numeric digits.")
    if req.pin != req.confirm_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN and Confirm PIN do not match.")

    user_sub = payload.get("sub", "00000000-0000-0000-0000-000000000000")
    try:
        user_id = uuid.UUID(str(user_sub))
    except Exception:
        user_id = uuid.UUID("1072b5d2-0fd1-4323-a02a-03809d58b005")

    tenant_id = uuid.UUID(payload.get("tenant_id", "00000000-0000-0000-0000-000000000001"))

    sec = await get_or_create_user_security_settings(db, user_id, tenant_id)
    sec.security_pin_hash = hash_password(req.pin)
    sec.pin_enabled = True
    sec.failed_attempt_count = 0
    sec.locked_until = None
    sec.last_pin_verified_at = datetime.now(timezone.utc)

    # Also sync customer record if mobile exists
    mobile = payload.get("mobile_number") or payload.get("mobile") or payload.get("phone")
    if mobile:
        clean_mobile = "".join(filter(str.isdigit, str(mobile)))[-10:]
        mobile_variants = [clean_mobile, f"91{clean_mobile}", f"+91{clean_mobile}"]
        c_stmt = select(CustomerModel).where(CustomerModel.mobile_number.in_(mobile_variants))
        cust = (await db.execute(c_stmt)).scalars().first()
        if cust:
            cust.mpin_hash = _hash_mpin(req.pin, str(cust.public_id))
            cust.mpin_enabled = True
            cust.mpin_last_changed_at = datetime.now(timezone.utc)

    await db.commit()
    return {"success": True, "message": "Security PIN configured successfully."}


@router.post("/session/audit", summary="Log Session Audit Event")
async def log_session_audit(
    req: SessionAuditRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    user_sub = payload.get("sub", "00000000-0000-0000-0000-000000000000")
    try:
        user_id = uuid.UUID(str(user_sub))
    except Exception:
        user_id = uuid.UUID("1072b5d2-0fd1-4323-a02a-03809d58b005")

    tenant_id = uuid.UUID(payload.get("tenant_id", "00000000-0000-0000-0000-000000000001"))

    audit = SessionAuditLogModel(
        public_id=uuid.uuid4(),
        retailer_id=user_id,
        tenant_id=tenant_id,
        event_type=req.event_type,
        device_info=req.device_info,
        browser=req.browser,
        os_name=req.os_name,
        ip_address=req.ip_address,
        details=req.details
    )
    db.add(audit)
    await db.commit()
    return {"success": True}


@router.get("/auth/security/settings", summary="Get User Security Settings")
async def get_user_security_settings(
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    user_sub = payload.get("sub", "00000000-0000-0000-0000-000000000000")
    try:
        user_id = uuid.UUID(str(user_sub))
    except Exception:
        user_id = uuid.UUID("1072b5d2-0fd1-4323-a02a-03809d58b005")

    tenant_id = uuid.UUID(payload.get("tenant_id", "00000000-0000-0000-0000-000000000001"))

    sec = await get_or_create_user_security_settings(db, user_id, tenant_id)
    return {
        "pin_enabled": bool(sec.pin_enabled and sec.security_pin_hash),
        "last_pin_verified_at": sec.last_pin_verified_at.isoformat() if sec.last_pin_verified_at else None,
        "failed_attempt_count": sec.failed_attempt_count or 0,
        "locked_until": sec.locked_until.isoformat() if sec.locked_until else None,
        "portal": sec.portal
    }
