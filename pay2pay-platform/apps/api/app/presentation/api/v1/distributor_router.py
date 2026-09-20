"""
Enterprise Distributor API Router.

Production-grade endpoints supporting:
- Distributor Dashboard & KPIs
- Distributor Wallet Balance
- Mapped Retailers (List & Detail)
- Retailer Invitation
- Top-Up Request Submission & History (Admin approval authority preserved)
- Retailer-Specific MDR Setup for Mapped Retailers Only
- Central Transaction History & Reports
- Active Services Discovery
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import get_db
from app.core.security import decode_access_token
from app.application.dependencies import security_scheme
from app.infrastructure.db.models import DistributorModel
from app.application.distributor_service import DistributorService
from app.application.pos_mdr_service import PosMdrService

router = APIRouter(prefix="/distributor", tags=["Distributor Portal Enterprise Suite"])


# ==============================================================================
# AUTH DEPENDENCY FOR DISTRIBUTOR
# ==============================================================================

async def get_current_distributor(
    request: Request,
    credentials: Optional[Any] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> DistributorModel:
    """
    Authoritative dependency to resolve authenticated Distributor session.
    Verifies JWT token signature and database identity.
    """
    token = None
    if credentials and getattr(credentials, "credentials", None):
        token = credentials.credentials
    elif request:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()
        else:
            token = (
                request.cookies.get("p2p_access_token")
                or request.cookies.get("pay2pay_access_token")
                or request.cookies.get("pay2pay_auth_token")
                or request.cookies.get("access_token")
            )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access the Distributor portal."
        )

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again."
        )

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials."
        )

    sub = payload.get("sub")
    mobile = payload.get("mobile") or payload.get("phone")
    d_ref_id = payload.get("distributor_ref_id") or payload.get("dist_ref_id")

    distributor = await DistributorService.resolve_distributor_by_identity(
        db=db,
        user_id_or_sub=str(sub) if sub else None,
        mobile=str(mobile) if mobile else None,
        distributor_ref_id=int(d_ref_id) if d_ref_id else None
    )

    if not distributor:
        # Check header x-distributor-ref-id or query
        h_ref = request.headers.get("x-distributor-ref-id") or request.query_params.get("distributor_ref_id")
        if h_ref and h_ref.isdigit():
            distributor = await DistributorService.resolve_distributor_by_identity(
                db=db, distributor_ref_id=int(h_ref)
            )

    if not distributor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Distributor identity could not be resolved from authoritative database."
        )

    if not distributor.is_active or distributor.status in ("SUSPENDED", "BLOCKED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Distributor account is restricted or inactive. Please contact system support."
        )

    return distributor


# ==============================================================================
# SCHEMAS
# ==============================================================================

class InviteRetailerRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15, description="Retailer 10-digit mobile number")
    retailer_name: Optional[str] = Field(None, description="Retailer Shop/Business name")
    retailer_email: Optional[str] = Field(None, description="Retailer email address")


class DistributorTopupRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Top-up requested amount in INR")
    payment_method: str = Field(default="BANK_TRANSFER", description="BANK_TRANSFER, UPI, IMPS, NEFT, RTGS")
    payment_reference: Optional[str] = Field(None, description="Bank Reference / UTR Number")
    payment_date: Optional[datetime] = Field(None, description="Payment timestamp")
    slip_id: Optional[str] = Field(None, description="Uploaded payment proof slip ID")
    slip_url: Optional[str] = Field(None, description="Uploaded slip URL")
    remarks: Optional[str] = Field(None, description="Optional distributor notes")


class DistributorMdrUpdateRequest(BaseModel):
    retailer_ref_id: int = Field(..., description="Mapped retailer reference ID")
    service_name: str = Field(..., description="Service name e.g. POS_TOPUP, DMT, RECHARGE")
    payment_mode: str = Field(..., description="Payment mode e.g. POS - Instant, POS+T1, POS+T2")
    mdr_rate: float = Field(..., ge=0, description="MDR rate (percentage or fixed)")
    mdr_type: Optional[str] = Field("PERCENTAGE", description="PERCENTAGE or FIXED")
    gst_rate: Optional[float] = Field(18.00, ge=0, description="GST rate percentage on MDR")


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/profile", summary="Get Authenticated Distributor Profile")
async def get_distributor_profile(
    distributor: DistributorModel = Depends(get_current_distributor)
):
    """Returns authenticated distributor profile details from authoritative database."""
    return {
        "success": True,
        "distributor": {
            "distributor_ref_id": distributor.distributor_ref_id or distributor.id,
            "distributor_code": distributor.distributor_code,
            "business_name": distributor.business_name,
            "owner_name": distributor.owner_name,
            "mobile": distributor.mobile,
            "email": distributor.email,
            "gst_number": distributor.gst_number,
            "pan_number": distributor.pan_number,
            "state": distributor.state,
            "city": distributor.city,
            "address": distributor.address,
            "pincode": distributor.pincode,
            "status": distributor.status,
            "is_active": distributor.is_active,
            "created_date": distributor.created_date.isoformat() if distributor.created_date else None
        }
    }


@router.get("/wallet", summary="Get Distributor Wallet Balance")
async def get_distributor_wallet(
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authoritative Distributor wallet balance directly from dist_wallet table.
    Zero hardcoded values.
    """
    wallet = await DistributorService.get_or_create_wallet(db, distributor)
    return {
        "success": True,
        "wallet": {
            "dist_wallet_ref_id": wallet.dist_wallet_ref_id,
            "distributor_ref_id": wallet.distributor_ref_id,
            "available_balance": float(wallet.balance),
            "currency": wallet.currency,
            "status": wallet.status,
            "is_active": wallet.is_active,
            "is_frozen": wallet.is_frozen,
            "freeze_reason": wallet.freeze_reason,
            "updated_at": wallet.updated_at.isoformat()
        }
    }


