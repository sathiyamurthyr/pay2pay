"""EPIC-022 — Beneficiary Management & Verification Platform — API Router"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.beneficiary_service import BeneficiaryService
from app.application.beneficiary_dtos import (
    BeneficiaryRegisterRequest, BeneficiaryUpdateRequest, BeneficiaryStatusChangeRequest,
    BankVerificationRequest, UpiVerificationRequest, BeneficiarySearchRequest
)

router = APIRouter(prefix="/beneficiaries", tags=["Beneficiary Management"])


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_beneficiary_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get real-time telemetry metrics for beneficiary management."""
    metrics = await BeneficiaryService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Beneficiary CRUD ──────────────────────────────────────────────────────────

@router.post("/", response_model=APIResponse, status_code=201)
async def register_beneficiary(
    req: BeneficiaryRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Register a new beneficiary under cooling period."""
    beneficiary = await BeneficiaryService.register_beneficiary(db, req)
    return APIResponse(message="Beneficiary registered successfully under cooling period", data=beneficiary.model_dump(mode="json"))


@router.get("/", response_model=APIResponse)
async def list_beneficiaries(
    query: Optional[str] = Query(default=None),
    customer_id: Optional[uuid.UUID] = Query(default=None),
    beneficiary_status: Optional[str] = Query(default=None),
    beneficiary_category: Optional[str] = Query(default=None),
    verification_status: Optional[str] = Query(default=None),
    risk_category: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Search & filter beneficiary records."""
    search_req = BeneficiarySearchRequest(
        query=query, customer_id=customer_id, beneficiary_status=beneficiary_status,
        beneficiary_category=beneficiary_category, verification_status=verification_status,
        risk_category=risk_category, page=page, page_size=page_size
    )
    beneficiaries = await BeneficiaryService.list_beneficiaries(db, search_req)
    return APIResponse(data=[b.model_dump(mode="json") for b in beneficiaries])


@router.get("/{beneficiary_id}", response_model=APIResponse)
async def get_beneficiary(
    beneficiary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get a specific beneficiary record."""
    beneficiary = await BeneficiaryService.get_beneficiary(db, beneficiary_id)
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    return APIResponse(data=beneficiary.model_dump(mode="json"))


@router.get("/{beneficiary_id}/360", response_model=APIResponse)
async def get_beneficiary_360(
    beneficiary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get full Beneficiary 360° Profile (Bank accounts, UPI, Penny Drop history, Risk, Timeline)."""
    b360 = await BeneficiaryService.get_beneficiary_360(db, beneficiary_id)
    if not b360:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    return APIResponse(data=b360.model_dump(mode="json"))


@router.patch("/{beneficiary_id}/status", response_model=APIResponse)
async def change_status(
    beneficiary_id: uuid.UUID,
    req: BeneficiaryStatusChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Update beneficiary status (ACTIVE, BLOCKED, SUSPENDED, CLOSED)."""
    beneficiary = await BeneficiaryService.update_status(db, beneficiary_id, req)
    return APIResponse(message="Status updated successfully", data=beneficiary.model_dump(mode="json"))


# ── Verification Endpoints ────────────────────────────────────────────────────

@router.post("/{beneficiary_id}/verify/bank", response_model=APIResponse)
async def verify_bank_account(
    beneficiary_id: uuid.UUID,
    req: BankVerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Trigger Penny Drop bank verification and fuzzy name matching."""
    res = await BeneficiaryService.verify_bank_account(db, beneficiary_id, req)
    return APIResponse(message="Bank verification completed", data=res.model_dump(mode="json"))


@router.post("/{beneficiary_id}/verify/upi", response_model=APIResponse)
async def verify_upi(
    beneficiary_id: uuid.UUID,
    req: UpiVerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Verify UPI ID and VPA handle."""
    res = await BeneficiaryService.verify_upi_id(db, beneficiary_id, req)
    return APIResponse(message="UPI ID verification completed", data=res.model_dump(mode="json"))
