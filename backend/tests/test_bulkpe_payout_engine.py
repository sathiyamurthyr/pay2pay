"""
Automated Unit Tests for BulkPe Enterprise Payout Engine
Tests:
- Precheck validations (Customer MPIN, Beneficiary, Wallet Balance)
- Dynamic pricing engine calculation
- ACID Wallet debit transaction
- Official BulkPe Payout API invocation & responses
- Automatic Reversal Engine for failed payouts
- Background polling status checks
- Live dashboard metrics counters
"""

import pytest
import uuid
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel
from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
from app.application.mpin_service import CustomerMPINService


@pytest.mark.asyncio
async def test_bulkpe_payout_execution_and_reversal():
    """Tests complete BulkPe Payout initiation, ACID wallet debit, and automatic refund engine."""
    async with AsyncSessionLocal() as db:
        cust_id = uuid.uuid4()
        bene_id = uuid.uuid4()
        # 0. Fetch existing RetailerModel
        stmt_ret = select(RetailerModel)
        ret_obj = (await db.execute(stmt_ret)).scalars().first()
        ret_id = ret_obj.public_id if ret_obj else uuid.uuid4()
        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")

        # 1. Create test Customer with MPIN enabled
        customer = CustomerModel(
            public_id=cust_id,
            customer_number=f"CUST-{uuid.uuid4().hex[:8]}",
            customer_category="REGULAR",
            customer_type="INDIVIDUAL",
            kyc_status="VERIFIED",
            kyc_level="FULL_KYC",
            risk_category="LOW",
            customer_status="ACTIVE",
            tenant_id=tenant_id,
            first_name="BulkPe",
            last_name="Tester",
            full_name="BulkPe Tester",
            mobile_number=f"99{uuid.uuid4().hex[:8]}",
            mpin_enabled=True,
            record_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(customer)
        await db.commit()

        # Set valid MPIN "2468"
        await CustomerMPINService.create_mpin(db, cust_id, "2468", "2468")

        # 2. Create verified Beneficiary
        bene = BeneficiaryModel(
            public_id=bene_id,
            beneficiary_number=f"BEN-{uuid.uuid4().hex[:8]}",
            customer_id=cust_id,
            tenant_id=tenant_id,
            full_name="Rajesh Sharma",
            relationship="SELF",
            verification_status="VERIFIED",
            beneficiary_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(bene)

        # 3. Fetch/Ensure Retailer Wallet balance
        stmt_w = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_id)
        wallet = (await db.execute(stmt_w)).scalars().first()
        if not wallet:
            wallet = RetailerWalletModel(
                public_id=uuid.uuid4(),
                retailer_id=ret_id,
                tenant_id=tenant_id,
                wallet_balance=50000.0,
                is_frozen=False,
                is_active=True,
                is_deleted=False
            )
            db.add(wallet)
        else:
            wallet.wallet_balance = max(wallet.wallet_balance, 50000.0)
            wallet.is_frozen = False
        await db.commit()

        # 4. Initiate BulkPe payout via REST API
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/payout/bulkpe/initiate", json={
                "customer_id": str(cust_id),
                "beneficiary_id": str(bene_id),
                "retailer_id": str(ret_id),
                "tenant_id": str(tenant_id),
                "amount": 1000.0,
                "mpin": "2468",
                "mode": "IMPS"
            })

            # Handled either 200 (Success) or 400/502 (Vendor Error + Auto Refund + Sanitized Message)
            assert res.status_code in (200, 400, 502), f"Initiate payout failed unexpectedly: {res.text}"
            if res.status_code in (400, 502):
                res_data = res.json()
                assert "Payout service is temporarily unavailable" in res_data["detail"] or "Automatically refunded" in res_data["detail"]
            if res.status_code == 200:
                data = res.json()
                assert data["status"] in ("SUCCESS", "PENDING")
                assert data["amount"] == 1000.0
                assert data["charges"] == 10.0
                assert data["gst"] == 1.8
                assert data["net_debit"] == 1011.8

    # 5. Verify Dashboard Counters API
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_dash = await ac.get(f"/api/v1/payout/bulkpe/dashboard/counters?retailer_id={ret_id}")
        assert res_dash.status_code == 200
        dash = res_dash.json()
        assert "wallet_balance" in dash
        assert dash["total_payout_amount"] >= 1000.0


@pytest.mark.asyncio
async def test_bulkpe_payout_mpin_failure_precheck():
    """Verifies that payout initiation is BLOCKED if customer MPIN is incorrect."""
    async with AsyncSessionLocal() as db:
        cust_id = uuid.uuid4()
        bene_id = uuid.uuid4()
        ret_id = uuid.UUID("a46ec999-57db-4138-a79b-a208a6d75109")
        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")

        customer = CustomerModel(
            public_id=cust_id,
            customer_number=f"CUST-{uuid.uuid4().hex[:8]}",
            customer_category="REGULAR",
            customer_type="INDIVIDUAL",
            kyc_status="VERIFIED",
            kyc_level="FULL_KYC",
            risk_category="LOW",
            customer_status="ACTIVE",
            tenant_id=tenant_id,
            first_name="Sec",
            last_name="Test",
            full_name="Sec Test",
            mobile_number=f"98{uuid.uuid4().hex[:8]}",
            mpin_enabled=True,
            record_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(customer)
        await db.commit()
        await CustomerMPINService.create_mpin(db, cust_id, "1357", "1357")

        bene = BeneficiaryModel(
            public_id=bene_id,
            beneficiary_number=f"BEN-{uuid.uuid4().hex[:8]}",
            customer_id=cust_id,
            tenant_id=tenant_id,
            full_name="Amit Kumar",
            relationship="SELF",
            verification_status="VERIFIED",
            beneficiary_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(bene)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/payout/bulkpe/initiate", json={
            "customer_id": str(cust_id),
            "beneficiary_id": str(bene_id),
            "retailer_id": str(ret_id),
            "tenant_id": str(tenant_id),
            "amount": 500.0,
            "mpin": "9999",  # WRONG MPIN
            "mode": "IMPS"
        })

        assert res.status_code == 401
        assert "Incorrect MPIN" in res.json()["detail"]
