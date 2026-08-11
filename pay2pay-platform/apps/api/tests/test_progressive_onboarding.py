import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_progressive_onboarding_full_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        mobile = "9972334411"

        # 1. Step 1: Check Mobile
        r1 = await ac.post("/api/v1/onboarding/check-mobile", json={"mobile_number": mobile})
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["status"] in ["NEW_DRAFT", "RESUME_DRAFT"]
        reg_id = d1["registration_id"]

        # 2. Step 2: Verify Mobile OTP
        r2 = await ac.post("/api/v1/onboarding/verify-mobile-otp", json={"registration_id": reg_id, "otp_code": "778899"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "SUCCESS"

        # 3. Step 3: Check Email
        r3 = await ac.post("/api/v1/onboarding/check-email", json={"registration_id": reg_id, "email": "test.retailer@pay2pay.in"})
        assert r3.status_code == 200
        assert r3.json()["status"] == "SUCCESS"

        # 4. Step 4: Verify Email OTP
        r4 = await ac.post("/api/v1/onboarding/verify-email-otp", json={"registration_id": reg_id, "otp_code": "556677"})
        assert r4.status_code == 200
        assert r4.json()["status"] == "SUCCESS"

        # 5. Step 5: Create Credentials
        r5 = await ac.post("/api/v1/onboarding/create-credentials", json={"registration_id": reg_id, "password": "Retailer#2026", "mpin": "1234"})
        assert r5.status_code == 200
        assert r5.json()["status"] == "SUCCESS"

        # 6. Step 6: Verify Individual PAN (4th letter 'P' -> decision engine routes to step 7, skipping GST)
        r6 = await ac.post("/api/v1/onboarding/verify-pan", json={"registration_id": reg_id, "pan_number": "ABCPE1234F"})
        assert r6.status_code == 200
        d6 = r6.json()
        assert d6["status"] == "SUCCESS"
        assert d6["is_business"] == False
        assert d6["next_step"] == 7

        # 7. Step 7: Aadhaar OTP Send & Verify
        r7a = await ac.post("/api/v1/onboarding/send-aadhaar-otp", json={"registration_id": reg_id, "aadhaar_number": "123456789012"})
        assert r7a.status_code == 200
        ref_id = r7a.json()["ref_id"]

        r7b = await ac.post("/api/v1/onboarding/verify-aadhaar-otp", json={"registration_id": reg_id, "ref_id": ref_id, "otp_code": "778899"})
        assert r7b.status_code == 200
        assert r7b.json()["status"] == "SUCCESS"

        # 8. Step 8: Verify Bank (Reverse Penny Drop)
        r8 = await ac.post("/api/v1/onboarding/verify-bank", json={
            "registration_id": reg_id,
            "account_number": "50100012345678",
            "ifsc": "HDFC0001234",
            "name": "SATHIYA MURTHY"
        })
        assert r8.status_code == 200
        assert r8.json()["status"] == "SUCCESS"

        # 9. Step 9: Save Shop Details
        r9 = await ac.post("/api/v1/onboarding/shop-details", json={
            "registration_id": reg_id,
            "shop_name": "Sri Venkateswara Telecom",
            "category": "Recharge & FinTech",
            "years_in_business": 5
        })
        assert r9.status_code == 200
        assert r9.json()["status"] == "SUCCESS"

        # 10. Step 10: Save Shop Address
        r10 = await ac.post("/api/v1/onboarding/shop-address", json={
            "registration_id": reg_id,
            "street": "100 GST Road",
            "city": "Chennai",
            "district": "Chengalpattu",
            "state": "Tamil Nadu",
            "pincode": "600045"
        })
        assert r10.status_code == 200
        assert r10.json()["status"] == "SUCCESS"

        # 11. Step 11: Upload Document
        r11 = await ac.post("/api/v1/onboarding/upload-document", json={
            "registration_id": reg_id,
            "doc_type": "PAN",
            "file_name": "pan_card.jpg",
            "file_url": "https://cdn.pay2pay.in/docs/pan.jpg"
        })
        assert r11.status_code == 200
        assert r11.json()["status"] == "SUCCESS"

        # 12. Step 12: Upload Video
        r12 = await ac.post("/api/v1/onboarding/upload-video", json={
            "registration_id": reg_id,
            "video_url": "https://cdn.pay2pay.in/videos/verification.mp4",
            "duration_seconds": 15
        })
        assert r12.status_code == 200
        assert r12.json()["status"] == "SUCCESS"

        # 13. Test Resume Draft Endpoint
        r_resume = await ac.get(f"/api/v1/onboarding/resume/{mobile}")
        assert r_resume.status_code == 200
        assert r_resume.json()["registration_id"] == reg_id

        # 14. Final Submit
        r_sub = await ac.post("/api/v1/onboarding/submit", json={"registration_id": reg_id})
        assert r_sub.status_code == 200
        d_sub = r_sub.json()
        assert d_sub["status"] == "SUCCESS"
        assert "application_ref" in d_sub
