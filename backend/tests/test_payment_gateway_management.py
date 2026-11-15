import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text, select
from app.main import app
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.payin_models import (
    PayinCompanyVendorModel, PayinVendorModel, PayinTransactionModel, PayinAuditLogModel
)

API_PREFIX = "/api/v1"

async def get_admin_auth_headers(client: AsyncClient, email: str = "admin@smspay.store", password: str = "Admin@123") -> dict:
    resp = await client.post(f"{API_PREFIX}/auth/login", json={
        "email_or_username": email,
        "password": password
    })
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

async def get_retailer_auth_headers(client: AsyncClient, mobile: str = "9360889009") -> dict:
    resp = await client.post(f"{API_PREFIX}/auth/enterprise/password-login", json={
        "identifier": mobile,
        "password": "DemoPassword@123",
        "portal_role": "RETAILER",
        "accepted_terms": True
    })
    assert resp.status_code == 200, f"Retailer login failed: {resp.text}"
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_list_payment_gateways():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_headers = await get_admin_auth_headers(client, "admin@smspay.store")
        resp = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["company_ref_id"] == 2
        assert data["company_name"] == "SMSPAY"
        gateways = data["gateways"]
        assert len(gateways) >= 2

        # Verify columns required by specification
        g1 = next((g for g in gateways if g["gateway_code"] == "G-1"), None)
        assert g1 is not None
        assert "payin_company_vendor_ref_id" in g1
        assert "internal_provider_name" in g1
        assert "retailer_display_name" in g1
        assert "description" in g1
        assert "display_order" in g1
        assert "status" in g1
        assert "is_enabled" in g1
        assert g1["internal_provider_name"] == "BankMe Technologies" or "BankMe" in g1["internal_provider_name"]


@pytest.mark.asyncio
async def test_admin_update_gateway_display_name_and_description():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_headers = await get_admin_auth_headers(client, "admin@smspay.store")
        
        # 1. Fetch current gateways
        list_resp = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=admin_headers)
        gateways = list_resp.json()["gateways"]
        g1 = next(g for g in gateways if g["gateway_code"] == "G-1")
        ref_id = g1["payin_company_vendor_ref_id"]

        # 2. Update display name & description
        new_name = "Gateway G-1 (Instant Settlement)"
        new_desc = "Next-generation ultra-fast card payments."
        update_resp = await client.post(
            f"{API_PREFIX}/admin/payin/gateways/{ref_id}",
            json={
                "retailer_display_name": new_name,
                "description": new_desc,
                "display_order": 1,
                "status": "ACTIVE",
                "is_enabled": True
            },
            headers=admin_headers
        )
        assert update_resp.status_code == 200
        up_data = update_resp.json()
        assert up_data["success"] is True
        assert up_data["gateway"]["retailer_display_name"] == new_name
        assert up_data["gateway"]["description"] == new_desc
        # Verify internal provider is unchanged
        assert up_data["gateway"]["vendor_code"] == "BANKME"

        # 3. Verify in database & audit log
        async with AsyncSessionLocal() as session:
            stmt = select(PayinCompanyVendorModel).where(PayinCompanyVendorModel.payin_company_vendor_ref_id == ref_id)
            cv = (await session.execute(stmt)).scalars().first()
            assert cv.retailer_display_name == new_name
            assert cv.description == new_desc

            # Check audit log
            audit_stmt = select(PayinAuditLogModel).where(
                PayinAuditLogModel.entity_type == "payin_company_vendors",
                PayinAuditLogModel.entity_ref_id == ref_id
            ).order_by(PayinAuditLogModel.payin_audit_log_ref_id.desc())
            audit = (await session.execute(audit_stmt)).scalars().first()
            assert audit is not None
            assert audit.action_type == "UPDATE_GATEWAY_CONFIG"
            assert audit.new_value["retailer_display_name"] == new_name


@pytest.mark.asyncio
async def test_retailer_options_reflect_updated_display_name():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ret_headers = await get_retailer_auth_headers(client, "9360889009")
        resp = await client.get(f"{API_PREFIX}/payin/options", headers=ret_headers)
        assert resp.status_code == 200
        data = resp.json()
        vendors = data["vendors"]
        g1 = next((v for v in vendors if v["gateway_code"] == "G-1"), None)
        assert g1 is not None
        assert g1["display_name"] == "Gateway G-1 (Instant Settlement)"
        # Internal provider name strictly masked from retailer
        assert "BankMe" not in g1["display_name"]
        assert "BankMe" not in g1["vendor_name"]
        assert "BankMe" not in g1["provider_name"]

        # Also verify dedicated /api/v1/payin/gateways endpoint
        gw_resp = await client.get(f"{API_PREFIX}/payin/gateways", headers=ret_headers)
        assert gw_resp.status_code == 200
        gw_data = gw_resp.json()
        assert gw_data["success"] is True
        gw1 = next(g for g in gw_data["gateways"] if g["code"] == "G-1")
        assert gw1["name"] == "Gateway G-1 (Instant Settlement)"
        assert "BankMe" not in str(gw1)


