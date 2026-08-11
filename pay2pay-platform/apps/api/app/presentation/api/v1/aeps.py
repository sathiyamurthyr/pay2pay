"""EPIC-025 — Aadhaar Enabled Payment System (AEPS) Platform — API Router"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.aeps_service import AepsService
from app.application.aeps_dtos import (
    AepsTransferCreateRequest, AepsDeviceRegisterRequest, AepsSearchRequest
)

router = APIRouter(prefix="/aeps", tags=["Aadhaar Enabled Payment System (AEPS)"])


# ── Telemetry & Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_aeps_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get real-time AEPS telemetry metrics (Cash Withdrawals, Volume, Success Rates, Active Devices)."""
    metrics = await AepsService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Device Management ─────────────────────────────────────────────────────────

@router.post("/devices", response_model=APIResponse, status_code=201)
async def register_device(
    req: AepsDeviceRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Register biometric RD Service device (Mantra, Morpho, Startek, Cogent)."""
    device = await AepsService.register_device(db, req)
    return APIResponse(message="Device registered successfully", data=device.model_dump(mode="json"))


@router.get("/devices", response_model=APIResponse)
async def list_devices(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List registered biometric devices and their RD Service versions."""
    devices = await AepsService.list_devices(db)
    return APIResponse(data=[d.model_dump(mode="json") for d in devices])


# ── AEPS Banking Execution ───────────────────────────────────────────────────

@router.post("/transfers", response_model=APIResponse, status_code=201)
async def create_transfer(
    req: AepsTransferCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Execute AEPS Transaction (Cash Withdrawal, Balance Enquiry, Mini Statement, Cash Deposit)."""
    txn = await AepsService.create_transfer(db, req)
    return APIResponse(message="AEPS Transaction processed successfully", data=txn.model_dump(mode="json"))


@router.get("/transfers", response_model=APIResponse)
async def list_transfers(
    query: Optional[str] = Query(default=None),
    customer_id: Optional[uuid.UUID] = Query(default=None),
    retailer_id: Optional[uuid.UUID] = Query(default=None),
    service_type: Optional[str] = Query(default=None),
    transaction_status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Search & filter AEPS transaction history."""
    search_req = AepsSearchRequest(
        query=query, customer_id=customer_id, retailer_id=retailer_id,
        service_type=service_type, transaction_status=transaction_status,
        page=page, page_size=page_size
    )
    transfers = await AepsService.list_transfers(db, search_req)
    return APIResponse(data=[t.model_dump(mode="json") for t in transfers])
