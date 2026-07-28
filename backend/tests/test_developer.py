import random
import pytest
from datetime import date
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_developer_api_key_webhook_and_chargeback():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Retailer for dispute testing
        ret_res = await ac.get("/api/v1/retailers", headers=headers)
        retailers = ret_res.json()["items"]
        retailer_id = retailers[0]["public_id"]

        # 3. Create Developer API Key
        rand_k = random.randint(1000, 9999)
        key_res = await ac.post("/api/v1/developer/keys", json={
            "key_name": f"Production Service Key {rand_k}",
            "scopes": "transactions.read,settlements.write"
        }, headers=headers)
        assert key_res.status_code == 200, f"API key creation failed: {key_res.text}"
        k_data = key_res.json()
        assert k_data["client_id"].startswith("pk_live_")
        assert k_data["secret_key_raw"].startswith("sk_live_sec_")

        # 4. Register Webhook Subscription
        wh_res = await ac.post("/api/v1/developer/webhooks", json={
            "target_url": f"https://api.partner{rand_k}.com/webhooks/pay2pay",
            "events": "transaction.created,settlement.completed"
        }, headers=headers)
        assert wh_res.status_code == 200, f"Webhook subscription failed: {wh_res.text}"
        w_data = wh_res.json()
        assert w_data["secret_key"].startswith("whsec_")

        # 5. File Chargeback Dispute Case
        cb_res = await ac.post("/api/v1/developer/disputes", json={
            "case_reference": f"CB-2026-{rand_k}",
            "transaction_id": f"TXN2026{rand_k}",
            "retailer_id": retailer_id,
            "dispute_amount": 15000.0,
            "reason_code": "UNAUTHORIZED_TRANSACTION",
            "due_date": str(date.today())
        }, headers=headers)
        assert cb_res.status_code == 200, f"Chargeback filing failed: {cb_res.text}"
        cb_data = cb_res.json()
        assert cb_data["status"] == "OPEN"

        # 6. Fetch Developer Dashboard Metrics
        metrics_res = await ac.get("/api/v1/developer/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        m_data = metrics_res.json()
        assert m_data["total_api_keys"] >= 1
        assert m_data["active_webhooks"] >= 1
