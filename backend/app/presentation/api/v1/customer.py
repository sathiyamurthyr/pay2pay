"""EPIC-021 — Customer Lifecycle, KYC & Service Eligibility — API Router"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.customer_service import CustomerService
from app.application.customer_dtos import (
    CustomerRegisterRequest, CustomerUpdateRequest, CustomerStatusChangeRequest,
    CustomerSearchRequest, CustomerKycSubmitRequest, CustomerKycReviewRequest,
    CustomerDocumentUploadRequest, ServiceToggleRequest, ServiceConfigRequest,
    CustomerLimitConfigRequest, CustomerLimitOverrideRequest,
    CustomerRiskUpdateRequest, CustomerRelationshipRequest,
    CustomerBlacklistRequest, CustomerWhitelistRequest,
)

router = APIRouter(prefix="/customers", tags=["Customer Lifecycle"])


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_customer_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Customer lifecycle platform KPI dashboard."""
    metrics = await CustomerService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Customer CRUD ─────────────────────────────────────────────────────────────

@router.post("", response_model=APIResponse, status_code=201)
@router.post("/", response_model=APIResponse, status_code=201)
async def register_customer(
    req: CustomerRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Register a new customer and begin the lifecycle."""
    customer = await CustomerService.register_customer(db, req)
    return APIResponse(message="Customer registered successfully", data=customer.model_dump(mode="json"))


@router.get("", response_model=APIResponse)
@router.get("/", response_model=APIResponse)
async def list_customers(
    query: Optional[str] = Query(default=None),
    mobile_number: Optional[str] = Query(default=None),
    customer_category: Optional[str] = Query(default=None),
    customer_status: Optional[str] = Query(default=None),
    kyc_status: Optional[str] = Query(default=None),
    kyc_level: Optional[str] = Query(default=None),
    risk_category: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Search and list customers with advanced filters."""
    search_req = CustomerSearchRequest(
        query=query, mobile_number=mobile_number,
        customer_category=customer_category, customer_status=customer_status,
        kyc_status=kyc_status, kyc_level=kyc_level, risk_category=risk_category,
        page=page, page_size=page_size,
    )
    customers = await CustomerService.list_customers(db, search_req)
    return APIResponse(data=[c.model_dump(mode="json") for c in customers])


@router.get("/search", response_model=APIResponse)
@router.post("/search", response_model=APIResponse)
async def search_customers_post(
    req: Optional[dict] = None,
    query: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """GET/POST customer search endpoint."""
    q_str = query or (req.get("query") if isinstance(req, dict) else "")
    search_req = CustomerSearchRequest(query=q_str, mobile_number=q_str)
    customers = await CustomerService.list_customers(db, search_req)
    return APIResponse(status="SUCCESS", data=[c.model_dump(mode="json") for c in customers])


@router.get("/{customer_id}", response_model=APIResponse)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get a specific customer record."""
    customer = await CustomerService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return APIResponse(data=customer.model_dump(mode="json"))


@router.get("/{customer_id}/360", response_model=APIResponse)
async def get_customer_360(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Customer 360° — full view: profile, KYC, documents, services, risk, timeline."""
    view = await CustomerService.get_customer_360(db, customer_id)
    if not view:
        raise HTTPException(status_code=404, detail="Customer not found")
    return APIResponse(data=view.model_dump(mode="json"))


@router.patch("/{customer_id}/status", response_model=APIResponse)
async def change_customer_status(
    customer_id: uuid.UUID,
    req: CustomerStatusChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Change customer lifecycle status (ACTIVE, BLOCKED, SUSPENDED, CLOSED, etc.)."""
    customer = await CustomerService.update_customer_status(db, customer_id, req)
    return APIResponse(message="Customer status updated", data=customer.model_dump(mode="json"))


# ── KYC ───────────────────────────────────────────────────────────────────────

@router.get("/kyc/queue", response_model=APIResponse)
async def list_kyc_queue(
    kyc_status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get the KYC review queue."""
    records = await CustomerService.list_kyc_queue(db, kyc_status=kyc_status)
    return APIResponse(data=[r.model_dump(mode="json") for r in records])


@router.post("/{customer_id}/kyc/submit", response_model=APIResponse, status_code=201)
async def submit_kyc(
    customer_id: uuid.UUID,
    req: CustomerKycSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Submit a customer's KYC application for verification."""
    kyc = await CustomerService.submit_kyc(db, customer_id, req)
    return APIResponse(message="KYC submitted for review", data=kyc.model_dump(mode="json"))


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/{customer_id}/documents", response_model=APIResponse)
async def list_documents(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List all documents for a customer."""
    docs = await CustomerService.list_documents(db, customer_id)
    return APIResponse(data=[d.model_dump(mode="json") for d in docs])


@router.post("/{customer_id}/documents", response_model=APIResponse, status_code=201)
async def upload_document(
    customer_id: uuid.UUID,
    req: CustomerDocumentUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Upload a KYC document for a customer."""
    doc = await CustomerService.upload_document(db, customer_id, req)
    return APIResponse(message="Document uploaded successfully", data=doc.model_dump(mode="json"))


# ── Service Eligibility ───────────────────────────────────────────────────────

@router.get("/{customer_id}/services", response_model=APIResponse)
async def list_customer_services(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get all enabled/disabled services for a customer."""
    services = await CustomerService.list_customer_services(db, customer_id)
    return APIResponse(data=[s.model_dump(mode="json") for s in services])


@router.get("/services/configurations", response_model=APIResponse)
async def list_service_configs(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List all service eligibility configurations."""
    configs = await CustomerService.list_service_configs(db)
    return APIResponse(data=[c.model_dump(mode="json") for c in configs])


@router.post("/services/configurations", response_model=APIResponse, status_code=201)
async def create_service_config(
    req: ServiceConfigRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Create a new service eligibility configuration."""
    config = await CustomerService.create_service_config(db, req)
    return APIResponse(message="Service configuration created", data=config.model_dump(mode="json"))


# ── Limits ────────────────────────────────────────────────────────────────────

@router.get("/limits/configurations", response_model=APIResponse)
async def list_limit_configs(
    service_code: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List transaction limit configurations."""
    configs = await CustomerService.list_limit_configs(db, service_code=service_code)
    return APIResponse(data=[c.model_dump(mode="json") for c in configs])


@router.post("/limits/configurations", response_model=APIResponse, status_code=201)
async def create_limit_config(
    req: CustomerLimitConfigRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Create a new customer limit configuration."""
    config = await CustomerService.create_limit_config(db, req)
    return APIResponse(message="Limit configuration created", data=config.model_dump(mode="json"))


# ── Risk ──────────────────────────────────────────────────────────────────────

@router.get("/{customer_id}/risk", response_model=APIResponse)
async def get_risk_profile(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get the risk profile for a customer."""
    risk = await CustomerService.get_risk_profile(db, customer_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk profile not found")
    return APIResponse(data=risk.model_dump(mode="json"))


# ── Blacklist ─────────────────────────────────────────────────────────────────

@router.get("/blacklist", response_model=APIResponse)
async def list_blacklist(
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List the customer blacklist."""
    entries = await CustomerService.list_blacklist(db, status=status)
    return APIResponse(data=[e.model_dump(mode="json") for e in entries])


@router.post("/blacklist", response_model=APIResponse, status_code=201)
async def add_to_blacklist(
    req: CustomerBlacklistRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Add a customer or identity to the blacklist."""
    entry = await CustomerService.add_to_blacklist(db, req)
    return APIResponse(message="Added to blacklist", data=entry.model_dump(mode="json"))


# ── Timeline ──────────────────────────────────────────────────────────────────

@router.get("/{customer_id}/timeline", response_model=APIResponse)
async def get_customer_timeline(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get the full event timeline for a customer."""
    events = await CustomerService.get_timeline(db, customer_id)
    return APIResponse(data=[e.model_dump(mode="json") for e in events])
