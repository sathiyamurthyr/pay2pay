"""
Enterprise PayIn Configuration Service.
Manages company configurations, vendor mappings, service catalogs,
payment modes, card types, and administrative audits.
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy import text, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.db.payin_models import (
    PayinCompanyCfgModel, PayinVendorModel, PayinCompanyVendorModel,
    PayinServiceTypeModel, PayinPaymentModeModel, PayinCardTypeModel,
    PayinMdrCfgModel, PayinAuditLogModel
)
from app.application.payin_dtos import (
    PayInOptionsResponse, ServiceOptionItem, PaymentModeOptionItem,
    CardTypeOptionItem, VendorOptionItem
)
from app.core.exceptions import DomainException

logger = logging.getLogger("payin_config_service")


class PayInConfigService:
    """
    Service handling PayIn configuration retrieval, validation, and administrative management.
    """

    @classmethod
    async def get_retailer_payin_options(
        cls,
        db: AsyncSession,
        company_ref_id: int
    ) -> PayInOptionsResponse:
        """
        Retrieves all enabled services, payment modes, card types, and vendors
        authorized for the retailer's authenticated company.
        """
        # 1. Company Configuration
        comp_stmt = select(PayinCompanyCfgModel).where(
            PayinCompanyCfgModel.company_ref_id == company_ref_id
        )
        comp_res = await db.execute(comp_stmt)
        comp_cfg = comp_res.scalars().first()

        min_amt = float(comp_cfg.min_amount) if comp_cfg else 10.00
        max_amt = float(comp_cfg.max_amount) if comp_cfg else 500000.00
        if comp_cfg and not comp_cfg.payin_enabled:
            raise DomainException("PayIn services are currently disabled for your organization.")

        # Get Company Name
        c_name = "SMSPAY" if company_ref_id == 2 else ("Near4You" if company_ref_id == 1 else "Pay2Pay")
        name_stmt = text("SELECT company_name FROM public.company WHERE company_ref_id = :c_ref LIMIT 1;")
        name_res = await db.execute(name_stmt, {"c_ref": company_ref_id})
        comp_row = name_res.fetchone()
        if comp_row and comp_row[0]:
            c_name = comp_row[0]

        # 2. Enabled Services
        svc_stmt = select(PayinServiceTypeModel).where(
            PayinServiceTypeModel.is_enabled == True
        ).order_by(PayinServiceTypeModel.display_order.asc())
        svc_res = await db.execute(svc_stmt)
        services = [
            ServiceOptionItem(
                service_type_ref_id=s.payin_service_type_ref_id,
                svc_code=s.svc_code,
                svc_name=s.svc_name,
                svc_desc=s.svc_desc,
                svc_icon=s.svc_icon,
                is_enabled=s.is_enabled
            ) for s in svc_res.scalars().all()
        ]

        # 3. Enabled Payment Modes
        mode_stmt = select(PayinPaymentModeModel).where(
            PayinPaymentModeModel.is_enabled == True
        ).order_by(PayinPaymentModeModel.display_order.asc())
        mode_res = await db.execute(mode_stmt)
        modes = [
            PaymentModeOptionItem(
                payment_mode_ref_id=m.payin_payment_mode_ref_id,
                pay_mode_code=m.pay_mode_code,
                pay_mode_name=m.pay_mode_name,
                pay_mode_desc=m.pay_mode_desc,
                pay_icon=m.pay_icon,
                is_enabled=m.is_enabled
            ) for m in mode_res.scalars().all()
        ]

        # 4. Enabled Card Types
        card_stmt = select(PayinCardTypeModel).where(
            PayinCardTypeModel.is_enabled == True
        ).order_by(PayinCardTypeModel.card_type_code.asc())
        card_res = await db.execute(card_stmt)
        cards = [
            CardTypeOptionItem(
                card_type_ref_id=c.payin_card_type_ref_id,
                card_type_code=c.card_type_code,
                card_type_name=c.card_type_name,
                card_network=c.card_network,
                is_enabled=c.is_enabled
            ) for c in card_res.scalars().all()
        ]

        # 5. Eligible Vendors mapped to company
        v_stmt = text("""
            SELECT v.payin_vendor_ref_id, v.vendor_code, v.vendor_name, v.provider_name, cv.is_default
            FROM public.payin_company_vendors cv
            JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
            WHERE cv.company_ref_id = :c_ref 
              AND cv.is_enabled = TRUE 
              AND v.vendor_status = 'ACTIVE'
            ORDER BY cv.vendor_priority ASC, cv.is_default DESC;
        """)
        v_res = await db.execute(v_stmt, {"c_ref": company_ref_id})
        vendors = [
            VendorOptionItem(
                payin_vendor_ref_id=r[0],
                vendor_code=r[1],
                vendor_name=r[2],
                provider_name=r[3],
                is_default=r[4]
            ) for r in v_res.fetchall()
        ]

        return PayInOptionsResponse(
            success=True,
            company_ref_id=company_ref_id,
            company_name=c_name,
            min_amount=min_amt,
            max_amount=max_amt,
            services=services,
            payment_modes=modes,
            card_types=cards,
            vendors=vendors
        )

    @classmethod
    async def resolve_company_vendor(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        requested_vendor_code: Optional[str] = None
    ) -> PayinVendorModel:
        """
        Resolves the authoritative vendor for the authenticated company.
        SMSPay (company_ref_id = 2) always defaults to BANKME unless explicitly remapped.
        """
        if requested_vendor_code and requested_vendor_code.strip():
            stmt = select(PayinVendorModel).join(
                PayinCompanyVendorModel,
                PayinCompanyVendorModel.payin_vendor_ref_id == PayinVendorModel.payin_vendor_ref_id
            ).where(
                PayinCompanyVendorModel.company_ref_id == company_ref_id,
                PayinCompanyVendorModel.is_enabled == True,
                PayinVendorModel.vendor_code == requested_vendor_code.strip().upper(),
                PayinVendorModel.vendor_status == "ACTIVE"
            )
            res = await db.execute(stmt)
            vendor = res.scalars().first()
            if vendor:
                return vendor

        # Fallback to default active vendor for company
        stmt_def = select(PayinVendorModel).join(
            PayinCompanyVendorModel,
            PayinCompanyVendorModel.payin_vendor_ref_id == PayinVendorModel.payin_vendor_ref_id
        ).where(
            PayinCompanyVendorModel.company_ref_id == company_ref_id,
            PayinCompanyVendorModel.is_enabled == True,
            PayinVendorModel.vendor_status == "ACTIVE"
        ).order_by(
            PayinCompanyVendorModel.is_default.desc(),
            PayinCompanyVendorModel.vendor_priority.asc()
        )
        res_def = await db.execute(stmt_def)
        vendor_def = res_def.scalars().first()
        if vendor_def:
            return vendor_def

        # Absolute default for SMSPay (company_ref_id=2)
        if company_ref_id == 2:
            stmt_bankme = select(PayinVendorModel).where(
                PayinVendorModel.vendor_code == "BANKME",
                PayinVendorModel.vendor_status == "ACTIVE"
            )
            v_bme = (await db.execute(stmt_bankme)).scalars().first()
            if v_bme:
                return v_bme
        else:
            # Fallback for all other companies to EXISTING provider
            stmt_existing = select(PayinVendorModel).where(
                PayinVendorModel.vendor_code == "EXISTING",
                PayinVendorModel.vendor_status == "ACTIVE"
            )
            v_ext = (await db.execute(stmt_existing)).scalars().first()
            if v_ext:
                return v_ext

        raise DomainException(f"No active payment vendor configured for Company Ref ID {company_ref_id}.")

    @classmethod
    async def log_admin_audit(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        action_type: str,
        entity_type: str,
        entity_ref_id: int,
        old_val: Optional[Dict[str, Any]] = None,
        new_val: Optional[Dict[str, Any]] = None,
        actor_ref_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """Records an immutable audit entry in payin_audit_logs."""
        try:
            audit = PayinAuditLogModel(
                company_ref_id=company_ref_id,
                actor_ref_id=actor_ref_id,
                action_type=action_type,
                entity_type=entity_type,
                entity_ref_id=entity_ref_id,
                old_value=old_val,
                new_value=new_val,
                ip_address=ip_address
            )
            db.add(audit)
            await db.flush()
        except Exception as e:
            logger.warning("Failed to record payin audit log: %s", e)
