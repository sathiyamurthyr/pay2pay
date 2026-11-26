import time
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.domain_resolver import DomainCompanyContext, _DOMAIN_CACHE, clear_domain_cache
from app.core.security import create_access_token
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
from app.infrastructure.db.customer_models import CustomerServiceConfigurationModel
from app.main import app


@pytest.fixture
async def sqlite_db():
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
    async with SessionLocal() as db:
        for ut_id, ut_code, ut_name in [
            (1, "ADMIN", "Administrator"),
            (2, "RETAILER", "Retailer"),
            (3, "DISTRIBUTOR", "Distributor"),
            (4, "SD", "Super Distributor"),
        ]:
            db.add(UserTypeModel(user_type_ref_id=ut_id, user_type_code=ut_code, user_type_name=ut_name, code=ut_code, name=ut_name))

        db.add_all([
            CompanyModel(id=6, public_id=uuid.UUID("c1111111-1111-1111-1111-111111111111"), company_ref_id=1, tenant_ref_id=1, tenant_id=uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68"), tenant_code="NEAR4YOU", company_code="NEAR4YOU", company_name="SATHUS TECHNOLOGY PRIVATE LIMITED", legal_name="SATHUS TECHNOLOGY PRIVATE LIMITED", display_name="Near4You", website="https://near4you.store"),
            CompanyModel(id=7, public_id=uuid.UUID("b1e02b56-7742-4549-a4ef-31f5378f00a8"), company_ref_id=2, tenant_ref_id=39, tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"), tenant_code="SMSPAY", company_code="SMSPAY", company_name="INSPEL TECHNOLOGIES SOLUTIONS PVT", legal_name="INSPEL TECHNOLOGIES SOLUTIONS PVT", display_name="SMSPAY", website="https://smspay.store"),
            CompanyModel(id=11, public_id=uuid.UUID("ea4d39d8-b7c1-471c-a59f-daf98ba648f1"), company_ref_id=47, tenant_ref_id=1, tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"), tenant_code="PAY2PAY", company_code="PAY2PAY", company_name="SUPER REX PRODUCTS PRIVATE LIMITED", legal_name="SUPER REX PRODUCTS PRIVATE LIMITED", display_name="Pay2Pay", website="https://pay2pay.in"),
        ])
        db.add(RoleModel(id=6, public_id=uuid.uuid4(), tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"), name="Retailer", code="RETAILER", is_system=True))
        await db.commit()

    clear_domain_cache()
    now_ts = time.monotonic()
    for host, cid, tref, code, name in [
        ("near4you.store", 1, 1, "NEAR4YOU", "SATHUS TECHNOLOGY PRIVATE LIMITED"),
        ("smspay.store", 2, 39, "SMSPAY", "INSPEL TECHNOLOGIES SOLUTIONS PVT"),
        ("pay2pay.in", 47, 1, "PAY2PAY", "SUPER REX PRODUCTS PRIVATE LIMITED"),
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
    with patch("app.application.pos_mdr_service.PosMdrService.get_active_payment_modes", new_callable=AsyncMock) as m:
        m.return_value = []
        yield SessionLocal
    clear_domain_cache()
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_services_status_domain_resolution(sqlite_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_smspay = await ac.get("/api/v1/services/status", headers={"host": "smspay.store"})
        assert res_smspay.status_code == 200
        assert res_smspay.json()["company_ref_id"] == 2

        res_p2p = await ac.get("/api/v1/services/status", headers={"host": "pay2pay.in"})
        assert res_p2p.status_code == 200
        assert res_p2p.json()["company_ref_id"] == 47

        res_n4u = await ac.get("/api/v1/services/status", headers={"host": "near4you.store"})
        assert res_n4u.status_code == 200
        assert res_n4u.json()["company_ref_id"] == 1


@pytest.mark.asyncio
async def test_admin_services_status_and_company_toggle_isolation(sqlite_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_admin = await ac.get("/api/v1/admin/services/status?company_ref_id=2")
        assert res_admin.status_code == 200
        company_ids = [c["company_ref_id"] for c in res_admin.json()["available_companies"]]
        assert 1 in company_ids and 2 in company_ids and 47 in company_ids

        toggle_off = await ac.patch(
            "/api/v1/admin/services/DMT/toggle",
            json={"is_active": False, "company_ref_id": 2, "downtime_reason": "SMSPAY maintenance"},
        )
        assert toggle_off.status_code == 200
        assert toggle_off.json()["is_active"] is False

        res_smspay = await ac.get("/api/v1/services/status", headers={"host": "smspay.store"})
        assert res_smspay.json()["services"]["DMT"] is False
        assert "/retailer/dmt" in res_smspay.json()["disabled_submenus"]

        res_p2p = await ac.get("/api/v1/services/status", headers={"host": "pay2pay.in"})
        assert res_p2p.json()["services"]["DMT"] is True
        assert "/retailer/dmt" not in res_p2p.json()["disabled_submenus"]

        toggle_on = await ac.patch(
            "/api/v1/admin/services/DMT/toggle",
            json={"is_active": True, "company_ref_id": 2},
        )
        assert toggle_on.status_code == 200
        assert toggle_on.json()["is_active"] is True


@pytest.mark.asyncio
async def test_favorites_validation_and_lifecycle(sqlite_db):
    smspay_tok = create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=2,
        retailer_ref_id=10928,
        retailer_code="SMSP-R902523",
        user_type_ref_id=2,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.patch("/api/v1/admin/services/PAYIN/toggle", json={"is_active": False, "company_ref_id": 2})

        res_fav_disabled = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
            json={"menu_href": "/retailer/payin", "menu_label": "PayIn (Add Money)"},
        )
        assert res_fav_disabled.status_code == 400
        assert "disabled" in res_fav_disabled.json()["detail"].lower()

        res_fav_sub_disabled = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
            json={"menu_href": "/retailer/reports/payin-transactions", "menu_label": "PayIn Report"},
        )
        assert res_fav_sub_disabled.status_code == 400

        res_fav_ok = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
            json={"menu_href": "/retailer/wallet", "menu_label": "Wallet"},
        )
        assert res_fav_ok.status_code == 200
        assert res_fav_ok.json()["status"] == "SUCCESS"

        await ac.patch("/api/v1/admin/services/PAYIN/toggle", json={"is_active": True, "company_ref_id": 2})

        res_fav_now_ok = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
            json={"menu_href": "/retailer/payin", "menu_label": "PayIn (Add Money)"},
        )
        assert res_fav_now_ok.status_code == 200

        res_list = await ac.get(
            "/api/v1/favorites/menus",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
        )
        assert res_list.status_code == 200
        fav_hrefs = [f["menu_href"] for f in res_list.json()["favorites"]]
        assert "/retailer/wallet" in fav_hrefs
        assert "/retailer/payin" in fav_hrefs

        await ac.patch("/api/v1/admin/services/PAYIN/toggle", json={"is_active": False, "company_ref_id": 2})
        res_list_filtered = await ac.get(
            "/api/v1/favorites/menus",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
        )
        fav_hrefs_filtered = [f["menu_href"] for f in res_list_filtered.json()["favorites"]]
        assert "/retailer/wallet" in fav_hrefs_filtered
        assert "/retailer/payin" not in fav_hrefs_filtered

        await ac.patch("/api/v1/admin/services/PAYIN/toggle", json={"is_active": True, "company_ref_id": 2})
        res_list_restored = await ac.get(
            "/api/v1/favorites/menus",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
        )
        fav_hrefs_restored = [f["menu_href"] for f in res_list_restored.json()["favorites"]]
        assert "/retailer/wallet" in fav_hrefs_restored
        assert "/retailer/payin" in fav_hrefs_restored


@pytest.mark.asyncio
async def test_favorites_company_isolation(sqlite_db):
    smspay_tok = create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=2,
        retailer_ref_id=10928,
        user_type_ref_id=2,
    )
    p2p_tok = create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        company_ref_id=47,
        retailer_ref_id=10928,
        user_type_ref_id=2,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_smspay = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
            json={"menu_href": "/retailer/wallet", "menu_label": "Wallet"},
        )
        assert res_smspay.status_code == 200

        list_smspay = await ac.get(
            "/api/v1/favorites/menus",
            headers={"host": "smspay.store", "Authorization": f"Bearer {smspay_tok}"},
        )
        assert "/retailer/wallet" in [f["menu_href"] for f in list_smspay.json()["favorites"]]

        list_p2p = await ac.get(
            "/api/v1/favorites/menus",
            headers={"host": "pay2pay.in", "Authorization": f"Bearer {p2p_tok}"},
        )
        assert "/retailer/wallet" not in [f["menu_href"] for f in list_p2p.json()["favorites"]]
