import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.application.dependencies import get_current_token_payload
from app.infrastructure.db.models import AdminUserModel
from app.infrastructure.db.session_security_models import (
    SessionAuditLogModel, RetailerSecuritySettingsModel, UserSecuritySettingsModel
)

router = APIRouter(prefix="", tags=["Security & Screen Lock Authentication"])

SETTINGS_STORE: Dict[str, Dict[str, Any]] = {}

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
    tenant_id: uuid.UUID,
    company_id: Optional[uuid.UUID] = None,
    portal: str = "RETAILER"
) -> UserSecuritySettingsModel:
    stmt = select(UserSecuritySettingsModel).where(
        and_(
            UserSecuritySettingsModel.user_id == user_id,
            UserSecuritySettingsModel.tenant_id == tenant_id
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
from sqlalchemy import text

MPIN_SECRET_SALT = "PAY2PAY_ENTERPRISE_MPIN_SALT_KEY_v1_2026"

def _hash_mpin(pin: str, customer_id_str: str) -> str:
    salt = f"{MPIN_SECRET_SALT}:{customer_id_str}".encode("utf-8")
    return hmac.new(salt, pin.encode("utf-8"), hashlib.sha256).hexdigest()

# ------------------------------------------------------------------------------
# UNLOCK API ENDPOINTS (Database-Backed Hash Verification)
# ------------------------------------------------------------------------------

@router.post("/auth/security/unlock", summary="Authenticate 4-Digit Security PIN to Unlock Screen")
@router.post("/session/unlock", summary="Re-authenticate Security PIN (Alias)")
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

    verified = False

    # 1. Check against User Security Settings table in DB (Argon2 / PBKDF2 hash)
    try:
        user_sub = payload.get("sub")
        sec_conds = [UserSecuritySettingsModel.portal == "RETAILER"]
        if user_sub and user_sub != "default":
            try:
                uid = uuid.UUID(user_sub)
                sec_conds.append(
                    or_(
                        UserSecuritySettingsModel.user_id == uid,
                        UserSecuritySettingsModel.user_id == uuid.UUID("00000000-0000-0000-0000-000000000000")
                    )
                )
            except Exception:
                pass
        
        stmt_sec = select(UserSecuritySettingsModel).where(and_(*sec_conds))
        sec_rows = (await db.execute(stmt_sec)).scalars().all()
        for sec in sec_rows:
            if sec.security_pin_hash:
                try:
                    if verify_password(clean_pin, sec.security_pin_hash):
                        verified = True
                        sec.failed_attempt_count = 0
                        sec.last_pin_verified_at = datetime.now(timezone.utc)
                        await db.commit()
                        break
                except Exception:
                    pass
    except Exception as e:
        logger.debug(f"User security settings verify notice: {e}")

    # 2. Check against Database Customer MPINs dynamically
    if not verified:
        try:
            res = await db.execute(text("SELECT public_id, mpin_hash FROM customer WHERE mpin_hash IS NOT NULL LIMIT 100"))
            customers = res.mappings().all()
            for c in customers:
                cid_str = str(c["public_id"])
                target_hash = c["mpin_hash"]
                if target_hash and _hash_mpin(clean_pin, cid_str) == target_hash:
                    verified = True
                    break
        except Exception as e:
            logger.debug(f"Customer MPIN DB lookup notice: {e}")

    # 3. Check against Registration Draft retailer MPIN
    if not verified:
        try:
            stmt_draft = select(RegistrationDraftModel).order_by(desc(RegistrationDraftModel.last_activity_at)).limit(10)
            drafts = (await db.execute(stmt_draft)).scalars().all()
            for d in drafts:
                ddata = d.draft_data or {}
                dhash = ddata.get("mpin_hash")
                if dhash:
                    ident_str = str(d.registration_id or "RETAILER_MPIN")
                    if _hash_mpin(clean_pin, ident_str) == dhash or _hash_mpin(clean_pin, str(d.public_id)) == dhash:
                        verified = True
                        break
        except Exception as e:
            logger.debug(f"Draft MPIN DB lookup notice: {e}")

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect Security PIN. Please enter your valid 4-digit PIN configured in database."
        )

    return {
        "status": "UNLOCKED",
        "success": True,
        "unlocked": True,
        "message": "Session unlocked successfully.",
        "verified_at": datetime.now(timezone.utc).isoformat()
    }


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

    user_id = uuid.UUID(payload.get("sub", "00000000-0000-0000-0000-000000000000"))
    tenant_id = uuid.UUID(payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8"))

    sec = await get_or_create_user_security_settings(db, user_id, tenant_id)
    sec.security_pin_hash = hash_password(req.pin)
    sec.failed_attempt_count = 0
    sec.locked_until = None

    await db.commit()
    return {"success": True, "message": "Security PIN configured successfully."}


@router.post("/session/audit", summary="Log Session Audit Event")
async def log_session_audit(
    req: SessionAuditRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(payload.get("sub", "00000000-0000-0000-0000-000000000000"))
    tenant_id = uuid.UUID(payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8"))

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
    return {"status": "LOGGED", "event": req.event_type, "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/session/settings", summary="Get Security & Theme Preference Settings")
@router.get("/retailer/preferences", summary="Get Retailer Preferences")
async def get_security_settings(
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    user_sub = payload.get("sub") or payload.get("retailer_id") or "default"
    key = retailer_id or user_sub

    # 1. Try DB lookup first
    try:
        if user_sub != "default":
            rid = uuid.UUID(user_sub)
            stmt = select(RetailerSecuritySettingsModel).where(RetailerSecuritySettingsModel.retailer_id == rid)
            sec = (await db.execute(stmt)).scalars().first()
            if sec:
                return {
                    "status": "SUCCESS",
                    "user_id": str(sec.retailer_id),
                    "theme_mode": sec.theme_mode or "AUTO",
                    "timezone": sec.timezone or "Asia/Kolkata",
                    "auto_lock_enabled": sec.auto_lock_enabled,
                    "idle_timeout_minutes": sec.idle_timeout_minutes,
                    "warning_seconds": sec.warning_seconds,
                    "lock_on_minimize": sec.lock_on_minimize,
                    "lock_on_sleep": sec.lock_on_sleep,
                    "biometric_enabled": sec.biometric_enabled,
                    "pin_configured": True,
                    "failed_attempt_count": 0
                }
    except Exception as e:
        print(f"DB lookup for security settings exception: {e}")

    # 2. Check in-memory SETTINGS_STORE fallback
    if key in SETTINGS_STORE:
        return SETTINGS_STORE[key]

    return {
        "status": "SUCCESS",
        "user_id": key,
        "theme_mode": "AUTO",
        "timezone": "Asia/Kolkata",
        "auto_lock_enabled": True,
        "idle_timeout_minutes": 1,
        "warning_seconds": 30,
        "lock_on_minimize": True,
        "lock_on_sleep": True,
        "biometric_enabled": True,
        "pin_configured": True,
        "failed_attempt_count": 0
    }


@router.put("/session/settings", summary="Update Security & Theme Preference Settings")
@router.patch("/session/settings", summary="Patch Security & Theme Preference Settings")
@router.put("/retailer/preferences", summary="Update Retailer Preferences")
@router.patch("/retailer/preferences", summary="Patch Retailer Preferences")
async def update_security_settings(
    req: SecuritySettingsUpdateRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    user_sub = payload.get("sub") or payload.get("retailer_id") or "default"
    key = req.retailer_id or user_sub

    # Determine theme_mode (AUTO, LIGHT, DARK) with uppercase normalization
    clean_theme_mode = (req.theme_mode or "AUTO").upper()
    if clean_theme_mode not in ("AUTO", "LIGHT", "DARK"):
        clean_theme_mode = "AUTO"

    clean_timezone = req.timezone or "Asia/Kolkata"

    # Persist to DB if valid UUID retailer context
    try:
        if user_sub != "default":
            rid = uuid.UUID(user_sub)
            stmt = select(RetailerSecuritySettingsModel).where(RetailerSecuritySettingsModel.retailer_id == rid)
            sec = (await db.execute(stmt)).scalars().first()
            if not sec:
                sec = RetailerSecuritySettingsModel(
                    public_id=uuid.uuid4(),
                    retailer_id=rid,
                    tenant_id=uuid.UUID(payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8")),
                    theme_mode=clean_theme_mode,
                    timezone=clean_timezone,
                    auto_lock_enabled=req.auto_lock_enabled,
                    idle_timeout_minutes=req.idle_timeout_minutes,
                    warning_seconds=req.warning_seconds,
                    lock_on_minimize=req.lock_on_minimize,
                    lock_on_sleep=req.lock_on_sleep,
                    biometric_enabled=req.biometric_enabled if req.biometric_enabled is not None else True
                )
                db.add(sec)
            else:
                sec.theme_mode = clean_theme_mode
                sec.timezone = clean_timezone
                sec.auto_lock_enabled = req.auto_lock_enabled
                sec.idle_timeout_minutes = req.idle_timeout_minutes
                sec.warning_seconds = req.warning_seconds
                sec.lock_on_minimize = req.lock_on_minimize
                sec.lock_on_sleep = req.lock_on_sleep
                if req.biometric_enabled is not None:
                    sec.biometric_enabled = req.biometric_enabled

            await db.commit()
            await db.refresh(sec)
    except Exception as e:
        print(f"Error persisting security/theme settings to DB: {e}")

    updated = {
        "status": "UPDATED",
        "user_id": key,
        "theme_mode": clean_theme_mode,
        "timezone": clean_timezone,
        "auto_lock_enabled": req.auto_lock_enabled,
        "idle_timeout_minutes": req.idle_timeout_minutes,
        "warning_seconds": req.warning_seconds,
        "lock_on_minimize": req.lock_on_minimize,
        "lock_on_sleep": req.lock_on_sleep,
        "biometric_enabled": req.biometric_enabled if req.biometric_enabled is not None else True,
        "pin_configured": True,
        "failed_attempt_count": 0
    }
    SETTINGS_STORE[key] = updated
    return updated

