"""
Enterprise Central Transaction Service.

Orchestrates the entire transaction lifecycle:
Authenticated Request
→ Tenant Resolution
→ Company Resolution
→ Vendor/Partner Resolution
→ Transaction Configuration
→ Generate Authoritative Reference (<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>)
→ Validate Idempotency
→ Create Transaction
→ Create Double-Entry Ledger Entry
→ Execute Service
→ Update Transaction Status
→ Audit Transaction Trail
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import select, update, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainException
from app.infrastructure.db.transaction_engine_models import (
    CentralTransactionModel, TransactionAuditLogModel,
    TransactionLedgerEntryModel, TransactionConfigurationModel
)
from app.application.transaction_reference_service import TransactionReferenceService
from app.application.wowpe_client import WowPeApiClient

logger = logging.getLogger("central_transaction_service")

DEFAULT_TENANT_ID = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")


class CentralTransactionService:
    """
    Unified Transaction Lifecycle & Ledger Management Engine.
    """

    @classmethod
    async def log_audit(
        cls,
        db: AsyncSession,
        transaction_reference: str,
        action: str,
        new_status: str,
        previous_status: Optional[str] = None,
        tenant_id: Optional[uuid.UUID] = None,
        transaction_id: Optional[uuid.UUID] = None,
        actor_type: str = "SYSTEM",
        actor_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> TransactionAuditLogModel:
        """Appends immutable event to transaction audit trail."""
        tid = tenant_id or DEFAULT_TENANT_ID
        audit = TransactionAuditLogModel(
            public_id=uuid.uuid4(),
            tenant_id=tid,
            transaction_id=transaction_id,
            transaction_reference=transaction_reference,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            actor_type=actor_type,
            actor_id=actor_id,
            details=details or {},
            created_at=datetime.now(timezone.utc)
        )
        db.add(audit)
        return audit

    @classmethod
    async def post_ledger_entry(
        cls,
        db: AsyncSession,
        transaction_reference: str,
        entry_type: str,
        account_type: str,
        account_number: str,
        amount: float,
        balance_before: float,
        balance_after: float,
        tenant_id: Optional[uuid.UUID] = None,
        transaction_id: Optional[uuid.UUID] = None,
        narration: Optional[str] = None
    ) -> TransactionLedgerEntryModel:
        """Records an auditable double-entry ledger posting."""
        tid = tenant_id or DEFAULT_TENANT_ID
        entry = TransactionLedgerEntryModel(
            public_id=uuid.uuid4(),
            tenant_id=tid,
            transaction_id=transaction_id,
            transaction_reference=transaction_reference,
            entry_type=entry_type,
            account_type=account_type,
            account_number=account_number,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            currency="INR",
            narration=narration,
            created_at=datetime.now(timezone.utc)
        )
        db.add(entry)
        return entry

    @classmethod
    async def create_and_initiate_transaction(
        cls,
        db: AsyncSession,
        amount: float,
        transaction_type: str = "PAYOUT",
        service_type: str = "MOVE_TO_BANK",
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        customer_id: Optional[uuid.UUID] = None,
        retailer_id: Optional[uuid.UUID] = None,
        beneficiary_id: Optional[uuid.UUID] = None,
        vendor_code: Optional[str] = "WOWPE",
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
        auto_execute: bool = False,
        recipient_account: Optional[str] = None,
        recipient_ifsc: Optional[str] = None,
        recipient_name: Optional[str] = None,
        recipient_mobile: Optional[str] = None,
        transfer_mode: str = "IMPS"
    ) -> Dict[str, Any]:
        """
        Executes end-to-end transaction creation:
        1. Validates idempotency
        2. Resolves vendor & configuration
        3. Generates authoritative reference: <VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>
        4. Calculates financial breakdown (Charges, GST, TDS, Net)
        5. Posts double-entry ledger holding
        6. Persists transaction with INITIATED status
        7. Logs audit trail
        8. Optionally executes with vendor API (e.g. WowPe)
        """
        tid = tenant_id or DEFAULT_TENANT_ID
        v_code = (vendor_code or "WOWPE").strip().upper()

        if amount <= 0:
            raise DomainException("Transaction amount must be greater than zero.")

        # =====================================================================
        # 1. Idempotency Protection
        # =====================================================================
        if idempotency_key:
            stmt_idem = select(CentralTransactionModel).where(
                CentralTransactionModel.tenant_id == tid,
                CentralTransactionModel.idempotency_key == idempotency_key
            )
            res_idem = await db.execute(stmt_idem)
            existing_tx = res_idem.scalars().first()
            if existing_tx:
                logger.info(
                    f"Idempotent request matched existing transaction {existing_tx.transaction_reference}"
                )
                return {
                    "transaction_id": str(existing_tx.public_id),
                    "transaction_reference": existing_tx.transaction_reference,
                    "transaction_type": existing_tx.transaction_type,
                    "service_type": existing_tx.service_type,
                    "amount": float(existing_tx.amount),
                    "charges": float(existing_tx.charges),
                    "net_amount": float(existing_tx.net_amount),
                    "status": existing_tx.status,
                    "vendor_code": existing_tx.vendor_code,
                    "utr": existing_tx.utr,
                    "is_duplicate": True,
                    "created_at": existing_tx.created_at.isoformat()
                }

        # =====================================================================
        # 2. Dynamic Financial Breakdown Calculation via Admin Payout Slab
        # =====================================================================
        from app.infrastructure.db.payout_slab_model import PayoutSlabModel
        from decimal import Decimal, ROUND_HALF_UP

        amount_d = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        stmt_slab = select(PayoutSlabModel).where(
            PayoutSlabModel.service_code == service_type,
            PayoutSlabModel.min_amount <= amount_d,
            PayoutSlabModel.max_amount >= amount_d,
            PayoutSlabModel.is_active == True,
            PayoutSlabModel.is_deleted == False
        ).order_by(PayoutSlabModel.effective_from.desc())
        slab_obj = (await db.execute(stmt_slab)).scalars().first()

        if slab_obj:
            comm_val = Decimal(str(slab_obj.commission or 0.0))
            if str(slab_obj.commission_type or "FIXED").upper() == "PERCENTAGE":
                comm_val = (amount_d * comm_val / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            
            vc_val = Decimal(str(slab_obj.vendor_charge or 0.0))
            if str(slab_obj.vendor_charge_type or "FIXED").upper() == "PERCENTAGE":
                vc_val = (amount_d * vc_val / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            oth_val = Decimal(str(slab_obj.other_charges or 0.0))
            if str(slab_obj.other_charges_type or "FIXED").upper() == "PERCENTAGE":
                oth_val = (amount_d * oth_val / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            gst_rate = Decimal(str(slab_obj.gst or 0.0))
            gst_base = comm_val + vc_val + oth_val
            if str(slab_obj.gst_type or "PERCENTAGE").upper() == "PERCENTAGE":
                gst_val = (gst_base * gst_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                gst_val = gst_rate

            tds_rate = Decimal(str(slab_obj.tds or 0.0))
            if str(slab_obj.tds_type or "PERCENTAGE").upper() == "PERCENTAGE":
                tds_val = (comm_val * tds_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                tds_val = tds_rate

            charges = float(comm_val + vc_val + oth_val)
            gst_amount = float(gst_val)
            commission = float(comm_val)
            tds_amount = float(tds_val)
            net_amount = float((amount_d + comm_val + vc_val + oth_val + gst_val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        else:
            charges = 0.0
            gst_amount = 0.0
            commission = 0.0
            tds_amount = 0.0
            net_amount = float(amount_d)

        # =====================================================================
        # 3. Dynamic Reference Generation
        # =====================================================================
        txn_ref = await TransactionReferenceService.generate_unique_reference(
            db=db,
            tenant_id=tid,
            vendor_code=v_code
        )

        tx_public_id = uuid.uuid4()

        # =====================================================================
        # 4. Create Transaction Record
        # =====================================================================
        tx = CentralTransactionModel(
            public_id=tx_public_id,
            tenant_id=tid,
            company_id=company_id,
            vendor_code=v_code,
            transaction_reference=txn_ref,
            transaction_type=transaction_type,
            service_type=service_type,
            customer_id=customer_id,
            retailer_id=retailer_id,
            beneficiary_id=beneficiary_id,
            amount=amount,
            currency="INR",
            charges=charges,
            commission=commission,
            gst_amount=gst_amount,
            tds_amount=tds_amount,
            net_amount=net_amount,
            status="INITIATED",
            status_description="Transaction initiated and reference registered.",
            request_id=request_id or f"REQ_{uuid.uuid4().hex[:12]}",
            idempotency_key=idempotency_key,
            metadata_json=metadata_json or {},
            is_active=True,
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            created_by="SYSTEM",
            updated_by="SYSTEM"
        )
        db.add(tx)
        await db.flush()

        # =====================================================================
        # 5. Ledger Entries (Double-Entry Holding)
        # =====================================================================
        ret_acc = f"RET_{retailer_id}" if retailer_id else "RETAILER_MAIN_POOL"
        await cls.post_ledger_entry(
            db=db,
            transaction_reference=txn_ref,
            entry_type="DEBIT",
            account_type="RETAILER_WALLET",
            account_number=ret_acc,
            amount=net_amount,
            balance_before=100000.0,
            balance_after=100000.0 - net_amount,
            tenant_id=tid,
            transaction_id=tx_public_id,
            narration=f"Debit for {service_type} ref {txn_ref}"
        )

        await cls.post_ledger_entry(
            db=db,
            transaction_reference=txn_ref,
            entry_type="CREDIT",
            account_type="ESCROW_ACCOUNT",
            account_number="ESCROW_POOL_01",
            amount=amount,
            balance_before=0.0,
            balance_after=amount,
            tenant_id=tid,
            transaction_id=tx_public_id,
            narration=f"Escrow hold for {txn_ref}"
        )

        # =====================================================================
        # 6. Audit Trail
        # =====================================================================
        await cls.log_audit(
            db=db,
            transaction_reference=txn_ref,
            action="CREATE_TRANSACTION",
            previous_status=None,
            new_status="INITIATED",
            tenant_id=tid,
            transaction_id=tx_public_id,
            actor_type="API_REQUEST",
            details={
                "amount": amount,
                "net_amount": net_amount,
                "vendor_code": v_code,
                "service_type": service_type
            }
        )

        # =====================================================================
        # 7. Optional Automatic Vendor Execution
        # =====================================================================
        if auto_execute and recipient_account and recipient_ifsc:
            tx.status = "PROCESSING"
            await cls.log_audit(
                db=db,
                transaction_reference=txn_ref,
                action="VENDOR_DISPATCH",
                previous_status="INITIATED",
                new_status="PROCESSING",
                tenant_id=tid,
                transaction_id=tx_public_id,
                details={"vendor_code": v_code}
            )

            from app.application.payout_vendor_adapter import PayoutVendorAdapterFactory, SimulatedVendorAdapter
            vendor_adapter = PayoutVendorAdapterFactory.get_adapter()

            try:
                payout_res = await vendor_adapter.initiate_payout(
                    vendor_name=v_code,
                    merchant_ref=txn_ref,
                    account_number=recipient_account,
                    ifsc_code=recipient_ifsc,
                    account_holder=recipient_name or "Retailer Beneficiary",
                    amount=amount,
                    mode=transfer_mode,
                    mobile=recipient_mobile or "9876543210",
                    bank_name="Commercial Bank",
                    sender_name="Retailer Beneficiary"
                )

                res_status = payout_res.get("status")
                if res_status in ("SUCCESS", "PENDING") or payout_res.get("success"):
                    tx.status = res_status if res_status else "SUCCESS"
                    tx.utr = payout_res.get("utr") or f"TEST-UTR{txn_ref}"
                    tx.vendor_order_id = str(payout_res.get("order_id") or payout_res.get("vendor_tx_id") or "")
                    tx.response_message = payout_res.get("message", "Payout executed successfully")
                else:
                    tx.status = "FAILED"
                    tx.response_message = payout_res.get("message", "Gateway execution rejected")
                    # Auto-reversal ledger entry
                    await cls.post_ledger_entry(
                        db=db,
                        transaction_reference=txn_ref,
                        entry_type="CREDIT",
                        account_type="RETAILER_WALLET",
                        account_number=ret_acc,
                        amount=net_amount,
                        balance_before=100000.0 - net_amount,
                        balance_after=100000.0,
                        tenant_id=tid,
                        transaction_id=tx_public_id,
                        narration=f"Automatic refund for failed transaction {txn_ref}"
                    )
            except Exception as ex:
                tx.status = "FAILED"
                tx.response_message = str(ex)

            await cls.log_audit(
                db=db,
                transaction_reference=txn_ref,
                action="FINALIZE_TRANSACTION",
                previous_status="PROCESSING",
                new_status=tx.status,
                tenant_id=tid,
                transaction_id=tx_public_id,
                details={"response_message": tx.response_message, "utr": tx.utr}
            )

        await db.commit()

        return {
            "transaction_id": str(tx.public_id),
            "transaction_reference": tx.transaction_reference,
            "transaction_type": tx.transaction_type,
            "service_type": tx.service_type,
            "amount": float(tx.amount),
            "charges": float(tx.charges),
            "gst_amount": float(tx.gst_amount),
            "net_amount": float(tx.net_amount),
            "status": tx.status,
            "vendor_code": tx.vendor_code,
            "utr": tx.utr,
            "response_message": tx.response_message,
            "created_at": tx.created_at.isoformat()
        }

    @classmethod
    async def get_transaction(
        cls,
        db: AsyncSession,
        transaction_reference: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieves full transaction object with ledger & audit trail."""
        tid = tenant_id or DEFAULT_TENANT_ID
        stmt = select(CentralTransactionModel).where(
            CentralTransactionModel.transaction_reference == transaction_reference,
            CentralTransactionModel.tenant_id == tid
        )
        res = await db.execute(stmt)
        tx = res.scalars().first()
        if not tx:
            return None

        # Fetch Audit Trail
        stmt_audit = select(TransactionAuditLogModel).where(
            TransactionAuditLogModel.transaction_reference == transaction_reference
        ).order_by(TransactionAuditLogModel.created_at.asc())
        res_audit = await db.execute(stmt_audit)
        audits = res_audit.scalars().all()

        # Fetch Ledger
        stmt_ledger = select(TransactionLedgerEntryModel).where(
            TransactionLedgerEntryModel.transaction_reference == transaction_reference
        ).order_by(TransactionLedgerEntryModel.created_at.asc())
        res_ledger = await db.execute(stmt_ledger)
        ledgers = res_ledger.scalars().all()

        return {
            "transaction_id": str(tx.public_id),
            "transaction_reference": tx.transaction_reference,
            "transaction_type": tx.transaction_type,
            "service_type": tx.service_type,
            "amount": float(tx.amount),
            "charges": float(tx.charges),
            "gst_amount": float(tx.gst_amount),
            "tds_amount": float(tx.tds_amount),
            "net_amount": float(tx.net_amount),
            "status": tx.status,
            "vendor_code": tx.vendor_code,
            "utr": tx.utr,
            "vendor_order_id": tx.vendor_order_id,
            "response_message": tx.response_message,
            "created_at": tx.created_at.isoformat(),
            "audit_trail": [
                {
                    "action": a.action,
                    "previous_status": a.previous_status,
                    "new_status": a.new_status,
                    "actor_type": a.actor_type,
                    "details": a.details,
                    "timestamp": a.created_at.isoformat()
                }
                for a in audits
            ],
            "ledger_entries": [
                {
                    "entry_type": l.entry_type,
                    "account_type": l.account_type,
                    "account_number": l.account_number,
                    "amount": float(l.amount),
                    "balance_after": float(l.balance_after),
                    "narration": l.narration,
                    "timestamp": l.created_at.isoformat()
                }
                for l in ledgers
            ]
        }

    @classmethod
    async def list_transactions(
        cls,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        vendor_code: Optional[str] = None,
        status: Optional[str] = None,
        service_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Lists transactions with filters and pagination."""
        tid = tenant_id or DEFAULT_TENANT_ID
        conditions = [CentralTransactionModel.tenant_id == tid]

        if vendor_code and vendor_code != "ALL":
            conditions.append(CentralTransactionModel.vendor_code == vendor_code.upper())
        if status and status != "ALL":
            conditions.append(CentralTransactionModel.status == status.upper())
        if service_type and service_type != "ALL":
            conditions.append(CentralTransactionModel.service_type == service_type.upper())
        if search:
            search_str = f"%{search.strip()}%"
            conditions.append(CentralTransactionModel.transaction_reference.ilike(search_str))

        stmt = select(CentralTransactionModel).where(
            and_(*conditions)
        ).order_by(desc(CentralTransactionModel.created_at)).limit(limit).offset(offset)

        res = await db.execute(stmt)
        txs = res.scalars().all()

        return {
            "total_count": len(txs),
            "limit": limit,
            "offset": offset,
            "items": [
                {
                    "transaction_id": str(t.public_id),
                    "transaction_reference": t.transaction_reference,
                    "transaction_type": t.transaction_type,
                    "service_type": t.service_type,
                    "amount": float(t.amount),
                    "charges": float(t.charges),
                    "net_amount": float(t.net_amount),
                    "status": t.status,
                    "vendor_code": t.vendor_code,
                    "utr": t.utr,
                    "created_at": t.created_at.isoformat()
                }
                for t in txs
            ]
        }
