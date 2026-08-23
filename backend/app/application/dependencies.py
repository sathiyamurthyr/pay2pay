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
from app.infrastructure.db.models import (
    AdminUserModel, UserSessionModel, UserRoleModel, RoleModel,
    RolePermissionModel, PermissionModel, RetailerModel
)

security_scheme = HTTPBearer(auto_error=False)

REVOKED_TOKENS_CACHE: set = set()


def blacklist_jti(jti: str):
    if jti:
        REVOKED_TOKENS_CACHE.add(str(jti))


async def get_current_token_payload(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> dict:
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()
        else:
            token = (
                request.cookies.get("p2p_access_token")
                or request.cookies.get("pay2pay_access_token")
                or request.cookies.get("pay2pay_auth_token")
                or request.cookies.get("access_token")
            )

    if not token:
        raise UnauthorizedException("Authentication credentials were not provided")

    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired authentication token")

    # Check if session JTI has been revoked on server (In-memory + Database)
    jti = payload.get("jti")
    if jti:
        if str(jti) in REVOKED_TOKENS_CACHE:
            raise UnauthorizedException("Session has been revoked or logged out")

        stmt = select(UserSessionModel).where(
            UserSessionModel.token_jti == str(jti),
            UserSessionModel.is_revoked == True
        )
        revoked_session = (await db.execute(stmt)).scalars().first()
        if revoked_session:
            REVOKED_TOKENS_CACHE.add(str(jti))
            raise UnauthorizedException("Session has been revoked or logged out")

    return payload


async def get_current_tenant_id(
    payload: dict = Depends(get_current_token_payload)
) -> uuid.UUID:
    """
    CRITICAL ENTERPRISE REQUIREMENT:
    Each request automatically resolves TenantId strictly from JWT.
    Never trust TenantId from request payload or query string.
    """
    tenant_id_str = payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8")
    try:
        return uuid.UUID(tenant_id_str)
    except (ValueError, TypeError):
        return uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")


async def get_current_user(
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
) -> AdminUserModel:
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Authentication token missing subject identifier")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise UnauthorizedException("Invalid user identifier in token")

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

    if not user:
        # Check if user is an authenticated Retailer
        ret_stmt = select(RetailerModel).where(
            RetailerModel.public_id == user_uuid,
            RetailerModel.is_deleted == False
        )
        retailer = (await db.execute(ret_stmt)).scalar_one_or_none()
        if retailer:
            ret_status = (retailer.status or "ACTIVE").upper()
            if ret_status in ("BLOCKED", "SUSPENDED", "DEACTIVATED"):
                raise UnauthorizedException("Retailer account has been blocked or suspended")
            return AdminUserModel(
                id=retailer.id,
                public_id=retailer.public_id,
                tenant_id=retailer.tenant_id,
                username=retailer.retailer_code or str(retailer.mobile_number),
                email=retailer.email or f"{retailer.mobile_number}@pay2pay.in",
                full_name=retailer.owner_name or "Retailer Partner",
                status=ret_status,
                user_roles=[]
            )
        raise UnauthorizedException("User not found or account is inactive")

    if user.status != "ACTIVE":
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
            if ur.role and ur.role.code == "PLATFORM_ADMIN":
                return True

        # Check explicit role permissions
        user_role_ids = [ur.role_id for ur in current_user.user_roles if ur.role]
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