@router.get("/dashboard", summary="Distributor Dashboard & KPI Aggregation")
async def get_distributor_dashboard(
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Provides aggregated dashboard metrics for Distributor:
    - Wallet balance
    - Mapped retailers breakdown (Total, Active, Pending, Inactive)
    - Business volume & service breakdown
    - Top-up requests status overview
    - MDR configured retailers count
    """
    data = await DistributorService.get_dashboard_summary(db, distributor)
    return {
        "success": True,
        "data": data
    }


@router.get("/retailers", summary="List Mapped Retailers")
async def list_mapped_retailers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term (name, mobile, code)"),
    status: Optional[str] = Query("ALL", description="Status filter (ACTIVE, PENDING_APPROVAL, etc.)"),
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists only retailers mapped to this Distributor with server-side pagination & filtering.
    """
    result = await DistributorService.list_mapped_retailers(
        db=db,
        distributor=distributor,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status
    )
    return {
        "success": True,
        **result
    }


@router.get("/retailers/{retailer_ident}", summary="Get Mapped Retailer Details")
async def get_mapped_retailer_detail(
    retailer_ident: str,
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches full profile, wallet, MDR, and recent transactions of an individual mapped retailer.
    Enforces server-side authorization: Rejects if retailer is not mapped to this distributor.
    """
    data = await DistributorService.get_mapped_retailer_detail(
        db=db,
        distributor=distributor,
        retailer_ident=retailer_ident
    )
    return {
        "success": True,
        "data": data
    }


@router.post("/retailers/invite", summary="Invite New Retailer")
async def invite_retailer(
    req: InviteRetailerRequest,
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a secure onboarding invitation code for a prospective retailer.
    Preserves existing Retailer onboarding and approval workflow.
    """
    res = await DistributorService.invite_retailer(
        db=db,
        distributor=distributor,
        mobile_number=req.mobile_number,
        retailer_name=req.retailer_name,
        retailer_email=req.retailer_email
    )
    return res


@router.get("/topup", summary="List Distributor Top-up Requests")
@router.get("/topup/requests", summary="List Distributor Top-up Requests")
async def list_distributor_topup_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query("ALL"),
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists top-up requests submitted by this Distributor with status and Admin notes.
    Distributor does NOT have approval authority.
    """
    res = await DistributorService.list_topup_requests(
        db=db,
        distributor=distributor,
        page=page,
        page_size=page_size,
        status_filter=status
    )
    return {
        "success": True,
        **res
    }


@router.post("/topup", summary="Submit Distributor Top-up Request")
@router.post("/topup/requests", summary="Submit Distributor Top-up Request")
async def submit_distributor_topup_request(
    req: DistributorTopupRequest,
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a wallet top-up request for Admin approval.
    Distributor cannot self-approve.
    """
    res = await DistributorService.create_topup_request(
        db=db,
        distributor=distributor,
        amount=req.amount,
        payment_method=req.payment_method,
        payment_reference=req.payment_reference,
        payment_date=req.payment_date,
        slip_id=req.slip_id,
        slip_url=req.slip_url,
        remarks=req.remarks
    )
    return res


@router.get("/mdr", summary="Get Mapped Retailer MDR Configurations")
async def get_distributor_mdr(
    retailer_ref_id: Optional[int] = Query(None, description="Optional retailer reference ID filter"),
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Loads MDR configurations for retailers mapped to this Distributor.
    """
    configs = await DistributorService.get_distributor_mdr_configs(
        db=db,
        distributor=distributor,
        retailer_ref_id=retailer_ref_id
    )
    return {
        "success": True,
        "configurations": configs
    }


@router.post("/mdr", summary="Configure MDR for Mapped Retailer")
async def configure_distributor_mdr(
    req: DistributorMdrUpdateRequest,
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates MDR configuration for a specific mapped retailer.
    Security: Backend strictly validates that the retailer is mapped to this distributor.
    """
    res = await DistributorService.configure_distributor_mdr(
        db=db,
        distributor=distributor,
        retailer_ref_id=req.retailer_ref_id,
        service_name=req.service_name,
        payment_mode=req.payment_mode,
        mdr_rate=req.mdr_rate,
        mdr_type=req.mdr_type or "PERCENTAGE",
        gst_rate=req.gst_rate if req.gst_rate is not None else 18.00
    )
    return res


@router.get("/services", summary="Get Active Platform Services")
async def get_active_services(
    db: AsyncSession = Depends(get_db)
):
    """Returns active platform services and POS payment modes from existing service master."""
    res = await db.execute(text("SELECT out_service_code, out_service_name, out_is_enabled FROM sp_get_all_platform_services_status();"))
    rows = res.fetchall()
    pos_modes = await PosMdrService.get_active_payment_modes(db)
    return {
        "success": True,
        "services": [
            {"code": r[0], "name": r[1], "is_enabled": bool(r[2])}
            for r in rows
        ],
        "active_pos_modes": pos_modes
    }


@router.get("/transactions", summary="List Distributor Financial Transactions")
async def list_distributor_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service_name: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None, description="DEBIT or CREDIT"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches financial transactions for this Distributor from the central transactions table.
    Uses existing common transaction architecture: user_ref_id + usertype_ref_id.
    """
    res = await DistributorService.list_transactions(
        db=db,
        distributor=distributor,
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
        service_name=service_name,
        entry_type=entry_type
    )
    return {
        "success": True,
        **res
    }


@router.get("/business", summary="Get Consolidated Business Analytics")
async def get_business_analytics(
    distributor: DistributorModel = Depends(get_current_distributor),
    db: AsyncSession = Depends(get_db)
):
    dash = await DistributorService.get_dashboard_summary(db=db, distributor=distributor)
    ret_res = await DistributorService.list_mapped_retailers(db=db, distributor=distributor, page=1, page_size=100)
    return {
        "success": True,
        "data": {
            "overall_business": dash.get("business", {}),
            "service_breakdown": dash.get("services", []),
            "retailer_breakdown": ret_res.get("data", [])
        }
    }
