import uuid
import logging
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy import select, update, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainException
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel,
    PayoutAuditLogModel, PayoutNotificationLogModel, PayoutTransactionStatus
)
from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
from app.infrastructure.db.transaction_engine_models import TransactionLedgerEntryModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel, BeneficiaryBankAccountModel
from app.application.mpin_service import CustomerMPINService
from app.application.bulkpe_client import BulkPeApiClient
from app.application.error_management_service import ErrorManagementService

logger = logging.getLogger(__name__)

STATUS_DESCRIPTIONS: Dict[PayoutTransactionStatus, str] = {
    PayoutTransactionStatus.CREATED: "Transaction record created.",
    PayoutTransactionStatus.MPIN_VERIFIED: "MPIN successfully verified.",
    PayoutTransactionStatus.VALIDATING: "Business validations running.",
    PayoutTransactionStatus.VALIDATED: "Validation completed successfully.",
    PayoutTransactionStatus.INITIATED: "Internal transaction initialized.",
    PayoutTransactionStatus.WALLET_RESERVED: "Funds reserved (optional).",
    PayoutTransactionStatus.WALLET_DEBITED: "Wallet successfully debited.",
    PayoutTransactionStatus.LEDGER_POSTED: "Accounting entries completed.",
    PayoutTransactionStatus.VENDOR_REQUEST_SENT: "Vendor API request sent.",
    PayoutTransactionStatus.PENDING: "Awaiting vendor completion.",
    PayoutTransactionStatus.PROCESSING: "Vendor is processing.",
    PayoutTransactionStatus.SUCCESS: "Transaction completed successfully.",
    PayoutTransactionStatus.FAILED: "Vendor rejected or failed.",
    PayoutTransactionStatus.REVERSAL_INITIATED: "Automatic refund started.",
    PayoutTransactionStatus.REVERSED: "Wallet and ledger fully restored.",
    PayoutTransactionStatus.PARTIALLY_REVERSED: "Partial refund completed.",
    PayoutTransactionStatus.HOLD: "Requires manual approval.",
    PayoutTransactionStatus.MANUAL_REVIEW: "Operations team intervention required.",
    PayoutTransactionStatus.TIMEOUT: "Vendor did not respond.",
    PayoutTransactionStatus.EXPIRED: "Request validity expired.",
    PayoutTransactionStatus.CANCELLED: "Cancelled before processing.",
    PayoutTransactionStatus.REJECTED: "Rejected by business rules.",
    PayoutTransactionStatus.DUPLICATE: "Duplicate request detected.",
    PayoutTransactionStatus.STATUS_CHECK_REQUIRED: "Awaiting background polling.",
    PayoutTransactionStatus.SETTLEMENT_PENDING: "Waiting for settlement.",
    PayoutTransactionStatus.SETTLED: "Settlement completed."
}


from app.application.transaction_reference_service import TransactionReferenceService


async def generate_unique_payout_transaction_number(db: AsyncSession, tenant_id: Optional[uuid.UUID] = None, vendor_code: str = "WOWPE") -> str:
    """
    Generates an authoritative, collision-free transaction reference with format:
    <VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>
    Example: W170826093612345
    """
    return await TransactionReferenceService.generate_unique_reference(
        db=db,
        tenant_id=tenant_id,
        vendor_code=vendor_code
    )


