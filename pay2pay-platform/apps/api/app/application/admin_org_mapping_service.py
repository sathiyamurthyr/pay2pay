import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, text

from app.infrastructure.db.models import (
    AdminUserModel, CompanyModel, SuperDistributorModel,
    DistributorModel, RetailerModel, TenantModel
)
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.services.audit_service import AuditLogger


class AssignMappingRequest(BaseModel):
    entity_type: str = Field(..., description="Target entity type: MASTER_DISTRIBUTOR, DISTRIBUTOR, RETAILER")
    entity_id: str = Field(..., description="Target entity UUID")
    parent_type: str = Field(..., description="Parent entity type: COMPANY, MASTER_DISTRIBUTOR, DISTRIBUTOR")
    parent_id: str = Field(..., description="Parent entity UUID")
    tenant_id: Optional[str] = Field(None, description="Optional Tenant UUID for validation")
    company_id: Optional[str] = Field(None, description="Optional Company UUID for validation")
    master_distributor_id: Optional[str] = Field(None, description="Optional Master Distributor UUID for validation")
    reason: Optional[str] = Field(None, description="Administrative reason for mapping change")


class UnmapRequest(BaseModel):
    entity_type: str = Field(..., description="Target entity type: MASTER_DISTRIBUTOR, DISTRIBUTOR, RETAILER")
    entity_id: str = Field(..., description="Target entity UUID")
    reason: Optional[str] = Field(None, description="Administrative reason for unmapping")


