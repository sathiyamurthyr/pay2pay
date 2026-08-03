import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    TenantConfigUpdateRequest, ComplianceReportGenerateRequest,
    ComplianceReportResponse, ComplianceDashboardMetricsResponse
)
from app.application.services import ComplianceManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/compliance", tags=["Configuration, Audit & Compliance Reporting (EPIC-008)"])


@router.post("/configurations")
async def set_tenant_config(
    req: TenantConfigUpdateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cfg = await ComplianceManagementService.set_tenant_config(db, tenant_id, req, current_user)
    return {
        "public_id": str(cfg.public_id),
        "config_key": cfg.config_key,
        "config_value": cfg.config_value,
        "data_type": cfg.data_type,
        "description": cfg.description
    }


@router.get("/configurations")
async def list_tenant_configs(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    configs = await ComplianceManagementService.list_tenant_configs(db, tenant_id)
    return [
        {
            "public_id": str(c.public_id),
            "config_key": c.config_key,
            "config_value": c.config_value,
            "data_type": c.data_type,
            "description": c.description
        }
        for c in configs
    ]


@router.post("/reports/generate", response_model=ComplianceReportResponse)
async def generate_compliance_report(
    req: ComplianceReportGenerateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rep = await ComplianceManagementService.generate_compliance_report(db, tenant_id, req, current_user)
    return ComplianceReportResponse(
        public_id=rep.public_id,
        report_number=rep.report_number,
        report_type=rep.report_type,
        tax_period=rep.tax_period,
        service_name=rep.service_name,
        gst_rate=rep.gst_rate,
        tds_rate=rep.tds_rate,
        entity_scope=rep.entity_scope,
        entity_name=rep.entity_name,
        entity_id=rep.entity_id,
        generated_by=rep.generated_by,
        total_txns_count=rep.total_txns_count,
        total_taxable_value=rep.total_taxable_value,
        total_gst_amount=rep.total_gst_amount,
        total_tds_amount=rep.total_tds_amount,
        status=rep.status,
        created_date=rep.created_date
    )


@router.get("/reports", response_model=List[ComplianceReportResponse])
async def list_compliance_reports(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    reps = await ComplianceManagementService.list_compliance_reports(db, tenant_id)
    return [
        ComplianceReportResponse(
            public_id=r.public_id,
            report_number=r.report_number,
            report_type=r.report_type,
            tax_period=r.tax_period,
            service_name=r.service_name,
            gst_rate=r.gst_rate,
            tds_rate=r.tds_rate,
            entity_scope=r.entity_scope,
            entity_name=r.entity_name,
            entity_id=r.entity_id,
            generated_by=r.generated_by,
            total_txns_count=r.total_txns_count,
            total_taxable_value=r.total_taxable_value,
            total_gst_amount=r.total_gst_amount,
            total_tds_amount=r.total_tds_amount,
            status=r.status,
            created_date=r.created_date
        )
        for r in reps
    ]


@router.get("/dashboard/metrics", response_model=ComplianceDashboardMetricsResponse)
async def get_compliance_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await ComplianceManagementService.get_dashboard_metrics(db, tenant_id)
