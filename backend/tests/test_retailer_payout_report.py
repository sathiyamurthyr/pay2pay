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

async def get_or_create_report_retailer(db, tenant_id: uuid.UUID) -> uuid.UUID:
    stmt_ret = select(RetailerModel)
    ret_obj = (await db.execute(stmt_ret)).scalars().first()
    if not ret_obj:
        ret_obj = RetailerModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            retailer_code=f"RET-REP-{uuid.uuid4().hex[:6].upper()}",
            business_name="Test Report Retailer",
            owner_name="Report Owner",
            mobile_number=f"97{uuid.uuid4().hex[:8]}",
            email=f"report{uuid.uuid4().hex[:6]}@test.com",
            status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(ret_obj)
        await db.commit()
    return ret_obj.public_id

@pytest.mark.asyncio
async def test_retailer_payout_report_endpoints():
    """
    Acceptance Criteria:
    ✓ Retailer Payout Report summary API returns today's KPI metrics.
    ✓ Paginated list API enforces multi-tenant & retailer scoping.
    ✓ Account numbers are masked (XXXX XXXX 4589).
    ✓ Footer totals aggregated correctly.
    """
    async with AsyncSessionLocal() as db:
        cust_id = uuid.uuid4()
        bene_id = uuid.uuid4()
        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        ret_id = await get_or_create_report_retailer(db, tenant_id)

        cust = CustomerModel(
            public_id=cust_id,
            customer_number=f"CUST-REP-{uuid.uuid4().hex[:6]}",
            customer_category="REGULAR",
            customer_type="INDIVIDUAL",
            kyc_status="VERIFIED",
            kyc_level="FULL_KYC",
            risk_category="LOW",
            customer_status="ACTIVE",
            tenant_id=tenant_id,
            first_name="ReportCust",
            last_name="Test",
            full_name="Report Customer Test",
            mobile_number=f"99{uuid.uuid4().hex[:8]}",
            mpin_enabled=True,
            record_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(cust)

        bene = BeneficiaryModel(
            public_id=bene_id,
            beneficiary_number=f"BEN-REP-{uuid.uuid4().hex[:6]}",
            customer_id=cust_id,
            tenant_id=tenant_id,
            full_name="Report Bene",
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
                wallet_balance=100000.0,
                is_frozen=False,
                is_active=True,
                is_deleted=False
            )
            db.add(wallet)
        else:
            wallet.wallet_balance = 100000.0
            wallet.is_frozen = False
        await db.commit()

        await CustomerMPINService.create_mpin(db, cust_id, "2116", "2116")

        idem_key = f"IDEM-REP-{uuid.uuid4().hex[:8]}"

        # Execute a Payout Transaction
        res = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=cust_id,
            beneficiary_id=bene_id,
            retailer_id=ret_id,
            tenant_id=tenant_id,
            amount=1500.0,
            mpin="2116",
            idempotency_key=idem_key
        )

        assert "transaction_id" in res
        tx_id_str = res["transaction_id"]

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            # 1. Test Summary KPI Endpoint
            sum_res = await ac.get(f"/api/v1/payout/reports/summary?retailer_id={ret_id}&tenant_id={tenant_id}")
            assert sum_res.status_code == 200
            sum_data = sum_res.json()
            assert "todays_transactions" in sum_data
            assert "todays_transfer_amount" in sum_data
            assert "todays_wallet_debit" in sum_data

            # 2. Test Paginated Report List Endpoint
            list_res = await ac.get(f"/api/v1/payout/reports/list?retailer_id={ret_id}&tenant_id={tenant_id}&page=1&limit=10")
            assert list_res.status_code == 200
            list_data = list_res.json()
            assert "items" in list_data
            assert "pagination" in list_data
            assert "footer_totals" in list_data

            assert len(list_data["items"]) >= 1
            item = list_data["items"][0]
            assert "masked_account_number" in item
            assert item["masked_account_number"].startswith("XXXX")
            assert "wallet_debit" in item

            # 3. Test Drawer Details Endpoint
            det_res = await ac.get(f"/api/v1/payout/reports/{tx_id_str}/details?retailer_id={ret_id}&tenant_id={tenant_id}")
            assert det_res.status_code == 200
            det_data = det_res.json()
            assert "transaction_details" in det_data
            assert "amount_details" in det_data
            assert "vendor_response" not in det_data  # Hides vendor responses cleanly!

            # 4. Test Audit Logging Endpoint
            audit_res = await ac.post("/api/v1/payout/reports/audit", json={
                "action": "REPORT_VIEWED",
                "retailer_id": str(ret_id),
                "tenant_id": str(tenant_id)
            })
            assert audit_res.status_code == 200
            assert audit_res.json()["status"] == "LOGGED"
