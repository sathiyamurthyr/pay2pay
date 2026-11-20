import pytest
import uuid
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import get_db
from app.infrastructure.db.customer_models import CustomerServiceConfigurationModel
from app.infrastructure.db.models import UserFavoriteMenuModel


class MockScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None


class MockResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return MockScalars(self._items)

    def scalar_one_or_none(self):
        if not self._items:
            return None
        item = self._items[0]
        if hasattr(item, "is_enabled"):
            return item.is_enabled
        return item

    def scalar(self):
        return self.scalar_one_or_none()

    def fetchall(self):
        if self._items and hasattr(self._items[0], "service_code"):
            return [
                (
                    getattr(c, "service_code", ""),
                    getattr(c, "service_name", ""),
                    getattr(c, "is_enabled", True),
                    getattr(c, "config_status", "CONFIGURED"),
                )
                for c in self._items
            ]
        return list(self._items)

    def mappings(self):
        return self


class InMemoryMockDB:
    def __init__(self):
        self.configs = []
        self.favorites = []

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)
        if "sp_get_all_platform_services_status" in stmt_str or "sp_toggle_platform_service" in stmt_str:
            raise Exception("SP not in mock DB; fallback to table")

        if "customer_service_configuration" in stmt_str:
            params = stmt.compile().params if hasattr(stmt, "compile") else (args[0] if args else {})
            comp_id = params.get("company_ref_id_1") or params.get("company_ref_id") or params.get("comp_ref")
            svc_code = params.get("service_code_1") or params.get("service_code")

            filtered = [c for c in self.configs if not getattr(c, "is_deleted", False)]
            if svc_code is not None:
                filtered = [c for c in filtered if getattr(c, "service_code", None) == svc_code]
            if comp_id is not None:
                exact = [c for c in filtered if getattr(c, "company_ref_id", None) == comp_id]
                filtered = exact if exact else [c for c in filtered if getattr(c, "company_ref_id", None) is None]

            return MockResult(filtered)

        if "user_favorite_menu" in stmt_str:
            params = stmt.compile().params if hasattr(stmt, "compile") else (args[0] if args else {})
            user_ref = params.get("user_ref_id_1") or params.get("user_ref_id")
            comp_id = params.get("company_ref_id_1") or params.get("company_ref_id")
            menu_href = params.get("menu_href_1") or params.get("menu_href")

            res = [f for f in self.favorites if getattr(f, "is_active", True)]
            if user_ref is not None:
                res = [f for f in res if str(getattr(f, "user_ref_id", "")) == str(user_ref)]
            if comp_id is not None:
                res = [f for f in res if getattr(f, "company_ref_id", None) == comp_id]
            if menu_href is not None:
                res = [f for f in res if getattr(f, "menu_href", "") == menu_href]

            return MockResult(res)

        return MockResult([])

    def add(self, obj):
        if isinstance(obj, CustomerServiceConfigurationModel):
            for i, c in enumerate(self.configs):
                if c.service_code == obj.service_code and c.company_ref_id == obj.company_ref_id:
                    self.configs[i] = obj
                    return
            self.configs.append(obj)
        elif isinstance(obj, UserFavoriteMenuModel):
            for i, f in enumerate(self.favorites):
                if f.user_ref_id == obj.user_ref_id and f.menu_href == obj.menu_href and f.company_ref_id == obj.company_ref_id:
                    self.favorites[i] = obj
                    return
            self.favorites.append(obj)

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.fixture
def mock_db_fixture():
    db = InMemoryMockDB()
    app.dependency_overrides[get_db] = lambda: db
    with patch("app.application.pos_mdr_service.PosMdrService.get_active_payment_modes", new_callable=AsyncMock) as m:
        m.return_value = []
        yield db
    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_services_status_domain_resolution(mock_db_fixture):
    """Verify that /api/v1/services/status resolves company context from domain/host."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. SMSPAY domain
        res_smspay = await ac.get("/api/v1/services/status", headers={"host": "smspay.store"})
        assert res_smspay.status_code == 200
        data_smspay = res_smspay.json()
        assert data_smspay["success"] is True
        assert data_smspay["company_ref_id"] == 2
        assert "services" in data_smspay
        assert "disabled_submenus" in data_smspay

        # 2. Pay2Pay domain
        res_p2p = await ac.get("/api/v1/services/status", headers={"host": "pay2pay.in"})
        assert res_p2p.status_code == 200
        data_p2p = res_p2p.json()
        assert data_p2p["success"] is True
        assert data_p2p["company_ref_id"] == 47

        # 3. Near4You domain
        res_n4u = await ac.get("/api/v1/services/status", headers={"host": "near4you.store"})
        assert res_n4u.status_code == 200
        data_n4u = res_n4u.json()
        assert data_n4u["success"] is True
        assert data_n4u["company_ref_id"] == 1


@pytest.mark.asyncio
async def test_admin_services_status_and_company_toggle_isolation(mock_db_fixture):
    """Verify Admin services status retrieval and company-scoped toggling isolation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Admin services status for SMSPAY
        res_admin = await ac.get("/api/v1/admin/services/status?company_ref_id=2")
        assert res_admin.status_code == 200
        data_admin = res_admin.json()
        assert data_admin["success"] is True
        assert data_admin["company_ref_id"] == 2
        assert "available_companies" in data_admin
        company_ids = [c["company_ref_id"] for c in data_admin["available_companies"]]
        assert 1 in company_ids
        assert 2 in company_ids
        assert 47 in company_ids

        # 2. Toggle DMT off specifically for SMSPAY (company_ref_id=2)
        toggle_off = await ac.patch(
            "/api/v1/admin/services/DMT/toggle",
            json={"is_active": False, "company_ref_id": 2, "downtime_reason": "SMSPAY maintenance"},
        )
        assert toggle_off.status_code == 200
        toggle_off_data = toggle_off.json()
        assert toggle_off_data["success"] is True
        assert toggle_off_data["company_ref_id"] == 2
        assert toggle_off_data["is_active"] is False

        # 3. Verify SMSPAY status reflects DMT disabled & submenus populated
        res_smspay = await ac.get("/api/v1/services/status", headers={"host": "smspay.store"})
        assert res_smspay.status_code == 200
        smspay_data = res_smspay.json()
        assert smspay_data["services"]["DMT"] is False
        assert "/retailer/dmt" in smspay_data["disabled_submenus"]
        assert "/retailer/beneficiary" in smspay_data["disabled_submenus"]
        assert "/retailer/reports/payout-transactions" in smspay_data["disabled_submenus"]

        # 4. Verify Pay2Pay (company_ref_id=47) remains ENABLED (Strict company isolation)
        res_p2p = await ac.get("/api/v1/services/status", headers={"host": "pay2pay.in"})
        assert res_p2p.status_code == 200
        p2p_data = res_p2p.json()
        assert p2p_data["services"]["DMT"] is True
        assert "/retailer/dmt" not in p2p_data["disabled_submenus"]

        # 5. Clean up / Restore DMT on for SMSPAY
        toggle_on = await ac.patch(
            "/api/v1/admin/services/DMT/toggle",
            json={"is_active": True, "company_ref_id": 2},
        )
        assert toggle_on.status_code == 200
        assert toggle_on.json()["is_active"] is True

        res_smspay_restored = await ac.get("/api/v1/services/status", headers={"host": "smspay.store"})
        assert res_smspay_restored.json()["services"]["DMT"] is True
        assert "/retailer/dmt" not in res_smspay_restored.json()["disabled_submenus"]


