"""
Enterprise Sales Portal API Router.

Strictly tenant-isolated endpoints supporting:
- Dedicated Sales Login & Session Validation
- Sales Dashboard & Live Network KPIs
- Mapped Hierarchy Directories (Super Distributor, Distributor, Retailer, POS)
- Deep Retailer Profile with Hierarchy Chain, POS, and MDR setup
- Central Transactions Hub & POS Transaction Ledger with Multi-Filters
- POS Machine Management & Terminal Telemetry
- Dynamic POS MDR Setup (Visa, Mastercard, RuPay, Amex/Diners)
- Inactive Retailer Tracking (7-day, 30-day, POS inactive)
- Sales Performance & Activity Logger
- Tenant-Scoped Global Search
- Enterprise Reports Center
"""

import uuid
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.core.security import decode_access_token
from app.application.dependencies import security_scheme
from app.infrastructure.db.sales_models import SalesUserModel
from app.infrastructure.db.models import TenantModel, CompanyModel
from app.application.sales_service import SalesAuthService, SalesService
from sqlalchemy import select, desc

router = APIRouter(prefix="/sales", tags=["Sales Portal Enterprise Suite"])


# ==============================================================================
# AUTH DEPENDENCY FOR SALES PORTAL
# ==============================================================================

async def get_current_sales_user(
    request: Request,
    credentials: Optional[Any] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> SalesUserModel:
    """
    Authoritative dependency to resolve authenticated Sales User session.
    Strictly verifies JWT token and active status in tenant.
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
                request.cookies.get("pay2pay_sales_token")
                or request.cookies.get("p2p_sales_token")
                or request.cookies.get("p2p_access_token")
                or request.cookies.get("access_token")
            )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access the Sales Portal."
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again."
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session payload missing subject identifier."
        )

    try:
        user_uuid = uuid.UUID(sub)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in session."
        )

    stmt = select(SalesUserModel).where(
        SalesUserModel.public_id == user_uuid,
        SalesUserModel.is_deleted == False
    )
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sales user account not found."
        )

    if not user.is_active or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Sales user account is {user.status.lower()}. Please contact system support."
        )

    return user


# ==============================================================================
# SCHEMAS
# ==============================================================================

class SalesLoginRequest(BaseModel):
    identifier: Optional[str] = Field(None, description="Email, mobile number, username, or employee code")
    email: Optional[str] = Field(None, description="Email address fallback")
    username: Optional[str] = Field(None, description="Username fallback")
    password: str = Field(..., min_length=1, description="Account password")
    tenant_id: Optional[str] = Field(None, description="Optional tenant UUID hint")


class ConfigureMdrRequest(BaseModel):
    retailer_id: str = Field(..., description="Retailer UUID")
    payment_mode: str = Field(..., description="e.g. POS_INSTANT, POS_T1, POS_T2")
    mdr: float = Field(..., ge=0, description="MDR rate percentage or fixed amount")
    mdr_type: Optional[str] = Field("PERCENTAGE", description="PERCENTAGE or FIXED")
    gst_rate: Optional[float] = Field(0.0, ge=0, description="GST percentage on MDR")
    remarks: Optional[str] = Field(None)


class LogActivityRequest(BaseModel):
    activity_type: str = Field(..., description="RETAILER_VISIT, POS_ONBOARDING, INACTIVITY_FOLLOWUP, MDR_CONSULTATION, GENERAL_NOTE")
    subject: str = Field(..., description="Brief summary of activity")
    remarks: Optional[str] = Field(None)
    outcome: Optional[str] = Field("COMPLETED")
    retailer_id: Optional[str] = None
class LocationValidationRequest(BaseModel):
    latitude: float = Field(..., description="Device GPS Latitude")
    longitude: float = Field(..., description="Device GPS Longitude")
    accuracy: Optional[float] = Field(None, description="Accuracy in meters")
    expected_state: Optional[str] = None
    expected_pincode: Optional[str] = None


class SalesRegisterSuperDistributorRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., min_length=10, max_length=15)
    email: str = Field(..., min_length=5, max_length=255)
    pan_number: Optional[str] = Field(None, max_length=10)
    aadhaar_number: Optional[str] = Field(None, max_length=20)
    gst_number: Optional[str] = Field(None, max_length=15)
    bank_account_number: Optional[str] = Field(None, max_length=50)
    ifsc: Optional[str] = Field(None, max_length=11)
    credit_limit: Optional[float] = Field(0.0, ge=0)
    state: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5)
    pincode: str = Field(..., min_length=6, max_length=10)
    # KYC Documents (B2-backed URLs)
    pan_document_url: Optional[str] = None
    aadhaar_document_url: Optional[str] = None
    gst_certificate_url: Optional[str] = None
    bank_cheque_url: Optional[str] = None
    selfie_url: Optional[str] = None
    shop_photo_url: Optional[str] = None
    video_kyc_url: Optional[str] = None
    # GPS Geolocation & Image-Derived Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    exif_gps_available: Optional[bool] = False
    exif_latitude: Optional[float] = None
    exif_longitude: Optional[float] = None
    exif_altitude: Optional[float] = None
    exif_captured_at: Optional[str] = None
    exif_reverse_address: Optional[str] = None
    ocr_location_available: Optional[bool] = False
    ocr_raw_text: Optional[str] = None
    ocr_detected_address: Optional[str] = None
    ocr_detected_city: Optional[str] = None
    ocr_detected_state: Optional[str] = None
    ocr_detected_pincode: Optional[str] = None
    location_metadata: Optional[Dict[str, Any]] = None


class SalesRegisterDistributorRequest(BaseModel):
    mapped_super_distributor_id: str = Field(..., description="Parent Super Distributor UUID")
    business_name: str = Field(..., min_length=2, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., min_length=10, max_length=15)
    email: str = Field(..., min_length=5, max_length=255)
    pan_number: Optional[str] = Field(None, max_length=10)
    aadhaar_number: Optional[str] = Field(None, max_length=20)
    gst_number: Optional[str] = Field(None, max_length=15)
    bank_account_number: Optional[str] = Field(None, max_length=50)
    ifsc: Optional[str] = Field(None, max_length=11)
    credit_limit: Optional[float] = Field(0.0, ge=0)
    state: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5)
    pincode: str = Field(..., min_length=6, max_length=10)
    # KYC Documents (B2-backed URLs)
    pan_document_url: Optional[str] = None
    aadhaar_document_url: Optional[str] = None
    gst_certificate_url: Optional[str] = None
    bank_cheque_url: Optional[str] = None
    selfie_url: Optional[str] = None
    shop_photo_url: Optional[str] = None
    video_kyc_url: Optional[str] = None
    # GPS Geolocation & Image-Derived Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    exif_gps_available: Optional[bool] = False
    exif_latitude: Optional[float] = None
    exif_longitude: Optional[float] = None
    exif_altitude: Optional[float] = None
    exif_captured_at: Optional[str] = None
    exif_reverse_address: Optional[str] = None
    ocr_location_available: Optional[bool] = False
    ocr_raw_text: Optional[str] = None
    ocr_detected_address: Optional[str] = None
    ocr_detected_city: Optional[str] = None
    ocr_detected_state: Optional[str] = None
    ocr_detected_pincode: Optional[str] = None
    location_metadata: Optional[Dict[str, Any]] = None


class SalesRegisterRetailerRequest(BaseModel):
    mapped_distributor_id: str = Field(..., description="Parent Distributor UUID")
    store_name: str = Field(..., min_length=2, max_length=255)
    legal_name: Optional[str] = Field(None, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    business_category: Optional[str] = Field("General Store", max_length=100)
    store_type: Optional[str] = Field("BRICK_AND_MORTAR", max_length=50)
    mobile: str = Field(..., min_length=10, max_length=15)
    email: str = Field(..., min_length=5, max_length=255)
    website: Optional[str] = None
    state: str = Field(..., min_length=2, max_length=100)
    district: Optional[str] = None
    city: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5)
    pincode: str = Field(..., min_length=6, max_length=10)
    credit_limit: Optional[float] = Field(0.0, ge=0)
    # Bank Details
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    # KYC Details
    pan_number: Optional[str] = Field(None, max_length=10)
    gst_number: Optional[str] = Field(None, max_length=15)
    aadhaar_number: Optional[str] = Field(None, max_length=20)
    # KYC Documents (B2-backed URLs)
    pan_document_url: Optional[str] = None
    aadhaar_document_url: Optional[str] = None
    aadhaar_front_url: Optional[str] = None
    aadhaar_back_url: Optional[str] = None
    gst_certificate_url: Optional[str] = None
    business_proof_url: Optional[str] = None
    bank_cheque_url: Optional[str] = None
    selfie_url: Optional[str] = None
    shop_photo_url: Optional[str] = None
    video_kyc_url: Optional[str] = None
    # GPS Geolocation & Image-Derived Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    exif_gps_available: Optional[bool] = False
    exif_latitude: Optional[float] = None
    exif_longitude: Optional[float] = None
    exif_altitude: Optional[float] = None
    exif_captured_at: Optional[str] = None
    exif_reverse_address: Optional[str] = None
    ocr_location_available: Optional[bool] = False
    ocr_raw_text: Optional[str] = None
    ocr_detected_address: Optional[str] = None
    ocr_detected_city: Optional[str] = None
    ocr_detected_state: Optional[str] = None
    ocr_detected_pincode: Optional[str] = None
    location_metadata: Optional[Dict[str, Any]] = None


# ==============================================================================
# 1. AUTHENTICATION & PROFILE ENDPOINTS
# ==============================================================================

class SendWhatsAppOtpRequest(BaseModel):
    identifier: Optional[str] = Field(None, description="Mobile number, email, or employee code")
    mobile: Optional[str] = Field(None, description="Direct mobile number")


class VerifyWhatsAppOtpRequest(BaseModel):
    session_id: str = Field(..., description="Session ID from send-otp")
    otp: str = Field(..., min_length=4, max_length=8, description="6-digit WhatsApp OTP")


@router.post("/auth/login", tags=["Sales Authentication"])
async def sales_login(
    payload: SalesLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Dedicated Sales Portal login endpoint. Authenticates credentials and returns
    a tenant-scoped JWT token with sales user attributes.
    """
    login_id = payload.identifier or payload.email or payload.username
    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email or identifier is required to sign in."
        )
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return await SalesAuthService.authenticate(
        db=db,
        identifier=login_id,
        password=payload.password,
        tenant_id_hint=payload.tenant_id,
        ip_address=ip,
        user_agent=ua
    )


