import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.application.dtos import UserCreate, UserResponse, UserTypeResponse, UserMenuAccessResponse
from app.application.services import UserService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/users", tags=["User Management"])


class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., example="ACTIVE", description="User status: ACTIVE, INACTIVE, SUSPENDED, BLOCKED")


class UserResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="New account password")


@router.get("/menu-access", response_model=UserMenuAccessResponse)
async def get_user_menu_access(
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns dynamic auto-access menu categories and items for the authenticated user
    based on PostgreSQL Stored Procedure sp_get_user_menu_access.
    """
    menu_data = await UserService.get_menu_access(db, current_user)
    return UserMenuAccessResponse(**menu_data)


@router.get("/user-types", response_model=List[UserTypeResponse])
async def list_user_types(
    tenant_id: Optional[uuid.UUID] = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns supported user types using PostgreSQL Stored Procedure sp_list_user_types.
    """
    types = await UserService.list_user_types(db, tenant_id)
    return [
        UserTypeResponse(
            user_type_ref_id=t.get("user_type_ref_id", 1) if isinstance(t, dict) else getattr(t, "user_type_ref_id", 1),
            user_type_code=t.get("user_type_code") if isinstance(t, dict) else getattr(t, "user_type_code", "ADMIN"),
            user_type_name=t.get("user_type_name") if isinstance(t, dict) else getattr(t, "user_type_name", "Admin"),
            code=t.get("code") if isinstance(t, dict) else getattr(t, "code", "ADMIN"),
            name=t.get("name") if isinstance(t, dict) else getattr(t, "name", "Admin"),
            description=t.get("description") if isinstance(t, dict) else getattr(t, "description", None),
            is_active=t.get("is_active", True) if isinstance(t, dict) else getattr(t, "is_active", True),
            is_deleted=t.get("is_deleted", False) if isinstance(t, dict) else getattr(t, "is_deleted", False),
            public_id=t.get("public_id") if isinstance(t, dict) else getattr(t, "public_id", None),
            is_system=t.get("is_system", True) if isinstance(t, dict) else getattr(t, "is_system", True),
        )
        for t in types
    ]


@router.post("", response_model=UserResponse)
async def create_user(
    req: UserCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:user")
):
    """
    Creates an admin user via PostgreSQL Stored Procedure sp_create_admin_user.
    """
    user_data = await UserService.create_user(db, tenant_id, req, current_user)
    if isinstance(user_data, dict):
        return UserResponse(**user_data)
    return user_data


@router.get("", response_model=List[UserResponse])
async def list_users(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:user")
):
    """
    Lists admin users via PostgreSQL Stored Procedure sp_list_admin_users.
    """
    users = await UserService.list_users(db, tenant_id)
    user_type = (getattr(current_user, "user_type", "") or "").upper()
    if not users and user_type in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN"):
        users = await UserService.list_users(db, None)
    return [UserResponse(**u) if isinstance(u, dict) else u for u in users]


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: uuid.UUID,
    req: UserStatusUpdateRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("update:user")
):
    """
    Updates user status via PostgreSQL Stored Procedure sp_update_admin_user_status.
    """
    user_data = await UserService.update_user_status(db, tenant_id, user_id, req.status, current_user)
    if isinstance(user_data, dict):
        return UserResponse(**user_data)
    return user_data


@router.post("/{user_id}/reset-password", response_model=UserResponse)
async def reset_user_password(
    user_id: uuid.UUID,
    req: UserResetPasswordRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("update:user")
):
    """
    Resets user password via PostgreSQL Stored Procedure sp_reset_admin_user_password.
    """
    user_data = await UserService.reset_user_password(db, tenant_id, user_id, req.new_password, current_user)
    if isinstance(user_data, dict):
        return UserResponse(**user_data)
    return user_data
