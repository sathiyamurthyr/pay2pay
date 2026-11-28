import io
import uuid
import pytest
from types import SimpleNamespace
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.application.dependencies import (
    CompanyContext,
    get_company_context,
    get_current_token_payload,
)
from app.infrastructure.db.models import CompanyModel, CompanyBrandingModel
from app.infrastructure.db.company_profile_models import CompanyProfileModel
from app.core.domain_resolver import clear_domain_cache


class _FakeScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None


class _FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return _FakeScalars(self._items)

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None

    def fetchall(self):
        return list(self._items)


class _InMemoryCompanyDB:
    def __init__(self):
        n4u_id = uuid.UUID("c1111111-1111-1111-1111-111111111111")
        smsp_id = uuid.UUID("b1e02b56-7742-4549-a4ef-31f5378f00a8")
        p2p_id = uuid.UUID("ea4d39d8-b7c1-471c-a59f-daf98ba648f1")

        self.companies = [
            CompanyModel(
                id=6,
                public_id=n4u_id,
                company_ref_id=1,
                tenant_ref_id=1,
                tenant_id=uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68"),
                company_code="NEAR4YOU",
                company_name="SATHUS TECHNOLOGY PRIVATE LIMITED",
                legal_name="SATHUS TECHNOLOGY PRIVATE LIMITED",
                display_name="Near4You",
                company_type="PRIVATE_LIMITED",
                website="https://near4you.store",
                status="ACTIVE",
                is_active=True,
                is_deleted=False,
            ),
            CompanyModel(
                id=7,
                public_id=smsp_id,
                company_ref_id=2,
                tenant_ref_id=39,
                tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                company_code="SMSPAY",
                company_name="INSPEL TECHNOLOGIES SOLUTIONS PVT",
                legal_name="INSPEL TECHNOLOGIES SOLUTIONS PVT",
                display_name="SMSPAY",
                company_type="PRIVATE_LIMITED",
                website="https://smspay.store",
                status="ACTIVE",
                is_active=True,
                is_deleted=False,
            ),
            CompanyModel(
                id=11,
                public_id=p2p_id,
                company_ref_id=47,
                tenant_ref_id=1,
                tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                company_code="PAY2PAY",
                company_name="SUPER REX PRODUCTS PRIVATE LIMITED",
                legal_name="SUPER REX PRODUCTS PRIVATE LIMITED",
                display_name="Pay2Pay",
                company_type="PRIVATE_LIMITED",
                website="https://pay2pay.in",
                status="ACTIVE",
                is_active=True,
                is_deleted=False,
            ),
        ]
        self.brandings = [
            CompanyBrandingModel(
                id=1,
                public_id=uuid.uuid4(),
                company_id=n4u_id,
                logo_url="/branding/logo.svg",
                favicon_url="/branding/near4you-favicon.png",
                primary_colour="#A20A3A",
                secondary_colour="#EDC11E",
                is_active=True,
                is_deleted=False,
            ),
            CompanyBrandingModel(
                id=2,
                public_id=uuid.uuid4(),
                company_id=smsp_id,
                logo_url="/branding/smspay-logo.svg",
                favicon_url="/branding/smspay-favicon-32x32.png",
                primary_colour="#0F3B7D",
                secondary_colour="#D4AF37",
                is_active=True,
                is_deleted=False,
            ),
            CompanyBrandingModel(
                id=3,
                public_id=uuid.uuid4(),
                company_id=p2p_id,
                logo_url="/branding/pay2pay-logo.png",
                favicon_url="/branding/pay2pay-favicon.png",
                primary_colour="#2563EB",
                secondary_colour="#1E40AF",
                is_active=True,
                is_deleted=False,
            ),
        ]
        self.profiles = []
        self._next_pk = 1
        self._domains_by_ref = {
            1: ["near4you.store", "login.near4you.store", "admin.near4you.store"],
            2: ["smspay.store", "login.smspay.store", "admin.smspay.store"],
            47: ["pay2pay.in", "login.pay2pay.in", "admin.pay2pay.in"],
        }

    def add(self, obj):
        if isinstance(obj, CompanyProfileModel):
            obj.company_profile_ref_id = self._next_pk
            self._next_pk += 1
            self.profiles.append(obj)

    async def commit(self):
        return None

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        compiled = stmt.compile().params if hasattr(stmt, "compile") else (params or {})
        params = params or {}

        # Domain resolver query
        if "FROM public.company c" in sql and "configured_domains" in sql:
            rows = []
            for c in self.companies:
                m = {
                    "company_ref_id": c.company_ref_id,
                    "company_code": c.company_code,
                    "company_name": c.company_name,
                    "legal_name": c.legal_name,
                    "display_name": c.display_name,
                    "tenant_ref_id": c.tenant_ref_id,
                    "company_id": c.public_id,
                    "tenant_id": c.tenant_id,
                    "website": c.website,
                    "configured_domains": self._domains_by_ref[c.company_ref_id],
                }
                rows.append(SimpleNamespace(_mapping=m))
            return _FakeResult(rows)

        if "FROM company_profile" in sql:
            comp_ref = compiled.get("company_ref_id_1")
            res = [p for p in self.profiles if not p.is_deleted and (comp_ref is None or p.company_ref_id == int(comp_ref))]
            return _FakeResult(res)

        if "FROM company_branding" in sql:
            comp_id = compiled.get("company_id_1")
            res = [b for b in self.brandings if not b.is_deleted and (comp_id is None or str(b.company_id) == str(comp_id))]
            return _FakeResult(res)

        if "FROM company" in sql:
            comp_ref = compiled.get("company_ref_id_1")
            res = [c for c in self.companies if not c.is_deleted and (comp_ref is None or c.company_ref_id == int(comp_ref))]
            return _FakeResult(res)

        return _FakeResult([])


