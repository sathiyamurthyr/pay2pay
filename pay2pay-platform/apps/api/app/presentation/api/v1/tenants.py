import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import TenantCreate, TenantResponse, APIResponse
from app.application.services import TenantService
from app.application.dependencies import get_current_user, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/tenants", tags=["Tenant Management"])


@router.post("", response_model=TenantResponse)
async def create_tenant(
    req: TenantCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("manage:tenant")
):
    tenant = await TenantService.create_tenant(db, req, current_user)
    return tenant


@router.get("", response_model=List[TenantResponse])
async def list_tenants(
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:tenant")
):
    return await TenantService.list_tenants(db)
