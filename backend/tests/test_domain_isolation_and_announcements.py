import pytest
import io
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import Request
from app.core.company_resolver import resolve_request_company_ref, get_company_preset, COMPANY_MAPPINGS
from app.presentation.api.v1.announcements_router import _save_image_with_fallback


class MockRequest:
    def __init__(self, headers=None, query_params=None, cookies=None):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.cookies = cookies or {}


def test_resolve_request_company_ref_domain_patterns():
    # 1. SMSPAY domain and port
    req_smspay_host = MockRequest(headers={"host": "smspay.store"})
    assert resolve_request_company_ref(req_smspay_host) == 2

    req_smspay_port = MockRequest(headers={"host": "localhost:4002"})
    assert resolve_request_company_ref(req_smspay_port) == 2

    req_smspay_query = MockRequest(query_params={"domain": "smspay.in"})
    assert resolve_request_company_ref(req_smspay_query) == 2

    # 2. PAY2PAY domain and port
    req_p2p_host = MockRequest(headers={"host": "pay2pay.in"})
    assert resolve_request_company_ref(req_p2p_host) == 47

    req_p2p_port = MockRequest(headers={"host": "localhost:3000"})
    assert resolve_request_company_ref(req_p2p_port) == 47

    req_p2p_port_4003 = MockRequest(headers={"host": "localhost:4003"})
    assert resolve_request_company_ref(req_p2p_port_4003) == 47

    # 3. NEAR4YOU domain and port
    req_n4u_host = MockRequest(headers={"host": "near4you.store"})
    assert resolve_request_company_ref(req_n4u_host) == 1

    req_n4u_port = MockRequest(headers={"host": "localhost:4001"})
    assert resolve_request_company_ref(req_n4u_port) == 1

    # 4. Custom header override
    req_custom_ref = MockRequest(headers={"x-company-ref-id": "2"})
    assert resolve_request_company_ref(req_custom_ref) == 2


def test_get_company_preset():
    smspay = get_company_preset(2)
    assert smspay is not None
    assert smspay["company_code"] == "SMSPAY"
    assert smspay["company_name"] == "SMSPAY"
    assert smspay["website"] == "https://smspay.store"
    assert smspay["support_email"] == "support@smspay.store"

    p2p = get_company_preset(47)
    assert p2p is not None
    assert p2p["company_code"] == "PAY2PAY"
    assert p2p["company_name"] == "Pay2Pay"

    n4u = get_company_preset(1)
    assert n4u is not None
    assert n4u["company_code"] == "NEAR4YOU"


@pytest.mark.asyncio
async def test_announcement_image_fallback_to_local_storage(tmp_path):
    # Simulate Backblaze B2 failure and verify fallback to local storage
    sample_bytes = b"fake-png-content-bytes-12345"
    filename = "test_banner.png"
    content_type = "image/png"

    with patch("app.application.storage_service.BackblazeStorageService.upload_document", side_effect=Exception("B2 Invalid Token")):
        b2_key, img_url, bucket = await _save_image_with_fallback(sample_bytes, filename, content_type)

        assert bucket == "local"
        assert img_url.startswith("/uploads/announcements/")
        assert img_url.endswith(".png")
        assert b2_key.startswith("local_")


@pytest.mark.asyncio
async def test_announcement_image_b2_success():
    sample_bytes = b"fake-png-content-bytes"
    filename = "b2_banner.png"
    content_type = "image/png"

    mock_b2_res = {
        "path": "announcements/2026/banner.png",
        "url": "https://f003.backblazeb2.com/file/my-bucket/announcements/2026/banner.png"
    }

    with patch("app.application.storage_service.BackblazeStorageService.upload_document", new_callable=AsyncMock, return_value=mock_b2_res):
        b2_key, img_url, bucket = await _save_image_with_fallback(sample_bytes, filename, content_type)

        assert bucket != "local"
        assert img_url == mock_b2_res["url"]
        assert b2_key == mock_b2_res["path"]