@router.post("/auth/whatsapp/send-otp", tags=["Sales Authentication"])
async def sales_send_whatsapp_otp(
    payload: SendWhatsAppOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatches a 6-digit authentication OTP via WhatsApp Cloud API.
    """
    ident = payload.identifier or payload.mobile
    ip = request.client.host if request.client else None
    return await SalesAuthService.send_whatsapp_otp(
        db=db,
        identifier=ident,
        ip_address=ip
    )


@router.post("/auth/whatsapp/verify-otp", tags=["Sales Authentication"])
async def sales_verify_whatsapp_otp(
    payload: VerifyWhatsAppOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies 6-digit WhatsApp OTP and returns authenticated session token.
    """
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return await SalesAuthService.verify_whatsapp_otp(
        db=db,
        session_id=payload.session_id,
        otp=payload.otp,
        ip_address=ip,
        user_agent=ua
    )


@router.get("/auth/me", tags=["Sales Authentication"])
@router.get("/auth/profile", tags=["Sales Authentication"])
async def get_sales_profile(
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the authenticated sales user's profile and assigned tenant scope.
    """
    scope = await SalesService.resolve_scope(db, current_user)
    t_stmt = select(TenantModel.name, TenantModel.tenant_ref_id).where(TenantModel.public_id == current_user.tenant_id)
    t_res = await db.execute(t_stmt)
    t_row = t_res.first()
    tenant_name = t_row[0] if t_row and t_row[0] else "Enterprise Platform"
    tenant_ref_id = t_row[1] if t_row and t_row[1] else current_user.tenant_ref_id

    company_name = None
    company_ref_id = current_user.company_ref_id
    if current_user.company_id:
        c_stmt = select(CompanyModel.company_name, CompanyModel.company_ref_id).where(CompanyModel.public_id == current_user.company_id)
        c_res = await db.execute(c_stmt)
        c_row = c_res.first()
        if c_row:
            company_name = c_row[0]
            if not company_ref_id:
                company_ref_id = c_row[1]

    user_dict = {
        "public_id": str(current_user.public_id),
        "sales_user_ref_id": current_user.sales_user_ref_id,
        "employee_code": current_user.employee_code,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "phone": current_user.mobile,
        "territory": current_user.territory,
        "department": current_user.department,
        "designation": current_user.designation,
        "status": current_user.status,
        "tenant_id": str(current_user.tenant_id),
        "tenant_ref_id": tenant_ref_id,
        "tenant_name": tenant_name,
        "company_id": str(current_user.company_id) if current_user.company_id else None,
        "company_ref_id": company_ref_id or (2 if current_user.company_id else None),
        "company_name": company_name or ("SATHUS PRIVATE LIMITED" if current_user.company_id else None),
        "mappings_count": len(scope.sd_ids) + len(scope.dist_ids) + len(scope.retailer_ids)
    }
    return {
        **user_dict,
        "user": user_dict,
        "scope": {
            "is_all_tenant": scope.is_all,
            "mapped_super_distributors": len(scope.sd_ids),
            "mapped_distributors": len(scope.dist_ids),
            "mapped_retailers": len(scope.retailer_ids)
        }
    }


# ==============================================================================
# 2. SALES DASHBOARD & KPIS
# ==============================================================================

@router.get("/dashboard", tags=["Sales Dashboard"])
@router.get("/dashboard/metrics", tags=["Sales Dashboard"])
@router.get("/dashboard/kpis", tags=["Sales Dashboard"])
async def get_dashboard(
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Live Sales Dashboard KPIs & Today's transaction summary scoped to the logged-in user.
    """
    return await SalesService.get_dashboard_metrics(db, current_user)


# ==============================================================================
# 3. HIERARCHY DIRECTORIES (SUPER DISTRIBUTORS, DISTRIBUTORS, RETAILERS)
# ==============================================================================

@router.get("/hierarchy/super-distributors", tags=["Sales Hierarchy"])
async def get_super_distributors(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    return await SalesService.get_super_distributors(db, current_user, search, status, page, limit)


@router.get("/hierarchy/distributors", tags=["Sales Hierarchy"])
async def get_distributors(
    sd_id: Optional[str] = Query(None),
    super_distributor_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    target_sd = sd_id or super_distributor_id
    return await SalesService.get_distributors(db, current_user, target_sd, search, status, page, limit)


@router.get("/hierarchy/retailers", tags=["Sales Hierarchy"])
async def get_retailers(
    distributor_id: Optional[str] = Query(None),
    dist_id: Optional[str] = Query(None),
    sd_id: Optional[str] = Query(None),
    super_distributor_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    target_dist = distributor_id or dist_id
    target_sd = sd_id or super_distributor_id
    return await SalesService.get_retailers(db, current_user, target_dist, target_sd, search, status, page, limit)


# ==============================================================================
# 4. RETAILER DETAILS
# ==============================================================================

@router.get("/retailers/{retailer_id}", tags=["Sales Retailer Detail"])
@router.get("/hierarchy/retailers/{retailer_id}", tags=["Sales Retailer Detail"])
async def get_retailer_detail(
    retailer_id: str,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Comprehensive Retailer Profile: basic information, hierarchy breadcrumb,
    assigned POS machines, MDR configuration, and transaction summary.
    """
    return await SalesService.get_retailer_detail(db, current_user, retailer_id)


# ==============================================================================
# 5. TRANSACTIONS & POS TRANSACTIONS HUB
# ==============================================================================

@router.get("/transactions", tags=["Sales Transactions"])
async def get_transactions(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    txn_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    distributor_id: Optional[str] = Query(None),
    sd_id: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Central Sales Transaction View with granular multi-filtering across all payment services.
    """
    target_service = service_name or service
    return await SalesService.get_transactions(
        db=db,
        sales_user=current_user,
        from_date=from_date,
        to_date=to_date,
        txn_id=txn_id,
        retailer_id=retailer_id,
        distributor_id=distributor_id,
        sd_id=sd_id,
        service_name=target_service,
        status_filter=status,
        min_amount=min_amount,
        max_amount=max_amount,
        page=page,
        limit=limit
    )


@router.get("/transactions/pos", tags=["Sales POS Transactions"])
async def get_pos_transactions(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    terminal_id: Optional[str] = Query(None),
    card_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dedicated POS Transaction Ledger showing Card Type, MDR, GST, Commission, and Net settlement.
    """
    return await SalesService.get_pos_transactions(
        db=db,
        sales_user=current_user,
        from_date=from_date,
        to_date=to_date,
        terminal_id=terminal_id,
        card_type=card_type,
        status_filter=status,
        page=page,
        limit=limit
    )


# ==============================================================================
# 6. POS MACHINE MANAGEMENT
# ==============================================================================

@router.get("/pos-machines", tags=["Sales POS Management"])
@router.get("/pos/machines", tags=["Sales POS Management"])
async def get_pos_machines(
    retailer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dedicated POS Terminal management list showing Terminal ID, Serial No, Status, and Volume.
    """
    return await SalesService.get_pos_machines(db, current_user, retailer_id, status, search, page, limit)


# ==============================================================================
# 7. POS MDR SETUP & SCOPED CONFIGURATION
# ==============================================================================

@router.get("/pos-mdr/catalog", tags=["Sales POS MDR"])
@router.get("/pos/mdr/catalog", tags=["Sales POS MDR"])
@router.get("/pos/mdr-options", tags=["Sales POS MDR"])
async def get_pos_mdr_catalog(
    retailer_id: Optional[str] = Query(None),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the POS MDR catalog (Visa, Mastercard, RuPay, Amex/Diners) and overrides for a mapped retailer.
    """
    return await SalesService.get_pos_mdr_catalog(db, current_user, retailer_id)


class DynamicMdrConfigRequest(BaseModel):
    target_type: Optional[str] = Field("RETAILER", description="RETAILER, DISTRIBUTOR, SUPER_DISTRIBUTOR")
    target_id: Optional[str] = Field(None, description="Target entity UUID")
    retailer_id: Optional[str] = None
    card_type: Optional[str] = Field("Visa Credit & Debit")
    payment_mode: str = Field(..., description="e.g. POS_INSTANT, POS_T1, POS_T2")
    mdr_rate_percentage: Optional[float] = None
    mdr: Optional[float] = None
    mdr_type: Optional[str] = Field("PERCENTAGE")
    gst_rate: Optional[float] = Field(0.0)
    is_active: Optional[bool] = True
    remarks: Optional[str] = None


@router.post("/pos-mdr/configure", tags=["Sales POS MDR"])
@router.post("/pos/mdr-config", tags=["Sales POS MDR"])
async def configure_retailer_mdr(
    payload: DynamicMdrConfigRequest,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Configures POS MDR for a mapped retailer within authorized hierarchy.
    """
    r_id = payload.retailer_id or payload.target_id
    rate = payload.mdr_rate_percentage if payload.mdr_rate_percentage is not None else (payload.mdr if payload.mdr is not None else 1.40)
    
    return await SalesService.configure_retailer_mdr(
        db=db,
        sales_user=current_user,
        retailer_id=r_id,
        payment_mode=payload.payment_mode,
        mdr_rate=rate,
        mdr_type=payload.mdr_type or "PERCENTAGE",
        gst_rate=payload.gst_rate or 0.0,
        remarks=payload.remarks
    )


# ==============================================================================
# 8. SALES ACTIVITY & INACTIVE RETAILER TRACKING
# ==============================================================================

@router.get("/activity", tags=["Sales Activity"])
@router.get("/activity/metrics", tags=["Sales Activity"])
async def get_sales_activity(
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns sales performance metrics: assigned retailers, new onboardings (30d), active retailers, POS activated.
    """
    return await SalesService.get_sales_activity_summary(db, current_user)


@router.post("/activity/log", tags=["Sales Activity"])
async def log_sales_activity(
    payload: LogActivityRequest,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Logs a sales representative's field activity, retailer visit, or follow-up.
    """
    from app.infrastructure.db.sales_models import SalesActivityLogModel
    ret_uuid = uuid.UUID(payload.retailer_id) if payload.retailer_id else None
    dist_uuid = uuid.UUID(payload.distributor_id) if payload.distributor_id else None

    log_entry = SalesActivityLogModel(
        tenant_id=current_user.tenant_id,
        company_id=current_user.company_id,
        sales_user_id=current_user.public_id,
        activity_type=payload.activity_type.upper(),
        subject=payload.subject,
        remarks=payload.remarks,
        outcome=payload.outcome or "COMPLETED",
        retailer_id=ret_uuid,
        distributor_id=dist_uuid
    )
    db.add(log_entry)
    await db.commit()
    return {"success": True, "message": "Activity logged successfully."}


@router.get("/inactive-retailers", tags=["Sales Inactive Retailers"])
@router.get("/activity/inactive-retailers", tags=["Sales Inactive Retailers"])
async def get_inactive_retailers(
    filter_type: Optional[str] = Query(None, description="7_DAYS, 30_DAYS, or POS_INACTIVE"),
    criteria: Optional[str] = Query(None, description="7_DAYS, 30_DAYS, or POS_INACTIVE"),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Identifies inactive retailers who haven't transacted in 7/30 days or have inactive POS machines.
    """
    target_filter = filter_type or criteria or "7_DAYS"
    return await SalesService.get_inactive_retailers(db, current_user, target_filter)


@router.get("/audit/my-logs", tags=["Sales Audit"])
async def get_my_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns audit trail of interactions performed by the authenticated sales user.
    """
    from app.infrastructure.db.sales_models import SalesAuditLogModel
    stmt = (
        select(SalesAuditLogModel)
        .where(
            SalesAuditLogModel.sales_user_id == current_user.public_id,
            SalesAuditLogModel.tenant_id == current_user.tenant_id
        )
        .order_by(desc(SalesAuditLogModel.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "public_id": str(l.public_id),
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_ref_id": l.entity_ref_id,
            "status": l.status,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "ip_address": l.ip_address
        }
        for l in logs
    ]


# ==============================================================================
# 9. TENANT-SCOPED GLOBAL SEARCH
# ==============================================================================

@router.get("/search", tags=["Sales Global Search"])
async def global_search(
    q: str = Query(..., min_length=1, description="Search term"),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Tenant-scoped global search across Retailers, Distributors, POS machines, and Transactions.
    """
    return await SalesService.global_search(db, current_user, q)


# ==============================================================================
# 10. REPORTS
# ==============================================================================

@router.get("/reports/{report_type}", tags=["Sales Reports"])
async def get_report(
    report_type: str,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates tenant-scoped reports: retailer, pos, transaction, or mdr.
    """
    r_type = report_type.lower()
    if r_type == "retailer":
        return await SalesService.get_retailers(db, current_user, status_filter=status, page=1, limit=500)
    elif r_type == "pos":
        return await SalesService.get_pos_machines(db, current_user, status_filter=status, page=1, limit=500)
    elif r_type == "transaction":
        return await SalesService.get_transactions(db, current_user, from_date=from_date, to_date=to_date, status_filter=status, page=1, limit=500)
    elif r_type == "mdr":
        return await SalesService.get_pos_mdr_catalog(db, current_user)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")


# ==============================================================================
# 11. REGISTRATION & ONBOARDING SUITE (SD, DISTRIBUTOR, RETAILER)
# ==============================================================================

@router.get("/hierarchy/sds-for-registration", tags=["Sales Registration"])
async def get_sds_for_registration(
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authorized Super Distributors that the sales user can assign when registering a Distributor.
    """
    return await SalesService.get_sds_for_distributor_registration(db, current_user)


@router.get("/hierarchy/distributors-for-registration", tags=["Sales Registration"])
async def get_distributors_for_registration(
    sd_id: Optional[str] = Query(None, description="Optional Parent Super Distributor UUID to filter"),
    super_distributor_id: Optional[str] = Query(None, description="Alias for sd_id"),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authorized Distributors that the sales user can assign when registering a Retailer.
    Strictly filtered by tenant, company, and optional parent SD.
    """
    target_sd = sd_id or super_distributor_id
    return await SalesService.get_distributors_for_retailer_registration(db, current_user, sd_id=target_sd)


@router.post("/register/super-distributor", tags=["Sales Registration"])
async def register_super_distributor(
    payload: SalesRegisterSuperDistributorRequest,
    request: Request,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new Super Distributor with tenant & company auto-derived from authenticated sales user.
    """
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await SalesService.register_super_distributor(
        db=db,
        current_user=current_user,
        data=payload.model_dump(),
        ip_address=ip_addr,
        user_agent=user_agent
    )


@router.post("/register/distributor", tags=["Sales Registration"])
async def register_distributor(
    payload: SalesRegisterDistributorRequest,
    request: Request,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new Distributor mapped to an authorized Super Distributor.
    """
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await SalesService.register_distributor(
        db=db,
        current_user=current_user,
        data=payload.model_dump(),
        ip_address=ip_addr,
        user_agent=user_agent
    )


@router.post("/register/retailer", tags=["Sales Registration"])
async def register_retailer(
    payload: SalesRegisterRetailerRequest,
    request: Request,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new Retailer under an authorized Distributor, triggering the progressive onboarding & KYC flow.
    """
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await SalesService.register_retailer(
        db=db,
        current_user=current_user,
        data=payload.model_dump(),
        ip_address=ip_addr,
        user_agent=user_agent
    )


@router.get("/registrations", tags=["Sales Registration Hub"])
async def get_sales_registrations(
    tab: str = Query("ALL", description="ALL, SUPER_DISTRIBUTOR, DISTRIBUTOR, RETAILER, PENDING_KYC, VIDEO_KYC_PENDING, ADMIN_APPROVAL_PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE"),
    search: Optional[str] = Query(None, description="Search term across name, code, mobile, email, ref_id"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Unified tenant-scoped Registrations Hub for Sales users with tab counts and filters.
    """
    return await SalesService.get_sales_registrations(
        db=db,
        current_user=current_user,
        tab=tab,
        search=search,
        page=page,
        limit=limit
    )


@router.get("/registrations/{entity_type}/{entity_id}", tags=["Sales Registration Hub"])
async def get_registration_details(
    entity_type: str,
    entity_id: str,
    current_user: SalesUserModel = Depends(get_current_sales_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Entity 360 view with hierarchy breadcrumb, KYC data, uploaded documents, Video KYC status & link, and approval timeline.
    """
    return await SalesService.get_registration_details(
        db=db,
        current_user=current_user,
        entity_type=entity_type,
        entity_id=entity_id
    )


# ==============================================================================
# 12. AUTOMATED KYC AUTO-READ & LOCATION VALIDATION
# ==============================================================================

@router.post("/auto-read-doc", tags=["Sales KYC Auto-Reader"])
async def auto_read_and_upload_doc(
    file: UploadFile = File(..., description="Document / Photo / Video file"),
    doc_type: str = Form(..., description="PAN, AADHAAR, BANK_CHEQUE, GST, SELFIE, SHOP_PHOTO, VIDEO_KYC"),
    entity_type: str = Form("RET", description="SD | DIST | RET"),
    expected_name: Optional[str] = Form(None),
    current_user: SalesUserModel = Depends(get_current_sales_user),
):
    """
    1. Uploads document directly to encrypted Backblaze B2 Vault.
    2. Runs high-precision OCR / NSDL / UIDAI verification to extract & auto-bind details.
    3. Returns persistent B2 URL and extracted fields.
    """
    from app.application.kyc_document_reader_service import KycDocumentReaderService
    
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or f"{doc_type.lower()}_{uuid.uuid4().hex[:8]}.jpg"
    content_type = file.content_type or "image/jpeg"

    try:
        result = await KycDocumentReaderService.process_and_upload_document(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            doc_type=doc_type,
            entity_type=entity_type,
            expected_name=expected_name,
        )
        return result
    except Exception as ex:
        logger.error(f"[Auto-Read Error] {ex}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to auto-read document: {str(ex)}"
        )


@router.post("/extract-image-location", tags=["Sales KYC Auto-Reader"])
async def extract_image_location_endpoint(
    file: UploadFile = File(..., description="Uploaded shop or commercial premises photo"),
    entity_type: str = Form("RET", description="SD | DIST | RET"),
    current_user: SalesUserModel = Depends(get_current_sales_user),
):
    """
    Exclusively derives location from the uploaded image:
    1. Extracts GPS coordinates from EXIF metadata (returns unavailable if not present without fabricating).
    2. Runs OCR to identify visible text/address/city/state/pincode.
    3. Saves photo to encrypted Backblaze B2 vault.
    4. Returns EXIF GPS and OCR-derived location as separate fields.
    """
    from app.application.kyc_document_reader_service import KycDocumentReaderService

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or f"shop_location_{uuid.uuid4().hex[:8]}.jpg"
    content_type = file.content_type or "image/jpeg"

    try:
        result = await KycDocumentReaderService.process_and_upload_document(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            doc_type="SHOP_PHOTO",
            entity_type=entity_type,
        )
        return {
            "success": True,
            "b2_url": result.get("b2_url"),
            "exif_gps": result.get("exif_gps"),
            "ocr_location": result.get("ocr_location"),
            "exif_gps_available": result.get("exif_gps", {}).get("available", False),
            "ocr_location_available": result.get("ocr_location", {}).get("available", False),
            "extracted": result.get("extracted", {}),
            "message": "Image analyzed successfully. GPS and OCR locations extracted into separate fields."
        }
    except Exception as ex:
        logger.error(f"[Extract Image Location Error] {ex}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract image location: {str(ex)}"
        )


@router.post("/validate-location", tags=["Sales Location Validation"])
async def validate_location_endpoint(
    payload: LocationValidationRequest,
    current_user: SalesUserModel = Depends(get_current_sales_user),
):
    """
    Validates device GPS coordinates against operational territory and reverse-geocodes.
    """
    from app.application.kyc_document_reader_service import KycDocumentReaderService

    res = await KycDocumentReaderService.validate_location(
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        expected_state=payload.expected_state,
        expected_pincode=payload.expected_pincode,
    )
    return res


