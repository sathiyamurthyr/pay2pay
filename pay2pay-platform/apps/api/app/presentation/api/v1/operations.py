import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    OperationsTelemetryMetricsResponse, FeatureFlagResponse,
    BackgroundQueueResponse, DeadLetterQueueResponse, SystemAlertResponse,
    MaintenanceStatusResponse
)
from app.application.services import EnterpriseOperationsService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/operations", tags=["Enterprise Operations & Security (EPIC-012)"])


@router.get("/health", response_model=OperationsTelemetryMetricsResponse)
async def get_operations_telemetry(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseOperationsService.get_operations_telemetry(db, tenant_id)


@router.get("/feature-flags", response_model=List[FeatureFlagResponse])
async def list_feature_flags(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    flags = await EnterpriseOperationsService.list_feature_flags(db, tenant_id)
    return [
        FeatureFlagResponse(
            public_id=f.public_id,
            flag_key=f.flag_key,
            description=f.description,
            is_enabled=f.is_enabled,
            rollout_percentage=f.rollout_percentage
        )
        for f in flags
    ]


@router.post("/feature-flags/{key}/toggle", response_model=FeatureFlagResponse)
async def toggle_feature_flag(
    key: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    f = await EnterpriseOperationsService.toggle_feature_flag(db, tenant_id, key, current_user)
    return FeatureFlagResponse(
        public_id=f.public_id,
        flag_key=f.flag_key,
        description=f.description,
        is_enabled=f.is_enabled,
        rollout_percentage=f.rollout_percentage
    )


@router.get("/queues", response_model=List[BackgroundQueueResponse])
async def list_background_queues(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    queues = await EnterpriseOperationsService.list_queues(db, tenant_id)
    return [
        BackgroundQueueResponse(
            public_id=q.public_id,
            queue_name=q.queue_name,
            pending_jobs=q.pending_jobs,
            active_workers=q.active_workers,
            failed_jobs=q.failed_jobs
        )
        for q in queues
    ]


@router.get("/dlq", response_model=List[DeadLetterQueueResponse])
async def list_dlq_items(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dlqs = await EnterpriseOperationsService.list_dlq_items(db, tenant_id)
    return [
        DeadLetterQueueResponse(
            public_id=d.public_id,
            dlq_number=d.dlq_number,
            payload_json=d.payload_json,
            error_message=d.error_message,
            retry_count=d.retry_count,
            status=d.status,
            created_date=d.created_date
        )
        for d in dlqs
    ]


@router.post("/dlq/{id}/retry")
async def retry_dlq_item(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    d = await EnterpriseOperationsService.retry_dlq_item(db, tenant_id, id, current_user)
    return {"message": "DLQ Item re-queued for processing", "dlq_number": d.dlq_number, "status": d.status}


@router.get("/alerts", response_model=List[SystemAlertResponse])
async def list_system_alerts(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    alerts = await EnterpriseOperationsService.list_alerts(db, tenant_id)
    return [
        SystemAlertResponse(
            public_id=a.public_id,
            alert_code=a.alert_code,
            severity=a.severity,
            component=a.component,
            message=a.message,
            status=a.status,
            created_date=a.created_date
        )
        for a in alerts
    ]


@router.post("/alerts/{id}/resolve")
async def resolve_system_alert(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    a = await EnterpriseOperationsService.resolve_alert(db, tenant_id, id, current_user)
    return {"message": "System Alert resolved successfully", "alert_code": a.alert_code, "status": a.status}


@router.get("/maintenance", response_model=MaintenanceStatusResponse)
async def get_maintenance_status(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseOperationsService.get_maintenance_status(db, tenant_id)


@router.post("/maintenance/toggle", response_model=MaintenanceStatusResponse)
async def toggle_maintenance_mode(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseOperationsService.toggle_maintenance_mode(db, tenant_id, current_user)
