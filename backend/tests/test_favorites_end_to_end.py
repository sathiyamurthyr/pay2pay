import time
import uuid
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.application.menu_favorite_service import MenuFavoriteService
from app.core.database import get_db
from app.core.domain_resolver import DomainCompanyContext, _DOMAIN_CACHE, clear_domain_cache
from app.core.security import create_access_token
from app.infrastructure.db.customer_models import CustomerServiceConfigurationModel
from app.infrastructure.db.menu_favorite_models import (
    FavoriteMenuModel,
    MenuModel,
    RoleMenuPermissionModel,
)
from app.infrastructure.db.models import (
    AdminUserModel,
    CompanyModel,
    PermissionModel,
    RetailerModel,
    RoleModel,
    RolePermissionModel,
    UserRoleModel,
    UserSessionModel,
    UserTypeModel,
)
from app.main import app


@pytest.fixture
async def fav_test_db():
    MenuFavoriteService._seeded_flag = False
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        for tbl in [
            UserTypeModel.__table__,
            CompanyModel.__table__,
            RoleModel.__table__,
            PermissionModel.__table__,
            RolePermissionModel.__table__,
            AdminUserModel.__table__,
            UserRoleModel.__table__,
            UserSessionModel.__table__,
            RetailerModel.__table__,
            CustomerServiceConfigurationModel.__table__,
            MenuModel.__table__,
            RoleMenuPermissionModel.__table__,
            FavoriteMenuModel.__table__,
        ]:
            await conn.run_sync(tbl.create)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    n4u_tenant = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
    smsp_tenant = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    n4u_admin_pid = uuid.UUID("ad000000-0000-0000-0000-000000000001")
    smsp_admin_pid = uuid.UUID("a3ab339a-9e7f-4aad-9bd7-a8df0701102e")
    p2p_admin_pid = uuid.UUID("11111111-2222-3333-4444-555555555547")
    p2p_fin_pid = uuid.UUID("11111111-2222-3333-4444-666666666647")

    smsp_ret1_pid = uuid.UUID("a1092800-0000-0000-0000-000000000001")
    smsp_ret2_pid = uuid.UUID("a2d6bef6-3f92-4cd0-9d81-7ef3ab8b214b")
    n4u_ret_pid = uuid.UUID("c2121c01-ae5f-4e7a-b2f2-b095b1da6cb3")
    p2p_ret_pid = uuid.UUID("d3121c01-ae5f-4e7a-b2f2-b095b1da6c47")

    async with SessionLocal() as db:
        db.add_all([
            UserTypeModel(user_type_ref_id=1, user_type_code="ADMIN", user_type_name="Administrator", code="ADMIN", name="Administrator"),
            UserTypeModel(user_type_ref_id=2, user_type_code="RETAILER", user_type_name="Retailer", code="RETAILER", name="Retailer"),
            UserTypeModel(user_type_ref_id=3, user_type_code="DISTRIBUTOR", user_type_name="Distributor", code="DISTRIBUTOR", name="Distributor"),
            UserTypeModel(user_type_ref_id=4, user_type_code="SD", user_type_name="Super Distributor", code="SD", name="Super Distributor"),
        ])
        db.add_all([
            CompanyModel(id=6, public_id=uuid.UUID("c1111111-1111-1111-1111-111111111111"), company_ref_id=1, tenant_ref_id=1, tenant_id=n4u_tenant, tenant_code="NEAR4YOU", company_code="NEAR4YOU", company_name="SATHUS TECHNOLOGY PRIVATE LIMITED", legal_name="SATHUS TECHNOLOGY PRIVATE LIMITED", display_name="Near4You", website="https://near4you.store"),
            CompanyModel(id=7, public_id=uuid.UUID("b1e02b56-7742-4549-a4ef-31f5378f00a8"), company_ref_id=2, tenant_ref_id=39, tenant_id=smsp_tenant, tenant_code="SMSPAY", company_code="SMSPAY", company_name="INSPEL TECHNOLOGIES SOLUTIONS PVT", legal_name="INSPEL TECHNOLOGIES SOLUTIONS PVT", display_name="SMSPAY", website="https://smspay.store"),
            CompanyModel(id=11, public_id=uuid.UUID("ea4d39d8-b7c1-471c-a59f-daf98ba648f1"), company_ref_id=47, tenant_ref_id=1, tenant_id=smsp_tenant, tenant_code="PAY2PAY", company_code="PAY2PAY", company_name="SUPER REX PRODUCTS PRIVATE LIMITED", legal_name="SUPER REX PRODUCTS PRIVATE LIMITED", display_name="Pay2Pay", website="https://pay2pay.in"),
        ])
        db.add_all([
            RoleModel(id=1, public_id=uuid.uuid4(), tenant_id=smsp_tenant, name="Platform Admin", code="PLATFORM_ADMIN", is_system=True),
            RoleModel(id=6, public_id=uuid.uuid4(), tenant_id=smsp_tenant, name="Retailer", code="RETAILER", is_system=True),
            RoleModel(id=9, public_id=uuid.uuid4(), tenant_id=smsp_tenant, name="Finance Manager", code="FINANCE", is_system=True),
        ])
        db.add_all([
            AdminUserModel(id=1, public_id=n4u_admin_pid, admin_user_ref_id=101, company_ref_id=1, tenant_ref_id=1, tenant_id=n4u_tenant, email="admin@near4you.store", username="n4u_admin", hashed_password="x", full_name="N4U Admin", user_type="PLATFORM_ADMIN", status="ACTIVE"),
            AdminUserModel(id=2, public_id=smsp_admin_pid, admin_user_ref_id=202, company_ref_id=2, tenant_ref_id=39, tenant_id=smsp_tenant, email="admin@smspay.store", username="smsp_admin", hashed_password="x", full_name="SMSPay Admin", user_type="PLATFORM_ADMIN", status="ACTIVE"),
            AdminUserModel(id=3, public_id=p2p_admin_pid, admin_user_ref_id=303, company_ref_id=47, tenant_ref_id=1, tenant_id=smsp_tenant, email="admin@pay2pay.in", username="p2p_admin", hashed_password="x", full_name="Pay2Pay Admin", user_type="PLATFORM_ADMIN", status="ACTIVE"),
            AdminUserModel(id=4, public_id=p2p_fin_pid, admin_user_ref_id=304, company_ref_id=47, tenant_ref_id=1, tenant_id=smsp_tenant, email="finance@pay2pay.in", username="p2p_fin", hashed_password="x", full_name="Pay2Pay Finance", user_type="FINANCE", status="ACTIVE"),
        ])
        db.add_all([
            RetailerModel(id=3, public_id=smsp_ret1_pid, retailer_ref_id=10928, company_ref_id=2, tenant_ref_id=39, tenant_id=smsp_tenant, retailer_code="SMSP-R902523", store_name="SMSP 1", legal_name="SMSP 1", owner_name="Owner 1", status="ACTIVE"),
            RetailerModel(id=5, public_id=smsp_ret2_pid, retailer_ref_id=10929, company_ref_id=2, tenant_ref_id=39, tenant_id=smsp_tenant, retailer_code="SMSP-R917666", store_name="SMSP 2", legal_name="SMSP 2", owner_name="Owner 2", status="ACTIVE"),
            RetailerModel(id=6, public_id=n4u_ret_pid, retailer_ref_id=1, company_ref_id=1, tenant_ref_id=1, tenant_id=n4u_tenant, retailer_code="N4U-R669426", store_name="N4U Store", legal_name="N4U Store", owner_name="N4U Owner", status="ACTIVE"),
            RetailerModel(id=7, public_id=p2p_ret_pid, retailer_ref_id=701, company_ref_id=47, tenant_ref_id=1, tenant_id=smsp_tenant, retailer_code="P2P-R701", store_name="P2P Store", legal_name="P2P Store", owner_name="P2P Owner", status="ACTIVE"),
        ])
        await db.commit()

    clear_domain_cache()
    now_ts = time.monotonic()
    for host, cid, tref, code, name in [
        ("near4you.store", 1, 1, "NEAR4YOU", "SATHUS TECHNOLOGY PRIVATE LIMITED"),
        ("login.near4you.store", 1, 1, "NEAR4YOU", "SATHUS TECHNOLOGY PRIVATE LIMITED"),
        ("admin.near4you.store", 1, 1, "NEAR4YOU", "SATHUS TECHNOLOGY PRIVATE LIMITED"),
        ("smspay.store", 2, 39, "SMSPAY", "INSPEL TECHNOLOGIES SOLUTIONS PVT"),
        ("login.smspay.store", 2, 39, "SMSPAY", "INSPEL TECHNOLOGIES SOLUTIONS PVT"),
        ("admin.smspay.store", 2, 39, "SMSPAY", "INSPEL TECHNOLOGIES SOLUTIONS PVT"),
        ("pay2pay.in", 47, 1, "PAY2PAY", "SUPER REX PRODUCTS PRIVATE LIMITED"),
        ("login.pay2pay.in", 47, 1, "PAY2PAY", "SUPER REX PRODUCTS PRIVATE LIMITED"),
        ("admin.pay2pay.in", 47, 1, "PAY2PAY", "SUPER REX PRODUCTS PRIVATE LIMITED"),
    ]:
        _DOMAIN_CACHE[f"{host}::"] = (
            now_ts,
            DomainCompanyContext(
                domain=host,
                cmp_ref_id=cid,
                tenant_ref_id=tref,
                app_id=f"app-{code.lower()}",
                company_code=code,
                company_name=name,
                legal_name=name,
                display_name=code,
            ),
        )

    async def override_get_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield {
        "SessionLocal": SessionLocal,
        "n4u_admin_pid": n4u_admin_pid,
        "smsp_admin_pid": smsp_admin_pid,
        "p2p_admin_pid": p2p_admin_pid,
        "p2p_fin_pid": p2p_fin_pid,
        "smsp_ret1_pid": smsp_ret1_pid,
        "smsp_ret2_pid": smsp_ret2_pid,
        "n4u_ret_pid": n4u_ret_pid,
        "p2p_ret_pid": p2p_ret_pid,
    }
    clear_domain_cache()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_unauthenticated_favorites_rejected(fav_test_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        assert (await ac.get("/api/v1/favorites/menus")).status_code == 401
        assert (await ac.post("/api/v1/favorites/toggle", json={"menu_href": "/retailer/wallet"})).status_code == 401
        assert (await ac.get("/api/v1/admin/favorites")).status_code == 401
        assert (await ac.post("/api/v1/admin/favorites/toggle", json={"menu_href": "/dashboard"})).status_code == 401


@pytest.mark.asyncio
async def test_admin_favorites_multi_company_rbac_and_persistence(fav_test_db):
    ids = fav_test_db
    n4u_tok = create_access_token(subject=str(ids["n4u_admin_pid"]), tenant_id="93538c98-0b19-493c-a247-4cdb02a46c68", roles=["PLATFORM_ADMIN"], company_ref_id=1)
    smsp_tok = create_access_token(subject=str(ids["smsp_admin_pid"]), tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8", roles=["PLATFORM_ADMIN"], company_ref_id=2)
    p2p_tok = create_access_token(subject=str(ids["p2p_admin_pid"]), tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8", roles=["PLATFORM_ADMIN"], company_ref_id=47)
    fin_tok = create_access_token(subject=str(ids["p2p_fin_pid"]), tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8", roles=["FINANCE"], company_ref_id=47)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch permitted menus for SMSPay Admin
        perm_res = await ac.get("/api/v1/admin/favorites/permitted-menus", headers={"Authorization": f"Bearer {smsp_tok}"})
        assert perm_res.status_code == 200
        smsp_menus = perm_res.json()["menus"]
        assert len(smsp_menus) > 10
        comp_profile_menu = next(m for m in smsp_menus if m["menu_code"] == "ADMIN_COMPANY_PROFILE")
        sd_menu = next(m for m in smsp_menus if m["menu_code"] == "ADMIN_SUPER_DISTRIBUTOR")
        ret_menu = next(m for m in smsp_menus if m["menu_code"] == "ADMIN_RETAILER")
        assert sd_menu["menu_ref_id"] != ret_menu["menu_ref_id"]

        # 2. SMSPay Admin favorites Company Profile + Super Distributor (by menu_ref_id)
        add1 = await ac.post(
            "/api/v1/admin/favorites/menus",
            headers={"Authorization": f"Bearer {smsp_tok}"},
            json={"menu_ref_id": comp_profile_menu["menu_ref_id"]},
        )
        assert add1.status_code == 200
        fav = add1.json()["favorites"][0]
        assert fav["company_ref_id"] == 2
        assert fav["user_ref_id"] == 202
        assert fav["user_type_ref_id"] == 1
        assert fav["retailer_ref_id"] is None
        assert fav["menu_ref_id"] == comp_profile_menu["menu_ref_id"]

        # Duplicate add is idempotent (still 1 row)
        dup_add = await ac.post(
            "/api/v1/admin/favorites/menus",
            headers={"Authorization": f"Bearer {smsp_tok}"},
            json={"menu_ref_id": comp_profile_menu["menu_ref_id"]},
        )
        assert dup_add.status_code == 200
        assert len(dup_add.json()["favorites"]) == 1

        # Starring Super Distributor does NOT favorite Retailer even though both use /retailers
        await ac.post(
            "/api/v1/admin/favorites/menus",
            headers={"Authorization": f"Bearer {smsp_tok}"},
            json={"menu_ref_id": sd_menu["menu_ref_id"]},
        )
        chk_sd = await ac.get(f"/api/v1/admin/favorites/check?menu_ref_id={sd_menu['menu_ref_id']}", headers={"Authorization": f"Bearer {smsp_tok}"})
        chk_ret = await ac.get(f"/api/v1/admin/favorites/check?menu_ref_id={ret_menu['menu_ref_id']}", headers={"Authorization": f"Bearer {smsp_tok}"})
        assert chk_sd.json()["is_favorite"] is True
        assert chk_ret.json()["is_favorite"] is False

        # 3. Near4You & Pay2Pay admins see 0 favorites (strict company & user isolation)
        assert (await ac.get("/api/v1/admin/favorites", headers={"Authorization": f"Bearer {n4u_tok}"})).json()["favorites"] == []
        assert (await ac.get("/api/v1/admin/favorites", headers={"Authorization": f"Bearer {p2p_tok}"})).json()["favorites"] == []

        # 4. Simulated logout & re-login restores SMSPay Admin favorites from DB
        smsp_relogin_tok = create_access_token(subject=str(ids["smsp_admin_pid"]), tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8", roles=["PLATFORM_ADMIN"], company_ref_id=2)
        restored = await ac.get("/api/v1/admin/favorites", headers={"Authorization": f"Bearer {smsp_relogin_tok}"})
        assert restored.status_code == 200
        assert {f["menu_ref_id"] for f in restored.json()["favorites"]} == {comp_profile_menu["menu_ref_id"], sd_menu["menu_ref_id"]}

        # 5. Remove via DELETE /{menu_ref_id}
        del_res = await ac.delete(f"/api/v1/admin/favorites/{sd_menu['menu_ref_id']}", headers={"Authorization": f"Bearer {smsp_relogin_tok}"})
        assert del_res.status_code == 200
        assert [f["menu_ref_id"] for f in del_res.json()["favorites"]] == [comp_profile_menu["menu_ref_id"]]

        # 6. Finance Admin RBAC enforcement: cannot see or favorite Users/Company Profile
        fin_perm = await ac.get("/api/v1/admin/favorites/permitted-menus", headers={"Authorization": f"Bearer {fin_tok}"})
        assert fin_perm.status_code == 200
        fin_codes = {m["menu_code"] for m in fin_perm.json()["menus"]}
        assert "ADMIN_COA" in fin_codes
        assert "ADMIN_USER_CREATION" not in fin_codes

        forbidden_fav = await ac.post(
            "/api/v1/admin/favorites/menus",
            headers={"Authorization": f"Bearer {fin_tok}"},
            json={"menu_ref_id": comp_profile_menu["menu_ref_id"]},
        )
        assert forbidden_fav.status_code == 403

        # Unauthorized menu_ref_id rejected
        bad_id = await ac.post(
            "/api/v1/admin/favorites/menus",
            headers={"Authorization": f"Bearer {p2p_tok}"},
            json={"menu_ref_id": 999999},
        )
        assert bad_id.status_code == 403


@pytest.mark.asyncio
async def test_retailer_favorites_three_companies_otp_vs_password_and_spoof_prevention(fav_test_db):
    ids = fav_test_db
    # Password login token uses UUID subject + tenant_id + retailer_ref_id
    smsp_ret1_pwd = create_access_token(
        subject=str(ids["smsp_ret1_pid"]),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=2,
        retailer_ref_id=10928,
        retailer_code="SMSP-R902523",
        user_type_ref_id=2,
    )
    # OTP login token uses retailer_code as subject & default tenant_id
    smsp_ret1_otp = create_access_token(
        subject="SMSP-R902523",
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=2,
        retailer_ref_id=10928,
        retailer_code="SMSP-R902523",
        user_type_ref_id=2,
    )
    # Different retailer in same company (SMSPay)
    smsp_ret2 = create_access_token(
        subject=str(ids["smsp_ret2_pid"]),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=2,
        retailer_ref_id=10929,
        retailer_code="SMSP-R917666",
        user_type_ref_id=2,
    )
    # Near4You retailer OTP vs Password with mismatched tenant_id
    n4u_ret_pwd = create_access_token(
        subject=str(ids["n4u_ret_pid"]),
        tenant_id="93538c98-0b19-493c-a247-4cdb02a46c68",
        roles=["RETAILER"],
        company_ref_id=1,
        retailer_ref_id=1,
        retailer_code="N4U-R669426",
        user_type_ref_id=2,
    )
    n4u_ret_otp = create_access_token(
        subject="N4U-R669426",
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=1,
        retailer_ref_id=1,
        retailer_code="N4U-R669426",
        user_type_ref_id=2,
    )
    p2p_ret = create_access_token(
        subject=str(ids["p2p_ret_pid"]),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=47,
        retailer_ref_id=701,
        retailer_code="P2P-R701",
        user_type_ref_id=2,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. SMSPay Retailer 1 adds favorites via Password session (including spoofed user_ref_id in payload which must be ignored)
        avail = await ac.get("/api/v1/favorites/available-menus", headers={"Authorization": f"Bearer {smsp_ret1_pwd}"})
        assert avail.status_code == 200
        dmt_menu = next(m for m in avail.json()["menus"] if m["menu_code"] == "RET_DMT")
        wallet_menu = next(m for m in avail.json()["menus"] if m["menu_code"] == "RET_WALLET")

        add_res = await ac.post(
            "/api/v1/favorites/menus",
            headers={"Authorization": f"Bearer {smsp_ret1_pwd}"},
            json={"menu_ref_id": dmt_menu["menu_ref_id"], "user_ref_id": "999999"},
        )
        assert add_res.status_code == 200
        fav = add_res.json()["favorites"][0]
        assert fav["company_ref_id"] == 2
        assert fav["retailer_ref_id"] == 10928
        assert fav["user_ref_id"] == 10928
        assert fav["user_type_ref_id"] == 2

        # 2. SMSPay Retailer 1 logs out & logs back in via OTP -> gets the SAME favorites!
        otp_list = await ac.get("/api/v1/favorites/menus", headers={"Authorization": f"Bearer {smsp_ret1_otp}"})
        assert [f["menu_href"] for f in otp_list.json()["favorites"]] == ["/retailer/dmt"]

        # 3. Same company Retailer 2 does NOT see Retailer 1's favorites
        ret2_list = await ac.get("/api/v1/favorites/menus", headers={"Authorization": f"Bearer {smsp_ret2}"})
        assert ret2_list.json()["favorites"] == []

        # 4. Near4You Retailer Password save -> OTP login restore (across different JWT tenant_ids!)
        await ac.post(
            "/api/v1/favorites/menus",
            headers={"Authorization": f"Bearer {n4u_ret_pwd}"},
            json={"menu_ref_id": wallet_menu["menu_ref_id"]},
        )
        n4u_otp_check = await ac.get(f"/api/v1/favorites/check?menu_ref_id={wallet_menu['menu_ref_id']}", headers={"Authorization": f"Bearer {n4u_ret_otp}"})
        assert n4u_otp_check.json()["is_favorite"] is True
        assert n4u_otp_check.json()["company_ref_id"] == 1
        assert n4u_otp_check.json()["retailer_ref_id"] == 1

        # 5. Pay2Pay Retailer independent favorite
        await ac.post(
            "/api/v1/favorites/toggle",
            headers={"Authorization": f"Bearer {p2p_ret}"},
            json={"menu_href": "/retailer/profile"},
        )
        p2p_list = await ac.get("/api/v1/favorites/menus", headers={"Authorization": f"Bearer {p2p_ret}"})
        assert [f["menu_href"] for f in p2p_list.json()["favorites"]] == ["/retailer/profile"]

        # 6. Retailer cannot favorite an Admin menu_ref_id
        async with ids["SessionLocal"]() as db:
            admin_menu_id = (await db.execute(select(MenuModel.menu_ref_id).where(MenuModel.user_type_ref_id == 1))).scalars().first()
        bad_ret_fav = await ac.post(
            "/api/v1/favorites/menus",
            headers={"Authorization": f"Bearer {smsp_ret1_pwd}"},
            json={"menu_ref_id": admin_menu_id},
        )
        assert bad_ret_fav.status_code == 403

        # 7. Cross-domain mismatch fails closed with 403 Forbidden
        cross_domain_res = await ac.get(
            "/api/v1/favorites/menus",
            headers={"Authorization": f"Bearer {smsp_ret1_pwd}", "host": "login.near4you.store"},
        )
        assert cross_domain_res.status_code == 403
