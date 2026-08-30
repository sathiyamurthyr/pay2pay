import uuid
import logging
import random
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional, List
from sqlalchemy import select, update, desc, asc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import DomainException
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel,
    PayoutAuditLogModel, PayoutNotificationLogModel, PayoutTransactionStatus
)
from app.infrastructure.db.models import RetailerModel, RetailerWalletModel, WalletLedgerModel, PayoutTransactionModel
from app.infrastructure.db.transaction_engine_models import TransactionLedgerEntryModel, CentralTransactionModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel, BeneficiaryBankAccountModel
from app.domain.date_keys import compute_transaction_date_and_partition_keys
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


async def generate_unique_payout_transaction_number(db: AsyncSession, tenant_id: Optional[uuid.UUID] = None, vendor_code: str = "UTKALDIGITAL") -> str:
    """
    Generates an authoritative, collision-free transaction reference via PostgreSQL SP:
    <VENDOR_FIRST_CHAR>PAY<DDMMYYHH24MI><5_DIGIT_SEQ>
    Example: UPAY290826220900044
    """
    from app.core.transaction_id_generator import generate_payout_txn_id_via_sp
    return await generate_payout_txn_id_via_sp(db, vendor_name=vendor_code)



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
        tid = tenant_id
        if not tid:
            raise DomainException("Tenant context is required.")
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
        tid = tenant_id
        if not tid:
            raise DomainException("Tenant context is required.")
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

    @staticmethod
    def _money(value: Any) -> Decimal:
        """Convert a financial value to Decimal with INR 2-decimal precision."""
        if value is None:
            return Decimal("0.00")
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def _calculate_charge(amount: Decimal, value: Any, charge_type: str) -> Decimal:
        """Calculate FIXED or PERCENTAGE configuration without floating point."""
        configured = EnterprisePayoutExecutionService._money(value)
        ctype = str(charge_type or "").upper()

        if configured < 0:
            raise DomainException("Payout pricing contains a negative charge.")

        if ctype == "FIXED":
            return configured
        if ctype in ("PERCENTAGE", "PERCENT"):
            return (amount * configured / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        raise DomainException(
            f"Unsupported payout charge type: {charge_type}. "
            "Expected FIXED or PERCENTAGE."
        )

    @classmethod
    async def resolve_company_id(
        cls,
        db: AsyncSession,
        retailer_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> uuid.UUID:
        """Resolve the real company from the retailer; never generate a company UUID."""
        stmt = select(RetailerModel).where(
            RetailerModel.public_id == retailer_id,
            RetailerModel.tenant_id == tenant_id,
            RetailerModel.is_deleted == False,
            RetailerModel.is_active == True,
        )
        retailer = (await db.execute(stmt)).scalars().first()
        if not retailer:
            raise DomainException("Active retailer was not found for the tenant.")

    @classmethod
    async def resolve_tenant_and_company(
        cls,
        db: AsyncSession,
        retailer_id: uuid.UUID,
    ) -> Dict[str, uuid.UUID]:
        """Resolve the real tenant and company from the retailer without fallback UUIDs."""
        stmt = select(RetailerModel).where(
            RetailerModel.public_id == retailer_id,
            RetailerModel.is_deleted == False,
            RetailerModel.is_active == True,
        )
        retailer = (await db.execute(stmt)).scalars().first()
        if not retailer:
            raise DomainException("Active retailer was not found.")

        tenant_id = retailer.tenant_id
        company_id = retailer.company_id

        if not tenant_id or not company_id:
            raise DomainException("Tenant or company mapping is missing for this retailer.")

        return {
            "tenant_id": tenant_id,
            "company_id": company_id,
            "tenant_ref_id": getattr(retailer, "tenant_ref_id", None) or 1,
            "company_ref_id": getattr(retailer, "company_ref_id", None) or 1,
            "retailer_ref_id": getattr(retailer, "retailer_ref_id", None) or 64,
            "retailer_name": getattr(retailer, "store_name", None) or getattr(retailer, "legal_name", None) or "Retailer",
            "retailer": retailer
        }

    @classmethod
    async def get_active_payout_slab(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        amount: Any,
        service_code: str = "PAYOUT",
    ) -> Dict[str, Any]:
        """
        Read the Admin-managed payout_slab configuration dynamically from database.
        """
        from app.infrastructure.db.payout_slab_model import PayoutSlabModel

        amount_d = cls._money(amount)
        now = datetime.now(timezone.utc)

        conditions = [
            PayoutSlabModel.tenant_id == tenant_id,
            PayoutSlabModel.company_id == company_id,
            PayoutSlabModel.service_code == service_code,
            PayoutSlabModel.min_amount <= amount_d,
            PayoutSlabModel.max_amount >= amount_d,
            PayoutSlabModel.is_active == True,
            PayoutSlabModel.is_deleted == False,
        ]

        stmt = select(PayoutSlabModel).where(*conditions)
        stmt = stmt.where(
            (PayoutSlabModel.effective_from.is_(None)) | (PayoutSlabModel.effective_from <= now)
        ).where(
            (PayoutSlabModel.effective_to.is_(None)) | (PayoutSlabModel.effective_to >= now)
        ).order_by(PayoutSlabModel.effective_from.desc())

        rows = (await db.execute(stmt)).scalars().all()

        if not rows:
            raise DomainException(
                "Payout pricing configuration is not available for this transaction amount."
            )

        if len(rows) > 1:
            raise DomainException(
                "Multiple active payout pricing configurations found."
            )

        row = rows[0]

        return {
            "_company_id": company_id,
            "id": row.public_id,
            "slab_name": row.slab_name,
            "commission": cls._money(row.commission),
            "commission_type": str(row.commission_type or "FIXED").upper(),
            "gst": cls._money(row.gst),
            "gst_type": str(row.gst_type or "PERCENTAGE").upper(),
            "vendor_charge": cls._money(row.vendor_charge),
            "vendor_charge_type": str(row.vendor_charge_type or "FIXED").upper(),
            "company_charges": cls._money(row.company_charges),
            "company_charges_type": str(row.company_charges_type or "FIXED").upper(),
            "company_gst": cls._money(row.company_gst),
            "company_gst_type": str(row.company_gst_type or "PERCENTAGE").upper(),
            "tds": cls._money(row.tds),
            "tds_type": str(row.tds_type or "PERCENTAGE").upper(),
            "other_charges": cls._money(row.other_charges),
            "other_charges_type": str(row.other_charges_type or "FIXED").upper(),
        }

    @classmethod
    async def initiate_payout_execution(
        cls,
        db: AsyncSession,
        customer_id: uuid.UUID,
        beneficiary_id: uuid.UUID,
        retailer_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID],
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

        # =====================================================================
        # RESOLVE TENANT & COMPANY FROM DATABASE
        # =====================================================================
        ret_ctx = await cls.resolve_tenant_and_company(db, retailer_id)
        resolved_tenant_id = ret_ctx["tenant_id"]
        resolved_company_id = ret_ctx["company_id"]

        # =====================================================================
        # PRICING: LOAD ACTIVE PAYOUT SLAB FROM DATABASE
        # =====================================================================
        amount_d = cls._money(amount)
        if amount_d <= Decimal("0.00"):
            raise DomainException("Payout amount must be greater than zero.")

        slab = await cls.get_active_payout_slab(
            db=db,
            tenant_id=resolved_tenant_id,
            company_id=resolved_company_id,
            amount=amount_d,
            service_code="PAYOUT",
        )

        commission_val = cls._calculate_charge(
            amount_d, slab["commission"], slab["commission_type"]
        )
        vendor_charge_val = cls._calculate_charge(
            amount_d, slab["vendor_charge"], slab["vendor_charge_type"]
        )
        company_charges_val = cls._calculate_charge(
            amount_d, slab["company_charges"], slab["company_charges_type"]
        )
        other_charges_val = cls._calculate_charge(
            amount_d, slab["other_charges"], slab["other_charges_type"]
        )

        # GST is calculated on configured charge base (Commission + Vendor Charge + Other Charges)
        gst_base = commission_val + vendor_charge_val + other_charges_val
        gst_amount = cls._calculate_charge(
            gst_base, slab["gst"], slab["gst_type"]
        )

        company_gst = cls._calculate_charge(
            company_charges_val, slab["company_gst"], slab["company_gst_type"]
        )
        tds_amount = cls._calculate_charge(
            commission_val, slab["tds"], slab["tds_type"]
        )

        total_fee = cls._money(commission_val + vendor_charge_val + company_charges_val + other_charges_val)
        total_tax = cls._money(gst_amount + company_gst + tds_amount)
        charges = cls._money(total_fee + total_tax)

        net_debit = cls._money(amount_d + charges)
        company_revenue = cls._money(commission_val + company_charges_val)

        pricing_snapshot = {
            "pricing_slab_id": str(slab["id"]),
            "slab_name": slab.get("slab_name"),
            "commission": float(commission_val),
            "commission_type": slab["commission_type"],
            "vendor_charge": float(vendor_charge_val),
            "vendor_charge_type": slab["vendor_charge_type"],
            "company_charges": float(company_charges_val),
            "company_charges_type": slab["company_charges_type"],
            "gst_rate": float(slab["gst"]),
            "gst_type": slab["gst_type"],
            "gst_amount": float(gst_amount),
            "company_gst_rate": float(slab["company_gst"]),
            "company_gst_amount": float(company_gst),
            "tds_rate": float(slab["tds"]),
            "tds_amount": float(tds_amount),
            "other_charges": float(other_charges_val),
            "total_fee": float(total_fee),
            "total_tax": float(total_tax),
            "total_charges": float(charges),
            "net_debit": float(net_debit)
        }

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

        # ── Advisory lock: serialize concurrent payouts per retailer ────────
        lock_key = retailer_id.int & 0x7FFFFFFFFFFFFFFF
        lock_result = await db.execute(
            text("SELECT pg_try_advisory_xact_lock(:key)"),
            {"key": lock_key}
        )
        if not lock_result.scalar():
            raise DomainException(
                "Another payout transaction is currently being processed for this retailer. "
                "Please retry in a moment."
            )
        logger.info(f"STEP 2: Advisory lock acquired for retailer {retailer_id}")

        # Validate Retailer Active & Row-Lock Wallet (secondary guard)
        stmt_w = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == retailer_id
        ).with_for_update()
        res_w = await db.execute(stmt_w)
        wallet = res_w.scalars().first()
        if not wallet:
            raise DomainException(f"Retailer wallet for ID {retailer_id} not found.")
        if wallet.is_frozen or not wallet.is_active:
            raise DomainException("Retailer wallet is frozen or suspended.")
        
        wallet_before = cls._money(wallet.wallet_balance)
        if wallet_before < net_debit:
            raise DomainException(
                f"Insufficient Retailer Wallet balance. Available: ₹{wallet_before:.2f}, Required: ₹{net_debit:.2f}"
            )

        wallet_after = cls._money(wallet_before - net_debit)

        logger.info(f"STEP 2 PASSED: All validations passed for retailer {retailer_id}")

        # =========================================================================
        # STEP 3: BEGIN DB TRANSACTION & Create Transaction Record (INITIATED)
        # =========================================================================
        from app.application.payout_routing_service import PayoutRoutingService
        active_provider = await PayoutRoutingService.get_active_primary_provider(db, resolved_tenant_id)

        tx_id = uuid.uuid4()
        tx_number = await generate_unique_payout_transaction_number(db, tenant_id=resolved_tenant_id, vendor_code=active_provider)

        tx_obj = EnterprisePayoutTransactionModel(
            public_id=tx_id,
            tenant_id=resolved_tenant_id,
            company_id=resolved_company_id,
            transaction_number=tx_number,
            idempotency_key=idempotency_key,
            customer_id=customer_id,
            beneficiary_id=beneficiary_id,
            retailer_id=retailer_id,
            amount=float(amount_d),
            charges=float(charges),
            commission=float(commission_val),
            net_debit=float(net_debit),
            gst_amount=float(gst_amount),
            tds_amount=float(tds_amount),
            vendor_charge=float(vendor_charge_val),
            company_charges=float(company_charges_val),
            company_gst=float(company_gst),
            other_charges=float(other_charges_val),
            company_revenue=float(company_revenue),
            pricing_slab_id=slab["id"],
            pricing_snapshot=pricing_snapshot,
            wallet_before=float(wallet_before),
            wallet_after=float(wallet_after),
            mode=mode,
            status=PayoutTransactionStatus.INITIATED,
            status_description=STATUS_DESCRIPTIONS[PayoutTransactionStatus.INITIATED],
            vendor_name=active_provider,
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
            tenant_id=resolved_tenant_id
        )

        # =========================================================================
        # STEP 4: Atomic Stored Procedure Wallet Debit (WALLET_DEBITED)
        # =========================================================================
        charge_ex_gst = max(Decimal("0.00"), Decimal(str(charges)) - Decimal(str(gst_amount)))
        wbu_res = await db.execute(text("""
            SELECT * FROM public.wallet_balance_update(
                p_tenant_id := :p_tenant_id,
                p_company_id := :p_company_id,
                p_retailer_id := :p_retailer_id,
                p_txn_id := :p_txn_id,
                p_ref_id := :p_ref_id,
                p_table_ref_id := :p_table_ref_id,
                p_entry_type := 'DEBIT',
                p_total_amount := :p_total_amount,
                p_payout_amount := :p_payout_amount,
                p_charge_amount := :p_charge_amount,
                p_gst_amount := :p_gst_amount,
                p_service_name := 'PAYOUT',
                p_wallet_type := 'MAIN',
                p_user_type := 'RETAILER',
                p_retailer_name := :p_retailer_name,
                p_vendor_name := :p_vendor_name,
                p_user_ref_id := :p_user_ref_id,
                p_user_type_ref_id := 2,
                p_tenant_ref_id := :p_tenant_ref_id,
                p_company_ref_id := :p_company_ref_id
            );
        """), {
            "p_tenant_id": resolved_tenant_id,
            "p_company_id": resolved_company_id,
            "p_retailer_id": retailer_id,
            "p_txn_id": tx_number,
            "p_ref_id": f"PAY-{tx_number}",
            "p_table_ref_id": tx_id,
            "p_total_amount": net_debit,
            "p_payout_amount": amount_d,
            "p_charge_amount": charge_ex_gst,
            "p_gst_amount": gst_amount,
            "p_retailer_name": ret_ctx.get("retailer_name", "Retailer"),
            "p_vendor_name": active_vendor or "UTKALDIGITAL",
            "p_user_ref_id": ret_ctx.get("retailer_ref_id", 24),
            "p_tenant_ref_id": ret_ctx.get("tenant_ref_id", 1),
            "p_company_ref_id": ret_ctx.get("company_ref_id", 1)
        })
        wbu_row = wbu_res.fetchone()
        if not wbu_row or not wbu_row[0]:
            err_msg = wbu_row[7] if wbu_row and len(wbu_row) > 7 else "Wallet debit failed"
            raise DomainException(str(err_msg))

        wallet_before = cls._money(wbu_row[2])
        wallet_after = cls._money(wbu_row[3])
        tx_obj.wallet_before = float(wallet_before)
        tx_obj.wallet_after = float(wallet_after)
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
            details={"wallet_before": float(wallet_before), "wallet_after": float(wallet_after), "debit_amount": float(net_debit)},
            tenant_id=resolved_tenant_id
        )

        # =========================================================================
        # STEP 5: Update Beneficiary & Retailer Limits
        # =========================================================================
        if hasattr(bene_obj, "daily_limit_used"):
            bene_obj.daily_limit_used = round(float(getattr(bene_obj, "daily_limit_used", 0.0)) + float(amount_d), 2)
        if hasattr(bene_obj, "monthly_limit_used"):
            bene_obj.monthly_limit_used = round(float(getattr(bene_obj, "monthly_limit_used", 0.0)) + float(amount_d), 2)
        await db.flush()

        # =========================================================================
        # STEP 6: Create 8-Line Double-Entry Ledger Posting (LEDGER_POSTED)
        # =========================================================================
        ledger_entries_data = [
            ("DEBIT", "RETAILER_WALLET", float(net_debit), float(wallet_after), f"Retailer Wallet Debit for TX {tx_number}"),
            ("CREDIT", "VENDOR_PAYABLE", float(amount_d), float(amount_d), f"Vendor Settlement Credit for TX {tx_number}"),
            ("CREDIT", "COMPANY_REVENUE", float(charges), float(charges), f"Convenience Fee Revenue for TX {tx_number}"),
            ("CREDIT", "GST_PAYABLE", float(gst_amount), float(gst_amount), f"GST Payable for TX {tx_number}"),
            ("DEBIT", "RETAILER_COMMISSION_EXPENSE", float(commission_val), float(commission_val), f"Retailer Commission Expense for TX {tx_number}"),
            ("CREDIT", "RETAILER_COMMISSION_PAYABLE", float(commission_val), float(commission_val), f"Retailer Commission Payable for TX {tx_number}"),
            ("DEBIT", "VENDOR_CHARGE_EXPENSE", float(vendor_charge_val), float(vendor_charge_val), f"Vendor Charge Expense for TX {tx_number}"),
            ("CREDIT", "VENDOR_CHARGE_PAYABLE", float(vendor_charge_val), float(vendor_charge_val), f"Vendor Charge Payable for TX {tx_number}")
        ]

        # Primary Retailer Wallet Debit Entry in TransactionLedgerEntryModel (authoritative ledger table)
        primary_ledger_entry = TransactionLedgerEntryModel(
            public_id=uuid.uuid4(),
            tenant_id=resolved_tenant_id,
            transaction_id=tx_id,
            transaction_reference=tx_number,
            entry_type="DEBIT",
            account_type="RETAILER_WALLET",
            account_number=str(retailer_id),
            amount=float(net_debit),
            balance_before=float(wallet_before),
            balance_after=float(wallet_after),
            currency="INR",
            narration=f"Payout debit for TX {tx_number} (Amount: ₹{amount_d:.2f}, Fee: ₹{total_fee:.2f}, Tax: ₹{total_tax:.2f})",
            created_at=datetime.now(timezone.utc)
        )
        db.add(primary_ledger_entry)

        # Primary Retailer Wallet Ledger Entry
        primary_wallet_ledger = WalletLedgerModel(
            public_id=uuid.uuid4(),
            tenant_id=resolved_tenant_id,
            retailer_id=retailer_id,
            transaction_type="PAYOUT_DEBIT",
            credit_amount=0.0,
            debit_amount=float(net_debit),
            balance_before=float(wallet_before),
            balance_after=float(wallet_after),
            reference_id=tx_number,
            is_active=True,
            is_deleted=False
        )
        db.add(primary_wallet_ledger)

        # Primary Payout Transaction entry for Payout Reports
        ptxn_record = PayoutTransactionModel(
            public_id=uuid.uuid4(),
            tenant_id=resolved_tenant_id,
            company_id=resolved_company_id,
            tenant_ref_id=ret_ctx.get("tenant_ref_id", 1),
            company_ref_id=ret_ctx.get("company_ref_id", 1),
            retailer_ref_id=ret_ctx.get("retailer_ref_id", 64),
            user_ref_id=ret_ctx.get("retailer_ref_id", 64),
            user_type_ref_id=2,
            user_type="RETAILER",
            retailer_id=retailer_id,
            customer_id=customer_id,
            customer_ref_id=getattr(cust_obj, "customer_ref_id", None),
            beneficiary_id=beneficiary_id,
            beneficiary_master_ref_id=getattr(bene_obj, "beneficiary_master_ref_id", None),
            transaction_number=tx_number,
            payout_id=tx_id,
            gateway_reference=tx_number,
            bank_reference=f"PAY-{tx_number}",
            utr_number="",
            rrn="",
            mode=mode,
            status="INITIATED",
            vendor_name=executed_vendor,
            created_date=now_dt,
            processed_time=now_dt,
            is_active=True,
            is_deleted=False
        )
        db.add(ptxn_record)

        for idx, (etype, acctype, amt, bal, entry_desc) in enumerate(ledger_entries_data, 1):
            try:
                l_entry = PayoutDoubleEntryLedgerModel(
                    public_id=uuid.uuid4(),
                    tenant_id=resolved_tenant_id,
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
            tenant_id=resolved_tenant_id
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

        acc_num = (bank_obj.account_number if bank_obj else None) or getattr(bene_obj, "account_number", None)
        ifsc = (bank_obj.ifsc_code if bank_obj else None) or getattr(bene_obj, "ifsc_code", None)
        acc_holder = (bank_obj.account_holder_name if bank_obj else None) or getattr(bene_obj, "full_name", None)
        cust_mobile = getattr(cust_obj, "mobile_number", None)
        cust_name = getattr(cust_obj, "full_name", None)
        bank_name = (bank_obj.bank_name if bank_obj else None) or getattr(bene_obj, "bank_name", None)

        if not acc_num or not ifsc or not acc_holder:
            raise DomainException("Beneficiary bank account details are unavailable.")
        if not cust_mobile or not cust_name:
            raise DomainException("Customer contact details are unavailable.")

        vendor_payload = {
            "merchant_ref": tx_number,
            "account_number": acc_num,
            "ifsc": ifsc,
            "amount": amount,
            "mode": mode
        }

        executed_vendor = active_provider
        vendor_resp = None

        from app.application.payout_vendor_adapter import PayoutVendorAdapterFactory, SimulatedVendorAdapter
        vendor_adapter = PayoutVendorAdapterFactory.get_adapter()

        # Check if environment is in Simulated Sandbox Mode
        if isinstance(vendor_adapter, SimulatedVendorAdapter) or settings.is_payout_simulation_active:
            vendor_url = f"https://sandbox.simulator.internal/payout/{active_provider.lower()}"
            logger.info(
                f"[VENDOR SANDBOX] Executing {active_provider} Payout in DEV Simulator Mode for Ref {tx_number} "
                f"(Simulation Active: {settings.is_payout_simulation_active}, Env: {settings.ENVIRONMENT})"
            )
            vendor_resp = await vendor_adapter.initiate_payout(
                vendor_name=active_provider,
                merchant_ref=tx_number,
                account_number=acc_num,
                ifsc_code=ifsc,
                account_holder=acc_holder,
                amount=amount,
                mode=mode,
                mobile=cust_mobile,
                bank_name=bank_name,
                sender_name=cust_name
            )
        elif active_provider == "UTKALDIGITAL":
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
                    vendor_url = "https://api.wowpe.in/api/api/api-module/payout/payout"
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
                    vendor_url = "https://api.bulkpe.in/payout"
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
                    vendor_url = "https://api.wowpe.in/api/api/api-module/payout/payout"

        logger.info(f"STEP 8 {executed_vendor} VENDOR RESPONSE: {vendor_resp}")

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

        # Record Outbound API Log to centralized audit repository
        try:
            from app.core.outbound_api_logger import log_outbound_api_call
            await log_outbound_api_call(
                provider_name=executed_vendor,
                service_name="PAYOUT",
                endpoint=vendor_url,
                http_method="POST",
                base_url_reference=("https://api.wowpe.in" if executed_vendor == "WowPe" else "https://singleptxn.utkaldigital.co.in" if executed_vendor == "UtkalDigital" else "https://api.bulkpe.in"),
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
                retailer_id=str(cur_tx.retailer_id) if cur_tx else None,
                customer_id=str(cur_tx.customer_id) if cur_tx else None,
                tenant_id=cur_tx.tenant_id if cur_tx else None,
                company_id=cur_tx.company_id if cur_tx else None,
            )
        except Exception as log_ex:
            logger.warning(f"[PAYOUT OUTBOUND LOG] Notice: {log_ex}")

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
                tenant_id=resolved_tenant_id
            )

            await cls.send_notification(
                db=db,
                transaction_id=tx_id,
                notification_type="SUCCESS",
                recipient=str(customer_id),
                message=f"Transaction Successful. Ref: {v_ref}, Amount: ₹{amount_d:.2f}, UTR: {cur_tx.utr_number}",
                tenant_id=resolved_tenant_id
            )

            await db.commit()
            return {
                "success": True,
                "status": PayoutTransactionStatus.SUCCESS.value,
                "transaction_id": str(tx_id),
                "transaction_number": tx_number,
                "amount": float(amount_d),
                "charges": float(charges),
                "commission": float(commission_val),
                "gst_amount": float(gst_amount),
                "net_debit": float(net_debit),
                "vendor_ref": v_ref,
                "utr_number": cur_tx.utr_number,
                "rrn": cur_tx.rrn,
                "message": "Txn Successfully Initiated"
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
                tenant_id=resolved_tenant_id
            )

            await cls.send_notification(
                db=db,
                transaction_id=tx_id,
                notification_type="PENDING",
                recipient=str(customer_id),
                message=f"Transaction is being processed. Ref: {tx_number}. We will notify you once completed.",
                tenant_id=resolved_tenant_id
            )

            await db.commit()
            return {
                "success": True,
                "status": PayoutTransactionStatus.PENDING.value,
                "transaction_id": str(tx_id),
                "transaction_number": tx_number,
                "amount": float(amount_d),
                "charges": float(charges),
                "commission": float(commission_val),
                "gst_amount": float(gst_amount),
                "net_debit": float(net_debit),
                "vendor_ref": v_ref,
                "message": "Txn Successfully Initiated"
            }

        elif status_str in ("FAILED", "REJECTED"):
            # DEFINITIVE VENDOR FAILURE -> AUTO REVERSAL
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
                tenant_id=resolved_tenant_id
            )

            await cls.send_notification(
                db=db,
                transaction_id=tx_id,
                notification_type="FAILED",
                recipient=str(customer_id),
                message=f"Transaction failed. Ref: {tx_number}. Amount will be automatically refunded.",
                tenant_id=resolved_tenant_id
            )

            await cls.execute_auto_reversal(
                db=db,
                transaction_id=tx_id,
                reversal_reason=vendor_resp.get("message", "Vendor transaction failed"),
                actor_id=actor_id,
                tenant_id=resolved_tenant_id
            )

            mapped_err = await ErrorManagementService.process_transaction_failure(
                db=db,
                transaction_id=tx_number,
                vendor_name=executed_vendor,
                vendor_url=vendor_url,
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

        else:
            # UNKNOWN / TECHNICAL ERROR:
            # Do NOT reverse and do NOT fail over here. The vendor may have
            # accepted the payout even if our client did not receive a clear
            # response. Keep it PENDING and let reconciliation determine the
            # final outcome.
            cur_tx.status = PayoutTransactionStatus.PENDING
            cur_tx.status_description = STATUS_DESCRIPTIONS[PayoutTransactionStatus.PENDING]
            cur_tx.vendor_ref = v_ref
            await db.flush()

            await cls.log_audit(
                db=db,
                transaction_id=tx_id,
                action="VENDOR_UNKNOWN_RESPONSE",
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
                message=f"Txn Successfully Initiated. Ref: {tx_number}. Status will be updated after bank confirmation.",
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
                "message": "Txn Successfully Initiated"
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

        # 1. Execute Atomic Stored Procedure Wallet Reversal (CREDIT)
        rev_charge_ex_gst = max(Decimal("0.00"), Decimal(str(tx.charges or 0.0)) - Decimal(str(tx.gst_amount or 0.0)))
        rev_wbu_res = await db.execute(text("""
            SELECT * FROM public.wallet_balance_update(
                p_tenant_id := :p_tenant_id,
                p_company_id := :p_company_id,
                p_retailer_id := :p_retailer_id,
                p_txn_id := :p_txn_id,
                p_ref_id := :p_ref_id,
                p_table_ref_id := :p_table_ref_id,
                p_entry_type := 'CREDIT',
                p_total_amount := :p_total_amount,
                p_payout_amount := :p_payout_amount,
                p_charge_amount := :p_charge_amount,
                p_gst_amount := :p_gst_amount,
                p_service_name := 'PAYOUT',
                p_wallet_type := 'MAIN',
                p_user_type := 'RETAILER',
                p_retailer_name := :p_retailer_name,
                p_vendor_name := :p_vendor_name,
                p_user_ref_id := :p_user_ref_id,
                p_user_type_ref_id := 2,
                p_tenant_ref_id := :p_tenant_ref_id,
                p_company_ref_id := :p_company_ref_id
            );
        """), {
            "p_tenant_id": tx.tenant_id or tenant_id,
            "p_company_id": tx.company_id,
            "p_retailer_id": tx.retailer_id,
            "p_txn_id": tx.transaction_number,
            "p_ref_id": f"REV-{tx.transaction_number}",
            "p_table_ref_id": tx.public_id,
            "p_total_amount": cls._money(tx.net_debit),
            "p_payout_amount": cls._money(tx.amount),
            "p_charge_amount": rev_charge_ex_gst,
            "p_gst_amount": cls._money(tx.gst_amount or 0.0),
            "p_retailer_name": "Retailer Partner",
            "p_vendor_name": tx.vendor_name or "UTKALDIGITAL",
            "p_user_ref_id": getattr(tx, "retailer_ref_id", None) or 24,
            "p_tenant_ref_id": getattr(tx, "tenant_ref_id", None) or 1,
            "p_company_ref_id": getattr(tx, "company_ref_id", None) or 1
        })
        rev_row = rev_wbu_res.fetchone()
        if not rev_row or not rev_row[0]:
            err_msg = rev_row[7] if rev_row and len(rev_row) > 7 else "Wallet reversal failed"
            if rev_row and rev_row[5] == "ALREADY_EXISTS":
                logger.info(f"Reversal for {tx.transaction_number} already completed in DB.")
                return {
                    "success": False,
                    "already_reversed": True,
                    "status": PayoutTransactionStatus.REVERSED.value,
                    "message": f"Transaction {tx.transaction_number} has already been reversed."
                }
            raise DomainException(str(err_msg))

        wallet_before_rev = cls._money(rev_row[2])
        wallet_after_rev = cls._money(rev_row[3])

        # 2. Authoritative Reversal Credit in transaction_ledger_entries
        rev_ledger = TransactionLedgerEntryModel(
            public_id=reversal_uuid,
            tenant_id=tx.tenant_id or tenant_id,
            transaction_id=tx.public_id,
            transaction_reference=tx.transaction_number,
            entry_type="CREDIT",
            account_type="RETAILER_WALLET",
            account_number=str(tx.retailer_id),
            amount=float(tx.net_debit),
            balance_before=float(wallet_before_rev),
            balance_after=float(wallet_after_rev),
            currency="INR",
            narration=f"Reversal refund for failed transaction {tx.transaction_number}",
            created_at=datetime.now(timezone.utc)
        )
        db.add(rev_ledger)

        # 2.1 Retailer Wallet Ledger Reversal Credit
        rev_wallet_ledger = WalletLedgerModel(
            public_id=uuid.uuid4(),
            tenant_id=tx.tenant_id or tenant_id,
            retailer_id=tx.retailer_id,
            transaction_type="PAYOUT_REVERSAL",
            credit_amount=float(tx.net_debit),
            debit_amount=0.0,
            balance_before=float(wallet_before_rev),
            balance_after=float(wallet_after_rev),
            reference_id=tx.transaction_number,
            is_active=True,
            is_deleted=False
        )
        db.add(rev_wallet_ledger)

        # Update PayoutTransactionModel status to REVERSED
        stmt_pt_rev = (
            update(PayoutTransactionModel)
            .where(PayoutTransactionModel.transaction_number == tx.transaction_number)
            .values(
                status="REVERSED",
                refund_status="REFUNDED",
                refund_type="AUTOMATIC_REVERSAL",
                updated_date=datetime.now(timezone.utc)
            )
        )
        await db.execute(stmt_pt_rev)

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
        ).with_for_update(skip_locked=True)

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

            # Poll Vendor Status API via Adapter
            from app.application.payout_vendor_adapter import PayoutVendorAdapterFactory
            vendor_adapter = PayoutVendorAdapterFactory.get_adapter()
            v_name_upper = str(tx.vendor_name or "UTKALDIGITAL").upper()

            v_status = await vendor_adapter.check_status(
                vendor_name=v_name_upper,
                reference_id=tx.vendor_ref or tx.transaction_number,
                merchant_ref=tx.transaction_number
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
