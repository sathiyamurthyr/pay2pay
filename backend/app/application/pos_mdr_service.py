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
        gst_rate = Decimal(str(getattr(mdr_config, "gst_rate", None) or "18.00"))

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
