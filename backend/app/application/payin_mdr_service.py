"""
Enterprise Company-Wise PayIn MDR Calculation Engine.
Calculates MDR charge, GST, and net receivable amount dynamically
from existing database configuration (public.mdr_configuration).
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("payin_mdr_service")

TWOPLACES = Decimal("0.01")


class PayInMdrService:
    """
    Retrieves and applies company-wise MDR configuration dynamically using Company Ref ID.
    """

    @classmethod
    async def get_mdr_for_company(
        cls,
        db: AsyncSession,
        company_ref_id: Optional[int],
        tenant_ref_id: Optional[int] = 1
    ) -> Dict[str, Any]:
        """
        Retrieves company-specific MDR rate from public.mdr_configuration.
        Priority:
        1. Exact match on company_ref_id
        2. Fallback to tenant default (level = 'COMPANY', company_ref_id IS NULL)
        3. Standard platform default: 1.5% MDR, 18% GST
        """
        cfg = None
        if company_ref_id is not None:
            try:
                c_ref = int(company_ref_id)
                stmt = text("""
                    SELECT percentage, fixed_charge, minimum_charge, maximum_charge, gst_applicable
                    FROM public.mdr_configuration
                    WHERE company_ref_id = :comp_ref AND is_active = true
                    ORDER BY id DESC LIMIT 1;
                """)
                res = await db.execute(stmt, {"comp_ref": c_ref})
                cfg = res.mappings().first()
            except Exception as ex:
                logger.warning("Error fetching company-specific MDR for company_ref_id=%s: %s", company_ref_id, ex)

        if not cfg:
            try:
                stmt_default = text("""
                    SELECT percentage, fixed_charge, minimum_charge, maximum_charge, gst_applicable
                    FROM public.mdr_configuration
                    WHERE (company_ref_id IS NULL OR company_ref_id = 0)
                      AND is_active = true
                    ORDER BY id ASC LIMIT 1;
                """)
                res_def = await db.execute(stmt_default)
                cfg = res_def.mappings().first()
            except Exception as ex:
                logger.warning("Error fetching default MDR config: %s", ex)

        if cfg:
            return {
                "percentage": Decimal(str(cfg.get("percentage") or "1.50")),
                "fixed_charge": Decimal(str(cfg.get("fixed_charge") or "0.00")),
                "minimum_charge": Decimal(str(cfg.get("minimum_charge") or "0.00")),
                "maximum_charge": Decimal(str(cfg.get("maximum_charge") or "500.00")),
                "gst_applicable": bool(cfg.get("gst_applicable", True)),
                "gst_rate": Decimal("18.00")
            }

        # Safe platform fallback if table is empty
        return {
            "percentage": Decimal("1.50"),
            "fixed_charge": Decimal("0.00"),
            "minimum_charge": Decimal("0.00"),
            "maximum_charge": Decimal("500.00"),
            "gst_applicable": True,
            "gst_rate": Decimal("18.00")
        }

    @classmethod
    def calculate_charges(
        cls,
        amount: float,
        mdr_config: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Calculates MDR fee, GST (18%), and net amount with Decimal precision.
        """
        dec_amount = Decimal(str(amount)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        pct = mdr_config["percentage"]
        fixed = mdr_config["fixed_charge"]
        min_c = mdr_config["minimum_charge"]
        max_c = mdr_config["maximum_charge"]
        gst_app = mdr_config["gst_applicable"]
        gst_pct = mdr_config.get("gst_rate", Decimal("18.00"))

        # Base MDR
        raw_mdr = (dec_amount * (pct / Decimal("100"))) + fixed
        if min_c > Decimal("0.00") and raw_mdr < min_c:
            raw_mdr = min_c
        if max_c > Decimal("0.00") and raw_mdr > max_c:
            raw_mdr = max_c

        mdr_charge = raw_mdr.quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        # GST on MDR
        gst_amount = Decimal("0.00")
        if gst_app and mdr_charge > Decimal("0.00"):
            gst_amount = (mdr_charge * (gst_pct / Decimal("100"))).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        total_deduction = mdr_charge + gst_amount
        net_amount = (dec_amount - total_deduction).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if net_amount < Decimal("0.00"):
            net_amount = Decimal("0.00")

        return {
            "amount": float(dec_amount),
            "mdr_charge": float(mdr_charge),
            "gst_amount": float(gst_amount),
            "total_deduction": float(total_deduction),
            "net_amount": float(net_amount),
            "percentage": float(pct),
            "fixed_charge": float(fixed)
        }

