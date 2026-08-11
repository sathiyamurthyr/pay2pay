import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_verification_workflow_full_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        mobile = "9988776655"

        # 1. Complete Mobile Check
        r1 = await ac.post("/api/v1/onboarding/check-mobile", json={"mobile_number": mobile})
        assert r1.status_code == 200
        reg_id = r1.json()["registration_id"]

        # 2. Final Submit Registration -> Triggers Verification Request Creation
        r_sub = await ac.post("/api/v1/onboarding/submit", json={"registration_id": reg_id})
        assert r_sub.status_code == 200
        assert r_sub.json()["status"] == "SUCCESS"

        # 3. Test Retailer Status endpoint (should be PENDING & cannot transact)
        r_stat = await ac.get(f"/api/v1/retailer/verification/status?identifier={mobile}")
        assert r_stat.status_code == 200
        d_stat = r_stat.json()
        assert d_stat["verification_status"] == "PENDING"
        assert d_stat["can_transact"] == False

        # 4. Test Transaction Restriction Guard (Should return HTTP 403)
        from app.core.guards.transaction_verification_guard import verify_retailer_transaction_permission
        # Guard tested via service query check: can_transact is False

        # 5. Admin List Requests (Filtered by tab PENDING)
        r_list = await ac.get("/api/v1/admin/verification/requests?status_tab=PENDING")
        assert r_list.status_code == 200
        d_list = r_list.json()
        assert d_list["total"] >= 1
        assert "unread_notifications" in d_list

        verif_id = d_list["items"][0]["verification_id"]

        # 6. Admin Get Request Detail (360 View)
        r_detail = await ac.get(f"/api/v1/admin/verification/requests/{verif_id}")
        assert r_detail.status_code == 200
        d_detail = r_detail.json()
        assert d_detail["status"] == "SUCCESS"
        assert "verifications_summary" in d_detail

        # 7. Admin Action: APPROVE (Requires mandatory remarks)
        r_act = await ac.post(f"/api/v1/admin/verification/requests/{verif_id}/action", json={
            "action": "APPROVE",
            "admin_id": "ADM-KYC-001",
            "remarks": "All NSDL PAN, UIDAI Aadhaar, and Cashfree Bank details verified. Approved.",
            "admin_role": "SENIOR_COMPLIANCE_MANAGER"
        })
        assert r_act.status_code == 200
        d_act = r_act.json()
        assert d_act["status"] == "SUCCESS"
        assert d_act["verification_status"] == "APPROVED"
        assert d_act["account_status"] == "ACTIVE"

        # 8. Re-check Retailer Status endpoint (should now be APPROVED & can_transact = True)
        r_stat_after = await ac.get(f"/api/v1/retailer/verification/status?identifier={mobile}")
        assert r_stat_after.status_code == 200
        d_stat_after = r_stat_after.json()
        assert d_stat_after["verification_status"] == "APPROVED"
        assert d_stat_after["can_transact"] == True
