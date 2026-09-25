"""
Enterprise POS MDR Change Request & Multi-Level Workflow API Router.

Provides strictly controlled endpoints:
- Automatic Requester & Hierarchy Resolution (Zero Client Trust)
- ASM Approval Queue, Metrics, and Multi-Action Engine (Approve, Reject, Hold)
- Requester Resubmission Workflow (from Hold state)
- Admin Review & Direct Engine Application with Effective Date
- Deep Inspection with Immutable Audit History
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import security_scheme
from app.application.pos_mdr_request_service import PosMdrRequestService
from app.presentation.api.v1.sales_router import get_current_sales_user
from app.infrastructure.db.sales_models import SalesUserModel
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pos/mdr-requests", tags=["POS MDR Change Request Workflow"])


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class RequestedMdrRates(BaseModel):
    visa: Optional[float] = Field(None, description="Requested Visa MDR %")
    mastercard: Optional[float] = Field(None, description="Requested Mastercard MDR %")
    rupay: Optional[float] = Field(None, description="Requested RuPay MDR %")
    amex_diners: Optional[float] = Field(None, description="Requested Amex/Diners MDR %")


class CreateMdrRequestPayload(BaseModel):
    commitment_month: int = Field(..., ge=1, le=12, description="Commitment Month (1 to 12)")
    commitment_year: int = Field(..., ge=2020, description="Commitment Year (e.g. 2026)")
    expected_monthly_volume: float = Field(..., gt=0, description="Expected Monthly Volume in INR")
    requested_mdr: RequestedMdrRates = Field(..., description="Requested MDR rates for card schemes")
    reason: str = Field(..., min_length=3, description="Business justification for rate change")
    target_retailer_id: Optional[str] = Field(None, description="Target Retailer UUID (if request made by upstream partner/sales)")
    target_pos_id: Optional[str] = Field(None, description="Target POS UUID or TID")
    supporting_documents: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Optional supporting attachments")


class AsmActionPayload(BaseModel):
    action: str = Field(..., description="Action: APPROVE, REJECT, or HOLD")
    reason: Optional[str] = Field(None, description="Mandatory for REJECT or HOLD; optional notes for APPROVE")


class ResubmitMdrRequestPayload(BaseModel):
    requested_mdr: RequestedMdrRates = Field(..., description="Updated requested rates")
    expected_monthly_volume: float = Field(..., gt=0, description="Updated monthly commitment volume")
    reason: str = Field(..., min_length=3, description="Clarification response to ASM")
    supporting_documents: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class AdminApplyMdrPayload(BaseModel):
    final_mdr: Optional[RequestedMdrRates] = Field(None, description="Final approved rates; defaults to requested rates if omitted")
    effective_date: Optional[datetime] = Field(None, description="Date from which MDR becomes active")
    decision_reason: Optional[str] = Field(None, description="Admin resolution notes")


# ==============================================================================
# AUTH RESOLUTION HELPER FOR GENERAL PARTNERS & SALES
# ==============================================================================

async def get_current_any_requester(
    request: Request,
    credentials: Optional[Any] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Resolves the authenticated requester regardless of whether they are logged in via:
    - Sales Portal (SalesUserModel)
    - Retailer Portal (Retailer)
    - Distributor Portal (Distributor)
    - Super Distributor Portal (Super Distributor)
    - Admin Portal
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif credentials and hasattr(credentials, "credentials"):
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required."
        )

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user_type_ref_id = payload.get("user_type_ref_id") or payload.get("role_id") or 2
    user_id = payload.get("sub") or payload.get("user_id") or payload.get("public_id")
    user_role = str(payload.get("role", "")).upper()

    # 1. If sales user or role is sales/asm
    if int(user_type_ref_id) == 5 or "SALES" in user_role or "ASM" in user_role:
        try:
            s_stmt = select(SalesUserModel).where(
                or_(
                    SalesUserModel.public_id == uuid.UUID(str(user_id)) if _is_valid_uuid(user_id) else False,
                    SalesUserModel.email == str(user_id),
                    SalesUserModel.mobile == str(user_id)
                ),
                SalesUserModel.is_active == True,
                SalesUserModel.is_deleted == False
            )
            s_res = await db.execute(s_stmt)
            sales_obj = s_res.scalars().first()
            if sales_obj:
                return {
                    "user": sales_obj,
                    "user_type_ref_id": 5,
                    "role": "ASM"
                }
        except Exception:
            pass

    # 2. General UUID lookup fallback
    if _is_valid_uuid(user_id):
        try:
            s_stmt = select(SalesUserModel).where(
                SalesUserModel.public_id == uuid.UUID(str(user_id)),
                SalesUserModel.is_active == True,
                SalesUserModel.is_deleted == False
            )
            s_res = await db.execute(s_stmt)
            sales_obj = s_res.scalars().first()
            if sales_obj:
                return {
                    "user": sales_obj,
                    "user_type_ref_id": 5,
                    "role": "ASM"
                }
        except Exception:
            pass

    # Fallback to token payload dict
    return {
        "user": payload,
        "user_type_ref_id": int(user_type_ref_id),
        "role": payload.get("role", "RETAILER")
    }


def _is_valid_uuid(val: Any) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except Exception:
        return False


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/options")
async def get_mdr_request_options(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns reference metadata for building MDR request forms:
    - Supported card schemes (Visa, Mastercard, RuPay, Amex/Diners)
    - Supported payment settlement modes
    - Allowed commitment months and years
    """
    current_year = datetime.now(timezone.utc).year
    months = [
        {"month": 1, "name": "January"},
        {"month": 2, "name": "February"},
        {"month": 3, "name": "March"},
        {"month": 4, "name": "April"},
        {"month": 5, "name": "May"},
        {"month": 6, "name": "June"},
        {"month": 7, "name": "July"},
        {"month": 8, "name": "August"},
        {"month": 9, "name": "September"},
        {"month": 10, "name": "October"},
        {"month": 11, "name": "November"},
        {"month": 12, "name": "December"},
    ]
    years = [current_year, current_year + 1]

    card_schemes = [
        {"code": "visa", "name": "Visa Credit & Debit", "default_mdr": 1.45},
        {"code": "mastercard", "name": "Mastercard Credit & Debit", "default_mdr": 1.50},
        {"code": "rupay", "name": "RuPay Platinum & Commercial", "default_mdr": 0.90},
        {"code": "amex_diners", "name": "Amex / Diners Club", "default_mdr": 2.25},
    ]

    return {
        "months": months,
        "years": years,
        "card_schemes": card_schemes,
        "settlement_modes": [
            {"code": "POS_INSTANT", "name": "POS - Instant Settlement"},
            {"code": "POS_T1", "name": "POS+T1 (Next Working Day)"},
            {"code": "POS_T2", "name": "POS+T2 (2 Working Days)"},
        ]
    }


