import asyncio
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
from sqlalchemy import select

async def check_wallets():
    async with AsyncSessionLocal() as db:
        stmt = select(RetailerModel, RetailerWalletModel).join(RetailerWalletModel, RetailerModel.public_id == RetailerWalletModel.retailer_id)
        res = await db.execute(stmt)
        rows = res.all()
        for ret, wal in rows:
            print(f"Retailer: {ret.retailer_code} ({ret.store_name}) -> Wallet ID: {wal.public_id}, Balance: ₹{wal.wallet_balance:,.2f}, Frozen: {wal.is_frozen}")

if __name__ == '__main__':
    asyncio.run(check_wallets())
