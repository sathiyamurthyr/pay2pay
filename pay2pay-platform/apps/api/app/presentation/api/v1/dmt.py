"""EPIC-024 — Domestic Money Transfer (DMT) Transaction Engine — API Router"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.dmt_service import DmtService
from app.application.dmt_dtos import (
    DmtChargeCalculateRequest, DmtTransferCreateRequest,
    DmtReversalRequest, DmtSearchRequest
)

router = APIRouter(prefix="/dmt", tags=["Domestic Money Transfer (DMT) Engine"])


# ── Telemetry & Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_dmt_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get real-time telemetry metrics for DMT transfers."""
    metrics = await DmtService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Fee & Commission Calculator ──────────────────────────────────────────────

@router.post("/transfers/calculate-charges", response_model=APIResponse)
async def calculate_charges(
    req: DmtChargeCalculateRequest,
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Calculate transfer charges, GST (18%), and retailer/distributor commission breakdown."""
    calc = DmtService.calculate_charges(req)
    return APIResponse(data=calc.model_dump())


# ── Transfer Processing Engine ────────────────────────────────────────────────

@router.post("/transfers", response_model=APIResponse, status_code=201)
async def create_transfer(
    req: DmtTransferCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Initiate and process a Domestic Money Transfer (IMPS/NEFT/RTGS)."""
    txn = await DmtService.create_transfer(db, req)
    return APIResponse(message="Transfer processed successfully", data=txn.model_dump(mode="json"))


@router.get("/transfers", response_model=APIResponse)
async def list_transfers(
    query: Optional[str] = Query(default=None),
    customer_id: Optional[uuid.UUID] = Query(default=None),
    beneficiary_id: Optional[uuid.UUID] = Query(default=None),
    retailer_id: Optional[uuid.UUID] = Query(default=None),
    transaction_status: Optional[str] = Query(default=None),
    transaction_mode: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Search & filter DMT transfer history."""
    search_req = DmtSearchRequest(
        query=query, customer_id=customer_id, beneficiary_id=beneficiary_id,
        retailer_id=retailer_id, transaction_status=transaction_status,
        transaction_mode=transaction_mode, page=page, page_size=page_size
    )
    transfers = await DmtService.list_transfers(db, search_req)
    return APIResponse(data=[t.model_dump(mode="json") for t in transfers])


@router.get("/transfers/{txn_id}", response_model=APIResponse)
async def get_transfer(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get single DMT transaction record."""
    txn = await DmtService.get_transfer(db, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return APIResponse(data=txn.model_dump(mode="json"))


# ── Reversal Engine ───────────────────────────────────────────────────────────

@router.post("/transfers/{txn_id}/reverse", response_model=APIResponse)
async def reverse_transfer(
    txn_id: uuid.UUID,
    req: DmtReversalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Reverse a DMT transaction and post reversal ledgers."""
    rev = await DmtService.reverse_transfer(db, txn_id, req)
    return APIResponse(message="Transaction reversed successfully", data=rev.model_dump(mode="json"))
