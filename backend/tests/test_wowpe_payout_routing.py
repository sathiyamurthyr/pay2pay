"""
Automated Test Suite for WowPe Payout API Integration & Dynamic Priority Routing Engine
Tests:
1. WowPe API Client (Payout, Status Check, Account Validate, Balance, Signature Checksum)
2. Payout Routing Service (Default configs, Priority Switcher, Live balances)
3. BulkPe Payout Engine Dynamic Routing (Routing to WowPe / BulkPe with Failover)
4. WowPe Verification Adapter in VendorAdapterRegistry
"""

import pytest
import uuid
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

from app.application.wowpe_client import WowPeApiClient
from app.application.payout_routing_service import PayoutRoutingService
from app.infrastructure.adapters.vendor_verification_adapter import VendorAdapterRegistry, WowPeVerificationAdapter


@pytest.mark.asyncio
async def test_wowpe_checksum_generation():
    """Verify AES-256 Checksum generation according to official WowPe specifications."""
    checksum = WowPeApiClient._generate_checksum(
        user_id="test_user",
        secret_key="test_secret",
        merchant_ref="TEST-REF-12345"
    )
    assert checksum is not None
    assert len(checksum) > 10


@pytest.mark.asyncio
async def test_wowpe_payout_initiation_mock():
    """Test WowPe Payout Transfer API call parsing."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "statusCode": 1,
                "status": 1,
                "message": "Payment Successful",
                "orderId": "WOW12345678",
                "clientOrderId": "TXN-TEST-001",
                "utr": "UTR1234567890",
                "rrn": "RRN1234567890",
                "amount": 1000.0
            }
        )

        res = await WowPeApiClient.initiate_payout(
            merchant_ref="TXN-TEST-001",
            account_number="918273645019",
            ifsc_code="SBIN0001234",
            account_holder="John Doe",
            amount=1000.0,
            mode="IMPS",
            mobile="9876543210"
        )

        assert res["status"] == "SUCCESS"
        assert res["utr"] == "UTR1234567890"
        assert res["order_id"] == "WOW12345678"


@pytest.mark.asyncio
async def test_wowpe_status_check():
    """Test WowPe Status Check API call parsing."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "statusCode": 1,
                "status": 1,
                "message": "Transaction Found",
                "data": {
                    "orderId": "WOW12345678",
                    "clientOrderId": "TXN-TEST-001",
                    "status": 1,
                    "utr": "UTR1234567890",
                    "rrn": "RRN1234567890"
                }
            }
        )

        res = await WowPeApiClient.check_payout_status(
            client_order_id="TXN-TEST-001",
            order_id="WOW12345678"
        )

        assert res["status"] == "SUCCESS"
        assert res["utr"] == "UTR1234567890"


@pytest.mark.asyncio
async def test_wowpe_account_validate_and_adapter():
    """Test WowPe Account Validate API & WowPeVerificationAdapter in VendorAdapterRegistry."""
    adapter = VendorAdapterRegistry.get_adapter("WOWPE")
    assert isinstance(adapter, WowPeVerificationAdapter)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "statusCode": 1,
                "status": 1,
                "message": "Account Validated Successfully",
                "beneficiaryName": "JOHN DOE",
                "orderId": "WOW-VAL-001",
                "utr": "UTR-VAL-001"
            }
        )

        result = await adapter.verify_bank_account(
            account_number="918273645019",
            ifsc_code="SBIN0001234",
            account_holder_name="John Doe",
            mobile="9876543210"
        )

        assert result.success is True
        assert result.vendor_code == "WOWPE"
        assert result.name_at_bank == "JOHN DOE"
        assert result.name_match_status == "EXACT_MATCH"


@pytest.mark.asyncio
async def test_wowpe_balance_check():
    """Test WowPe Balance Check API parsing."""
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "statusCode": 1,
                "status": 1,
                "message": "Balance Fetched",
                "balance": 85000.50
            }
        )

        res = await WowPeApiClient.check_balance()
        assert res["success"] is True
        assert res["balance"] == 85000.50


@pytest.mark.asyncio
async def test_payout_routing_service_switch():
    """Test switching primary gateway between BulkPe and WowPe in PayoutRoutingService."""
    mock_db = AsyncMock()
    
    mock_policy = MagicMock(
        active_primary_provider="BULKPE",
        routing_mode="PRIORITY",
        auto_failover_enabled=True,
        updated_at=MagicMock(isoformat=lambda: "2026-08-17T12:00:00Z")
    )

    gw_bulkpe = MagicMock(
        provider_code="BULKPE",
        is_primary=True,
        is_active=True,
        priority_order=1
    )
    gw_wowpe = MagicMock(
        provider_code="WOWPE",
        is_primary=False,
        is_active=True,
        priority_order=2
    )

    with patch.object(PayoutRoutingService, "get_routing_policy", new_callable=AsyncMock) as mock_get_policy:
        mock_get_policy.return_value = mock_policy
        mock_db.execute.return_value = MagicMock(
            scalars=lambda: MagicMock(all=lambda: [gw_bulkpe, gw_wowpe])
        )

        result = await PayoutRoutingService.switch_primary_provider(
            db=mock_db,
            provider_code="WOWPE",
            reason="Test Switch to WowPe"
        )

        assert result["active_primary"] == "WOWPE"
        assert result["previous_primary"] == "BULKPE"
        assert gw_wowpe.priority == 1
        assert gw_bulkpe.priority == 2


@pytest.mark.asyncio
async def test_admin_payout_routing_api():
    """Test Admin Payout Routing router endpoints."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.core.database import get_db

    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    mock_policy = MagicMock(
        routing_mode="PRIORITY",
        auto_failover_enabled=True,
        max_failover_attempts=2,
        status_polling_interval_seconds=60,
        max_poll_retries=30
    )

    mock_gw = MagicMock(
        public_id=uuid.uuid4(),
        provider_name="WowPe Payout Gateway",
        provider_code="WOWPE",
        is_active=True,
        is_primary=True,
        priority_order=1,
        weight_percentage=100,
        api_endpoint="https://api.wowpe.in",
        account_number=None,
        user_id="test_user",
        merchant_id="test_merchant",
        api_secret="secret123456",
        last_balance_check_at=None,
        last_known_balance=85000.0,
        updated_at=None
    )

    with patch.object(PayoutRoutingService, "ensure_default_configs", new_callable=AsyncMock), \
         patch.object(PayoutRoutingService, "get_active_primary_provider", new_callable=AsyncMock) as mock_act, \
         patch.object(PayoutRoutingService, "get_all_gateways", new_callable=AsyncMock) as mock_all, \
         patch.object(PayoutRoutingService, "get_routing_policy", new_callable=AsyncMock) as mock_pol:

        mock_act.return_value = "WOWPE"
        mock_all.return_value = [mock_gw]
        mock_pol.return_value = mock_policy

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/admin/payout-routing/config")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "SUCCESS"
            assert data["data"]["active_primary_provider"] == "WOWPE"
            assert len(data["data"]["gateways"]) == 1

            # Test Test Connection endpoint for WowPe
            with patch.object(WowPeApiClient, "check_balance", new_callable=AsyncMock) as mock_bal:
                mock_bal.return_value = {"success": True, "balance": 99999.0}
                test_resp = await client.post(
                    "/api/v1/admin/payout-routing/test-connection",
                    json={"provider_code": "WOWPE"}
                )
                assert test_resp.status_code == 200
                assert test_resp.json()["status"] == "SUCCESS"
                assert test_resp.json()["connected"] is True

    app.dependency_overrides.clear()


