import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_organization_hierarchy_and_transfers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Platform Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Fetch Companies to get default Company ID
        comp_res = await ac.get("/api/v1/companies", headers=headers)
        assert comp_res.status_code == 200
        companies = comp_res.json()["items"]
        assert len(companies) > 0
        company_id = companies[0]["public_id"]

        # 3. Create Regional Manager (RM)
        rand_id = random.randint(1000, 9999)
        rm_payload = {
            "employee_code": f"RM_{rand_id}",
            "full_name": f"Regional Mgr {rand_id}",
            "mobile": f"9876{rand_id:06d}",
            "email": f"rm_{rand_id}@pay2pay.com",
            "designation": "Regional Operations Manager",
            "company_id": company_id
        }
        rm_res = await ac.post("/api/v1/organization/rms", json=rm_payload, headers=headers)
        assert rm_res.status_code == 200, f"RM creation failed: {rm_res.text}"
        rm_data = rm_res.json()
        rm_id = rm_data["public_id"]

        # 4. Create Super Distributor (SD) mapped to RM
        sd_payload = {
            "business_name": f"South SD {rand_id} Enterprises",
            "owner_name": "Suresh Kumar",
            "mobile": f"9765{rand_id:06d}",
            "email": f"sd_{rand_id}@pay2pay.com",
            "state": "Tamil Nadu",
            "city": "Chennai",
            "address": "12 Mount Road",
            "pincode": "600002",
            "mapped_rm_id": rm_id,
            "company_id": company_id
        }
        sd_res = await ac.post("/api/v1/organization/super-distributors", json=sd_payload, headers=headers)
        assert sd_res.status_code == 200, f"SD creation failed: {sd_res.text}"
        sd_data = sd_res.json()
        sd_id = sd_data["public_id"]

        # 5. Create Distributor mapped to SD
        d_payload = {
            "business_name": f"Retail Dist {rand_id} Agency",
            "owner_name": "Ramesh Kumar",
            "mobile": f"9654{rand_id:06d}",
            "email": f"dist_{rand_id}@pay2pay.com",
            "state": "Tamil Nadu",
            "city": "Chennai",
            "address": "45 T-Nagar",
            "pincode": "600017",
            "mapped_super_distributor_id": sd_id,
            "company_id": company_id
        }
        d_res = await ac.post("/api/v1/organization/distributors", json=d_payload, headers=headers)
        assert d_res.status_code == 200, f"Distributor creation failed: {d_res.text}"
        dist_data = d_res.json()

        # 6. Fetch Organization Tree
        tree_res = await ac.get("/api/v1/organization/tree", headers=headers)
        assert tree_res.status_code == 200
        tree = tree_res.json()
        assert len(tree) > 0

        # 7. Fetch Organization Telemetry Metrics
        dash_res = await ac.get("/api/v1/organization/dashboard/metrics", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert dash_data["total_rms"] >= 1
        assert dash_data["total_super_distributors"] >= 1
        assert dash_data["total_distributors"] >= 1
