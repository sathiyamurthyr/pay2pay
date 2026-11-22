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
from app.infrastructure.db.models import AdminUserModel, RetailerModel, RetailerContactModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.db.session_security_models import (
    SessionAuditLogModel, RetailerSecuritySettingsModel, UserSecuritySettingsModel
)
from app.application.mpin_service import _hash_mpin

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
    confirm_pin: Optional[str] = Field(None, description="Confirm 4-digit security PIN")

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


class SessionLockRequest(BaseModel):
    retailer_id: Optional[str] = None
    tenant_id: Optional[str] = None
    device_info: Optional[str] = None
    browser: Optional[str] = None
    os_name: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    reason: Optional[str] = "Manual terminal lock"


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
# LOCK & STATUS API ENDPOINTS (Database-Backed Persistent Terminal Lock)
# ------------------------------------------------------------------------------

@router.post("/session/lock", summary="Lock Active Terminal / Session")
@router.post("/auth/security/lock", summary="Lock Active Terminal / Session (Alias)")
async def lock_screen_session(
    req: Optional[SessionLockRequest] = None,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Authoritative terminal lock endpoint.
    Persists locked state directly to RetailerModel and UserSecuritySettingsModel,
    preventing any transaction or session operations until verified unlock.
    """
    user_sub = str(payload.get("sub") or "").strip()
    retailer_claim = str(payload.get("retailer_id") or payload.get("retailer_code") or "").strip()
    tenant_sub = payload.get("tenant_id")
    try:
        tenant_id = uuid.UUID(str(tenant_sub)) if tenant_sub else DEFAULT_TENANT_ID
    except Exception:
        tenant_id = DEFAULT_TENANT_ID

    uid = None
    if user_sub and user_sub != "default":
        try:
            uid = uuid.UUID(user_sub)
        except Exception:
            uid = None

    now_utc = datetime.now(timezone.utc)
    target_retailer = None

    # Resolve target retailer
    query_parts = []
    if uid:
        query_parts.append(RetailerModel.public_id == uid)
    if user_sub:
        query_parts.append(RetailerModel.retailer_code == user_sub)
    if retailer_claim:
        query_parts.append(RetailerModel.retailer_code == retailer_claim)
        try:
            query_parts.append(RetailerModel.public_id == uuid.UUID(retailer_claim))
        except Exception:
            pass

    if query_parts:
        stmt = select(RetailerModel).where(or_(*query_parts), RetailerModel.is_deleted == False)
        target_retailer = (await db.execute(stmt)).scalars().first()

    if target_retailer:
        # Note: Do NOT overwrite target_retailer.status (e.g. ACTIVE) with LOCKED.
        # Terminal lock is managed authoritatively via mpin_locked.
        target_retailer.mpin_locked = True
        target_retailer.mpin_locked_at = now_utc
        target_retailer.updated_date = now_utc

    # Update or Create UserSecuritySettings
    effective_uid = uid or (target_retailer.public_id if target_retailer else uuid.UUID("1072b5d2-0fd1-4323-a02a-03809d58b005"))
    sec = await get_or_create_user_security_settings(
        db,
        user_id=effective_uid,
        tenant_id=tenant_id,
        company_id=getattr(target_retailer, "company_id", None),
        portal="RETAILER"
    )
    sec.locked_until = now_utc + timedelta(days=365)
    sec.updated_date = now_utc

    # Create Session Audit Log
    audit = SessionAuditLogModel(
        public_id=uuid.uuid4(),
        retailer_id=effective_uid,
        tenant_id=tenant_id,
        event_type="SESSION_LOCKED",
        device_info=req.device_info if req else None,
        browser=req.browser if req else None,
        os_name=req.os_name if req else None,
        ip_address=req.ip_address if req else None,
        details=req.details if req else {"reason": (req.reason if req else "Manual terminal lock")}
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "status": "LOCKED",
        "is_locked": True,
        "message": "Terminal locked successfully.",
        "locked_at": now_utc.isoformat()
    }


@router.get("/session/status", summary="Check Active Terminal Lock Status")
@router.get("/auth/security/status", summary="Check Active Terminal Lock Status (Alias)")
async def get_session_lock_status(
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authoritative backend lock state. Prevents lock bypass on browser refresh.
    """
    user_sub = str(payload.get("sub") or "").strip()
    retailer_claim = str(payload.get("retailer_id") or payload.get("retailer_code") or "").strip()

    uid = None
    if user_sub and user_sub != "default":
        try:
            uid = uuid.UUID(user_sub)
        except Exception:
            uid = None

    query_parts = []
    if uid:
        query_parts.append(RetailerModel.public_id == uid)
    if user_sub:
        query_parts.append(RetailerModel.retailer_code == user_sub)
    if retailer_claim:
        query_parts.append(RetailerModel.retailer_code == retailer_claim)
        try:
            query_parts.append(RetailerModel.public_id == uuid.UUID(retailer_claim))
        except Exception:
            pass

    target_retailer = None
    if query_parts:
        stmt = select(RetailerModel).where(or_(*query_parts), RetailerModel.is_deleted == False)
        target_retailer = (await db.execute(stmt)).scalars().first()

    now_utc = datetime.now(timezone.utc)
    is_locked = False
    lock_reason = None

    if target_retailer:
        if str(target_retailer.status or "").upper() == "LOCKED" or bool(target_retailer.mpin_locked):
            is_locked = True
            lock_reason = "Retailer terminal is marked as LOCKED."

    if not is_locked and uid:
        stmt_sec = select(UserSecuritySettingsModel).where(UserSecuritySettingsModel.user_id == uid)
        sec = (await db.execute(stmt_sec)).scalars().first()
        if sec and sec.locked_until and sec.locked_until > now_utc:
            is_locked = True
            lock_reason = "User security lock active."

    return {
        "success": True,
        "is_locked": is_locked,
        "status": "LOCKED" if is_locked else (target_retailer.status if target_retailer else "ACTIVE"),
        "mpin_locked": bool(target_retailer.mpin_locked) if target_retailer else False,
        "reason": lock_reason
    }


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

    # 1. Resolve authenticated user context from token payload
    user_sub = str(payload.get("sub") or "").strip()
    user_role = (payload.get("role") or "RETAILER").upper()
    mobile = payload.get("mobile_number") or payload.get("mobile") or payload.get("phone")
    clean_mobile = "".join(filter(str.isdigit, str(mobile)))[-10:] if mobile else ""
    retailer_id_claim = str(payload.get("retailer_id") or payload.get("retailer_code") or "").strip()

    tenant_sub = payload.get("tenant_id")
    try:
        tenant_id = uuid.UUID(str(tenant_sub)) if tenant_sub else DEFAULT_TENANT_ID
    except Exception:
        tenant_id = DEFAULT_TENANT_ID

    uid: Optional[uuid.UUID] = None
    if user_sub and user_sub != "default":
        try:
            uid = uuid.UUID(user_sub)
        except Exception:
            uid = None

    try:
        # 2. Resolve target RetailerModel using pure SQLAlchemy ORM
        target_retailer = None
        ret_conditions = []
        if uid:
            ret_conditions.append(RetailerModel.public_id == uid)
        if user_sub:
            ret_conditions.append(RetailerModel.retailer_code == user_sub)
        if retailer_id_claim:
            try:
                ret_conditions.append(RetailerModel.public_id == uuid.UUID(retailer_id_claim))
            except Exception:
                ret_conditions.append(RetailerModel.retailer_code == retailer_id_claim)

        if ret_conditions:
            stmt = select(RetailerModel).where(or_(*ret_conditions), RetailerModel.is_deleted == False)
            target_retailer = (await db.execute(stmt)).scalars().first()

        # If not matched by ID/code, fallback to RetailerContactModel by mobile
        if not target_retailer and clean_mobile:
            c_stmt = select(RetailerContactModel.retailer_id).where(
                RetailerContactModel.mobile.in_([clean_mobile, f"+91{clean_mobile}", f"91{clean_mobile}"])
            )
            matched_ret_id = (await db.execute(c_stmt)).scalars().first()
            if matched_ret_id:
                target_retailer = (await db.execute(
                    select(RetailerModel).where(RetailerModel.public_id == matched_ret_id, RetailerModel.is_deleted == False)
                )).scalars().first()

        effective_uid = (target_retailer.public_id if target_retailer else None) or uid

        # 3. Check if locked out due to repeated failed attempts
        if target_retailer:
            failed_attempts = int(target_retailer.mpin_failed_attempts or 0)
            max_attempts = int(target_retailer.mpin_max_attempts or 5)
            if bool(target_retailer.mpin_locked) and failed_attempts >= max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Transaction PIN is locked due to repeated incorrect attempts. Please reset your PIN via WhatsApp authorization."
                )

        # 4. Resolve PIN Hash from available security models
        sec_obj = None
        if effective_uid:
            sec_stmt = select(UserSecuritySettingsModel).where(UserSecuritySettingsModel.user_id == effective_uid)
            sec_obj = (await db.execute(sec_stmt)).scalars().first()

        cust_obj = None
        if clean_mobile:
            cust_stmt = select(CustomerModel).where(
                CustomerModel.mobile_number.in_([clean_mobile, f"+91{clean_mobile}", f"91{clean_mobile}"]),
                CustomerModel.is_deleted == False
            )
            cust_obj = (await db.execute(cust_stmt)).scalars().first()

        mpin_hash = (
            getattr(target_retailer, "mpin_hash", None)
            or getattr(sec_obj, "security_pin_hash", None)
            or getattr(cust_obj, "mpin_hash", None)
        )

        # 5. Verify PIN
        is_pin_valid = False
        if mpin_hash:
            if verify_password(clean_pin, mpin_hash):
                is_pin_valid = True
            elif effective_uid and _hash_mpin(clean_pin, str(effective_uid)) == mpin_hash:
                is_pin_valid = True
            elif cust_obj and _hash_mpin(clean_pin, str(cust_obj.public_id)) == mpin_hash:
                is_pin_valid = True
            elif clean_pin == str(mpin_hash).strip():
                is_pin_valid = True
        elif not mpin_hash and (target_retailer or effective_uid):
            # If account has no PIN set yet, register this 4-digit PIN for future unlocks
            new_hash = hash_password(clean_pin)
            if target_retailer and hasattr(target_retailer, "mpin_hash"):
                target_retailer.mpin_hash = new_hash
            if not sec_obj and effective_uid:
                try:
                    sec_obj = await get_or_create_user_security_settings(
                        db, user_id=effective_uid, tenant_id=tenant_id, portal=user_role
                    )
                except Exception:
                    sec_obj = None
            if sec_obj and hasattr(sec_obj, "security_pin_hash"):
                sec_obj.security_pin_hash = new_hash
                sec_obj.pin_enabled = True
            is_pin_valid = True

        now_utc = datetime.now(timezone.utc)

        # 6. Success Branch: unlock terminal & reset counters
        if is_pin_valid:
            if target_retailer and hasattr(target_retailer, "status"):
                if target_retailer.status == "LOCKED":
                    target_retailer.status = "ACTIVE"
                target_retailer.mpin_locked = False
                target_retailer.mpin_failed_attempts = 0
                target_retailer.mpin_locked_at = None
                target_retailer.mpin_unlocked_at = now_utc
                target_retailer.mpin_unlocked_by = str(user_sub)
                target_retailer.updated_date = now_utc

            if sec_obj and hasattr(sec_obj, "locked_until"):
                sec_obj.locked_until = None
                sec_obj.failed_attempt_count = 0
                sec_obj.last_pin_verified_at = now_utc
                sec_obj.updated_date = now_utc

            # Session Audit Log
            audit = SessionAuditLogModel(
                public_id=uuid.uuid4(),
                retailer_id=effective_uid or DEFAULT_TENANT_ID,
                tenant_id=tenant_id,
                event_type="UNLOCK_SUCCESS",
                device_info=req.device_info,
                browser=req.browser,
                os_name=req.os_name,
                ip_address=req.ip_address,
                details={"method": "PIN"}
            )
            db.add(audit)
            await db.commit()

            return {
                "status": "UNLOCKED",
                "success": True,
                "unlocked": True,
                "message": "Session unlocked successfully.",
                "verified_at": now_utc.isoformat()
            }

        # 7. Failed PIN Attempt Branch
        else:
            if target_retailer and hasattr(target_retailer, "mpin_failed_attempts"):
                target_retailer.mpin_failed_attempts = (target_retailer.mpin_failed_attempts or 0) + 1
                max_att = target_retailer.mpin_max_attempts or 5
                if target_retailer.mpin_failed_attempts >= max_att:
                    target_retailer.mpin_locked = True
                    target_retailer.mpin_locked_at = now_utc
                    target_retailer.status = "LOCKED"
                target_retailer.updated_date = now_utc

            if sec_obj and hasattr(sec_obj, "failed_attempt_count"):
                sec_obj.failed_attempt_count = (sec_obj.failed_attempt_count or 0) + 1
                sec_obj.updated_date = now_utc

            audit = SessionAuditLogModel(
                public_id=uuid.uuid4(),
                retailer_id=effective_uid or DEFAULT_TENANT_ID,
                tenant_id=tenant_id,
                event_type="UNLOCK_FAILED",
                device_info=req.device_info,
                browser=req.browser,
                os_name=req.os_name,
                ip_address=req.ip_address,
                details={"reason": "Incorrect PIN"}
            )
            db.add(audit)
            await db.commit()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect Security PIN. Please enter your valid 4-digit PIN."
            )
    except HTTPException:
        raise
    except Exception as err:
        await db.rollback()
        logger.error("Error in unlock_screen_session: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security verification error: {str(err)}"
        )


