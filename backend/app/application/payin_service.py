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

from app.application.payin_dtos import (
    CommonPayInRequest, CommonPayInResponse, PayInStatusResponse,
    MdrPreviewRequest, MdrPreviewResponse, BankMeWebhookPayload
)
from app.application.payin_routing_service import PayInRoutingService, PayInProvider, SMSPAY_COMPANY_REF_ID
from app.application.payin_mdr_service import PayInMdrService
from app.application.payin_config_service import PayInConfigService
from app.application.bankme_payin_adapter import BankMePayInAdapter, ExistingPayInAdapter
from app.application.transaction_reference_service import TransactionReferenceService
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO
from app.infrastructure.db.payin_models import (
    PayinTransactionModel, PayinCallbackLogModel, PayinServiceTypeModel,
    PayinPaymentModeModel, PayinCardTypeModel, PayinVendorModel
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
        tenant_id: uuid.UUID,
        company_ref_id: Optional[int],
        vendor_code: str = "BANKME"
    ) -> str:
        """
        Generates Authoritative TID as the FIRST execution step.
        Uses vendor prefix dynamically (e.g. 'B' for BankMe, 'P' for Pay2Pay).
        Format: <VENDOR_FIRST_CHAR>PAY<DDMMYYHHMI><5_DIGIT_UNIQUE_NUMBER>
        """
        v_code = vendor_code or ("BANKME" if (company_ref_id is not None and int(company_ref_id) == SMSPAY_COMPANY_REF_ID) else "PAY2PAY")
        ref_vcode = "PAY2PAY" if v_code == "EXISTING" else v_code
        
        try:
            tid = await TransactionReferenceService.generate_unique_reference(
                db=db,
                tenant_id=tenant_id,
                vendor_code=ref_vcode
            )
            if tid:
                return tid
        except Exception as ex:
            logger.warning("TransactionReferenceService error (%s). Using fallback standard format.", ex)

        now_dt = datetime.now(timezone.utc).strftime("%d%m%y%H%M")
        if v_code == "EXISTING":
            v_prefix = "P"
        elif v_code:
            v_prefix = v_code[0].upper()
        else:
            v_prefix = "P"
        import random
        rand_num = random.randint(10000, 99999)
        candidate = f"{v_prefix}PAY{now_dt}{rand_num}"

        stmt = select(PayinTransactionModel).where(PayinTransactionModel.tid == candidate)
        res = await db.execute(stmt)
        if res.scalars().first():
            candidate = f"{v_prefix}PAY{now_dt}{random.randint(10000, 99999)}"
        return candidate

    @classmethod
    async def calculate_preview(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        preview_req: MdrPreviewRequest
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
            m_stmt = select(PayinPaymentModeModel.payin_payment_mode_ref_id).where(
                PayinPaymentModeModel.pay_mode_code == preview_req.payment_mode_code.strip().upper(),
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
            vendor_name=vendor.vendor_name
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
        # 1. Resolve & Validate Authenticated Context
        company_ref_id = auth_context.get("company_ref_id")
        tenant_id = auth_context.get("tenant_id") or DEFAULT_TENANT_ID
        retailer_ref_id = auth_context.get("retailer_ref_id")
        user_ref_id = auth_context.get("user_ref_id")

        if company_ref_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthenticated: company_ref_id not found in session context."
            )

        company_ref_id = int(company_ref_id)
        if retailer_ref_id is None:
            # Default or fallback to first retailer for this company
            r_stmt = select(RetailerModel.retailer_ref_id).where(
                RetailerModel.company_ref_id == company_ref_id
            ).limit(1)
            r_res = await db.execute(r_stmt)
            retailer_ref_id = r_res.scalar() or 1

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
            user_ref_id=user_ref_id,
            retailer_ref_id=retailer_ref_id,
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
            txn_status="INITIATED",
            callback_status="PENDING",
            idempotency_key=idempotency_key,
            request_ref=request_dto.model_dump(),
            initiated_at=now_utc
        )
        db.add(payin_txn)
        await db.flush()

        # 8. Route to Provider Adapter exclusively by Company Ref ID
        provider = PayInRoutingService.resolve_provider(company_ref_id)
        if provider == PayInProvider.BANKME:
            adapter = BankMePayInAdapter()
            provider_code = "BANKME"
        else:
            adapter = ExistingPayInAdapter()
            provider_code = "EXISTING"

        # 9. Invoke Provider Adapter
        provider_resp = await adapter.initiate_payin(
            tid=tid,
            amount=calc["customer_payable"],
            customer_name=request_dto.customer_name,
            customer_mobile=request_dto.customer_mobile,
            customer_email=request_dto.customer_email,
            reference_id=request_dto.reference_id,
            callback_url=request_dto.callback_url or vendor.callback_url,
            payment_mode=mode_code,
            note=request_dto.note
        )

        # 10. Update PayIn Transaction with Provider Details
        is_success = provider_resp.get("success", False)
        new_status = "PENDING" if is_success else "FAILED"
        payin_txn.txn_status = new_status
        payin_txn.provider_status = provider_resp.get("status", "PENDING")
        payin_txn.provider_ref_id = provider_resp.get("bankme_ref") or provider_resp.get("provider_reference")
        payin_txn.response_ref = provider_resp
        if not is_success:
            payin_txn.failure_reason = provider_resp.get("message", "Provider initiation failed")

        await db.commit()

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
            provider=provider_code,
            payment_url=provider_resp.get("payment_url"),
            qr_string=provider_resp.get("qr_string"),
            qr_code_url=provider_resp.get("qr_code_url"),
            expires_at=provider_resp.get("expires_at"),
            message="PayIn initiated successfully" if is_success else provider_resp.get("message", "PayIn initiation failed")
        )

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

        # 6. Evaluate Provider Status
        provider_status = (payload.status or "SUCCESS").strip().upper()
        now_utc = datetime.now(timezone.utc)

        if provider_status == "SUCCESS":
            txn.txn_status = "SUCCESS"
            txn.provider_status = "SUCCESS"
            txn.provider_ref_id = payload.bankme_ref or payload.utr or txn.provider_ref_id
            txn.callback_status = "SUCCESS"
            txn.completed_at = now_utc

            # 7. Credit Retailer Wallet via Authoritative WalletBalanceAdjustmentService
            # (which executes public.wallet_balance_update stored procedure)
            try:
                # Resolve Retailer UUID directly from txn.retailer_ref_id
                ret_stmt = select(RetailerModel).where(
                    RetailerModel.retailer_ref_id == txn.retailer_ref_id,
                    RetailerModel.company_ref_id == txn.company_ref_id
                )
                ret_res = await db.execute(ret_stmt)
                ret_obj = ret_res.scalars().first()

                credit_amount = float(txn.retailer_credit)
                adj_dto = WalletAdjustmentDTO(
                    user_ref_id=txn.retailer_ref_id,
                    retailer_id=str(ret_obj.public_id) if ret_obj else None,
                    retailer_code=ret_obj.retailer_code if ret_obj else None,
                    company_ref_id=txn.company_ref_id,
                    user_type_ref_id=2,  # Retailer
                    entry_type="CREDIT",
                    amount=credit_amount,
                    payout_amount=credit_amount,
                    charge_amount=0.0,
                    gst_amount=0.0,
                    service_name="PAYIN_TOPUP",
                    wallet_type="MAIN",
                    user_type="RETAILER",
                    txn_id=tid,
                    ref_id=payload.utr or payload.bankme_ref or tid,
                    narration=f"PayIn Wallet Top-Up via BankMe (TID: {tid})"
                )

                adj_res = await WalletBalanceAdjustmentService.execute_wallet_balance_update(
                    db=db,
                    dto=adj_dto
                )

                if adj_res and adj_res.success:
                    txn.ledger_txn_id = adj_res.txn_id
                    cb_log.process_status = "COMPLETED"
                    logger.info("Successfully credited ₹%s to retailer_ref_id=%s via SP for TID=%s", credit_amount, txn.retailer_ref_id, tid)
                else:
                    err = adj_res.error_message if adj_res else "SP execution returned failure"
                    logger.error("Wallet SP credit failed for TID=%s: %s", tid, err)
                    cb_log.process_status = "WALLET_CREDIT_FAILED"
                    cb_log.error_msg = err

            except Exception as ex:
                logger.error("Error invoking wallet balance update SP for TID=%s: %s", tid, ex)
                cb_log.process_status = "WALLET_CREDIT_EXCEPTION"
                cb_log.error_msg = str(ex)

        else:
            txn.txn_status = "FAILED"
            txn.provider_status = provider_status
            txn.callback_status = "FAILED"
            txn.failure_reason = payload.event or "Payment failed at provider"
            cb_log.process_status = "PAYMENT_FAILED"

        await db.commit()
        return {
            "status": "PROCESSED",
            "tid": tid,
            "txn_status": txn.txn_status,
            "message": "Webhook processed successfully"
        }

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

        return PayInStatusResponse(
            success=True,
            tid=txn.tid,
            merchant_reference=txn.merchant_ref_id or "",
            provider_reference=txn.provider_ref_id,
            status=txn.txn_status,
            amount=float(txn.txn_amount),
            mdr_charge=float(txn.mdr_amount),
            gst_amount=float(txn.tax_amount),
            total_charges=float(txn.total_charges),
            customer_payable=float(txn.customer_payable),
            retailer_credit=float(txn.retailer_credit),
            provider=provider_name,
            ledger_txn_id=txn.ledger_txn_id,
            created_at=txn.created_at.isoformat() if txn.created_at else None,
            updated_at=txn.updated_at.isoformat() if txn.updated_at else None
        )

    # Alias for router compatibility
    get_payin_status = get_transaction_status