class AdminOrgMappingService:
    """
    Authoritative Administrative Service for Organization Mapping and Hierarchy Validation.
    Enforces the 5-tier organizational hierarchy:
    TENANT -> COMPANY MASTER -> MASTER DISTRIBUTOR -> DISTRIBUTOR -> RETAILER
    """

    @classmethod
    async def get_summary(cls, db: AsyncSession, tenant_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Returns real database summary metrics for all hierarchy levels and unmapped counts.
        """
        try:
            view_res = await db.execute(text("SELECT * FROM public.view_org_hierarchy_summary"))
            row = view_res.mappings().first()
            if row:
                d = dict(row)
                unmapped_total = (d.get("unmapped_distributors") or 0) + (d.get("unmapped_retailers") or 0)
                mapped_total = (d.get("total_distributors") or 0) - (d.get("unmapped_distributors") or 0) + \
                               (d.get("total_retailers") or 0) - (d.get("unmapped_retailers") or 0)
                return {
                    "total_tenants": d.get("total_tenants", 0),
                    "total_companies": d.get("total_companies", 0),
                    "total_master_distributors": d.get("total_master_distributors", 0),
                    "total_distributors": d.get("total_distributors", 0),
                    "total_retailers": d.get("total_retailers", 0),
                    "unmapped_distributors": d.get("unmapped_distributors", 0),
                    "unmapped_retailers": d.get("unmapped_retailers", 0),
                    "mapped_records": max(0, mapped_total),
                    "unmapped_records": unmapped_total
                }
        except Exception:
            pass

        # Fallback to direct queries
        total_tenants = (await db.execute(select(func.count(TenantModel.id)).where(TenantModel.is_deleted == False))).scalar() or 0
        total_companies = (await db.execute(select(func.count(CompanyModel.id)).where(CompanyModel.is_deleted == False))).scalar() or 0
        total_sds = (await db.execute(select(func.count(SuperDistributorModel.id)).where(SuperDistributorModel.is_deleted == False))).scalar() or 0
        total_dists = (await db.execute(select(func.count(DistributorModel.id)).where(DistributorModel.is_deleted == False))).scalar() or 0
        total_retailers = (await db.execute(select(func.count(RetailerModel.id)).where(RetailerModel.is_deleted == False))).scalar() or 0

        unmapped_dists = (await db.execute(select(func.count(DistributorModel.id)).where(
            DistributorModel.mapped_super_distributor_id.is_(None),
            DistributorModel.is_deleted == False
        ))).scalar() or 0

        unmapped_ret = (await db.execute(select(func.count(RetailerModel.id)).where(
            RetailerModel.mapped_distributor_id.is_(None),
            RetailerModel.is_deleted == False
        ))).scalar() or 0

        mapped_total = (total_dists - unmapped_dists) + (total_retailers - unmapped_ret)

        return {
            "total_tenants": total_tenants,
            "total_companies": total_companies,
            "total_master_distributors": total_sds,
            "total_distributors": total_dists,
            "total_retailers": total_retailers,
            "unmapped_distributors": unmapped_dists,
            "unmapped_retailers": unmapped_ret,
            "mapped_records": max(0, mapped_total),
            "unmapped_records": unmapped_dists + unmapped_ret
        }

    @classmethod
    async def get_hierarchy_tree(
        cls,
        db: AsyncSession,
        search: Optional[str] = None,
        tenant_filter: Optional[str] = None,
        company_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        unmapped_only: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Builds complete 5-tier authoritative tree:
        TENANT -> COMPANY MASTER -> MASTER DISTRIBUTOR -> DISTRIBUTOR -> RETAILER
        Handles unmapped nodes and provides search/filter criteria.
        """
        # 1. Fetch Tenants
        t_stmt = select(TenantModel).where(TenantModel.is_deleted == False)
        if status_filter and status_filter.upper() != "ALL":
            is_act = status_filter.upper() == "ACTIVE"
            t_stmt = t_stmt.where(TenantModel.is_active == is_act)
        tenants = (await db.execute(t_stmt.order_by(TenantModel.tenant_ref_id))).scalars().all()

        # 2. Fetch Companies
        c_stmt = select(CompanyModel).where(CompanyModel.is_deleted == False)
        if company_filter:
            c_stmt = c_stmt.where(CompanyModel.public_id == uuid.UUID(company_filter))
        companies = (await db.execute(c_stmt.order_by(CompanyModel.company_ref_id))).scalars().all()

        # 3. Fetch Master Distributors (Super Distributors)
        sd_stmt = select(SuperDistributorModel).where(SuperDistributorModel.is_deleted == False)
        sds = (await db.execute(sd_stmt.order_by(SuperDistributorModel.super_distributor_ref_id))).scalars().all()

        # 4. Fetch Distributors
        d_stmt = select(DistributorModel).where(DistributorModel.is_deleted == False)
        dists = (await db.execute(d_stmt.order_by(DistributorModel.distributor_ref_id))).scalars().all()

        # 5. Fetch Retailers
        r_stmt = select(RetailerModel).where(RetailerModel.is_deleted == False)
        retailers = (await db.execute(r_stmt.order_by(RetailerModel.retailer_ref_id))).scalars().all()

        # Search query matching helper
        search_term = (search or "").strip().lower()

        def matches_search(item_dict: Dict[str, Any]) -> bool:
            if not search_term:
                return True
            fields = [
                str(item_dict.get("name") or "").lower(),
                str(item_dict.get("code") or "").lower(),
                str(item_dict.get("mobile") or "").lower(),
                str(item_dict.get("email") or "").lower()
            ]
            return any(search_term in f for f in fields)

        # Index retailers under distributors
        retailer_nodes_by_dist: Dict[str, List[Dict[str, Any]]] = {}
        unmapped_retailer_nodes: List[Dict[str, Any]] = []

        for r in retailers:
            node = {
                "id": str(r.public_id),
                "public_id": str(r.public_id),
                "ref_id": r.retailer_ref_id,
                "type": "RETAILER",
                "name": r.store_name or r.legal_name,
                "code": r.retailer_code,
                "status": r.status,
                "is_active": r.is_active,
                "parent_id": str(r.mapped_distributor_id) if r.mapped_distributor_id else None,
                "mapped_distributor_id": str(r.mapped_distributor_id) if r.mapped_distributor_id else None,
                "mapped_super_distributor_id": str(r.mapped_super_distributor_id) if getattr(r, "mapped_super_distributor_id", None) else None,
                "company_id": str(r.company_id) if r.company_id else None,
                "tenant_id": str(r.tenant_id) if r.tenant_id else None,
                "children_count": 0,
                "children": []
            }
            if matches_search(node):
                if r.mapped_distributor_id:
                    retailer_nodes_by_dist.setdefault(str(r.mapped_distributor_id), []).append(node)
                else:
                    unmapped_retailer_nodes.append(node)

        # Index distributors under master distributors
        dist_nodes_by_sd: Dict[str, List[Dict[str, Any]]] = {}
        unmapped_dist_nodes: List[Dict[str, Any]] = []

        for d in dists:
            child_retailers = retailer_nodes_by_dist.get(str(d.public_id), [])
            node = {
                "id": str(d.public_id),
                "public_id": str(d.public_id),
                "ref_id": d.distributor_ref_id,
                "type": "DISTRIBUTOR",
                "name": d.business_name or d.owner_name,
                "code": d.distributor_code or f"DIST-{d.distributor_ref_id}",
                "status": d.status,
                "is_active": d.is_active,
                "mobile": d.mobile,
                "email": d.email,
                "parent_id": str(d.mapped_super_distributor_id) if d.mapped_super_distributor_id else None,
                "mapped_super_distributor_id": str(d.mapped_super_distributor_id) if d.mapped_super_distributor_id else None,
                "company_id": str(d.company_id) if d.company_id else None,
                "tenant_id": str(d.tenant_id) if d.tenant_id else None,
                "children_count": len(child_retailers),
                "children": child_retailers
            }
            if matches_search(node) or child_retailers:
                if d.mapped_super_distributor_id:
                    dist_nodes_by_sd.setdefault(str(d.mapped_super_distributor_id), []).append(node)
                else:
                    unmapped_dist_nodes.append(node)

        # Index master distributors under companies
        sd_nodes_by_comp: Dict[str, List[Dict[str, Any]]] = {}
        unmapped_sd_nodes: List[Dict[str, Any]] = []

        for sd in sds:
            child_dists = dist_nodes_by_sd.get(str(sd.public_id), [])
            node = {
                "id": str(sd.public_id),
                "public_id": str(sd.public_id),
                "ref_id": sd.super_distributor_ref_id,
                "type": "MASTER_DISTRIBUTOR",
                "name": sd.business_name or sd.owner_name,
                "code": sd.super_distributor_code or f"MD-{sd.super_distributor_ref_id}",
                "status": sd.status,
                "is_active": sd.is_active,
                "mobile": sd.mobile,
                "email": sd.email,
                "parent_id": str(sd.company_id) if sd.company_id else None,
                "company_id": str(sd.company_id) if sd.company_id else None,
                "tenant_id": str(sd.tenant_id) if sd.tenant_id else None,
                "children_count": len(child_dists),
                "children": child_dists
            }
            if matches_search(node) or child_dists:
                if sd.company_id:
                    sd_nodes_by_comp.setdefault(str(sd.company_id), []).append(node)
                else:
                    unmapped_sd_nodes.append(node)

        # Index companies under tenants
        comp_nodes_by_tenant: Dict[str, List[Dict[str, Any]]] = {}
        for c in companies:
            child_sds = sd_nodes_by_comp.get(str(c.public_id), [])
            # Also attach any unmapped distributors belonging to this company
            comp_unmapped_dists = [d for d in unmapped_dist_nodes if d.get("company_id") == str(c.public_id)]

            node = {
                "id": str(c.public_id),
                "public_id": str(c.public_id),
                "ref_id": c.company_ref_id,
                "type": "COMPANY_MASTER",
                "name": c.company_name,
                "code": c.company_code,
                "status": c.status,
                "is_active": c.is_active,
                "parent_id": str(c.tenant_id) if c.tenant_id else None,
                "tenant_id": str(c.tenant_id) if c.tenant_id else None,
                "children_count": len(child_sds) + len(comp_unmapped_dists),
                "children": child_sds + ([{
                    "id": f"unmapped-dists-{c.public_id}",
                    "type": "UNMAPPED_GROUP",
                    "name": f"Unmapped Distributors ({len(comp_unmapped_dists)})",
                    "code": "UNMAPPED",
                    "status": "ATTENTION_REQUIRED",
                    "children": comp_unmapped_dists,
                    "children_count": len(comp_unmapped_dists)
                }] if comp_unmapped_dists else [])
            }
            if matches_search(node) or child_sds or comp_unmapped_dists:
                t_key = str(c.tenant_id) if c.tenant_id else "UNMAPPED"
                comp_nodes_by_tenant.setdefault(t_key, []).append(node)

        # Build final Tenant roots
        tree_roots: List[Dict[str, Any]] = []
        for t in tenants:
            if tenant_filter and str(t.public_id) != tenant_filter:
                continue

            child_comps = comp_nodes_by_tenant.get(str(t.public_id), [])
            t_node = {
                "id": str(t.public_id),
                "public_id": str(t.public_id),
                "ref_id": t.tenant_ref_id,
                "type": "TENANT",
                "name": t.name,
                "code": t.code,
                "status": "ACTIVE" if t.is_active else "INACTIVE",
                "is_active": t.is_active,
                "parent_id": None,
                "children_count": len(child_comps),
                "children": child_comps
            }

            if not unmapped_only:
                if matches_search(t_node) or child_comps:
                    tree_roots.append(t_node)

        # If unmapped records exist at top level, add a dedicated Unmapped root for easy resolution
        if unmapped_retailer_nodes or unmapped_dist_nodes or unmapped_only:
            unmapped_root = {
                "id": "unmapped-root",
                "public_id": "unmapped-root",
                "ref_id": 0,
                "type": "UNMAPPED_SECTION",
                "name": "Unmapped Entities (Attention Required)",
                "code": "UNMAPPED",
                "status": "PENDING_MAPPING",
                "is_active": False,
                "parent_id": None,
                "children_count": len(unmapped_dist_nodes) + len(unmapped_retailer_nodes),
                "children": [
                    {
                        "id": "unmapped-distributors-group",
                        "type": "UNMAPPED_GROUP",
                        "name": f"Unmapped Distributors ({len(unmapped_dist_nodes)})",
                        "code": "UNMAPPED_DIST",
                        "status": "PENDING",
                        "children_count": len(unmapped_dist_nodes),
                        "children": unmapped_dist_nodes
                    },
                    {
                        "id": "unmapped-retailers-group",
                        "type": "UNMAPPED_GROUP",
                        "name": f"Unmapped Retailers ({len(unmapped_retailer_nodes)})",
                        "code": "UNMAPPED_RET",
                        "status": "PENDING",
                        "children_count": len(unmapped_retailer_nodes),
                        "children": unmapped_retailer_nodes
                    }
                ]
            }
            if unmapped_only:
                return [unmapped_root]
            tree_roots.append(unmapped_root)

        return tree_roots

    @classmethod
    async def get_unmapped_records(
        cls,
        db: AsyncSession,
        entity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves paginated list of unmapped records across Distributors and Retailers.
        """
        items: List[Dict[str, Any]] = []
        search_term = f"%{(search or '').strip().lower()}%" if search else None

        # Distributors without Master Distributor
        if not entity_type or entity_type.upper() in ("DISTRIBUTOR", "DIST"):
            d_stmt = select(DistributorModel).where(
                DistributorModel.mapped_super_distributor_id.is_(None),
                DistributorModel.is_deleted == False
            )
            if search_term:
                d_stmt = d_stmt.where(
                    or_(
                        DistributorModel.business_name.ilike(search_term),
                        DistributorModel.distributor_code.ilike(search_term),
                        DistributorModel.mobile.ilike(search_term)
                    )
                )
            dists = (await db.execute(d_stmt)).scalars().all()
            for d in dists:
                items.append({
                    "entity_type": "DISTRIBUTOR",
                    "entity_id": str(d.public_id),
                    "ref_id": d.distributor_ref_id,
                    "code": d.distributor_code or f"DIST-{d.distributor_ref_id}",
                    "name": d.business_name or d.owner_name,
                    "mobile": d.mobile,
                    "email": d.email,
                    "status": d.status,
                    "missing_relationship": "Master Distributor (Super Distributor)",
                    "tenant_id": str(d.tenant_id) if d.tenant_id else None,
                    "company_id": str(d.company_id) if d.company_id else None,
                    "created_at": d.created_date.isoformat() if d.created_date else None
                })

        # Retailers without Distributor
        if not entity_type or entity_type.upper() in ("RETAILER", "RET"):
            r_stmt = select(RetailerModel).where(
                RetailerModel.mapped_distributor_id.is_(None),
                RetailerModel.is_deleted == False
            )
            if search_term:
                r_stmt = r_stmt.where(
                    or_(
                        RetailerModel.store_name.ilike(search_term),
                        RetailerModel.retailer_code.ilike(search_term),
                        RetailerModel.owner_name.ilike(search_term)
                    )
                )
            retailers = (await db.execute(r_stmt)).scalars().all()
            for r in retailers:
                items.append({
                    "entity_type": "RETAILER",
                    "entity_id": str(r.public_id),
                    "ref_id": r.retailer_ref_id,
                    "code": r.retailer_code,
                    "name": r.store_name or r.legal_name,
                    "mobile": None,
                    "email": None,
                    "status": r.status,
                    "missing_relationship": "Distributor",
                    "tenant_id": str(r.tenant_id) if r.tenant_id else None,
                    "company_id": str(r.company_id) if r.company_id else None,
                    "created_at": r.created_date.isoformat() if r.created_date else None
                })

        total = len(items)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = items[start:end]

        return {
            "items": paginated,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }

    @classmethod
    async def get_entity_details(
        cls,
        db: AsyncSession,
        entity_type: str,
        entity_id: str
    ) -> Dict[str, Any]:
        """
        Returns full deep metadata, lineage path, direct children, and mapped users.
        """
        parsed_id = uuid.UUID(entity_id)
        ent = entity_type.upper()

        lineage: Dict[str, Any] = {}
        basic: Dict[str, Any] = {}
        children_list: List[Dict[str, Any]] = []
        mapped_users: List[Dict[str, Any]] = []

        if ent == "TENANT":
            t = (await db.execute(select(TenantModel).where(TenantModel.public_id == parsed_id))).scalar_one_or_none()
            if not t:
                raise HTTPException(status_code=404, detail="Tenant not found")
            basic = {
                "entity_type": "TENANT",
                "id": str(t.public_id),
                "ref_id": t.tenant_ref_id,
                "name": t.name,
                "code": t.code,
                "status": "ACTIVE" if t.is_active else "INACTIVE",
                "is_active": t.is_active,
                "created_at": str(t.created_at) if hasattr(t, "created_at") else None
            }
            # Children: Companies
            comps = (await db.execute(select(CompanyModel).where(CompanyModel.tenant_id == parsed_id, CompanyModel.is_deleted == False))).scalars().all()
            children_list = [{"id": str(c.public_id), "name": c.company_name, "code": c.company_code, "type": "COMPANY_MASTER"} for c in comps]

        elif ent in ("COMPANY", "COMPANY_MASTER"):
            c = (await db.execute(select(CompanyModel).where(CompanyModel.public_id == parsed_id))).scalar_one_or_none()
            if not c:
                raise HTTPException(status_code=404, detail="Company not found")
            basic = {
                "entity_type": "COMPANY_MASTER",
                "id": str(c.public_id),
                "ref_id": c.company_ref_id,
                "name": c.company_name,
                "code": c.company_code,
                "status": c.status,
                "is_active": c.is_active,
                "created_at": c.created_date.isoformat() if c.created_date else None
            }
            # Parent Tenant
            if c.tenant_id:
                t = (await db.execute(select(TenantModel).where(TenantModel.public_id == c.tenant_id))).scalar_one_or_none()
                if t:
                    lineage["tenant"] = {"id": str(t.public_id), "name": t.name, "code": t.code}
            # Children: Master Distributors
            sds = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.company_id == parsed_id, SuperDistributorModel.is_deleted == False))).scalars().all()
            children_list = [{"id": str(s.public_id), "name": s.business_name, "code": s.super_distributor_code, "type": "MASTER_DISTRIBUTOR"} for s in sds]

        elif ent in ("MASTER_DISTRIBUTOR", "SUPER_DISTRIBUTOR"):
            sd = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.public_id == parsed_id))).scalar_one_or_none()
            if not sd:
                raise HTTPException(status_code=404, detail="Master Distributor not found")
            basic = {
                "entity_type": "MASTER_DISTRIBUTOR",
                "id": str(sd.public_id),
                "ref_id": sd.super_distributor_ref_id,
                "name": sd.business_name,
                "owner_name": sd.owner_name,
                "code": sd.super_distributor_code,
                "status": sd.status,
                "is_active": sd.is_active,
                "mobile": sd.mobile,
                "email": sd.email,
                "wallet_balance": sd.wallet_balance,
                "created_at": sd.created_date.isoformat() if sd.created_date else None
            }
            # Parent Lineage
            if sd.company_id:
                c = (await db.execute(select(CompanyModel).where(CompanyModel.public_id == sd.company_id))).scalar_one_or_none()
                if c:
                    lineage["company"] = {"id": str(c.public_id), "name": c.company_name, "code": c.company_code}
            if sd.tenant_id:
                t = (await db.execute(select(TenantModel).where(TenantModel.public_id == sd.tenant_id))).scalar_one_or_none()
                if t:
                    lineage["tenant"] = {"id": str(t.public_id), "name": t.name, "code": t.code}
            # Children: Distributors
            dists = (await db.execute(select(DistributorModel).where(DistributorModel.mapped_super_distributor_id == parsed_id, DistributorModel.is_deleted == False))).scalars().all()
            children_list = [{"id": str(d.public_id), "name": d.business_name, "code": d.distributor_code, "type": "DISTRIBUTOR"} for d in dists]

        elif ent == "DISTRIBUTOR":
            d = (await db.execute(select(DistributorModel).where(DistributorModel.public_id == parsed_id))).scalar_one_or_none()
            if not d:
                raise HTTPException(status_code=404, detail="Distributor not found")
            basic = {
                "entity_type": "DISTRIBUTOR",
                "id": str(d.public_id),
                "ref_id": d.distributor_ref_id,
                "name": d.business_name,
                "owner_name": d.owner_name,
                "code": d.distributor_code,
                "status": d.status,
                "is_active": d.is_active,
                "mobile": d.mobile,
                "email": d.email,
                "wallet_balance": d.wallet_balance,
                "created_at": d.created_date.isoformat() if d.created_date else None
            }
            # Parent Lineage
            if d.mapped_super_distributor_id:
                sd = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.public_id == d.mapped_super_distributor_id))).scalar_one_or_none()
                if sd:
                    lineage["master_distributor"] = {"id": str(sd.public_id), "name": sd.business_name, "code": sd.super_distributor_code}
            if d.company_id:
                c = (await db.execute(select(CompanyModel).where(CompanyModel.public_id == d.company_id))).scalar_one_or_none()
                if c:
                    lineage["company"] = {"id": str(c.public_id), "name": c.company_name, "code": c.company_code}
            if d.tenant_id:
                t = (await db.execute(select(TenantModel).where(TenantModel.public_id == d.tenant_id))).scalar_one_or_none()
                if t:
                    lineage["tenant"] = {"id": str(t.public_id), "name": t.name, "code": t.code}
            # Children: Retailers
            rets = (await db.execute(select(RetailerModel).where(RetailerModel.mapped_distributor_id == parsed_id, RetailerModel.is_deleted == False))).scalars().all()
            children_list = [{"id": str(r.public_id), "name": r.store_name or r.legal_name, "code": r.retailer_code, "type": "RETAILER"} for r in rets]

            # Mapped Auth User
            if d.mobile:
                u_stmt = select(AuthUserModel).where(AuthUserModel.mobile_number == d.mobile, AuthUserModel.is_deleted == False)
                u = (await db.execute(u_stmt)).scalar_one_or_none()
                if u:
                    mapped_users.append({
                        "user_id": str(u.user_id),
                        "role": u.role,
                        "full_name": u.full_name,
                        "mobile": u.mobile_number,
                        "status": u.account_status
                    })

        elif ent == "RETAILER":
            r = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == parsed_id))).scalar_one_or_none()
            if not r:
                raise HTTPException(status_code=404, detail="Retailer not found")
            basic = {
                "entity_type": "RETAILER",
                "id": str(r.public_id),
                "ref_id": r.retailer_ref_id,
                "name": r.store_name or r.legal_name,
                "owner_name": r.owner_name,
                "code": r.retailer_code,
                "status": r.status,
                "is_active": r.is_active,
                "business_category": r.business_category,
                "created_at": r.created_date.isoformat() if r.created_date else None
            }
            # Parent Lineage
            if r.mapped_distributor_id:
                d = (await db.execute(select(DistributorModel).where(DistributorModel.public_id == r.mapped_distributor_id))).scalar_one_or_none()
                if d:
                    lineage["distributor"] = {"id": str(d.public_id), "name": d.business_name, "code": d.distributor_code}
                    if d.mapped_super_distributor_id:
                        sd = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.public_id == d.mapped_super_distributor_id))).scalar_one_or_none()
                        if sd:
                            lineage["master_distributor"] = {"id": str(sd.public_id), "name": sd.business_name, "code": sd.super_distributor_code}
            if r.company_id:
                c = (await db.execute(select(CompanyModel).where(CompanyModel.public_id == r.company_id))).scalar_one_or_none()
                if c:
                    lineage["company"] = {"id": str(c.public_id), "name": c.company_name, "code": c.company_code}
            if r.tenant_id:
                t = (await db.execute(select(TenantModel).where(TenantModel.public_id == r.tenant_id))).scalar_one_or_none()
                if t:
                    lineage["tenant"] = {"id": str(t.public_id), "name": t.name, "code": t.code}

        return {
            "basic": basic,
            "lineage": lineage,
            "children_count": len(children_list),
            "children": children_list,
            "mapped_users": mapped_users
        }

    @classmethod
    async def get_cascaded_options(cls, db: AsyncSession) -> Dict[str, Any]:
        """
        Returns structured lists of Tenants, Companies, Master Distributors, and Distributors
        for rendering dependent dropdowns in the Admin Mapping modal.
        """
        tenants = (await db.execute(select(TenantModel.public_id, TenantModel.name, TenantModel.code, TenantModel.tenant_ref_id).where(TenantModel.is_active == True, TenantModel.is_deleted == False))).fetchall()
        companies = (await db.execute(select(CompanyModel.public_id, CompanyModel.company_name, CompanyModel.company_code, CompanyModel.company_ref_id, CompanyModel.tenant_id, CompanyModel.tenant_ref_id).where(CompanyModel.is_active == True, CompanyModel.is_deleted == False))).fetchall()
        sds = (await db.execute(select(SuperDistributorModel.public_id, SuperDistributorModel.business_name, SuperDistributorModel.super_distributor_code, SuperDistributorModel.super_distributor_ref_id, SuperDistributorModel.company_id, SuperDistributorModel.tenant_id).where(SuperDistributorModel.is_active == True, SuperDistributorModel.is_deleted == False))).fetchall()
        dists = (await db.execute(select(DistributorModel.public_id, DistributorModel.business_name, DistributorModel.distributor_code, DistributorModel.distributor_ref_id, DistributorModel.mapped_super_distributor_id, DistributorModel.company_id, DistributorModel.tenant_id).where(DistributorModel.is_active == True, DistributorModel.is_deleted == False))).fetchall()

        return {
            "tenants": [{"id": str(t[0]), "name": t[1], "code": t[2], "ref_id": t[3]} for t in tenants],
            "companies": [{"id": str(c[0]), "name": c[1], "code": c[2], "ref_id": c[3], "tenant_id": str(c[4]) if c[4] else None, "tenant_ref_id": c[5]} for c in companies],
            "master_distributors": [{"id": str(s[0]), "name": s[1], "code": s[2], "ref_id": s[3], "company_id": str(s[4]) if s[4] else None, "tenant_id": str(s[5]) if s[5] else None} for s in sds],
            "distributors": [{"id": str(d[0]), "name": d[1], "code": d[2], "ref_id": d[3], "master_distributor_id": str(d[4]) if d[4] else None, "company_id": str(d[5]) if d[5] else None, "tenant_id": str(d[6]) if d[6] else None} for d in dists]
        }

    @classmethod
    async def assign_mapping(
        cls,
        db: AsyncSession,
        actor_user: Any,
        actor_email: str,
        req: AssignMappingRequest
    ) -> Dict[str, Any]:
        """
        Transactional assignment of organizational mapping with strict hierarchy validation.
        Prevents cross-tenant, cross-company, and cross-MD violations.
        Records audit event into public.audit_log.
        """
        target_uuid = uuid.UUID(req.entity_id)
        parent_uuid = uuid.UUID(req.parent_id)
        ent = req.entity_type.upper()
        p_type = req.parent_type.upper()

        # ── 1. MAPPING MASTER DISTRIBUTOR TO COMPANY ──
        if ent in ("MASTER_DISTRIBUTOR", "SUPER_DISTRIBUTOR"):
            if p_type not in ("COMPANY", "COMPANY_MASTER"):
                raise HTTPException(status_code=422, detail="Master Distributor can only be mapped to a Company Master.")

            sd = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.public_id == target_uuid))).scalar_one_or_none()
            if not sd:
                raise HTTPException(status_code=404, detail="Master Distributor entity not found.")

            comp = (await db.execute(select(CompanyModel).where(CompanyModel.public_id == parent_uuid))).scalar_one_or_none()
            if not comp:
                raise HTTPException(status_code=404, detail="Target Company Master entity not found.")

            # Cross-tenant validation
            if req.tenant_id and str(comp.tenant_id) != req.tenant_id:
                raise HTTPException(status_code=422, detail="Company does not belong to the specified Tenant.")

            old_parent_id = str(sd.company_id) if sd.company_id else None
            sd.company_id = comp.public_id
            sd.company_ref_id = comp.company_ref_id
            sd.tenant_id = comp.tenant_id
            sd.tenant_ref_id = comp.tenant_ref_id
            sd.updated_date = datetime.now(timezone.utc)
            sd.updated_by = actor_email

            action_name = "MASTER_DISTRIBUTOR_MAPPED" if not old_parent_id else "MASTER_DISTRIBUTOR_REASSIGNED"

            await db.commit()

            await AuditLogger.log_action(
                db=db,
                tenant_id=comp.tenant_id,
                action=action_name,
                resource_type="ORGANIZATION_MAPPING",
                actor_id=getattr(actor_user, "public_id", None),
                actor_email=actor_email,
                company_id=comp.public_id,
                resource_id=sd.super_distributor_code or str(sd.public_id),
                details={
                    "entity_type": "MASTER_DISTRIBUTOR",
                    "entity_id": str(sd.public_id),
                    "entity_code": sd.super_distributor_code,
                    "previous_parent": {"type": "COMPANY_MASTER", "id": old_parent_id},
                    "new_parent": {"type": "COMPANY_MASTER", "id": str(comp.public_id), "code": comp.company_code, "name": comp.company_name},
                    "reason": req.reason
                }
            )

            return {
                "success": True,
                "message": f"Master Distributor '{sd.business_name}' mapped to Company '{comp.company_name}' successfully.",
                "action": action_name,
                "entity_id": str(sd.public_id),
                "parent_id": str(comp.public_id)
            }

        # ── 2. MAPPING DISTRIBUTOR TO MASTER DISTRIBUTOR ──
        elif ent == "DISTRIBUTOR":
            if p_type not in ("MASTER_DISTRIBUTOR", "SUPER_DISTRIBUTOR"):
                raise HTTPException(status_code=422, detail="Distributor must be mapped to a Master Distributor.")

            dist = (await db.execute(select(DistributorModel).where(DistributorModel.public_id == target_uuid))).scalar_one_or_none()
            if not dist:
                raise HTTPException(status_code=404, detail="Distributor entity not found.")

            sd = (await db.execute(select(SuperDistributorModel).where(SuperDistributorModel.public_id == parent_uuid))).scalar_one_or_none()
            if not sd:
                raise HTTPException(status_code=404, detail="Target Master Distributor entity not found.")

            # Hierarchy validation: Company and Tenant check
            if req.company_id and str(sd.company_id) != req.company_id:
                raise HTTPException(status_code=422, detail="Master Distributor does not belong to the specified Company Master.")

            if req.tenant_id and str(sd.tenant_id) != req.tenant_id:
                raise HTTPException(status_code=422, detail="Master Distributor does not belong to the specified Tenant.")

            old_parent_id = str(dist.mapped_super_distributor_id) if dist.mapped_super_distributor_id else None

            # Update distributor
            dist.mapped_super_distributor_id = sd.public_id
            dist.super_distributor_ref_id = sd.super_distributor_ref_id
            dist.company_id = sd.company_id
            dist.company_ref_id = sd.company_ref_id
            dist.tenant_id = sd.tenant_id
            dist.tenant_ref_id = sd.tenant_ref_id
            dist.updated_date = datetime.now(timezone.utc)
            dist.updated_by = actor_email

            # Cascade update child retailers under this distributor
            await db.execute(
                text("""
                    UPDATE public.retailer
                    SET super_distributor_ref_id = :sd_ref,
                        mapped_super_distributor_id = :sd_id,
                        company_id = :comp_id,
                        company_ref_id = :comp_ref,
                        tenant_id = :ten_id,
                        tenant_ref_id = :ten_ref,
                        updated_date = NOW(),
                        updated_by = :actor
                    WHERE mapped_distributor_id = :dist_id
                """),
                {
                    "sd_ref": sd.super_distributor_ref_id,
                    "sd_id": str(sd.public_id),
                    "comp_id": str(sd.company_id),
                    "comp_ref": sd.company_ref_id,
                    "ten_id": str(sd.tenant_id),
                    "ten_ref": sd.tenant_ref_id,
                    "actor": actor_email,
                    "dist_id": str(dist.public_id)
                }
            )

            action_name = "DISTRIBUTOR_MAPPED" if not old_parent_id else "DISTRIBUTOR_REASSIGNED"

            await db.commit()

            await AuditLogger.log_action(
                db=db,
                tenant_id=sd.tenant_id,
                action=action_name,
                resource_type="ORGANIZATION_MAPPING",
                actor_id=getattr(actor_user, "public_id", None),
                actor_email=actor_email,
                company_id=sd.company_id,
                resource_id=dist.distributor_code or str(dist.public_id),
                details={
                    "entity_type": "DISTRIBUTOR",
                    "entity_id": str(dist.public_id),
                    "entity_code": dist.distributor_code,
                    "previous_parent": {"type": "MASTER_DISTRIBUTOR", "id": old_parent_id},
                    "new_parent": {"type": "MASTER_DISTRIBUTOR", "id": str(sd.public_id), "code": sd.super_distributor_code, "name": sd.business_name},
                    "reason": req.reason
                }
            )

            return {
                "success": True,
                "message": f"Distributor '{dist.business_name}' mapped to Master Distributor '{sd.business_name}' successfully.",
                "action": action_name,
                "entity_id": str(dist.public_id),
                "parent_id": str(sd.public_id)
            }

        # ── 3. MAPPING RETAILER TO DISTRIBUTOR ──
        elif ent == "RETAILER":
            if p_type != "DISTRIBUTOR":
                raise HTTPException(status_code=422, detail="Retailer must be mapped to a Distributor.")

            ret = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == target_uuid))).scalar_one_or_none()
            if not ret:
                raise HTTPException(status_code=404, detail="Retailer entity not found.")

            dist = (await db.execute(select(DistributorModel).where(DistributorModel.public_id == parent_uuid))).scalar_one_or_none()
            if not dist:
                raise HTTPException(status_code=404, detail="Target Distributor entity not found.")

            # Hierarchy validation: Master Distributor, Company, Tenant check
            if req.master_distributor_id and str(dist.mapped_super_distributor_id) != req.master_distributor_id:
                raise HTTPException(status_code=422, detail="Distributor does not belong to the specified Master Distributor.")

            if req.company_id and str(dist.company_id) != req.company_id:
                raise HTTPException(status_code=422, detail="Distributor does not belong to the specified Company Master.")

            if req.tenant_id and str(dist.tenant_id) != req.tenant_id:
                raise HTTPException(status_code=422, detail="Distributor does not belong to the specified Tenant.")

            old_parent_id = str(ret.mapped_distributor_id) if ret.mapped_distributor_id else None

            # Update retailer
            ret.mapped_distributor_id = dist.public_id
            ret.distributor_ref_id = dist.distributor_ref_id
            ret.mapped_super_distributor_id = dist.mapped_super_distributor_id
            ret.super_distributor_ref_id = dist.super_distributor_ref_id
            ret.company_id = dist.company_id
            ret.company_ref_id = dist.company_ref_id
            ret.tenant_id = dist.tenant_id
            ret.tenant_ref_id = dist.tenant_ref_id
            ret.updated_date = datetime.now(timezone.utc)
            ret.updated_by = actor_email

            action_name = "RETAILER_MAPPED" if not old_parent_id else "RETAILER_REASSIGNED"

            await db.commit()

            await AuditLogger.log_action(
                db=db,
                tenant_id=dist.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                action=action_name,
                resource_type="ORGANIZATION_MAPPING",
                actor_id=getattr(actor_user, "public_id", None),
                actor_email=actor_email,
                company_id=dist.company_id,
                resource_id=ret.retailer_code or str(ret.public_id),
                details={
                    "entity_type": "RETAILER",
                    "entity_id": str(ret.public_id),
                    "entity_code": ret.retailer_code,
                    "previous_parent": {"type": "DISTRIBUTOR", "id": old_parent_id},
                    "new_parent": {"type": "DISTRIBUTOR", "id": str(dist.public_id), "code": dist.distributor_code, "name": dist.business_name},
                    "reason": req.reason
                }
            )

            return {
                "success": True,
                "message": f"Retailer '{ret.store_name}' mapped to Distributor '{dist.business_name}' successfully.",
                "action": action_name,
                "entity_id": str(ret.public_id),
                "parent_id": str(dist.public_id)
            }

        else:
            raise HTTPException(status_code=422, detail=f"Unsupported entity type for mapping: {ent}")

    @classmethod
    async def unmap_entity(
        cls,
        db: AsyncSession,
        actor_user: Any,
        actor_email: str,
        req: UnmapRequest
    ) -> Dict[str, Any]:
        """
        Transactional unmapping of child entity from parent hierarchy.
        Records audit event into public.audit_log.
        """
        target_uuid = uuid.UUID(req.entity_id)
        ent = req.entity_type.upper()

        if ent == "DISTRIBUTOR":
            dist = (await db.execute(select(DistributorModel).where(DistributorModel.public_id == target_uuid))).scalar_one_or_none()
            if not dist:
                raise HTTPException(status_code=404, detail="Distributor not found.")

            old_parent_id = str(dist.mapped_super_distributor_id) if dist.mapped_super_distributor_id else None
            dist.mapped_super_distributor_id = None
            dist.super_distributor_ref_id = None
            dist.updated_date = datetime.now(timezone.utc)
            dist.updated_by = actor_email

            await db.commit()

            await AuditLogger.log_action(
                db=db,
                tenant_id=dist.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                action="DISTRIBUTOR_UNMAPPED",
                resource_type="ORGANIZATION_MAPPING",
                actor_id=getattr(actor_user, "public_id", None),
                actor_email=actor_email,
                company_id=dist.company_id,
                resource_id=dist.distributor_code or str(dist.public_id),
                details={
                    "entity_type": "DISTRIBUTOR",
                    "entity_id": str(dist.public_id),
                    "previous_parent": {"type": "MASTER_DISTRIBUTOR", "id": old_parent_id},
                    "reason": req.reason
                }
            )

            return {
                "success": True,
                "message": f"Distributor '{dist.business_name}' unmapped successfully.",
                "action": "DISTRIBUTOR_UNMAPPED",
                "entity_id": str(dist.public_id)
            }

        elif ent == "RETAILER":
            ret = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == target_uuid))).scalar_one_or_none()
            if not ret:
                raise HTTPException(status_code=404, detail="Retailer not found.")

            old_parent_id = str(ret.mapped_distributor_id) if ret.mapped_distributor_id else None
            ret.mapped_distributor_id = None
            ret.distributor_ref_id = None
            ret.mapped_super_distributor_id = None
            ret.super_distributor_ref_id = None
            ret.updated_date = datetime.now(timezone.utc)
            ret.updated_by = actor_email

            await db.commit()

            await AuditLogger.log_action(
                db=db,
                tenant_id=ret.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                action="RETAILER_UNMAPPED",
                resource_type="ORGANIZATION_MAPPING",
                actor_id=getattr(actor_user, "public_id", None),
                actor_email=actor_email,
                company_id=ret.company_id,
                resource_id=ret.retailer_code or str(ret.public_id),
                details={
                    "entity_type": "RETAILER",
                    "entity_id": str(ret.public_id),
                    "previous_parent": {"type": "DISTRIBUTOR", "id": old_parent_id},
                    "reason": req.reason
                }
            )

            return {
                "success": True,
                "message": f"Retailer '{ret.store_name}' unmapped successfully.",
                "action": "RETAILER_UNMAPPED",
                "entity_id": str(ret.public_id)
            }
        else:
            raise HTTPException(status_code=422, detail=f"Unmapping not supported for {ent}")

    @classmethod
    async def get_mapping_history(
        cls,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Retrieves audit trail of organizational mapping changes from public.audit_log.
        """
        from app.infrastructure.db.models import AuditLogModel

        audit_stmt = select(AuditLogModel).where(
            or_(
                AuditLogModel.resource_type == "ORGANIZATION_MAPPING",
                AuditLogModel.action.like("%_MAPPED%"),
                AuditLogModel.action.like("%_REASSIGNED%"),
                AuditLogModel.action.like("%_UNMAPPED%")
            )
        ).order_by(desc(AuditLogModel.created_at))

        count_stmt = select(func.count(AuditLogModel.id)).where(
            or_(
                AuditLogModel.resource_type == "ORGANIZATION_MAPPING",
                AuditLogModel.action.like("%_MAPPED%"),
                AuditLogModel.action.like("%_REASSIGNED%"),
                AuditLogModel.action.like("%_UNMAPPED%")
            )
        )
        total = (await db.execute(count_stmt)).scalar() or 0

        audit_stmt = audit_stmt.offset((page - 1) * page_size).limit(page_size)
        rows = (await db.execute(audit_stmt)).scalars().all()

        items = [
            {
                "id": str(r.public_id),
                "action": r.action,
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "actor_email": r.actor_email,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "details": r.details or {}
            }
            for r in rows
        ]

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
