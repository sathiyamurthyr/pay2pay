"""
Background Status Polling Engine for BulkPe Payout Transactions.
Polls PENDING transactions every 60 seconds and updates transaction statuses and ledger reversals automatically.
"""

import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.payout_workflow_models import (
    PayoutWorkflowTransactionModel,
    PayoutAuditModel,
    PayoutReceiptModel
)
from app.infrastructure.db.models import RetailerWalletModel
from app.application.bulkpe_client import BulkPeApiClient

logger = logging.getLogger("bulkpe.background_poller")


async def poll_pending_bulkpe_transactions():
    """Single execution turn of background status check for PENDING transactions."""
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(PayoutWorkflowTransactionModel).where(
                PayoutWorkflowTransactionModel.status == "PENDING"
            )
            pending_txs = (await db.execute(stmt)).scalars().all()

            if not pending_txs:
                return

            logger.info(f"[BulkPe Poller] Polling status for {len(pending_txs)} PENDING payout transactions...")

            for tx in pending_txs:
                vendor_tx_id = tx.cashfree_transfer_id or tx.reference_number
                if not vendor_tx_id:
                    continue

                status_res = await BulkPeApiClient.check_payout_status(vendor_tx_id)
                new_status = status_res.get("status", "PENDING").upper()
                utr = status_res.get("utr")
                rrn = status_res.get("rrn")

                if new_status == "SUCCESS":
                    tx.status = "SUCCESS"
                    if utr:
                        tx.utr_number = utr
                    tx.completed_at = datetime.now(timezone.utc)

                elif new_status in ("FAILED", "REVERSED"):
                    # Automatic Reversal for failed/reversed transaction
                    tx.status = new_status
                    tx.failure_reason = status_res.get("message", "BulkPe status returned failure")
                    tx.completed_at = datetime.now(timezone.utc)

                    # Lock & Refund Wallet
                    stmt_w = select(RetailerWalletModel).where(
                        RetailerWalletModel.retailer_id == tx.retailer_id
                    ).with_for_update()
                    wallet = (await db.execute(stmt_w)).scalars().first()

                    if wallet:
                        refund_before = wallet.wallet_balance
                        wallet.wallet_balance = round(wallet.wallet_balance + tx.net_debit, 2)
                        refund_after = wallet.wallet_balance

                        refund_audit = PayoutAuditModel(
                            public_id=tx.public_id,
                            transaction_id=tx.public_id,
                            customer_id=tx.customer_id,
                            beneficiary_id=tx.beneficiary_id,
                            retailer_id=tx.retailer_id,
                            tenant_id=tx.tenant_id,
                            action=f"BACKGROUND_POLLER_REFUND_{new_status}",
                            wallet_before=refund_before,
                            wallet_after=refund_after,
                            timestamp=datetime.now(timezone.utc),
                            is_active=True,
                            is_deleted=False
                        )
                        db.add(refund_audit)

                # Update public digital receipt & dispatch WhatsApp notification if status changed
                if new_status in ("SUCCESS", "FAILED", "REVERSED"):
                    try:
                        stmt_rc = select(PayoutReceiptModel).where(
                            (PayoutReceiptModel.transaction_id == tx.public_id) |
                            (PayoutReceiptModel.transaction_number == tx.transaction_number)
                        )
                        rc_obj = (await db.execute(stmt_rc)).scalars().first()
                        if rc_obj:
                            rc_obj.status = new_status
                            if utr:
                                rc_obj.utr_number = utr
                            if new_status == "SUCCESS":
                                rc_obj.status_text = "TRANSACTION SUCCESSFUL · REAL-TIME CBS SETTLED"
                            elif new_status in ("FAILED", "REVERSED"):
                                rc_obj.status_text = f"TRANSACTION {new_status} · REFUND PROCESSED"

                            if rc_obj.customer_mobile:
                                from app.application.payout_workflow_service import PayoutWorkflowService
                                wa_info = await PayoutWorkflowService.dispatch_payout_whatsapp_notification(
                                    db=db,
                                    tenant_id=tx.tenant_id,
                                    company_id=tx.company_id,
                                    transaction_id=tx.public_id,
                                    transaction_number=tx.transaction_number,
                                    customer_id=tx.customer_id,
                                    customer_name=rc_obj.customer_name or "Customer",
                                    customer_mobile=rc_obj.customer_mobile,
                                    amount=float(tx.amount),
                                    status=new_status,
                                    receipt_token=rc_obj.receipt_token,
                                    utr_number=utr
                                )
                                rc_obj.whatsapp_message_id = wa_info.get("message_id")
                                rc_obj.whatsapp_status = wa_info.get("status")
                    except Exception as ex_rc:
                        logger.warning(f"[BulkPe Poller Receipt Update Notice] {ex_rc}")

                await db.commit()

        except Exception as err:
            logger.error(f"[BulkPe Poller Error] Failed to process background status polling: {err}")


async def start_bulkpe_polling_loop(interval_sec: int = 60):
    """Continuous background loop running every 60 seconds."""
    while True:
        try:
            await poll_pending_bulkpe_transactions()
        except Exception as e:
            logger.error(f"[BulkPe Poller Exception] {e}")
        await asyncio.sleep(interval_sec)
