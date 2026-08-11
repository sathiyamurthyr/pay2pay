import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_fraud_risk_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Fraud Dashboard Metrics
        metrics_res = await ac.get("/api/v1/fraud/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        assert metrics_res.json()["today_alerts"] >= 0

        # 3. Create Fraud Detection Rule
        rule_res = await ac.post("/api/v1/fraud/rules", headers=headers, json={
            "rule_name": "High Settlement Velocity Threshold (> ₹300,000)",
            "entity_type": "SETTLEMENT",
            "category": "VELOCITY",
            "threshold_value": 300000.0,
            "action": "HOLD"
        })
        assert rule_res.status_code == 200
        rule_data = rule_res.json()
        assert rule_data["status"] == "ACTIVE"
        rule_id = rule_data["public_id"]

        # 4. Toggle Fraud Rule
        toggle_res = await ac.post(f"/api/v1/fraud/rules/{rule_id}/toggle", headers=headers)
        assert toggle_res.status_code == 200
        assert toggle_res.json()["status"] == "INACTIVE"

        # 5. List Fraud Cases
        cases_res = await ac.get("/api/v1/fraud/cases", headers=headers)
        assert cases_res.status_code == 200
        cases = cases_res.json()
        assert len(cases) >= 1
        case_id = cases[0]["public_id"]

        # 6. Apply Decision on Case
        dec_res = await ac.post(f"/api/v1/fraud/cases/{case_id}/decision", headers=headers, json={
            "decision_action": "FREEZE_WALLET",
            "findings_text": "Confirmed multiple rapid payout attempts from unverified IP range."
        })
        assert dec_res.status_code == 200
        assert dec_res.json()["status"] == "RESOLVED"

        # 7. Create Blacklist Entry
        blk_res = await ac.post("/api/v1/fraud/blacklist", headers=headers, json={
            "item_type": "PAN",
            "item_value": "XYZPD9876K",
            "reason": "Regulatory AML watchlist flag"
        })
        assert blk_res.status_code == 200
        assert blk_res.json()["status"] == "ACTIVE"

        # 8. Real-Time Fraud Evaluation Screening
        eval_res = await ac.post("/api/v1/fraud/evaluate", headers=headers, json={
            "entity_type": "SETTLEMENT",
            "entity_id": str(uuid.uuid4()),
            "amount": 750000.0,
            "ip_address": "127.0.0.1"
        })
        assert eval_res.status_code == 200
        assert eval_res.json()["risk_band"] == "HIGH"
