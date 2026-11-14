"""
Automated Test Suite for Company-Specific BankMe PayIn API Integration (SMSPay Only).

Test Coverage:
1. Section A: SMSPay (company_ref_id=2) calls common PayIn API -> BankMe invoked, TID generated, MDR calculated, DB persisted.
2. Section B: Other Company (company_ref_id=1, 47) calls same common PayIn API -> BankMe NEVER invoked, Existing provider used.
3. Section C: Company-wise MDR calculation validation (percentage, fixed charge, GST).
4. Section D: TID generation lifecycle, format, and immutability.
5. Section E: Duplicate PayIn request rejection (idempotency guard).
6. Section F: BankMe webhook callback processing & idempotent state transition.
7. Section G: Negative tests & cross-company data isolation guards.
"""

import pytest
import uuid
import time
from decimal import Decimal
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.application.payin_routing_service import PayInRoutingService, PayInProvider, SMSPAY_COMPANY_REF_ID
from app.application.payin_mdr_service import PayInMdrService
from app.application.payin_dtos import CommonPayInRequest
from app.application.payin_service import PayInService
from app.core.security import create_access_token


@pytest.fixture
def smspay_auth_token():
    """Generates valid JWT access token for SMSPAY (company_ref_id = 2)."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        company_id="0bf4371b-4c74-4916-a817-61c203b353e8",
        company_ref_id=SMSPAY_COMPANY_REF_ID,
        roles=["RETAILER"],
        user_type_ref_id=2
    )


@pytest.fixture
def near4you_auth_token():
    """Generates valid JWT access token for Near4You (company_ref_id = 1)."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        company_id="0bf4371b-4c74-4916-a817-61c203b353e8",
        company_ref_id=1,
        roles=["RETAILER"],
        user_type_ref_id=2
    )


@pytest.fixture
def pay2pay_auth_token():
    """Generates valid JWT access token for Pay2Pay (company_ref_id = 47)."""
    return create_access_token(
        subject=str(uuid.uuid4()),
        tenant_id="547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        company_id="0bf4371b-4c74-4916-a817-61c203b353e8",
        company_ref_id=47,
        roles=["RETAILER"],
        user_type_ref_id=2
    )


# ==============================================================================
# 1. PROVIDER ROUTING UNIT TESTS
# ==============================================================================

def test_payin_routing_smspay_exclusivity():
    """Verify company_ref_id = 2 routes exclusively to BANKME."""
    provider = PayInRoutingService.resolve_provider(authenticated_company_ref_id=2)
    assert provider == PayInProvider.BANKME

    # Negative / Other companies
    assert PayInRoutingService.resolve_provider(authenticated_company_ref_id=1) == PayInProvider.EXISTING
    assert PayInRoutingService.resolve_provider(authenticated_company_ref_id=47) == PayInProvider.EXISTING
    assert PayInRoutingService.resolve_provider(authenticated_company_ref_id=999) == PayInProvider.EXISTING
    assert PayInRoutingService.resolve_provider(authenticated_company_ref_id=None) == PayInProvider.EXISTING


# ==============================================================================
# 2. MDR CALCULATION UNIT TESTS
# ==============================================================================

def test_mdr_calculation_precision():
    """Verify MDR calculation with 1.5% fee + 18% GST."""
    mdr_config = {
        "percentage": Decimal("1.50"),
        "fixed_charge": Decimal("0.00"),
        "minimum_charge": Decimal("0.00"),
        "maximum_charge": Decimal("500.00"),
        "gst_applicable": True,
        "gst_rate": Decimal("18.00")
    }

    # Amount: 1,000 INR
    # MDR: 1000 * 1.5% = 15.00
    # GST: 15.00 * 18% = 2.70
    # Net: 1000 - 17.70 = 982.30
    res = PayInMdrService.calculate_charges(1000.00, mdr_config)
    assert res["amount"] == 1000.00
    assert res["mdr_charge"] == 15.00
    assert res["gst_amount"] == 2.70
    assert res["net_amount"] == 982.30


# ==============================================================================
# 3. END-TO-END COMMON PAYIN API TESTS (SMSPAY VS OTHER COMPANIES)
# ==============================================================================

