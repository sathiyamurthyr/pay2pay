import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import asyncio
import uuid
from app.core.database import AsyncSessionLocal
from app.application.services import RetailerManagementService

async def test_retailer_api():
    async with AsyncSessionLocal() as db:
        tenant_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
        print("=== 1. LIST RETAILERS ===")
        retailers, total = await RetailerManagementService.list_retailers(db, tenant_id)
        print(f"Total retailers found: {total}")
        target_ret = None
        for r in retailers:
            print(f"- {r.public_id} | Code: {r.retailer_code} | Store: {r.store_name} | Owner: {r.owner_name} | Status: {r.status}")
            if "RAMESH" in (r.owner_name or ""):
                target_ret = r

        if target_ret:
            print("\n=== 2. GET RETAILER DETAILS FOR TARGET ===")
            details = await RetailerManagementService.get_retailer_details(db, tenant_id, target_ret.public_id)
            print(f"Details Store: {details.retailer.store_name}")
            print(f"Details Owner: {details.retailer.owner_name}")
            print(f"Details Status: {details.retailer.status}")
            print(f"Contacts: {details.contacts}")
            print(f"Addresses: {details.addresses}")
            print(f"Banks: {details.banks}")
            print(f"KYC: {details.kyc}")
            print(f"Approvals: {details.approvals}")

if __name__ == "__main__":
    asyncio.run(test_retailer_api())
