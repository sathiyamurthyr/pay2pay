import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_settlement_transaction_ingest_mdr_split_batch_and_payout():
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
            rand_id = random.randint(1000, 9999)
            dist_res = await ac.get("/api/v1/organization/distributors", headers=headers)
            dist_id = dist_res.json()["items"][0]["public_id"]

            r_res = await ac.post("/api/v1/retailers", json={
                "retailer_code": f"RET_S_{rand_id}",
                "store_name": f"Store Settlement {rand_id}",
                "legal_name": "Store Legal",
                "owner_name": "Owner",
                "mapped_distributor_id": dist_id,
                "company_id": company_id,
                "primary_contact": "Owner",
                "mobile": f"9432{rand_id:06d}",
                "email": f"rets_{rand_id}@pay2pay.com",
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

        # 3. Ingest Swipe Transaction
        rand_t = random.randint(10000, 99999)
        txn_res = await ac.post("/api/v1/settlements/transactions", json={
            "transaction_id": f"TXN2026{rand_t}",
            "rrn": f"RRN2026{rand_t:06d}",
            "auth_code": f"AUTH{rand_t}",
            "amount": 10000.0,
            "payment_mode": "VISA_CREDIT",
            "card_number_masked": "4111xxxxxx1111",
            "mapped_tid": f"TID_{rand_t:06d}",
            "mapped_retailer_id": retailer_id,
            "company_id": company_id
        }, headers=headers)

        assert txn_res.status_code == 200, f"Transaction ingestion failed: {txn_res.text}"
        t_data = txn_res.json()
        assert t_data["amount"] == 10000.0
        assert t_data["fee_split"]["mdr_fee"] == 150.0  # 1.5% of 10,000
        assert t_data["fee_split"]["net_retailer_payout"] == 9823.0  # 10000 - (150 + 27 GST)

        # 4. Generate Settlement Batch
        batch_res = await ac.post("/api/v1/settlements/batches/generate", json={
            "company_id": company_id
        }, headers=headers)
        assert batch_res.status_code == 200, f"Settlement batch generation failed: {batch_res.text}"
        b_data = batch_res.json()
        assert b_data["status"] == "SETTLED"
        assert b_data["gross_volume"] >= 10000.0

        # 5. Process Bank Payout
        payout_res = await ac.post("/api/v1/settlements/payouts/process", json={
            "retailer_id": retailer_id,
            "amount": 5000.0,
            "payout_method": "IMPS",
            "bank_account_number": "50100112233",
            "ifsc": "HDFC0001234"
        }, headers=headers)
        assert payout_res.status_code == 200, f"Bank payout failed: {payout_res.text}"
        p_data = payout_res.json()
        assert p_data["status"] == "SUCCESS"
        assert p_data["utr_number"] is not None

        # 6. Fetch Settlement Telemetry Metrics
        metrics_res = await ac.get("/api/v1/settlements/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_data = metrics_res.json()
        assert m_data["total_processed_volume"] >= 10000.0
        assert m_data["total_settled_amount"] >= 10000.0
