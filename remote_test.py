
import asyncio
import httpx
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import AdminUserModel, DistributorModel
from sqlalchemy import select
from app.core.security import create_access_token

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AdminUserModel).where(AdminUserModel.email == 'sathyaprabhu80@gmail.com'))
        user = res.scalar_one_or_none()
        if not user:
            res = await db.execute(select(AdminUserModel))
            user = res.scalars().first()

        token = create_access_token(
            subject=str(user.public_id),
            tenant_id=str(user.tenant_id),
            extra_claims={'email': user.email, 'role': 'SUPER_ADMIN'}
        )
        
        d_res = await db.execute(select(DistributorModel).where(DistributorModel.mobile == '9025381316'))
        dist = d_res.scalars().first()
        dist_id = str(dist.public_id) if dist else None

    print("Token created for user:", user.email, "Dist ID:", dist_id)
    headers = {'Authorization': f'Bearer {token}'}

    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=15.0) as client:
        # Test 1: Retailer Verification requests
        r_verif = await client.get('/api/v1/admin/verification/requests?page_size=5', headers=headers)
        print("1. Retailer Verification requests status:", r_verif.status_code, "Total:", r_verif.json().get('total'))

        # Test 2: Distributor detail via verification requests endpoint
        if dist_id:
            r_d = await client.get(f'/api/v1/admin/verification/requests/{dist_id}', headers=headers)
            print("2. Distributor Detail status:", r_d.status_code, "Name:", r_d.json().get('verification', {}).get('retailer_name'), "Status:", r_d.json().get('verification', {}).get('retailer_status'))

            # Test 3: Distributor Approve Action via verification action endpoint
            r_act = await client.post(
                f'/api/v1/admin/verification/requests/{dist_id}/action',
                headers=headers,
                json={'action': 'APPROVE', 'admin_id': 'ADM-1001', 'remarks': 'Distributor KYC & documentation verified'}
            )
            print("3. Distributor Approve status:", r_act.status_code, "Msg:", r_act.json().get('message'))

            # Test 4: Distributor On-Hold Action via verification action endpoint
            r_hold = await client.post(
                f'/api/v1/admin/verification/requests/{dist_id}/action',
                headers=headers,
                json={'action': 'ON_HOLD', 'admin_id': 'ADM-1001', 'remarks': 'Document re-verification required'}
            )
            print("4. Distributor Hold status:", r_hold.status_code, "Msg:", r_hold.json().get('message'))

        # Test 5: Pending hierarchy approvals
        r_p = await client.get('/api/v1/admin/retailer-control/pending-approvals', headers=headers)
        print("5. Pending hierarchy approvals status:", r_p.status_code, "Count:", len(r_p.json().get('data', {}).get('distributors', [])))
        for d in r_p.json().get('data', {}).get('distributors', []):
            print("   ->", d.get('business_name'), "|", d.get('distributor_code'), "|", d.get('status'))

asyncio.run(main())
