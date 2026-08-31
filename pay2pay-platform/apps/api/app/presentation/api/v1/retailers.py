import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    RetailerOnboardCreateRequest, RetailerResponse, RetailerDetailsResponse,
    RetailerApprovalRequest, RetailerDashboardMetricsResponse, PaginatedResponse,
    RetailerHierarchyMapRequest
)
from app.application.services import RetailerManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

from app.application.retailer_duplicate_validation_service import (
    RetailerDuplicateValidationService, DuplicateRetailerException
)

router = APIRouter(prefix="/retailers", tags=["Retailer Management (EPIC-004)"])


@router.get("/hierarchy-options")
async def get_retailer_hierarchy_options(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await RetailerManagementService.get_hierarchy_options(db, tenant_id)


class ValidateDuplicateRequest(BaseModel):
    field: str
    value: str
    exclude_retailer_id: Optional[uuid.UUID] = None


class ValidateDuplicateResponse(BaseModel):
    success: bool
    valid: bool
    field: str
    message: Optional[str] = None


@router.post("/validate-duplicate", response_model=ValidateDuplicateResponse)
async def validate_retailer_duplicate_field(
    req: ValidateDuplicateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    company_id = current_user.company_id if hasattr(current_user, "company_id") and current_user.company_id else tenant_id
    is_dup, err_msg = await RetailerDuplicateValidationService.check_duplicate_field(
        db=db,
        tenant_id=tenant_id,
        company_id=company_id,
        field_name=req.field,
        raw_value=req.value,
        exclude_retailer_id=req.exclude_retailer_id,
        user_id=current_user.public_id if hasattr(current_user, "public_id") else None,
        user_email=current_user.email if hasattr(current_user, "email") else None,
        attempt_type="REALTIME_CHECK"
    )
    if is_dup:
        raise DuplicateRetailerException(field=req.field, message=err_msg or "Duplicate value detected.")
    return ValidateDuplicateResponse(success=True, valid=True, field=req.field)


@router.post("", response_model=RetailerResponse)
async def onboard_retailer(
    req: RetailerOnboardCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    company_id = current_user.company_id if hasattr(current_user, "company_id") and current_user.company_id else tenant_id
    
    # Extract fields from nested DTOs if available
    mobile = getattr(req.contact, "mobile", None) if hasattr(req, "contact") else None
    email = getattr(req.contact, "email", None) if hasattr(req, "contact") else None
    pan = getattr(req.kyc, "pan_number", None) if hasattr(req, "kyc") else None
    gst = getattr(req.kyc, "gst_number", None) if hasattr(req, "kyc") else None
    aadhaar = getattr(req.kyc, "aadhaar_number", None) if hasattr(req, "kyc") else None
    bank_acc = getattr(req.bank, "account_number", None) if hasattr(req, "bank") else None
    upi = getattr(req.bank, "upi_id", None) if hasattr(req, "bank") else None

    # Enforce enterprise multi-tenant scoped duplicate validation
    await RetailerDuplicateValidationService.validate_all_retailer_fields(
        db=db,
        tenant_id=tenant_id,
        company_id=company_id,
        mobile_number=mobile,
        pan_number=pan,
        aadhaar_number=aadhaar,
        bank_account_number=bank_acc,
        gst_number=gst,
        email_address=email,
        upi_id=upi,
        user_id=current_user.public_id if hasattr(current_user, "public_id") else None,
        user_email=current_user.email if hasattr(current_user, "email") else None,
        attempt_type="CREATE"
    )

    r = await RetailerManagementService.onboard_retailer(db, tenant_id, req, current_user)
    return RetailerResponse(
        public_id=r.public_id,
        tenant_id=r.tenant_id,
        company_id=r.company_id,
        retailer_code=r.retailer_code,
        store_name=r.store_name,
        legal_name=r.legal_name,
        owner_name=r.owner_name,
        business_category=r.business_category,
        store_type=r.store_type,
        status=r.status,
        mapped_distributor_id=r.mapped_distributor_id,
        version_no=r.version_no,
        created_date=r.created_date
    )


@router.get("/approved")
async def list_approved_retailers(
    search: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns only Approved and Active retailers loaded via SP / database.
    """
    comp_uuid = None
    if company_id:
        try:
            comp_uuid = uuid.UUID(str(company_id).strip())
        except Exception:
            pass

    try:
        from sqlalchemy import text
        sp_query = text("""
            SELECT id, public_id, retailer_code, store_name, legal_name, owner_name,
                   business_category, registered_mobile, email, status, wallet_balance,
                   company_id, tenant_id, created_date
            FROM public.get_approved_retailers_list(:search, :comp_id)
        """)
        res = await db.execute(sp_query, {"search": search or None, "comp_id": comp_uuid})
        rows = res.fetchall()
        items = [
            {
                "id": r.id,
                "public_id": str(r.public_id),
                "retailer_code": r.retailer_code,
                "store_name": r.store_name,
                "legal_name": r.legal_name,
                "owner_name": r.owner_name,
                "business_category": r.business_category,
                "registered_mobile": r.registered_mobile,
                "email": r.email,
                "status": r.status,
                "wallet_balance": float(r.wallet_balance) if r.wallet_balance is not None else 0.0,
                "company_id": str(r.company_id) if r.company_id else None,
                "tenant_id": str(r.tenant_id) if r.tenant_id else None,
                "created_date": r.created_date.isoformat() if r.created_date else None
            }
            for r in rows
        ]
        return {"items": items, "total": len(items)}
    except Exception:
        from app.infrastructure.db.models import RetailerModel
        from sqlalchemy import select
        stmt = select(RetailerModel).where(
            RetailerModel.is_deleted == False,
            RetailerModel.status.in_(["ACTIVE", "APPROVED"])
        ).order_by(RetailerModel.store_name.asc())
        res = await db.execute(stmt)
        items = [
            {
                "id": r.id,
                "public_id": str(r.public_id),
                "retailer_code": r.retailer_code,
                "store_name": r.store_name,
                "legal_name": r.legal_name,
                "owner_name": r.owner_name,
                "business_category": r.business_category,
                "registered_mobile": "",
                "status": r.status,
                "wallet_balance": 0.0,
                "company_id": str(r.company_id) if r.company_id else None,
                "tenant_id": str(r.tenant_id) if r.tenant_id else None,
                "created_date": r.created_date.isoformat() if r.created_date else None
            }
            for r in res.scalars().all()
        ]
        return {"items": items, "total": len(items)}


@router.get("", response_model=PaginatedResponse)
async def list_retailers(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    distributor_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    retailers, total = await RetailerManagementService.list_retailers(
        db, tenant_id, search=search, status=status, distributor_id=distributor_id, page=page, page_size=page_size
    )
    items = [
        {
            "public_id": str(r.public_id),
            "retailer_code": r.retailer_code,
            "store_name": r.store_name,
            "legal_name": r.legal_name,
            "owner_name": r.owner_name,
            "business_category": r.business_category,
            "status": r.status,
            "mapped_distributor_id": str(r.mapped_distributor_id) if r.mapped_distributor_id else None,
            "wallet_balance": float(r.wallet.wallet_balance) if getattr(r, "wallet", None) and r.wallet else 0.0,
            "wallet_id": str(r.wallet.public_id) if getattr(r, "wallet", None) and r.wallet else None,
            "created_date": r.created_date
        }
        for r in retailers
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/dashboard/metrics", response_model=RetailerDashboardMetricsResponse)
async def get_retailer_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await RetailerManagementService.get_dashboard_metrics(db, tenant_id)


@router.get("/{retailer_id}", response_model=RetailerDetailsResponse)
async def get_retailer_details(
    retailer_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await RetailerManagementService.get_retailer_details(db, tenant_id, retailer_id)


@router.post("/{retailer_id}/approve", response_model=RetailerResponse)
async def approve_retailer(
    retailer_id: uuid.UUID,
    req: RetailerApprovalRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    r = await RetailerManagementService.approve_retailer(db, tenant_id, retailer_id, req, current_user)
    return RetailerResponse(
        public_id=r.public_id,
        tenant_id=r.tenant_id,
        company_id=r.company_id,
        retailer_code=r.retailer_code,
        store_name=r.store_name,
        legal_name=r.legal_name,
        owner_name=r.owner_name,
        business_category=r.business_category,
        store_type=r.store_type,
        status=r.status,
        mapped_distributor_id=r.mapped_distributor_id,
        version_no=r.version_no,
        created_date=r.created_date
    )


class RetailerResetPasswordRequest(BaseModel):
    new_password: str


@router.post("/{retailer_id}/reset-password")
async def reset_retailer_password(
    retailer_id: uuid.UUID,
    req: RetailerResetPasswordRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return {"message": "Password updated successfully for Retailer", "retailer_id": str(retailer_id)}


@router.put("/{retailer_id}/hierarchy", response_model=RetailerDetailsResponse)
@router.post("/{retailer_id}/hierarchy", response_model=RetailerDetailsResponse)
async def map_retailer_hierarchy(
    retailer_id: uuid.UUID,
    req: RetailerHierarchyMapRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await RetailerManagementService.map_retailer_hierarchy(db, tenant_id, retailer_id, req, current_user)
