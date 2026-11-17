import sys
import os
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def retailer_jwt_token() -> str:
    """Generate a valid JWT token representing a Retailer user."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        user_type="RETAILER",
        email="test_retailer@pay2pay.in"
    )


@pytest.fixture
def admin_jwt_token() -> str:
    """Generate a valid JWT token representing an Administrative user."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["PLATFORM_ADMIN"],
        user_type="PLATFORM_ADMIN",
        email="security_auditor@pay2pay.in"
    )


# ==============================================================================
# 1. FINANCIAL ADJUSTMENT ENDPOINTS (PAY2PAY-CRIT-01)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_financial_adjust_rejected_401():
    """Unauthenticated POST to /wallet/adjust must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/wallet/adjust", json={
            "retailer_id": str(uuid.uuid4()),
            "amount": 1000.0,
            "action": "CREDIT"
        })
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_unauthenticated_balance_update_rejected_401():
    """Unauthenticated POST to /wallet/balance-update must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/wallet/balance-update", json={
            "retailer_id": str(uuid.uuid4()),
            "amount": 500.0,
            "action": "DEBIT"
        })
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_retailer_cannot_adjust_wallet_rejected_403(retailer_jwt_token):
    """A standard Retailer token attempting POST /wallet/adjust must be denied with 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.post("/api/v1/wallet/adjust", headers=headers, json={
            "retailer_id": str(uuid.uuid4()),
            "entry_type": "CREDIT",
            "amount": 1000.0,
            "service_name": "MANUAL_ADJUSTMENT"
        })
        assert res.status_code == 403
        data = res.json()
        assert "Administrative privileges required" in data.get("detail", "")


# ==============================================================================
# 2. DOCUMENT UPLOAD & PATH TRAVERSAL (PAY2PAY-CRIT-02 & HIGH-02)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_upload_document_rejected_401():
    """Unauthenticated GET to /upload/document must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/upload/document?path=kyc/sample.pdf")
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_unauthenticated_upload_signed_url_rejected_401():
    """Unauthenticated GET to /upload/signed-url must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/upload/signed-url?path=kyc/sample.pdf")
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_path_traversal_blocked_in_document_endpoint_400(retailer_jwt_token):
    """Path traversal attempt in /upload/document with .. must return 400 Bad Request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        # Unix-style traversal
        res1 = await ac.get("/api/v1/upload/document?path=../../etc/passwd", headers=headers)
        assert res1.status_code == 400
        assert "Invalid document path" in res1.json().get("detail", "")

        # Windows-style traversal
        res2 = await ac.get("/api/v1/upload/document?path=..\\..\\windows\\system32", headers=headers)
        assert res2.status_code == 400
        assert "Invalid document path" in res2.json().get("detail", "")


@pytest.mark.asyncio
async def test_path_traversal_blocked_in_signed_url_endpoint_400(retailer_jwt_token):
    """Path traversal attempt in /upload/signed-url with .. must return 400 Bad Request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/upload/signed-url?path=../../etc/shadow", headers=headers)
        assert res.status_code == 400
        assert "Invalid storage path" in res.json().get("detail", "")


# ==============================================================================
# 3. ADMIN RETAILER CONTROLLER RBAC (PAY2PAY-CRIT-03)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_admin_retailer_control_rejected_401():
    """Unauthenticated GET to /admin/retailer-control/list must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/retailer-control/list")
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_retailer_cannot_access_admin_retailer_control_rejected_403(retailer_jwt_token):
    """A standard Retailer token attempting /admin/retailer-control/list must be denied with 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/admin/retailer-control/list", headers=headers)
        assert res.status_code == 403
        data = res.json()
        assert "Administrative privileges required" in data.get("detail", "")


# ==============================================================================
# 4. TOPUP REQUEST RBAC & APPROVAL PROTECTION (PAY2PAY-HIGH-01)
# ==============================================================================

@pytest.mark.asyncio
async def test_retailer_cannot_approve_topup_request_rejected_403(retailer_jwt_token):
    """A standard Retailer token attempting to approve a topup request must be denied with 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.post("/api/v1/topup/requests/REQ-TEST-123/approve", headers=headers, json={
            "approved_amount": 5000.0,
            "admin_notes": "Unauthorized approval attempt"
        })
        assert res.status_code == 403
        data = res.json()
        assert "Administrative privileges required" in data.get("detail", "")


@pytest.mark.asyncio
async def test_retailer_cannot_reject_topup_request_rejected_403(retailer_jwt_token):
    """A standard Retailer token attempting to reject a topup request must be denied with 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.post("/api/v1/topup/requests/REQ-TEST-123/reject", headers=headers, json={
            "rejection_reason": "Unauthorized rejection attempt"
        })
        assert res.status_code == 403
        data = res.json()
        assert "Administrative privileges required" in data.get("detail", "")


# ==============================================================================
# 5. PUBLIC RETAILER DIRECTORY PROTECTION (PAY2PAY-HIGH-04)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_approved_retailers_directory_rejected_401():
    """Unauthenticated GET to /retailers/approved must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/retailers/approved")
        assert res.status_code in (401, 403)


# ==============================================================================
# 6. SECURITY HEADERS & CORS HARDENING (PAY2PAY-HIGH-05 & HIGH-06)
# ==============================================================================

@pytest.mark.asyncio
async def test_security_headers_present_on_response():
    """Verify production security headers (CSP, HSTS, nosniff, Frame Options) on responses."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        if res.status_code != 200:
            res = await ac.get("/docs")

        # Check required headers
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert "max-age=31536000" in res.headers.get("strict-transport-security", "")
        assert res.headers.get("x-frame-options") in ("DENY", "SAMEORIGIN")
        assert "strict-origin-when-cross-origin" in res.headers.get("referrer-policy", "")
        assert "default-src 'self'" in res.headers.get("content-security-policy", "")


@pytest.mark.asyncio
async def test_cors_untrusted_origin_not_allowed():
    """Verify that an untrusted origin is NOT granted CORS credentialed access."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {
            "Origin": "https://malicious-phishing-site.com",
            "Access-Control-Request-Method": "POST"
        }
        res = await ac.options("/api/v1/wallet/adjust", headers=headers)
        allowed_origin = res.headers.get("access-control-allow-origin")
        # Origin must NOT be reflected for unauthorized domains
        assert allowed_origin != "https://malicious-phishing-site.com"
        assert allowed_origin != "*"


# ==============================================================================
# 7. WALLET BALANCE IDOR PROTECTION (PAY2PAY-CRIT-04)
# ==============================================================================

@pytest.mark.asyncio
async def test_retailer_wallet_balance_idor_prevention(retailer_jwt_token):
    """
    A Retailer token attempting to pass an arbitrary external retailer_id or user_id must be
    blocked from viewing another retailer's wallet balance with 403 Forbidden.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        external_wallet_uuid = str(uuid.uuid4())
        res = await ac.get(f"/api/v1/wallet/balance?retailer_id={external_wallet_uuid}", headers=headers)
        assert res.status_code == 403
        data = res.json()
        assert "Retailers cannot access external wallet balances" in data.get("detail", "")
