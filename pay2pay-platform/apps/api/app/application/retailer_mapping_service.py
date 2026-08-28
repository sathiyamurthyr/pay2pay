import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.infrastructure.db.models import (
    RetailerModel,
    CompanyModel,
    DistributorModel,
    RegionalManagerModel,
    SuperDistributorModel,
    RetailerAssignmentModel,
    OrganizationHierarchyModel,
    AdminUserModel
)
from app.application.services import AuditLogger


class RetailerMappingService:
    @classmethod
    async def get_retailer(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
    ) -> RetailerModel:
        try:
            r_uuid = uuid.UUID(str(retailer_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid retailer ID format.",
            )

        stmt = select(RetailerModel).where(
            RetailerModel.public_id == r_uuid,
            RetailerModel.is_deleted == False,
        )
        if tenant_id:
            stmt = stmt.where(RetailerModel.tenant_id == tenant_id)
        if company_id:
            stmt = stmt.where(or_(RetailerModel.company_id == company_id, RetailerModel.company_id.is_(None)))

        res = await db.execute(stmt)
        retailer = res.scalars().first()
        if not retailer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Retailer not found in authorized tenant/company context.",
            )
        return retailer

    @classmethod
    async def get_retailer_mapping(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Returns full organizational hierarchy mapping for a retailer:
        Company -> Distributor -> RM -> Retailer and historical assignment timeline.
        """
        retailer = await cls.get_retailer(db, retailer_id, tenant_id=tenant_id, company_id=company_id)

        # 1. Fetch Company
        company_info = None
        if retailer.company_id:
            comp_stmt = select(CompanyModel).where(
                CompanyModel.public_id == retailer.company_id,
                CompanyModel.is_deleted == False
            )
            c = (await db.execute(comp_stmt)).scalars().first()
            if c:
                company_info = {
                    "public_id": str(c.public_id),
                    "company_name": c.company_name,
                    "company_code": c.company_code,
                    "legal_name": c.legal_name,
                    "status": c.status
                }

        # 2. Fetch Distributor
        distributor_info = None
        if retailer.mapped_distributor_id:
            dist_stmt = select(DistributorModel).where(
                DistributorModel.public_id == retailer.mapped_distributor_id,
                DistributorModel.is_deleted == False
            )
            d = (await db.execute(dist_stmt)).scalars().first()
            if d:
                distributor_info = {
                    "public_id": str(d.public_id),
                    "business_name": d.business_name,
                    "owner_name": d.owner_name,
                    "mobile": d.mobile,
                    "email": d.email,
                    "company_id": str(d.company_id) if d.company_id else None,
                    "status": d.status
                }

        # 3. Fetch RM (Regional / Relationship Manager)
        rm_info = None
        if retailer.rm_id:
            rm_stmt = select(RegionalManagerModel).where(
                RegionalManagerModel.public_id == retailer.rm_id,
                RegionalManagerModel.is_deleted == False
            )
            r = (await db.execute(rm_stmt)).scalars().first()
            if r:
                rm_info = {
                    "public_id": str(r.public_id),
                    "employee_code": r.employee_code,
                    "full_name": r.full_name,
                    "mobile": r.mobile,
                    "email": r.email,
                    "designation": r.designation,
                    "company_id": str(r.company_id) if r.company_id else None,
                    "status": r.status
                }

        # 4. Fetch Assignment History
        hist_stmt = select(RetailerAssignmentModel).where(
            RetailerAssignmentModel.retailer_id == retailer.public_id,
            RetailerAssignmentModel.is_deleted == False
        ).order_by(desc(RetailerAssignmentModel.effective_from))
        assignments = (await db.execute(hist_stmt)).scalars().all()

        # Cache entity names for timeline display
        all_comp_ids = {a.company_id for a in assignments if a.company_id}
        all_dist_ids = {a.distributor_id for a in assignments if a.distributor_id}
        all_rm_ids = {a.rm_id for a in assignments if a.rm_id}

        comp_map = {}
        if all_comp_ids:
            c_res = await db.execute(select(CompanyModel).where(CompanyModel.public_id.in_(all_comp_ids)))
            comp_map = {str(c.public_id): c.company_name for c in c_res.scalars().all()}

        dist_map = {}
        if all_dist_ids:
            d_res = await db.execute(select(DistributorModel).where(DistributorModel.public_id.in_(all_dist_ids)))
            dist_map = {str(d.public_id): d.business_name for d in d_res.scalars().all()}

        rm_map = {}
        if all_rm_ids:
            r_res = await db.execute(select(RegionalManagerModel).where(RegionalManagerModel.public_id.in_(all_rm_ids)))
            rm_map = {str(r.public_id): r.full_name for r in r_res.scalars().all()}

        timeline = [
            {
                "assignment_id": str(a.public_id),
                "company_id": str(a.company_id),
                "company_name": comp_map.get(str(a.company_id), "Unknown Company"),
                "distributor_id": str(a.distributor_id),
                "distributor_name": dist_map.get(str(a.distributor_id), "Unknown Distributor"),
                "rm_id": str(a.rm_id) if a.rm_id else None,
                "rm_name": rm_map.get(str(a.rm_id), "Unassigned RM") if a.rm_id else "None",
                "effective_from": a.effective_from.isoformat() if a.effective_from else None,
                "effective_to": a.effective_to.isoformat() if a.effective_to else None,
                "is_active": a.is_active,
                "reason": a.reason,
                "created_by": a.created_by,
                "created_at": a.created_at.isoformat() if hasattr(a, "created_at") and a.created_at else None
            }
            for a in assignments
        ]

        return {
            "retailer": {
                "public_id": str(retailer.public_id),
                "retailer_code": retailer.retailer_code,
                "store_name": retailer.store_name,
                "legal_name": retailer.legal_name,
                "owner_name": retailer.owner_name,
                "status": retailer.status
            },
            "hierarchy_path": {
                "company": company_info,
                "distributor": distributor_info,
                "rm": rm_info
            },
            "history": timeline
        }

    @classmethod
    async def update_retailer_mapping(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        company_id: Union[uuid.UUID, str],
        distributor_id: Union[uuid.UUID, str],
        rm_id: Optional[Union[uuid.UUID, str]] = None,
        reason: Optional[str] = None,
        actor_user: Optional[AdminUserModel] = None,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Validates and updates the Retailer mapping to Company, Distributor, and RM:
        1. Enforces that Distributor belongs to the selected Company.
        2. Enforces that RM is valid for Company scope.
        3. Updates retailer row.
        4. Closes previous active retailer_assignment and inserts a new one.
        5. Logs full audit change history.
        """
        retailer = await cls.get_retailer(db, retailer_id, tenant_id=tenant_id)

        try:
            c_uuid = uuid.UUID(str(company_id))
            d_uuid = uuid.UUID(str(distributor_id))
            r_uuid = uuid.UUID(str(rm_id)) if rm_id else None
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid UUID format for company_id, distributor_id, or rm_id."
            )

        # 1. Validate Company
        comp_stmt = select(CompanyModel).where(
            CompanyModel.public_id == c_uuid,
            CompanyModel.is_deleted == False
        )
        company = (await db.execute(comp_stmt)).scalars().first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected Company does not exist or is inactive."
            )

        # 2. Validate Distributor & Company hierarchy consistency
        dist_stmt = select(DistributorModel).where(
            DistributorModel.public_id == d_uuid,
            DistributorModel.is_deleted == False
        )
        distributor = (await db.execute(dist_stmt)).scalars().first()
        if not distributor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected Distributor does not exist or is inactive."
            )

        # Strict validation: Distributor must belong to the selected Company
        if distributor.company_id and distributor.company_id != c_uuid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Hierarchy Mismatch Error: Distributor '{distributor.business_name}' "
                    f"belongs to a different company. Mapping Retailer to Company '{company.company_name}' "
                    f"with a Distributor from another Company is strictly disallowed."
                )
            )

        # 3. Validate RM (if provided)
        rm = None
        if r_uuid:
            rm_stmt = select(RegionalManagerModel).where(
                RegionalManagerModel.public_id == r_uuid,
                RegionalManagerModel.is_deleted == False
            )
            rm = (await db.execute(rm_stmt)).scalars().first()
            if not rm:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Selected Regional Manager (RM) does not exist or is inactive."
                )
            if rm.company_id and rm.company_id != c_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Hierarchy Mismatch Error: RM '{rm.full_name}' ({rm.employee_code}) "
                        f"belongs to a different company than '{company.company_name}'."
                    )
                )

        # 4. Track Old Values for Audit
        old_company_id = retailer.company_id
        old_distributor_id = retailer.mapped_distributor_id
        old_rm_id = retailer.rm_id

        # 5. Update Retailer row
        retailer.company_id = c_uuid
        retailer.mapped_distributor_id = d_uuid
        retailer.rm_id = r_uuid

        now_ts = datetime.now(timezone.utc)
        actor_email = actor_user.email if actor_user and hasattr(actor_user, "email") else "admin@pay2pay.com"

        # 6. Close previous active assignment
        close_stmt = select(RetailerAssignmentModel).where(
            RetailerAssignmentModel.retailer_id == retailer.public_id,
            RetailerAssignmentModel.is_active == True,
            RetailerAssignmentModel.is_deleted == False
        )
        existing_assignments = (await db.execute(close_stmt)).scalars().all()
        for assign in existing_assignments:
            assign.is_active = False
            assign.effective_to = now_ts
            assign.updated_by = actor_email

        # 7. Insert new active assignment
        new_assignment = RetailerAssignmentModel(
            public_id=uuid.uuid4(),
            tenant_id=retailer.tenant_id,
            company_id=c_uuid,
            retailer_id=retailer.public_id,
            distributor_id=d_uuid,
            rm_id=r_uuid,
            effective_from=now_ts,
            is_active=True,
            reason=reason or "Admin updated retailer organizational hierarchy mapping",
            created_by=actor_email
        )
        db.add(new_assignment)

        # 8. Sync Organization Hierarchy Graph Edges
        # Edge: DISTRIBUTOR -> RETAILER
        dist_edge_stmt = select(OrganizationHierarchyModel).where(
            OrganizationHierarchyModel.child_entity_type == "RETAILER",
            OrganizationHierarchyModel.child_entity_id == retailer.public_id,
            OrganizationHierarchyModel.parent_entity_type == "DISTRIBUTOR",
            OrganizationHierarchyModel.is_deleted == False
        )
        dist_edge = (await db.execute(dist_edge_stmt)).scalars().first()
        if dist_edge:
            dist_edge.parent_entity_id = d_uuid
            dist_edge.company_id = c_uuid
            dist_edge.updated_by = actor_email
        else:
            db.add(OrganizationHierarchyModel(
                public_id=uuid.uuid4(),
                tenant_id=retailer.tenant_id,
                company_id=c_uuid,
                parent_entity_type="DISTRIBUTOR",
                parent_entity_id=d_uuid,
                child_entity_type="RETAILER",
                child_entity_id=retailer.public_id,
                status="ACTIVE",
                created_by=actor_email
            ))

        # Edge: REGIONAL_MANAGER -> RETAILER (if rm_id provided)
        if r_uuid:
            rm_edge_stmt = select(OrganizationHierarchyModel).where(
                OrganizationHierarchyModel.child_entity_type == "RETAILER",
                OrganizationHierarchyModel.child_entity_id == retailer.public_id,
                OrganizationHierarchyModel.parent_entity_type == "REGIONAL_MANAGER",
                OrganizationHierarchyModel.is_deleted == False
            )
            rm_edge = (await db.execute(rm_edge_stmt)).scalars().first()
            if rm_edge:
                rm_edge.parent_entity_id = r_uuid
                rm_edge.company_id = c_uuid
                rm_edge.updated_by = actor_email
            else:
                db.add(OrganizationHierarchyModel(
                    public_id=uuid.uuid4(),
                    tenant_id=retailer.tenant_id,
                    company_id=c_uuid,
                    parent_entity_type="REGIONAL_MANAGER",
                    parent_entity_id=r_uuid,
                    child_entity_type="RETAILER",
                    child_entity_id=retailer.public_id,
                    status="ACTIVE",
                    created_by=actor_email
                ))

        await db.commit()
        await db.refresh(retailer)

        # 9. Enterprise Audit Logging
        await AuditLogger.log_action(
            db=db,
            tenant_id=retailer.tenant_id,
            company_id=c_uuid,
            actor_id=actor_user.public_id if actor_user and hasattr(actor_user, "public_id") else uuid.uuid4(),
            actor_email=actor_email,
            action="UPDATE_HIERARCHY_MAPPING",
            resource_type="RETAILER",
            resource_id=str(retailer.public_id),
            details={
                "retailer_code": retailer.retailer_code,
                "old_company_id": str(old_company_id) if old_company_id else None,
                "new_company_id": str(c_uuid),
                "old_distributor_id": str(old_distributor_id) if old_distributor_id else None,
                "new_distributor_id": str(d_uuid),
                "old_rm_id": str(old_rm_id) if old_rm_id else None,
                "new_rm_id": str(r_uuid) if r_uuid else None,
                "reason": reason or "Updated hierarchy mapping"
            }
        )

        return await cls.get_retailer_mapping(db, retailer.public_id, tenant_id=tenant_id)

    @classmethod
    async def get_company_distributors(
        cls,
        db: AsyncSession,
        company_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """Returns all active distributors belonging to a specific company."""
        try:
            c_uuid = uuid.UUID(str(company_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid company ID format."
            )

        stmt = select(DistributorModel).where(
            DistributorModel.is_deleted == False,
            DistributorModel.status == "ACTIVE",
            or_(
                DistributorModel.company_id == c_uuid,
                DistributorModel.company_id.is_(None)
            )
        ).order_by(DistributorModel.business_name.asc())

        if tenant_id:
            stmt = stmt.where(DistributorModel.tenant_id == tenant_id)

        dists = (await db.execute(stmt)).scalars().all()
        return [
            {
                "public_id": str(d.public_id),
                "business_name": d.business_name,
                "owner_name": d.owner_name,
                "mobile": d.mobile,
                "email": d.email,
                "company_id": str(d.company_id) if d.company_id else None,
                "mapped_super_distributor_id": str(d.mapped_super_distributor_id) if d.mapped_super_distributor_id else None,
                "status": d.status
            }
            for d in dists
        ]

    @classmethod
    async def get_company_rms(
        cls,
        db: AsyncSession,
        company_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """Returns all active Regional / Relationship Managers available for a company."""
        try:
            c_uuid = uuid.UUID(str(company_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid company ID format."
            )

        stmt = select(RegionalManagerModel).where(
            RegionalManagerModel.is_deleted == False,
            RegionalManagerModel.status == "ACTIVE",
            or_(
                RegionalManagerModel.company_id == c_uuid,
                RegionalManagerModel.company_id.is_(None)
            )
        ).order_by(RegionalManagerModel.full_name.asc())

        if tenant_id:
            stmt = stmt.where(RegionalManagerModel.tenant_id == tenant_id)

        rms = (await db.execute(stmt)).scalars().all()
        return [
            {
                "public_id": str(r.public_id),
                "employee_code": r.employee_code,
                "full_name": r.full_name,
                "mobile": r.mobile,
                "email": r.email,
                "designation": r.designation,
                "company_id": str(r.company_id) if r.company_id else None,
                "status": r.status
            }
            for r in rms
        ]

    @classmethod
    async def get_distributor_rms(
        cls,
        db: AsyncSession,
        distributor_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns RMs associated with a distributor (either via parent SD or distributor's company).
        """
        try:
            d_uuid = uuid.UUID(str(distributor_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid distributor ID format."
            )

        dist_stmt = select(DistributorModel).where(
            DistributorModel.public_id == d_uuid,
            DistributorModel.is_deleted == False
        )
        dist = (await db.execute(dist_stmt)).scalars().first()
        if not dist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Distributor not found."
            )

        # Check if distributor has an SD mapped with an RM
        rm_list = []
        if dist.mapped_super_distributor_id:
            sd_stmt = select(SuperDistributorModel).where(
                SuperDistributorModel.public_id == dist.mapped_super_distributor_id,
                SuperDistributorModel.is_deleted == False
            )
            sd = (await db.execute(sd_stmt)).scalars().first()
            if sd and sd.mapped_rm_id:
                rm_stmt = select(RegionalManagerModel).where(
                    RegionalManagerModel.public_id == sd.mapped_rm_id,
                    RegionalManagerModel.is_deleted == False
                )
                rm = (await db.execute(rm_stmt)).scalars().first()
                if rm:
                    rm_list.append({
                        "public_id": str(rm.public_id),
                        "employee_code": rm.employee_code,
                        "full_name": rm.full_name,
                        "mobile": rm.mobile,
                        "email": rm.email,
                        "designation": rm.designation,
                        "company_id": str(rm.company_id) if rm.company_id else None,
                        "status": rm.status,
                        "is_direct_sd_rm": True
                    })

        # Also get all RMs under the distributor's company
        if dist.company_id:
            comp_rms = await cls.get_company_rms(db, dist.company_id, tenant_id=tenant_id)
            existing_ids = {r["public_id"] for r in rm_list}
            for cr in comp_rms:
                if cr["public_id"] not in existing_ids:
                    rm_list.append(cr)

        return rm_list
