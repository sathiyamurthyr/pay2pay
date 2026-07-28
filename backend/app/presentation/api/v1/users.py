import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import UserCreate, UserResponse
from app.application.services import UserService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/users", tags=["User Management"])


@router.post("", response_model=UserResponse)
async def create_user(
    req: UserCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:user")
):
    user = await UserService.create_user(db, tenant_id, req, current_user)
    return UserResponse(
        public_id=user.public_id,
        tenant_id=user.tenant_id,
        company_id=user.company_id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        status=user.status,
        mfa_enabled=user.mfa_enabled,
        last_login_at=user.last_login_at,
        version=user.version,
        created_at=user.created_at
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
            status=u.status,
            mfa_enabled=u.mfa_enabled,
            last_login_at=u.last_login_at,
            roles=[{"public_id": str(ur.role.public_id), "name": ur.role.name, "code": ur.role.code} for ur in u.user_roles],
            version=u.version,
            created_at=u.created_at
        )
        for u in users
    ]
