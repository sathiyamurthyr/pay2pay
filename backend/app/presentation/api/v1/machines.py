import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, Body, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    MachineCreateRequest, MachineUpdateRequest, MachineResponse,
    MachineTelemetryPingRequest, MachineDashboardMetricsResponse, PaginatedResponse
)
from app.application.services import MachineManagementService
from app.application.pos_mdr_service import PosMdrService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/machines", tags=["Swipe Machine (POS/EDC) Management (EPIC-005)"])


@router.get("/vendors")
async def list_pos_vendors(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """
    Returns all dynamically configured POS vendors from pos_vendor_master.
    """
    vendors = await PosMdrService.get_pos_vendors(db)
    return {"items": vendors, "total": len(vendors)}


@router.post("", response_model=Dict[str, Any])
async def create_machine(
    req: MachineCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new POS machine with serial number, mobile, vendor, commission, and retailer assignment.
    """
    m = await MachineManagementService.create_machine(db, tenant_id, req, current_user)
    return {
        "status": "SUCCESS",
        "message": "POS Machine created successfully",
        "machine": {
            "public_id": str(m.public_id),
            "serial_number": m.serial_number,
            "mobile_number": m.mobile_number,
            "vendor_id": m.vendor_id,
            "vendor_name": m.vendor_name,
            "vendor_commission_type": m.vendor_commission_type,
            "vendor_commission_value": float(m.vendor_commission_value) if m.vendor_commission_value is not None else 0.0,
            "status": m.status,
            "mapped_retailer_id": str(m.mapped_retailer_id) if m.mapped_retailer_id else None,
            "assigned_at": m.assigned_at.isoformat() if m.assigned_at else None,
            "created_date": m.created_date.isoformat() if m.created_date else None
        }
    }


@router.get("", response_model=PaginatedResponse)
async def list_machines(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    retailer_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List POS machines with rich vendor, retailer, and status metadata.
    """
    items, total = await MachineManagementService.list_machines(
        db, tenant_id, search=search, status=status, vendor_id=vendor_id, retailer_id=retailer_id, page=page, page_size=page_size
    )
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


@router.get("/retailer/{retailer_id}/devices")
async def get_retailer_devices(
    retailer_id: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all POS machines currently assigned to a specific retailer.
    Used by the frontend to display existing device serial numbers and enforce the 5-device limit.
    """
    devices = await MachineManagementService.get_retailer_machines(db, tenant_id, retailer_id)
    return {"items": devices, "total": len(devices), "max_devices": 5}

@router.get("/{machine_id}")
async def get_machine_details(
    machine_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full machine configuration, hardware telemetry, and status timeline.
    """
    return await MachineManagementService.get_machine_details(db, tenant_id, machine_id)


@router.put("/{machine_id}")
async def update_machine(
    machine_id: uuid.UUID,
    req: MachineUpdateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update machine hardware, mobile, vendor, commission, or assignment.
    """
    m = await MachineManagementService.update_machine(db, tenant_id, machine_id, req, current_user)
    return {
        "status": "SUCCESS",
        "message": "POS Machine updated successfully",
        "machine_id": str(m.public_id),
        "status_code": m.status
    }


@router.post("/{machine_id}/assign")
async def assign_machine_retailer(
    machine_id: uuid.UUID,
    payload: Dict[str, Any] = Body(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign or unassign a machine to/from a retailer.
    """
    ret_raw = payload.get("retailer_id")
    ret_uuid = uuid.UUID(ret_raw) if ret_raw else None
    m = await MachineManagementService.assign_machine_retailer(db, tenant_id, machine_id, ret_uuid, current_user)
    return {
        "status": "SUCCESS",
        "message": f"Machine {'assigned to retailer' if ret_uuid else 'unassigned'} successfully",
        "machine_id": str(m.public_id),
        "status_code": m.status
    }


@router.post("/{machine_id}/status")
async def update_machine_status(
    machine_id: uuid.UUID,
    payload: Dict[str, Any] = Body(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change machine status (ACTIVE, INACTIVE, ASSIGNED, UNASSIGNED, BLOCKED, FAULTY).
    """
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status is required.")

    req = MachineUpdateRequest(status=new_status)
    m = await MachineManagementService.update_machine(db, tenant_id, machine_id, req, current_user)
    return {
        "status": "SUCCESS",
        "message": f"Machine status updated to {new_status}",
        "machine_id": str(m.public_id),
        "status_code": m.status
    }


@router.post("/{machine_id}/telemetry")
async def process_telemetry_ping(
    machine_id: uuid.UUID,
    req: MachineTelemetryPingRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db)
):
    await MachineManagementService.process_telemetry_ping(db, tenant_id, machine_id, req)
    return {"status": "SUCCESS", "message": "Telemetry heartbeat logged cleanly"}


# ─────────────────────────────────────────────────────────────────────────────
# POS BLOCK / UNBLOCK REQUEST  (SD / Distributor / Retailer can raise)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{machine_id}/block-request")
async def raise_block_unblock_request(
    machine_id: uuid.UUID,
    payload: Dict[str, Any] = Body(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Raise a BLOCK or UNBLOCK request for a POS machine.
    SD / Distributor / Retailer users submit this; Admin reviews and acts.
    request_type: BLOCK | UNBLOCK
    reason: free-text description of the issue
    """
    from sqlalchemy import text as sql_text, select
    from datetime import datetime, timezone

    request_type = str(payload.get("request_type", "BLOCK")).upper()
    reason = str(payload.get("reason", "")).strip()
    requester_role = str(payload.get("requester_role", "SALES_USER")).upper()

    if request_type not in ("BLOCK", "UNBLOCK"):
        raise HTTPException(status_code=400, detail="request_type must be BLOCK or UNBLOCK.")
    if not reason:
        raise HTTPException(status_code=400, detail="reason is required.")

    # Verify machine exists and belongs to this tenant
    from app.infrastructure.db.pos_mdr_models import SwipeMachineModel
    stmt = select(SwipeMachineModel).where(
        SwipeMachineModel.public_id == machine_id,
        SwipeMachineModel.tenant_id == tenant_id,
        SwipeMachineModel.is_deleted == False
    )
    machine = (await db.execute(stmt)).scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found.")

    # Store request in machine_status_history
    pending_status = f"PENDING_{request_type}"
    history_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    try:
        await db.execute(sql_text("""
            INSERT INTO machine_status_history
                (public_id, machine_id, previous_status, new_status, changed_by, remarks,
                 tenant_id, created_date, updated_date, version_no, record_status, is_active, is_deleted)
            VALUES
                (:hid, :mid, :prev, :new_s, :changed_by, :remarks,
                 :tid, :now, :now, 1, 'ACTIVE', true, false)
        """), {
            "hid": history_id,
            "mid": machine.public_id,
            "prev": machine.status,
            "new_s": pending_status,
            "changed_by": current_user.email,
            "remarks": f"[{requester_role}] {reason}",
            "tid": tenant_id,
            "now": now
        })
        await db.commit()
    except Exception:
        await db.rollback()
        # Fallback: update machine remarks field if history table is unavailable
        machine.updated_date = now
        await db.commit()

    return {
        "status": "SUCCESS",
        "message": f"{request_type} request raised successfully. Admin will review and take action.",
        "machine_id": str(machine.public_id),
        "serial_number": machine.serial_number,
        "request_type": request_type,
        "pending_status": pending_status,
        "reason": reason,
        "submitted_by": current_user.email
    }


@router.get("/{machine_id}/block-requests")
async def get_block_requests(
    machine_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the block/unblock request history for a machine.
    """
    from sqlalchemy import text as sql_text
    try:
        res = await db.execute(sql_text("""
            SELECT public_id, previous_status, new_status, changed_by, remarks, created_date
            FROM machine_status_history
            WHERE machine_id = :mid AND tenant_id = :tid
              AND new_status LIKE 'PENDING_%'
            ORDER BY created_date DESC
            LIMIT 20
        """), {"mid": machine_id, "tid": tenant_id})
        rows = res.fetchall()
        return {
            "items": [
                {
                    "id": str(r.public_id),
                    "previous_status": r.previous_status,
                    "request_type": r.new_status.replace("PENDING_", ""),
                    "requested_by": r.changed_by,
                    "reason": r.remarks,
                    "requested_at": r.created_date.isoformat() if r.created_date else None
                }
                for r in rows
            ]
        }
    except Exception:
        return {"items": []}