# ------------------------------------------------------------------------------
# PIN SETUP & SECURITY MANAGEMENT ENDPOINTS
# ------------------------------------------------------------------------------

@router.post("/auth/security/pin/setup", summary="Setup or Update Security PIN")
@router.post("/auth/security/pin", summary="Setup or Update Security PIN Alias")
async def setup_security_pin(
    req: PinSetupRequest,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    from app.application.mpin_service import _hash_mpin

    clean_pin = req.pin.strip()
    clean_confirm = (req.confirm_pin or req.pin).strip()
    if not clean_pin.isdigit() or len(clean_pin) != 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN must be exactly 4 numeric digits.")
    if clean_pin != clean_confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN and Confirm PIN do not match.")

    user_sub = payload.get("sub")
    if not user_sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user authentication session.")
    try:
        user_id = uuid.UUID(str(user_sub))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identifier.")

    tenant_sub = payload.get("tenant_id")
    try:
        tenant_id = uuid.UUID(str(tenant_sub)) if tenant_sub else uuid.UUID("00000000-0000-0000-0000-000000000001")
    except Exception:
        tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    argon_hash = hash_password(clean_pin)

    sec = await get_or_create_user_security_settings(db, user_id, tenant_id)
    sec.security_pin_hash = argon_hash
    sec.pin_enabled = True
    sec.failed_attempt_count = 0
    sec.locked_until = None
    sec.last_pin_verified_at = datetime.now(timezone.utc)

    # Sync RetailerModel and invoke stored procedure sp_update_retailer_mpin
    ret_stmt = select(RetailerModel).where(
        or_(
            RetailerModel.public_id == user_id,
            RetailerModel.retailer_code == str(user_sub)
        ),
        RetailerModel.is_deleted == False
    )
    retailer = (await db.execute(ret_stmt)).scalars().first()
    if retailer:
        retailer.mpin_hash = argon_hash
        retailer.mpin_failed_attempts = 0
        retailer.mpin_locked = False
        retailer.updated_date = datetime.now(timezone.utc)

    # Also sync customer record if mobile exists
    mobile = payload.get("mobile_number") or payload.get("mobile") or payload.get("phone")
    if mobile:
        clean_mobile = "".join(filter(str.isdigit, str(mobile)))[-10:]
        mobile_variants = [clean_mobile, f"91{clean_mobile}", f"+91{clean_mobile}"]
        c_stmt = select(CustomerModel).where(CustomerModel.mobile_number.in_(mobile_variants))
        cust = (await db.execute(c_stmt)).scalars().first()
        if cust:
            cust.mpin_hash = _hash_mpin(clean_pin, str(cust.public_id))
            cust.mpin_enabled = True
            cust.failed_attempts = 0
            cust.is_locked = False
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
