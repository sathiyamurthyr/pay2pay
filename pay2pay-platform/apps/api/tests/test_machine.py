import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_machine_registration_telemetry_ping_and_metrics():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Company and Retailer IDs
        comp_res = await ac.get("/api/v1/companies", headers=headers)
        company_id = comp_res.json()["items"][0]["public_id"]

        ret_res = await ac.get("/api/v1/retailers", headers=headers)
        retailers = ret_res.json()["items"]
        if len(retailers) == 0:
            # Onboard retailer for test setup
            rand_id = random.randint(1000, 9999)
            dist_res = await ac.get("/api/v1/organization/distributors", headers=headers)
            dist_id = dist_res.json()["items"][0]["public_id"]

            r_res = await ac.post("/api/v1/retailers", json={
                "retailer_code": f"RET_M_{rand_id}",
                "store_name": f"Store Test {rand_id}",
                "legal_name": "Store Legal",
                "owner_name": "Owner",
                "mapped_distributor_id": dist_id,
                "company_id": company_id,
                "primary_contact": "Owner",
                "mobile": f"9432{rand_id:06d}",
                "email": f"retm_{rand_id}@pay2pay.com",
                "state": "Tamil Nadu",
                "city": "Chennai",
                "address": "Anna Salai",
                "pincode": "600002",
                "settlement_bank_name": "HDFC",
                "account_holder": "Owner",
                "account_number": "50100112233",
                "ifsc": "HDFC0001234"
            }, headers=headers)
            retailer_id = r_res.json()["public_id"]
        else:
            retailer_id = retailers[0]["public_id"]

        # 3. Register POS Machine
        rand_pos = random.randint(1000, 9999)
        machine_payload = {
            "serial_number": f"SN_PAX_{rand_pos}",
            "tid": f"TID_{rand_pos:04d}01",
            "mid": f"MID_{rand_pos:04d}9999",
            "pos_model": "Pax A920",
            "machine_type": "ANDROID_POS",
            "os_version": "Android 11",
            "firmware_version": "v2.4.1",
            "sim_iccid": f"899100123456{rand_pos:04d}",
            "telecom_provider": "Airtel M2M",
            "mapped_retailer_id": retailer_id,
            "company_id": company_id
        }

        m_res = await ac.post("/api/v1/machines", json=machine_payload, headers=headers)
        assert m_res.status_code == 200, f"POS Machine registration failed: {m_res.text}"
        m_data = m_res.json()
        machine_id = m_data["public_id"]
        assert m_data["status"] == "ACTIVE"

        # 4. Get Machine Details & Provisioned DUKPT Key
        details_res = await ac.get(f"/api/v1/machines/{machine_id}", headers=headers)
        assert details_res.status_code == 200
        d_json = details_res.json()
        assert d_json["machine"]["serial_number"] == f"SN_PAX_{rand_pos}"
        assert d_json["key_profile"]["encryption"] == "AES-256"

        # 5. Process Telemetry Ping Heartbeat
        ping_res = await ac.post(f"/api/v1/machines/{machine_id}/telemetry", json={
            "battery_percentage": 88,
            "network_type": "4G",
            "signal_strength": -68,
            "app_version": "v1.8.2",
            "txns_processed": 14,
            "volume_processed": 28500.0
        }, headers=headers)
        assert ping_res.status_code == 200

        # 6. Fetch Machine Dashboard Telemetry Metrics
        metrics_res = await ac.get("/api/v1/machines/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_json = metrics_res.json()
        assert m_json["total_machines"] >= 1
        assert m_json["active_machines"] >= 1
