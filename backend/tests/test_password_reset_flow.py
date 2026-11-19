import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_password_reset_request_and_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Request Password Reset for valid mobile
        req_res = await ac.post(
            "/api/v1/auth/enterprise/password-reset/request",
            json={"mobile_number": "7013914767"}
        )
        assert req_res.status_code == 200
        req_data = req_res.json()
        assert req_data["status"] == "SUCCESS"
        assert "masked_email" in req_data
        assert "Password Reset Link Sent" in req_data["title"]

        # 2. Test Invalid Token verification
        verify_invalid = await ac.get(
            "/api/v1/auth/enterprise/password-reset/verify?token=invalid_dummy_token_123"
        )
        assert verify_invalid.status_code == 400
        inv_data = verify_invalid.json()
        assert "expired" in inv_data["detail"].lower() or "invalid" in inv_data["detail"].lower()

@pytest.mark.asyncio
async def test_upload_video_file_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a draft first
        r1 = await ac.post("/api/v1/onboarding/check-mobile", json={"mobile_number": "9176669988"})
        reg_id = r1.json()["registration_id"]

        # Test step 12 file upload endpoint
        files = {
            "video": ("kyc_video.webm", b"dummy video content", "video/webm")
        }
        data = {
            "registration_id": reg_id,
            "duration_seconds": "15",
            "script_text": "I confirm registration"
        }
        res = await ac.post("/api/v1/onboarding/upload-video-file", data=data, files=files)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
