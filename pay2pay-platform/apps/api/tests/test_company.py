import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_company_onboarding_and_dashboard():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Platform Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Company Dashboard Metrics
        dash_res = await ac.get("/api/v1/companies/dashboard/metrics", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert "total_companies" in dash_data
        assert "active_companies" in dash_data

        # 3. Onboard a New Enterprise Company with valid GST/PAN formats
        rand_num = random.randint(1000, 9999)
        onboard_payload = {
            "company_code": f"APEX_{rand_num}",
            "company_name": f"Apex Retail {rand_num} Private Limited",
            "legal_name": f"Apex Retail {rand_num} Private Limited",
            "display_name": f"Apex Retail {rand_num}",
            "tenant_code": f"TENANT_{rand_num}",
            "company_type": "PRIVATE_LIMITED",
            "gst_number": f"27ABCDE{rand_num}A1Z5",
            "pan_number": f"ABCDE{rand_num}A",
            "cin_number": f"U72900MH2026PTC{rand_num}99",
            "contact": {
                "primary_contact": "Rajesh Sharma",
                "designation": "Director",
                "mobile": "9876543210",
                "email": f"rajesh_{rand_num}@apexretail.com"
            },
            "address": {
                "state": "Maharashtra",
                "city": "Mumbai",
                "address": "101 Apex Tower, Lower Parel",
                "pincode": "400013"
            },
            "bank": {
                "settlement_bank_name": "ICICI Bank",
                "account_holder": f"Apex Retail {rand_num} Private Limited",
                "account_number": f"00040500{rand_num}",
                "ifsc": "ICIC0000004"
            },
            "admin_full_name": "Apex Admin",
            "admin_email": f"admin_{rand_num}@apexretail.com",
            "admin_password": "ApexPassword!321"
        }

        onboard_res = await ac.post("/api/v1/companies", json=onboard_payload, headers=headers)
        assert onboard_res.status_code == 200, f"Onboarding failed: {onboard_res.text}"
        comp_data = onboard_res.json()
        assert comp_data["company_code"] == f"APEX_{rand_num}"
        assert comp_data["status"] == "PENDING_APPROVAL"

        company_id = comp_data["public_id"]

        # 4. Approve Company Onboarding
        approve_res = await ac.post(f"/api/v1/companies/{company_id}/approve", json={"comments": "Approved after document check"}, headers=headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "ACTIVE"

        # 5. List Companies (Enterprise Grid)
        list_res = await ac.get("/api/v1/companies", headers=headers)
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 2