def _make_admin_ctx(company_ref_id: int, role: str = "ADMIN", is_super: bool = False):
    return CompanyContext(
        company_ref_id=company_ref_id,
        is_super_admin=is_super,
        user=SimpleNamespace(email=f"admin@{company_ref_id}.test", user_type=role, user_roles=[]),
        role=role,
        tenant_ref_id=1,
    )


@pytest.mark.asyncio
async def test_company_profile_admin_crud_logo_and_retailer_sync():
    db = _InMemoryCompanyDB()
    clear_domain_cache()

    active_ctx = _make_admin_ctx(company_ref_id=2, role="ADMIN")
    active_payload = {"sub": str(uuid.uuid4()), "company_ref_id": 2, "roles": ["RETAILER"]}

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_company_context] = lambda: active_ctx
    app.dependency_overrides[get_current_token_payload] = lambda: active_payload

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://admin.smspay.store") as ac:
            # 1. Create SMSPAY company profile
            create_payload = {
                "company_legal_name": "INSPEL TECHNOLOGIES SOLUTIONS PVT",
                "brand_name": "SMSPay",
                "operating_partner_info": "Official Operating Partner & Enterprise FinTech Network",
                "corporate_portal_url": "https://smspay.store",
                "regulatory_status_badge": "RBI / NPCI Authorized",
                "cin_number": "U72900TN2021PTC111111",
                "gstin": "33AAACI1234A1Z5",
                "business_entity_type": "Private Limited Company",
                "industry_sector": "FinTech & Payment Solutions",
                "operating_status": "ACTIVE & REGULATED",
                "support_helpline": "1800 100 2020",
                "support_email": "support@smspay.store",
                "whatsapp_number": "+91 90000 11111",
                "operating_hours": "Mon - Sat | 09:00 AM - 07:00 PM IST",
                "direct_operations_line": "+91 44 4000 1000",
                "registered_office_address": "101 Tech Park, Chennai, TN 600001",
                "official_website_url": "https://smspay.store",
                "grievance_officer_name": "Ramesh Kumar",
                "grievance_officer_designation": "Nodal Grievance Officer",
                "grievance_escalation_email": "grievance@smspay.store",
                "tat_level_1": "Level 1: 24h",
                "tat_level_2": "Grievance Escalation: 48-72h",
            }
            res = await ac.post("/api/v1/company-profile/admin", json=create_payload)
            assert res.status_code == 200, res.text
            data = res.json()["data"]
            assert data["company_ref_id"] == 2
            assert data["brand_name"] == "SMSPay"
            assert data["cin_number"] == "U72900TN2021PTC111111"
            assert data["gstin"] == "33AAACI1234A1Z5"
            assert data["support_helpline"] == "1800 100 2020"

            # 2. Upload logo and verify sync
            logo_res = await ac.post(
                "/api/v1/company-profile/upload-logo",
                files={"file": ("smspay_logo.png", io.BytesIO(b"\x89PNG\r\n\x1a\nfake"), "image/png")},
                data={"persist": "true"},
            )
            assert logo_res.status_code == 200, logo_res.text
            uploaded_logo = logo_res.json()["logo_url"]
            assert uploaded_logo.startswith("/uploads/company-logos/")

            # 3. Update profile fields via PUT
            update_payload = {**create_payload, "support_helpline": "1800 555 9999", "logo_url": uploaded_logo}
            upd_res = await ac.put("/api/v1/company-profile/admin", json=update_payload)
            assert upd_res.status_code == 200
            assert upd_res.json()["data"]["support_helpline"] == "1800 555 9999"

            # 4. Retailer read-only endpoint returns exact updated SMSPay data
            async with AsyncClient(transport=transport, base_url="http://login.smspay.store") as ret_ac:
                r_res = await ret_ac.get("/api/v1/company-profile/current", headers={"host": "login.smspay.store"})
                assert r_res.status_code == 200, r_res.text
                r_data = r_res.json()["data"]
                assert r_data["company_code"] == "SMSPAY"
                assert r_data["support_helpline"] == "1800 555 9999"
                assert r_data["logo_url"] == uploaded_logo
                assert r_data["grievance_officer_name"] == "Ramesh Kumar"

                # 5. Cross-domain mismatch fails closed with 403 Forbidden (SMSPay retailer on Near4You domain)
                mismatch_res = await ret_ac.get("/api/v1/company-profile/current", headers={"host": "login.near4you.store"})
                assert mismatch_res.status_code == 403

            # 6. Admin cross-company IDOR attempt fails with 403
            idor_res = await ac.get("/api/v1/company-profile/admin?company_ref_id=1")
            assert idor_res.status_code == 403

            # 7. Retailer token trying Admin endpoint fails with 403
            active_ctx = _make_admin_ctx(company_ref_id=2, role="RETAILER")
            app.dependency_overrides[get_company_context] = lambda: active_ctx
            retailer_mut = await ac.put("/api/v1/company-profile/admin", json=update_payload)
            assert retailer_mut.status_code == 403
    finally:
        app.dependency_overrides.clear()
        clear_domain_cache()


