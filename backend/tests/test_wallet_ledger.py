import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_wallet_ledger_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Enterprise Wallet
        owner_id = str(uuid.uuid4())
        create_res = await ac.post("/api/v1/wallet-ledger/wallets", json={
            "wallet_type": "RETAILER",
            "owner_type": "RETAILER",
            "owner_id": owner_id,
            "initial_balance": 50000.0
        }, headers=headers)
        assert create_res.status_code == 200, f"Wallet creation failed: {create_res.text}"
        w_data = create_res.json()
        wallet_id = w_data["public_id"]
        assert w_data["status"] == "ACTIVE"
        assert w_data["current_balance"] == 50000.0

        # 3. List Enterprise Wallets
        list_res = await ac.get("/api/v1/wallet-ledger/wallets", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 4. Perform Balance Adjustment (Credit)
        adj_res = await ac.post(f"/api/v1/wallet-ledger/wallets/{wallet_id}/adjust", json={
            "adjustment_type": "CREDIT",
            "amount": 2500.0,
            "reason": "Promotional incentive credit"
        }, headers=headers)
        assert adj_res.status_code == 200

        # 5. Freeze & Unfreeze Wallet
        freeze_res = await ac.post(f"/api/v1/wallet-ledger/wallets/{wallet_id}/freeze", json={
            "action": "FREEZE",
            "reason": "Risk hold"
        }, headers=headers)
        assert freeze_res.status_code == 200
        assert freeze_res.json()["status"] == "FROZEN"

        unfreeze_res = await ac.post(f"/api/v1/wallet-ledger/wallets/{wallet_id}/freeze", json={
            "action": "UNFREEZE",
            "reason": "Risk cleared"
        }, headers=headers)
        assert unfreeze_res.status_code == 200
        assert unfreeze_res.json()["status"] == "ACTIVE"

        # 6. Fetch Chart of Accounts
        coa_res = await ac.get("/api/v1/wallet-ledger/chart-of-accounts", headers=headers)
        assert coa_res.status_code == 200
        assert len(coa_res.json()) >= 4

        # 7. Trigger Automated Reconciliation
        rec_res = await ac.post("/api/v1/wallet-ledger/reconcile", headers=headers)
        assert rec_res.status_code == 200
        assert rec_res.json()["status"] == "MATCHED"

        # 8. Fetch Telemetry Metrics
        m_res = await ac.get("/api/v1/wallet-ledger/dashboard/metrics", headers=headers)
        assert m_res.status_code == 200
        metrics = m_res.json()
        assert metrics["total_wallets_count"] >= 1
