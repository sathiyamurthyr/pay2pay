import pytest
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import RetailerWalletModel, RetailerModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutTransactionStatus
)
from app.application.enterprise_payout_execution_service import EnterprisePayoutExecutionService
from app.application.mpin_service import CustomerMPINService
from httpx import AsyncClient, ASGITransport
from app.main import app

async def get_or_create_retailer(db, tenant_id: uuid.UUID) -> uuid.UUID:
    stmt_ret = select(RetailerModel)
    ret_obj = (await db.execute(stmt_ret)).scalars().first()
    if not ret_obj:
        ret_obj = RetailerModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            retailer_code=f"RET-{uuid.uuid4().hex[:8].upper()}",
            business_name="Test Progress Retailer",
            owner_name="Test Owner",
            mobile_number=f"96{uuid.uuid4().hex[:8]}",
            email=f"ret{uuid.uuid4().hex[:6]}@test.com",
            status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(ret_obj)
        await db.commit()
    return ret_obj.public_id

@pytest.mark.asyncio
async def test_transaction_status_and_audit_trail_endpoint():
    """
    Acceptance Criteria:
    ✓ Transaction status endpoint returns real-time timeline stage and audit logs.
    ✓ Used by browser reconnect feature to resume current stage seamlessly.
    """
    async with AsyncSessionLocal() as db:
        cust_id = uuid.uuid4()
        bene_id = uuid.uuid4()
        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        ret_id = await get_or_create_retailer(db, tenant_id)

        cust = CustomerModel(
            public_id=cust_id,
            customer_number=f"CUST-{uuid.uuid4().hex[:8]}",
            customer_category="REGULAR",
            customer_type="INDIVIDUAL",
            kyc_status="VERIFIED",
            kyc_level="FULL_KYC",
            risk_category="LOW",
            customer_status="ACTIVE",
            tenant_id=tenant_id,
            first_name="Timeline",
            last_name="Test",
            full_name="Timeline Progress Test",
            mobile_number=f"98{uuid.uuid4().hex[:8]}",
            mpin_enabled=True,
            record_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(cust)

        bene = BeneficiaryModel(
            public_id=bene_id,
            beneficiary_number=f"BEN-{uuid.uuid4().hex[:8]}",
            customer_id=cust_id,
            tenant_id=tenant_id,
            full_name="Timeline Bene",
            relationship="SELF",
            verification_status="VERIFIED",
            beneficiary_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(bene)

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
            wallet.wallet_balance = 50000.0
            wallet.is_frozen = False
        await db.commit()

        await CustomerMPINService.create_mpin(db, cust_id, "2116", "2116")

        idem_key = f"IDEM-STATUS-{uuid.uuid4().hex[:8]}"

        # Execute Payout
        res = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=cust_id,
            beneficiary_id=bene_id,
            retailer_id=ret_id,
            tenant_id=tenant_id,
            amount=2000.0,
            mpin="2116",
            idempotency_key=idem_key
        )

        assert "transaction_id" in res
        tx_id_str = res["transaction_id"]

        # Call GET /api/v1/payout/execution/{transaction_id}/status via HTTP
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            status_res = await ac.get(f"/api/v1/payout/execution/{tx_id_str}/status")
            assert status_res.status_code == 200
            data = status_res.json()

            assert data["transaction_id"] == tx_id_str
            assert data["amount"] == 2000.0
            assert "status" in data
            assert len(data["audit_logs"]) >= 5
            assert len(data["ledger_entries"]) >= 8

@pytest.mark.asyncio
async def test_reconcile_pending_transactions_poller():
    """
    Acceptance Criteria:
    ✓ Background poller executes pending status check cleanly without errors.
    """
    async with AsyncSessionLocal() as db:
        res = await EnterprisePayoutExecutionService.reconcile_pending_transactions(db)
        assert "total_reconciled" in res
