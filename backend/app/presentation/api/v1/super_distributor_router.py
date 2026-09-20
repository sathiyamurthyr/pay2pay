"""
Enterprise Super Distributor (Master Distributor) API Router.

All routes require an authenticated Super Distributor session.
Authorization is enforced via:
  1. JWT token containing super_distributor_ref_id (user_type_ref_id=4)
  2. Backend resolves SD from database (never from localStorage or request body)
  3. All data access is scoped to mapped distributor_ref_ids only
  4. IDOR protection on all distributor-specific routes

Prefix: /super-distributor
Tags:   [Super Distributor (Master Distributor)]
"""

import uuid
import logging
from typing import Optional
from datetime import timedelta

from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import get_db
from app.core.security import decode_access_token
from app.infrastructure.db.models import SuperDistributorModel
from app.application.super_distributor_service import SuperDistributorService

logger = logging.getLogger("super_distributor_router")

router = APIRouter(
    prefix="/super-distributor",
    tags=["Super Distributor (Master Distributor)"]
)

security_scheme = HTTPBearer(auto_error=False)


# ─── DEPENDENCY: Resolve Authenticated SD from JWT ───────────────────────────

async def get_current_super_distributor(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials=Depends(security_scheme),
) -> SuperDistributorModel:
    """
    Resolves the authenticated Super Distributor from the JWT access token.

    Flow:
      1. Extract Bearer token from Authorization header or cookie
      2. Decode JWT → extract super_distributor_ref_id, user_type_ref_id
      3. Validate role == SUPER_DISTRIBUTOR (user_type_ref_id == 4)
      4. Resolve SuperDistributorModel from DB by ref_id/sub
      5. Return model for use in route handlers

    Never trusts request body or localStorage for authorization.
    """
    # 1. Extract token
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        for cookie_name in ["p2p_access_token", "pay2pay_access_token", "pay2pay_auth_token"]:
            token = request.cookies.get(cookie_name)
            if token:
                break

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required."
        )

    # 2. Decode JWT
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        ) from exc

    # 3. Validate role
    roles = payload.get("roles", [])
    user_type_ref_id = payload.get("user_type_ref_id")

    is_super_dist = (
        "SUPER_DISTRIBUTOR" in roles
        or user_type_ref_id == 4
    )
    if not is_super_dist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Master Distributor accounts only."
        )

    # 4. Resolve SD from DB (authoritative — never from JWT payload alone)
    sd_ref_id = payload.get("super_distributor_ref_id") or payload.get("sd_ref_id")
    sub = payload.get("sub")
    mobile = payload.get("mobile")

    sd = None

    # Try by ref_id first
    if sd_ref_id:
        try:
            sd = await SuperDistributorService.resolve_by_ref_id(db, int(sd_ref_id))
        except Exception:
            pass

    # Fall back to public_id (sub)
    if not sd and sub:
        try:
            sd = await SuperDistributorService.resolve_by_public_id(db, uuid.UUID(str(sub)))
        except Exception:
            pass

    # Fall back to mobile
    if not sd and mobile:
        try:
            sd = await SuperDistributorService.resolve_by_mobile(db, str(mobile))
        except Exception:
            pass

    if not sd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated Master Distributor account not found. Please login again."
        )

    if sd.status not in ("ACTIVE",) or not sd.is_active or sd.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your Master Distributor account is not active. Please contact Admin."
        )

    return sd


# ─── REQUEST SCHEMAS ──────────────────────────────────────────────────────────

class OnboardDistributorRequest(BaseModel):
    """Request payload to onboard a new Distributor under this SD."""
    business_name: str = Field(..., min_length=2, max_length=255, description="Distributor business / shop name")
    owner_name: str = Field(..., min_length=2, max_length=255, description="Owner / authorized person full name")
    mobile: str = Field(..., min_length=10, max_length=15, description="Mobile number (10-digit, no country code)")
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=8, max_length=64, description="Initial login password (min 8 chars)")
    state: str = Field(..., description="State")
    city: str = Field(..., description="City")
    address: str = Field(..., description="Full address")
    pincode: str = Field(..., min_length=6, max_length=10, description="PIN code")
    gst_number: Optional[str] = Field(None, description="GST number (optional)")
    pan_number: Optional[str] = Field(None, description="PAN number (optional)")
    bank_account_number: Optional[str] = Field(None, description="Bank account number (optional)")
    ifsc: Optional[str] = Field(None, description="IFSC code (optional)")
    credit_limit: Optional[float] = Field(100000.0, description="Credit limit in INR (default: 1,00,000)")


