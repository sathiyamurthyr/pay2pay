import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, verify_password, generate_mfa_secret, get_mfa_uri
from app.core.exceptions import BadRequestException
from app.application.dtos import (
    APIResponse, UserResponse, ProfileUpdate, ChangePasswordRequest,
    SessionResponse, ApiKeyCreate, ApiKeyResponse, MfaSetupResponse, MfaVerifyRequest
)
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel, UserSessionModel, ApiKeyModel
from app.infrastructure.services.audit_service import AuditLogger

router = APIRouter(prefix="/profile", tags=["My Profile & Security"])


@router.get("", response_model=UserResponse)
async def get_my_profile(
    current_user: AdminUserModel = Depends(get_current_user)
):
    return UserResponse(
        public_id=current_user.public_id,
        tenant_id=current_user.tenant_id,
        company_id=current_user.company_id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        phone=current_user.phone,
        status=current_user.status,
        mfa_enabled=current_user.mfa_enabled,
        last_login_at=current_user.last_login_at,
        roles=[{"public_id": str(ur.role.public_id), "name": ur.role.name, "code": ur.role.code} for ur in current_user.user_roles],
        version=current_user.version,
        created_at=current_user.created_at
    )


@router.put("", response_model=UserResponse)
async def update_my_profile(
    req: ProfileUpdate,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.full_name = req.full_name
    current_user.phone = req.phone
    await db.commit()
    await db.refresh(current_user)
    return UserResponse(
        public_id=current_user.public_id,
        tenant_id=current_user.tenant_id,
        company_id=current_user.company_id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        phone=current_user.phone,
        status=current_user.status,
        mfa_enabled=current_user.mfa_enabled,
        last_login_at=current_user.last_login_at,
        version=current_user.version,
        created_at=current_user.created_at
    )


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise BadRequestException("Incorrect current password")

    current_user.hashed_password = hash_password(req.new_password)
    await db.commit()

    await AuditLogger.log_action(
        db=db,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.public_id,
        actor_email=current_user.email,
        action="UPDATE",
        resource_type="USER_PASSWORD",
        resource_id=str(current_user.public_id)
    )
    return APIResponse(message="Password changed successfully")


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserSessionModel).where(
        UserSessionModel.user_id == current_user.id,
        UserSessionModel.is_revoked == False
    ).order_by(UserSessionModel.created_at.desc())
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    return [
        SessionResponse(
            public_id=s.public_id,
            token_jti=s.token_jti,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at,
            last_accessed_at=s.last_accessed_at,
            expires_at=s.expires_at,
            is_current=True
        )
        for s in sessions
    ]


@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    req: ApiKeyCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db)
):
    raw_secret = f"pay2pay_sk_{uuid.uuid4().hex}"
    prefix = raw_secret[:12]
    key_hash = hash_password(raw_secret)

    api_key = ApiKeyModel(
        public_id=uuid.uuid4(),
        tenant_id=tenant_id,
        company_id=current_user.company_id,
        user_id=current_user.id,
        name=req.name,
        key_prefix=prefix,
        hashed_key=key_hash,
        scopes={"permissions": req.scopes},
        is_active=True
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyResponse(
        public_id=api_key.public_id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        scopes=req.scopes,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        secret_key=raw_secret
    )
