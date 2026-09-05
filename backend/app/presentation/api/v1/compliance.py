import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    TenantConfigUpdateRequest, ComplianceReportGenerateRequest,
    ComplianceReportResponse, ComplianceDashboardMetricsResponse
)
from app.application.services import ComplianceManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel, AuditLogModel

router = APIRouter(prefix="/compliance", tags=["Configuration, Audit & Compliance Reporting (EPIC-008)"])


class AuditLogCreateRequest(BaseModel):
    event_type: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = "SESSION_SECURITY"
    resource_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None



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


@router.post("/audit-logs")
async def create_compliance_audit_log(
    req: AuditLogCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingest audit log events from frontend security providers, session trackers, and platform microservices.
    """
    auth_header = request.headers.get("authorization", "")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
    if not token:
        cookies = request.cookies or {}
        token = cookies.get("p2p_access_token") or cookies.get("pay2pay_access_token") or cookies.get("access_token")

    actor_id = None
    actor_email = None
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    company_id = None

    if token:
        try:
            from app.core.security import decode_access_token
            payload = decode_access_token(token) or {}
            if payload.get("sub"):
                try:
                    actor_id = uuid.UUID(str(payload["sub"]))
                except Exception:
                    pass
            actor_email = payload.get("email") or payload.get("mobile") or payload.get("sub")
            if payload.get("tenant_id"):
                try:
                    tenant_id = uuid.UUID(str(payload["tenant_id"]))
                except Exception:
                    pass
            if payload.get("company_id"):
                try:
                    company_id = uuid.UUID(str(payload["company_id"]))
                except Exception:
                    pass
        except Exception:
            pass

    act = (req.action or req.event_type or "AUDIT_EVENT").upper()[:50]
    res_type = (req.resource_type or "SECURITY").upper()[:100]
    dtls = req.details or req.metadata or {}
    if req.event_type and "event_type" not in dtls:
        dtls["event_type"] = req.event_type

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    log_entry = AuditLogModel(
        tenant_id=tenant_id,
        company_id=company_id,
        actor_id=actor_id,
        actor_email=str(actor_email)[:255] if actor_email else None,
        action=act,
        resource_type=res_type,
        resource_id=req.resource_id,
        details=dtls,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(log_entry)
    try:
        await db.commit()
        await db.refresh(log_entry)
    except Exception as e:
        await db.rollback()
        return {
            "success": True,
            "message": "Audit log received",
            "warning": str(e)
        }

    return {
        "success": True,
        "public_id": str(log_entry.public_id),
        "action": log_entry.action,
        "created_at": log_entry.created_at.isoformat() if log_entry.created_at else None
    }


@router.get("/audit-logs")
async def list_compliance_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLogModel)
    if action:
        stmt = stmt.where(AuditLogModel.action == action.upper())
    if resource_type:
        stmt = stmt.where(AuditLogModel.resource_type == resource_type.upper())

    stmt = stmt.order_by(AuditLogModel.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        {
            "public_id": str(l.public_id),
            "tenant_id": str(l.tenant_id),
            "company_id": str(l.company_id) if l.company_id else None,
            "actor_id": str(l.actor_id) if l.actor_id else None,
            "actor_email": l.actor_email,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]
