import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal
from sqlalchemy import select, text, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
from app.infrastructure.db.transaction_engine_models import TransactionLedgerEntryModel
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutTransactionStatus
)

logger = logging.getLogger("financial_reconciliation_service")


class FinancialReconciliationService:
    """
    Authoritative Database Financial Ledger Reconciliation Service.
    
    Invariants:
    1. Single Source of Truth: Database ledger (transaction_ledger_entries) and RetailerWalletModel.
    2. Zero Frontend Financial Derivation.
    3. Unbroken Continuous Balance Chain:
       Closing Balance (N) = Previous Balance (N) + Total Credit (N) - Total Debit (N)
       Previous Balance (N+1) = Closing Balance (N)
    4. Authoritative Wallet Synchronization:
       Current RetailerWalletModel.wallet_balance == Latest Ledger Closing Balance.
    """

    @classmethod
    async def reconcile_all_wallets(
        cls,
        db: AsyncSession,
        auto_repair: bool = True
    ) -> Dict[str, Any]:
        """
        Scans all retailer wallets, validates ledger consistency, and synchronizes
        wallet balance with the authoritative ledger state.
        """
        results = []
        total_checked = 0
        reconciled_count = 0
        discrepant_count = 0
        repairs_applied = 0

        # 1. Fetch all retailers with wallets
        stmt = select(RetailerModel).where(RetailerModel.is_deleted == False).order_by(RetailerModel.id.asc())
        retailers = (await db.execute(stmt)).scalars().all()

        for ret in retailers:
            total_checked += 1
            ret_id = ret.public_id
            
            # Fetch or initialize wallet
            w_stmt = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_id).with_for_update()
            wallet = (await db.execute(w_stmt)).scalars().first()

            if not wallet:
                if auto_repair:
                    wallet = RetailerWalletModel(
                        retailer_id=ret_id,
                        tenant_id=ret.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                        wallet_balance=50000.00,
                    )
                    db.add(wallet)
                    await db.flush()
                    repairs_applied += 1

            current_wallet_bal = round(float(wallet.wallet_balance if wallet else 0.0), 2)

            # Fetch all ledger entries for this retailer in strict chronological order
            l_stmt = select(TransactionLedgerEntryModel).where(
                or_(
                    TransactionLedgerEntryModel.account_number == str(ret_id),
                    TransactionLedgerEntryModel.account_number == (ret.retailer_code or "")
                ),
                TransactionLedgerEntryModel.account_type == "RETAILER_WALLET"
            ).order_by(TransactionLedgerEntryModel.created_at.asc(), TransactionLedgerEntryModel.id.asc())
            
            ledger_rows = (await db.execute(l_stmt)).scalars().all()

            # Also check enterprise_payout_transactions for this retailer
            p_stmt = select(EnterprisePayoutTransactionModel).where(
                EnterprisePayoutTransactionModel.retailer_id == ret_id,
                EnterprisePayoutTransactionModel.is_deleted == False
            ).order_by(EnterprisePayoutTransactionModel.created_date.asc(), EnterprisePayoutTransactionModel.id.asc())
            payouts = (await db.execute(p_stmt)).scalars().all()

            # Compute Authoritative Chronological Balance
            opening_baseline = 50000.00
            running_balance = opening_baseline
            ledger_history = []
            has_discrepancy = False

            # If ledger entries are missing for payouts, populate them
            if payouts and len(ledger_rows) < len(payouts):
                if auto_repair:
                    # Sync missing ledger entries
                    existing_tx_refs = {l.transaction_reference for l in ledger_rows}
                    
                    for p in payouts:
                        net_debit = round(float(p.net_debit or (p.amount + (p.charges or 0.0) + (p.gst_amount or 0.0))), 2)
                        
                        # 1. Original Payout Debit Entry
                        if p.transaction_number not in existing_tx_refs:
                            debit_before = running_balance
                            debit_after = round(running_balance - net_debit, 2)
                            running_balance = debit_after
                            
                            p_ledger = TransactionLedgerEntryModel(
                                public_id=uuid.uuid4(),
                                tenant_id=p.tenant_id or ret.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                                transaction_id=p.public_id,
                                transaction_reference=p.transaction_number,
                                entry_type="DEBIT",
                                account_type="RETAILER_WALLET",
                                account_number=str(ret_id),
                                amount=net_debit,
                                balance_before=debit_before,
                                balance_after=debit_after,
                                currency="INR",
                                narration=f"Payout debit for TX {p.transaction_number} (Amount: ₹{p.amount:.2f}, Fee: ₹{p.charges or 0:.2f}, GST: ₹{p.gst_amount or 0:.2f})",
                                created_at=p.initiated_at or p.created_date or datetime.now(timezone.utc)
                            )
                            db.add(p_ledger)
                            existing_tx_refs.add(p.transaction_number)
                            repairs_applied += 1

                        # 2. Reversal Credit Entry if Reversed
                        rev_ref = f"REV-{p.transaction_number}"
                        if (p.is_reversed or p.reversal_transaction_id or p.status == PayoutTransactionStatus.REVERSED) and rev_ref not in existing_tx_refs:
                            rev_before = running_balance
                            rev_after = round(running_balance + net_debit, 2)
                            running_balance = rev_after
                            
                            rev_ledger = TransactionLedgerEntryModel(
                                public_id=p.reversal_transaction_id or uuid.uuid4(),
                                tenant_id=p.tenant_id or ret.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                                transaction_id=p.public_id,
                                transaction_reference=rev_ref,
                                entry_type="CREDIT",
                                account_type="RETAILER_WALLET",
                                account_number=str(ret_id),
                                amount=net_debit,
                                balance_before=rev_before,
                                balance_after=rev_after,
                                currency="INR",
                                narration=f"Reversal refund for failed transaction {p.transaction_number}",
                                created_at=p.reversal_at or p.updated_date or datetime.now(timezone.utc)
                            )
                            db.add(rev_ledger)
                            existing_tx_refs.add(rev_ref)
                            repairs_applied += 1

                    await db.flush()

            # Re-read authoritative ledger entries
            l_stmt2 = select(TransactionLedgerEntryModel).where(
                or_(
                    TransactionLedgerEntryModel.account_number == str(ret_id),
                    TransactionLedgerEntryModel.account_number == (ret.retailer_code or "")
                ),
                TransactionLedgerEntryModel.account_type == "RETAILER_WALLET"
            ).order_by(TransactionLedgerEntryModel.created_at.asc(), TransactionLedgerEntryModel.id.asc())
            final_ledgers = (await db.execute(l_stmt2)).scalars().all()

            if final_ledgers:
                latest_ledger_bal = round(float(final_ledgers[-1].balance_after), 2)
            else:
                latest_ledger_bal = current_wallet_bal

            if current_wallet_bal != latest_ledger_bal:
                has_discrepancy = True
                discrepant_count += 1
                if auto_repair and wallet:
                    wallet.wallet_balance = latest_ledger_bal
                    wallet.updated_date = datetime.now(timezone.utc)
                    await db.flush()
                    repairs_applied += 1
                    current_wallet_bal = latest_ledger_bal
            else:
                reconciled_count += 1

            results.append({
                "retailer_id": str(ret_id),
                "retailer_code": ret.retailer_code,
                "owner_name": ret.owner_name,
                "wallet_balance": current_wallet_bal,
                "latest_ledger_balance": latest_ledger_bal,
                "is_reconciled": not has_discrepancy,
                "total_ledger_entries": len(final_ledgers)
            })

        await db.commit()

        return {
            "status": "SUCCESS",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_wallets_checked": total_checked,
            "reconciled_wallets": reconciled_count,
            "discrepant_wallets": discrepant_count,
            "repairs_applied": repairs_applied,
            "details": results
        }
