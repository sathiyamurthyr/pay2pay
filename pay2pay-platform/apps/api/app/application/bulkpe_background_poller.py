"""
Background Status Polling Engine for BulkPe Payout Transactions.
Polls PENDING transactions every 60 seconds and updates transaction statuses and ledger reversals automatically.
"""

import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.payout_workflow_models import PayoutWorkflowTransactionModel, PayoutAuditModel
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
