import uuid
import random
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_payout_slabs_end_to_end():
    tenant_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
    company_id = uuid.UUID("3778f4e4-bb6e-4eb1-8a12-762f24591ebc")
    admin_user_id = uuid.UUID("3ad7e60a-6d22-4d6d-ba32-91c52402296a")

    token = create_access_token(
        subject=str(admin_user_id),
        tenant_id=str(tenant_id),
        company_id=str(company_id),
        roles=["SUPER_ADMIN", "ADMIN", "ROOT_ADMIN"]
    )
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Verify Initial Seed Slab (₹0 - ₹5,00,000)
        list_res = await ac.get("/api/v1/admin/payout-slabs?service_code=PAYOUT", headers=headers)
        assert list_res.status_code == 200, f"List failed: {list_res.text}"
        list_data = list_res.json()
        assert list_data["total"] >= 1
        
        initial_slab = next((s for s in list_data["items"] if s["min_amount"] == 0 and s["max_amount"] == 500000), None)
        assert initial_slab is not None, "Initial seed slab (₹0 - ₹5,00,000) not found"
        assert initial_slab["commission"] == 20.0
        assert initial_slab["commission_type"] == "FIXED"
        assert initial_slab["gst"] == 18.0
        assert initial_slab["gst_type"] == "PERCENTAGE"
        assert initial_slab["is_active"] is True

        # 2. Create Dynamic Non-Overlapping Slab: ₹10,000,000+
        r_offset = random.randint(100, 900) * 100000
        min_amt = 10000000.0 + r_offset
        max_amt = min_amt + 500000.0

        slab2_res = await ac.post("/api/v1/admin/payout-slabs", json={
            "service_code": "PAYOUT",
            "slab_name": f"High-Tier Payout Slab {r_offset}",
            "description": "For high-volume retailer payouts",
            "min_amount": min_amt,
            "max_amount": max_amt,
            "commission": 50.0,
            "commission_type": "FIXED",
            "gst": 18.0,
            "gst_type": "PERCENTAGE",
            "vendor_charge": 5.0,
            "vendor_charge_type": "FIXED",
            "company_charges": 10.0,
            "company_charges_type": "FIXED",
            "company_gst": 18.0,
            "company_gst_type": "PERCENTAGE",
            "tds": 5.0,
            "tds_type": "PERCENTAGE",
            "other_charges": 0.0,
            "other_charges_type": "FIXED",
            "currency": "INR",
            "is_active": True
        }, headers=headers)
        assert slab2_res.status_code == 201, f"Slab 2 creation failed: {slab2_res.text}"
        slab2 = slab2_res.json()
        slab2_id = slab2["public_id"]
        assert slab2["min_amount"] == min_amt
        assert slab2["max_amount"] == max_amt
        assert slab2["commission"] == 50.0

        # 3. Validation: Test Overlapping Active Slab Rejection
        # Attempt to create slab overlapping Slab 1: e.g. ₹2,00,000 - ₹6,00,000
        overlap_res = await ac.post("/api/v1/admin/payout-slabs", json={
            "service_code": "PAYOUT",
            "slab_name": "Conflicting Slab",
            "min_amount": 200000.0,
            "max_amount": 600000.0,
            "commission": 30.0,
            "commission_type": "FIXED",
            "gst": 18.0,
            "gst_type": "PERCENTAGE",
            "is_active": True
        }, headers=headers)
        assert overlap_res.status_code == 400, "Expected overlap error 400"
        assert "Overlapping" in overlap_res.text or "overlapping" in overlap_res.text

        # 4. Validation: Negative & Range Inversion Rejection
        inv_res = await ac.post("/api/v1/admin/payout-slabs", json={
            "service_code": "PAYOUT",
            "slab_name": "Inverted Range Slab",
            "min_amount": 5000.0,
            "max_amount": 1000.0, # max < min
            "commission": 10.0,
            "commission_type": "FIXED"
        }, headers=headers)
        assert inv_res.status_code == 400

        neg_res = await ac.post("/api/v1/admin/payout-slabs", json={
            "service_code": "PAYOUT",
            "slab_name": "Negative Amount Slab",
            "min_amount": -100.0, # min < 0
            "max_amount": 5000.0
        }, headers=headers)
        assert neg_res.status_code in [400, 422]

        pct_res = await ac.post("/api/v1/admin/payout-slabs", json={
            "service_code": "PAYOUT",
            "slab_name": "Invalid Percentage Slab",
            "min_amount": 1000001.0,
            "max_amount": 2000000.0,
            "commission": 150.0, # > 100%
            "commission_type": "PERCENTAGE"
        }, headers=headers)
        assert pct_res.status_code == 400

        # 5. Update Payout Slab
        update_res = await ac.put(f"/api/v1/admin/payout-slabs/{slab2_id}", json={
            "commission": 75.0,
            "company_charges": 15.0,
            "reason": "Annual commission increase for tier 2"
        }, headers=headers)
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        updated_slab = update_res.json()
        assert updated_slab["commission"] == 75.0
        assert updated_slab["company_charges"] == 15.0
        assert updated_slab["version_no"] >= 2

        # 6. Deactivate Payout Slab
        deact_res = await ac.post(f"/api/v1/admin/payout-slabs/{slab2_id}/deactivate", json={
            "reason": "Temporary revision review"
        }, headers=headers)
        assert deact_res.status_code == 200
        assert deact_res.json()["is_active"] is False

        # 7. Activate Payout Slab
        act_res = await ac.post(f"/api/v1/admin/payout-slabs/{slab2_id}/activate", json={
            "reason": "Re-enabling tier 2 payout slab"
        }, headers=headers)
        assert act_res.status_code == 200
        assert act_res.json()["is_active"] is True

        # 8. Check Audit History
        audit_res = await ac.get(f"/api/v1/admin/payout-slabs/{slab2_id}/audit", headers=headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert len(logs) >= 3  # CREATE, UPDATE, DEACTIVATE, ACTIVATE
        actions = [l["action"] for l in logs]
        assert "CREATE" in actions
        assert "UPDATE" in actions
        assert "DEACTIVATE" in actions
        assert "ACTIVATE" in actions

        # 9. Fetch Single Slab Details by ID
        get_res = await ac.get(f"/api/v1/admin/payout-slabs/{slab2_id}", headers=headers)
        assert get_res.status_code == 200
        slab_detail = get_res.json()
        assert slab_detail["public_id"] == slab2_id
        assert slab_detail["audit_logs"] is not None
        assert len(slab_detail["audit_logs"]) >= 1

        print("Payout Slabs test suite executed with 100% success!")
