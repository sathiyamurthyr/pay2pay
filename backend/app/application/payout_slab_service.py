"""
Payout Slab Application Service (EPIC-027).

Enterprise service managing Payout Slabs, multi-tier commission/fee definitions,
immutable audit logging, overlapping range protection, and strict tenant/company isolation.
"""

import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import DomainException
from app.infrastructure.db.payout_slab_model import PayoutSlabModel, PayoutSlabAuditModel
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import (
    PayoutSlabCreateRequest, PayoutSlabUpdateRequest, PayoutSlabStatusChangeRequest,
    PayoutSlabResponse, PayoutSlabAuditResponse, PayoutSlabListResponse
)


class PayoutSlabService:

    @staticmethod
    def _model_to_dict(slab: PayoutSlabModel) -> Dict[str, Any]:
        """Serializes slab state to a dictionary for audit logs and API responses."""
        return {
            "public_id": str(slab.public_id),
            "tenant_id": str(slab.tenant_id),
            "company_id": str(slab.company_id) if slab.company_id else None,
            "service_code": slab.service_code,
            "slab_name": slab.slab_name,
            "description": slab.description,
            "min_amount": float(slab.min_amount),
            "max_amount": float(slab.max_amount),
            "commission": float(slab.commission),
            "commission_type": slab.commission_type,
            "gst": float(slab.gst),
            "gst_type": slab.gst_type,
            "vendor_charge": float(slab.vendor_charge),
            "vendor_charge_type": slab.vendor_charge_type,
            "company_charges": float(slab.company_charges),
            "company_charges_type": slab.company_charges_type,
            "company_gst": float(slab.company_gst),
            "company_gst_type": slab.company_gst_type,
            "tds": float(slab.tds),
            "tds_type": slab.tds_type,
            "other_charges": float(slab.other_charges),
            "other_charges_type": slab.other_charges_type,
            "currency": slab.currency,
            "effective_from": slab.effective_from.isoformat() if slab.effective_from else None,
            "effective_to": slab.effective_to.isoformat() if slab.effective_to else None,
            "is_active": slab.is_active,
            "is_deleted": slab.is_deleted,
            "version_no": slab.version_no,
            "notes": slab.notes
        }

    @staticmethod
    def _model_to_dto(slab: PayoutSlabModel, include_audit: bool = False) -> PayoutSlabResponse:
        """Converts PayoutSlabModel to PayoutSlabResponse DTO."""
        audit_dto_list = None
        if include_audit and hasattr(slab, "audit_logs") and slab.audit_logs:
            audit_dto_list = [
                PayoutSlabAuditResponse(
                    public_id=a.public_id,
                    tenant_id=a.tenant_id,
                    company_id=a.company_id,
                    payout_slab_id=a.payout_slab_id,
                    action=a.action,
                    old_value=a.old_value,
                    new_value=a.new_value,
                    changed_by=a.changed_by,
                    changed_at=a.changed_at,
                    reason=a.reason
                )
                for a in slab.audit_logs
            ]

        return PayoutSlabResponse(
            public_id=slab.public_id,
            tenant_id=slab.tenant_id,
            company_id=slab.company_id,
            service_code=slab.service_code,
            slab_name=slab.slab_name,
            description=slab.description,
            min_amount=float(slab.min_amount),
            max_amount=float(slab.max_amount),
            commission=float(slab.commission),
            commission_type=slab.commission_type,
            gst=float(slab.gst),
            gst_type=slab.gst_type,
            vendor_charge=float(slab.vendor_charge),
            vendor_charge_type=slab.vendor_charge_type,
            company_charges=float(slab.company_charges),
            company_charges_type=slab.company_charges_type,
            company_gst=float(slab.company_gst),
            company_gst_type=slab.company_gst_type,
            tds=float(slab.tds),
            tds_type=slab.tds_type,
            other_charges=float(slab.other_charges),
            other_charges_type=slab.other_charges_type,
            currency=slab.currency,
            effective_from=slab.effective_from,
            effective_to=slab.effective_to,
            is_active=slab.is_active,
            is_deleted=slab.is_deleted,
            version_no=slab.version_no,
            notes=slab.notes,
            created_date=slab.created_date,
            created_by=slab.created_by,
            updated_date=slab.updated_date,
            updated_by=slab.updated_by,
            audit_logs=audit_dto_list
        )

    @classmethod
    async def validate_slab_values(
        cls,
        min_amount: float,
        max_amount: float,
        commission: float,
        commission_type: str,
        gst: float,
        gst_type: str,
        vendor_charge: float,
        vendor_charge_type: str,
        company_charges: float,
        company_charges_type: str,
        company_gst: float,
        company_gst_type: str,
        tds: float,
        tds_type: str,
        other_charges: float,
        other_charges_type: str,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None
    ) -> None:
        """Enforces all business and financial validation rules."""
        if min_amount < 0:
            raise DomainException("Minimum amount must be greater than or equal to 0.")
        if max_amount < min_amount:
            raise DomainException(f"Maximum amount ({max_amount}) cannot be less than minimum amount ({min_amount}).")

        # Validate charge/tax non-negativity
        charges = [
            ("Commission", commission, commission_type),
            ("GST", gst, gst_type),
            ("Vendor Charge", vendor_charge, vendor_charge_type),
            ("Company Charges", company_charges, company_charges_type),
            ("Company GST", company_gst, company_gst_type),
            ("TDS", tds, tds_type),
            ("Other Charges", other_charges, other_charges_type),
        ]
        for name, val, c_type in charges:
            if val < 0:
                raise DomainException(f"{name} value cannot be negative.")
            if c_type == "PERCENTAGE" and val > 100.0:
                raise DomainException(f"{name} percentage cannot exceed 100%.")

        # Validate effective date sequence
        if effective_from and effective_to and effective_from >= effective_to:
            raise DomainException("Effective From date must be earlier than Effective To date.")

    @classmethod
    async def check_overlapping_slabs(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: Optional[uuid.UUID],
        service_code: str,
        min_amount: float,
        max_amount: float,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None,
        exclude_slab_id: Optional[uuid.UUID] = None
    ) -> None:
        """
        Ensures no two active payout slabs overlap for the same (tenant_id, company_id, service_code)
        during overlapping effective timeframes.
        """
        stmt = select(PayoutSlabModel).where(
            PayoutSlabModel.tenant_id == tenant_id,
            PayoutSlabModel.service_code == service_code.upper(),
            PayoutSlabModel.is_active == True,
            PayoutSlabModel.is_deleted == False
        )
        if company_id:
            stmt = stmt.where(or_(PayoutSlabModel.company_id == company_id, PayoutSlabModel.company_id == None))

        if exclude_slab_id:
            stmt = stmt.where(PayoutSlabModel.public_id != exclude_slab_id)

        res = await db.execute(stmt)
        existing_slabs = res.scalars().all()

        for slab in existing_slabs:
            e_min = float(slab.min_amount)
            e_max = float(slab.max_amount)

            # Check monetary range overlap: [min_amount, max_amount] and [e_min, e_max]
            # Slabs overlap if min_amount <= e_max and max_amount >= e_min
            ranges_overlap = (min_amount <= e_max) and (max_amount >= e_min)

            if ranges_overlap:
                # Check if dates overlap
                dates_overlap = True
                s_from = effective_from
                s_to = effective_to
                e_from = slab.effective_from
                e_to = slab.effective_to

                if s_from and e_to and s_from > e_to:
                    dates_overlap = False
                if s_to and e_from and s_to < e_from:
                    dates_overlap = False

                if dates_overlap:
                    raise DomainException(
                        f"Overlapping active slab detected: Slab '{slab.slab_name or slab.service_code}' "
                        f"(Range: ₹{e_min:,.2f} - ₹{e_max:,.2f}) already covers this transaction range."
                    )

    @classmethod
    async def list_payout_slabs(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: Optional[uuid.UUID] = None,
        service_code: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> PayoutSlabListResponse:
        """Lists payout slabs with filtering, pagination, and active/inactive counts."""
        filters = [
            PayoutSlabModel.tenant_id == tenant_id,
            PayoutSlabModel.is_deleted == False
        ]
        if company_id:
            filters.append(or_(PayoutSlabModel.company_id == company_id, PayoutSlabModel.company_id == None))
        if service_code:
            filters.append(PayoutSlabModel.service_code == service_code.upper())
        if is_active is not None:
            filters.append(PayoutSlabModel.is_active == is_active)
        if search:
            search_clean = f"%{search.strip()}%"
            filters.append(
                or_(
                    PayoutSlabModel.service_code.ilike(search_clean),
                    PayoutSlabModel.slab_name.ilike(search_clean),
                    PayoutSlabModel.description.ilike(search_clean),
                    PayoutSlabModel.currency.ilike(search_clean)
                )
            )

        # Count total
        count_stmt = select(func.count(PayoutSlabModel.id)).where(and_(*filters))
        total_count = (await db.execute(count_stmt)).scalar() or 0

        # Count active / inactive for tenant
        active_stmt = select(func.count(PayoutSlabModel.id)).where(
            PayoutSlabModel.tenant_id == tenant_id,
            PayoutSlabModel.is_deleted == False,
            PayoutSlabModel.is_active == True
        )
        active_count = (await db.execute(active_stmt)).scalar() or 0

        inactive_stmt = select(func.count(PayoutSlabModel.id)).where(
            PayoutSlabModel.tenant_id == tenant_id,
            PayoutSlabModel.is_deleted == False,
            PayoutSlabModel.is_active == False
        )
        inactive_count = (await db.execute(inactive_stmt)).scalar() or 0

        # Query items
        offset = (page - 1) * page_size
        query_stmt = (
            select(PayoutSlabModel)
            .where(and_(*filters))
            .order_by(PayoutSlabModel.service_code.asc(), PayoutSlabModel.min_amount.asc())
            .offset(offset)
            .limit(page_size)
        )
        res = await db.execute(query_stmt)
        slabs = res.scalars().all()

        items = [cls._model_to_dto(s) for s in slabs]
        total_pages = (total_count + page_size - 1) // page_size if page_size > 0 else 1

        return PayoutSlabListResponse(
            items=items,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            active_count=active_count,
            inactive_count=inactive_count
        )

    @classmethod
    async def get_payout_slab_by_id(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        slab_id: uuid.UUID
    ) -> PayoutSlabResponse:
        """Retrieves a single payout slab by public_id along with its audit log history."""
        stmt = (
            select(PayoutSlabModel)
            .options(selectinload(PayoutSlabModel.audit_logs))
            .where(
                PayoutSlabModel.public_id == slab_id,
                PayoutSlabModel.tenant_id == tenant_id,
                PayoutSlabModel.is_deleted == False
            )
        )
        res = await db.execute(stmt)
        slab = res.scalars().first()
        if not slab:
            raise DomainException(f"Payout Slab with ID {slab_id} not found or unauthorized.", code="SLAB_NOT_FOUND")

        return cls._model_to_dto(slab, include_audit=True)

    @classmethod
    async def create_payout_slab(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: Optional[uuid.UUID],
        req: PayoutSlabCreateRequest,
        current_user: Optional[AdminUserModel] = None
    ) -> PayoutSlabResponse:
        """Creates a new Payout Slab with strict validation and audit logging."""
        # 1. Validation
        await cls.validate_slab_values(
            min_amount=req.min_amount,
            max_amount=req.max_amount,
            commission=req.commission,
            commission_type=req.commission_type,
            gst=req.gst,
            gst_type=req.gst_type,
            vendor_charge=req.vendor_charge,
            vendor_charge_type=req.vendor_charge_type,
            company_charges=req.company_charges,
            company_charges_type=req.company_charges_type,
            company_gst=req.company_gst,
            company_gst_type=req.company_gst_type,
            tds=req.tds,
            tds_type=req.tds_type,
            other_charges=req.other_charges,
            other_charges_type=req.other_charges_type,
            effective_from=req.effective_from,
            effective_to=req.effective_to
        )

        # 2. Overlap check if created as active
        if req.is_active:
            await cls.check_overlapping_slabs(
                db=db,
                tenant_id=tenant_id,
                company_id=company_id,
                service_code=req.service_code,
                min_amount=req.min_amount,
                max_amount=req.max_amount,
                effective_from=req.effective_from,
                effective_to=req.effective_to
            )

        operator_name = getattr(current_user, "username", "ADMIN") if current_user else "ADMIN"

        slab = PayoutSlabModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=company_id,
            service_code=req.service_code.upper(),
            slab_name=req.slab_name or f"{req.service_code.upper()} ₹{req.min_amount:,.0f}-₹{req.max_amount:,.0f}",
            description=req.description,
            min_amount=req.min_amount,
            max_amount=req.max_amount,
            commission=req.commission,
            commission_type=req.commission_type,
            gst=req.gst,
            gst_type=req.gst_type,
            vendor_charge=req.vendor_charge,
            vendor_charge_type=req.vendor_charge_type,
            company_charges=req.company_charges,
            company_charges_type=req.company_charges_type,
            company_gst=req.company_gst,
            company_gst_type=req.company_gst_type,
            tds=req.tds,
            tds_type=req.tds_type,
            other_charges=req.other_charges,
            other_charges_type=req.other_charges_type,
            currency=req.currency.upper(),
            effective_from=req.effective_from,
            effective_to=req.effective_to,
            is_active=req.is_active,
            is_deleted=False,
            record_status="ACTIVE" if req.is_active else "INACTIVE",
            version_no=1,
            notes=req.notes,
            created_by=operator_name,
            updated_by=operator_name
        )
        db.add(slab)
        await db.flush()

        # Audit record
        audit = PayoutSlabAuditModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=company_id,
            payout_slab_id=slab.public_id,
            action="CREATE",
            old_value=None,
            new_value=cls._model_to_dict(slab),
            changed_by=operator_name,
            changed_at=datetime.now(timezone.utc),
            reason="Initial Payout Slab creation"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(slab)

        return cls._model_to_dto(slab)

    @classmethod
    async def update_payout_slab(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        slab_id: uuid.UUID,
        req: PayoutSlabUpdateRequest,
        current_user: Optional[AdminUserModel] = None
    ) -> PayoutSlabResponse:
        """Updates an existing payout slab with versioning and audit trail."""
        stmt = (
            select(PayoutSlabModel)
            .where(
                PayoutSlabModel.public_id == slab_id,
                PayoutSlabModel.tenant_id == tenant_id,
                PayoutSlabModel.is_deleted == False
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        slab = res.scalars().first()
        if not slab:
            raise DomainException(f"Payout Slab with ID {slab_id} not found.", code="SLAB_NOT_FOUND")

        old_state = cls._model_to_dict(slab)

        # Merge values
        new_min = req.min_amount if req.min_amount is not None else float(slab.min_amount)
        new_max = req.max_amount if req.max_amount is not None else float(slab.max_amount)
        new_commission = req.commission if req.commission is not None else float(slab.commission)
        new_commission_type = req.commission_type if req.commission_type is not None else slab.commission_type
        new_gst = req.gst if req.gst is not None else float(slab.gst)
        new_gst_type = req.gst_type if req.gst_type is not None else slab.gst_type
        new_vc = req.vendor_charge if req.vendor_charge is not None else float(slab.vendor_charge)
        new_vc_type = req.vendor_charge_type if req.vendor_charge_type is not None else slab.vendor_charge_type
        new_cc = req.company_charges if req.company_charges is not None else float(slab.company_charges)
        new_cc_type = req.company_charges_type if req.company_charges_type is not None else slab.company_charges_type
        new_cgst = req.company_gst if req.company_gst is not None else float(slab.company_gst)
        new_cgst_type = req.company_gst_type if req.company_gst_type is not None else slab.company_gst_type
        new_tds = req.tds if req.tds is not None else float(slab.tds)
        new_tds_type = req.tds_type if req.tds_type is not None else slab.tds_type
        new_oc = req.other_charges if req.other_charges is not None else float(slab.other_charges)
        new_oc_type = req.other_charges_type if req.other_charges_type is not None else slab.other_charges_type
        new_eff_from = req.effective_from if req.effective_from is not None else slab.effective_from
        new_eff_to = req.effective_to if req.effective_to is not None else slab.effective_to
        new_active = req.is_active if req.is_active is not None else slab.is_active

        # Validate
        await cls.validate_slab_values(
            min_amount=new_min,
            max_amount=new_max,
            commission=new_commission,
            commission_type=new_commission_type,
            gst=new_gst,
            gst_type=new_gst_type,
            vendor_charge=new_vc,
            vendor_charge_type=new_vc_type,
            company_charges=new_cc,
            company_charges_type=new_cc_type,
            company_gst=new_cgst,
            company_gst_type=new_cgst_type,
            tds=new_tds,
            tds_type=new_tds_type,
            other_charges=new_oc,
            other_charges_type=new_oc_type,
            effective_from=new_eff_from,
            effective_to=new_eff_to
        )

        # Check overlap if active
        if new_active:
            await cls.check_overlapping_slabs(
                db=db,
                tenant_id=tenant_id,
                company_id=slab.company_id,
                service_code=slab.service_code,
                min_amount=new_min,
                max_amount=new_max,
                effective_from=new_eff_from,
                effective_to=new_eff_to,
                exclude_slab_id=slab.public_id
            )

        operator_name = getattr(current_user, "username", "ADMIN") if current_user else "ADMIN"

        # Apply updates
        if req.slab_name is not None:
            slab.slab_name = req.slab_name
        if req.description is not None:
            slab.description = req.description
        slab.min_amount = new_min
        slab.max_amount = new_max
        slab.commission = new_commission
        slab.commission_type = new_commission_type
        slab.gst = new_gst
        slab.gst_type = new_gst_type
        slab.vendor_charge = new_vc
        slab.vendor_charge_type = new_vc_type
        slab.company_charges = new_cc
        slab.company_charges_type = new_cc_type
        slab.company_gst = new_cgst
        slab.company_gst_type = new_cgst_type
        slab.tds = new_tds
        slab.tds_type = new_tds_type
        slab.other_charges = new_oc
        slab.other_charges_type = new_oc_type
        if req.currency is not None:
            slab.currency = req.currency.upper()
        slab.effective_from = new_eff_from
        slab.effective_to = new_eff_to
        slab.is_active = new_active
        slab.record_status = "ACTIVE" if new_active else "INACTIVE"
        slab.version_no = slab.version_no + 1
        slab.updated_date = datetime.now(timezone.utc)
        slab.updated_by = operator_name
        if req.notes is not None:
            slab.notes = req.notes

        await db.flush()

        # Audit entry
        audit = PayoutSlabAuditModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=slab.company_id,
            payout_slab_id=slab.public_id,
            action="UPDATE",
            old_value=old_state,
            new_value=cls._model_to_dict(slab),
            changed_by=operator_name,
            changed_at=datetime.now(timezone.utc),
            reason=req.reason or "Payout Slab configuration updated"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(slab)

        return cls._model_to_dto(slab)

    @classmethod
    async def activate_payout_slab(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        slab_id: uuid.UUID,
        req: PayoutSlabStatusChangeRequest,
        current_user: Optional[AdminUserModel] = None
    ) -> PayoutSlabResponse:
        """Activates a payout slab after validating range and overlapping rules."""
        stmt = (
            select(PayoutSlabModel)
            .where(
                PayoutSlabModel.public_id == slab_id,
                PayoutSlabModel.tenant_id == tenant_id,
                PayoutSlabModel.is_deleted == False
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        slab = res.scalars().first()
        if not slab:
            raise DomainException(f"Payout Slab with ID {slab_id} not found.", code="SLAB_NOT_FOUND")

        if slab.is_active:
            return cls._model_to_dto(slab)

        old_state = cls._model_to_dict(slab)

        # Check overlapping active slabs
        await cls.check_overlapping_slabs(
            db=db,
            tenant_id=tenant_id,
            company_id=slab.company_id,
            service_code=slab.service_code,
            min_amount=float(slab.min_amount),
            max_amount=float(slab.max_amount),
            effective_from=slab.effective_from,
            effective_to=slab.effective_to,
            exclude_slab_id=slab.public_id
        )

        operator_name = getattr(current_user, "username", "ADMIN") if current_user else "ADMIN"

        slab.is_active = True
        slab.record_status = "ACTIVE"
        slab.updated_date = datetime.now(timezone.utc)
        slab.updated_by = operator_name
        slab.version_no = slab.version_no + 1

        await db.flush()

        audit = PayoutSlabAuditModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=slab.company_id,
            payout_slab_id=slab.public_id,
            action="ACTIVATE",
            old_value=old_state,
            new_value=cls._model_to_dict(slab),
            changed_by=operator_name,
            changed_at=datetime.now(timezone.utc),
            reason=req.reason or "Payout Slab activated by Admin"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(slab)

        return cls._model_to_dto(slab)

    @classmethod
    async def deactivate_payout_slab(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        slab_id: uuid.UUID,
        req: PayoutSlabStatusChangeRequest,
        current_user: Optional[AdminUserModel] = None
    ) -> PayoutSlabResponse:
        """Deactivates a payout slab and records full audit trail."""
        stmt = (
            select(PayoutSlabModel)
            .where(
                PayoutSlabModel.public_id == slab_id,
                PayoutSlabModel.tenant_id == tenant_id,
                PayoutSlabModel.is_deleted == False
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        slab = res.scalars().first()
        if not slab:
            raise DomainException(f"Payout Slab with ID {slab_id} not found.", code="SLAB_NOT_FOUND")

        if not slab.is_active:
            return cls._model_to_dto(slab)

        old_state = cls._model_to_dict(slab)
        operator_name = getattr(current_user, "username", "ADMIN") if current_user else "ADMIN"

        slab.is_active = False
        slab.record_status = "INACTIVE"
        slab.updated_date = datetime.now(timezone.utc)
        slab.updated_by = operator_name
        slab.version_no = slab.version_no + 1

        await db.flush()

        audit = PayoutSlabAuditModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=slab.company_id,
            payout_slab_id=slab.public_id,
            action="DEACTIVATE",
            old_value=old_state,
            new_value=cls._model_to_dict(slab),
            changed_by=operator_name,
            changed_at=datetime.now(timezone.utc),
            reason=req.reason or "Payout Slab deactivated by Admin"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(slab)

        return cls._model_to_dto(slab)

    @classmethod
    async def get_payout_slab_audit(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        slab_id: uuid.UUID
    ) -> List[PayoutSlabAuditResponse]:
        """Fetches audit trail logs for a payout slab."""
        stmt = (
            select(PayoutSlabAuditModel)
            .where(
                PayoutSlabAuditModel.payout_slab_id == slab_id,
                PayoutSlabAuditModel.tenant_id == tenant_id
            )
            .order_by(PayoutSlabAuditModel.changed_at.desc())
        )
        res = await db.execute(stmt)
        logs = res.scalars().all()
        return [
            PayoutSlabAuditResponse(
                public_id=a.public_id,
                tenant_id=a.tenant_id,
                company_id=a.company_id,
                payout_slab_id=a.payout_slab_id,
                action=a.action,
                old_value=a.old_value,
                new_value=a.new_value,
                changed_by=a.changed_by,
                changed_at=a.changed_at,
                reason=a.reason
            )
            for a in logs
        ]