@pytest.mark.asyncio
async def test_favorites_validation_and_lifecycle(mock_db_fixture):
    """Verify favourites cannot add disabled services, filter disabled items, and restore on re-enable."""
    test_user = f"retailer_test_{uuid.uuid4().hex[:8]}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First ensure PAYIN is disabled for SMSPAY (company_ref_id=2)
        await ac.patch(
            "/api/v1/admin/services/PAYIN/toggle",
            json={"is_active": False, "company_ref_id": 2},
        )

        # 1. Attempting to favorite disabled PAYIN should return HTTP 400 Bad Request
        res_fav_disabled = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store"},
            json={
                "user_ref_id": test_user,
                "menu_href": "/retailer/payin",
                "menu_label": "PayIn",
                "menu_category": "Payments",
            },
        )
        assert res_fav_disabled.status_code == 400
        assert "disabled" in res_fav_disabled.json()["detail"].lower()

        # 2. Attempting to favorite a disabled submenu should also return 400
        res_fav_sub_disabled = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store"},
            json={
                "user_ref_id": test_user,
                "menu_href": "/retailer/reports/payin-transactions",
                "menu_label": "PayIn Report",
                "menu_category": "Reports",
            },
        )
        assert res_fav_sub_disabled.status_code == 400

        # 3. Adding an ENABLED item (e.g. /retailer/wallet) should succeed
        res_fav_ok = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store"},
            json={
                "user_ref_id": test_user,
                "menu_href": "/retailer/wallet",
                "menu_label": "Wallet",
                "menu_category": "Wallet",
            },
        )
        assert res_fav_ok.status_code == 200
        assert res_fav_ok.json()["status"] == "SUCCESS"

        # 4. Now enable PAYIN again
        await ac.patch(
            "/api/v1/admin/services/PAYIN/toggle",
            json={"is_active": True, "company_ref_id": 2},
        )

        # 5. Now favoriting PAYIN should succeed
        res_fav_now_ok = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store"},
            json={
                "user_ref_id": test_user,
                "menu_href": "/retailer/payin",
                "menu_label": "PayIn",
                "menu_category": "Payments",
            },
        )
        assert res_fav_now_ok.status_code == 200
        assert res_fav_now_ok.json()["status"] == "SUCCESS"

        # 6. Verify GET /favorites/menus lists both
        res_list = await ac.get(
            f"/api/v1/favorites/menus?user_ref_id={test_user}",
            headers={"host": "smspay.store"},
        )
        assert res_list.status_code == 200
        fav_hrefs = [f["menu_href"] for f in res_list.json()["favorites"]]
        assert "/retailer/wallet" in fav_hrefs
        assert "/retailer/payin" in fav_hrefs

        # 7. Disable PAYIN again — Verify it disappears from GET /favorites/menus automatically
        await ac.patch(
            "/api/v1/admin/services/PAYIN/toggle",
            json={"is_active": False, "company_ref_id": 2},
        )
        res_list_filtered = await ac.get(
            f"/api/v1/favorites/menus?user_ref_id={test_user}",
            headers={"host": "smspay.store"},
        )
        fav_hrefs_filtered = [f["menu_href"] for f in res_list_filtered.json()["favorites"]]
        assert "/retailer/wallet" in fav_hrefs_filtered
        assert "/retailer/payin" not in fav_hrefs_filtered

        # 8. Re-enable PAYIN — Verify it immediately reappears without re-favoriting
        await ac.patch(
            "/api/v1/admin/services/PAYIN/toggle",
            json={"is_active": True, "company_ref_id": 2},
        )
        res_list_restored = await ac.get(
            f"/api/v1/favorites/menus?user_ref_id={test_user}",
            headers={"host": "smspay.store"},
        )
        fav_hrefs_restored = [f["menu_href"] for f in res_list_restored.json()["favorites"]]
        assert "/retailer/wallet" in fav_hrefs_restored
        assert "/retailer/payin" in fav_hrefs_restored


