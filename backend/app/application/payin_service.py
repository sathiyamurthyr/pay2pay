"""
Enterprise PayIn Application Orchestrator Service.
Implements the complete End-to-End PayIn Lifecycle:
1. Receive & Authenticate common PayIn request.
2. Resolve authenticated Company Ref ID strictly from server context (never trust client input).
3. Validate duplicate reference ID & idempotency.
4. Generate TID FIRST via authoritative transaction generator before provider invocation.
5. Resolve Vendor, Service Type, Payment Mode, and Card Type from database.
6. Retrieve dynamic MDR configuration and calculate financial charges based on MDR Treatment.
7. Route by Company Ref ID:
   - SMSPay (Ref ID 2) -> BankMe PayIn Adapter
   - Other Companies -> Existing PayIn Adapter
8. Invoke Provider API.
9. Persist authoritative record into 'payin_transactions'.
10. Process webhook callbacks:
    - Validate TID + Company Ref ID ownership
    - Record in 'payin_callback_logs'
    - Idempotent state transitions with row locking
    - Automatic single wallet credit via WalletBalanceAdjustmentService and public.wallet_balance_update on SUCCESS.
"""

import time
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

from sqlalchemy import select, and_, or_, text, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.exceptions import DomainException

from app.application.payin_dtos import (
    CommonPayInRequest, CommonPayInResponse, PayInStatusResponse,
    MdrPreviewRequest, MdrPreviewResponse, BankMeWebhookPayload
)
from app.application.payin_routing_service import PayInRoutingService, PayInProvider, SMSPAY_COMPANY_REF_ID
from app.application.payin_mdr_service import PayInMdrService
from app.application.payin_config_service import PayInConfigService
from app.application.payment_method_normalizer import PaymentMethodNormalizer, NormalizedPaymentMethod
from app.application.bankme_payin_adapter import BankMePayInAdapter, ExistingPayInAdapter
from app.application.gateway_masking_service import GatewayMaskingService
from app.application.bankme_payin_client import BankMePayInClient, record_payin_api_audit_log
from app.application.transaction_reference_service import TransactionReferenceService
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO
from app.application.user_type_service import UserTypeService
from app.core.company_resolver import resolve_return_base_url, resolve_receipt_base_url
from app.core.security import GlobalReceiptSecurity
from app.infrastructure.db.payin_models import (
    PayinTransactionModel, PayinCallbackLogModel, PayinServiceTypeModel,
    PayinPaymentModeModel, PayinCardTypeModel, PayinVendorModel, PayinApiLogModel
)
from app.infrastructure.db.models import RetailerWalletModel, RetailerModel

logger = logging.getLogger("payin_service")

DEFAULT_TENANT_ID = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
DEFAULT_COMPANY_ID = uuid.UUID("0bf4371b-4c74-4916-a817-61c203b353e8")