@pytest.mark.asyncio
async def test_admin_toggle_gateway_status_active_inactive():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_headers = await get_admin_auth_headers(client, "admin@smspay.store")
        ret_headers = await get_retailer_auth_headers(client, "9360889009")

        # 1. Locate Gateway G-2 and ensure baseline ACTIVE state
        list_resp = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=admin_headers)
        gateways = list_resp.json()["gateways"]
        g2 = next(g for g in gateways if g["gateway_code"] == "G-2")
        g2_ref_id = g2["payin_company_vendor_ref_id"]

        if g2["status"] != "ACTIVE":
            await client.post(
                f"{API_PREFIX}/admin/payin/gateways/{g2_ref_id}/toggle-status",
                headers=admin_headers
            )

        # 2. Deactivate Gateway G-2
        toggle_resp = await client.post(
            f"{API_PREFIX}/admin/payin/gateways/{g2_ref_id}/toggle-status",
            headers=admin_headers
        )
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["status"] == "INACTIVE"
        assert toggle_resp.json()["is_enabled"] is False

        # 3. Verify Retailer PayIn options now EXCLUDES G-2
        ret_opt_resp = await client.get(f"{API_PREFIX}/payin/options", headers=ret_headers)
        assert ret_opt_resp.status_code == 200
        vendors = ret_opt_resp.json()["vendors"]
        vendor_codes = [v["gateway_code"] for v in vendors]
        assert "G-2" not in vendor_codes, "Inactive Gateway G-2 must NOT appear in Retailer options!"

        # 4. Attempting to initiate PayIn with deactivated G-2 is rejected
        init_resp = await client.post(
            f"{API_PREFIX}/payin/initiate",
            json={
                "amount": 1000.0,
                "customer_mobile": "9876543210",
                "customer_name": "Test Customer",
                "reference_id": f"REF-INACTIVE-{uuid.uuid4().hex[:6]}",
                "vendor_code": "G-2"
            },
            headers=ret_headers
        )
        assert init_resp.status_code in (400, 422), "Initiating PayIn on an inactive gateway must be rejected!"

        # 5. Reactivate Gateway G-2
        reactivate_resp = await client.post(
            f"{API_PREFIX}/admin/payin/gateways/{g2_ref_id}/toggle-status",
            headers=admin_headers
        )
        assert reactivate_resp.status_code == 200
        assert reactivate_resp.json()["status"] == "ACTIVE"
        assert reactivate_resp.json()["is_enabled"] is True

        # 6. Verify Retailer PayIn options includes G-2 again
        ret_opt_resp2 = await client.get(f"{API_PREFIX}/payin/options", headers=ret_headers)
        vendors2 = ret_opt_resp2.json()["vendors"]
        vendor_codes2 = [v["gateway_code"] for v in vendors2]
        assert "G-2" in vendor_codes2, "Active Gateway G-2 must appear in Retailer options!"


@pytest.mark.asyncio
async def test_sole_active_gateway_deactivation_guard():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_headers = await get_admin_auth_headers(client, "admin@smspay.store")

        list_resp = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=admin_headers)
        gateways = list_resp.json()["gateways"]
        g1 = next(g for g in gateways if g["gateway_code"] == "G-1")
        g2 = next(g for g in gateways if g["gateway_code"] == "G-2")

        # Deactivate G-2 so only G-1 remains active
        await client.post(f"{API_PREFIX}/admin/payin/gateways/{g2['payin_company_vendor_ref_id']}/toggle-status", headers=admin_headers)

        # Attempting to deactivate G-1 (the sole active gateway) must be blocked
        guard_resp = await client.post(f"{API_PREFIX}/admin/payin/gateways/{g1['payin_company_vendor_ref_id']}/toggle-status", headers=admin_headers)
        assert guard_resp.status_code == 400
        assert "At least one payment gateway must remain active" in guard_resp.json()["detail"]

        # Restore G-2 to ACTIVE
        await client.post(f"{API_PREFIX}/admin/payin/gateways/{g2['payin_company_vendor_ref_id']}/toggle-status", headers=admin_headers)


@pytest.mark.asyncio
async def test_tenant_company_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # SMSPAY Admin (Company 2)
        smspay_headers = await get_admin_auth_headers(client, "admin@smspay.store")
        # Near4You Admin (Company 1)
        near4you_headers = await get_admin_auth_headers(client, "admin@near4you.store")

        # Fetch gateways for Near4You
        n4u_resp = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=near4you_headers)
        assert n4u_resp.status_code == 200
        n4u_gateways = n4u_resp.json()["gateways"]
        n4u_g1 = next(g for g in n4u_gateways if g["gateway_code"] == "G-1")

        # SMSPAY Admin updates SMSPAY's G-1
        smspay_gateways = (await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=smspay_headers)).json()["gateways"]
        smspay_g1 = next(g for g in smspay_gateways if g["gateway_code"] == "G-1")

        await client.post(
            f"{API_PREFIX}/admin/payin/gateways/{smspay_g1['payin_company_vendor_ref_id']}",
            json={"retailer_display_name": "SMSPAY Exclusive G-1"},
            headers=smspay_headers
        )

        # Near4You G-1 must NOT be affected!
        n4u_resp_after = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=near4you_headers)
        n4u_g1_after = next(g for g in n4u_resp_after.json()["gateways"] if g["gateway_code"] == "G-1")
        assert n4u_g1_after["retailer_display_name"] != "SMSPAY Exclusive G-1"
        assert n4u_g1_after["retailer_display_name"] == n4u_g1["retailer_display_name"]

        # SMSPAY Admin cannot update Near4You's gateway
        forbidden_resp = await client.post(
            f"{API_PREFIX}/admin/payin/gateways/{n4u_g1['payin_company_vendor_ref_id']}",
            json={"retailer_display_name": "Hacked Name"},
            headers=smspay_headers
        )
        assert forbidden_resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_unauthorized_retailer_cannot_modify_gateway():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ret_headers = await get_retailer_auth_headers(client, "9360889009")

        # Retailer cannot access Admin gateway list
        list_resp = await client.get(f"{API_PREFIX}/admin/payin/gateways", headers=ret_headers)
        assert list_resp.status_code in (401, 403)

        # Retailer cannot update gateway
        up_resp = await client.post(
            f"{API_PREFIX}/admin/payin/gateways/1",
            json={"retailer_display_name": "Illegal Name"},
            headers=ret_headers
        )
        assert up_resp.status_code in (401, 403)
