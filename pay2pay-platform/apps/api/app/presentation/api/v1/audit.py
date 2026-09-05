import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import AuditLogResponse
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel, AuditLogModel

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])


class AuditLogCreateReq(BaseModel):
    event_type: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = "SECURITY"
    resource_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


@router.post("")
async def create_audit_log_endpoint(
    req: AuditLogCreateReq,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from app.presentation.api.v1.compliance import create_compliance_audit_log, AuditLogCreateRequest
    return await create_compliance_audit_log(
        AuditLogCreateRequest(
            event_type=req.event_type,
            action=req.action,
            resource_type=req.resource_type,
            resource_id=req.resource_id,
            metadata=req.metadata,
            details=req.details,
            timestamp=req.timestamp
        ),
        request=request,
        db=db
    )


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user),
    _: bool = require_permission("read:audit_log")
):
    stmt = select(AuditLogModel).where(AuditLogModel.tenant_id == tenant_id)
    if action:
        stmt = stmt.where(AuditLogModel.action == action.upper())
    if resource_type:
        stmt = stmt.where(AuditLogModel.resource_type == resource_type.upper())

    stmt = stmt.order_by(AuditLogModel.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        AuditLogResponse(
            public_id=l.public_id,
            tenant_id=l.tenant_id,
            company_id=l.company_id,
            actor_id=l.actor_id,
            actor_email=l.actor_email,
            action=l.action,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            details=l.details,
            ip_address=l.ip_address,
            user_agent=l.user_agent,
            created_at=l.created_at
        )
        for l in logs
    ]
