"""
Enterprise Dynamic PayIn MDR Calculation Engine.

Implements multi-dimensional MDR rule resolution:
Company Ref ID -> Vendor -> Service Type -> Payment Mode -> Card Type -> Card Network

Supports 3 Accounting Treatments:
1. DEDUCT_FROM_TOPUP: Customer pays original amount, MDR deducted from wallet credit.
2. COLLECT_ADDITIONALLY: Customer pays amount + charges, Retailer gets full amount.
3. COMPANY_PAYS_MDR: Customer pays original amount, Retailer gets full amount, Company absorbs charges.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import DomainException

logger = logging.getLogger("payin_mdr_service")

TWOPLACES = Decimal("0.01")


class PayInMdrService:
    """
    Authoritative Dynamic Multi-Vendor MDR Resolution and Financial Calculation Engine.
    """

    @classmethod
    async def get_mdr_for_company(
        cls,
        db: AsyncSession,
        company_ref_id: Optional[int],
        tenant_ref_id: Optional[int] = 1
    ) -> Dict[str, Any]:
        """
        Legacy / fallback helper to get company MDR configuration.
        """
        stmt = text("""
            SELECT percentage, fixed_charge, minimum_charge, maximum_charge, gst_applicable
            FROM public.mdr_configuration
            WHERE (company_ref_id = :comp_ref OR company_ref_id IS NULL)
              AND is_active = TRUE
            ORDER BY company_ref_id DESC NULLS LAST, id DESC
            LIMIT 1;
        """)
        res = await db.execute(stmt, {"comp_ref": company_ref_id})
        cfg = res.mappings().first()

        if cfg:
            return {
                "percentage": Decimal(str(cfg.get("percentage") or "1.50")),
                "fixed_charge": Decimal(str(cfg.get("fixed_charge") or "0.00")),
                "minimum_charge": Decimal(str(cfg.get("minimum_charge") or "0.00")),
                "maximum_charge": Decimal(str(cfg.get("maximum_charge") or "5000.00")),
                "gst_applicable": bool(cfg.get("gst_applicable", True)),
                "gst_rate": Decimal("18.00"),
                "mdr_pct": Decimal(str(cfg.get("percentage") or "1.50")) / Decimal("100") if Decimal(str(cfg.get("percentage") or "1.50")) > Decimal("0.5") else Decimal(str(cfg.get("percentage") or "0.0150")),
                "mdr_fixed": Decimal(str(cfg.get("fixed_charge") or "0.00")),
                "min_mdr": Decimal(str(cfg.get("minimum_charge") or "0.00")),
                "max_mdr": Decimal(str(cfg.get("maximum_charge") or "5000.00")),
                "tax_pct": Decimal("0.1800")
            }

        return {
            "percentage": Decimal("1.50"),
            "fixed_charge": Decimal("0.00"),
            "minimum_charge": Decimal("0.00"),
            "maximum_charge": Decimal("5000.00"),
            "gst_applicable": True,
            "gst_rate": Decimal("18.00"),
            "mdr_pct": Decimal("0.0150"),
            "mdr_fixed": Decimal("0.00"),
            "min_mdr": Decimal("0.00"),
            "max_mdr": Decimal("5000.00"),
            "tax_pct": Decimal("0.1800")
        }

    @classmethod
    async def resolve_mdr_rule(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        vendor_ref_id: int,
        service_type_ref_id: Optional[int] = None,
        payment_mode_ref_id: Optional[int] = None,
        card_type_ref_id: Optional[int] = None,
        card_network: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resolves the most specific matching MDR rule from public.payin_mdr_cfg.
        Uses deterministic priority scoring:
        - Specific card_network match: +32
        - Specific card_type_ref_id match: +16
        - Specific payment_mode_ref_id match: +8
        - Specific service_type_ref_id match: +4
        - Base rule (company + vendor): 100
        """
        now = datetime.now(timezone.utc)
        stmt = text("""
            SELECT 
                payin_mdr_cfg_ref_id,
                company_ref_id,
                payin_vendor_ref_id,
                payin_service_type_ref_id,
                payin_payment_mode_ref_id,
                payin_card_type_ref_id,
                card_network,
                mdr_pct,
                mdr_fixed,
                tax_pct,
                min_mdr,
                max_mdr,
                mdr_treatment,
                priority,
                (
                    priority +
                    CASE WHEN card_network IS NOT NULL AND card_network = :c_net THEN 32 ELSE 0 END +
                    CASE WHEN payin_card_type_ref_id IS NOT NULL AND payin_card_type_ref_id = :c_type THEN 16 ELSE 0 END +
                    CASE WHEN payin_payment_mode_ref_id IS NOT NULL AND payin_payment_mode_ref_id = :p_mode THEN 8 ELSE 0 END +
                    CASE WHEN payin_service_type_ref_id IS NOT NULL AND payin_service_type_ref_id = :s_type THEN 4 ELSE 0 END
                ) AS composite_score
            FROM public.payin_mdr_cfg
            WHERE company_ref_id = :c_ref
              AND payin_vendor_ref_id = :v_ref
              AND is_enabled = TRUE
              AND effective_from <= :now_dt
              AND (effective_to IS NULL OR effective_to >= :now_dt)
              AND (payin_service_type_ref_id IS NULL OR payin_service_type_ref_id = :s_type)
              AND (payin_payment_mode_ref_id IS NULL OR payin_payment_mode_ref_id = :p_mode)
              AND (payin_card_type_ref_id IS NULL OR payin_card_type_ref_id = :c_type)
              AND (card_network IS NULL OR card_network = :c_net)
            ORDER BY composite_score DESC, payin_mdr_cfg_ref_id DESC
            LIMIT 1;
        """)

        res = await db.execute(stmt, {
            "c_ref": company_ref_id,
            "v_ref": vendor_ref_id,
            "s_type": service_type_ref_id,
            "p_mode": payment_mode_ref_id,
            "c_type": card_type_ref_id,
            "c_net": (card_network or "").strip().upper() if card_network else None,
            "now_dt": now
        })
        row = res.mappings().first()

        if row:
            return {
                "rule_ref_id": row["payin_mdr_cfg_ref_id"],
                "mdr_pct": Decimal(str(row["mdr_pct"])),
                "mdr_fixed": Decimal(str(row["mdr_fixed"])),
                "tax_pct": Decimal(str(row["tax_pct"])),
                "min_mdr": Decimal(str(row["min_mdr"])),
                "max_mdr": Decimal(str(row["max_mdr"])),
                "mdr_treatment": str(row["mdr_treatment"] or "DEDUCT_FROM_TOPUP"),
                "priority": int(row["priority"])
            }

        # Fallback to existing public.mdr_configuration if available
        stmt_fallback = text("""
            SELECT percentage, fixed_charge, minimum_charge, maximum_charge, gst_applicable
            FROM public.mdr_configuration
            WHERE (company_ref_id = :c_ref OR company_ref_id IS NULL)
              AND is_active = TRUE
            ORDER BY company_ref_id DESC NULLS LAST, id DESC
            LIMIT 1;
        """)
        fb_res = await db.execute(stmt_fallback, {"c_ref": company_ref_id})
        fb_row = fb_res.mappings().first()

        if fb_row:
            pct_val = Decimal(str(fb_row.get("percentage") or "0.0150"))
            if pct_val > Decimal("0.5"):
                pct_val = pct_val / Decimal("100")
            return {
                "rule_ref_id": None,
                "mdr_pct": pct_val,
                "mdr_fixed": Decimal(str(fb_row.get("fixed_charge") or "0.00")),
                "tax_pct": Decimal("0.1800") if fb_row.get("gst_applicable", True) else Decimal("0.0000"),
                "min_mdr": Decimal(str(fb_row.get("minimum_charge") or "0.00")),
                "max_mdr": Decimal(str(fb_row.get("maximum_charge") or "5000.00")),
                "mdr_treatment": "DEDUCT_FROM_TOPUP",
                "priority": 0
            }

        raise DomainException(
            f"No applicable active MDR configuration found for Company Ref ID {company_ref_id} and Vendor {vendor_ref_id}."
        )

    @classmethod
    def calculate_charges(
        cls,
        amount: float,
        mdr_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates MDR fee, GST, total charges, customer payable, retailer credit,
        and company liability with high Decimal precision.
        Fully backward-compatible with legacy keys (percentage, fixed_charge, etc.).
        """
        dec_amount = Decimal(str(amount)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        # Support both new and legacy key formats
        if "mdr_pct" in mdr_config:
            pct = Decimal(str(mdr_config["mdr_pct"]))
        elif "percentage" in mdr_config:
            raw_p = Decimal(str(mdr_config["percentage"]))
            pct = raw_p / Decimal("100") if raw_p > Decimal("0.5") else raw_p
        else:
            pct = Decimal("0.0150")

        fixed = Decimal(str(mdr_config.get("mdr_fixed", mdr_config.get("fixed_charge", 0.00))))
        min_mdr = Decimal(str(mdr_config.get("min_mdr", mdr_config.get("minimum_charge", 0.00))))
        max_mdr = Decimal(str(mdr_config.get("max_mdr", mdr_config.get("maximum_charge", 5000.00))))
        
        if "tax_pct" in mdr_config:
            tax_pct = Decimal(str(mdr_config["tax_pct"]))
        elif "gst_rate" in mdr_config:
            tax_pct = Decimal(str(mdr_config["gst_rate"])) / Decimal("100")
        else:
            tax_pct = Decimal("0.1800") if mdr_config.get("gst_applicable", True) else Decimal("0.0000")

        treatment = mdr_config.get("mdr_treatment", "DEDUCT_FROM_TOPUP")

        # 1. Base MDR Calculation
        raw_mdr = (dec_amount * pct) + fixed
        if min_mdr > Decimal("0.00") and raw_mdr < min_mdr:
            raw_mdr = min_mdr
        if max_mdr > Decimal("0.00") and raw_mdr > max_mdr:
            raw_mdr = max_mdr

        mdr_amount = raw_mdr.quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        # 2. Tax on MDR
        tax_amount = Decimal("0.00")
        if tax_pct > Decimal("0.00") and mdr_amount > Decimal("0.00"):
            tax_amount = (mdr_amount * tax_pct).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        total_charges = (mdr_amount + tax_amount).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        # 3. Apply MDR Treatment
        if treatment == "COLLECT_ADDITIONALLY":
            customer_payable = (dec_amount + total_charges).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            retailer_credit = dec_amount
            company_liability = Decimal("0.00")
        elif treatment == "COMPANY_PAYS_MDR":
            customer_payable = dec_amount
            retailer_credit = dec_amount
            company_liability = total_charges
        else:
            customer_payable = dec_amount
            retailer_credit = (dec_amount - total_charges).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            if retailer_credit < Decimal("0.00"):
                retailer_credit = Decimal("0.00")
            company_liability = Decimal("0.00")

        net_settlement = (dec_amount - total_charges).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        return {
            "amount": float(dec_amount),
            "txn_amount": float(dec_amount),
            "mdr_charge": float(mdr_amount),
            "mdr_amount": float(mdr_amount),
            "gst_amount": float(tax_amount),
            "tax_amount": float(tax_amount),
            "net_amount": float(net_settlement),
            "total_charges": float(total_charges),
            "customer_payable": float(customer_payable),
            "retailer_credit": float(retailer_credit),
            "company_mdr_liability": float(company_liability),
            "mdr_pct": float(pct),
            "mdr_fixed": float(fixed),
            "tax_pct": float(tax_pct),
            "mdr_treatment": treatment,
            "rule_ref_id": mdr_config.get("rule_ref_id")
        }
