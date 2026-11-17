import sys
import os
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def retailer_user_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def other_retailer_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def retailer_jwt_token(retailer_user_id: str) -> str:
    """Generate a valid JWT token representing a Retailer user."""
    return create_access_token(
        subject=retailer_user_id,
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        user_type="RETAILER",
        retailer_id=retailer_user_id,
        retailer_code="RET-TEST-001",
        email="test_retailer@pay2pay.in",
        expires_delta=timedelta(hours=2)
    )


@pytest.fixture
def expired_jwt_token() -> str:
    """Generate an explicitly expired JWT token."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["RETAILER"],
        user_type="RETAILER",
        email="expired_user@pay2pay.in",
        expires_delta=timedelta(seconds=-3600)  # Expired 1 hour ago
    )


@pytest.fixture
def admin_jwt_token() -> str:
    """Generate a valid JWT token representing a Platform Admin."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        roles=["PLATFORM_ADMIN"],
        user_type="PLATFORM_ADMIN",
        email="platform_admin@pay2pay.in",
        expires_delta=timedelta(hours=2)
    )


# ==============================================================================
# 1. EXPIRED TOKEN REJECTION & AUTHENTICATION GATES
# ==============================================================================

@pytest.mark.asyncio
async def test_expired_jwt_token_rejected_401(expired_jwt_token: str):
    """Expired JWT access token must immediately fail with HTTP 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {expired_jwt_token}"}
        res = await ac.get("/api/v1/users/menu-access", headers=headers)
        assert res.status_code == 401, f"Expected 401 for expired token, got {res.status_code}"


@pytest.mark.asyncio
async def test_expired_token_rejected_on_topup_my_requests(expired_jwt_token: str):
    """Expired token on /topup/my-requests must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {expired_jwt_token}"}
        res = await ac.get("/api/v1/topup/my-requests", headers=headers)
        assert res.status_code == 401, f"Expected 401 for expired token, got {res.status_code}"


# ==============================================================================
# 2. BROKEN FUNCTION LEVEL AUTHORIZATION (BFLA) GATES (PAY2PAY-CRIT-02, CRIT-03)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_admin_payout_routing_rejected_401():
    """Unauthenticated calls to /admin/payout-routing must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/payout-routing/config")
        assert res.status_code in (401, 403), f"Expected 401/403, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_admin_payout_routing_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /admin/payout-routing/config must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/admin/payout-routing/config", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden for retailer, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_admin_payout_routing_switch_forbidden_403(retailer_jwt_token: str):
    """Retailer token attempting to switch payout gateway must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.post("/api/v1/admin/payout-routing/switch", headers=headers, json={
            "provider_code": "BULKPE",
            "reason": "Unauthorized test switch"
        })
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"


@pytest.mark.asyncio
async def test_unauthenticated_admin_transaction_operations_rejected_401():
    """Unauthenticated calls to /admin/transactions/pending/unified-list must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/admin/transactions/pending/unified-list")
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_retailer_calling_admin_transaction_operations_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /admin/transactions/pending/unified-list must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/admin/transactions/pending/unified-list", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden for retailer, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_admin_operation_wallets_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /admin/operation-wallets must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/admin/operation-wallets", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden for retailer, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_admin_sales_management_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /admin/sales-management/users must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/admin/sales-management/users", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden for retailer, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_admin_payout_slabs_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /admin/payout-slabs must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/admin/payout-slabs", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden for retailer, got {res.status_code}"


# ==============================================================================
# 3. WEBHOOK LOGS & SENSITIVE DATA EXPOSURE GATES (PAY2PAY-HIGH-03)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_payout_webhook_logs_rejected_401():
    """Unauthenticated calls to /payout/webhook/logs must return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/payout/webhook/logs")
        assert res.status_code in (401, 403), f"Expected 401/403, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_payout_webhook_logs_forbidden_403(retailer_jwt_token: str):
    """Retailer token attempting to read all gateway webhook logs must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/payout/webhook/logs", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"


# ==============================================================================
# 4. TOPUP IDOR & RETAILER CROSS-TENANT ISOLATION (PAY2PAY-HIGH-02)
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_topup_my_requests_rejected_401():
    """Unauthenticated call to /topup/my-requests must return HTTP 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/topup/my-requests")
        assert res.status_code == 401, f"Expected 401 Unauthorized, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_topup_idor_rejected_403(retailer_jwt_token: str, other_retailer_id: str):
    """Retailer attempting to fetch another retailer's topup requests must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get(f"/api/v1/topup/my-requests?retailer_id={other_retailer_id}", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden for IDOR query, got {res.status_code}"


# ==============================================================================
# 5. DASHBOARD ROLE SCOPING & KPI PROTECTION
# ==============================================================================

@pytest.mark.asyncio
async def test_retailer_calling_admin_dashboard_widgets_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /dashboard/widgets must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/dashboard/widgets", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"


@pytest.mark.asyncio
async def test_retailer_calling_admin_dashboard_summary_forbidden_403(retailer_jwt_token: str):
    """Retailer token calling /dashboard/summary must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.get("/api/v1/dashboard/summary", headers=headers)
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"


# ==============================================================================
# 6. MPIN VERIFY CALLER AUTHORIZATION
# ==============================================================================

@pytest.mark.asyncio
async def test_retailer_mpin_verify_by_wrong_retailer_forbidden_403(retailer_jwt_token: str, other_retailer_id: str):
    """Calling /retailers/mpin/verify with mismatched retailer_id must receive HTTP 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {retailer_jwt_token}"}
        res = await ac.post("/api/v1/retailers/mpin/verify", headers=headers, json={
            "retailer_id": other_retailer_id,
            "mpin": "1234"
        })
        assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"


# ==============================================================================
# 7. ADMIN AUTHORIZATION SANITY CHECK
# ==============================================================================

@pytest.mark.asyncio
async def test_admin_authorized_on_admin_routes(admin_jwt_token: str):
    """Admin token must NOT receive 401 or 403 on admin-governed endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": f"Bearer {admin_jwt_token}"}

        # Check payout routing config
        res_route = await ac.get("/api/v1/admin/payout-routing/config", headers=headers)
        assert res_route.status_code not in (401, 403), f"Admin was blocked: {res_route.status_code}"

        # Check payout webhook logs
        res_logs = await ac.get("/api/v1/payout/webhook/logs", headers=headers)
        assert res_logs.status_code not in (401, 403), f"Admin was blocked on logs: {res_logs.status_code}"