class PayInService:
    """Enterprise PayIn Orchestrator."""

    @classmethod
    async def generate_payin_tid(
        cls,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        company_ref_id: Optional[int] = None,
        vendor_code: str = "BANKME"
    ) -> str:
        """
        Generates Authoritative TID as the FIRST execution step.
        Uses vendor prefix dynamically (e.g. 'B' for BankMe, 'P' for Pay2Pay).
        Format: <VENDOR_FIRST_CHAR>PAY<DDMMYYHHMI><5_DIGIT_UNIQUE_NUMBER>
        """
        import secrets
        v_code = vendor_code or ("BANKME" if (company_ref_id is not None and int(company_ref_id) == SMSPAY_COMPANY_REF_ID) else "PAY2PAY")
        
        now_dt = datetime.now(timezone.utc).strftime("%d%m%y%H%M")
        if v_code == "EXISTING":
            v_prefix = "P"
        elif v_code:
            v_prefix = v_code[0].upper()
        else:
            v_prefix = "P"

        for _ in range(5):
            rand_num = secrets.randbelow(90000) + 10000
            candidate = f"{v_prefix}PAY{now_dt}{rand_num}"

            stmt = select(PayinTransactionModel.payin_transactions_ref_id).where(PayinTransactionModel.tid == candidate)
            res = await db.execute(stmt)
            if not res.scalar():
                return candidate

        return f"{v_prefix}PAY{now_dt}{secrets.randbelow(90000) + 10000}"

    @classmethod
    async def calculate_preview(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        preview_req: MdrPreviewRequest,
        role: Optional[str] = "RETAILER"
    ) -> MdrPreviewResponse:
        """
        Calculates live MDR and financial breakdown for retailer top-up preview.
        """
        # 1. Resolve Vendor
        vendor = await PayInConfigService.resolve_company_vendor(
            db=db,
            company_ref_id=company_ref_id,
            requested_vendor_code=preview_req.vendor_code
        )

        # 1b. Enforce Min/Max Amount Limits
        amt = float(preview_req.amount)
        cfg_stmt = text("""
            SELECT COALESCE(cv.min_amount, cfg.min_amount, 10.00) AS eff_min,
                   COALESCE(cv.max_amount, cfg.max_amount, 500000.00) AS eff_max
            FROM public.payin_company_cfg cfg
            LEFT JOIN public.payin_company_vendors cv 
                ON cv.company_ref_id = cfg.company_ref_id 
                AND cv.payin_vendor_ref_id = :v_ref
            WHERE cfg.company_ref_id = :c_ref
            LIMIT 1;
        """)
        cfg_res = (await db.execute(cfg_stmt, {"c_ref": company_ref_id, "v_ref": vendor.payin_vendor_ref_id})).mappings().first()
        eff_min = float(cfg_res["eff_min"]) if cfg_res else 10.0
        eff_max = float(cfg_res["eff_max"]) if cfg_res else 500000.0
        if amt < eff_min or amt > eff_max:
            raise DomainException(
                f"Transaction amount ₹{amt:,.2f} is outside allowed limits (Min: ₹{eff_min:,.2f}, Max: ₹{eff_max:,.2f})."
            )

        # 2. Resolve Service Type ID
        s_type_id = None
        if preview_req.service_type_code:
            s_stmt = select(PayinServiceTypeModel.payin_service_type_ref_id).where(
                PayinServiceTypeModel.svc_code == preview_req.service_type_code.strip().upper(),
                PayinServiceTypeModel.is_enabled == True
            )
            s_res = await db.execute(s_stmt)
            s_type_id = s_res.scalar()

        # 3. Resolve Payment Mode ID
        p_mode_id = None
        if preview_req.payment_mode_code:
            mode_code = preview_req.payment_mode_code.strip().upper()
            if mode_code in ("CARD", "CARDS"):
                mode_code = "CREDIT_CARD"
            m_stmt = select(PayinPaymentModeModel.payin_payment_mode_ref_id).where(
                PayinPaymentModeModel.pay_mode_code == mode_code,
                PayinPaymentModeModel.is_enabled == True
            )
            m_res = await db.execute(m_stmt)
            p_mode_id = m_res.scalar()

        # 4. Resolve Card Type ID
        c_type_id = None
        if preview_req.card_type_code:
            c_stmt = select(PayinCardTypeModel.payin_card_type_ref_id).where(
                PayinCardTypeModel.card_type_code == preview_req.card_type_code.strip().upper(),
                PayinCardTypeModel.is_enabled == True
            )
            c_res = await db.execute(c_stmt)
            c_type_id = c_res.scalar()
        elif preview_req.card_network:
            c_stmt2 = select(PayinCardTypeModel.payin_card_type_ref_id).where(
                PayinCardTypeModel.card_network == preview_req.card_network.strip().upper(),
                PayinCardTypeModel.is_enabled == True
            )
            c_res2 = await db.execute(c_stmt2)
            c_type_id = c_res2.scalar()

        # 5. Resolve MDR Rule and Calculate Charges
        mdr_cfg = await PayInMdrService.resolve_mdr_rule(
            db=db,
            company_ref_id=company_ref_id,
            vendor_ref_id=vendor.payin_vendor_ref_id,
            service_type_ref_id=s_type_id,
            payment_mode_ref_id=p_mode_id,
            card_type_ref_id=c_type_id,
            card_network=preview_req.card_network
        )
        calc = PayInMdrService.calculate_charges(preview_req.amount, mdr_cfg)

        return MdrPreviewResponse(
            success=True,
            txn_amount=calc["txn_amount"],
            mdr_pct=calc["mdr_pct"],
            mdr_fixed=calc["mdr_fixed"],
            mdr_amount=calc["mdr_amount"],
            tax_pct=calc["tax_pct"],
            tax_amount=calc["tax_amount"],
            total_charges=calc["total_charges"],
            customer_payable=calc["customer_payable"],
            retailer_credit=calc["retailer_credit"],
            company_mdr_liability=calc["company_mdr_liability"],
            mdr_treatment=calc["mdr_treatment"],
            rule_ref_id=calc["rule_ref_id"],
            vendor_name=GatewayMaskingService.get_masked_display_name(vendor.vendor_code if vendor else None, role=role),
            customer_payable_policy=calc.get("customer_payable_policy", "WITH_MDR"),
            policy_display_name=calc.get("policy_display_name", "Customer Pays MDR Charges")
        )

    @classmethod
    async def initiate_payin(
        cls,
        db: AsyncSession,
        request_dto: CommonPayInRequest,
        auth_context: Dict[str, Any]
    ) -> CommonPayInResponse:
        """
        Initiates a PayIn transaction according to the complete enterprise lifecycle.
        """
        # 1. Resolve & Validate Authenticated Context (Three Standard Reference Columns)
        company_ref_id = auth_context.get("company_ref_id")
        tenant_id = auth_context.get("tenant_id") or DEFAULT_TENANT_ID
        user_ref_id = auth_context.get("user_ref_id")
        user_type_ref_id = auth_context.get("user_type_ref_id")
        user_type_code = auth_context.get("user_type_code") or "RETAILER"

        if company_ref_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthenticated: company_ref_id not found in session context."
            )

        company_ref_id = int(company_ref_id)

        # Dynamically resolve user_type_ref_id from public.user_type if not provided
        if user_type_ref_id is None:
            user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, user_type_code)

        # If user_ref_id is not provided, fallback to retailer_ref_id or lookup for retailer
        if user_ref_id is None:
            user_ref_id = auth_context.get("retailer_ref_id")

        if user_ref_id is None and user_type_code == "RETAILER":
            r_stmt = select(RetailerModel.retailer_ref_id).where(
                RetailerModel.company_ref_id == company_ref_id
            ).order_by(RetailerModel.retailer_ref_id.asc()).limit(1)
            user_ref_id = (await db.execute(r_stmt)).scalar()

        if user_ref_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot initiate PayIn: user_ref_id could not be resolved from authenticated context."
            )

        user_ref_id = int(user_ref_id)
        effective_retailer_ref = user_ref_id if user_type_code == "RETAILER" else None

        # P0 Security: Strict Terminal & Retailer Account Lock Enforcement
        if effective_retailer_ref:
            ret_check_stmt = select(RetailerModel).where(
                RetailerModel.retailer_ref_id == effective_retailer_ref,
                RetailerModel.company_ref_id == company_ref_id,
                RetailerModel.is_deleted == False
            )
            ret_record = (await db.execute(ret_check_stmt)).scalars().first()
            if ret_record:
                ret_status = str(ret_record.status or "").upper()
                if ret_status in ("LOCKED", "BLOCKED", "SUSPENDED", "INACTIVE", "REJECTED") or getattr(ret_record, "mpin_locked", False):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access Denied: Terminal or retailer account is locked. Please unlock the terminal before initiating transactions."
                    )

        # 2. Check for duplicate reference ID / Idempotency
        idempotency_key = f"{company_ref_id}:{request_dto.reference_id}"
        stmt_dup = select(PayinTransactionModel).where(
            PayinTransactionModel.idempotency_key == idempotency_key
        )
        res_dup = await db.execute(stmt_dup)
        existing_dup = res_dup.scalars().first()
        if existing_dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate PayIn request: reference_id '{request_dto.reference_id}' already exists (TID: {existing_dup.tid})."
            )

        # 3. Resolve Vendor for Company
        vendor = await PayInConfigService.resolve_company_vendor(
            db=db,
            company_ref_id=company_ref_id,
            requested_vendor_code=request_dto.vendor_code
        )

        # 3b. Enforce Min/Max Amount Limits
        amt = float(request_dto.amount)
        cfg_stmt = text("""
            SELECT COALESCE(cv.min_amount, cfg.min_amount, 10.00) AS eff_min,
                   COALESCE(cv.max_amount, cfg.max_amount, 500000.00) AS eff_max
            FROM public.payin_company_cfg cfg
            LEFT JOIN public.payin_company_vendors cv 
                ON cv.company_ref_id = cfg.company_ref_id 
                AND cv.payin_vendor_ref_id = :v_ref
            WHERE cfg.company_ref_id = :c_ref
            LIMIT 1;
        """)
        cfg_res = (await db.execute(cfg_stmt, {"c_ref": company_ref_id, "v_ref": vendor.payin_vendor_ref_id})).mappings().first()
        eff_min = float(cfg_res["eff_min"]) if cfg_res else 10.0
        eff_max = float(cfg_res["eff_max"]) if cfg_res else 500000.0
        if amt < eff_min or amt > eff_max:
            raise DomainException(
                f"Transaction amount ₹{amt:,.2f} is outside allowed limits (Min: ₹{eff_min:,.2f}, Max: ₹{eff_max:,.2f})."
            )

        # 4. Resolve Catalog IDs
        # Service Type
        svc_code = (request_dto.service_type_code or "UTILITY").strip().upper()
        s_stmt = select(PayinServiceTypeModel).where(
            PayinServiceTypeModel.svc_code == svc_code,
            PayinServiceTypeModel.is_enabled == True
        )
        s_type = (await db.execute(s_stmt)).scalars().first()
        if not s_type:
            # Fallback to first available service
            s_type = (await db.execute(select(PayinServiceTypeModel).limit(1))).scalars().first()

        # Payment Mode
        mode_code = (request_dto.payment_mode_code or request_dto.payment_mode or "UPI").strip().upper()
        if mode_code in ("CARD", "CARDS"):
            mode_code = "CREDIT_CARD"
        m_stmt = select(PayinPaymentModeModel).where(
            PayinPaymentModeModel.pay_mode_code == mode_code,
            PayinPaymentModeModel.is_enabled == True
        )
        p_mode = (await db.execute(m_stmt)).scalars().first()
        if not p_mode:
            p_mode = (await db.execute(select(PayinPaymentModeModel).limit(1))).scalars().first()

        # Card Type (Optional)
        c_type = None
        if request_dto.card_type_code:
            c_stmt = select(PayinCardTypeModel).where(
                PayinCardTypeModel.card_type_code == request_dto.card_type_code.strip().upper(),
                PayinCardTypeModel.is_enabled == True
            )
            c_type = (await db.execute(c_stmt)).scalars().first()
        elif request_dto.card_network:
            c_stmt2 = select(PayinCardTypeModel).where(
                PayinCardTypeModel.card_network == request_dto.card_network.strip().upper(),
                PayinCardTypeModel.is_enabled == True
            )
            c_type = (await db.execute(c_stmt2)).scalars().first()

        # 5. Generate Authoritative TID FIRST before provider transaction
        tid = await cls.generate_payin_tid(
            db=db,
            tenant_id=tenant_id,
            company_ref_id=company_ref_id,
            vendor_code=vendor.vendor_code
        )

        # 6. Resolve Dynamic MDR & Calculate Charges
        mdr_cfg = await PayInMdrService.resolve_mdr_rule(
            db=db,
            company_ref_id=company_ref_id,
            vendor_ref_id=vendor.payin_vendor_ref_id,
            service_type_ref_id=s_type.payin_service_type_ref_id if s_type else None,
            payment_mode_ref_id=p_mode.payin_payment_mode_ref_id if p_mode else None,
            card_type_ref_id=c_type.payin_card_type_ref_id if c_type else None,
            card_network=request_dto.card_network
        )
        calc = PayInMdrService.calculate_charges(request_dto.amount, mdr_cfg)

        # 7. Create PayIn Transaction Record (INITIATED)
        now_utc = datetime.now(timezone.utc)
        payin_txn = PayinTransactionModel(
            tid=tid,
            company_ref_id=company_ref_id,
            user_type_ref_id=user_type_ref_id,
            user_ref_id=user_ref_id,
            retailer_ref_id=effective_retailer_ref,
            payin_vendor_ref_id=vendor.payin_vendor_ref_id,
            merchant_ref_id=request_dto.reference_id,
            svc_type_ref_id=s_type.payin_service_type_ref_id if s_type else 1,
            pay_mode_ref_id=p_mode.payin_payment_mode_ref_id if p_mode else 1,
            card_type_ref_id=c_type.payin_card_type_ref_id if c_type else None,
            card_network=request_dto.card_network,
            cust_name=request_dto.customer_name,
            cust_mobile=request_dto.customer_mobile,
            cust_email=request_dto.customer_email,
            txn_amount=calc["txn_amount"],
            mdr_pct=calc["mdr_pct"],
            mdr_fixed=calc["mdr_fixed"],
            mdr_amount=calc["mdr_amount"],
            tax_amount=calc["tax_amount"],
            total_charges=calc["total_charges"],
            customer_payable=calc["customer_payable"],
            retailer_credit=calc["retailer_credit"],
            company_mdr_liability=calc["company_mdr_liability"],
            currency="INR",
            mdr_treatment=calc["mdr_treatment"],
            customer_payable_policy=calc.get("customer_payable_policy", "WITH_MDR"),
            txn_status="INITIATED",
            callback_status="PENDING",
            idempotency_key=idempotency_key,
            request_ref=request_dto.model_dump(),
            initiated_at=now_utc
        )
        db.add(payin_txn)
        await db.flush()

        # 8. Route to Provider Adapter with support for G-1 / G-2 selection
        resolved_vcode = GatewayMaskingService.resolve_internal_vendor(request_dto.vendor_code)
        if resolved_vcode == "BANKME":
            adapter = BankMePayInAdapter()
            provider_code = "BANKME"
        elif resolved_vcode == "EXISTING":
            adapter = ExistingPayInAdapter()
            provider_code = "EXISTING"
        else:
            provider = PayInRoutingService.resolve_provider(company_ref_id)
            if provider == PayInProvider.BANKME:
                adapter = BankMePayInAdapter()
                provider_code = "BANKME"
            else:
                adapter = ExistingPayInAdapter()
                provider_code = "EXISTING"

        # 9. Resolve Verified Dedicated Receipt Base URL & Bitly-Style Short URL
        req = auth_context.get("request")
        receipt_base = resolve_receipt_base_url(
            company_ref_id=company_ref_id,
            request=req
        )
        from app.application.receipt_short_link_service import ReceiptShortLinkService
        short_code = await ReceiptShortLinkService.generate_or_get_short_code(
            db=db,
            tid=tid,
            company_ref_id=company_ref_id,
            user_type_ref_id=user_type_ref_id,
            user_ref_id=user_ref_id,
            payin_txn_id=payin_txn.payin_transactions_ref_id
        )
        payin_txn.receipt_short_code = short_code
        resolved_return_url = f"{receipt_base}/r/{short_code}"

        provider_resp = await adapter.initiate_payin(
            tid=tid,
            amount=calc["customer_payable"],
            customer_name=request_dto.customer_name,
            customer_mobile=request_dto.customer_mobile,
            customer_email=request_dto.customer_email,
            reference_id=tid,
            callback_url=request_dto.callback_url or (vendor.callback_url if vendor else None),
            return_url=resolved_return_url,
            request=req,
            payment_mode=mode_code,
            note=request_dto.note,
            company_ref_id=company_ref_id,
            retailer_ref_id=effective_retailer_ref,
            user_ref_id=user_ref_id,
            user_type_ref_id=user_type_ref_id,
            vendor_ref_id=vendor.payin_vendor_ref_id if vendor else 1
        )

        # 10. Update PayIn Transaction with Provider Details
        is_success = provider_resp.get("success", False)
        new_status = "PENDING" if is_success else "FAILED"
        payin_txn.txn_status = new_status
        payin_txn.provider_status = provider_resp.get("status", "PENDING")
        payin_txn.provider_ref_id = provider_resp.get("order_id") or provider_resp.get("bankme_ref") or provider_resp.get("provider_reference")
        payin_txn.response_ref = provider_resp
        if not is_success:
            payin_txn.failure_reason = provider_resp.get("message", "Provider initiation failed")

        await db.commit()

        # Mask provider for customer-facing roles
        caller_roles = auth_context.get("roles") or []
        primary_caller_role = caller_roles[0] if caller_roles else "RETAILER"
        masked_provider = GatewayMaskingService.get_masked_display_name(provider_code, role=primary_caller_role)

        return CommonPayInResponse(
            success=is_success,
            status=new_status,
            tid=tid,
            merchant_reference=request_dto.reference_id,
            provider_reference=payin_txn.provider_ref_id,
            amount=calc["txn_amount"],
            mdr_charge=calc["mdr_amount"],
            gst_amount=calc["tax_amount"],
            total_charges=calc["total_charges"],
            customer_payable=calc["customer_payable"],
            retailer_credit=calc["retailer_credit"],
            company_mdr_liability=calc["company_mdr_liability"],
            mdr_treatment=calc["mdr_treatment"],
            customer_payable_policy=calc.get("customer_payable_policy", "WITH_MDR"),
            policy_display_name=calc.get("policy_display_name", "Customer Pays MDR Charges"),
            provider=masked_provider,
            payment_url=provider_resp.get("payment_url"),
            qr_string=provider_resp.get("qr_string"),
            qr_code_url=provider_resp.get("qr_code_url"),
            expires_at=provider_resp.get("expires_at"),
            message="PayIn initiated successfully" if is_success else provider_resp.get("message", "PayIn initiation failed")
        )

    @classmethod
    async def reconcile_and_finalize_transaction(
        cls,
        db: AsyncSession,
        txn: PayinTransactionModel,
        raw_gateway_payload: Optional[Dict[str, Any]] = None,
        provider_status: Optional[str] = None,
        provider_ref_id: Optional[str] = None,
        source: str = "STATUS_SYNC"
    ) -> Dict[str, Any]:
        """
        Authoritative transaction finalization and reconciliation engine:
        1. Normalizes actual payment method returned by payment gateway (Visa, Mastercard, RuPay, UPI, Amex, Corp, etc.)
        2. Assigns pay_mode_ref_id and card_type_ref_id consistently without defaulting missing methods to UPI.
        3. Resolves dynamic MDR configuration based on authenticated company ID, vendor ID, and detected method.
        4. Re-calculates exact financial charges (MDR, GST, Customer Payable, Retailer Credit) using Decimal arithmetic.
        5. Atomically credits retailer wallet using the reconciled credit amount via WalletBalanceAdjustmentService.
        """
        now_utc = datetime.now(timezone.utc)
        eff_status = (provider_status or txn.txn_status or "SUCCESS").strip().upper()

        # 1. Normalize Payment Method from Gateway Response
        norm = PaymentMethodNormalizer.normalize_gateway_method(raw_payload=raw_gateway_payload)

        # Update card_network and payment mode if detected
        if norm.card_network:
            txn.card_network = norm.card_network
            if norm.card_network in ("VISA", "MASTERCARD", "RUPAY", "AMEX", "CORP"):
                ct_stmt = select(PayinCardTypeModel.payin_card_type_ref_id).where(
                    PayinCardTypeModel.card_network == norm.card_network
                )
                ct_res = await db.execute(ct_stmt)
                ct_id = ct_res.scalar()
                if ct_id:
                    txn.card_type_ref_id = ct_id

        if norm.pay_mode_code and norm.pay_mode_code != "UNKNOWN":
            pm_stmt = select(PayinPaymentModeModel.payin_payment_mode_ref_id).where(
                PayinPaymentModeModel.pay_mode_code == norm.pay_mode_code
            )
            pm_res = await db.execute(pm_stmt)
            pm_id = pm_res.scalar()
            if pm_id:
                txn.pay_mode_ref_id = pm_id
        elif norm.pay_mode_code == "UNKNOWN" and not txn.pay_mode_ref_id:
            pm_stmt = select(PayinPaymentModeModel.payin_payment_mode_ref_id).where(
                PayinPaymentModeModel.pay_mode_code == "UNKNOWN"
            )
            pm_res = await db.execute(pm_stmt)
            pm_id = pm_res.scalar()
            if pm_id:
                txn.pay_mode_ref_id = pm_id

        # 2. Recalculate Dynamic MDR Charges (if wallet has not yet been credited)
        if not txn.ledger_txn_id:
            try:
                mdr_cfg = await PayInMdrService.resolve_mdr_rule(
                    db=db,
                    company_ref_id=txn.company_ref_id,
                    vendor_ref_id=txn.payin_vendor_ref_id,
                    service_type_ref_id=txn.svc_type_ref_id,
                    payment_mode_ref_id=txn.pay_mode_ref_id,
                    card_type_ref_id=txn.card_type_ref_id,
                    card_network=txn.card_network
                )
                calc = PayInMdrService.calculate_charges(txn.txn_amount, mdr_cfg)
                txn.mdr_pct = calc["mdr_pct"]
                txn.mdr_amount = calc["mdr_amount"]
                txn.tax_amount = calc["tax_amount"]
                txn.total_charges = calc["total_charges"]
                txn.customer_payable = calc["customer_payable"]
                txn.retailer_credit = calc["retailer_credit"]
                txn.company_mdr_liability = calc["company_mdr_liability"]
                txn.mdr_treatment = calc["mdr_treatment"]
                txn.customer_payable_policy = calc.get("customer_payable_policy", txn.customer_payable_policy)
                logger.info(
                    "Reconciled TID %s with method %s (%s): MDR=%.4f, charges=%.2f, credit=%.2f",
                    txn.tid, txn.card_network or norm.display_name, calc["mdr_treatment"],
                    calc["mdr_pct"], calc["total_charges"], calc["retailer_credit"]
                )
            except Exception as mdr_err:
                logger.error("Could not resolve MDR rule for TID %s (method %s): %s", txn.tid, txn.card_network, mdr_err)

        # 3. Update Status and References
        if provider_ref_id:
            txn.provider_ref_id = provider_ref_id

        if eff_status == "SUCCESS":
            txn.txn_status = "SUCCESS"
            txn.provider_status = "SUCCESS"
            txn.callback_status = "SUCCESS"
            if not txn.completed_at:
                txn.completed_at = now_utc

            # 4. Atomic Wallet Credit if not already credited
            if not txn.ledger_txn_id:
                try:
                    # Resolve user ownership from standard 3 reference columns
                    eff_user_ref = txn.user_ref_id or txn.retailer_ref_id
                    eff_user_type_ref = txn.user_type_ref_id
                    if eff_user_type_ref is None:
                        eff_user_type_ref = await UserTypeService.get_user_type_ref_id(db, "RETAILER")
                    eff_user_type_code = await UserTypeService.get_user_type_code(db, eff_user_type_ref) or "RETAILER"

                    ret_obj = None
                    if eff_user_type_code == "RETAILER":
                        ret_stmt = select(RetailerModel).where(
                            RetailerModel.retailer_ref_id == eff_user_ref,
                            RetailerModel.company_ref_id == txn.company_ref_id
                        )
                        ret_res = await db.execute(ret_stmt)
                        ret_obj = ret_res.scalars().first()

                    credit_amt = float(txn.retailer_credit)

                    clean_method = PaymentMethodNormalizer.get_clean_method_display(
                        card_network=txn.card_network,
                        pay_mode_code=norm.pay_mode_code
                    )

                    adj_dto = WalletAdjustmentDTO(
                        user_ref_id=eff_user_ref,
                        retailer_id=str(ret_obj.public_id) if ret_obj else None,
                        retailer_code=ret_obj.retailer_code if ret_obj else None,
                        company_ref_id=txn.company_ref_id,
                        user_type_ref_id=eff_user_type_ref,
                        entry_type="CREDIT",
                        amount=credit_amt,
                        payout_amount=credit_amt,
                        charge_amount=0.0,
                        gst_amount=0.0,
                        service_name="PAYIN_TOPUP",
                        wallet_type="MAIN",
                        user_type=eff_user_type_code,
                        txn_id=txn.tid,
                        ref_id=txn.provider_ref_id or txn.tid,
                        narration=f"PayIn Wallet Top-Up ({clean_method}, TID: {txn.tid})"
                    )
                    adj_res = await WalletBalanceAdjustmentService.execute_wallet_balance_update(db=db, dto=adj_dto)
                    if adj_res and adj_res.success:
                        txn.ledger_txn_id = adj_res.txn_id
                        logger.info(
                            "Credited ₹%.2f to retailer %s for TID %s (ledger_id=%s, source=%s)",
                            credit_amt, txn.retailer_ref_id, txn.tid, adj_res.txn_id, source
                        )
                    else:
                        err_msg = adj_res.error_message if adj_res else "Wallet SP returned failure"
                        logger.error("Wallet credit SP returned failure for TID %s: %s", txn.tid, err_msg)
                except Exception as w_err:
                    logger.error("Wallet credit exception for TID %s: %s", txn.tid, w_err)

        elif eff_status in ("FAILED", "FAILURE"):
            txn.txn_status = "FAILED"
            txn.provider_status = "FAILED"
            txn.callback_status = "FAILED"

        await db.commit()

        return {
            "tid": txn.tid,
            "status": txn.txn_status,
            "card_network": txn.card_network,
            "pay_mode_ref_id": txn.pay_mode_ref_id,
            "mdr_pct": float(txn.mdr_pct or 0.0),
            "mdr_amount": float(txn.mdr_amount or 0.0),
            "tax_amount": float(txn.tax_amount or 0.0),
            "total_charges": float(txn.total_charges or 0.0),
            "customer_payable": float(txn.customer_payable or 0.0),
            "retailer_credit": float(txn.retailer_credit or 0.0),
            "ledger_txn_id": txn.ledger_txn_id
        }

    @classmethod
    async def process_bankme_webhook(
        cls,
        db: AsyncSession,
        payload: BankMeWebhookPayload,
        headers: Optional[Dict[str, str]] = None,
        raw_body: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Authoritative Inbound Webhook / Callback Handler for BankMe (SMSPay).
        Enforces:
        - Signature verification (HMAC-SHA256 of timestamp + "." + body)
        - TID & Company Ref ID isolation (company_ref_id == 2)
        - Callback idempotency
        - Atomic row locking on payin_transactions
        - Single authoritative wallet credit via WalletBalanceAdjustmentService on SUCCESS.
        """
        tid = payload.tid or payload.referenceId or payload.reference_id or payload.merchant_tid
        if not tid:
            logger.warning("BankMe webhook received with no TID or reference_id: %s", payload)
            return {"status": "REJECTED", "message": "Missing TID"}

        # 1. Verify Adapter Webhook Signature
        adapter = BankMePayInAdapter()
        if not adapter.verify_webhook(payload.model_dump(), payload.signature, headers, raw_body=raw_body):
            logger.error("BankMe webhook signature verification failed for TID: %s", tid)
            return {"status": "REJECTED", "message": "Invalid signature"}

        # 2. Lock PayIn Transaction row
        stmt = select(PayinTransactionModel).where(
            PayinTransactionModel.tid == tid
        ).with_for_update()
        res = await db.execute(stmt)
        txn = res.scalars().first()

        if not txn:
            logger.error("BankMe webhook TID '%s' not found in payin_transactions.", tid)
            return {"status": "NOT_FOUND", "message": f"TID {tid} not found"}

        # 3. Verify SMSPay Company Ownership (Strict isolation)
        if txn.company_ref_id != SMSPAY_COMPANY_REF_ID:
            logger.critical("SECURITY VIOLATION: BankMe webhook received for non-SMSPay company_ref_id=%s (TID=%s)", txn.company_ref_id, tid)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Violation: BankMe callbacks are strictly restricted to SMSPay."
            )

        # 4. Check Duplicate Callback / Terminal Status Idempotency
        if txn.txn_status in ("SUCCESS", "SETTLED"):
            logger.info("BankMe webhook duplicate received for already SUCCESS transaction: %s", tid)
            # Log callback audit
            cb_log = PayinCallbackLogModel(
                tid=tid,
                company_ref_id=txn.company_ref_id,
                user_type_ref_id=txn.user_type_ref_id,
                user_ref_id=txn.user_ref_id or txn.retailer_ref_id,
                payin_vendor_ref_id=txn.payin_vendor_ref_id,
                provider_ref_id=payload.bankme_ref or payload.utr,
                callback_event_id=payload.event,
                callback_status=str(payload.status or "SUCCESS"),
                signature_valid=True,
                payload=payload.model_dump(),
                process_status="IGNORED_ALREADY_SUCCESS"
            )
            db.add(cb_log)
            await db.commit()
            return {
                "status": "ALREADY_PROCESSED",
                "tid": tid,
                "txn_status": "SUCCESS",
                "message": "Duplicate webhook safely ignored (already final)"
            }

        # 5. Record Inbound Callback Log
        cb_log = PayinCallbackLogModel(
            tid=tid,
            company_ref_id=txn.company_ref_id,
            user_type_ref_id=txn.user_type_ref_id,
            user_ref_id=txn.user_ref_id or txn.retailer_ref_id,
            payin_vendor_ref_id=txn.payin_vendor_ref_id,
            provider_ref_id=payload.bankme_ref or payload.utr,
            callback_event_id=payload.event,
            callback_status=str(payload.status or "SUCCESS"),
            signature_valid=True,
            payload=payload.model_dump(),
            process_status="PROCESSING"
        )
        db.add(cb_log)
        await db.flush()

        # Also record in payin_api_logs for unified API audit trail
        try:
            await record_payin_api_audit_log(
                tid=tid,
                company_ref_id=txn.company_ref_id,
                retailer_ref_id=txn.retailer_ref_id,
                vendor_ref_id=txn.payin_vendor_ref_id,
                vendor_name="BANKME",
                api_type="WEBHOOK",
                endpoint="/api/v1/payin/webhook/bankme",
                http_method="POST",
                req_headers=headers or {},
                req_payload=payload.model_dump(),
                res_status_code=200,
                res_payload={"status": "PROCESSING"},
                execution_duration_ms=0.0,
                vendor_order_id=payload.orderId or payload.bankme_ref or txn.provider_ref_id,
                vendor_reference_id=tid,
                vendor_status=str(payload.status or "SUCCESS").upper(),
                environment="sandbox",
                user_type_ref_id=txn.user_type_ref_id,
                user_ref_id=txn.user_ref_id or txn.retailer_ref_id
            )
        except Exception as api_log_err:
            logger.warning("Failed to record webhook in payin_api_logs: %s", api_log_err)

        # 6. Authoritative Reconciliation, Dynamic MDR Recalculation, and Wallet Credit
        recon_res = await cls.reconcile_and_finalize_transaction(
            db=db,
            txn=txn,
            raw_gateway_payload=payload.model_dump(),
            provider_status=payload.status or "SUCCESS",
            provider_ref_id=payload.bankme_ref or payload.utr,
            source="BANKME_WEBHOOK"
        )
        if recon_res["status"] == "SUCCESS":
            cb_log.process_status = "COMPLETED"
        else:
            cb_log.process_status = "PAYMENT_FAILED"
            txn.failure_reason = payload.event or "Payment failed at provider"

        await db.commit()

        # 8. Automated Multi-Channel Retailer Notifications (WhatsApp & Email)
        if txn.txn_status == "SUCCESS":
            try:
                await cls.dispatch_payin_success_notifications(
                    db=db,
                    txn=txn,
                    ret_obj=ret_obj
                )
            except Exception as notif_err:
                logger.error("Failed to dispatch PayIn success notifications for TID %s: %s", tid, notif_err)

        return {
            "status": "PROCESSED",
            "tid": tid,
            "txn_status": txn.txn_status,
            "message": "Webhook processed successfully"
        }

    @classmethod
    async def dispatch_payin_success_notifications(
        cls,
        db: AsyncSession,
        txn: PayinTransactionModel,
        ret_obj: Optional[RetailerModel] = None
    ) -> Dict[str, Any]:
        """
        Dispatches automated WhatsApp message and confirmation Email to retailer
        upon successful PayIn wallet top-up payment.
        Uses approved WhatsApp template: payin_wallet_topup_notification (2039975033358041)
        and sends official receipt verification link: https://receipt.sathus.in/r/{tid}
        """
        from app.infrastructure.db.models import RetailerContactModel
        from app.infrastructure.adapters.whatsapp_service import whatsapp_service
        from app.infrastructure.adapters.global_notification_platform_client import global_notification_platform_client

        tid = txn.tid
        # 1. Resolve Contact Info
        target_name = txn.cust_name or (ret_obj.owner_name if ret_obj else None) or (ret_obj.store_name if ret_obj else "Retailer Partner")
        target_mobile = txn.cust_mobile
        target_email = txn.cust_email

        if ret_obj and (not target_mobile or not target_email):
            try:
                c_stmt = select(RetailerContactModel).where(RetailerContactModel.retailer_id == ret_obj.public_id)
                contact = (await db.execute(c_stmt)).scalars().first()
                if contact:
                    if not target_mobile:
                        target_mobile = contact.mobile or contact.alternate_mobile
                    if not target_email:
                        target_email = contact.email or contact.support_email
            except Exception as c_err:
                logger.warning("RetailerContactModel lookup error for TID %s: %s", tid, c_err)

        # 2. Company branding determination
        company_code = "SMSPAY" if txn.company_ref_id == 2 else ("PAY2PAY" if txn.company_ref_id == 47 else "NEAR4YOU")
        company_name = (
            "INSPEL TECHNOLOGIES SOLUTIONS PVT"
            if txn.company_ref_id == 2
            else ("SUPER REX PRODUCTS PRIVATE LIMITED" if txn.company_ref_id == 47 else "SATHUS TECHNOLOGY PRIVATE LIMITED")
        )

        # 3. Format Date
        created_dt = txn.completed_at or txn.created_at
        date_str = created_dt.strftime("%d-%b-%Y %I:%M %p") if created_dt else datetime.now().strftime("%d-%b-%Y %I:%M %p")

        # Resolve short code for WhatsApp and Email notifications
        from app.application.receipt_short_link_service import ReceiptShortLinkService
        short_code = getattr(txn, "receipt_short_code", None)
        if not short_code:
            short_code = await ReceiptShortLinkService.generate_or_get_short_code(
                db=db,
                tid=tid,
                company_ref_id=txn.company_ref_id,
                user_type_ref_id=txn.user_type_ref_id,
                user_ref_id=txn.user_ref_id,
                payin_txn_id=txn.payin_transactions_ref_id
            )

        results = {}

        # 4. Dispatch WhatsApp with Bitly-style short URL token
        if target_mobile:
            try:
                wa_res = await whatsapp_service.send_payin_wallet_topup_notification(
                    mobile_number=target_mobile,
                    retailer_name=target_name,
                    transaction_id=tid,
                    amount=float(txn.txn_amount),
                    date_time_str=date_str,
                    payment_mode=txn.card_network or "CARD",
                    status="SUCCESS",
                    receipt_token=short_code,
                    company_name=company_name,
                    company_context=company_code
                )
                results["whatsapp"] = wa_res
                logger.info("PayIn WhatsApp notification dispatched for TID %s to %s: %s", tid, target_mobile, wa_res.get("status"))
            except Exception as wa_err:
                logger.error("PayIn WhatsApp dispatch error for TID %s: %s", tid, wa_err)
                results["whatsapp"] = {"status": "ERROR", "detail": str(wa_err)}
        else:
            logger.warning("PayIn WhatsApp notification skipped: No mobile number for TID %s", tid)
            results["whatsapp"] = {"status": "SKIPPED", "detail": "No phone number available"}

        # 5. Dispatch Email with Bitly-style short URL token
        if target_email:
            try:
                email_res = await global_notification_platform_client.send_payin_wallet_topup_email(
                    recipient_email=target_email,
                    recipient_name=target_name,
                    transaction_id=tid,
                    amount=float(txn.txn_amount),
                    net_credit=float(txn.retailer_credit or txn.txn_amount),
                    payment_mode=txn.card_network or "CARD",
                    payment_date=date_str,
                    status="SUCCESS",
                    receipt_token=short_code,
                    company_context=company_code
                )
                results["email"] = email_res
                logger.info("PayIn Email notification dispatched for TID %s to %s: %s", tid, target_email, email_res.get("status"))
            except Exception as email_err:
                logger.error("PayIn Email dispatch error for TID %s: %s", tid, email_err)
                results["email"] = {"status": "ERROR", "detail": str(email_err)}
        else:
            logger.info("PayIn Email notification skipped: No email address for TID %s", tid)
            results["email"] = {"status": "SKIPPED", "detail": "No email address available"}

        return results

    @classmethod
    async def get_transaction_status(
        cls,
        db: AsyncSession,
        tid: str,
        auth_context: Dict[str, Any]
    ) -> PayInStatusResponse:
        """
        Retrieves status of a PayIn transaction with strict multi-tenant authorization.
        """
        company_ref_id = auth_context.get("company_ref_id")
        user_role = auth_context.get("role", "RETAILER").upper()

        stmt = select(PayinTransactionModel).where(PayinTransactionModel.tid == tid)
        res = await db.execute(stmt)
        txn = res.scalars().first()

        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with TID '{tid}' not found."
            )

        # Enforce Company Isolation (Retailers and Admins cannot read other companies' txns)
        if company_ref_id is not None and txn.company_ref_id != int(company_ref_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Transaction belongs to a different company."
            )

        provider_name = "BANKME" if txn.company_ref_id == SMSPAY_COMPANY_REF_ID else "EXISTING"

        # Capture fields in local variables to avoid lazy load on expired instance after commit
        final_tid = txn.tid
        final_merchant_ref = txn.merchant_ref_id or ""
        final_provider_ref = txn.provider_ref_id
        final_status = txn.txn_status
        final_amount = float(txn.txn_amount)
        final_mdr_charge = float(txn.mdr_amount)
        final_gst_amount = float(txn.tax_amount)
        final_total_charges = float(txn.total_charges)
        final_customer_payable = float(txn.customer_payable)
        final_retailer_credit = float(txn.retailer_credit)
        final_card_network = txn.card_network
        final_mdr_treatment = txn.mdr_treatment
        final_customer_payable_policy = txn.customer_payable_policy
        final_ledger_txn_id = txn.ledger_txn_id
        final_created_at = txn.created_at.isoformat() if txn.created_at else None
        final_updated_at = txn.updated_at.isoformat() if txn.updated_at else None

        # If transaction is PENDING and belongs to BankMe, perform live status sync
        if txn.txn_status == "PENDING" and txn.company_ref_id == SMSPAY_COMPANY_REF_ID:
            try:
                live_check = await BankMePayInClient.check_order_status(
                    tid=txn.tid,
                    bankme_ref=txn.provider_ref_id,
                    company_ref_id=txn.company_ref_id,
                    retailer_ref_id=txn.retailer_ref_id
                )
                if live_check.get("success") and live_check.get("status") in ("SUCCESS", "FAILED"):
                    recon_res = await cls.reconcile_and_finalize_transaction(
                        db=db,
                        txn=txn,
                        raw_gateway_payload=live_check,
                        provider_status=live_check.get("status"),
                        provider_ref_id=live_check.get("utr"),
                        source="BANKME_STATUS_SYNC"
                    )
                    final_status = recon_res["status"]
                    final_mdr_charge = recon_res["mdr_amount"]
                    final_gst_amount = recon_res["tax_amount"]
                    final_total_charges = recon_res["total_charges"]
                    final_customer_payable = recon_res["customer_payable"]
                    final_retailer_credit = recon_res["retailer_credit"]
                    final_card_network = recon_res["card_network"]
                    final_ledger_txn_id = recon_res["ledger_txn_id"]
                    if live_check.get("utr"):
                        final_provider_ref = live_check.get("utr")
                    if final_status == "SUCCESS":
                        final_updated_at = datetime.now(timezone.utc).isoformat()
            except Exception as sync_err:
                logger.warning("Error performing live BankMe status check for TID %s: %s", tid, sync_err)

        # Mask provider for customer-facing roles
        caller_roles = auth_context.get("roles") or []
        primary_caller_role = caller_roles[0] if caller_roles else "RETAILER"
        masked_provider = GatewayMaskingService.get_masked_display_name(provider_name, role=primary_caller_role)

        return PayInStatusResponse(
            success=True,
            tid=final_tid,
            merchant_reference=final_merchant_ref,
            provider_reference=final_provider_ref,
            status=final_status,
            amount=final_amount,
            mdr_charge=final_mdr_charge,
            gst_amount=final_gst_amount,
            total_charges=final_total_charges,
            customer_payable=final_customer_payable,
            retailer_credit=final_retailer_credit,
            provider=masked_provider,
            card_network=final_card_network,
            mdr_treatment=final_mdr_treatment,
            customer_payable_policy=final_customer_payable_policy or ("WITH_MDR" if final_mdr_treatment == "COLLECT_ADDITIONALLY" else "WITHOUT_MDR"),
            policy_display_name="Customer Pays MDR Charges" if (final_customer_payable_policy == "WITH_MDR" or final_mdr_treatment == "COLLECT_ADDITIONALLY") else "Retailer Bears MDR Charges",
            ledger_txn_id=final_ledger_txn_id,
            created_at=final_created_at,
            updated_at=final_updated_at
        )

    # Alias for router compatibility
    get_payin_status = get_transaction_status

    @classmethod
    async def get_transaction_audit(
        cls,
        db: AsyncSession,
        tid: str,
        auth_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Retrieves complete request/response audit logs for a PayIn transaction.
        Enforces strict company data isolation.
        """
        company_ref_id = auth_context.get("company_ref_id")

        # 1. Verify transaction existence & ownership
        stmt = select(PayinTransactionModel).where(PayinTransactionModel.tid == tid)
        res = await db.execute(stmt)
        txn = res.scalars().first()

        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with TID '{tid}' not found."
            )

        if company_ref_id is not None and txn.company_ref_id != int(company_ref_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Transaction belongs to a different company."
            )

        # 2. Fetch all API audit logs for this TID
        log_stmt = select(PayinApiLogModel).where(
            PayinApiLogModel.tid == tid
        ).order_by(PayinApiLogModel.payin_api_log_ref_id.asc())
        log_res = await db.execute(log_stmt)
        logs = log_res.scalars().all()

        roles = auth_context.get("roles") or []
        primary_role = roles[0] if roles else "RETAILER"
        raw_pname = "BANKME" if txn.company_ref_id == SMSPAY_COMPANY_REF_ID else "EXISTING"
        masked_p = GatewayMaskingService.get_masked_display_name(raw_pname, role=primary_role)

        return {
            "success": True,
            "tid": txn.tid,
            "company_ref_id": txn.company_ref_id,
            "user_type_ref_id": txn.user_type_ref_id,
            "user_ref_id": txn.user_ref_id or txn.retailer_ref_id,
            "retailer_ref_id": txn.retailer_ref_id,
            "provider": masked_p,
            "provider_reference": txn.provider_ref_id,
            "status": txn.txn_status,
            "amount": float(txn.txn_amount),
            "customer_payable": float(txn.customer_payable),
            "retailer_credit": float(txn.retailer_credit),
            "ledger_txn_id": txn.ledger_txn_id,
            "logs_count": len(logs),
            "audit_trail": [
                {
                    "log_id": l.payin_api_log_ref_id,
                    "api_type": l.api_type,
                    "vendor_name": l.vendor_name,
                    "endpoint": l.endpoint,
                    "http_method": l.http_method,
                    "req_headers": l.req_headers,
                    "req_payload": l.req_payload,
                    "res_status_code": l.res_status_code,
                    "res_payload": l.res_payload,
                    "execution_duration_ms": float(l.execution_duration_ms) if l.execution_duration_ms else None,
                    "vendor_order_id": l.vendor_order_id,
                    "vendor_status": l.vendor_status,
                    "environment": l.environment,
                    "created_at": l.created_at.isoformat() if l.created_at else None
                }
                for l in logs
            ]
        }
