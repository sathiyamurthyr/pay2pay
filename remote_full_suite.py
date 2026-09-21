
import asyncio
import httpx
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import AdminUserModel, DistributorModel, SuperDistributorModel
from app.infrastructure.db.verification_models import RetailerVerificationModel
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
        
        d_res = await db.execute(select(DistributorModel).limit(1))
        dist = d_res.scalars().first()
        dist_id = str(dist.public_id) if dist else None

        sd_res = await db.execute(select(SuperDistributorModel).limit(1))
        sd = sd_res.scalars().first()
        sd_id = str(sd.public_id) if sd else None

        ret_res = await db.execute(select(RetailerVerificationModel).limit(1))
        ret_verif = ret_res.scalars().first()
        ret_verif_id = str(ret_verif.public_id) if ret_verif else None

    print(f"=== TEST RUNNER: Admin {user.email} ===")
    headers = {'Authorization': f'Bearer {token}'}

    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=15.0) as client:
        # 1. Retailer verifications intact
        r_verif = await client.get('/api/v1/admin/verification/requests?page_size=5', headers=headers)
        print(f"[TEST 1] Retailer Verification List: HTTP {r_verif.status_code} | Total: {r_verif.json().get('total')}")
        if ret_verif_id:
            r_v_detail = await client.get(f'/api/v1/admin/verification/requests/{ret_verif_id}', headers=headers)
            print(f"[TEST 1b] Retailer Verification Detail: HTTP {r_v_detail.status_code} | Retailer: {r_v_detail.json().get('verification', {}).get('retailer_name')}")

        # 2. Distributor detail and actions
        if dist_id:
            r_d = await client.get(f'/api/v1/admin/verification/requests/{dist_id}', headers=headers)
            v = r_d.json().get('verification', {})
            print(f"[TEST 2] Distributor Detail: HTTP {r_d.status_code} | Name: {v.get('retailer_name')} | Code: {v.get('retailer_code')} | Status: {v.get('retailer_status')}")

            # Approve distributor
            r_d_app = await client.post(
                f'/api/v1/admin/verification/requests/{dist_id}/action',
                headers=headers,
                json={'action': 'APPROVE', 'admin_id': 'ADM-SUPER', 'remarks': 'Distributor Approved and Activated'}
            )
            print(f"[TEST 2a] Distributor Approve Action: HTTP {r_d_app.status_code} | Message: {r_d_app.json().get('message')}")

            # Put on Hold
            r_d_hold = await client.post(
                f'/api/v1/admin/verification/requests/{dist_id}/action',
                headers=headers,
                json={'action': 'ON_HOLD', 'admin_id': 'ADM-SUPER', 'remarks': 'Awaiting further document upload'}
            )
            print(f"[TEST 2b] Distributor On-Hold Action: HTTP {r_d_hold.status_code} | Message: {r_d_hold.json().get('message')}")

            # Re-approve distributor
            r_d_react = await client.post(
                f'/api/v1/admin/verification/requests/{dist_id}/action',
                headers=headers,
                json={'action': 'APPROVE', 'admin_id': 'ADM-SUPER', 'remarks': 'Distributor re-approved'}
            )
            print(f"[TEST 2c] Distributor Final Approve: HTTP {r_d_react.status_code} | Message: {r_d_react.json().get('message')}")

        # 3. Super Distributor detail and actions
        if sd_id:
            r_sd = await client.get(f'/api/v1/admin/verification/requests/{sd_id}', headers=headers)
            v_sd = r_sd.json().get('verification', {})
            print(f"[TEST 3] Super Distributor Detail: HTTP {r_sd.status_code} | Name: {v_sd.get('retailer_name')} | Code: {v_sd.get('retailer_code')} | Status: {v_sd.get('retailer_status')}")

            # Approve SD
            r_sd_app = await client.post(
                f'/api/v1/admin/verification/requests/{sd_id}/action',
                headers=headers,
                json={'action': 'APPROVE', 'admin_id': 'ADM-SUPER', 'remarks': 'Super Distributor Approved'}
            )
            print(f"[TEST 3a] Super Distributor Approve Action: HTTP {r_sd_app.status_code} | Message: {r_sd_app.json().get('message')}")

        # 4. Pending hierarchy approvals endpoint
        r_p = await client.get('/api/v1/admin/retailer-control/pending-approvals', headers=headers)
        print(f"[TEST 4] Pending Approvals Endpoint: HTTP {r_p.status_code} | SDs: {len(r_p.json().get('data', {}).get('super_distributors', []))} | Dists: {len(r_p.json().get('data', {}).get('distributors', []))}")

        # 5. Organization Tree & Hierarchy
        r_org = await client.get('/api/v1/admin/retailer-control/organization-tree', headers=headers)
        print(f"[TEST 5] Organization Tree: HTTP {r_org.status_code} | Total SDs in Tree: {len(r_org.json().get('data', {}).get('tree', []))}")

    # 6. Admin Portal Next.js Server Routes (Port 3003)
    async with httpx.AsyncClient(base_url='http://127.0.0.1:3003', timeout=15.0) as admin_client:
        r_appr_page = await admin_client.get('/approvals')
        print(f"[TEST 6a] Admin /approvals page: HTTP {r_appr_page.status_code}")

        r_dist_page = await admin_client.get('/retailers/distributor-approvals')
        print(f"[TEST 6b] Admin /retailers/distributor-approvals page: HTTP {r_dist_page.status_code}")

        r_sd_page = await admin_client.get('/retailers/sd-approvals')
        print(f"[TEST 6c] Admin /retailers/sd-approvals page: HTTP {r_sd_page.status_code}")

        r_ret_page = await admin_client.get('/retailers')
        print(f"[TEST 6d] Admin /retailers page: HTTP {r_ret_page.status_code}")

asyncio.run(main())
