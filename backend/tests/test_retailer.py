import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_retailer_onboarding_approval_and_telemetry():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Company and Distributor IDs
        comp_res = await ac.get("/api/v1/companies", headers=headers)
        company_id = comp_res.json()["items"][0]["public_id"]

        dist_res = await ac.get("/api/v1/organization/distributors", headers=headers)
        distributors = dist_res.json()["items"]
        if len(distributors) == 0:
            # Create RM, SD, and Distributor for test setup
            rand_id = random.randint(1000, 9999)
            rm_res = await ac.post("/api/v1/organization/rms", json={
                "employee_code": f"RM_TEST_{rand_id}",
                "full_name": f"RM Test {rand_id}",
                "mobile": f"9876{rand_id:06d}",
                "email": f"rmtest_{rand_id}@pay2pay.com",
                "company_id": company_id
            }, headers=headers)
            rm_id = rm_res.json()["public_id"]

            sd_res = await ac.post("/api/v1/organization/super-distributors", json={
                "business_name": f"SD Test {rand_id}",
                "owner_name": "SD Owner",
                "mobile": f"9765{rand_id:06d}",
                "email": f"sdtest_{rand_id}@pay2pay.com",
                "state": "Tamil Nadu",
                "city": "Chennai",
                "address": "Address",
                "pincode": "600001",
                "mapped_rm_id": rm_id,
                "company_id": company_id
            }, headers=headers)
            sd_id = sd_res.json()["public_id"]

            d_res = await ac.post("/api/v1/organization/distributors", json={
                "business_name": f"Dist Test {rand_id}",
                "owner_name": "Dist Owner",
                "mobile": f"9654{rand_id:06d}",
                "email": f"disttest_{rand_id}@pay2pay.com",
                "state": "Tamil Nadu",
                "city": "Chennai",
                "address": "Address",
                "pincode": "600001",
                "mapped_super_distributor_id": sd_id,
                "company_id": company_id
            }, headers=headers)
            distributor_id = d_res.json()["public_id"]
        else:
            distributor_id = distributors[0]["public_id"]

        # 3. Onboard Retailer
        rand_ret = random.randint(1000, 9999)
        retailer_payload = {
            "retailer_code": f"RET_{rand_ret}",
            "store_name": f"Sri Venkateswara Mobile & Supermarket {rand_ret}",
            "legal_name": f"Sri Venkateswara Traders Pvt Ltd {rand_ret}",
            "owner_name": "Venkatesh Rao",
            "business_category": "Electronics & Mobiles",
            "store_type": "BRICK_AND_MORTAR",
            "mapped_distributor_id": distributor_id,
            "company_id": company_id,

            "primary_contact": "Venkatesh Rao",
            "mobile": f"9543{rand_ret:06d}",
            "email": f"ret_{rand_ret}@pay2pay.com",
            "state": "Tamil Nadu",
            "city": "Chennai",
            "address": "78 Anna Salai",
            "pincode": "600002",

            "settlement_bank_name": "HDFC Bank",
            "account_holder": "Sri Venkateswara Traders",
            "account_number": f"5010023456{rand_ret}",
            "ifsc": "HDFC0001234",

            "pan_number": "ABCDE1234F",
            "gst_number": "33AAAAA0000A1Z5",
            "aadhaar_number": "123456789012",

            "daily_transaction_limit": 200000.0,
            "single_transaction_limit": 50000.0
        }

        onboard_res = await ac.post("/api/v1/retailers", json=retailer_payload, headers=headers)
        assert onboard_res.status_code == 200, f"Retailer onboarding failed: {onboard_res.text}"
        ret_data = onboard_res.json()
        retailer_id = ret_data["public_id"]
        assert ret_data["status"] == "PENDING_APPROVAL"

        # 4. Get Retailer Details
        details_res = await ac.get(f"/api/v1/retailers/{retailer_id}", headers=headers)
        assert details_res.status_code == 200
        d_json = details_res.json()
        assert d_json["retailer"]["retailer_code"] == f"RET_{rand_ret}"
        assert len(d_json["banks"]) > 0

        # 5. Approve Retailer
        approve_res = await ac.post(f"/api/v1/retailers/{retailer_id}/approve", json={
            "action": "APPROVE",
            "comments": "Verified KYC documents and bank account"
        }, headers=headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "ACTIVE"

        # 6. Fetch Retailer Dashboard Telemetry Metrics
        metrics_res = await ac.get("/api/v1/retailers/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_json = metrics_res.json()
        assert m_json["total_retailers"] >= 1
        assert m_json["active_retailers"] >= 1
