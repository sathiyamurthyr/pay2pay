import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.security import create_access_token
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import (
    CompanyModel,
    RegionalManagerModel,
    DistributorModel,
    RetailerModel,
    RetailerAssignmentModel
)


@pytest.mark.asyncio
async def test_retailer_hierarchy_mapping_end_to_end():
    tenant_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
    company_a_id = uuid.UUID("18b39add-0860-4a2d-8289-bc698da8e966")
    company_b_id = uuid.UUID("f8d96eec-35c1-4e67-9337-64c5cb45df8f")
    admin_user_id = uuid.UUID("3ad7e60a-6d22-4d6d-ba32-91c52402296a")

    admin_token = create_access_token(
        subject=str(admin_user_id),
        tenant_id=str(tenant_id),
        company_id=str(company_a_id),
        roles=["SUPER_ADMIN", "ADMIN"]
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    dist_a_id = uuid.uuid4()
    dist_b_id = uuid.uuid4()
    rm_a_id = uuid.uuid4()
    rm_b_id = uuid.uuid4()
    test_ret_id = uuid.uuid4()

    async with AsyncSessionLocal() as db:
        # 1. Company A & B
        for cid, code, name in [
            (company_a_id, "CMP-APEX-01", "Apex Payments Corp"),
            (company_b_id, "CMP-BHARAT-02", "Bharat Fintech Solutions")
        ]:
            comp = (await db.execute(select(CompanyModel).where(CompanyModel.public_id == cid))).scalars().first()
            if not comp:
                comp = CompanyModel(
                    public_id=cid,
                    tenant_id=tenant_id,
                    tenant_code="TNT-DEFAULT",
                    company_code=code,
                    company_name=name,
                    legal_name=f"{name} Private Limited",
                    status="ACTIVE"
                )
                db.add(comp)

        # 2. RMs
        for rmid, cid, code, name in [
            (rm_a_id, company_a_id, f"RM-A-{str(uuid.uuid4())[:6]}", "Anand Kumar (Apex RM)"),
            (rm_b_id, company_b_id, f"RM-B-{str(uuid.uuid4())[:6]}", "Bhavin Shah (Bharat RM)")
        ]:
            rm = (await db.execute(select(RegionalManagerModel).where(RegionalManagerModel.public_id == rmid))).scalars().first()
            if not rm:
                rm = RegionalManagerModel(
                    public_id=rmid,
                    tenant_id=tenant_id,
                    company_id=cid,
                    employee_code=code,
                    full_name=name,
                    mobile=f"98{str(uuid.uuid4().int)[:8]}",
                    email=f"rm.{str(uuid.uuid4())[:6]}@pay2pay.com",
                    status="ACTIVE"
                )
                db.add(rm)

        # 3. Distributors
        for did, cid, name in [
            (dist_a_id, company_a_id, "Apex Chennai Agency"),
            (dist_b_id, company_b_id, "Bharat Mumbai Agency")
        ]:
            dist = (await db.execute(select(DistributorModel).where(DistributorModel.public_id == did))).scalars().first()
            if not dist:
                dist = DistributorModel(
                    public_id=did,
                    tenant_id=tenant_id,
                    company_id=cid,
                    business_name=name,
                    owner_name="Owner",
                    mobile=f"99{str(uuid.uuid4().int)[:8]}",
                    email=f"dist.{str(uuid.uuid4())[:6]}@agency.com",
                    state="Tamil Nadu",
                    city="Chennai",
                    address="10 Mount Rd",
                    pincode="600002",
                    status="ACTIVE"
                )
                db.add(dist)

        # 4. Test Retailer
        ret = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == test_ret_id))).scalars().first()
        if not ret:
            ret = RetailerModel(
                public_id=test_ret_id,
                tenant_id=tenant_id,
                company_id=company_a_id,
                retailer_code=f"RET-{str(uuid.uuid4())[:6]}",
                store_name="Apex Test Mart",
                legal_name="APEX MART ENTERPRISE",
                owner_name="Suresh Kumar",
                mapped_distributor_id=dist_a_id,
                rm_id=rm_a_id,
                status="ACTIVE"
            )
            db.add(ret)

        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Test GET /admin/retailers/hierarchy-options
        options_res = await ac.get("/api/v1/admin/retailers/hierarchy-options", headers=admin_headers)
        assert options_res.status_code == 200, f"hierarchy-options failed: {options_res.text}"
        options_data = options_res.json()
        assert "companies" in options_data

        # 2. Test GET /admin/companies/{company_id}/distributors
        comp_dist_res = await ac.get(f"/api/v1/admin/companies/{company_a_id}/distributors", headers=admin_headers)
        assert comp_dist_res.status_code == 200
        dists_a = comp_dist_res.json()
        assert any(d["public_id"] == str(dist_a_id) for d in dists_a)
        assert not any(d["public_id"] == str(dist_b_id) for d in dists_a)

        # 3. Test GET /admin/companies/{company_id}/rms
        comp_rms_res = await ac.get(f"/api/v1/admin/companies/{company_a_id}/rms", headers=admin_headers)
        assert comp_rms_res.status_code == 200
        rms_a = comp_rms_res.json()
        assert any(r["public_id"] == str(rm_a_id) for r in rms_a)

        # 4. Test GET /admin/retailers/{retailer_id}/mapping
        map_res = await ac.get(f"/api/v1/admin/retailers/{test_ret_id}/mapping", headers=admin_headers)
        assert map_res.status_code == 200, f"get mapping failed: {map_res.text}"
        map_data = map_res.json()
        assert map_data["retailer"]["public_id"] == str(test_ret_id)
        assert map_data["hierarchy_path"]["company"]["public_id"] == str(company_a_id)
        assert map_data["hierarchy_path"]["distributor"]["public_id"] == str(dist_a_id)
        assert map_data["hierarchy_path"]["rm"]["public_id"] == str(rm_a_id)

        # 5. Test Invalid Mapping -> Try mapping Retailer to Company A with Distributor belonging to Company B
        invalid_res = await ac.put(f"/api/v1/admin/retailers/{test_ret_id}/mapping", json={
            "company_id": str(company_a_id),
            "distributor_id": str(dist_b_id),  # Belongs to Company B!
            "rm_id": str(rm_a_id),
            "reason": "Mismatched mapping test"
        }, headers=admin_headers)
        assert invalid_res.status_code == 400, f"Expected 400 validation error, got {invalid_res.status_code}"
        assert "Hierarchy Mismatch Error" in invalid_res.text

        # 6. Test Valid Mapping Update -> Move Retailer to Company B + Distributor B + RM B
        valid_update = await ac.put(f"/api/v1/admin/retailers/{test_ret_id}/mapping", json={
            "company_id": str(company_b_id),
            "distributor_id": str(dist_b_id),
            "rm_id": str(rm_b_id),
            "reason": "Territory transfer to Western Zone under Bharat Fintech"
        }, headers=admin_headers)
        assert valid_update.status_code == 200, f"Valid update failed: {valid_update.text}"
        updated_data = valid_update.json()
        assert updated_data["hierarchy_path"]["company"]["public_id"] == str(company_b_id)
        assert updated_data["hierarchy_path"]["distributor"]["public_id"] == str(dist_b_id)
        assert updated_data["hierarchy_path"]["rm"]["public_id"] == str(rm_b_id)
        
        # Verify assignment timeline history
        history = updated_data["history"]
        assert len(history) >= 1
        active_assignment = [h for h in history if h["is_active"]]
        assert len(active_assignment) == 1
        assert active_assignment[0]["company_id"] == str(company_b_id)
        assert active_assignment[0]["distributor_id"] == str(dist_b_id)
        assert active_assignment[0]["rm_id"] == str(rm_b_id)
        assert "Western Zone" in active_assignment[0]["reason"]

        # 7. Test another valid update -> Move back to Company A
        re_update = await ac.put(f"/api/v1/admin/retailers/{test_ret_id}/mapping", json={
            "company_id": str(company_a_id),
            "distributor_id": str(dist_a_id),
            "rm_id": str(rm_a_id),
            "reason": "Transferred back to Southern Zone"
        }, headers=admin_headers)
        assert re_update.status_code == 200
        final_history = re_update.json()["history"]
        assert len(final_history) >= 2
        inactive_assignments = [h for h in final_history if not h["is_active"]]
        assert len(inactive_assignments) >= 1
        assert inactive_assignments[0]["effective_to"] is not None

        print("Retailer Hierarchy Mapping (Company, Distributor, RM) tests passed 100%!")
