"""
Enterprise Hierarchy Mapping Service.

Enforces authoritative 4-tier organization hierarchy:
COMPANY -> SUPER DISTRIBUTOR -> DISTRIBUTOR -> RETAILER

Core Principles:
1. Dynamic Resolution: Default relationships are discovered from the active database
   without hardcoding IDs (prioritizing primary active company e.g. code PAY2PAY).
2. Automatic Mapping on Approval: When an Admin approves an entity, any unmapped
   relationship is established automatically using the configured hierarchy.
3. Strict Hierarchy Immutability for Downstream Roles: Distributors and Super Distributors
   cannot modify their parent hierarchy. Only Administrators can remap relationships.
4. Transaction Auditability & Isolation:
   - When an entity is remapped, NEW transactions immediately use the new active mapping.
   - HISTORICAL transactions are NEVER updated or recalculated, preserving original
     attribution and auditability.
5. Zero Client-Side / localStorage Dependency: All mapping is database-authoritative.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_, text, case, desc

from app.infrastructure.db.models import (
    CompanyModel,
    SuperDistributorModel,
    DistributorModel,
    RetailerModel,
    TenantModel,
    RetailerAssignmentModel,
    OrganizationHierarchyModel
)
from app.infrastructure.db.distributor_models import (
    DistributorRetailerMappingModel
)

logger = logging.getLogger("HierarchyMappingService")


class HierarchyMappingService:
    """
    Authoritative service managing the 4-tier hierarchy:
    Company -> Super Distributor -> Distributor -> Retailer.
    """

    @classmethod
    async def resolve_default_hierarchy(
        cls,
        db: AsyncSession,
        company_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Dynamically discovers the authoritative default hierarchy from active DB records.
        Zero hardcoded UUIDs.
        """
        # 1. Resolve Company
        comp = None
        if company_id:
            c_stmt = select(CompanyModel).where(
                CompanyModel.public_id == company_id,
                CompanyModel.is_active == True,
                CompanyModel.is_deleted == False
            )
            comp = (await db.execute(c_stmt)).scalars().first()

        if not comp:
            # Dynamic lookup: prioritize PAY2PAY code or first active company
            c_stmt = (
                select(CompanyModel)
                .where(
                    CompanyModel.is_active == True,
                    CompanyModel.is_deleted == False
                )
                .order_by(
                    case((CompanyModel.company_code == "PAY2PAY", 0), else_=1),
                    CompanyModel.id.asc()
                )
            )
            comp = (await db.execute(c_stmt)).scalars().first()

        if not comp:
            logger.error("[HIERARCHY] No active Company found in database.")
            return {"company": None, "super_distributor": None, "distributor": None}

        # 2. Resolve Super Distributor under this Company
        sd_stmt = (
            select(SuperDistributorModel)
            .where(
                SuperDistributorModel.company_id == comp.public_id,
                SuperDistributorModel.is_active == True,
                SuperDistributorModel.is_deleted == False
            )
            .order_by(SuperDistributorModel.id.asc())
        )
        sd = (await db.execute(sd_stmt)).scalars().first()

        if not sd:
            # Fallback to any active SD
            sd_stmt_fallback = (
                select(SuperDistributorModel)
                .where(
                    SuperDistributorModel.is_active == True,
                    SuperDistributorModel.is_deleted == False
                )
                .order_by(SuperDistributorModel.id.asc())
            )
            sd = (await db.execute(sd_stmt_fallback)).scalars().first()

        # 3. Resolve Distributor under this Super Distributor
        dist = None
        if sd:
            d_stmt = (
                select(DistributorModel)
                .where(
                    DistributorModel.mapped_super_distributor_id == sd.public_id,
                    DistributorModel.is_active == True,
                    DistributorModel.is_deleted == False
                )
                .order_by(DistributorModel.id.asc())
            )
            dist = (await db.execute(d_stmt)).scalars().first()

        if not dist:
            # Fallback to any active Distributor
            d_stmt_fallback = (
                select(DistributorModel)
                .where(
                    DistributorModel.is_active == True,
                    DistributorModel.is_deleted == False
                )
                .order_by(DistributorModel.id.asc())
            )
            dist = (await db.execute(d_stmt_fallback)).scalars().first()

        return {
            "company": comp,
            "super_distributor": sd,
            "distributor": dist
        }

    @classmethod
    async def apply_default_retailer_hierarchy(
        cls,
        db: AsyncSession,
        retailer: RetailerModel,
        actor_email: str = "system@pay2pay.in",
        force_if_unmapped: bool = True
    ) -> Dict[str, Any]:
        """
        Ensures an approved retailer possesses full 4-tier hierarchy mapping.
        If unmapped, automatically maps to the default active hierarchy:
        Company -> Super Distributor -> Distributor -> Retailer.

        Synchronizes:
        - RetailerModel columns
        - distributor_retailer (DistributorRetailerMappingModel)
        - retailer_assignment (RetailerAssignmentModel)
        - organization_hierarchy (OrganizationHierarchyModel edge)
        """
        now_ts = datetime.now(timezone.utc)

        # Case A: Retailer already has an assigned distributor
        if retailer.mapped_distributor_id:
            dist = (
                await db.execute(
                    select(DistributorModel).where(
                        DistributorModel.public_id == retailer.mapped_distributor_id,
                        DistributorModel.is_deleted == False
                    )
                )
            ).scalars().first()

            if dist:
                # Backfill / synchronize hierarchy columns from distributor if missing
                changed = False
                if not retailer.distributor_ref_id or retailer.distributor_ref_id != dist.distributor_ref_id:
                    retailer.distributor_ref_id = dist.distributor_ref_id
                    changed = True
                if not retailer.mapped_super_distributor_id and dist.mapped_super_distributor_id:
                    retailer.mapped_super_distributor_id = dist.mapped_super_distributor_id
                    changed = True
                if not retailer.super_distributor_ref_id and dist.super_distributor_ref_id:
                    retailer.super_distributor_ref_id = dist.super_distributor_ref_id
                    changed = True
                if not retailer.company_id and dist.company_id:
                    retailer.company_id = dist.company_id
                    changed = True
                if not retailer.company_ref_id and dist.company_ref_id:
                    retailer.company_ref_id = dist.company_ref_id
                    changed = True
                if not retailer.tenant_id and dist.tenant_id:
                    retailer.tenant_id = dist.tenant_id
                    changed = True
                if not retailer.tenant_ref_id and dist.tenant_ref_id:
                    retailer.tenant_ref_id = dist.tenant_ref_id
                    changed = True

                if changed:
                    retailer.updated_date = now_ts
                    retailer.updated_by = actor_email

                # Ensure active record in distributor_retailer
                r_ref = retailer.retailer_ref_id or retailer.id
                d_ref = dist.distributor_ref_id or dist.id
                if r_ref and d_ref:
                    dr_mapping = None
                    for obj in db.new:
                        if isinstance(obj, DistributorRetailerMappingModel):
                            if obj.distributor_ref_id == d_ref and obj.retailer_ref_id == r_ref:
                                dr_mapping = obj
                                break
                    if not dr_mapping:
                        dr_stmt = select(DistributorRetailerMappingModel).where(
                            DistributorRetailerMappingModel.distributor_ref_id == d_ref,
                            DistributorRetailerMappingModel.retailer_ref_id == r_ref
                        )
                        dr_mapping = (await db.execute(dr_stmt)).scalars().first()
                    if not dr_mapping:
                        db.add(DistributorRetailerMappingModel(
                            distributor_ref_id=d_ref,
                            retailer_ref_id=r_ref,
                            tenant_id=retailer.tenant_id or dist.tenant_id,
                            company_id=retailer.company_id or dist.company_id,
                            status="ACTIVE"
                        ))
                    elif dr_mapping.status != "ACTIVE":
                        dr_mapping.status = "ACTIVE"
                        dr_mapping.updated_at = now_ts

                # Ensure active record in retailer_assignment
                assign_stmt = select(RetailerAssignmentModel).where(
                    RetailerAssignmentModel.retailer_id == retailer.public_id,
                    RetailerAssignmentModel.is_active == True,
                    RetailerAssignmentModel.is_deleted == False
                )
                active_assign = (await db.execute(assign_stmt)).scalars().first()
                if not active_assign:
                    db.add(RetailerAssignmentModel(
                        public_id=uuid.uuid4(),
                        tenant_id=retailer.tenant_id or dist.tenant_id,
                        company_id=retailer.company_id or dist.company_id,
                        retailer_id=retailer.public_id,
                        distributor_id=dist.public_id,
                        effective_from=now_ts,
                        is_active=True,
                        reason="Hierarchy verified and synchronized on approval",
                        created_by=actor_email
                    ))

                await db.flush()
                return {
                    "success": True,
                    "action": "EXISTING_HIERARCHY_CONFIRMED",
                    "distributor_id": str(dist.public_id),
                    "distributor_ref_id": dist.distributor_ref_id,
                    "business_name": dist.business_name
                }

        # Case B: Retailer is UNMAPPED -> Apply default hierarchy
        if not force_if_unmapped:
            return {"success": False, "message": "Retailer unmapped and force_if_unmapped is False."}

        hierarchy = await cls.resolve_default_hierarchy(
            db=db,
            company_id=retailer.company_id,
            tenant_id=retailer.tenant_id
        )

        comp = hierarchy.get("company")
        sd = hierarchy.get("super_distributor")
        dist = hierarchy.get("distributor")

        if not dist:
            logger.warning(f"[HIERARCHY] Cannot apply default hierarchy for retailer {retailer.public_id}: No active distributor.")
            return {"success": False, "message": "No active default distributor available in database."}

        # Populate Retailer Model
        retailer.mapped_distributor_id = dist.public_id
        retailer.distributor_ref_id = dist.distributor_ref_id
        retailer.mapped_super_distributor_id = dist.mapped_super_distributor_id or (sd.public_id if sd else None)
        retailer.super_distributor_ref_id = dist.super_distributor_ref_id or (sd.super_distributor_ref_id if sd else None)
        retailer.company_id = dist.company_id or (comp.public_id if comp else None)
        retailer.company_ref_id = dist.company_ref_id or (comp.company_ref_id if comp else None)
        retailer.tenant_id = dist.tenant_id or (comp.tenant_id if comp else None)
        retailer.tenant_ref_id = dist.tenant_ref_id or (comp.tenant_ref_id if comp else None)
        retailer.updated_date = now_ts
        retailer.updated_by = actor_email

        # Upsert DistributorRetailerMappingModel
        r_ref = retailer.retailer_ref_id or retailer.id
        d_ref = dist.distributor_ref_id or dist.id
        if r_ref and d_ref:
            dr_mapping = None
            for obj in db.new:
                if isinstance(obj, DistributorRetailerMappingModel):
                    if obj.distributor_ref_id == d_ref and obj.retailer_ref_id == r_ref:
                        dr_mapping = obj
                        break
            if not dr_mapping:
                dr_stmt = select(DistributorRetailerMappingModel).where(
                    DistributorRetailerMappingModel.distributor_ref_id == d_ref,
                    DistributorRetailerMappingModel.retailer_ref_id == r_ref
                )
                dr_mapping = (await db.execute(dr_stmt)).scalars().first()
            if not dr_mapping:
                db.add(DistributorRetailerMappingModel(
                    distributor_ref_id=d_ref,
                    retailer_ref_id=r_ref,
                    tenant_id=retailer.tenant_id,
                    company_id=retailer.company_id,
                    status="ACTIVE"
                ))
            else:
                dr_mapping.status = "ACTIVE"
                dr_mapping.updated_at = now_ts

        # Insert active RetailerAssignmentModel
        db.add(RetailerAssignmentModel(
            public_id=uuid.uuid4(),
            tenant_id=retailer.tenant_id,
            company_id=retailer.company_id,
            retailer_id=retailer.public_id,
            distributor_id=dist.public_id,
            effective_from=now_ts,
            is_active=True,
            reason="Default hierarchy assigned automatically on Admin approval",
            created_by=actor_email
        ))

        # Upsert OrganizationHierarchyModel edge: DISTRIBUTOR -> RETAILER
        edge_stmt = select(OrganizationHierarchyModel).where(
            OrganizationHierarchyModel.child_entity_type == "RETAILER",
            OrganizationHierarchyModel.child_entity_id == retailer.public_id,
            OrganizationHierarchyModel.parent_entity_type == "DISTRIBUTOR",
            OrganizationHierarchyModel.is_deleted == False
        )
        edge = (await db.execute(edge_stmt)).scalars().first()
        if edge:
            edge.parent_entity_id = dist.public_id
            edge.company_id = retailer.company_id
            edge.updated_by = actor_email
        else:
            db.add(OrganizationHierarchyModel(
                public_id=uuid.uuid4(),
                tenant_id=retailer.tenant_id,
                company_id=retailer.company_id,
                parent_entity_type="DISTRIBUTOR",
                parent_entity_id=dist.public_id,
                child_entity_type="RETAILER",
                child_entity_id=retailer.public_id,
                status="ACTIVE",
                created_by=actor_email
            ))

        logger.info(
            f"[HIERARCHY] Retailer '{retailer.retailer_code}' ({retailer.public_id}) automatically mapped to "
            f"Distributor '{dist.business_name}' ({dist.distributor_code}) -> SD -> Company upon approval."
        )

        await db.flush()
        return {
            "success": True,
            "action": "DEFAULT_HIERARCHY_APPLIED",
            "distributor_id": str(dist.public_id),
            "distributor_ref_id": dist.distributor_ref_id,
            "distributor_name": dist.business_name,
            "super_distributor_id": str(sd.public_id) if sd else None,
            "company_id": str(comp.public_id) if comp else None
        }

    @classmethod
    async def apply_default_distributor_hierarchy(
        cls,
        db: AsyncSession,
        distributor: DistributorModel,
        actor_email: str = "system@pay2pay.in"
    ) -> Dict[str, Any]:
        """
        Ensures a distributor is mapped to an active Super Distributor and Company.
        """
        now_ts = datetime.now(timezone.utc)
        if distributor.mapped_super_distributor_id:
            return {"success": True, "action": "ALREADY_MAPPED"}

        hierarchy = await cls.resolve_default_hierarchy(db, company_id=distributor.company_id, tenant_id=distributor.tenant_id)
        comp = hierarchy.get("company")
        sd = hierarchy.get("super_distributor")

        if not sd:
            return {"success": False, "message": "No active Super Distributor available."}

        distributor.mapped_super_distributor_id = sd.public_id
        distributor.super_distributor_ref_id = sd.super_distributor_ref_id
        distributor.company_id = sd.company_id or (comp.public_id if comp else None)
        distributor.company_ref_id = sd.company_ref_id or (comp.company_ref_id if comp else None)
        distributor.tenant_id = sd.tenant_id or (comp.tenant_id if comp else None)
        distributor.tenant_ref_id = sd.tenant_ref_id or (comp.tenant_ref_id if comp else None)
        distributor.updated_date = now_ts
        distributor.updated_by = actor_email

        # Edge: SUPER_DISTRIBUTOR -> DISTRIBUTOR
        edge_stmt = select(OrganizationHierarchyModel).where(
            OrganizationHierarchyModel.child_entity_type == "DISTRIBUTOR",
            OrganizationHierarchyModel.child_entity_id == distributor.public_id,
            OrganizationHierarchyModel.parent_entity_type == "SUPER_DISTRIBUTOR",
            OrganizationHierarchyModel.is_deleted == False
        )
        edge = (await db.execute(edge_stmt)).scalars().first()
        if edge:
            edge.parent_entity_id = sd.public_id
            edge.company_id = distributor.company_id
            edge.updated_by = actor_email
        else:
            db.add(OrganizationHierarchyModel(
                public_id=uuid.uuid4(),
                tenant_id=distributor.tenant_id,
                company_id=distributor.company_id,
                parent_entity_type="SUPER_DISTRIBUTOR",
                parent_entity_id=sd.public_id,
                child_entity_type="DISTRIBUTOR",
                child_entity_id=distributor.public_id,
                status="ACTIVE",
                created_by=actor_email
            ))

        return {
            "success": True,
            "action": "DEFAULT_SD_APPLIED",
            "super_distributor_id": str(sd.public_id),
            "super_distributor_name": sd.business_name
        }

    @classmethod
    async def apply_default_sd_hierarchy(
        cls,
        db: AsyncSession,
        sd: SuperDistributorModel,
        actor_email: str = "system@pay2pay.in"
    ) -> Dict[str, Any]:
        """
        Ensures a Super Distributor is mapped to an active Company.
        """
        now_ts = datetime.now(timezone.utc)
        if sd.company_id:
            return {"success": True, "action": "ALREADY_MAPPED"}

        hierarchy = await cls.resolve_default_hierarchy(db, tenant_id=sd.tenant_id)
        comp = hierarchy.get("company")
        if not comp:
            return {"success": False, "message": "No active Company available."}

        sd.company_id = comp.public_id
        sd.company_ref_id = comp.company_ref_id
        sd.tenant_id = comp.tenant_id
        sd.tenant_ref_id = comp.tenant_ref_id
        sd.updated_date = now_ts
        sd.updated_by = actor_email

        # Edge: COMPANY -> SUPER_DISTRIBUTOR
        edge_stmt = select(OrganizationHierarchyModel).where(
            OrganizationHierarchyModel.child_entity_type == "SUPER_DISTRIBUTOR",
            OrganizationHierarchyModel.child_entity_id == sd.public_id,
            OrganizationHierarchyModel.parent_entity_type == "COMPANY",
            OrganizationHierarchyModel.is_deleted == False
        )
        edge = (await db.execute(edge_stmt)).scalars().first()
        if edge:
            edge.parent_entity_id = comp.public_id
            edge.company_id = comp.public_id
            edge.updated_by = actor_email
        else:
            db.add(OrganizationHierarchyModel(
                public_id=uuid.uuid4(),
                tenant_id=comp.tenant_id,
                company_id=comp.public_id,
                parent_entity_type="COMPANY",
                parent_entity_id=comp.public_id,
                child_entity_type="SUPER_DISTRIBUTOR",
                child_entity_id=sd.public_id,
                status="ACTIVE",
                created_by=actor_email
            ))

        return {
            "success": True,
            "action": "DEFAULT_COMPANY_APPLIED",
            "company_id": str(comp.public_id),
            "company_name": comp.company_name
        }

    @classmethod
    async def sync_retailer_remapping(
        cls,
        db: AsyncSession,
        retailer: RetailerModel,
        new_distributor: DistributorModel,
        actor_email: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Admin action to remap a Retailer to a new Distributor:
        1. Updates RetailerModel active hierarchy fields.
        2. Deactivates previous active distributor_retailer mapping, creates/activates new.
        3. Closes previous active retailer_assignment, creates new active assignment.
        4. Updates organization_hierarchy edge.
        5. CRITICAL: NEVER updates or recalculates historical transactions in public.transactions.
        """
        now_ts = datetime.now(timezone.utc)
        old_dist_id = retailer.mapped_distributor_id
        old_dist_ref = retailer.distributor_ref_id
        ret_ref = retailer.retailer_ref_id or retailer.id
        new_dist_ref = new_distributor.distributor_ref_id or new_distributor.id

        # 1. Update RetailerModel
        retailer.mapped_distributor_id = new_distributor.public_id
        retailer.distributor_ref_id = new_distributor.distributor_ref_id
        retailer.mapped_super_distributor_id = new_distributor.mapped_super_distributor_id
        retailer.super_distributor_ref_id = new_distributor.super_distributor_ref_id
        retailer.company_id = new_distributor.company_id
        retailer.company_ref_id = new_distributor.company_ref_id
        retailer.tenant_id = new_distributor.tenant_id
        retailer.tenant_ref_id = new_distributor.tenant_ref_id
        retailer.updated_date = now_ts
        retailer.updated_by = actor_email

        # 2. Synchronize distributor_retailer table
        if ret_ref and old_dist_ref and old_dist_ref != new_dist_ref:
            # Deactivate previous mapping
            await db.execute(
                update(DistributorRetailerMappingModel)
                .where(
                    DistributorRetailerMappingModel.retailer_ref_id == ret_ref,
                    DistributorRetailerMappingModel.distributor_ref_id == old_dist_ref
                )
                .values(status="INACTIVE", updated_at=now_ts)
            )

        if ret_ref and new_dist_ref:
            # Upsert new active mapping (check db.new first for in-session objects)
            dr_record = None
            for obj in db.new:
                if isinstance(obj, DistributorRetailerMappingModel):
                    if obj.distributor_ref_id == new_dist_ref and obj.retailer_ref_id == ret_ref:
                        dr_record = obj
                        break
            if not dr_record:
                dr_stmt = select(DistributorRetailerMappingModel).where(
                    DistributorRetailerMappingModel.retailer_ref_id == ret_ref,
                    DistributorRetailerMappingModel.distributor_ref_id == new_dist_ref
                )
                dr_record = (await db.execute(dr_stmt)).scalars().first()
            if dr_record:
                dr_record.status = "ACTIVE"
                dr_record.updated_at = now_ts
            else:
                db.add(DistributorRetailerMappingModel(
                    distributor_ref_id=new_dist_ref,
                    retailer_ref_id=ret_ref,
                    tenant_id=retailer.tenant_id,
                    company_id=retailer.company_id,
                    status="ACTIVE"
                ))

        # 3. Synchronize retailer_assignment timeline
        close_stmt = select(RetailerAssignmentModel).where(
            RetailerAssignmentModel.retailer_id == retailer.public_id,
            RetailerAssignmentModel.is_active == True,
            RetailerAssignmentModel.is_deleted == False
        )
        existing_assignments = (await db.execute(close_stmt)).scalars().all()
        for a in existing_assignments:
            a.is_active = False
            a.effective_to = now_ts
            a.updated_by = actor_email

        db.add(RetailerAssignmentModel(
            public_id=uuid.uuid4(),
            tenant_id=retailer.tenant_id,
            company_id=retailer.company_id,
            retailer_id=retailer.public_id,
            distributor_id=new_distributor.public_id,
            effective_from=now_ts,
            is_active=True,
            reason=reason or "Admin remapped retailer organizational hierarchy",
            created_by=actor_email
        ))

        # 4. Synchronize organization_hierarchy edge
        edge_stmt = select(OrganizationHierarchyModel).where(
            OrganizationHierarchyModel.child_entity_type == "RETAILER",
            OrganizationHierarchyModel.child_entity_id == retailer.public_id,
            OrganizationHierarchyModel.parent_entity_type == "DISTRIBUTOR",
            OrganizationHierarchyModel.is_deleted == False
        )
        edge = (await db.execute(edge_stmt)).scalars().first()
        if edge:
            edge.parent_entity_id = new_distributor.public_id
            edge.company_id = retailer.company_id
            edge.updated_by = actor_email
        else:
            db.add(OrganizationHierarchyModel(
                public_id=uuid.uuid4(),
                tenant_id=retailer.tenant_id,
                company_id=retailer.company_id,
                parent_entity_type="DISTRIBUTOR",
                parent_entity_id=new_distributor.public_id,
                child_entity_type="RETAILER",
                child_entity_id=retailer.public_id,
                status="ACTIVE",
                created_by=actor_email
            ))

        logger.info(
            f"[HIERARCHY REMAP] Retailer '{retailer.retailer_code}' remapped from "
            f"Distributor '{old_dist_id}' to '{new_distributor.public_id}' ({new_distributor.business_name}). "
            f"Historical transactions remain untouched."
        )

        await db.flush()
        return {
            "success": True,
            "retailer_id": str(retailer.public_id),
            "old_distributor_id": str(old_dist_id) if old_dist_id else None,
            "new_distributor_id": str(new_distributor.public_id),
            "new_distributor_ref_id": new_distributor.distributor_ref_id,
            "new_distributor_name": new_distributor.business_name
        }

    @classmethod
    async def sync_distributor_remapping(
        cls,
        db: AsyncSession,
        distributor: DistributorModel,
        new_sd: SuperDistributorModel,
        actor_email: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Admin action to remap a Distributor to a new Super Distributor:
        1. Updates DistributorModel.
        2. Cascades SD and Company updates to all child Retailers under this distributor.
        3. Updates organization_hierarchy edge: SUPER_DISTRIBUTOR -> DISTRIBUTOR.
        4. CRITICAL: NEVER updates or recalculates historical transactions in public.transactions.
        """
        now_ts = datetime.now(timezone.utc)
        old_sd_id = distributor.mapped_super_distributor_id

        # 1. Update Distributor
        distributor.mapped_super_distributor_id = new_sd.public_id
        distributor.super_distributor_ref_id = new_sd.super_distributor_ref_id
        distributor.company_id = new_sd.company_id
        distributor.company_ref_id = new_sd.company_ref_id
        distributor.tenant_id = new_sd.tenant_id
        distributor.tenant_ref_id = new_sd.tenant_ref_id
        distributor.updated_date = now_ts
        distributor.updated_by = actor_email

        # 2. Cascade SD / Company update to all child retailers under this distributor
        await db.execute(
            update(RetailerModel)
            .where(
                RetailerModel.mapped_distributor_id == distributor.public_id,
                RetailerModel.is_deleted == False
            )
            .values(
                mapped_super_distributor_id=new_sd.public_id,
                super_distributor_ref_id=new_sd.super_distributor_ref_id,
                company_id=new_sd.company_id,
                company_ref_id=new_sd.company_ref_id,
                tenant_id=new_sd.tenant_id,
                tenant_ref_id=new_sd.tenant_ref_id,
                updated_date=now_ts,
                updated_by=actor_email
            )
        )

        # 3. Synchronize organization_hierarchy edge
        edge_stmt = select(OrganizationHierarchyModel).where(
            OrganizationHierarchyModel.child_entity_type == "DISTRIBUTOR",
            OrganizationHierarchyModel.child_entity_id == distributor.public_id,
            OrganizationHierarchyModel.parent_entity_type == "SUPER_DISTRIBUTOR",
            OrganizationHierarchyModel.is_deleted == False
        )
        edge = (await db.execute(edge_stmt)).scalars().first()
        if edge:
            edge.parent_entity_id = new_sd.public_id
            edge.company_id = new_sd.company_id
            edge.updated_by = actor_email
        else:
            db.add(OrganizationHierarchyModel(
                public_id=uuid.uuid4(),
                tenant_id=new_sd.tenant_id,
                company_id=new_sd.company_id,
                parent_entity_type="SUPER_DISTRIBUTOR",
                parent_entity_id=new_sd.public_id,
                child_entity_type="DISTRIBUTOR",
                child_entity_id=distributor.public_id,
                status="ACTIVE",
                created_by=actor_email
            ))

        logger.info(
            f"[HIERARCHY REMAP] Distributor '{distributor.distributor_code}' remapped from "
            f"Super Distributor '{old_sd_id}' to '{new_sd.public_id}' ({new_sd.business_name}). "
            f"Cascaded to child retailers. Historical transactions remain untouched."
        )

        await db.flush()
        return {
            "success": True,
            "distributor_id": str(distributor.public_id),
            "old_sd_id": str(old_sd_id) if old_sd_id else None,
            "new_sd_id": str(new_sd.public_id),
            "new_sd_ref_id": new_sd.super_distributor_ref_id,
            "new_sd_name": new_sd.business_name
        }