@pytest.mark.asyncio
async def test_profile_resolve_context_cross_company_mismatch():
    from fastapi import HTTPException
    from app.presentation.api.v1.retailer_profile_router import resolve_retailer_context

    # Simulate request accessing SMSPAY domain (company_ref_id: 2) with a token carrying Pay2Pay company_ref_id (47)
    req = MockRequest(headers={
        "host": "smspay.store",
        "authorization": "Bearer dummy_pay2pay_valid_jwt_token_12345"
    })
    mock_db = AsyncMock()

    mock_payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "company_ref_id": 47,  # Pay2Pay
        "roles": ["RETAILER"]
    }

    with patch("app.core.security.decode_access_token", return_value=mock_payload):
        with pytest.raises(HTTPException) as exc_info:
            await resolve_retailer_context(req, retailer_id=None, db=mock_db)

        assert exc_info.value.status_code == 403
        assert "COMPANY_IDENTITY_MISMATCH" in exc_info.value.detail
        assert "SMSPAY" in exc_info.value.detail


@pytest.mark.asyncio
async def test_dashboard_resolve_context_cross_company_mismatch():
    from fastapi import HTTPException
    from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context

    # Simulate request accessing SMSPAY domain with Pay2Pay session token
    req = MockRequest(headers={
        "host": "smspay.store",
        "authorization": "Bearer dummy_pay2pay_valid_jwt_token_12345"
    })
    mock_db = AsyncMock()

    mock_payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "company_ref_id": 47,  # Pay2Pay
        "roles": ["RETAILER"]
    }

    with patch("app.core.security.decode_access_token", return_value=mock_payload):
        with pytest.raises(HTTPException) as exc_info:
            await resolve_retailer_context(req, retailer_id=None, db=mock_db)

        assert exc_info.value.status_code == 403
        assert "COMPANY_IDENTITY_MISMATCH" in exc_info.value.detail
        assert "SMSPAY" in exc_info.value.detail


def test_resolve_brand_metadata_strict_isolation():
    from app.presentation.api.v1.company_branding_router import resolve_brand_metadata

    # 1. SMSPAY via host hint
    smspay_meta = resolve_brand_metadata(
        code_hint=None,
        host_hint="login.smspay.store",
        db_row={"company_code": "SUPERREX", "company_ref_id": 2}
    )
    assert smspay_meta["company_code"] == "SMSPAY"
    assert smspay_meta["display_name"] == "SMSPAY"
    assert smspay_meta["logo_url"] == "/branding/smspay-logo.svg"
    assert smspay_meta["favicon_url"] == "/branding/smspay-favicon-32x32.png"
    assert smspay_meta["primary_colour"] == "#059669"
    assert smspay_meta["secondary_colour"] == "#047857"
    assert smspay_meta["legal_name"] == "SMSPAY Technologies Pvt. Ltd."

    # 2. SMSPAY via port 4002
    smspay_port_meta = resolve_brand_metadata(
        code_hint=None,
        host_hint="localhost:4002",
        db_row={"company_code": "SUPERREX", "company_ref_id": 2}
    )
    assert smspay_port_meta["company_code"] == "SMSPAY"
    assert smspay_port_meta["favicon_url"] == "/branding/smspay-favicon-32x32.png"

    # 3. Pay2Pay via host hint
    p2p_meta = resolve_brand_metadata(
        code_hint=None,
        host_hint="login.pay2pay.in",
        db_row={"company_code": "PAY2PAY", "company_ref_id": 47}
    )
    assert p2p_meta["company_code"] == "PAY2PAY"
    assert p2p_meta["display_name"] == "Pay2Pay"
    assert p2p_meta["logo_url"] == "/branding/pay2pay-logo.png"
    assert p2p_meta["favicon_url"] == "/branding/pay2pay-favicon.png"
    assert p2p_meta["primary_colour"] == "#2563EB"
    assert p2p_meta["secondary_colour"] == "#1E40AF"
    assert p2p_meta["legal_name"] == "Pay2Pay FinTech Solutions Pvt. Ltd."

    # 4. Near4You via host hint
    n4u_meta = resolve_brand_metadata(
        code_hint=None,
        host_hint="login.near4you.store",
        db_row={"company_code": "NEAR4YOU", "company_ref_id": 1}
    )
    assert n4u_meta["company_code"] == "NEAR4YOU"
    assert n4u_meta["display_name"] == "Near4You"
    assert n4u_meta["logo_url"] == "/branding/logo.svg"
    assert n4u_meta["favicon_url"] == "/branding/favicon.png"
    assert n4u_meta["primary_colour"] == "#A20A3A"
    assert n4u_meta["secondary_colour"] == "#EDC11E"
    assert n4u_meta["legal_name"] == "Near4You Enterprise Technologies Pvt. Ltd."