class SetMdrRequest(BaseModel):
    """Request payload to set MDR configuration for a mapped distributor."""
    distributor_ref_id: int = Field(..., description="Distributor ref_id (must be mapped to this SD)")
    payment_mode: str = Field(..., description="Payment mode (e.g. IMPS, NEFT, UPI)")
    mdr: float = Field(..., ge=0.0, le=10.0, description="MDR rate in percentage (0.00 to 10.00)")
    mdr_type: str = Field("PERCENTAGE", description="MDR type (PERCENTAGE / FLAT)")
    gst_rate: float = Field(18.0, ge=0.0, le=100.0, description="GST rate in percentage (default: 18)")
    service_name: str = Field("POS_TOPUP", description="Service name (default: POS_TOPUP)")


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.get("/dashboard", summary="Super Distributor Dashboard KPIs")
async def get_dashboard(
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated KPIs for the authenticated Super Distributor.
    Data is strictly scoped to this SD's mapped distributors only.
    """
    data = await SuperDistributorService.get_dashboard_stats(db=db, sd=sd)
    return {"success": True, "data": data}


@router.get("/profile", summary="Super Distributor Profile")
async def get_profile(
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """Returns the authenticated SD's own profile details."""
    data = await SuperDistributorService.get_profile(db=db, sd=sd)
    return {"success": True, "data": data}


@router.get("/distributors", summary="List Mapped Distributors")
async def list_distributors(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    search: Optional[str] = Query(None, description="Search by name, mobile, email, code"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PENDING, SUSPENDED)"),
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated list of distributors mapped to this Super Distributor.
    Never returns distributors belonging to other SDs.
    """
    data = await SuperDistributorService.list_mapped_distributors(
        db=db, sd=sd,
        page=page, page_size=page_size,
        search=search, status_filter=status
    )
    return {"success": True, **data}


@router.get("/distributors/{distributor_ref_id}", summary="Distributor Detail")
async def get_distributor_detail(
    distributor_ref_id: int,
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full detail of a specific distributor.
    IDOR protected: raises 403 if distributor is not mapped to this SD.
    """
    data = await SuperDistributorService.get_distributor_detail(
        db=db, sd=sd, distributor_ref_id=distributor_ref_id
    )
    return {"success": True, "data": data}


@router.post("/distributors", summary="Onboard New Distributor", status_code=201)
async def onboard_distributor(
    req: OnboardDistributorRequest,
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new Distributor and automatically maps it to the authenticated SD.
    The SD association is derived from the authenticated session (never from request body).
    Initial status = PENDING (requires Admin approval before activation).
    """
    data = await SuperDistributorService.onboard_distributor(
        db=db, sd=sd,
        business_name=req.business_name,
        owner_name=req.owner_name,
        mobile=req.mobile,
        email=req.email,
        password=req.password,
        state=req.state,
        city=req.city,
        address=req.address,
        pincode=req.pincode,
        gst_number=req.gst_number,
        pan_number=req.pan_number,
        bank_account_number=req.bank_account_number,
        ifsc=req.ifsc,
        credit_limit=req.credit_limit or 100000.0,
    )
    return {"success": True, "data": data, "message": data.get("message", "Distributor created")}


@router.get("/mdr", summary="MDR Configurations for Mapped Distributors")
async def get_mdr_configurations(
    distributor_ref_id: Optional[int] = Query(None, description="Filter by distributor ref_id"),
    payment_mode: Optional[str] = Query(None, description="Filter by payment mode"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns MDR configurations for this SD's mapped distributors.
    If distributor_ref_id is provided, performs IDOR check.
    """
    data = await SuperDistributorService.get_mdr_configurations(
        db=db, sd=sd,
        distributor_ref_id=distributor_ref_id,
        payment_mode=payment_mode,
        page=page, page_size=page_size
    )
    return {"success": True, **data}


@router.post("/mdr", summary="Set MDR for a Mapped Distributor")
async def set_mdr_configuration(
    req: SetMdrRequest,
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates or updates MDR configuration for a mapped distributor.
    IDOR protected: raises 403 if distributor is not mapped to this SD.
    """
    data = await SuperDistributorService.set_mdr_configuration(
        db=db, sd=sd,
        distributor_ref_id=req.distributor_ref_id,
        payment_mode=req.payment_mode,
        mdr=req.mdr,
        mdr_type=req.mdr_type,
        gst_rate=req.gst_rate,
        service_name=req.service_name
    )
    return {"success": True, "data": data, "message": "MDR configuration saved successfully."}


@router.get("/transactions", summary="Transaction Report (Mapped Distributors)")
async def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    distributor_ref_id: Optional[int] = Query(None, description="Filter by specific distributor (must be mapped)"),
    status: Optional[str] = Query(None, description="Filter by status (SUCCESS, FAILED, PENDING)"),
    date_from: Optional[str] = Query(None, description="Date from (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Date to (YYYY-MM-DD)"),
    txn_id: Optional[str] = Query(None, description="Search by transaction ID"),
    min_amount: Optional[float] = Query(None, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, description="Maximum amount filter"),
    service_name: Optional[str] = Query(None, description="Filter by service name"),
    sd: SuperDistributorModel = Depends(get_current_super_distributor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated transaction report scoped to this SD's mapped distributors.
    Never returns tenant-wide transactions.
    """
    data = await SuperDistributorService.get_transactions(
        db=db, sd=sd,
        page=page, page_size=page_size,
        distributor_ref_id=distributor_ref_id,
        status_filter=status,
        date_from=date_from, date_to=date_to,
        txn_id=txn_id,
        min_amount=min_amount, max_amount=max_amount,
        service_name=service_name
    )
    return {"success": True, **data}
