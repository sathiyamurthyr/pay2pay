"""
Enterprise PayIn Application Orchestrator Service.
Implements the complete End-to-End PayIn Lifecycle with Append-Only Architecture:
1. Receive & Authenticate common PayIn request.
2. Resolve authenticated Company Ref ID strictly from server context.
3. Validate duplicate reference ID.
4. Generate TID FIRST via authoritative transaction generator before provider invocation.
5. Retrieve Company-specific MDR using Company Ref ID.
6. Route by Company Ref ID:
   - SMSPay (Ref ID 2) -> BankMe PayIn Adapter
   - Other Companies -> Existing PayIn Adapter
7. Invoke Provider API.
8. Persist authoritative record into 'transactions' table (status='PENDING').
   (Append-only architecture: Zero UPDATEs, compliant with trg_transactions_no_update trigger).
9. Process webhook callbacks:
   - Validate TID + Company Ref ID ownership
   - Idempotent state transitions
   - Automatic wallet credit via WalletBalanceAdjustmentService on SUCCESS.
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
    CommonPayInRequest, CommonPayInResponse, PayInStatusResponse, BankMeWebhookPayload
)
from app.application.payin_routing_service import PayInRoutingService, PayInProvider, SMSPAY_COMPANY_REF_ID
from app.application.payin_mdr_service import PayInMdrService
from app.application.bankme_payin_adapter import BankMePayInAdapter, ExistingPayInAdapter
from app.application.transaction_reference_service import TransactionReferenceService
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO
from app.infrastructure.db.transaction_engine_models import CentralTransactionModel, TransactionAuditLogModel
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
        company_ref_id: Optional[int]
    ) -> str:
        """
        Generates Authoritative TID as the FIRST execution step.
        Uses vendor prefix 'BANKME' for SMSPay (generates B<DDMMYYHHMI><5-DIGIT>)
        or 'PAY2PAY' for other companies (generates P<DDMMYYHHMI><5-DIGIT>).
        Ensures uniqueness in public.transactions.
        """
        vendor_code = "BANKME" if (company_ref_id is not None and int(company_ref_id) == SMSPAY_COMPANY_REF_ID) else "PAY2PAY"
        
        try:
            tid = await TransactionReferenceService.generate_unique_reference(
                db=db,
                tenant_id=tenant_id,
                vendor_code=vendor_code
            )
            if tid:
                return tid
        except Exception as ex:
            logger.warning("TransactionReferenceService error (%s). Falling back to standard TID format.", ex)

        # Fallback ensuring exact enterprise format: <VENDOR_FIRST_CHAR><DDMMYYHHMI><5-DIGIT-RANDOM>
        now_dt = datetime.now(timezone.utc).strftime("%d%m%y%H%M")
        v_prefix = "B" if vendor_code == "BANKME" else "P"
        import random
        rand_num = random.randint(10000, 99999)
        candidate = f"{v_prefix}{now_dt}{rand_num}"

        # Verify uniqueness in DB
        stmt = select(CentralTransactionModel).where(CentralTransactionModel.txn_id == candidate)
        res = await db.execute(stmt)
        if res.scalars().first():
            candidate = f"{v_prefix}{now_dt}{random.randint(10000, 99999)}"
        return candidate

    @classmethod
    async def initiate_payin(
        cls,
        db: AsyncSession,
        request_dto: CommonPayInRequest,
        auth_context: Dict[str, Any]
    ) -> CommonPayInResponse:
        """
        End-to-End PayIn Initiation Sequence (Steps 1 through 13).
        """
        # 1. Resolve & Validate Authenticated Context
        company_ref_id = auth_context.get("company_ref_id")
        company_id = auth_context.get("company_id") or DEFAULT_COMPANY_ID
        tenant_id = auth_context.get("tenant_id") or DEFAULT_TENANT_ID
        retailer_id = auth_context.get("retailer_id")
        retailer_ref_id = auth_context.get("retailer_ref_id")

        if isinstance(company_id, str):
            try:
                company_id = uuid.UUID(company_id)
            except Exception:
                company_id = DEFAULT_COMPANY_ID
        if isinstance(tenant_id, str):
            try:
                tenant_id = uuid.UUID(tenant_id)
            except Exception:
                tenant_id = DEFAULT_TENANT_ID
        if isinstance(retailer_id, str):
            try:
                retailer_id = uuid.UUID(retailer_id)
            except Exception:
                retailer_id = None

        # 2. Check for duplicate reference ID
        stmt_dup = select(CentralTransactionModel).where(
            CentralTransactionModel.ref_id == request_dto.reference_id,
            CentralTransactionModel.service_name == "PAYIN",
            CentralTransactionModel.status.in_(["INITIATED", "PENDING", "SUCCESS"])
        )
        res_dup = await db.execute(stmt_dup)
        existing_dup = res_dup.scalars().first()
        if existing_dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate PayIn request: reference_id '{request_dto.reference_id}' already exists (TID: {existing_dup.txn_id})."
            )

        # 3. Step 5: Generate Authoritative TID FIRST before provider transaction
        tid = await cls.generate_payin_tid(db, tenant_id, company_ref_id)

        # 4. Step 6: Retrieve Company-Specific MDR using Company Ref ID
        mdr_cfg = await PayInMdrService.get_mdr_for_company(db, company_ref_id)
        calc = PayInMdrService.calculate_charges(request_dto.amount, mdr_cfg)

        # 5. Step 8-10: Route to Provider exclusively by Company Ref ID
        provider = PayInRoutingService.resolve_provider(company_ref_id)
        if provider == PayInProvider.BANKME:
            adapter = BankMePayInAdapter()
            vendor_name = "BANKME"
        else:
            adapter = ExistingPayInAdapter()
            vendor_name = "EXISTING"

        # 6. Step 11: Invoke Provider API
        try:
            prov_resp = await adapter.initiate_payin(
                tid=tid,
                amount=request_dto.amount,
                customer_name=request_dto.customer_name,
                customer_mobile=request_dto.customer_mobile,
                customer_email=request_dto.customer_email,
                reference_id=request_dto.reference_id,
                callback_url=request_dto.callback_url,
                payment_mode=request_dto.payment_mode or "UPI",
                note=request_dto.note
            )
        except Exception as p_err:
            logger.error("Provider initiation failed for TID %s: %s", tid, p_err)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment gateway provider initiation error: {str(p_err)}"
            )

        provider_ref = prov_resp.get("bankme_ref") or prov_resp.get("provider_ref")
        now_utc = datetime.now(timezone.utc)

        # Read current balance snapshot for audit
        bal_snapshot = Decimal("0.00")
        if retailer_id:
            try:
                stmt_w = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == retailer_id)
                w_res = (await db.execute(stmt_w)).scalars().first()
                if w_res and w_res.wallet_balance is not None:
                    bal_snapshot = Decimal(str(w_res.wallet_balance))
            except Exception:
                pass

        # 7. Step 7 & 12: Persist in append-only transactions table with status 'PENDING'
        pending_txn = CentralTransactionModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=company_id,
            company_ref_id=company_ref_id,
            retailer_id=retailer_id,
            retailer_ref_id=retailer_ref_id,
            retailer_name=request_dto.customer_name,
            txn_id=tid,
            ref_id=request_dto.reference_id,
            service_name="PAYIN",
            wallet_type="MAIN",
            entry_type="CREDIT",
            amount=Decimal(str(request_dto.amount)),
            balance_before=bal_snapshot,
            balance_after=bal_snapshot,
            status="PENDING",
            narration=f"PayIn collection via {vendor_name} for order {request_dto.reference_id} (Ref: {provider_ref})",
            vendor_name=vendor_name,
            partition_year=now_utc.year,
            partition_month=now_utc.month,
            partition_day=now_utc.day,
            created_at=now_utc,
            updated_at=now_utc,
            is_active=True,
            is_deleted=False
        )
        db.add(pending_txn)

        # Also write audit log
        audit_log = TransactionAuditLogModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            transaction_reference=tid,
            action="PAYIN_INITIATED",
            previous_status=None,
            new_status="PENDING",
            actor_type="CLIENT_API",
            actor_id="CLIENT_API",
            details={
                "provider": vendor_name,
                "amount": request_dto.amount,
                "ref": provider_ref
            },
            created_at=now_utc
        )
        db.add(audit_log)
        await db.commit()

        # 8. Step 13: Return common existing API response format
        return CommonPayInResponse(
            success=True,
            status="PENDING",
            tid=tid,
            merchant_reference=request_dto.reference_id,
            provider_reference=provider_ref,
            amount=calc["amount"],
            mdr_charge=calc["mdr_charge"],
            gst_amount=calc["gst_amount"],
            net_amount=calc["net_amount"],
            provider=provider.value,
            payment_url=prov_resp.get("payment_url"),
            qr_string=prov_resp.get("qr_string"),
            qr_code_url=prov_resp.get("qr_code_url"),
            expires_at=prov_resp.get("expires_at"),
            message="PayIn collection initialized successfully. Awaiting customer payment."
        )

    @classmethod
    async def get_payin_status(
        cls,
        db: AsyncSession,
        tid: str,
        auth_context: Dict[str, Any]
    ) -> PayInStatusResponse:
        """
        Status inquiry endpoint with strict Company Data Isolation.
        Validates TID + Company Ref ID ownership.
        Fetches the latest entry from append-only transactions table.
        """
        stmt = select(CentralTransactionModel).where(
            CentralTransactionModel.txn_id == tid,
            CentralTransactionModel.service_name == "PAYIN"
        ).order_by(desc(CentralTransactionModel.transactions_ref_id)).limit(1)

        res = await db.execute(stmt)
        txn = res.scalars().first()

        if not txn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PayIn transaction '{tid}' not found."
            )

        # Cross-Company Access Guard
        user_company_ref = auth_context.get("company_ref_id")
        user_roles = [str(r).upper() for r in (auth_context.get("roles") or [])]
        is_platform_admin = any(r in ("ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN") for r in user_roles)

        if not is_platform_admin and user_company_ref is not None:
            if txn.company_ref_id is not None and int(txn.company_ref_id) != int(user_company_ref):
                logger.warning(
                    "SECURITY: Cross-company access attempt to TID %s (Owner: %s, Caller: %s)",
                    tid, txn.company_ref_id, user_company_ref
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not authorized to access transactions of another company."
                )

        # Calculate MDR info for display
        mdr_cfg = await PayInMdrService.get_mdr_for_company(db, txn.company_ref_id)
        calc = PayInMdrService.calculate_charges(float(txn.amount), mdr_cfg)

        return PayInStatusResponse(
            success=True,
            tid=txn.txn_id,
            merchant_reference=txn.ref_id or txn.txn_id,
            provider_reference=txn.vendor_name,
            status=txn.status,
            amount=float(txn.amount),
            mdr_charge=calc["mdr_charge"],
            gst_amount=calc["gst_amount"],
            net_amount=calc["net_amount"],
            provider=txn.vendor_name or "UNKNOWN",
            created_at=txn.created_at.isoformat() if txn.created_at else None,
            updated_at=txn.updated_at.isoformat() if txn.updated_at else None
        )

    @classmethod
    async def process_bankme_webhook(
        cls,
        db: AsyncSession,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Step 14-18: Webhook / Callback Processing.
        - Verifies callback authenticity.
        - Validates TID and ensures Company Ref ID == 2 (SMSPay).
        - Idempotently updates transaction status in append-only fashion.
        - Automatically credits retailer wallet upon SUCCESS.
        """
        adapter = BankMePayInAdapter()
        if not adapter.verify_webhook(payload, headers=headers):
            logger.warning("BankMe webhook signature validation failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Webhook signature verification failed."
            )

        tid = payload.get("merchant_tid") or payload.get("tid")
        if not tid:
            logger.error("BankMe webhook missing TID: %s", payload)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing TID in webhook payload."
            )

        # Retrieve latest transaction row
        stmt = select(CentralTransactionModel).where(
            CentralTransactionModel.txn_id == tid,
            CentralTransactionModel.service_name == "PAYIN"
        ).order_by(desc(CentralTransactionModel.transactions_ref_id)).limit(1)

        res = await db.execute(stmt)
        txn = res.scalars().first()
        if not txn:
            logger.error("BankMe webhook received for unknown TID: %s", tid)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PayIn transaction '{tid}' not found."
            )

        # Verify Company Ref ID Ownership (SMSPAY = 2)
        if txn.company_ref_id is not None and int(txn.company_ref_id) != SMSPAY_COMPANY_REF_ID:
            logger.error("SECURITY: BankMe callback received for non-SMSPay transaction: TID=%s, CompanyRef=%s", tid, txn.company_ref_id)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Transaction ownership mismatch for BankMe callback."
            )

        # Idempotency Guard: If already terminal, safely acknowledge
        if txn.status in ("SUCCESS", "FAILED"):
            logger.info("BankMe webhook duplicate received for TID %s (Already %s). Acknowledged.", tid, txn.status)
            return {
                "success": True,
                "status": txn.status,
                "tid": tid,
                "message": "Duplicate webhook safely ignored. Transaction already settled."
            }

        # Resolve status
        raw_status = str(payload.get("status") or "").upper().strip()
        is_success = raw_status in ("SUCCESS", "COMPLETED", "PAID")
        new_status = "SUCCESS" if is_success else "FAILED"
        provider_ref = payload.get("bankme_ref") or payload.get("order_id") or payload.get("utr")
        now_utc = datetime.now(timezone.utc)

        # Append new transaction entry marking SUCCESS or FAILED (Append-only pattern)
        # Note: If SUCCESS and retailer_id is present, wallet credit will record the authoritative row
        wallet_credited = False
        mdr_cfg = await PayInMdrService.get_mdr_for_company(db, txn.company_ref_id)
        calc = PayInMdrService.calculate_charges(float(txn.amount), mdr_cfg)

        if is_success and txn.retailer_id:
            try:
                adj_dto = WalletAdjustmentDTO(
                    user_id=str(txn.retailer_id),
                    retailer_id=str(txn.retailer_id),
                    entry_type="CREDIT",
                    amount=calc["net_amount"],
                    payout_amount=calc["amount"],
                    charge_amount=calc["mdr_charge"],
                    gst_amount=calc["gst_amount"],
                    service_name="PAYIN",
                    wallet_type="MAIN",
                    user_type="RETAILER",
                    txn_id=tid,
                    ref_id=provider_ref or txn.ref_id,
                    narration=f"PayIn collection credit for TID {tid} (Net ₹{calc['net_amount']:.2f}, Fee ₹{calc['mdr_charge']:.2f}, GST ₹{calc['gst_amount']:.2f})"
                )
                w_res = await WalletBalanceAdjustmentService.execute_wallet_balance_update(db=db, dto=adj_dto)
                if w_res.success:
                    wallet_credited = True
                    logger.info("Retailer wallet credited successfully for PayIn TID %s", tid)
                else:
                    logger.warning("WalletBalanceAdjustmentService warning on TID %s: %s", tid, w_res.error_message)
            except Exception as w_exc:
                logger.error("Failed to credit retailer wallet for PayIn TID %s: %s", tid, w_exc)

        # If wallet update didn't insert a success row (e.g. no retailer_id or test account),
        # append the status transition row into transactions table
        if not wallet_credited:
            success_txn = CentralTransactionModel(
                public_id=uuid.uuid4(),
                tenant_id=txn.tenant_id,
                company_id=txn.company_id,
                company_ref_id=txn.company_ref_id,
                retailer_id=txn.retailer_id,
                retailer_ref_id=txn.retailer_ref_id,
                retailer_name=txn.retailer_name,
                txn_id=tid,
                ref_id=txn.ref_id,
                service_name="PAYIN",
                wallet_type="MAIN",
                entry_type="CREDIT",
                amount=txn.amount,
                balance_before=txn.balance_before,
                balance_after=txn.balance_after,
                status=new_status,
                narration=f"PayIn {new_status} via BankMe (Ref: {provider_ref})",
                vendor_name="BANKME",
                partition_year=now_utc.year,
                partition_month=now_utc.month,
                partition_day=now_utc.day,
                created_at=now_utc,
                updated_at=now_utc,
                is_active=True,
                is_deleted=False
            )
            db.add(success_txn)

        # Audit log for webhook state transition
        audit_log = TransactionAuditLogModel(
            public_id=uuid.uuid4(),
            tenant_id=txn.tenant_id,
            transaction_reference=tid,
            action="PAYIN_WEBHOOK_PROCESSED",
            previous_status="PENDING",
            new_status=new_status,
            actor_type="BANKME_WEBHOOK",
            actor_id="BANKME_WEBHOOK",
            details={
                "provider": "BANKME",
                "status": new_status,
                "ref": provider_ref,
                "amount": float(txn.amount)
            },
            created_at=now_utc
        )
        db.add(audit_log)
        await db.commit()

        return {
            "success": True,
            "status": new_status,
            "tid": tid,
            "message": f"BankMe callback processed successfully. Status: {new_status}"
        }
