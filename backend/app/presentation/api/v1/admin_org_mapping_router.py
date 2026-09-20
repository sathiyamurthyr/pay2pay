import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id, get_current_token_payload
from app.infrastructure.db.models import AdminUserModel
from app.application.admin_org_mapping_service import (
    AdminOrgMappingService, AssignMappingRequest, UnmapRequest
)

router = APIRouter(prefix="", tags=["Admin Organization Mapping & Scope"])


async def require_admin_role(
    current_user: AdminUserModel = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload)
) -> AdminUserModel:
    """
    Mandatory backend authorization guard.
    Only users with administrative privileges (SUPER_ADMIN, PLATFORM_ADMIN,
    OPERATIONS_ADMIN, ROOT_ADMIN) are allowed access to organization mapping.
    Non-admin direct access returns HTTP 403 Forbidden.
    """
    token_roles = [str(r).upper() for r in (payload.get("roles") or [])]
    user_type = str(getattr(current_user, "user_type", "") or "").upper()
    admin_roles = {"SUPER_ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "ROOT_ADMIN", "ADMIN"}

    is_admin = bool(
        any(r in admin_roles for r in token_roles)
        or user_type in admin_roles
    )

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required to access organization mapping."
        )
    return current_user


# ─── SUMMARY METRICS ──────────────────────────────────────────────────────────

@router.get("/admin/org-mapping/summary", summary="Get Organization Hierarchy Summary")
@router.get("/api/v1/admin/org-mapping/summary", summary="Get Organization Hierarchy Summary")
async def get_mapping_summary(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real statistics for Total Tenants, Total Companies, Total Master Distributors,
    Total Distributors, Total Retailers, Mapped Records, and Unmapped Records.
    """
    return await AdminOrgMappingService.get_summary(db=db, tenant_id=tenant_id)


# ─── HIERARCHY TREE ───────────────────────────────────────────────────────────

@router.get("/admin/org-mapping/tree", summary="Get 5-Tier Organization Hierarchy Tree")
@router.get("/api/v1/admin/org-mapping/tree", summary="Get 5-Tier Organization Hierarchy Tree")
async def get_mapping_tree(
    search: Optional[str] = Query(None, description="Search term for name, code, mobile, email"),
    tenant_id: Optional[str] = Query(None, description="Filter by Tenant UUID"),
    company_id: Optional[str] = Query(None, description="Filter by Company UUID"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, INACTIVE, ALL"),
    unmapped_only: bool = Query(False, description="Filter to show only unmapped branches"),
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the complete 5-tier authoritative tree:
    TENANT -> COMPANY MASTER -> MASTER DISTRIBUTOR -> DISTRIBUTOR -> RETAILER.
    Supports global search, hierarchical filters, and unmapped highlights.
    """
    return await AdminOrgMappingService.get_hierarchy_tree(
        db=db,
        search=search,
        tenant_filter=tenant_id,
        company_filter=company_id,
        status_filter=status,
        unmapped_only=unmapped_only
    )


# ─── UNMAPPED RECORDS ─────────────────────────────────────────────────────────

@router.get("/admin/org-mapping/unmapped", summary="Get Unmapped Entities")
@router.get("/api/v1/admin/org-mapping/unmapped", summary="Get Unmapped Entities")
async def get_unmapped_records(
    entity_type: Optional[str] = Query(None, description="Filter entity type: DISTRIBUTOR, RETAILER"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated list of unmapped records (distributors without master distributor,
    retailers without distributor).
    """
    return await AdminOrgMappingService.get_unmapped_records(
        db=db,
        entity_type=entity_type,
        page=page,
        page_size=page_size,
        search=search
    )


# ─── ENTITY DETAILS & LINEAGE ─────────────────────────────────────────────────

@router.get("/admin/org-mapping/entity/{entity_type}/{entity_id}", summary="Get Entity Details & Lineage")
@router.get("/api/v1/admin/org-mapping/entity/{entity_type}/{entity_id}", summary="Get Entity Details & Lineage")
async def get_entity_details(
    entity_type: str,
    entity_id: str,
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full metadata, ancestor lineage, direct child count, and mapped users.
    """
    return await AdminOrgMappingService.get_entity_details(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id
    )


# ─── DEPENDENT DROPDOWNS / OPTIONS ────────────────────────────────────────────

@router.get("/admin/org-mapping/options", summary="Get Cascaded Hierarchy Options")
@router.get("/api/v1/admin/org-mapping/options", summary="Get Cascaded Hierarchy Options")
async def get_cascaded_options(
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns structured options of Tenants, Companies, Master Distributors, and Distributors
    for rendering cascaded dependent selectors in the Admin Mapping modal.
    """
    return await AdminOrgMappingService.get_cascaded_options(db=db)


# ─── TRANSACTIONAL MAPPING ASSIGNMENT ─────────────────────────────────────────

@router.post("/admin/org-mapping/assign", summary="Assign or Reassign Organizational Mapping")
@router.post("/api/v1/admin/org-mapping/assign", summary="Assign or Reassign Organizational Mapping")
async def assign_mapping(
    req: AssignMappingRequest,
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Assigns or updates an entity's organizational parent relationship.
    Validates tenant, company, and master distributor integrity to reject invalid combinations.
    Transactional with audit event logging.
    """
    actor_email = getattr(current_admin, "email", "admin@pay2pay.in") or "admin@pay2pay.in"
    return await AdminOrgMappingService.assign_mapping(
        db=db,
        actor_user=current_admin,
        actor_email=actor_email,
        req=req
    )


# ─── TRANSACTIONAL UNMAPPING ──────────────────────────────────────────────────

@router.post("/admin/org-mapping/unmap", summary="Unmap Entity from Hierarchy")
@router.post("/api/v1/admin/org-mapping/unmap", summary="Unmap Entity from Hierarchy")
async def unmap_entity(
    req: UnmapRequest,
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Unmaps a child entity from its parent hierarchy with audit event logging.
    """
    actor_email = getattr(current_admin, "email", "admin@pay2pay.in") or "admin@pay2pay.in"
    return await AdminOrgMappingService.unmap_entity(
        db=db,
        actor_user=current_admin,
        actor_email=actor_email,
        req=req
    )


# ─── MAPPING AUDIT HISTORY ────────────────────────────────────────────────────

@router.get("/admin/org-mapping/history", summary="Get Mapping Audit History")
@router.get("/api/v1/admin/org-mapping/history", summary="Get Mapping Audit History")
async def get_mapping_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_admin: AdminUserModel = Depends(require_admin_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns audit trail of organizational mapping changes from public.audit_log.
    """
    return await AdminOrgMappingService.get_mapping_history(
        db=db,
        page=page,
        page_size=page_size
    )
