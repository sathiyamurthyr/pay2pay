import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import Request
from app.presentation.api.v1.company_branding_router import (
    get_authenticated_company_branding,
    resolve_by_domain,
    resolve_brand_metadata
)


class MockRequest:
    def __init__(self, headers=None, query_params=None, cookies=None):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.cookies = cookies or {}


@pytest.mark.asyncio
async def test_branding_endpoint_smspay_domain():
    req = MockRequest(headers={"host": "smspay.store"})
    mock_db = AsyncMock()

    # Mock DB returns superrex row (company_ref_id=2)
    mock_row = MagicMock()
    mock_row._mapping = {
        "id": 2,
        "company_id": "b1e02b56-7742-4549-a4ef-31f5378f00a8",
        "company_ref_id": 2,
        "tenant_ref_id": 1,
        "company_code": "SUPERREX",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "legal_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "display_name": "Super Rex Products",
        "website": "https://smspay.store",
        "configured_domains": '["smspay.store", "login.smspay.store"]',
        "logo_url": "/branding/smspay-logo.svg",
        "favicon_url": "/branding/smspay-mark.svg",
        "primary_colour": "#059669",
        "secondary_colour": "#047857"
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_res

    res = await get_authenticated_company_branding(
        request=req,
        domain="smspay.store",
        company="SMSPAY",
        company_ref_id_param=None,
        db=mock_db
    )
    assert res["success"] is True
    data = res["data"]
    assert data["company_code"] == "SMSPAY"
    assert data["display_name"] == "SMSPAY"
    assert data["logo_url"] == "/branding/smspay-logo.svg"
    assert data["favicon_url"] == "/branding/smspay-favicon-32x32.png"
    assert data["primary_colour"] == "#059669"
    assert data["secondary_colour"] == "#047857"
    assert data["legal_name"] == "SMSPAY Technologies Pvt. Ltd."


@pytest.mark.asyncio
async def test_branding_endpoint_smspay_port_4002():
    req = MockRequest(headers={"host": "localhost:4002"})
    mock_db = AsyncMock()

    mock_row = MagicMock()
    mock_row._mapping = {
        "id": 2,
        "company_id": "b1e02b56-7742-4549-a4ef-31f5378f00a8",
        "company_ref_id": 2,
        "tenant_ref_id": 1,
        "company_code": "SUPERREX",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "legal_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "display_name": "Super Rex Products",
        "website": "https://smspay.store",
        "configured_domains": '["smspay.store", "login.smspay.store"]',
        "logo_url": "/branding/smspay-logo.svg",
        "favicon_url": "/branding/smspay-mark.svg",
        "primary_colour": "#059669",
        "secondary_colour": "#047857"
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_res

    res = await get_authenticated_company_branding(
        request=req,
        domain=None,
        company=None,
        company_ref_id_param=None,
        db=mock_db
    )
    assert res["success"] is True
    data = res["data"]
    assert data["company_code"] == "SMSPAY"
    assert data["favicon_url"] == "/branding/smspay-favicon-32x32.png"
    assert data["primary_colour"] == "#059669"


@pytest.mark.asyncio
async def test_branding_endpoint_pay2pay_domain():
    req = MockRequest(headers={"host": "login.pay2pay.in"})
    mock_db = AsyncMock()

    mock_row = MagicMock()
    mock_row._mapping = {
        "id": 47,
        "company_id": "c1111111-1111-1111-1111-111111111111",
        "company_ref_id": 47,
        "tenant_ref_id": 1,
        "company_code": "PAY2PAY",
        "company_name": "Pay2Pay FinTech Platform",
        "legal_name": "Pay2Pay FinTech Solutions Pvt. Ltd.",
        "display_name": "Pay2Pay",
        "website": "https://pay2pay.in",
        "configured_domains": '["pay2pay.in", "login.pay2pay.in"]',
        "logo_url": "/branding/pay2pay-logo.png",
        "favicon_url": "/branding/pay2pay-favicon.png",
        "primary_colour": "#2563EB",
        "secondary_colour": "#1E40AF"
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_res

    res = await get_authenticated_company_branding(
        request=req,
        domain="pay2pay.in",
        company="PAY2PAY",
        company_ref_id_param=None,
        db=mock_db
    )
    assert res["success"] is True
    data = res["data"]
    assert data["company_code"] == "PAY2PAY"
    assert data["display_name"] == "Pay2Pay"
    assert data["logo_url"] == "/branding/pay2pay-logo.png"
    assert data["favicon_url"] == "/branding/pay2pay-favicon.png"
    assert data["primary_colour"] == "#2563EB"
    assert data["secondary_colour"] == "#1E40AF"


@pytest.mark.asyncio
async def test_branding_endpoint_near4you_domain():
    req = MockRequest(headers={"host": "login.near4you.store"})
    mock_db = AsyncMock()

    mock_row = MagicMock()
    mock_row._mapping = {
        "id": 1,
        "company_id": "c1111111-1111-1111-1111-111111111111",
        "company_ref_id": 1,
        "tenant_ref_id": 1,
        "company_code": "NEAR4YOU",
        "company_name": "Near4You",
        "legal_name": "Near4You Enterprise Technologies Pvt. Ltd.",
        "display_name": "Near4You",
        "website": "https://near4you.store",
        "configured_domains": '["near4you.store", "login.near4you.store"]',
        "logo_url": "/branding/logo.svg",
        "favicon_url": "/branding/favicon.png",
        "primary_colour": "#A20A3A",
        "secondary_colour": "#EDC11E"
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row
    mock_db.execute.return_value = mock_res

    res = await get_authenticated_company_branding(
        request=req,
        domain="near4you.store",
        company="NEAR4YOU",
        company_ref_id_param=None,
        db=mock_db
    )
    assert res["success"] is True
    data = res["data"]
    assert data["company_code"] == "NEAR4YOU"
    assert data["display_name"] == "Near4You"
    assert data["logo_url"] == "/branding/logo.svg"
    assert data["favicon_url"] == "/branding/favicon.png"
    assert data["primary_colour"] == "#A20A3A"
    assert data["secondary_colour"] == "#EDC11E"


@pytest.mark.asyncio
async def test_resolve_by_domain_endpoint():
    mock_db = AsyncMock()

    mock_row_smspay = MagicMock()
    mock_row_smspay._mapping = {
        "id": 2,
        "company_id": "b1e02b56-7742-4549-a4ef-31f5378f00a8",
        "company_ref_id": 2,
        "tenant_ref_id": 1,
        "company_code": "SUPERREX",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "legal_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "display_name": "SMSPAY",
        "website": "https://smspay.store",
        "configured_domains": '["smspay.store"]',
        "logo_url": "/branding/smspay-logo.svg",
        "favicon_url": "/branding/smspay-mark.svg",
        "primary_colour": "#059669",
        "secondary_colour": "#047857"
    }
    mock_res = MagicMock()
    mock_res.fetchone.return_value = mock_row_smspay
    mock_db.execute.return_value = mock_res

    res = await resolve_by_domain(domain="smspay.store", db=mock_db)
    assert res["success"] is True
    assert res["data"]["company_code"] == "SMSPAY"
    assert res["data"]["favicon_url"] == "/branding/smspay-favicon-32x32.png"
    assert res["data"]["primary_colour"] == "#059669"
