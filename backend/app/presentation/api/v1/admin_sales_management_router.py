"""
Admin Sales Management & Hierarchy Mapping API Router.

Strictly for Administrator & Super Administrator roles:
- Add / Edit Sales Person
- Activate / Deactivate Sales Account
- Assign Tenant & Territory
- Granular Hierarchy Mapping (Super Distributor -> Distributor -> Retailer)
- Sales Activity & Audit Inspection
"""

import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete

from app.core.database import get_db
from app.application.dependencies import get_current_user
from app.infrastructure.db.models import AdminUserModel, TenantModel, CompanyModel, SuperDistributorModel, DistributorModel, RetailerModel
from app.infrastructure.db.sales_models import SalesUserModel, SalesHierarchyMappingModel, SalesAuditLogModel, SalesActivityLogModel
from app.application.sales_service import AdminSalesService

router = APIRouter(prefix="/admin/sales-management", tags=["Admin Sales Management Suite"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class CreateSalesPersonRequest(BaseModel):
    tenant_id: str = Field(..., description="Tenant UUID")
    company_id: Optional[str] = None
    employee_code: str = Field(..., min_length=2, max_length=50)
    username: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., description="Email address")
    mobile: str = Field(..., min_length=10, max_length=20)
    password: Optional[str] = Field("Sales@12345", min_length=6)
    territory: Optional[str] = None
    department: Optional[str] = "Field Sales"
    designation: Optional[str] = "Sales Officer"
    status: Optional[str] = "ACTIVE"
    mapping_type: Optional[str] = "ALL"
    super_distributor_id: Optional[str] = None
    distributor_id: Optional[str] = None
    retailer_id: Optional[str] = None
    mapping_notes: Optional[str] = None


class UpdateSalesPersonRequest(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    territory: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None


class StatusToggleRequest(BaseModel):
    status: str = Field(..., description="ACTIVE, INACTIVE, or SUSPENDED")


class AssignMappingRequest(BaseModel):
    mapping_type: str = Field(..., description="ALL, SUPER_DISTRIBUTOR, DISTRIBUTOR, or RETAILER")
    super_distributor_id: Optional[str] = None
    distributor_id: Optional[str] = None
    retailer_id: Optional[str] = None
    notes: Optional[str] = None


# ==============================================================================
# ADMIN ENDPOINTS
# ==============================================================================

@router.get("/users")
async def list_sales_users(
    tenant_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all sales personnel across tenants with mapping summaries.
    """
    return await AdminSalesService.list_sales_users(db, tenant_id, search, status, page, limit)


@router.post("/users")
async def create_sales_user(
    payload: CreateSalesPersonRequest,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new Sales User and establishes their initial hierarchy scope.
    """
    return await AdminSalesService.create_sales_user(db, current_admin, payload.dict())


@router.get("/users/{user_id}")
async def get_sales_user(
    user_id: str,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full details, assigned tenant, and current hierarchy mappings for a sales user.
    """
    u_uuid = uuid.UUID(user_id)
    user = (await db.execute(
        select(SalesUserModel).where(SalesUserModel.public_id == u_uuid, SalesUserModel.is_deleted == False)
    )).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Sales user not found.")

    # Mappings
    m_stmt = select(SalesHierarchyMappingModel).where(
        SalesHierarchyMappingModel.sales_user_id == u_uuid,
        SalesHierarchyMappingModel.is_deleted == False
    )
    mappings = (await db.execute(m_stmt)).scalars().all()

    mapping_list = []
    for m in mappings:
        sd_name = None
        dist_name = None
        ret_name = None
        if m.super_distributor_id:
            sd_name = (await db.execute(select(SuperDistributorModel.business_name).where(SuperDistributorModel.public_id == m.super_distributor_id))).scalar_one_or_none()
        if m.distributor_id:
            dist_name = (await db.execute(select(DistributorModel.business_name).where(DistributorModel.public_id == m.distributor_id))).scalar_one_or_none()
        if m.retailer_id:
            ret_name = (await db.execute(select(RetailerModel.store_name).where(RetailerModel.public_id == m.retailer_id))).scalar_one_or_none()

        mapping_list.append({
            "public_id": str(m.public_id),
            "mapping_type": m.mapping_type,
            "super_distributor_id": str(m.super_distributor_id) if m.super_distributor_id else None,
            "super_distributor_name": sd_name,
            "distributor_id": str(m.distributor_id) if m.distributor_id else None,
            "distributor_name": dist_name,
            "retailer_id": str(m.retailer_id) if m.retailer_id else None,
            "retailer_name": ret_name,
            "notes": m.notes,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat()
        })

    # Tenant Info
    t_name = (await db.execute(select(TenantModel.name).where(TenantModel.public_id == user.tenant_id))).scalar_one_or_none() or "Tenant"

    return {
        "user": {
            "public_id": str(user.public_id),
            "sales_user_ref_id": user.sales_user_ref_id,
            "employee_code": user.employee_code,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "territory": user.territory,
            "department": user.department,
            "designation": user.designation,
            "status": user.status,
            "is_active": user.is_active,
            "tenant_id": str(user.tenant_id),
            "tenant_name": t_name,
            "company_id": str(user.company_id) if user.company_id else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat()
        },
        "mappings": mapping_list
    }


@router.put("/users/{user_id}")
async def update_sales_user(
    user_id: str,
    payload: UpdateSalesPersonRequest,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates profile, department, territory, or password of a sales user.
    """
    return await AdminSalesService.update_sales_user(db, current_admin, user_id, payload.dict(exclude_unset=True))


@router.patch("/users/{user_id}/status")
async def toggle_sales_user_status(
    user_id: str,
    payload: StatusToggleRequest,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Activates, deactivates, or suspends a sales user.
    """
    return await AdminSalesService.toggle_status(db, current_admin, user_id, payload.status)


@router.post("/users/{user_id}/mappings")
async def add_sales_mapping(
    user_id: str,
    payload: AssignMappingRequest,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Adds a new hierarchy mapping (Super Distributor, Distributor, Retailer, or ALL) to a sales user.
    """
    u_uuid = uuid.UUID(user_id)
    user = (await db.execute(
        select(SalesUserModel).where(SalesUserModel.public_id == u_uuid, SalesUserModel.is_deleted == False)
    )).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Sales user not found.")

    new_map = SalesHierarchyMappingModel(
        tenant_id=user.tenant_id,
        company_id=user.company_id,
        sales_user_id=user.public_id,
        mapping_type=payload.mapping_type.upper(),
        super_distributor_id=uuid.UUID(payload.super_distributor_id) if payload.super_distributor_id else None,
        distributor_id=uuid.UUID(payload.distributor_id) if payload.distributor_id else None,
        retailer_id=uuid.UUID(payload.retailer_id) if payload.retailer_id else None,
        notes=payload.notes or "Admin configured mapping",
        created_by=getattr(current_admin, "email", "admin")
    )
    db.add(new_map)
    await db.commit()

    return {"success": True, "message": "Hierarchy mapping added successfully."}


@router.delete("/users/{user_id}/mappings/{mapping_id}")
async def delete_sales_mapping(
    user_id: str,
    mapping_id: str,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a specific hierarchy mapping.
    """
    m_uuid = uuid.UUID(mapping_id)
    u_uuid = uuid.UUID(user_id)
    await db.execute(
        delete(SalesHierarchyMappingModel).where(
            SalesHierarchyMappingModel.public_id == m_uuid,
            SalesHierarchyMappingModel.sales_user_id == u_uuid
        )
    )
    await db.commit()
    return {"success": True, "message": "Mapping removed."}


@router.get("/users/{user_id}/activity")
async def get_sales_user_activity(
    user_id: str,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Views all field activities and audit trails for a sales user.
    """
    u_uuid = uuid.UUID(user_id)
    # Field activities
    act_stmt = select(SalesActivityLogModel).where(
        SalesActivityLogModel.sales_user_id == u_uuid
    ).order_by(desc(SalesActivityLogModel.created_at)).limit(50)
    acts = (await db.execute(act_stmt)).scalars().all()

    # Audits
    aud_stmt = select(SalesAuditLogModel).where(
        SalesAuditLogModel.sales_user_id == u_uuid
    ).order_by(desc(SalesAuditLogModel.created_at)).limit(50)
    auds = (await db.execute(aud_stmt)).scalars().all()

    return {
        "field_activities": [
            {
                "public_id": str(a.public_id),
                "type": a.activity_type,
                "subject": a.subject,
                "remarks": a.remarks,
                "outcome": a.outcome,
                "created_at": a.created_at.isoformat()
            }
            for a in acts
        ],
        "audit_logs": [
            {
                "public_id": str(l.public_id),
                "action": l.action,
                "entity_type": l.entity_type,
                "status": l.status,
                "ip_address": l.ip_address,
                "financial_year_key": l.financial_year_key,
                "created_at": l.created_at.isoformat()
            }
            for l in auds
        ]
    }


@router.get("/metadata/options")
async def get_mapping_metadata(
    tenant_id: Optional[str] = Query(None),
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns dropdown lists of Tenants, Companies, Super Distributors, Distributors,
    and Retailers for mapping assignment in Admin Portal.
    """
    # Tenants
    t_stmt = select(TenantModel.public_id, TenantModel.name).where(TenantModel.status == "ACTIVE")
    tenants = [{"id": str(r[0]), "name": r[1]} for r in (await db.execute(t_stmt)).fetchall()]

    # Filtered by tenant if given
    t_uuid = uuid.UUID(tenant_id) if tenant_id else (uuid.UUID(tenants[0]["id"]) if tenants else None)

    companies = []
    sds = []
    distributors = []
    retailers = []

    if t_uuid:
        c_stmt = select(CompanyModel.public_id, CompanyModel.legal_name).where(CompanyModel.tenant_id == t_uuid, CompanyModel.status == "ACTIVE")
        companies = [{"id": str(r[0]), "name": r[1]} for r in (await db.execute(c_stmt)).fetchall()]

        sd_stmt = select(SuperDistributorModel.public_id, SuperDistributorModel.business_name).where(SuperDistributorModel.tenant_id == t_uuid, SuperDistributorModel.status == "ACTIVE", SuperDistributorModel.is_deleted == False)
        sds = [{"id": str(r[0]), "name": r[1]} for r in (await db.execute(sd_stmt)).fetchall()]

        d_stmt = select(DistributorModel.public_id, DistributorModel.business_name, DistributorModel.mapped_super_distributor_id).where(DistributorModel.tenant_id == t_uuid, DistributorModel.status == "ACTIVE", DistributorModel.is_deleted == False)
        distributors = [{"id": str(r[0]), "name": r[1], "sd_id": str(r[2]) if r[2] else None} for r in (await db.execute(d_stmt)).fetchall()]

        r_stmt = select(RetailerModel.public_id, RetailerModel.store_name, RetailerModel.mapped_distributor_id).where(RetailerModel.tenant_id == t_uuid, RetailerModel.status == "ACTIVE", RetailerModel.is_deleted == False).limit(100)
        retailers = [{"id": str(r[0]), "name": r[1], "dist_id": str(r[2]) if r[2] else None} for r in (await db.execute(r_stmt)).fetchall()]

    return {
        "tenants": tenants,
        "companies": companies,
        "super_distributors": sds,
        "distributors": distributors,
        "retailers": retailers
    }