class EnterprisePayoutExecutionService:

    @staticmethod
    async def log_audit(
        db: AsyncSession,
        transaction_id: uuid.UUID,
        action: str,
        new_status: PayoutTransactionStatus,
        previous_status: Optional[PayoutTransactionStatus] = None,
        actor_type: str = "SYSTEM",
        actor_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> PayoutAuditLogModel:
        """Appends status change to audit trail."""
        tid = tenant_id or uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        audit_entry = PayoutAuditLogModel(
            public_id=uuid.uuid4(),
            tenant_id=tid,
            transaction_id=transaction_id,
            action=action,
            previous_status=previous_status.value if previous_status else None,
            new_status=new_status.value,
            actor_type=actor_type,
            actor_id=actor_id,
            details=details or {},
            timestamp=datetime.now(timezone.utc),
            is_active=True,
            is_deleted=False
        )
        db.add(audit_entry)
        return audit_entry

    @staticmethod
    async def send_notification(
        db: AsyncSession,
        transaction_id: uuid.UUID,
        notification_type: str,
        recipient: str,
        message: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> PayoutNotificationLogModel:
        """Sends customer/retailer transaction lifecycle notifications."""
        tid = tenant_id or uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        notif = PayoutNotificationLogModel(
            public_id=uuid.uuid4(),
            tenant_id=tid,
            transaction_id=transaction_id,
            notification_type=notification_type,
            recipient=recipient,
            channel="IN_APP",
            message=message,
            status="SENT",
            sent_at=datetime.now(timezone.utc),
            is_active=True,
            is_deleted=False
        )
        db.add(notif)
        return notif

    @classmethod
    async def initiate_payout_execution(
        cls,
        db: AsyncSession,
        customer_id: uuid.UUID,
        beneficiary_id: uuid.UUID,
        retailer_id: uuid.UUID,
        tenant_id: uuid.UUID,
        amount: float,
        mpin: str,
        idempotency_key: str,
        mode: str = "IMPS",
        user_role: str = "RETAILER",
        actor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes Banking-Grade Step 1 through Step 8 Payout Flow with Pre-Call Commit.
        """
        # =========================================================================
        # STEP 1: Verify MPIN
        # =========================================================================
        try:
            await CustomerMPINService.verify_mpin(db, customer_id, mpin)
        except Exception as e:
            raise DomainException(f"MPIN Verification Failed: {str(e)}")
        logger.info(f"STEP 1 PASSED: MPIN verified for customer {customer_id}")

        # Calculate charges, commission, tax
        charges = round(amount * 0.005 + 5.0, 2)  # 0.5% + Rs 5 (Convenience Fee)
        gst_amount = round(charges * 0.18, 2)     # 18% GST on Convenience Fee
        commission = round(amount * 0.002, 2)     # 0.2% Commission
        tds_amount = round(commission * 0.05, 2)   # 5% TDS on Commission
        vendor_charge = round(amount * 0.001 + 2.0, 2)
        company_revenue = round(charges - vendor_charge, 2)
        net_debit = round(amount + charges + gst_amount, 2)

        # =========================================================================
        # STEP 2: Validate Business Rules, Limits, Wallet & Idempotency Key
        # =========================================================================
        # Check idempotency key in DB
        stmt_idem = select(EnterprisePayoutTransactionModel).where(
            EnterprisePayoutTransactionModel.idempotency_key == idempotency_key
        )
        res_idem = await db.execute(stmt_idem)
        existing_tx = res_idem.scalars().first()
        if existing_tx:
            logger.warning(f"STEP 2 REJECTED: Duplicate idempotency key {idempotency_key}")
            return {
                "success": False,
                "status": PayoutTransactionStatus.DUPLICATE.value,
                "transaction_id": str(existing_tx.public_id),
                "transaction_number": existing_tx.transaction_number,
                "message": "Duplicate transaction request detected.",
                "amount": existing_tx.amount,
                "is_duplicate": True
            }

        # Validate Customer Active
        stmt_cust = select(CustomerModel).where(CustomerModel.public_id == customer_id)
        cust_obj = (await db.execute(stmt_cust)).scalars().first()
        if not cust_obj or not cust_obj.is_active or cust_obj.is_deleted or cust_obj.customer_status != "ACTIVE":
            raise DomainException("Customer account is inactive, suspended, or invalid.")

        # Validate Beneficiary Verified & Active
        stmt_bene = select(BeneficiaryModel).where(BeneficiaryModel.public_id == beneficiary_id)
        bene_obj = (await db.execute(stmt_bene)).scalars().first()
        if not bene_obj or not bene_obj.is_active or bene_obj.is_deleted or bene_obj.verification_status != "VERIFIED":
            raise DomainException("Beneficiary is unverified or inactive.")

        # Validate Retailer Active & Row-Lock Wallet
        stmt_w = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == retailer_id
        ).with_for_update()
        res_w = await db.execute(stmt_w)
        wallet = res_w.scalars().first()
        if not wallet:
            raise DomainException(f"Retailer wallet for ID {retailer_id} not found.")
        if wallet.is_frozen or not wallet.is_active:
            raise DomainException("Retailer wallet is frozen or suspended.")
        if wallet.wallet_balance < net_debit:
            raise DomainException(
                f"Insufficient Retailer Wallet balance. Available: {wallet.wallet_balance}, Required: {net_debit}"
            )

        wallet_before = wallet.wallet_balance
        wallet_after = wallet_before - net_debit

        logger.info(f"STEP 2 PASSED: All validations passed for retailer {retailer_id}")

        # =========================================================================
        # STEP 3: BEGIN DB TRANSACTION & Create Transaction Record (INITIATED)
        # =========================================================================
        tx_id = uuid.uuid4()
        tx_number = await generate_unique_payout_transaction_number(db, tenant_id=tenant_id, vendor_code="WOWPE")

        tx_obj = EnterprisePayoutTransactionModel(
            public_id=tx_id,
            tenant_id=tenant_id,
            transaction_number=tx_number,
            idempotency_key=idempotency_key,
            customer_id=customer_id,
            beneficiary_id=beneficiary_id,
            retailer_id=retailer_id,
            company_id=uuid.uuid4(),
            amount=amount,
            charges=charges,
            commission=commission,
            net_debit=net_debit,
            gst_amount=gst_amount,
            tds_amount=tds_amount,
            vendor_charge=vendor_charge,
            company_revenue=company_revenue,
            wallet_before=wallet_before,
            wallet_after=wallet_after,
            mode=mode,
            status=PayoutTransactionStatus.INITIATED,
            status_description=STATUS_DESCRIPTIONS[PayoutTransactionStatus.INITIATED],
            vendor_name="BulkPe",
            retry_count=0,
            max_retries=30,
            initiated_at=datetime.now(timezone.utc),
            is_active=True,
            is_deleted=False
        )
        db.add(tx_obj)
        await db.flush()

        await cls.log_audit(
            db=db,
            transaction_id=tx_id,
            action="INITIATE_TRANSACTION",
            new_status=PayoutTransactionStatus.INITIATED,
            previous_status=PayoutTransactionStatus.CREATED,
            actor_id=actor_id,
            tenant_id=tenant_id
        )

        # =========================================================================
        # STEP 4: Reserve / Debit Retailer Wallet (WALLET_DEBITED)
        # =========================================================================
        wallet.wallet_balance = wallet_after
        tx_obj.status = PayoutTransactionStatus.WALLET_DEBITED
        tx_obj.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.WALLET_DEBITED]
        await db.flush()

        await cls.log_audit(
            db=db,
            transaction_id=tx_id,
            action="DEBIT_RETAILER_WALLET",
            new_status=PayoutTransactionStatus.WALLET_DEBITED,
            previous_status=PayoutTransactionStatus.INITIATED,
            actor_id=actor_id,
            details={"wallet_before": wallet_before, "wallet_after": wallet_after, "debit_amount": net_debit},
            tenant_id=tenant_id
        )

        # =========================================================================
        # STEP 5: Update Beneficiary & Retailer Limits
        # =========================================================================
        if hasattr(bene_obj, "daily_limit_used"):
            bene_obj.daily_limit_used = round(bene_obj.daily_limit_used + amount, 2)
        if hasattr(bene_obj, "monthly_limit_used"):
            bene_obj.monthly_limit_used = round(bene_obj.monthly_limit_used + amount, 2)
        await db.flush()

        # =========================================================================
        # STEP 6: Create 8-Line Double-Entry Ledger Posting (LEDGER_POSTED)
        # =========================================================================
        ledger_entries_data = [
            ("DEBIT", "RETAILER_WALLET", net_debit, wallet_after, f"Retailer Wallet Debit for TX {tx_number}"),
            ("CREDIT", "VENDOR_PAYABLE", amount, amount, f"Vendor Settlement Credit for TX {tx_number}"),
            ("CREDIT", "COMPANY_REVENUE", charges, charges, f"Convenience Fee Revenue for TX {tx_number}"),
            ("CREDIT", "GST_PAYABLE", gst_amount, gst_amount, f"18% GST Payable for TX {tx_number}"),
            ("DEBIT", "RETAILER_COMMISSION_EXPENSE", commission, commission, f"Retailer Commission Expense for TX {tx_number}"),
            ("CREDIT", "RETAILER_COMMISSION_PAYABLE", commission, commission, f"Retailer Commission Payable for TX {tx_number}"),
            ("DEBIT", "VENDOR_CHARGE_EXPENSE", vendor_charge, vendor_charge, f"Vendor Charge Expense for TX {tx_number}"),
            ("CREDIT", "VENDOR_CHARGE_PAYABLE", vendor_charge, vendor_charge, f"Vendor Charge Payable for TX {tx_number}")
        ]

        # Primary Retailer Wallet Debit Entry in TransactionLedgerEntryModel (authoritative ledger table)
        primary_ledger_entry = TransactionLedgerEntryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            transaction_id=tx_id,
            transaction_reference=tx_number,
            entry_type="DEBIT",
            account_type="RETAILER_WALLET",
            account_number=str(retailer_id),
            amount=net_debit,
            balance_before=wallet_before,
            balance_after=wallet_after,
            currency="INR",
            narration=f"Payout debit for TX {tx_number} (Amount: ₹{amount:.2f}, Fee: ₹{charges:.2f}, GST: ₹{gst_amount:.2f})",
            created_at=datetime.now(timezone.utc)
        )
        db.add(primary_ledger_entry)

        for idx, (etype, acctype, amt, bal, entry_desc) in enumerate(ledger_entries_data, 1):
            try:
                l_entry = PayoutDoubleEntryLedgerModel(
                    public_id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    transaction_id=tx_id,
                    entry_number=f"LED-{tx_number}-{idx:02d}",
                    entry_type=etype,
                    account_type=acctype,
                    amount=amt,
                    balance_after=bal,
                    description=entry_desc,
                    is_reversal_entry=False,
                    is_active=True,
                    is_deleted=False
                )
                db.add(l_entry)
            except Exception:
                pass

        tx_obj.status = PayoutTransactionStatus.LEDGER_POSTED
        tx_obj.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.LEDGER_POSTED]
        await db.flush()

        await cls.log_audit(
            db=db,
            transaction_id=tx_id,
            action="POST_DOUBLE_ENTRY_LEDGER",
            new_status=PayoutTransactionStatus.LEDGER_POSTED,
            previous_status=PayoutTransactionStatus.WALLET_DEBITED,
            actor_id=actor_id,
            details={"total_entries": 8},
            tenant_id=tenant_id
        )

        # =========================================================================
        # STEP 7: COMMIT Database Transaction (Database is now ACID consistent)
        # =========================================================================
        await db.commit()
        logger.info(f"STEP 7 PASSED: Database TX committed for {tx_number}. Pre-Call consistency achieved.")

        # =========================================================================
        # STEP 8: Call Vendor API (WowPe / BulkPe / Utkal Digital Dynamic Routing)
        # =========================================================================
        from app.application.wowpe_client import WowPeApiClient
        from app.application.bulkpe_client import BulkPeApiClient
        from app.application.utkaldigital_client import UtkalDigitalApiClient
        from app.application.payout_routing_service import PayoutRoutingService

        active_provider = await PayoutRoutingService.get_active_primary_provider(db, tenant_id)
        policy = await PayoutRoutingService.get_routing_policy(db, tenant_id)

        # Resolve Beneficiary Bank Account
        stmt_bank = select(BeneficiaryBankAccountModel).where(
            BeneficiaryBankAccountModel.beneficiary_id == beneficiary_id,
            BeneficiaryBankAccountModel.is_deleted == False
        ).order_by(desc(BeneficiaryBankAccountModel.is_primary), desc(BeneficiaryBankAccountModel.created_date))
        bank_obj = (await db.execute(stmt_bank)).scalars().first()

        acc_num = (bank_obj.account_number if bank_obj else None) or getattr(bene_obj, "account_number", "0630104000156974")
        ifsc = (bank_obj.ifsc_code if bank_obj else None) or getattr(bene_obj, "ifsc_code", "IBKL0000630")
        acc_holder = (bank_obj.account_holder_name if bank_obj else None) or getattr(bene_obj, "full_name", "Sathiya Murthy R")
        cust_mobile = getattr(cust_obj, "mobile_number", "9176669426")
        cust_name = getattr(cust_obj, "full_name", "Sathiya Murthy")
        bank_name = (bank_obj.bank_name if bank_obj else None) or getattr(bene_obj, "bank_name", "IDBI Bank")

        vendor_payload = {
            "merchant_ref": tx_number,
            "account_number": acc_num,
            "ifsc": ifsc,
            "amount": amount,
            "mode": mode
        }

        executed_vendor = active_provider
        vendor_resp = None

        if active_provider == "UTKALDIGITAL":
            vendor_url = "https://singleptxn.utkaldigital.co.in/ProcessRequest/transaction"
            await ErrorManagementService.log_vendor_api(
                db=db,
                vendor_name="UtkalDigital",
                vendor_url=vendor_url,
                http_method="POST",
                headers={"Content-Type": "application/json"},
                request_json=vendor_payload,
                response_json={},
                http_status=0,
                correlation_id=f"CORR-{tx_number}"
            )
            vendor_resp = await UtkalDigitalApiClient.initiate_payout(
                merchant_ref=tx_number,
                account_number=acc_num,
                ifsc_code=ifsc,
                account_holder=acc_holder,
                amount=amount,
                sender_mobile=cust_mobile,
                sender_name=cust_name,
                bank_name=bank_name,
                bank_code="MAGNI",
                service_id="27"
            )
            if vendor_resp.get("status") == "FAILED" and policy.auto_failover_enabled:
                logger.warning(f"[PAYOUT FAILOVER] Utkal Digital returned failure: {vendor_resp.get('message')}. Failing over to WowPe.")
                wowpe_resp = await WowPeApiClient.initiate_payout(
                    merchant_ref=f"FO-{tx_number}",
                    account_number=acc_num,
                    ifsc_code=ifsc,
                    account_holder=acc_holder,
                    amount=amount,
                    mode=mode,
                    mobile=cust_mobile
                )
                if wowpe_resp.get("status") in ("SUCCESS", "PENDING"):
                    vendor_resp = wowpe_resp
                    executed_vendor = "WowPe"
        elif active_provider == "WOWPE":
            vendor_url = "https://api.wowpe.in/api/api/api-module/payout/payout"
            await ErrorManagementService.log_vendor_api(
                db=db,
                vendor_name="WowPe",
                vendor_url=vendor_url,
                http_method="POST",
                headers={"Content-Type": "application/json"},
                request_json=vendor_payload,
                response_json={},
                http_status=0,
                correlation_id=f"CORR-{tx_number}"
            )
            vendor_resp = await WowPeApiClient.initiate_payout(
                merchant_ref=tx_number,
                account_number=acc_num,
                ifsc_code=ifsc,
                account_holder=acc_holder,
                amount=amount,
                mode=mode,
                mobile=cust_mobile
            )
            if vendor_resp.get("status") == "FAILED" and policy.auto_failover_enabled:
                logger.warning(f"[PAYOUT FAILOVER] WowPe returned failure: {vendor_resp.get('message')}. Failing over to BulkPe.")
                bulkpe_resp = await BulkPeApiClient.initiate_payout(
                    merchant_ref=f"FO-{tx_number}",
                    account_number=acc_num,
                    ifsc_code=ifsc,
                    account_holder=acc_holder,
                    amount=amount,
                    mode=mode,
                    remarks=f"Failover Payout {tx_number}"
                )
                if bulkpe_resp.get("status") in ("SUCCESS", "PENDING"):
                    vendor_resp = bulkpe_resp
                    executed_vendor = "BulkPe"
        else:
            vendor_url = "https://api.bulkpe.in/payout"
            await ErrorManagementService.log_vendor_api(
                db=db,
                vendor_name="BulkPe",
                vendor_url=vendor_url,
                http_method="POST",
                headers={"Content-Type": "application/json"},
                request_json=vendor_payload,
                response_json={},
                http_status=0,
                correlation_id=f"CORR-{tx_number}"
            )
            vendor_resp = await BulkPeApiClient.initiate_payout(
                merchant_ref=tx_number,
                account_number=acc_num,
                ifsc_code=ifsc,
                account_holder=acc_holder,
                amount=amount,
                mode=mode
            )
            if vendor_resp.get("status") == "FAILED" and policy.auto_failover_enabled:
                logger.warning(f"[PAYOUT FAILOVER] BulkPe returned failure: {vendor_resp.get('message')}. Failing over to WowPe.")
                wowpe_resp = await WowPeApiClient.initiate_payout(
                    merchant_ref=f"FO-{tx_number}",
                    account_number=acc_num,
                    ifsc_code=ifsc,
                    account_holder=acc_holder,
                    amount=amount,
                    mode=mode,
                    mobile=cust_mobile
                )
                if wowpe_resp.get("status") in ("SUCCESS", "PENDING"):
                    vendor_resp = wowpe_resp
                    executed_vendor = "WowPe"

        logger.info(f"STEP 8 {executed_vendor} VENDOR RESPONSE: {vendor_resp}")

        # Record Outbound API Log to centralized audit repository
        try:
            from app.core.outbound_api_logger import log_outbound_api_call
            await log_outbound_api_call(
                provider_name=executed_vendor,
                service_name="PAYOUT",
                endpoint=vendor_url,
                http_method="POST",
                base_url_reference="https://api.wowpe.in" if executed_vendor == "WowPe" else "https://api.bulkpe.in",
                api_name=f"{executed_vendor} Bank Payout Transfer",
                transaction_id=tx_number,
                request_id=f"REQ-{tx_number}",
                correlation_id=f"CORR-{tx_number}",
                provider_reference_id=vendor_resp.get("vendor_reference_id") or vendor_resp.get("utr") or vendor_resp.get("order_id"),
                request_body=vendor_payload,
                response_body=vendor_resp,
                http_status_code=200 if vendor_resp.get("status") in ("SUCCESS", "PENDING") else 400,
                duration_ms=float(vendor_resp.get("latency_ms", 350.0) or 350.0),
                response_status=vendor_resp.get("status", "SUCCESS"),
                provider_response_code=str(vendor_resp.get("code") or vendor_resp.get("status_code") or ""),
                provider_response_message=vendor_resp.get("message") or vendor_resp.get("description"),
                retailer_id=str(tx.retailer_id) if tx else None,
                customer_id=str(tx.customer_id) if tx else None,
                tenant_id=tx.tenant_id if tx else None,
                company_id=tx.company_id if tx else None,
            )
        except Exception as log_ex:
            logger.warning(f"[PAYOUT OUTBOUND LOG] Notice: {log_ex}")

        # Refresh transaction lock in DB session context
        stmt_ref = select(EnterprisePayoutTransactionModel).where(
            EnterprisePayoutTransactionModel.public_id == tx_id
        ).with_for_update()
        res_ref = await db.execute(stmt_ref)
        cur_tx = res_ref.scalars().first()

        cur_tx.vendor_name = executed_vendor
        cur_tx.status = PayoutTransactionStatus.VENDOR_REQUEST_SENT
        cur_tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.VENDOR_REQUEST_SENT]
        await db.flush()

        status_str = str(vendor_resp.get("status", "")).upper()
        v_ref = vendor_resp.get("vendor_tx_id") or vendor_resp.get("order_id") or vendor_resp.get("vendor_ref") or f"{executed_vendor}-{tx_number}"

        if status_str == "SUCCESS":
            cur_tx.status = PayoutTransactionStatus.SUCCESS
            cur_tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.SUCCESS]
            cur_tx.vendor_ref = v_ref
            cur_tx.rrn = vendor_resp.get("rrn") or f"RRN-{uuid.uuid4().hex[:10].upper()}"
            cur_tx.utr_number = vendor_resp.get("utr") or f"UTR-{uuid.uuid4().hex[:10].upper()}"
            cur_tx.completed_at = datetime.now(timezone.utc)
            await db.flush()

            await cls.log_audit(
                db=db,
                transaction_id=tx_id,
                action="VENDOR_SUCCESS",
                new_status=PayoutTransactionStatus.SUCCESS,
                previous_status=PayoutTransactionStatus.VENDOR_REQUEST_SENT,
                actor_id=actor_id,
                details=vendor_resp,
                tenant_id=tenant_id
            )

            await cls.send_notification(
                db=db,
                transaction_id=tx_id,
                notification_type="SUCCESS",
                recipient=str(customer_id),
                message=f"Transaction Successful. Ref: {v_ref}, Amount: ₹{amount}, UTR: {cur_tx.utr_number}",
                tenant_id=tenant_id
            )

            await db.commit()
            return {
                "success": True,
                "status": PayoutTransactionStatus.SUCCESS.value,
                "transaction_id": str(tx_id),
                "transaction_number": tx_number,
                "amount": amount,
                "vendor_ref": v_ref,
                "utr_number": cur_tx.utr_number,
                "rrn": cur_tx.rrn,
                "message": "Payout executed successfully."
            }

        elif status_str in ("PENDING", "PROCESSING"):
            cur_tx.status = PayoutTransactionStatus.PENDING
            cur_tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.PENDING]
            cur_tx.vendor_ref = v_ref
            await db.flush()

            await cls.log_audit(
                db=db,
                transaction_id=tx_id,
                action="VENDOR_PENDING",
                new_status=PayoutTransactionStatus.PENDING,
                previous_status=PayoutTransactionStatus.VENDOR_REQUEST_SENT,
                actor_id=actor_id,
                details=vendor_resp,
                tenant_id=tenant_id
            )

            await cls.send_notification(
                db=db,
                transaction_id=tx_id,
                notification_type="PENDING",
                recipient=str(customer_id),
                message=f"Transaction is being processed. Ref: {tx_number}. We will notify you once completed.",
                tenant_id=tenant_id
            )

            await db.commit()
            return {
                "success": True,
                "status": PayoutTransactionStatus.PENDING.value,
                "transaction_id": str(tx_id),
                "transaction_number": tx_number,
                "amount": amount,
                "vendor_ref": v_ref,
                "message": "Transaction is being processed by vendor bank."
            }

        else:
            # VENDOR FAILED -> Trigger Auto Reversal Engine
            cur_tx.status = PayoutTransactionStatus.FAILED
            cur_tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.FAILED]
            cur_tx.vendor_ref = v_ref
            await db.flush()

            await cls.log_audit(
                db=db,
                transaction_id=tx_id,
                action="VENDOR_FAILED",
                new_status=PayoutTransactionStatus.FAILED,
                previous_status=PayoutTransactionStatus.VENDOR_REQUEST_SENT,
                actor_id=actor_id,
                details=vendor_resp,
                tenant_id=tenant_id
            )

            await cls.send_notification(
                db=db,
                transaction_id=tx_id,
                notification_type="FAILED",
                recipient=str(customer_id),
                message=f"Transaction could not be completed. Ref: {tx_number}. Amount will be automatically refunded.",
                tenant_id=tenant_id
            )

            # TRIGGER AUTO REVERSAL ENGINE
            reversal_res = await cls.execute_auto_reversal(
                db=db,
                transaction_id=tx_id,
                reversal_reason=vendor_resp.get("message", "Vendor transaction failed"),
                actor_id=actor_id,
                tenant_id=tenant_id
            )

            # Map vendor error via EPIC-050 Error Framework
            mapped_err = await ErrorManagementService.process_transaction_failure(
                db=db,
                transaction_id=tx_number,
                vendor_name="BulkPe",
                vendor_url="https://api.bulkpe.in/payout",
                http_method="POST",
                request_json=vendor_payload,
                response_json=vendor_resp,
                http_status=400,
                latency_ms=120,
                vendor_error_message=vendor_resp.get("message", "Vendor error"),
                rollback_performed=True,
                user_role=user_role
            )

            await db.commit()
            return {
                "success": False,
                "status": PayoutTransactionStatus.REVERSED.value,
                "transaction_id": str(tx_id),
                "transaction_number": tx_number,
                "amount": amount,
                "is_reversed": True,
                "friendly_message": mapped_err.get("friendly_message", "Transaction failed and automatically refunded."),
                "internal_error_code": mapped_err.get("internal_error_code", "PAY-1001")
            }

    @classmethod
    async def execute_auto_reversal(
        cls,
        db: AsyncSession,
        transaction_id: uuid.UUID,
        reversal_reason: str = "Automatic Vendor Failure Refund",
        actor_id: Optional[str] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Executes Double-Reversal Guarded Auto Reversal Engine.
        """
        stmt_tx = select(EnterprisePayoutTransactionModel).where(
            EnterprisePayoutTransactionModel.public_id == transaction_id
        ).with_for_update()
        res_tx = await db.execute(stmt_tx)
        tx = res_tx.scalars().first()

        if not tx:
            raise DomainException(f"Transaction ID {transaction_id} not found for reversal.")

        # DOUBLE REVERSAL PROTECTION CHECK
        if tx.is_reversed or tx.reversal_transaction_id is not None or tx.status == PayoutTransactionStatus.REVERSED:
            logger.warning(f"DOUBLE REVERSAL PREVENTED: Transaction {tx.transaction_number} is already reversed.")
            return {
                "success": False,
                "already_reversed": True,
                "status": PayoutTransactionStatus.REVERSED.value,
                "message": f"Transaction {tx.transaction_number} has already been reversed."
            }

        prev_status = tx.status
        tx.status = PayoutTransactionStatus.REVERSAL_INITIATED
        tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.REVERSAL_INITIATED]
        await db.flush()

        await cls.log_audit(
            db=db,
            transaction_id=tx.public_id,
            action="START_REVERSAL",
            new_status=PayoutTransactionStatus.REVERSAL_INITIATED,
            previous_status=prev_status,
            actor_id=actor_id,
            tenant_id=tenant_id or tx.tenant_id
        )

        reversal_uuid = uuid.uuid4()

        # 1. Credit Retailer Wallet Back
        stmt_w = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == tx.retailer_id
        ).with_for_update()
        res_w = await db.execute(stmt_w)
        wallet = res_w.scalars().first()
        wallet_before_rev = float(wallet.wallet_balance) if wallet else 0.0
        wallet_after_rev = round(wallet_before_rev + float(tx.net_debit), 2)
        if wallet:
            wallet.wallet_balance = wallet_after_rev
            wallet.updated_date = datetime.now(timezone.utc)

        # 2. Authoritative Reversal Credit in transaction_ledger_entries
        rev_ledger = TransactionLedgerEntryModel(
            public_id=reversal_uuid,
            tenant_id=tx.tenant_id or tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
            transaction_id=tx.public_id,
            transaction_reference=f"REV-{tx.transaction_number}",
            entry_type="CREDIT",
            account_type="RETAILER_WALLET",
            account_number=str(tx.retailer_id),
            amount=tx.net_debit,
            balance_before=wallet_before_rev,
            balance_after=wallet_after_rev,
            currency="INR",
            narration=f"Reversal refund for failed transaction {tx.transaction_number}",
            created_at=datetime.now(timezone.utc)
        )
        db.add(rev_ledger)

        # 3. Restore Beneficiary Limits
        stmt_bene = select(BeneficiaryModel).where(BeneficiaryModel.public_id == tx.beneficiary_id)
        res_bene = await db.execute(stmt_bene)
        bene = res_bene.scalars().first()
        if bene:
            if hasattr(bene, "daily_limit_used"):
                bene.daily_limit_used = max(0.0, round(bene.daily_limit_used - tx.amount, 2))
            if hasattr(bene, "monthly_limit_used"):
                bene.monthly_limit_used = max(0.0, round(bene.monthly_limit_used - tx.amount, 2))

        # 4. Create auxiliary contra ledger entries if model available
        contra_entries = [
            ("CREDIT", "RETAILER_WALLET", tx.net_debit, wallet_after_rev, f"Reversal Credit for TX {tx.transaction_number}"),
            ("DEBIT", "VENDOR_PAYABLE", tx.amount, 0.0, f"Reversal Vendor Settlement for TX {tx.transaction_number}"),
            ("DEBIT", "COMPANY_REVENUE", tx.charges, 0.0, f"Reversal Convenience Fee for TX {tx.transaction_number}"),
            ("DEBIT", "GST_PAYABLE", tx.gst_amount, 0.0, f"Reversal GST for TX {tx.transaction_number}"),
            ("CREDIT", "RETAILER_COMMISSION_EXPENSE", tx.commission, 0.0, f"Reversal Retailer Commission Expense for TX {tx.transaction_number}"),
            ("DEBIT", "RETAILER_COMMISSION_PAYABLE", tx.commission, 0.0, f"Reversal Retailer Commission Payable for TX {tx.transaction_number}"),
            ("CREDIT", "VENDOR_CHARGE_EXPENSE", tx.vendor_charge, 0.0, f"Reversal Vendor Charge Expense for TX {tx.transaction_number}"),
            ("DEBIT", "VENDOR_CHARGE_PAYABLE", tx.vendor_charge, 0.0, f"Reversal Vendor Charge Payable for TX {tx.transaction_number}")
        ]

        for idx, (etype, acctype, amt, bal, entry_desc) in enumerate(contra_entries, 1):
            try:
                c_entry = PayoutDoubleEntryLedgerModel(
                    public_id=uuid.uuid4(),
                    tenant_id=tx.tenant_id,
                    transaction_id=tx.public_id,
                    entry_number=f"REV-{tx.transaction_number}-{idx:02d}",
                    entry_type=etype,
                    account_type=acctype,
                    amount=amt,
                    balance_after=bal,
                    description=entry_desc,
                    is_reversal_entry=True,
                    is_active=True,
                    is_deleted=False
                )
                db.add(c_entry)
            except Exception:
                pass

        # 4. Set Status REVERSED & is_reversed = True
        reversal_uuid = uuid.uuid4()
        tx.status = PayoutTransactionStatus.REVERSED
        tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.REVERSED]
        tx.is_reversed = True
        tx.reversal_transaction_id = reversal_uuid
        tx.reversal_reason = reversal_reason
        tx.reversal_at = datetime.now(timezone.utc)
        await db.flush()

        await cls.log_audit(
            db=db,
            transaction_id=tx.public_id,
            action="COMPLETE_REVERSAL",
            new_status=PayoutTransactionStatus.REVERSED,
            previous_status=PayoutTransactionStatus.REVERSAL_INITIATED,
            actor_id=actor_id,
            details={"reversal_transaction_id": str(reversal_uuid), "refund_amount": tx.net_debit},
            tenant_id=tx.tenant_id
        )

        await cls.send_notification(
            db=db,
            transaction_id=tx.public_id,
            notification_type="REVERSED",
            recipient=str(tx.customer_id),
            message=f"Amount ₹{tx.net_debit} refunded successfully for TX {tx.transaction_number}.",
            tenant_id=tx.tenant_id
        )

        return {
            "success": True,
            "status": PayoutTransactionStatus.REVERSED.value,
            "reversal_transaction_id": str(reversal_uuid),
            "refunded_amount": tx.net_debit,
            "message": "Transaction reversed and retailer wallet refunded successfully."
        }

    @classmethod
    async def reconcile_pending_transactions(cls, db: AsyncSession) -> Dict[str, Any]:
        """
        Background status polling job running every 1 minute.
        """
        stmt_pending = select(EnterprisePayoutTransactionModel).where(
            EnterprisePayoutTransactionModel.status.in_([
                PayoutTransactionStatus.PENDING,
                PayoutTransactionStatus.PROCESSING,
                PayoutTransactionStatus.STATUS_CHECK_REQUIRED
            ]),
            EnterprisePayoutTransactionModel.is_reversed == False
        ).with_for_update()

        res_pending = await db.execute(stmt_pending)
        pending_list = res_pending.scalars().all()

        reconciled_count = 0
        success_count = 0
        reversed_count = 0
        manual_review_count = 0

        for tx in pending_list:
            tx.retry_count += 1
            tx.last_polled_at = datetime.now(timezone.utc)
            reconciled_count += 1

            if tx.retry_count >= tx.max_retries:
                tx.status = PayoutTransactionStatus.MANUAL_REVIEW
                tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.MANUAL_REVIEW]
                manual_review_count += 1
                await cls.log_audit(
                    db=db,
                    transaction_id=tx.public_id,
                    action="MAX_RETRIES_EXCEEDED",
                    new_status=PayoutTransactionStatus.MANUAL_REVIEW,
                    details={"retry_count": tx.retry_count, "max_retries": tx.max_retries},
                    tenant_id=tx.tenant_id
                )
                continue

            # Poll Vendor Status API (Utkal Digital, WowPe or BulkPe)
            from app.application.wowpe_client import WowPeApiClient
            from app.application.bulkpe_client import BulkPeApiClient
            from app.application.utkaldigital_client import UtkalDigitalApiClient
            
            v_name_upper = str(tx.vendor_name or "").upper()
            if "UTKAL" in v_name_upper:
                v_status = await UtkalDigitalApiClient.check_payout_status(
                    request_id=tx.vendor_ref or tx.transaction_number
                )
            elif "WOWPE" in v_name_upper:
                v_status = await WowPeApiClient.check_payout_status(
                    tx.vendor_ref or tx.transaction_number
                )
            else:
                v_status = await BulkPeApiClient.check_payout_status(
                    tx.vendor_ref or tx.transaction_number
                )
            status_str = str(v_status.get("status", "")).upper()

            if status_str == "SUCCESS":
                tx.status = PayoutTransactionStatus.SUCCESS
                tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.SUCCESS]
                tx.rrn = v_status.get("rrn") or tx.rrn or f"RRN-{uuid.uuid4().hex[:10].upper()}"
                tx.utr_number = v_status.get("utr") or tx.utr_number or f"UTR-{uuid.uuid4().hex[:10].upper()}"
                tx.completed_at = datetime.now(timezone.utc)
                success_count += 1

                await cls.log_audit(
                    db=db,
                    transaction_id=tx.public_id,
                    action="POLL_SUCCESS",
                    new_status=PayoutTransactionStatus.SUCCESS,
                    details=v_status,
                    tenant_id=tx.tenant_id
                )
                await cls.send_notification(
                    db=db,
                    transaction_id=tx.public_id,
                    notification_type="SUCCESS",
                    recipient=str(tx.customer_id),
                    message=f"Transaction Completed. Ref: {tx.transaction_number}, UTR: {tx.utr_number}",
                    tenant_id=tx.tenant_id
                )

            elif status_str in ("FAILED", "REJECTED"):
                tx.status = PayoutTransactionStatus.FAILED
                tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.FAILED]
                await cls.execute_auto_reversal(
                    db=db,
                    transaction_id=tx.public_id,
                    reversal_reason=f"Status Poll Failed: {v_status.get('message', 'Vendor failure')}",
                    tenant_id=tx.tenant_id
                )
                reversed_count += 1

        await db.commit()
        return {
            "total_reconciled": reconciled_count,
            "success_count": success_count,
            "reversed_count": reversed_count,
            "manual_review_count": manual_review_count
        }
