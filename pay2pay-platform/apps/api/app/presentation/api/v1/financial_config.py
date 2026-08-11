import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    FinancialConfigCreateRequest, FinancialConfigResponse, FinancialConfigDashboardMetricsResponse
)
from app.application.services import FinancialConfigurationService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/financial-config", tags=["Financial Configuration Engine"])


@router.post("", response_model=FinancialConfigResponse)
async def create_financial_configuration(
    req: FinancialConfigCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cfg = await FinancialConfigurationService.create_configuration(db, tenant_id, req, current_user)
    return FinancialConfigResponse(
        public_id=cfg.public_id,
        config_code=cfg.config_code,
        config_type=cfg.config_type,
        config_name=cfg.config_name,
        hierarchy_level=cfg.hierarchy_level,
        priority=cfg.priority,
        version=cfg.version,
        approval_status=cfg.approval_status,
        created_by=cfg.created_by,
        created_date=cfg.created_date
    )


@router.get("", response_model=List[FinancialConfigResponse])
async def list_financial_configurations(
    config_type: Optional[str] = Query(None),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    configs = await FinancialConfigurationService.list_configurations(db, tenant_id, config_type)
    return [
        FinancialConfigResponse(
            public_id=c.public_id,
            config_code=c.config_code,
            config_type=c.config_type,
            config_name=c.config_name,
            hierarchy_level=c.hierarchy_level,
            priority=c.priority,
            version=c.version,
            approval_status=c.approval_status,
            created_by=c.created_by,
            created_date=c.created_date
        )
        for c in configs
    ]


@router.get("/resolve/effective", response_model=FinancialConfigResponse)
async def resolve_effective_configuration(
    config_type: str = Query("MDR"),
    machine_id: Optional[uuid.UUID] = Query(None),
    retailer_id: Optional[uuid.UUID] = Query(None),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cfg = await FinancialConfigurationService.resolve_effective_config(db, tenant_id, config_type, machine_id, retailer_id)
    return FinancialConfigResponse(
        public_id=cfg.public_id,
        config_code=cfg.config_code,
        config_type=cfg.config_type,
        config_name=cfg.config_name,
        hierarchy_level=cfg.hierarchy_level,
        priority=cfg.priority,
        version=cfg.version,
        approval_status=cfg.approval_status,
        created_by=cfg.created_by,
        created_date=cfg.created_date or datetime.utcnow()
    )


@router.get("/dashboard/metrics", response_model=FinancialConfigDashboardMetricsResponse)
async def get_financial_config_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await FinancialConfigurationService.get_dashboard_metrics(db, tenant_id)


@router.patch("/{config_id}/status", response_model=FinancialConfigResponse)
async def update_financial_configuration_status(
    config_id: uuid.UUID,
    status: str = Query(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cfg = await FinancialConfigurationService.update_configuration_status(db, tenant_id, config_id, status)
    return FinancialConfigResponse(
        public_id=cfg.public_id,
        config_code=cfg.config_code,
        config_type=cfg.config_type,
        config_name=cfg.config_name,
        hierarchy_level=cfg.hierarchy_level,
        priority=cfg.priority,
        version=cfg.version,
        approval_status=cfg.approval_status,
        created_by=cfg.created_by,
        created_date=cfg.created_date
    )


@router.delete("/{config_id}")
async def delete_financial_configuration(
    config_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await FinancialConfigurationService.delete_configuration(db, tenant_id, config_id)
    return {"success": success, "message": "Financial rule deleted successfully"}
