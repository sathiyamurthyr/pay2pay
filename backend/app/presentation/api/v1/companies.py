import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import CompanyCreate, CompanyResponse
from app.application.services import CompanyService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/companies", tags=["Company Management"])


@router.post("", response_model=CompanyResponse)
async def create_company(
    req: CompanyCreate,
    current_user: AdminUserModel = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:company")
):
    return await CompanyService.create_company(db, tenant_id, req, current_user)


@router.get("", response_model=List[CompanyResponse])
async def list_companies(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:company")
):
    return await CompanyService.list_companies(db, tenant_id)