@pytest.mark.asyncio
async def test_favorites_company_isolation(mock_db_fixture):
    """Verify that retailer favorites are isolated by company context."""
    shared_user = f"cross_comp_{uuid.uuid4().hex[:8]}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Add favorite under SMSPAY
        res_smspay = await ac.post(
            "/api/v1/favorites/toggle",
            headers={"host": "smspay.store"},
            json={
                "user_ref_id": shared_user,
                "menu_href": "/retailer/wallet",
                "menu_label": "Wallet",
            },
        )
        assert res_smspay.status_code == 200

        # Query favorites under SMSPAY -> should contain /retailer/wallet
        list_smspay = await ac.get(
            f"/api/v1/favorites/menus?user_ref_id={shared_user}",
            headers={"host": "smspay.store"},
        )
        smspay_items = [f["menu_href"] for f in list_smspay.json()["favorites"]]
        assert "/retailer/wallet" in smspay_items

        # Query favorites under Pay2Pay -> should be empty for this company
        list_p2p = await ac.get(
            f"/api/v1/favorites/menus?user_ref_id={shared_user}",
            headers={"host": "pay2pay.in"},
        )
        p2p_items = [f["menu_href"] for f in list_p2p.json()["favorites"]]
        assert "/retailer/wallet" not in p2p_items
