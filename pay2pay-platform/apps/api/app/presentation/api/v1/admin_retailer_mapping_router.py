import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id, get_current_token_payload
from app.infrastructure.db.models import AdminUserModel
from app.application.retailer_mapping_service import RetailerMappingService
from app.application.services import RetailerManagementService

router = APIRouter(prefix="", tags=["Admin Retailer Hierarchy Mapping"])


class RetailerMappingUpdateRequest(BaseModel):
    company_id: str = Field(..., description="Target Company Public UUID", example="18b39add-0860-4a2d-8289-bc698da8e966")
    distributor_id: str = Field(..., description="Target Distributor Public UUID", example="2843fd8b-bb8c-482d-8f5e-d1243395d582")
    rm_id: Optional[str] = Field(None, description="Target Regional Manager Public UUID", example="7e1f3d1e-0618-4661-aca4-f95cfe7158a3")
    reason: Optional[str] = Field(None, description="Audit reason for hierarchy re-mapping", example="Territory realignment for Southern Zone.")


def _is_super_admin(current_user: AdminUserModel, payload: dict) -> bool:
    roles = [str(r).upper() for r in payload.get("roles", [])]
    if hasattr(current_user, "user_roles") and current_user.user_roles:
        for ur in current_user.user_roles:
            if hasattr(ur, "role") and ur.role and hasattr(ur.role, "code"):
                roles.append(str(ur.role.code).upper())
    return any(r in ("SUPER_ADMIN", "PLATFORM_ADMIN", "ROOT_ADMIN", "ADMIN") for r in roles)


def _resolve_company_scope(current_user: AdminUserModel, payload: dict) -> Optional[uuid.UUID]:
    if _is_super_admin(current_user, payload):
        return None
    return current_user.company_id if getattr(current_user, "company_id", None) else None


def _resolve_tenant_scope(tenant_id: uuid.UUID, current_user: AdminUserModel, payload: dict) -> Optional[uuid.UUID]:
    if _is_super_admin(current_user, payload):
        return None
    return tenant_id


# ─── Hierarchy Options & Dependent Dropdowns ──────────────────────────────────

@router.get("/admin/retailers/hierarchy-options", summary="Get Full Hierarchy Tree Options")
@router.get("/api/v1/admin/retailers/hierarchy-options", summary="Get Full Hierarchy Tree Options")
@router.get("/retailers/hierarchy-options", summary="Get Full Hierarchy Tree Options")
@router.get("/api/v1/retailers/hierarchy-options", summary="Get Full Hierarchy Tree Options")
async def get_hierarchy_tree_options(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns structured list of Companies with their child Distributors and RMs."""
    return await RetailerManagementService.get_hierarchy_options(db, tenant_id)


@router.get("/admin/companies/{company_id}/distributors", summary="Get Distributors belonging to a Company")
@router.get("/api/v1/admin/companies/{company_id}/distributors", summary="Get Distributors belonging to a Company")
async def get_company_distributors_endpoint(
    company_id: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """Returns all active distributors mapped to the specified company."""
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMappingService.get_company_distributors(
        db=db,
        company_id=company_id,
        tenant_id=eff_tenant_id
    )


@router.get("/admin/companies/{company_id}/rms", summary="Get RMs belonging to a Company")
@router.get("/api/v1/admin/companies/{company_id}/rms", summary="Get RMs belonging to a Company")
async def get_company_rms_endpoint(
    company_id: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """Returns all active Regional / Relationship Managers mapped to the specified company."""
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMappingService.get_company_rms(
        db=db,
        company_id=company_id,
        tenant_id=eff_tenant_id
    )


@router.get("/admin/distributors/{distributor_id}/rms", summary="Get RMs for a Distributor")
@router.get("/api/v1/admin/distributors/{distributor_id}/rms", summary="Get RMs for a Distributor")
async def get_distributor_rms_endpoint(
    distributor_id: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """Returns RMs associated with a Distributor or its parent Super Distributor."""
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMappingService.get_distributor_rms(
        db=db,
        distributor_id=distributor_id,
        tenant_id=eff_tenant_id
    )


# ─── Retailer Hierarchy Mapping CRUD ──────────────────────────────────────────

@router.get("/admin/retailers/{retailer_id}/mapping", summary="Get Retailer Hierarchy Mapping & Timeline")
@router.get("/api/v1/admin/retailers/{retailer_id}/mapping", summary="Get Retailer Hierarchy Mapping & Timeline")
async def get_retailer_mapping_endpoint(
    retailer_id: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the complete hierarchy mapping for a retailer:
    Company -> Distributor -> RM and full assignment timeline history.
    """
    company_id = _resolve_company_scope(current_user, payload)
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMappingService.get_retailer_mapping(
        db=db,
        retailer_id=retailer_id,
        tenant_id=eff_tenant_id,
        company_id=company_id
    )


@router.put("/admin/retailers/{retailer_id}/mapping", summary="Update Retailer Hierarchy Mapping (Company, Distributor, RM)")
@router.put("/api/v1/admin/retailers/{retailer_id}/mapping", summary="Update Retailer Hierarchy Mapping (Company, Distributor, RM)")
@router.post("/admin/retailers/{retailer_id}/mapping", summary="Update Retailer Hierarchy Mapping")
@router.post("/api/v1/admin/retailers/{retailer_id}/mapping", summary="Update Retailer Hierarchy Mapping")
async def update_retailer_mapping_endpoint(
    retailer_id: str,
    req: RetailerMappingUpdateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the retailer's organizational mapping to Company, Distributor, and RM.
    Enforces that the Distributor belongs to the selected Company.
    Closes previous assignment history and creates a new active assignment.
    """
    eff_tenant_id = _resolve_tenant_scope(tenant_id, current_user, payload)
    return await RetailerMappingService.update_retailer_mapping(
        db=db,
        retailer_id=retailer_id,
        company_id=req.company_id,
        distributor_id=req.distributor_id,
        rm_id=req.rm_id,
        reason=req.reason,
        actor_user=current_user,
        tenant_id=eff_tenant_id
    )
