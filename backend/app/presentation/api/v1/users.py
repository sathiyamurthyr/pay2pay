import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.application.dtos import UserCreate, UserResponse, UserTypeResponse
from app.application.services import UserService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/users", tags=["User Management"])


class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., example="ACTIVE", description="User status: ACTIVE or INACTIVE/SUSPENDED")


class UserResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="New account password")


@router.get("/user-types", response_model=List[UserTypeResponse])
async def list_user_types(
    tenant_id: Optional[uuid.UUID] = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    types = await UserService.list_user_types(db, tenant_id)
    return [
        UserTypeResponse(
            user_type_ref_id=getattr(ut, "user_type_ref_id", 1),
            user_type_code=getattr(ut, "user_type_code", None) or getattr(ut, "code", "ADMIN"),
            user_type_name=getattr(ut, "user_type_name", None) or getattr(ut, "name", "Admin"),
            code=getattr(ut, "user_type_code", None) or getattr(ut, "code", "ADMIN"),
            name=getattr(ut, "user_type_name", None) or getattr(ut, "name", "Admin"),
            description=getattr(ut, "description", None),
            is_active=getattr(ut, "is_active", True),
            is_deleted=getattr(ut, "is_deleted", False),
            public_id=getattr(ut, "public_id", None),
            is_system=getattr(ut, "is_system", True),
        )
        for ut in types
    ]


@router.post("", response_model=UserResponse)
async def create_user(
    req: UserCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:user")
):
    user = await UserService.create_user(db, tenant_id, req, current_user)
    created_dt = getattr(user, "created_date", getattr(user, "created_at", None))
    return UserResponse(
        public_id=user.public_id,
        tenant_id=user.tenant_id,
        company_id=user.company_id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        user_type=user.user_type,
        status=user.status,
        mfa_enabled=user.mfa_enabled,
        last_login_at=user.last_login_at,
        version_no=getattr(user, "version_no", 1),
        created_date=created_dt
    )


@router.get("", response_model=List[UserResponse])
async def list_users(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:user")
):
    users = await UserService.list_users(db, tenant_id)
    return [
        UserResponse(
            public_id=u.public_id,
            tenant_id=u.tenant_id,
            company_id=u.company_id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            phone=u.phone,
            user_type=u.user_type,
            status=u.status,
            mfa_enabled=u.mfa_enabled,
            last_login_at=u.last_login_at,
            roles=[{"public_id": str(ur.role.public_id), "name": ur.role.name, "code": ur.role.code} for ur in u.user_roles],
            version_no=getattr(u, "version_no", 1),
            created_date=getattr(u, "created_date", getattr(u, "created_at", None))
        )
        for u in users
    ]


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: uuid.UUID,
    req: UserStatusUpdateRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("update:user")
):
    user = await UserService.update_user_status(db, tenant_id, user_id, req.status, current_user)
    return UserResponse(
        public_id=user.public_id,
        tenant_id=user.tenant_id,
        company_id=user.company_id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        user_type=user.user_type,
        status=user.status,
        mfa_enabled=user.mfa_enabled,
        last_login_at=user.last_login_at,
        version_no=getattr(user, "version_no", 1),
        created_date=getattr(user, "created_date", getattr(user, "created_at", None))
    )


@router.post("/{user_id}/reset-password", response_model=UserResponse)
async def reset_user_password(
    user_id: uuid.UUID,
    req: UserResetPasswordRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("update:user")
):
    user = await UserService.reset_user_password(db, tenant_id, user_id, req.new_password, current_user)
    return UserResponse(
        public_id=user.public_id,
        tenant_id=user.tenant_id,
        company_id=user.company_id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        user_type=user.user_type,
        status=user.status,
        mfa_enabled=user.mfa_enabled,
        last_login_at=user.last_login_at,
        version_no=getattr(user, "version_no", 1),
        created_date=getattr(user, "created_date", getattr(user, "created_at", None))
    )
