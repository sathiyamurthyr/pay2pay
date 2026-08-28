import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id, get_current_token_payload
from app.infrastructure.db.models import AdminUserModel
from app.application.retailer_mpin_service import RetailerMpinService

router = APIRouter(prefix="/admin/retailers", tags=["Admin Retailer MPIN Management"])
verify_router = APIRouter(prefix="/retailers/mpin", tags=["Retailer MPIN Verification"])


class MpinUnlockRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Audit reason for MPIN unlock", example="Retailer contacted support after 5 wrong attempts.")


class MpinLockRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Audit reason for MPIN manual lock", example="Suspicious activity reported by risk officer.")


class RetailerMpinVerifyRequest(BaseModel):
    retailer_id: str = Field(..., description="Retailer UUID or Code", example="0d1894e9-39f3-49d1-a967-7ab3a0e4cec4")
    mpin: str = Field(..., min_length=4, max_length=6, description="4 or 6 digit MPIN", example="2468")


def _is_super_admin(current_user: AdminUserModel, payload: dict) -> bool:
    roles = [str(r).upper() for r in payload.get("roles", [])]
    if hasattr(current_user, "user_roles") and current_user.user_roles:
        for ur in current_user.user_roles:
            if hasattr(ur, "role") and ur.role and hasattr(ur.role, "code"):
                roles.append(str(ur.role.code).upper())
    return any(r in ("SUPER_ADMIN", "PLATFORM_ADMIN", "ROOT_ADMIN") for r in roles)


def _resolve_company_scope(current_user: AdminUserModel, payload: dict) -> Optional[uuid.UUID]:
    if _is_super_admin(current_user, payload):
        return None
    return current_user.company_id if getattr(current_user, "company_id", None) else None


def _resolve_tenant_scope(tenant_id: uuid.UUID, current_user: AdminUserModel, payload: dict) -> Optional[uuid.UUID]:
    if _is_super_admin(current_user, payload):
        return None
    return tenant_id


@router.get("/{retailer_id}/mpin-status", summary="Get Retailer MPIN Status & Lockout State")
async def get_retailer_mpin_status(
    retailer_id: str,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns current MPIN lockout status, failed attempt counts, timestamps, and audit history.
    Does not expose sensitive MPIN hashes.
    """
    company_id = _resolve_company_scope(current_user, payload)
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMpinService.get_mpin_status(
        db=db,
        retailer_id=retailer_id,
        tenant_id=eff_tenant_id,
        company_id=company_id
    )


@router.post("/{retailer_id}/mpin/unlock", summary="Admin Unlock Retailer MPIN")
async def unlock_retailer_mpin(
    retailer_id: str,
    req: MpinUnlockRequest,
    request: Request,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Unlocks a retailer's MPIN account:
    - Sets mpin_failed_attempts = 0
    - Sets mpin_locked = false
    - Sets mpin_locked_at = null
    - Records mpin_unlocked_at and mpin_unlocked_by
    - Does NOT alter the retailer's existing MPIN
    - Audits the action with reason and operator ID
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    company_id = _resolve_company_scope(current_user, payload)
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMpinService.unlock_mpin(
        db=db,
        retailer_id=retailer_id,
        tenant_id=eff_tenant_id,
        company_id=company_id,
        admin_user=current_user,
        reason=req.reason,
        ip_address=client_ip
    )


@router.post("/{retailer_id}/mpin/lock", summary="Admin Manual Lock Retailer MPIN")
async def lock_retailer_mpin(
    retailer_id: str,
    req: MpinLockRequest,
    request: Request,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """Manually locks a retailer's MPIN account by Admin."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    company_id = _resolve_company_scope(current_user, payload)
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMpinService.lock_mpin(
        db=db,
        retailer_id=retailer_id,
        tenant_id=eff_tenant_id,
        company_id=company_id,
        admin_user=current_user,
        reason=req.reason,
        ip_address=client_ip
    )


@verify_router.post("/verify", summary="Verify Retailer MPIN (with lockout)")
async def verify_retailer_mpin_endpoint(
    req: RetailerMpinVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Verifies retailer MPIN with rate-limiting attempt counter and automatic lockout after 5 failures."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await RetailerMpinService.verify_retailer_mpin(
        db=db,
        retailer_id=req.retailer_id,
        mpin=req.mpin,
        ip_address=client_ip
    )