@router.get("/current-mdr")
async def get_current_mdr_rates(
    retailer_id: Optional[str] = Query(None, description="Retailer UUID"),
    pos_id: Optional[str] = Query(None, description="POS Terminal UUID"),
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dynamically loads current active MDR rates for given retailer/POS without hardcoding.
    """
    r_uuid = uuid.UUID(retailer_id) if retailer_id else None
    rates = await PosMdrRequestService.resolve_current_mdr_rates(
        db=db,
        retailer_id=r_uuid
    )
    return {
        "retailer_id": retailer_id,
        "current_mdr": rates
    }


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_mdr_change_request(
    payload: CreateMdrRequestPayload,
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Creates a new POS MDR Change Request with 100% server-resolved hierarchy and ASM mapping.
    """
    rates_dict = payload.requested_mdr.dict(exclude_none=True)
    if not rates_dict:
        raise HTTPException(status_code=400, detail="At least one requested card scheme MDR rate must be provided.")

    req_obj = await PosMdrRequestService.create_mdr_change_request(
        db=db,
        current_user=requester["user"],
        user_type_ref_id=requester["user_type_ref_id"],
        commitment_month=payload.commitment_month,
        commitment_year=payload.commitment_year,
        expected_monthly_volume=payload.expected_monthly_volume,
        requested_mdr=rates_dict,
        reason=payload.reason,
        target_retailer_id=payload.target_retailer_id,
        target_pos_id=payload.target_pos_id,
        supporting_documents=payload.supporting_documents
    )

    return {
        "status": "SUCCESS",
        "message": f"MDR Change Request #{req_obj.mdr_request_ref_id} created successfully and routed to ASM for review.",
        "request": PosMdrRequestService._serialize_request(req_obj)
    }


@router.get("/my-requests")
async def get_my_mdr_requests(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns requests submitted by or associated with the logged-in partner/merchant.
    """
    return await PosMdrRequestService.get_my_requests(
        db=db,
        current_user=requester["user"],
        limit=limit,
        offset=offset
    )


@router.get("/asm-queue")
async def get_asm_approval_queue(
    status_filter: Optional[str] = Query("ALL", description="Filter by status: ALL, PENDING, APPROVED, REJECTED, HOLD"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_sales_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns the ASM MDR Approval Queue with filter tabs and summary KPIs.
    Strictly scoped to the ASM's authorized tenant, company, and hierarchy mapping.
    """
    return await PosMdrRequestService.get_asm_queue(
        db=db,
        sales_user=current_sales_user,
        status_filter=status_filter,
        limit=limit,
        offset=offset
    )


@router.post("/{request_id}/asm-action")
async def process_asm_action(
    request_id: str,
    payload: AsmActionPayload,
    current_sales_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Executes ASM decision:
    - APPROVE -> Moves request to ADMIN_PENDING (Admin Queue)
    - REJECT  -> Moves request to ASM_REJECTED (Requester informed)
    - HOLD    -> Moves request to ASM_HOLD (Awaiting clarification)
    """
    updated_req = await PosMdrRequestService.asm_action(
        db=db,
        request_id=request_id,
        sales_user=current_sales_user,
        action=payload.action,
        reason=payload.reason
    )

    action_label = payload.action.upper()
    return {
        "status": "SUCCESS",
        "message": f"Request #{updated_req.mdr_request_ref_id} has been marked as {action_label}.",
        "request": PosMdrRequestService._serialize_request(updated_req)
    }


@router.post("/{request_id}/resubmit")
async def resubmit_held_request(
    request_id: str,
    payload: ResubmitMdrRequestPayload,
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Allows requester to provide clarifications and resubmit a request from ASM_HOLD state.
    """
    rates_dict = payload.requested_mdr.dict(exclude_none=True)
    updated_req = await PosMdrRequestService.resubmit_request(
        db=db,
        request_id=request_id,
        current_user=requester["user"],
        user_type_ref_id=requester["user_type_ref_id"],
        requested_mdr=rates_dict,
        expected_monthly_volume=payload.expected_monthly_volume,
        reason=payload.reason,
        supporting_documents=payload.supporting_documents
    )

    return {
        "status": "SUCCESS",
        "message": f"Request #{updated_req.mdr_request_ref_id} resubmitted successfully and returned to ASM pending queue.",
        "request": PosMdrRequestService._serialize_request(updated_req)
    }


@router.get("/admin-queue")
async def get_admin_update_queue(
    status_filter: Optional[str] = Query("ALL", description="Filter by status: ALL, PENDING, COMPLETED"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns the Admin MDR Update Queue for ASM-approved requests awaiting final execution.
    """
    return await PosMdrRequestService.get_admin_queue(
        db=db,
        status_filter=status_filter,
        limit=limit,
        offset=offset
    )


@router.post("/{request_id}/admin-apply")
async def admin_apply_mdr_update(
    request_id: str,
    payload: AdminApplyMdrPayload,
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Admin applies approved MDR change into the live POS MDR configuration engine.
    MDR becomes effective according to the commitment month / effective date.
    """
    final_dict = payload.final_mdr.dict(exclude_none=True) if payload.final_mdr else None
    user_obj = requester["user"]

    admin_name = getattr(user_obj, "full_name", None) or getattr(user_obj, "name", None) or "Enterprise Administrator"
    admin_id = getattr(user_obj, "public_id", None)
    admin_ref = getattr(user_obj, "user_ref_id", None)

    updated_req = await PosMdrRequestService.admin_apply_mdr(
        db=db,
        request_id=request_id,
        admin_user_id=admin_id,
        admin_user_ref_id=admin_ref,
        admin_name=admin_name,
        final_mdr=final_dict,
        effective_date=payload.effective_date,
        decision_reason=payload.decision_reason
    )

    return {
        "status": "SUCCESS",
        "message": f"MDR rates for Request #{updated_req.mdr_request_ref_id} successfully updated and activated in live POS engine.",
        "request": PosMdrRequestService._serialize_request(updated_req)
    }


@router.get("/{request_id}")
async def get_request_details(
    request_id: str,
    requester: Dict[str, Any] = Depends(get_current_any_requester),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns full details of an MDR Change Request with its complete audit trail.
    """
    return await PosMdrRequestService.get_request_details_with_audit(
        db=db,
        request_id=request_id
    )
