import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import RoleCreate, RoleResponse, PermissionResponse, RolePermissionMatrixResponse
from app.application.services import RolePermissionService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/roles", tags=["Role & RBAC Management"])


@router.get("", response_model=List[RoleResponse])
async def list_roles(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:role")
):
    roles = await RolePermissionService.list_roles(db, tenant_id)
    return [
        RoleResponse(
            public_id=r.public_id,
            tenant_id=r.tenant_id,
            name=r.name,
            code=r.code,
            description=r.description,
            is_system=r.is_system,
            version=r.version,
            permissions=[
                PermissionResponse(
                    public_id=rp.permission.public_id,
                    code=rp.permission.code,
                    name=rp.permission.name,
                    module=rp.permission.module,
                    action=rp.permission.action,
                    description=rp.permission.description
                )
                for rp in r.role_permissions
            ],
            created_at=r.created_at
        )
        for r in roles
    ]


@router.post("", response_model=RoleResponse)
async def create_role(
    req: RoleCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:role")
):
    role = await RolePermissionService.create_role(db, tenant_id, req, current_user)
    return RoleResponse(
        public_id=role.public_id,
        tenant_id=role.tenant_id,
        name=role.name,
        code=role.code,
        description=role.description,
        is_system=role.is_system,
        version=role.version,
        permissions=[],
        created_at=role.created_at
    )


@router.get("/matrix", response_model=RolePermissionMatrixResponse)
async def get_permission_matrix(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:role")
):
    roles = await RolePermissionService.list_roles(db, tenant_id)
    perms = await RolePermissionService.list_permissions(db)

    matrix = {}
    for r in roles:
        matrix[r.code] = [rp.permission.code for rp in r.role_permissions]

    role_responses = [
        RoleResponse(
            public_id=r.public_id,
            tenant_id=r.tenant_id,
            name=r.name,
            code=r.code,
            description=r.description,
            is_system=r.is_system,
            version=r.version,
            permissions=[],
            created_at=r.created_at
        )
        for r in roles
    ]

    perm_responses = [
        PermissionResponse(
            public_id=p.public_id,
            code=p.code,
            name=p.name,
            module=p.module,
            action=p.action,
            description=p.description
        )
        for p in perms
    ]

    return RolePermissionMatrixResponse(
        roles=role_responses,
        permissions=perm_responses,
        matrix=matrix
    )
