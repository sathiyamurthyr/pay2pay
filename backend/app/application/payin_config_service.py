"""
Enterprise PayIn Configuration Service.
Manages company configurations, vendor mappings, service catalogs,
payment modes, card types, and administrative audits.
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy import text, select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.db.payin_models import (
    PayinCompanyCfgModel, PayinVendorModel, PayinCompanyVendorModel,
    PayinServiceTypeModel, PayinPaymentModeModel, PayinCardTypeModel,
    PayinMdrCfgModel, PayinAuditLogModel
)
from app.application.payin_dtos import (
    PayInOptionsResponse, ServiceOptionItem, PaymentModeOptionItem,
    CardTypeOptionItem, VendorOptionItem, CardSchemeMdrItem
)
from app.application.gateway_masking_service import GatewayMaskingService
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
        company_ref_id: int,
        role: Optional[str] = "RETAILER"
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

        # 5. Eligible Vendors mapped to company with dynamic Admin-configured gateway display
        v_stmt = text("""
            SELECT 
                v.payin_vendor_ref_id, 
                v.vendor_code, 
                v.vendor_name, 
                v.provider_name, 
                cv.is_default,
                cv.gateway_code,
                cv.retailer_display_name,
                cv.description,
                cv.display_order,
                cv.status,
                cv.is_enabled
            FROM public.payin_company_vendors cv
            JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
            WHERE cv.company_ref_id = :c_ref 
              AND cv.is_enabled = TRUE 
              AND cv.status = 'ACTIVE'
              AND v.vendor_status = 'ACTIVE'
            ORDER BY cv.display_order ASC, cv.vendor_priority ASC, cv.is_default DESC;
        """)
        v_res = await db.execute(v_stmt, {"c_ref": company_ref_id})
        raw_vendors = v_res.fetchall()
        
        is_admin = GatewayMaskingService.is_admin_role(role)
        vendors = []
        for r in raw_vendors:
            v_ref_id = r[0]
            raw_vcode = r[1]
            raw_vname = r[2]
            raw_pname = r[3]
            is_def = r[4]
            g_code = r[5] or GatewayMaskingService.get_gateway_code(raw_vcode)
            display_name = r[6] or f"Gateway {g_code}"
            desc = r[7] or ("Fast and secure payment processing with instant confirmation." if g_code == "G-1" else "Enterprise-grade payment gateway with redundant routing.")
            disp_order = r[8] or (1 if g_code == "G-1" else 2)
            g_status = r[9] or "ACTIVE"
            g_enabled = r[10] if r[10] is not None else True

            if is_admin:
                # Authorized admin preserves internal provider visibility
                vendors.append(VendorOptionItem(
                    payin_vendor_ref_id=v_ref_id,
                    vendor_code=raw_vcode,
                    vendor_name=raw_vname,
                    provider_name=raw_pname,
                    is_default=is_def,
                    gateway_code=g_code,
                    display_name=display_name,
                    subtitle=f"Internal Provider ({raw_vcode})",
                    description=desc,
                    display_order=disp_order,
                    badge="Active" if g_status == "ACTIVE" and g_enabled else "Inactive",
                    badge_color="#10B981" if g_status == "ACTIVE" and g_enabled else "#94A3B8",
                    is_active=(g_status == "ACTIVE" and g_enabled),
                    is_enabled=g_enabled
                ))
            else:
                # Customer-facing roles see only Admin-configured dynamic gateway name and masked code
                vendors.append(VendorOptionItem(
                    payin_vendor_ref_id=v_ref_id,
                    vendor_code=g_code,
                    vendor_name=display_name,
                    provider_name=display_name,
                    is_default=(is_def or disp_order == 1 or g_code == "G-1"),
                    gateway_code=g_code,
                    display_name=display_name,
                    subtitle=desc,
                    description=desc,
                    display_order=disp_order,
                    badge="Active",
                    badge_color="#10B981",
                    is_active=True,
                    is_enabled=True,
                    supported_methods=["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"]
                ))

        if not is_admin:
            vendors.sort(key=lambda x: (x.display_order or 1, x.gateway_code or x.vendor_code))

        # 6. Configured Card Schemes with Admin MDR
        card_schemes = await cls.get_card_schemes_mdr(db=db, company_ref_id=company_ref_id)

        active_policy = comp_cfg.customer_payable_policy if comp_cfg and comp_cfg.customer_payable_policy else "WITH_MDR"
        policy_name = "Customer Pays MDR Charges" if active_policy == "WITH_MDR" else "Retailer Bears MDR Charges"
        treatment = "COLLECT_ADDITIONALLY" if active_policy == "WITH_MDR" else "DEDUCT_FROM_TOPUP"

        return PayInOptionsResponse(
            success=True,
            company_ref_id=company_ref_id,
            company_name=c_name,
            min_amount=min_amt,
            max_amount=max_amt,
            services=services,
            payment_modes=modes,
            card_types=cards,
            vendors=vendors,
            card_schemes=card_schemes,
            customer_payable_policy=active_policy,
            policy_display_name=policy_name,
            mdr_treatment=treatment
        )

    @classmethod
    async def get_card_schemes_mdr(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        vendor_code: Optional[str] = None
    ) -> List[CardSchemeMdrItem]:
        """
        Retrieves the 5 standard card categories and their Admin-configured MDR rates
        for the authenticated company and selected vendor/gateway.
        Strict company isolation is enforced.
        """
        vendor = await cls.resolve_company_vendor(
            db=db,
            company_ref_id=company_ref_id,
            requested_vendor_code=vendor_code
        )
        vendor_ref_id = vendor.payin_vendor_ref_id if vendor else 1

        schemes_meta = [
            {
                "id": "visa",
                "name": "Visa",
                "category": "Consumer Debit / Credit",
                "card_network": "VISA",
                "brand_color": "#1A1F71",
                "icon_text": "VISA"
            },
            {
                "id": "mastercard",
                "name": "MasterCard",
                "category": "Consumer Debit / Credit",
                "card_network": "MASTERCARD",
                "brand_color": "#EB001B",
                "icon_text": "MC"
            },
            {
                "id": "rupay",
                "name": "RuPay",
                "category": "Domestic NPCI Network",
                "card_network": "RUPAY",
                "brand_color": "#097939",
                "icon_text": "RUPAY"
            },
            {
                "id": "amex_diners",
                "name": "AMEX / Diners",
                "category": "Premium Card Schemes",
                "card_network": "AMEX",
                "brand_color": "#006FCF",
                "icon_text": "AMEX"
            },
            {
                "id": "business_corporate",
                "name": "Business / Corporate",
                "category": "Commercial & Purchasing",
                "card_network": "CORP",
                "brand_color": "#475569",
                "icon_text": "CORP"
            }
        ]

        now = datetime.now(timezone.utc)
        results: List[CardSchemeMdrItem] = []

        for sm in schemes_meta:
            net = sm["card_network"]
            stmt = text("""
                SELECT payin_mdr_cfg_ref_id, mdr_pct, mdr_fixed, tax_pct, mdr_treatment, is_enabled
                FROM public.payin_mdr_cfg
                WHERE company_ref_id = :c_ref
                  AND payin_vendor_ref_id = :v_ref
                  AND card_network = :c_net
                  AND is_enabled = TRUE
                  AND effective_from <= :now_dt
                  AND (effective_to IS NULL OR effective_to >= :now_dt)
                ORDER BY priority DESC, payin_mdr_cfg_ref_id DESC
                LIMIT 1;
            """)
            res = await db.execute(stmt, {
                "c_ref": company_ref_id,
                "v_ref": vendor_ref_id,
                "c_net": net,
                "now_dt": now
            })
            row = res.mappings().first()

            if row:
                pct = float(row["mdr_pct"])
                display_pct = f"{pct * 100:.2f}%" if pct > 0 else "0.00%"
                results.append(CardSchemeMdrItem(
                    id=sm["id"],
                    name=sm["name"],
                    category=sm["category"],
                    card_network=sm["card_network"],
                    mdr_percent=round(pct * 100, 2),
                    mdr_display=display_pct,
                    mdr_treatment=str(row["mdr_treatment"] or "COLLECT_ADDITIONALLY"),
                    is_configured=True,
                    brand_color=sm["brand_color"],
                    icon_text=sm["icon_text"],
                    rule_ref_id=row["payin_mdr_cfg_ref_id"]
                ))
            else:
                results.append(CardSchemeMdrItem(
                    id=sm["id"],
                    name=sm["name"],
                    category=sm["category"],
                    card_network=sm["card_network"],
                    mdr_percent=None,
                    mdr_display="Not Configured",
                    mdr_treatment=None,
                    is_configured=False,
                    brand_color=sm["brand_color"],
                    icon_text=sm["icon_text"],
                    rule_ref_id=None
                ))

        return results

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
            req_code = requested_vendor_code.strip().upper()
            internal_code = GatewayMaskingService.resolve_internal_vendor(req_code)

            # Check if this company vendor mapping exists and whether it is inactive
            check_stmt = select(PayinCompanyVendorModel, PayinVendorModel).join(
                PayinVendorModel,
                PayinCompanyVendorModel.payin_vendor_ref_id == PayinVendorModel.payin_vendor_ref_id
            ).where(
                PayinCompanyVendorModel.company_ref_id == company_ref_id,
                or_(
                    func.upper(PayinCompanyVendorModel.gateway_code) == req_code,
                    func.upper(PayinVendorModel.vendor_code) == internal_code,
                    func.upper(PayinVendorModel.vendor_code) == req_code
                )
            )
            check_res = await db.execute(check_stmt)
            cv_row = check_res.first()
            if cv_row:
                cv_obj, v_obj = cv_row
                if not cv_obj.is_enabled or cv_obj.status == "INACTIVE" or v_obj.vendor_status != "ACTIVE":
                    raise DomainException(f"Selected payment gateway '{cv_obj.retailer_display_name or req_code}' is currently inactive or disabled.")
                return v_obj

        # Fallback to default active vendor for company
        stmt_def = select(PayinVendorModel).join(
            PayinCompanyVendorModel,
            PayinCompanyVendorModel.payin_vendor_ref_id == PayinVendorModel.payin_vendor_ref_id
        ).where(
            PayinCompanyVendorModel.company_ref_id == company_ref_id,
            PayinCompanyVendorModel.is_enabled == True,
            PayinCompanyVendorModel.status == "ACTIVE",
            PayinVendorModel.vendor_status == "ACTIVE"
        ).order_by(
            PayinCompanyVendorModel.is_default.desc(),
            PayinCompanyVendorModel.display_order.asc(),
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
