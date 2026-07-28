import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    RMCreateRequest, RMResponse, SuperDistributorCreateRequest, SuperDistributorResponse,
    DistributorCreateRequest, DistributorResponse, OrganizationTransferCreateRequest,
    OrganizationTransferApprovalRequest, OrganizationTransferResponse, OrganizationTreeNode,
    OrganizationDashboardMetricsResponse, PaginatedResponse
)
from app.application.services import OrganizationManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/organization", tags=["Organization & Hierarchy Management (EPIC-003)"])


# Regional Manager Endpoints
@router.post("/rms", response_model=RMResponse)
async def create_regional_manager(
    req: RMCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: bool = require_permission("create:company")
):
    rm = await OrganizationManagementService.create_rm(db, tenant_id, req, current_user)
    return RMResponse(
        public_id=rm.public_id,
        tenant_id=rm.tenant_id,
        company_id=rm.company_id,
        employee_code=rm.employee_code,
        full_name=rm.full_name,
        mobile=rm.mobile,
        email=rm.email,
        photo_url=rm.photo_url,
        designation=rm.designation,
        joining_date=rm.joining_date,
        reporting_manager_id=rm.reporting_manager_id,
        status=rm.status,
        kyc_status=rm.kyc_status,
        remarks=rm.remarks,
        version_no=rm.version_no,
        created_date=rm.created_date
    )


@router.get("/rms", response_model=PaginatedResponse)
async def list_regional_managers(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rms, total = await OrganizationManagementService.list_rms(db, tenant_id, search=search, status=status, page=page, page_size=page_size)
    items = [
        {
            "public_id": str(r.public_id),
            "employee_code": r.employee_code,
            "full_name": r.full_name,
            "mobile": r.mobile,
            "email": r.email,
            "designation": r.designation,
            "status": r.status,
            "created_date": r.created_date
        }
        for r in rms
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


# Super Distributor Endpoints
@router.post("/super-distributors", response_model=SuperDistributorResponse)
async def create_super_distributor(
    req: SuperDistributorCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sd = await OrganizationManagementService.create_super_distributor(db, tenant_id, req, current_user)
    return SuperDistributorResponse(
        public_id=sd.public_id,
        tenant_id=sd.tenant_id,
        company_id=sd.company_id,
        business_name=sd.business_name,
        owner_name=sd.owner_name,
        mobile=sd.mobile,
        email=sd.email,
        gst_number=sd.gst_number,
        pan_number=sd.pan_number,
        bank_account_number=sd.bank_account_number,
        ifsc=sd.ifsc,
        wallet_balance=sd.wallet_balance,
        credit_limit=sd.credit_limit,
        state=sd.state,
        city=sd.city,
        address=sd.address,
        pincode=sd.pincode,
        status=sd.status,
        mapped_rm_id=sd.mapped_rm_id,
        version_no=sd.version_no,
        created_date=sd.created_date
    )


@router.get("/super-distributors", response_model=PaginatedResponse)
async def list_super_distributors(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sds, total = await OrganizationManagementService.list_super_distributors(db, tenant_id, search=search, status=status, page=page, page_size=page_size)
    items = [
        {
            "public_id": str(s.public_id),
            "business_name": s.business_name,
            "owner_name": s.owner_name,
            "mobile": s.mobile,
            "email": s.email,
            "mapped_rm_id": str(s.mapped_rm_id) if s.mapped_rm_id else None,
            "status": s.status,
            "created_date": s.created_date
        }
        for s in sds
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


# Distributor Endpoints
@router.post("/distributors", response_model=DistributorResponse)
async def create_distributor(
    req: DistributorCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    d = await OrganizationManagementService.create_distributor(db, tenant_id, req, current_user)
    return DistributorResponse(
        public_id=d.public_id,
        tenant_id=d.tenant_id,
        company_id=d.company_id,
        business_name=d.business_name,
        owner_name=d.owner_name,
        mobile=d.mobile,
        email=d.email,
        gst_number=d.gst_number,
        pan_number=d.pan_number,
        bank_account_number=d.bank_account_number,
        ifsc=d.ifsc,
        wallet_balance=d.wallet_balance,
        credit_limit=d.credit_limit,
        state=d.state,
        city=d.city,
        address=d.address,
        pincode=d.pincode,
        status=d.status,
        mapped_super_distributor_id=d.mapped_super_distributor_id,
        version_no=d.version_no,
        created_date=d.created_date
    )


@router.get("/distributors", response_model=PaginatedResponse)
async def list_distributors(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dists, total = await OrganizationManagementService.list_distributors(db, tenant_id, search=search, status=status, page=page, page_size=page_size)
    items = [
        {
            "public_id": str(dt.public_id),
            "business_name": dt.business_name,
            "owner_name": dt.owner_name,
            "mobile": dt.mobile,
            "email": dt.email,
            "mapped_super_distributor_id": str(dt.mapped_super_distributor_id) if dt.mapped_super_distributor_id else None,
            "status": dt.status,
            "created_date": dt.created_date
        }
        for dt in dists
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


# Transfers & Tree
@router.post("/transfers", response_model=OrganizationTransferResponse)
async def request_transfer(
    req: OrganizationTransferCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t = await OrganizationManagementService.request_transfer(db, tenant_id, req, current_user)
    return OrganizationTransferResponse(
        public_id=t.public_id,
        tenant_id=t.tenant_id,
        company_id=t.company_id,
        entity_type=t.entity_type,
        entity_id=t.entity_id,
        old_parent_type=t.old_parent_type,
        old_parent_id=t.old_parent_id,
        new_parent_type=t.new_parent_type,
        new_parent_id=t.new_parent_id,
        transfer_date=t.transfer_date,
        effective_date=t.effective_date,
        reason=t.reason,
        status=t.status,
        approved_by=t.approved_by,
        approved_date=t.approved_date,
        version_no=t.version_no,
        created_date=t.created_date
    )


@router.post("/transfers/{transfer_id}/approve", response_model=OrganizationTransferResponse)
async def approve_transfer(
    transfer_id: uuid.UUID,
    req: OrganizationTransferApprovalRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t = await OrganizationManagementService.approve_transfer(db, transfer_id, req, current_user)
    return OrganizationTransferResponse(
        public_id=t.public_id,
        tenant_id=t.tenant_id,
        company_id=t.company_id,
        entity_type=t.entity_type,
        entity_id=t.entity_id,
        old_parent_type=t.old_parent_type,
        old_parent_id=t.old_parent_id,
        new_parent_type=t.new_parent_type,
        new_parent_id=t.new_parent_id,
        transfer_date=t.transfer_date,
        effective_date=t.effective_date,
        reason=t.reason,
        status=t.status,
        approved_by=t.approved_by,
        approved_date=t.approved_date,
        version_no=t.version_no,
        created_date=t.created_date
    )


@router.get("/tree", response_model=List[OrganizationTreeNode])
async def get_organization_tree(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await OrganizationManagementService.get_organization_tree(db, tenant_id)


@router.get("/dashboard/metrics", response_model=OrganizationDashboardMetricsResponse)
async def get_organization_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await OrganizationManagementService.get_dashboard_metrics(db, tenant_id)
