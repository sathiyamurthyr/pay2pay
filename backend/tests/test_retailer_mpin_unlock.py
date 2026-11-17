import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_retailer_mpin_unlock_end_to_end():
    tenant_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
    company_id = uuid.UUID("3778f4e4-bb6e-4eb1-8a12-762f24591ebc")
    admin_user_id = uuid.UUID("3ad7e60a-6d22-4d6d-ba32-91c52402296a")

    admin_token = create_access_token(
        subject=str(admin_user_id),
        tenant_id=str(tenant_id),
        company_id=str(company_id),
        roles=["SUPER_ADMIN", "ADMIN"]
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch an existing retailer to test with
        ret_list_res = await ac.get("/api/v1/retailers?page_size=5", headers=admin_headers)
        assert ret_list_res.status_code == 200, f"Failed to list retailers: {ret_list_res.text}"
        ret_items = ret_list_res.json()["items"]
        assert len(ret_items) > 0, "No retailers found in database"
        test_retailer = ret_items[0]
        retailer_id = test_retailer["public_id"]

        # Ensure retailer starts unlocked
        unlock_init = await ac.post(f"/api/v1/admin/retailers/{retailer_id}/mpin/unlock", json={
            "reason": "Test setup reset"
        }, headers=admin_headers)
        assert unlock_init.status_code == 200, f"Unlock init failed: {unlock_init.status_code} {unlock_init.text}"

        # Set known initial MPIN (e.g. 2468)
        init_verify = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "2468"
        })
        assert init_verify.status_code == 200, f"Init verify failed: {init_verify.text}"

        # 2. Check MPIN Status as Admin
        status_res = await ac.get(f"/api/v1/admin/retailers/{retailer_id}/mpin-status", headers=admin_headers)
        assert status_res.status_code == 200, f"Get status failed: {status_res.text}"
        st_data = status_res.json()
        assert st_data["mpin_locked"] is False
        assert st_data["mpin_failed_attempts"] == 0
        assert st_data["mpin_max_attempts"] == 5

        # 3. Simulate Retailer entering Wrong MPINs
        # 1st wrong attempt
        v1 = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "9999"
        })
        assert v1.status_code == 400
        assert "4 attempt(s) remaining" in v1.text

        # 2nd wrong attempt
        v2 = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "9999"
        })
        assert v2.status_code == 400
        assert "3 attempt(s) remaining" in v2.text

        # 3rd wrong attempt
        v3 = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "9999"
        })
        assert v3.status_code == 400
        assert "2 attempt(s) remaining" in v3.text

        # 4th wrong attempt
        v4 = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "9999"
        })
        assert v4.status_code == 400
        assert "1 attempt(s) remaining" in v4.text

        # 5th wrong attempt -> Reaches max 5 attempts -> Lockout!
        v5 = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "9999"
        })
        assert v5.status_code == 423
        assert "locked" in v5.text.lower()

        # 4. Any further attempt while locked is strictly rejected with 423 (even with correct MPIN)
        v_locked = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "2468"
        })
        assert v_locked.status_code == 423
        assert "locked" in v_locked.text.lower()

        # 5. Check MPIN Status as Admin -> Confirms Locked State
        locked_status_res = await ac.get(f"/api/v1/admin/retailers/{retailer_id}/mpin-status", headers=admin_headers)
        assert locked_status_res.status_code == 200
        locked_st = locked_status_res.json()
        assert locked_st["mpin_locked"] is True
        assert locked_st["mpin_failed_attempts"] == 5
        assert locked_st["mpin_locked_at"] is not None
        assert len(locked_st["audit_history"]) >= 2

        # 6. Unauthorized / Non-Admin user cannot unlock
        unauth_res = await ac.post(f"/api/v1/admin/retailers/{retailer_id}/mpin/unlock", json={
            "reason": "Hacker attempt"
        })
        assert unauth_res.status_code == 401

        # 7. Admin Unlocks Retailer MPIN
        unlock_res = await ac.post(f"/api/v1/admin/retailers/{retailer_id}/mpin/unlock", json={
            "reason": "Retailer verified identity with Aadhaar OTP after lockout."
        }, headers=admin_headers)
        assert unlock_res.status_code == 200, f"Unlock failed: {unlock_res.text}"
        unlock_data = unlock_res.json()
        assert unlock_data["success"] is True
        assert unlock_data["mpin_locked"] is False
        assert unlock_data["mpin_failed_attempts"] == 0
        assert unlock_data["mpin_unlocked_at"] is not None
        assert unlock_data["mpin_unlocked_by"] is not None

        # 8. Verify Retailer can now authenticate with their existing MPIN (2468 preserved)
        v_success = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "2468"
        })
        assert v_success.status_code == 200
        assert v_success.json()["status"] == "SUCCESS"
        assert v_success.json()["mpin_verified"] is True

        # 9. Test Unlock Idempotency
        unlock_idempotent = await ac.post(f"/api/v1/admin/retailers/{retailer_id}/mpin/unlock", json={
            "reason": "Redundant unlock check"
        }, headers=admin_headers)
        assert unlock_idempotent.status_code == 200
        assert unlock_idempotent.json()["mpin_locked"] is False

        # 10. Test Admin Manual Lock
        lock_res = await ac.post(f"/api/v1/admin/retailers/{retailer_id}/mpin/lock", json={
            "reason": "Risk officer flagged suspicious device IP."
        }, headers=admin_headers)
        assert lock_res.status_code == 200
        assert lock_res.json()["mpin_locked"] is True

        # Retailer is blocked
        v_blocked = await ac.post("/api/v1/retailers/mpin/verify", json={
            "retailer_id": retailer_id,
            "mpin": "2468"
        })
        assert v_blocked.status_code == 423

        # Admin unlocks again
        unlock_final = await ac.post(f"/api/v1/admin/retailers/{retailer_id}/mpin/unlock", json={
            "reason": "Risk check cleared"
        }, headers=admin_headers)
        assert unlock_final.status_code == 200
        assert unlock_final.json()["mpin_locked"] is False

        # Final audit trail inspection
        final_status = await ac.get(f"/api/v1/admin/retailers/{retailer_id}/mpin-status", headers=admin_headers)
        assert final_status.status_code == 200
        history = final_status.json()["audit_history"]
        actions = [h["action"] for h in history]
        assert "UNLOCKED" in actions
        assert "LOCKED" in actions
        assert "FAILED_ATTEMPT" in actions

        print("All Retailer MPIN Unlock flow tests passed with 100% precision!")
