"""
POS MDR & Dynamic Pricing Calculation Service.

Enterprise Service implementing:
- Dynamic payment mode retrieval (POS - Instant, POS+T1, POS+T2)
- Strict Priority MDR Resolution:
    1. Retailer-Specific MDR (retailer_id == specific_uuid)
    2. Default MDR (retailer_id IS NULL)
    3. Configuration Error if neither exists (no hardcoded fallback)
- Decimal-precise financial calculation:
    - MDR Charge = Amount * (MDR % / 100) or Fixed MDR
    - GST = MDR Charge * (GST % / 100)
    - Charges = MDR Charge
    - Received Amount = Amount - (Charges + GST)
- Admin configuration CRUD with overlap prevention.
"""

import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.pos_mdr_models import (
    PosPaymentModeConfigModel, PosMdrConfigurationModel
)
from app.infrastructure.db.models import RetailerModel


class PosMdrService:
    """
    Application service managing POS payment modes and dynamic MDR fee engine.
    """

    @staticmethod
    async def get_active_payment_modes(db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Returns active POS payment modes ordered by display_order.
        Allowed active modes: POS - Instant, POS+T1, POS+T2.
        """
        stmt = (
            select(PosPaymentModeConfigModel)
            .where(
                PosPaymentModeConfigModel.is_active == True,
                PosPaymentModeConfigModel.is_deleted == False
            )
            .order_by(PosPaymentModeConfigModel.display_order.asc())
        )
        res = await db.execute(stmt)
        modes = res.scalars().all()
        return [
            {
                "id": str(m.public_id),
                "code": m.code,
                "name": m.name,
                "display_order": m.display_order,
                "settlement_type": m.settlement_type,
                "description": m.description
            }
            for m in modes
        ]

    @classmethod
    async def resolve_retailer_uuid(
        cls,
        db: AsyncSession,
        retailer_identifier: Union[str, uuid.UUID]
    ) -> Optional[uuid.UUID]:
        """Resolves retailer UUID from UUID, retailer_code, or contact mobile."""
        if not retailer_identifier:
            return None
        if isinstance(retailer_identifier, uuid.UUID):
            return retailer_identifier

        try:
            return uuid.UUID(str(retailer_identifier))
        except (ValueError, AttributeError):
            pass

        # 1. Lookup by retailer_code
        stmt = select(RetailerModel.public_id).where(
            RetailerModel.retailer_code == str(retailer_identifier),
            RetailerModel.is_deleted == False
        )
        res = await db.execute(stmt)
        val = res.scalar()
        if val:
            return val

        # 2. Lookup via contact mobile
        try:
            from app.infrastructure.db.models import RetailerContactModel
            stmt_contact = (
                select(RetailerContactModel.retailer_id)
                .where(
                    RetailerContactModel.mobile == str(retailer_identifier),
                    RetailerContactModel.is_deleted == False
                )
            )
            res_contact = await db.execute(stmt_contact)
            val = res_contact.scalar()
            if val:
                return val
        except Exception:
            pass

        # 3. Lookup via verification model
        try:
            from app.infrastructure.db.verification_models import RetailerVerificationModel
            stmt_ver = (
                select(RetailerVerificationModel.public_id)
                .where(
                    or_(
                        RetailerVerificationModel.retailer_id == str(retailer_identifier),
                        RetailerVerificationModel.mobile_number == str(retailer_identifier)
                    )
                )
            )
            res_ver = await db.execute(stmt_ver)
            val = res_ver.scalar()
            if val:
                return val
        except Exception:
            pass

        # If not found but is a string identifier, generate a deterministic UUID
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"retailer.{retailer_identifier}")

    @classmethod
    async def resolve_mdr_configuration(
        cls,
        db: AsyncSession,
        payment_mode: str,
        retailer_id: Optional[Union[str, uuid.UUID]] = None,
        company_id: Optional[Union[str, uuid.UUID]] = None,
        tenant_id: Optional[Union[str, uuid.UUID]] = None,
        effective_date: Optional[datetime] = None
    ) -> PosMdrConfigurationModel:
        """
        Resolves the applicable MDR configuration following strict priority:
        1. Retailer-Specific MDR
        2. Default MDR (retailer_id IS NULL)
        3. Neither exists -> Configuration error.
        """
        eff_dt = effective_date or datetime.now(timezone.utc)
        clean_mode = (payment_mode or "").strip()
        if not clean_mode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment mode is required to resolve MDR configuration."
            )

        retailer_uuid = await cls.resolve_retailer_uuid(db, retailer_id) if retailer_id else None

        # Priority 1: Check for Retailer-Specific MDR
        if retailer_uuid:
            ret_stmt = (
                select(PosMdrConfigurationModel)
                .where(
                    PosMdrConfigurationModel.retailer_id == retailer_uuid,
                    PosMdrConfigurationModel.payment_mode == clean_mode,
                    PosMdrConfigurationModel.is_active == True,
                    PosMdrConfigurationModel.is_deleted == False,
                    PosMdrConfigurationModel.effective_from <= eff_dt,
                    or_(
                        PosMdrConfigurationModel.effective_to == None,
                        PosMdrConfigurationModel.effective_to >= eff_dt
                    )
                )
                .order_by(PosMdrConfigurationModel.effective_from.desc(), PosMdrConfigurationModel.created_date.desc())
                .limit(1)
            )
            ret_res = await db.execute(ret_stmt)
            retailer_mdr = ret_res.scalars().first()
            if retailer_mdr:
                return retailer_mdr

        # Priority 2: Check for Default MDR (retailer_id IS NULL)
        def_stmt = (
            select(PosMdrConfigurationModel)
            .where(
                PosMdrConfigurationModel.retailer_id == None,
                PosMdrConfigurationModel.payment_mode == clean_mode,
                PosMdrConfigurationModel.is_active == True,
                PosMdrConfigurationModel.is_deleted == False,
                PosMdrConfigurationModel.effective_from <= eff_dt,
                or_(
                    PosMdrConfigurationModel.effective_to == None,
                    PosMdrConfigurationModel.effective_to >= eff_dt
                )
            )
            .order_by(PosMdrConfigurationModel.effective_from.desc(), PosMdrConfigurationModel.created_date.desc())
            .limit(1)
        )
        def_res = await db.execute(def_stmt)
        default_mdr = def_res.scalars().first()
        if default_mdr:
            return default_mdr

        # Priority 3: Configuration Error (NEVER hardcode or invent an MDR)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MDR configuration is not available for this retailer and payment mode."
        )

    @classmethod
    def calculate_mdr(
        cls,
        amount: Union[Decimal, float, int, str],
        mdr_config: PosMdrConfigurationModel
    ) -> Dict[str, Any]:
        """
        Executes financial calculations using Python Decimal with 2-decimal ROUND_HALF_UP precision.

        Formulas:
        - MDR Charge = Amount * (MDR % / 100)  [if PERCENTAGE]  or  MDR [if FIXED]
        - GST = MDR Charge * (GST % / 100)
        - Charges = MDR Charge
        - Received Amount = Amount - (Charges + GST)
        """
        try:
            amt_dec = Decimal(str(amount))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid transaction amount format."
            )

        if amt_dec <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction amount must be greater than 0."
            )

        mdr_val = Decimal(str(mdr_config.mdr))
        mdr_type = str(mdr_config.mdr_type or "PERCENTAGE").upper()
        raw_gst_val = getattr(mdr_config, "gst_rate", None)
        gst_rate = Decimal(str(raw_gst_val)) if raw_gst_val is not None else Decimal("0.00")

        if mdr_val < Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Configured MDR rate cannot be negative."
            )
        if gst_rate < Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Configured GST rate cannot be negative."
            )

        # 1. MDR Charge Calculation
        if mdr_type == "PERCENTAGE":
            raw_mdr_charge = (amt_dec * mdr_val) / Decimal("100")
        else:
            raw_mdr_charge = mdr_val

        # 2. GST Calculation on MDR Charge
        raw_gst = (raw_mdr_charge * gst_rate) / Decimal("100")

        # 3. Charges = MDR Charge
        raw_charges = raw_mdr_charge

        # 4. Received Amount = Transaction Amount - (Charges + GST)
        raw_received_amount = amt_dec - (raw_charges + raw_gst)

        # Quantize to 2 decimal places with standard financial rounding
        two_places = Decimal("0.01")
        quant_amt = amt_dec.quantize(two_places, rounding=ROUND_HALF_UP)
        quant_mdr = raw_mdr_charge.quantize(two_places, rounding=ROUND_HALF_UP)
        quant_gst = raw_gst.quantize(two_places, rounding=ROUND_HALF_UP)
        quant_charges = raw_charges.quantize(two_places, rounding=ROUND_HALF_UP)
        quant_received = raw_received_amount.quantize(two_places, rounding=ROUND_HALF_UP)

        return {
            "payment_mode": mdr_config.payment_mode,
            "transaction_amount": float(quant_amt),
            "mdr": float(quant_mdr),
            "gst": float(quant_gst),
            "charges": float(quant_charges),
            "received_amount": float(quant_received),
            "mdr_type": mdr_type,
            "mdr_rate": float(mdr_val),
            "gst_rate": float(gst_rate),
            "mdr_config_id": str(mdr_config.public_id)
        }

    @classmethod
    async def validate_no_overlap(
        cls,
        db: AsyncSession,
        payment_mode: str,
        retailer_id: Optional[uuid.UUID],
        effective_from: datetime,
        effective_to: Optional[datetime],
        exclude_id: Optional[uuid.UUID] = None
    ) -> None:
        """
        Validates that no other active configuration exists for the same scope and overlapping date range.
        """
        stmt = select(PosMdrConfigurationModel).where(
            PosMdrConfigurationModel.payment_mode == payment_mode,
            PosMdrConfigurationModel.retailer_id == retailer_id,
            PosMdrConfigurationModel.is_active == True,
            PosMdrConfigurationModel.is_deleted == False
        )
        if exclude_id:
            stmt = stmt.where(PosMdrConfigurationModel.public_id != exclude_id)

        res = await db.execute(stmt)
        existing = res.scalars().all()

        for c in existing:
            c_start = c.effective_from
            c_end = c.effective_to
            new_start = effective_from
            new_end = effective_to

            # Overlap check logic:
            # Overlaps if (StartA <= EndB or EndB is None) and (EndA >= StartB or EndA is None)
            start_before_end = (new_end is None or c_start <= new_end)
            end_after_start = (c_end is None or c_end >= new_start)
            if start_before_end and end_after_start:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An active MDR configuration already exists for {payment_mode} during the specified effective date range."
                )

    @classmethod
    async def create_default_mdr_for_retailer(
        cls,
        db: AsyncSession,
        retailer_id: Union[str, uuid.UUID],
        company_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        created_by: Optional[str] = "system"
    ) -> List[PosMdrConfigurationModel]:
        """
        Automatically provisions default POS MDR configurations (POS - Instant & POS+T1)
        when a retailer is approved/activated.
        Idempotent: Does not create duplicate configurations and never overwrites existing ones.
        """
        ret_uuid = await cls.resolve_retailer_uuid(db, retailer_id)
        if not ret_uuid:
            return []

        # 1. Fetch current global default MDR rates
        def_stmt = select(PosMdrConfigurationModel).where(
            PosMdrConfigurationModel.retailer_id == None,
            PosMdrConfigurationModel.is_active == True,
            PosMdrConfigurationModel.is_deleted == False
        )
        def_res = await db.execute(def_stmt)
        default_configs = def_res.scalars().all()

        # Map by payment mode
        defaults_by_mode: Dict[str, PosMdrConfigurationModel] = {
            c.payment_mode: c for c in default_configs
        }

        # Fallback values if not found in DB
        default_rates = {
            "POS - Instant": Decimal("1.7000"),
            "POS+T1": Decimal("1.6000")
        }

        created_items: List[PosMdrConfigurationModel] = []
        for mode, fallback_rate in default_rates.items():
            # Check if retailer already has an active MDR config for this mode
            exist_stmt = select(PosMdrConfigurationModel).where(
                PosMdrConfigurationModel.retailer_id == ret_uuid,
                PosMdrConfigurationModel.payment_mode == mode,
                PosMdrConfigurationModel.is_deleted == False
            )
            exist_res = await db.execute(exist_stmt)
            existing = exist_res.scalars().first()
            if existing:
                continue  # Keep existing configuration intact

            def_cfg = defaults_by_mode.get(mode)
            rate = Decimal(str(def_cfg.mdr)) if def_cfg else fallback_rate
            gst = Decimal(str(def_cfg.gst_rate)) if def_cfg else Decimal("18.00")
            mdr_type = def_cfg.mdr_type if def_cfg else "PERCENTAGE"

            new_cfg = PosMdrConfigurationModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company_id,
                retailer_id=ret_uuid,
                payment_mode=mode,
                mdr=float(rate),
                mdr_type=mdr_type,
                gst_rate=float(gst),
                effective_from=datetime.now(timezone.utc),
                is_active=True,
                is_deleted=False,
                remarks=f"Auto-provisioned default MDR on retailer approval",
                created_by=created_by or "system"
            )
            db.add(new_cfg)
            created_items.append(new_cfg)

        if created_items:
            await db.flush()

        return created_items

    @classmethod
    async def get_pos_vendors(cls, db: AsyncSession) -> List[Dict[str, Any]]:
        """Returns all active POS vendors from pos_vendor_master."""
        from app.infrastructure.db.models import PosVendorMasterModel
        stmt = select(PosVendorMasterModel).where(
            PosVendorMasterModel.is_active == True,
            PosVendorMasterModel.is_deleted == False
        ).order_by(PosVendorMasterModel.vendor_name.asc())
        res = await db.execute(stmt)
        vendors = res.scalars().all()
        return [
            {
                "id": str(v.public_id),
                "vendor_code": v.vendor_code,
                "vendor_name": v.vendor_name,
                "default_commission_type": v.default_commission_type,
                "default_commission_value": float(v.default_commission_value),
                "contact_person": v.contact_person,
                "contact_email": v.contact_email,
                "contact_mobile": v.contact_mobile,
            }
            for v in vendors
        ]

    @classmethod
    async def get_retailer_assigned_machine(
        cls,
        db: AsyncSession,
        retailer_id: Union[str, uuid.UUID]
    ) -> Optional[Dict[str, Any]]:
        """Fetches the active assigned POS machine for the retailer."""
        from app.infrastructure.db.models import SwipeMachineModel
        ret_uuid = await cls.resolve_retailer_uuid(db, retailer_id)
        if not ret_uuid:
            return None

        stmt = select(SwipeMachineModel).where(
            SwipeMachineModel.mapped_retailer_id == ret_uuid,
            SwipeMachineModel.status.in_(["ACTIVE", "ASSIGNED"]),
            SwipeMachineModel.is_deleted == False
        ).order_by(SwipeMachineModel.created_date.desc()).limit(1)

        res = await db.execute(stmt)
        m = res.scalars().first()
        if not m:
            return None

        return {
            "id": str(m.public_id),
            "serial_number": m.serial_number,
            "tid": m.tid,
            "mid": m.mid,
            "mobile_number": m.mobile_number,
            "vendor_id": m.vendor_id,
            "vendor_name": m.vendor_name,
            "vendor_commission_type": m.vendor_commission_type,
            "vendor_commission_value": float(m.vendor_commission_value or 0.0),
            "status": m.status,
            "assigned_at": m.assigned_at.isoformat() if m.assigned_at else None,
        }

    @classmethod
    async def calculate_pos_topup_pricing(
        cls,
        db: AsyncSession,
        amount: Union[Decimal, float, int, str],
        payment_mode: str,
        retailer_id: Optional[Union[str, uuid.UUID]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive POS calculation including MDR, GST, and Vendor Commission snapshot.
        """
        # 1. Resolve MDR Configuration
        mdr_cfg = await cls.resolve_mdr_configuration(
            db=db,
            payment_mode=payment_mode,
            retailer_id=retailer_id
        )
        mdr_res = cls.calculate_mdr(amount=amount, mdr_config=mdr_cfg)

        # 2. Resolve Assigned Machine & Vendor Commission
        machine = await cls.get_retailer_assigned_machine(db, retailer_id) if retailer_id else None

        vendor_id = machine.get("vendor_id") if machine else None
        vendor_name = machine.get("vendor_name") if machine else None
        vendor_comm_type = machine.get("vendor_commission_type", "PERCENTAGE") if machine else "PERCENTAGE"
        vendor_comm_val = Decimal(str(machine.get("vendor_commission_value", 0.50))) if machine else Decimal("0.50")

        amt_dec = Decimal(str(mdr_res["transaction_amount"]))
        if vendor_comm_type == "PERCENTAGE":
            vendor_comm_amt = (amt_dec * vendor_comm_val) / Decimal("100")
        else:
            vendor_comm_amt = vendor_comm_val

        two_places = Decimal("0.01")
        quant_vendor_comm = vendor_comm_amt.quantize(two_places, rounding=ROUND_HALF_UP)

        return {
            **mdr_res,
            "vendor_id": vendor_id,
            "vendor_name": vendor_name,
            "vendor_commission_type": vendor_comm_type,
            "vendor_commission_rate": float(vendor_comm_val),
            "vendor_commission_amount": float(quant_vendor_comm),
            "pos_serial_number": machine.get("serial_number") if machine else None,
            "pos_mobile_number": machine.get("mobile_number") if machine else None,
        }

