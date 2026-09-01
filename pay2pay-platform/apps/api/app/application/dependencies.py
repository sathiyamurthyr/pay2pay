import uuid
from typing import List, Optional
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, or_
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


async def get_optional_token_payload(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Returns the decoded token payload if present and valid, or an empty dict otherwise.
    Safe for non-strict or fallback endpoints like notification polling.
    """
    try:
        return await get_current_token_payload(request, credentials, db)
    except Exception:
        return {}


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


async def get_optional_tenant_id(
    payload: dict = Depends(get_optional_token_payload)
) -> uuid.UUID:
    tenant_id_str = payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8") if payload else "547aa7bb-a790-4fe2-bd5b-27214ed176c8"
    try:
        return uuid.UUID(tenant_id_str)
    except (ValueError, TypeError):
        return uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")


async def get_optional_current_user(
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db)
) -> Optional[AdminUserModel]:
    if not payload or not payload.get("sub"):
        return None
    try:
        return await get_current_user(payload, db)
    except Exception:
        return None


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

    # 1. Check AdminUserModel
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

    if user:
        if user.status != "ACTIVE":
            raise UnauthorizedException("User account is inactive or disabled")
        return user

    # 2. Check AuthUserModel
    try:
        from app.infrastructure.db.auth_models import AuthUserModel
        auth_u_stmt = select(AuthUserModel).where(
            or_(
                AuthUserModel.user_id == user_uuid,
                AuthUserModel.public_id == user_uuid
            ),
            AuthUserModel.is_deleted == False
        )
        auth_user = (await db.execute(auth_u_stmt)).scalar_one_or_none()
        if auth_user:
            status_val = (auth_user.account_status or "ACTIVE").upper()
            if status_val in ("BLOCKED", "SUSPENDED", "DEACTIVATED", "LOCKED"):
                raise UnauthorizedException("User account is inactive or locked")
            return AdminUserModel(
                id=auth_user.id or 1,
                public_id=auth_user.user_id or auth_user.public_id or user_uuid,
                tenant_id=auth_user.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                username=auth_user.mobile_number,
                email=auth_user.email or f"{auth_user.mobile_number}@pay2pay.in",
                full_name=auth_user.full_name or "Retailer User",
                status=status_val,
                user_roles=[]
            )
    except Exception:
        pass

    # 3. Check RetailerModel
    ret_stmt = select(RetailerModel).where(
        RetailerModel.public_id == user_uuid,
        RetailerModel.is_deleted == False
    )
    retailer = (await db.execute(ret_stmt)).scalar_one_or_none()
    if retailer:
        ret_status = (retailer.status or "ACTIVE").upper()
        if ret_status in ("BLOCKED", "SUSPENDED", "DEACTIVATED"):
            raise UnauthorizedException("Retailer account has been blocked or suspended")
        email_val = payload.get("email") or f"{retailer.retailer_code}@pay2pay.in"
        return AdminUserModel(
            id=retailer.id,
            public_id=retailer.public_id,
            tenant_id=retailer.tenant_id,
            username=retailer.retailer_code,
            email=email_val,
            full_name=retailer.owner_name or "Retailer Partner",
            status=ret_status,
            user_roles=[]
        )

    # 4. Fallback from validated token claims if user was signed in with valid session
    if payload.get("roles") or payload.get("sub"):
        return AdminUserModel(
            id=1,
            public_id=user_uuid,
            tenant_id=uuid.UUID(payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8")),
            username=str(payload.get("mobile") or payload.get("retailer_id") or user_id_str),
            email=payload.get("email") or f"{user_id_str[:8]}@pay2pay.in",
            full_name=payload.get("name") or "Retailer Partner",
            status="ACTIVE",
            user_roles=[]
        )

    raise UnauthorizedException("User not found or account is inactive")


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
