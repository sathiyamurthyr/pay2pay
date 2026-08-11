import asyncio
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.bank_master_models import BankMasterModel

async def verify():
    async with AsyncSessionLocal() as session:
        # Total count
        stmt_total = select(func.count()).select_from(BankMasterModel)
        total = (await session.execute(stmt_total)).scalar_one()

        # Credit card banks count
        stmt_cc = select(func.count()).select_from(BankMasterModel).where(BankMasterModel.is_credit_card == True)
        cc_count = (await session.execute(stmt_cc)).scalar_one()

        # Regular banks count
        stmt_reg = select(func.count()).select_from(BankMasterModel).where(BankMasterModel.is_credit_card == False)
        reg_count = (await session.execute(stmt_reg)).scalar_one()

        print(f"--- BANK MASTER VERIFICATION ---")
        print(f"Total Bank Records: {total}")
        print(f"Credit Card Banks: {cc_count}")
        print(f"Regular / Co-op Banks: {reg_count}")

        # Sample Credit Card Banks
        res_cc_sample = await session.execute(select(BankMasterModel).where(BankMasterModel.is_credit_card == True).limit(5))
        print("\nSample Credit Card Banks:")
        for b in res_cc_sample.scalars().all():
            print(f"  Ref #{b.bank_ifsc_ref_id} | {b.bank_name} | IFSC: {b.ifsc} | CC: {b.is_credit_card}")

        # Sample Regular Banks
        res_reg_sample = await session.execute(select(BankMasterModel).where(BankMasterModel.is_credit_card == False).limit(5))
        print("\nSample Regular Banks:")
        for b in res_reg_sample.scalars().all():
            print(f"  Ref #{b.bank_ifsc_ref_id} | {b.bank_name} | IFSC: {b.ifsc} | CC: {b.is_credit_card}")

if __name__ == "__main__":
    asyncio.run(verify())
