import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    MachineCreateRequest, MachineResponse, MachineDetailsResponse,
    MachineTelemetryPingRequest, MachineDashboardMetricsResponse, PaginatedResponse
)
from app.application.services import MachineManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/machines", tags=["Swipe Machine (POS/EDC) Management (EPIC-005)"])


@router.post("", response_model=MachineResponse)
async def create_machine(
    req: MachineCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    m = await MachineManagementService.create_machine(db, tenant_id, req, current_user)
    return MachineResponse(
        public_id=m.public_id,
        tenant_id=m.tenant_id,
        company_id=m.company_id,
        serial_number=m.serial_number,
        tid=m.tid,
        mid=m.mid,
        pos_model=m.pos_model,
        machine_type=m.machine_type,
        os_version=m.os_version,
        firmware_version=m.firmware_version,
        sim_iccid=m.sim_iccid,
        telecom_provider=m.telecom_provider,
        status=m.status,
        mapped_retailer_id=m.mapped_retailer_id,
        version_no=m.version_no,
        created_date=m.created_date
    )


@router.get("", response_model=PaginatedResponse)
async def list_machines(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    retailer_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    machines, total = await MachineManagementService.list_machines(
        db, tenant_id, search=search, status=status, retailer_id=retailer_id, page=page, page_size=page_size
    )
    items = [
        {
            "public_id": str(m.public_id),
            "serial_number": m.serial_number,
            "tid": m.tid,
            "mid": m.mid,
            "pos_model": m.pos_model,
            "machine_type": m.machine_type,
            "status": m.status,
            "mapped_retailer_id": str(m.mapped_retailer_id) if m.mapped_retailer_id else None,
            "created_date": m.created_date
        }
        for m in machines
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/dashboard/metrics", response_model=MachineDashboardMetricsResponse)
async def get_machine_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await MachineManagementService.get_dashboard_metrics(db, tenant_id)


@router.get("/{machine_id}", response_model=MachineDetailsResponse)
async def get_machine_details(
    machine_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await MachineManagementService.get_machine_details(db, tenant_id, machine_id)


@router.post("/{machine_id}/telemetry")
async def process_telemetry_ping(
    machine_id: uuid.UUID,
    req: MachineTelemetryPingRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db)
):
    await MachineManagementService.process_telemetry_ping(db, tenant_id, machine_id, req)
    return {"status": "SUCCESS", "message": "Telemetry heartbeat logged cleanly"}
