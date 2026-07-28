import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    CompanyOnboardingCreateRequest, CompanyUpdateRequest, CompanyApprovalRequest,
    CompanyStatusChangeRequest, CompanyDetailsResponse, CompanyDashboardMetricsResponse,
    PaginatedResponse, APIResponse
)
from app.application.services import CompanyManagementService
from app.application.dependencies import get_current_user, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/companies", tags=["Company Management (EPIC-002)"])


@router.post("", response_model=CompanyDetailsResponse)
async def onboard_company(
    req: CompanyOnboardingCreateRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:company")
):
    """
    Onboard and provision a new Multi-Tenant Company.
    Restricted strictly to Platform Super Admin and Platform Admin.
    """
    company = await CompanyManagementService.onboard_company(db, req, current_user)
    return await CompanyManagementService.get_company_details(db, company.public_id)


@router.get("", response_model=PaginatedResponse)
async def list_companies(
    search: Optional[str] = Query(None, description="Search by name, code, GST, PAN"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PENDING_APPROVAL, ACTIVE, SUSPENDED)"),
    company_type: Optional[str] = Query(None, description="Filter by company type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("read:company")
):
    """
    Enterprise Grid query with search, multi-field filtering, and server-side pagination.
    """
    companies, total = await CompanyManagementService.list_companies(
        db, search=search, status=status, company_type=company_type, page=page, page_size=page_size
    )
    items = [
        {
            "public_id": str(c.public_id),
            "company_code": c.company_code,
            "company_name": c.company_name,
            "legal_name": c.legal_name,
            "tenant_code": c.tenant_code,
            "company_type": c.company_type,
            "gst_number": c.gst_number,
            "pan_number": c.pan_number,
            "cin_number": c.cin_number,
            "status": c.status,
            "version_no": c.version_no,
            "created_date": c.created_date
        }
        for c in companies
    ]
    total_pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/dashboard/metrics", response_model=CompanyDashboardMetricsResponse)
async def get_company_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user),
    _: bool = require_permission("read:dashboard")
):
    """
    Returns real-time analytics & distribution charts for EPIC-002 Company Dashboard.
    """
    return await CompanyManagementService.get_dashboard_metrics(db)


@router.get("/{company_id}", response_model=CompanyDetailsResponse)
async def get_company_details(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user),
    _: bool = require_permission("read:company")
):
    """
    Get full company details including Banking, Contact, Address, Subscription, Settings, Branding, Documents, Status History.
    """
    return await CompanyManagementService.get_company_details(db, company_id)


@router.post("/{company_id}/approve", response_model=CompanyDetailsResponse)
async def approve_company(
    company_id: uuid.UUID,
    req: CompanyApprovalRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("approve:company")
):
    """
    Platform Admin Approval for Company Onboarding Request.
    """
    company = await CompanyManagementService.approve_company(db, company_id, req, current_user)
    return await CompanyManagementService.get_company_details(db, company.public_id)


@router.post("/{company_id}/status", response_model=CompanyDetailsResponse)
async def change_company_status(
    company_id: uuid.UUID,
    req: CompanyStatusChangeRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("update:company")
):
    """
    Change company status (ACTIVE, SUSPENDED, BLOCKED, CLOSED, ARCHIVED).
    """
    company = await CompanyManagementService.change_company_status(db, company_id, req, current_user)
    return await CompanyManagementService.get_company_details(db, company.public_id)
