import asyncio
import uuid
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import RetailerModel, RetailerWalletModel, TopupRequestModel
from app.infrastructure.db.transaction_engine_models import CentralTransactionModel, TransactionLedgerEntryModel
from sqlalchemy import select

async def topup_retailer():
    async with AsyncSessionLocal() as db:
        # Find retailer RET-10928
        ret = (await db.execute(select(RetailerModel).where(RetailerModel.retailer_code == 'RET-10928'))).scalars().first()
        if not ret:
            print("Retailer RET-10928 not found!")
            return

        wal = (await db.execute(select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret.public_id))).scalars().first()
        if not wal:
            wal = RetailerWalletModel(
                retailer_id=ret.public_id,
                wallet_balance=0.0,
                status="ACTIVE",
                is_active=True
            )
            db.add(wal)
            await db.flush()

        old_bal = float(wal.wallet_balance or 0.0)
        credit_amount = 100000.00  # ₹1,00,000.00
        new_bal = old_bal + credit_amount
        wal.wallet_balance = new_bal

        now_utc = datetime.now(timezone.utc)
        date_str = now_utc.strftime("%Y%m%d")
        topup_req_id = f"TOP-{date_str}-{uuid.uuid4().hex[:8].upper()}"

        # Record Topup Request
        topup_rec = TopupRequestModel(
            retailer_id=ret.public_id,
            topup_request_id=topup_req_id,
            requested_amount=credit_amount,
            approved_amount=credit_amount,
            payment_mode="NEFT",
            payment_reference=f"UTR{uuid.uuid4().hex[:12].upper()}",
            status="APPROVED",
            retailer_remarks="Initial wallet funding for testing",
            admin_remarks="Auto-approved system initial balance",
            approved_by="SYSTEM_ADMIN",
            approved_at=now_utc,
            submitted_at=now_utc,
            is_active=True,
            is_deleted=False
        )
        db.add(topup_rec)

        # Record Ledger Entry
        ledger = TransactionLedgerEntryModel(
            account_number=str(ret.public_id),
            entry_type="CREDIT",
            account_type="RETAILER_WALLET",
            amount=credit_amount,
            balance_before=old_bal,
            balance_after=new_bal,
            transaction_id=topup_req_id,
            description="Wallet Topup Credit",
            timestamp=now_utc,
            status="POSTED"
        )
        db.add(ledger)

        # Record Central Transaction
        central_tx = CentralTransactionModel(
            transaction_id=topup_req_id,
            retailer_id=ret.public_id,
            tenant_id=ret.tenant_id,
            company_id=ret.company_id,
            service_type="TOPUP",
            transaction_type="WALLET_TOPUP",
            amount=credit_amount,
            status="SUCCESS",
            timestamp=now_utc
        )
        db.add(central_tx)

        await db.commit()
        print(f"Successfully topped up RET-10928 wallet: previous={old_bal}, new_balance={new_bal}")

if __name__ == "__main__":
    asyncio.run(topup_retailer())