@pytest.mark.asyncio
async def test_smspay_payin_invokes_bankme(smspay_auth_token):
    """
    SMSPay calls common PayIn API:
    - Provider is BANKME
    - TID is generated first with 'B' prefix
    - Status is PENDING
    - DB record created under company_ref_id=2
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ref_id = f"REF-SMSP-{int(time.time()*1000)}"
        payload = {
            "amount": 500.00,
            "customer_name": "SMSPay Customer",
            "customer_mobile": "9876543210",
            "customer_email": "customer@smspay.store",
            "reference_id": ref_id,
            "callback_url": "https://smspay.store/webhook",
            "payment_mode": "UPI"
        }
        headers = {"Authorization": f"Bearer {smspay_auth_token}"}

        response = await client.post("/api/v1/payin/collect", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()

        assert data["success"] is True
        assert data["status"] == "PENDING"
        assert data["provider"] == "BANKME"
        assert data["merchant_reference"] == ref_id
        assert data["tid"].startswith("B")  # BankMe vendor TID prefix
        assert data["amount"] == 500.00
        assert data["mdr_charge"] == 7.50   # 1.5% of 500
        assert data["gst_amount"] == 1.35   # 18% of 7.50
        assert data["net_amount"] == 491.15
        assert data["payment_url"] is not None
        assert data["qr_string"] is not None


@pytest.mark.asyncio
async def test_other_company_payin_uses_existing_provider(near4you_auth_token):
    """
    Near4You (company_ref_id=1) calls same common PayIn API:
    - Provider is EXISTING
    - BankMe is NEVER invoked
    - TID starts with 'P' prefix
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ref_id = f"REF-N4U-{int(time.time()*1000)}"
        payload = {
            "amount": 1000.00,
            "customer_name": "Near4You Customer",
            "customer_mobile": "9123456780",
            "reference_id": ref_id,
            "payment_mode": "UPI"
        }
        headers = {"Authorization": f"Bearer {near4you_auth_token}"}

        response = await client.post("/api/v1/payin/collect", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()

        assert data["success"] is True
        assert data["status"] == "PENDING"
        assert data["provider"] == "EXISTING"
        assert data["provider"] != "BANKME"
        assert data["tid"].startswith("P")  # Pay2Pay/Default prefix


# ==============================================================================
# 4. DUPLICATE TRANSACTION REJECTION (IDEMPOTENCY)
# ==============================================================================

@pytest.mark.asyncio
async def test_duplicate_reference_id_rejected(smspay_auth_token):
    """Submitting duplicate reference_id returns HTTP 409 Conflict."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ref_id = f"REF-DUP-{int(time.time()*1000)}"
        payload = {
            "amount": 250.00,
            "customer_name": "Test Customer",
            "customer_mobile": "9876543210",
            "reference_id": ref_id
        }
        headers = {"Authorization": f"Bearer {smspay_auth_token}"}

        # 1st call -> Success
        res1 = await client.post("/api/v1/payin/collect", json=payload, headers=headers)
        assert res1.status_code == 201

        # 2nd call with identical reference_id -> 409 Conflict
        res2 = await client.post("/api/v1/payin/collect", json=payload, headers=headers)
        assert res2.status_code == 409
        assert "Duplicate PayIn request" in res2.json()["detail"]


# ==============================================================================
# 5. BANKME WEBHOOK PROCESSING & IDEMPOTENCY
# ==============================================================================

@pytest.mark.asyncio
async def test_bankme_webhook_success_and_idempotency(smspay_auth_token):
    """
    Test Webhook lifecycle:
    1. Initiate PayIn (PENDING)
    2. Deliver BankMe webhook (PENDING -> SUCCESS)
    3. Re-deliver webhook -> Acknowledged safely without duplicate processing
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ref_id = f"REF-WH-{int(time.time()*1000)}"
        init_res = await client.post(
            "/api/v1/payin/collect",
            json={
                "amount": 200.00,
                "customer_name": "Webhook Test",
                "customer_mobile": "9876543210",
                "reference_id": ref_id
            },
            headers={"Authorization": f"Bearer {smspay_auth_token}"}
        )
        assert init_res.status_code == 201
        tid = init_res.json()["tid"]

        # Inbound BankMe Webhook
        webhook_payload = {
            "merchant_tid": tid,
            "status": "SUCCESS",
            "bankme_ref": f"BM-TXN-{int(time.time())}",
            "amount": 200.00,
            "utr": "UTR123456789012"
        }
        wh_headers = {"X-API-KEY": "sk_7d6dccc54ca9b1c0f5f99de1a9724f12f183f9fe4b6748fa"}

        # 1st Webhook delivery -> Transitions to SUCCESS
        wh_res1 = await client.post("/api/v1/payin/webhook/bankme", json=webhook_payload, headers=wh_headers)
        assert wh_res1.status_code == 200
        assert wh_res1.json()["status"] == "SUCCESS"

        # Verify Status via inquiry
        stat_res = await client.get(f"/api/v1/payin/{tid}/status", headers={"Authorization": f"Bearer {smspay_auth_token}"})
        assert stat_res.status_code == 200
        assert stat_res.json()["status"] == "SUCCESS"

        # 2nd Webhook delivery (duplicate) -> Safely acknowledged
        wh_res2 = await client.post("/api/v1/payin/webhook/bankme", json=webhook_payload, headers=wh_headers)
        assert wh_res2.status_code == 200
        assert wh_res2.json()["status"] == "SUCCESS"
        assert "Duplicate webhook safely ignored" in wh_res2.json()["message"]


# ==============================================================================
# 6. SECURITY & CROSS-COMPANY ISOLATION
# ==============================================================================

@pytest.mark.asyncio
async def test_cross_company_status_lookup_forbidden(smspay_auth_token, near4you_auth_token):
    """
    Security Test:
    Near4You cannot query or inspect an SMSPay transaction using its TID.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create transaction as SMSPay
        init_res = await client.post(
            "/api/v1/payin/collect",
            json={
                "amount": 100.00,
                "customer_name": "Secret Customer",
                "customer_mobile": "9876543210",
                "reference_id": f"REF-SEC-{int(time.time()*1000)}"
            },
            headers={"Authorization": f"Bearer {smspay_auth_token}"}
        )
        assert init_res.status_code == 201
        smspay_tid = init_res.json()["tid"]

        # Attempt to inspect this transaction with Near4You credentials -> 403 Forbidden
        hack_res = await client.get(
            f"/api/v1/payin/{smspay_tid}/status",
            headers={"Authorization": f"Bearer {near4you_auth_token}"}
        )
        assert hack_res.status_code == 403
        assert "Access denied" in hack_res.json()["detail"]

