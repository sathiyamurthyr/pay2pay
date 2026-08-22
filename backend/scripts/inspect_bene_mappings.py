import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import asyncio
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel, BeneficiaryBankAccountModel
from app.infrastructure.db.epic014_models import BeneficiaryMasterModel, BeneficiaryCustomerMappingModel

async def inspect_data():
    async with AsyncSessionLocal() as db:
        print("=== CUSTOMERS ===")
        custs = (await db.execute(select(CustomerModel))).scalars().all()
        for c in custs:
            print(f"Customer: ID={c.public_id} | Mobile={c.mobile_number} | Number={c.customer_number} | Name={c.full_name}")

        print("\n=== BENEFICIARY CUSTOMER MAPPINGS (EPIC-014) ===")
        maps = (await db.execute(select(BeneficiaryCustomerMappingModel))).scalars().all()
        for m in maps:
            print(f"Mapping: ID={m.public_id} | CustID={m.customer_id} | BeneID={m.beneficiary_id} | Active={m.is_active}")

        print("\n=== BENEFICIARY MASTER (EPIC-014) ===")
        masters = (await db.execute(select(BeneficiaryMasterModel))).scalars().all()
        for b in masters:
            print(f"Master Bene: ID={b.public_id} | Name={b.account_holder_name} | Acc={b.account_number} | Bank={b.bank_name}")

        print("\n=== BENEFICIARY MODEL (LEGACY) ===")
        bens = (await db.execute(select(BeneficiaryModel))).scalars().all()
        for b in bens:
            print(f"Bene: ID={b.public_id} | CustID={b.customer_id} | Name={b.full_name} | Num={b.beneficiary_number} | Active={b.is_active}")

if __name__ == "__main__":
    asyncio.run(inspect_data())
