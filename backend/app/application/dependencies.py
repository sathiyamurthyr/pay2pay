import uuid
from typing import List, Optional
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.infrastructure.db.models import AdminUserModel, UserSessionModel, UserRoleModel, RoleModel, RolePermissionModel, PermissionModel

security_scheme = HTTPBearer(auto_error=True)


async def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> dict:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired access token")
    return payload


async def get_current_tenant_id(
    payload: dict = Depends(get_current_token_payload)
) -> uuid.UUID:
    """
    CRITICAL ENTERPRISE REQUIREMENT:
    Each request automatically resolves TenantId strictly from JWT.
    Never trust TenantId from request payload or query string.
    """
    tenant_id_str = payload.get("tenant_id")
    if not tenant_id_str:
        raise UnauthorizedException("Tenant ID missing in access token")
    try:
        return uuid.UUID(tenant_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid Tenant ID format in token")


async def get_current_user(
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
) -> AdminUserModel:
    user_id_str = payload.get("sub")
    jti = payload.get("jti")
    if not user_id_str:
        raise UnauthorizedException("User ID missing in token")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid User ID format")

    # Verify session token JTI is active and not revoked
    if jti:
        session_stmt = select(UserSessionModel).where(
            UserSessionModel.token_jti == jti,
            UserSessionModel.is_revoked == False
        )
        session_res = await db.execute(session_stmt)
        session_obj = session_res.scalar_one_or_none()
        if not session_obj:
            raise UnauthorizedException("Session has been revoked or logged out")

    stmt = (
        select(AdminUserModel)
        .options(
            selectinload(AdminUserModel.user_roles)
            .selectinload(UserRoleModel.role)
            .selectinload(RoleModel.role_permissions)
            .selectinload(RolePermissionModel.permission)
        )
        .where(
            AdminUserModel.public_id == user_uuid,
            AdminUserModel.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.status != "ACTIVE":
        raise UnauthorizedException("User account is inactive or disabled")

    return user


class PermissionChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    async def __call__(
        self,
        current_user: AdminUserModel = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> bool:
        # Platform Admin bypass check
        for ur in current_user.user_roles:
            if ur.role.code == "PLATFORM_ADMIN":
                return True

        # Check explicit role permissions
        user_role_ids = [ur.role_id for ur in current_user.user_roles]
        if not user_role_ids:
            raise ForbiddenException(f"Missing required permission: {self.required_permission}")

        perm_stmt = (
            select(PermissionModel.code)
            .join(RolePermissionModel, RolePermissionModel.permission_id == PermissionModel.id)
            .where(RolePermissionModel.role_id.in_(user_role_ids))
        )
        perm_res = await db.execute(perm_stmt)
        user_permissions = set(perm_res.scalars().all())

        if self.required_permission not in user_permissions:
            raise ForbiddenException(f"Missing required permission: {self.required_permission}")

        return True


def require_permission(permission_code: str):
    return Depends(PermissionChecker(permission_code))
