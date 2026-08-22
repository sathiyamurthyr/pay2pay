import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import asyncio
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import RetailerModel
from app.infrastructure.db.verification_models import RetailerVerificationModel

async def check_retailers():
    async with AsyncSessionLocal() as db:
        print("=== RETAILERS TABLE ===")
        res = await db.execute(select(RetailerModel).order_by(RetailerModel.created_date.desc()).limit(20))
        retailers = res.scalars().all()
        print(f"Total retailers in sample: {len(retailers)}")
        for r in retailers:
            print(f"- ID: {r.public_id}, Code: {r.retailer_code}, Store: {r.store_name}, Owner: {r.owner_name}, Status: {r.status}, Tenant: {r.tenant_id}, Deleted: {r.is_deleted}, Created: {r.created_date}")

        print("\n=== RETAILER VERIFICATIONS TABLE ===")
        try:
            res_v = await db.execute(select(RetailerVerificationModel).order_by(RetailerVerificationModel.created_date.desc()).limit(20))
            verifs = res_v.scalars().all()
            print(f"Total verifications in sample: {len(verifs)}")
            for v in verifs:
                print(f"- RegID: {v.registration_id}, Mobile: {v.mobile_number}, Name: {v.retailer_name}, Shop: {v.shop_name}, VerStatus: {v.verification_status}, RegStatus: {v.registration_status}, AccountStatus: {v.account_status}, Created: {v.created_date}")
        except Exception as e:
            print("Error querying verifications:", e)

if __name__ == "__main__":
    asyncio.run(check_retailers())
