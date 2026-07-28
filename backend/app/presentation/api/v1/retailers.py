import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    RetailerOnboardCreateRequest, RetailerResponse, RetailerDetailsResponse,
    RetailerApprovalRequest, RetailerDashboardMetricsResponse, PaginatedResponse
)
from app.application.services import RetailerManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/retailers", tags=["Retailer Management (EPIC-004)"])


@router.post("", response_model=RetailerResponse)
async def onboard_retailer(
    req: RetailerOnboardCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
