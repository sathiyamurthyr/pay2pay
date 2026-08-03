import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_payout_engine_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Retailer & Wallet IDs
        ret_res = await ac.get("/api/v1/retailers", headers=headers)
        retailers = ret_res.json()["items"]
        retailer_id = retailers[0]["id"]

        wal_res = await ac.get("/api/v1/wallet-ledger/wallets", headers=headers)
        wallets = wal_res.json()
        wallet_id = wallets[0]["public_id"]

        # 3. Create Payout Request
        create_res = await ac.post("/api/v1/payouts/requests", json={
            "wallet_id": wallet_id,
            "retailer_id": retailer_id,
            "amount": 10000.0,
            "purpose": "MERCHANT_SETTLEMENT_PAYOUT",
            "priority": "NORMAL"
        }, headers=headers)
        assert create_res.status_code == 200, f"Payout request failed: {create_res.text}"
        p_data = create_res.json()
        payout_id = p_data["public_id"]
        assert p_data["status"] == "PENDING_APPROVAL"
        assert p_data["net_amount"] < 10000.0  # Net after charges and GST

        # 4. Approve Payout (Maker-Checker)
        app_res = await ac.post(f"/api/v1/payouts/requests/{payout_id}/approve", json={
            "decision": "APPROVED",
            "comments": "Verified and approved by Compliance"
        }, headers=headers)
        assert app_res.status_code == 200
        assert app_res.json()["status"] == "APPROVED"

        # 5. Process Bank Payout (Dispatch IMPS & Generate UTR)
        proc_res = await ac.post(f"/api/v1/payouts/requests/{payout_id}/process", json={
            "gateway_code": "HDFC_IMPS",
            "mode": "IMPS"
        }, headers=headers)
        assert proc_res.status_code == 200, f"Bank process failed: {proc_res.text}"
        res_data = proc_res.json()
        assert res_data["status"] == "SUCCESS"
        assert "utr_number" in res_data

        # 6. List Integrated Bank Gateways
        gw_res = await ac.get("/api/v1/payouts/gateways", headers=headers)
        assert gw_res.status_code == 200
        assert len(gw_res.json()) >= 3

        # 7. Fetch Telemetry Metrics
        m_res = await ac.get("/api/v1/payouts/dashboard/metrics", headers=headers)
        assert m_res.status_code == 200
        metrics = m_res.json()
        assert metrics["successful_payouts_count"] >= 1