@pytest.mark.asyncio
async def test_company_profile_independent_all_three_domains():
    """Verify Near4You, SMSPay, and Pay2Pay maintain isolated profiles & allow empty optional fields."""
    db = _InMemoryCompanyDB()
    clear_domain_cache()

    domains_map = [
        (1, "NEAR4YOU", "login.near4you.store", "SATHUS TECHNOLOGY PRIVATE LIMITED", "Near4You"),
        (2, "SMSPAY", "login.smspay.store", "INSPEL TECHNOLOGIES SOLUTIONS PVT", "SMSPay"),
        (47, "PAY2PAY", "pay2pay.in", "SUPER REX PRODUCTS PRIVATE LIMITED", "Pay2Pay"),
    ]

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app)
        for comp_ref, code, host, legal, brand in domains_map:
            ctx = _make_admin_ctx(company_ref_id=comp_ref, role="ADMIN")
            payload = {"sub": str(uuid.uuid4()), "company_ref_id": comp_ref, "roles": ["RETAILER"]}
            app.dependency_overrides[get_company_context] = lambda c=ctx: c
            app.dependency_overrides[get_current_token_payload] = lambda p=payload: p

            async with AsyncClient(transport=transport, base_url=f"http://{host}") as ac:
                save_res = await ac.put(
                    "/api/v1/company-profile/admin",
                    headers={"host": host},
                    json={
                        "company_legal_name": legal,
                        "brand_name": brand,
                        "support_email": f"support@{host.replace('login.', '')}",
                        "cin_number": "",  # optional omitted
                        "gstin": "",       # optional omitted
                    },
                )
                assert save_res.status_code == 200, save_res.text

                ret_res = await ac.get("/api/v1/company-profile/current", headers={"host": host})
                assert ret_res.status_code == 200, ret_res.text
                rdata = ret_res.json()["data"]
                assert rdata["company_code"] == code
                assert rdata["company_legal_name"] == legal
                assert rdata["brand_name"] == brand
                assert rdata["cin_number"] is None
                assert rdata["gstin"] is None
    finally:
        app.dependency_overrides.clear()
        clear_domain_cache()
