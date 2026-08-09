import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_captcha_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/auth/enterprise/captcha")
        assert response.status_code == 200
        data = response.json()
        assert "captcha_token" in data
        assert "captcha_code" in data
        assert "captcha_svg" in data

@pytest.mark.asyncio
async def test_risk_assessment_evaluation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "mobile_number": "9176669426",
            "public_ip": "1.2.3.4",
            "device_fingerprint": "FP-TEST-12345",
            "vpn_detected": False,
            "proxy_detected": False,
            "tor_detected": False
        }
        response = await ac.post("/api/v1/auth/enterprise/risk-check", json=payload)
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "SUCCESS"
        assert "risk_score" in res["data"]
        assert "recommended_action" in res["data"]

@pytest.mark.asyncio
async def test_enterprise_password_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "mobile_number": "9176669426",
            "password": "Retailer#2026",
            "accepted_terms": True,
            "telemetry": {
                "fingerprint": {"hash": "FP-TEST-HASH-123"},
                "browser": {"name": "Chrome", "version": "120.0"}
            }
        }
        response = await ac.post("/api/v1/auth/enterprise/login-password", json=payload)
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "SUCCESS"
        assert "access_token" in res["data"]
        assert "session_id" in res["data"]

@pytest.mark.asyncio
async def test_otp_send_and_verify():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        send_res = await ac.post("/api/v1/auth/enterprise/login-otp/send", json={"mobile_number": "9176669426", "channel": "WHATSAPP"})
        assert send_res.status_code == 200
        s_data = send_res.json()
        assert s_data["status"] == "SUCCESS"

        verify_res = await ac.post("/api/v1/auth/enterprise/login-otp/verify", json={"mobile_number": "9176669426", "otp_code": "778899"})
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["status"] == "SUCCESS"
        assert "access_token" in v_data["data"]
