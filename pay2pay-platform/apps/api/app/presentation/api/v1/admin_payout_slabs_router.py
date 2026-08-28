"""
Admin Payout Slab Configuration API Router (EPIC-027).

Provides Admin endpoints for managing Payout Slabs, fee structures,
activation/deactivation, and audit trail inspection.
Strictly scoped to authenticated Admin users with tenant and company isolation.
"""

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel
from app.application.payout_slab_service import PayoutSlabService
from app.application.dtos import (
    PayoutSlabCreateRequest, PayoutSlabUpdateRequest, PayoutSlabStatusChangeRequest,
    PayoutSlabResponse, PayoutSlabAuditResponse, PayoutSlabListResponse
)

router = APIRouter(prefix="/admin/payout-slabs", tags=["Admin Payout Slabs (EPIC-027)"])


@router.get("", response_model=PayoutSlabListResponse, summary="List Payout Slabs")
async def list_payout_slabs(
    service_code: Optional[str] = Query(None, description="Filter by service code e.g. PAYOUT"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name, description, or currency"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists all payout slabs belonging to the authenticated Admin tenant and company."""
    company_id = getattr(current_user, "company_id", None)
    return await PayoutSlabService.list_payout_slabs(
        db=db,
        tenant_id=tenant_id,
        company_id=company_id,
        service_code=service_code,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size
    )


@router.get("/{id}", response_model=PayoutSlabResponse, summary="Get Payout Slab by ID")
async def get_payout_slab(
    id: uuid.UUID = Path(..., description="Payout Slab Public UUID"),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves payout slab details including audit log trail."""
    return await PayoutSlabService.get_payout_slab_by_id(
        db=db,
        tenant_id=tenant_id,
        slab_id=id
    )


@router.post("", response_model=PayoutSlabResponse, status_code=status.HTTP_201_CREATED, summary="Create Payout Slab")
async def create_payout_slab(
    req: PayoutSlabCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new Payout Slab with overlap protection and audit logging."""
    company_id = getattr(current_user, "company_id", None)
    return await PayoutSlabService.create_payout_slab(
        db=db,
        tenant_id=tenant_id,
        company_id=company_id,
        req=req,
        current_user=current_user
    )


@router.put("/{id}", response_model=PayoutSlabResponse, summary="Update Payout Slab")
async def update_payout_slab(
    id: uuid.UUID = Path(..., description="Payout Slab Public UUID"),
    req: PayoutSlabUpdateRequest = ...,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing payout slab with versioning and audit record."""
    return await PayoutSlabService.update_payout_slab(
        db=db,
        tenant_id=tenant_id,
        slab_id=id,
        req=req,
        current_user=current_user
    )


@router.post("/{id}/activate", response_model=PayoutSlabResponse, summary="Activate Payout Slab")
async def activate_payout_slab(
    id: uuid.UUID = Path(..., description="Payout Slab Public UUID"),
    req: PayoutSlabStatusChangeRequest = PayoutSlabStatusChangeRequest(),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Activates a payout slab after validating range and checking for overlaps."""
    return await PayoutSlabService.activate_payout_slab(
        db=db,
        tenant_id=tenant_id,
        slab_id=id,
        req=req,
        current_user=current_user
    )


@router.post("/{id}/deactivate", response_model=PayoutSlabResponse, summary="Deactivate Payout Slab")
async def deactivate_payout_slab(
    id: uuid.UUID = Path(..., description="Payout Slab Public UUID"),
    req: PayoutSlabStatusChangeRequest = PayoutSlabStatusChangeRequest(),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deactivates a payout slab and logs the administrative reason."""
    return await PayoutSlabService.deactivate_payout_slab(
        db=db,
        tenant_id=tenant_id,
        slab_id=id,
        req=req,
        current_user=current_user
    )


@router.get("/{id}/audit", response_model=List[PayoutSlabAuditResponse], summary="Get Payout Slab Audit History")
async def get_payout_slab_audit(
    id: uuid.UUID = Path(..., description="Payout Slab Public UUID"),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves chronological audit logs of all changes to this payout slab."""
    return await PayoutSlabService.get_payout_slab_audit(
        db=db,
        tenant_id=tenant_id,
        slab_id=id
    )
