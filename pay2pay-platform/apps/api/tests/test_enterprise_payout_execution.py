import pytest
import uuid
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine, Base
import app.infrastructure.db.models
import app.infrastructure.db.enterprise_payout_models
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel, PayoutTransactionStatus
)
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel
from app.infrastructure.db.models import RetailerWalletModel, RetailerModel
from app.application.mpin_service import CustomerMPINService
from app.application.enterprise_payout_execution_service import EnterprisePayoutExecutionService

async def get_or_create_retailer(db, tenant_id):
    stmt_ret = select(RetailerModel)
    ret_obj = (await db.execute(stmt_ret)).scalars().first()
    if not ret_obj:
        ret_obj = RetailerModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            retailer_code=f"RET-{uuid.uuid4().hex[:8].upper()}",
            business_name="Test Merchant Retailer",
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
async def test_mpin_failure_blocks_execution():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        cust_id = uuid.uuid4()
        bene_id = uuid.uuid4()
        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        ret_id = await get_or_create_retailer(db, tenant_id)

        # Create Customer with MPIN "1122"
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
            first_name="Fail",
            last_name="Tester",
            full_name="Fail Tester",
            mobile_number=f"99{uuid.uuid4().hex[:8]}",
            mpin_enabled=True,
            record_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(cust)
        await db.commit()
        await CustomerMPINService.create_mpin(db, cust_id, "1122", "1122")

        # Test invalid MPIN "9999" -> Must throw HTTPException / 401 and stop execution
        with pytest.raises((HTTPException, Exception)) as exc_info:
            await EnterprisePayoutExecutionService.initiate_payout_execution(
                db=db,
                customer_id=cust_id,
                beneficiary_id=bene_id,
                retailer_id=ret_id,
                tenant_id=tenant_id,
                amount=500.0,
                mpin="9999",
                idempotency_key=f"IDEM-FAIL-{uuid.uuid4().hex[:8]}"
            )
        err_msg = str(exc_info.value)
        assert "Incorrect MPIN" in err_msg or "MPIN Verification Failed" in err_msg or "401" in err_msg

@pytest.mark.asyncio
async def test_full_enterprise_payout_execution_and_auto_reversal():
    async with AsyncSessionLocal() as db:
        cust_id = uuid.uuid4()
        bene_id = uuid.uuid4()
        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        ret_id = await get_or_create_retailer(db, tenant_id)

        # Create Verified Customer
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
            first_name="Banking",
            last_name="Grade",
            full_name="Banking Grade",
            mobile_number=f"98{uuid.uuid4().hex[:8]}",
            mpin_enabled=True,
            record_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(cust)

        # Create Verified Beneficiary
        bene = BeneficiaryModel(
            public_id=bene_id,
            beneficiary_number=f"BEN-{uuid.uuid4().hex[:8]}",
            customer_id=cust_id,
            tenant_id=tenant_id,
            full_name="Sathya Moorthy",
            relationship="SELF",
            verification_status="VERIFIED",
            beneficiary_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(bene)

        # Ensure Retailer Wallet Balance
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
            wallet.wallet_balance = max(wallet.wallet_balance, 100000.0)
            wallet.is_frozen = False
        await db.commit()

        await CustomerMPINService.create_mpin(db, cust_id, "2468", "2468")

        idempotency_key = f"IDEM-SUC-{uuid.uuid4().hex[:10]}"

        # Execute Payout Flow
        res = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=cust_id,
            beneficiary_id=bene_id,
            retailer_id=ret_id,
            tenant_id=tenant_id,
            amount=1000.0,
            mpin="2468",
            idempotency_key=idempotency_key
        )

        assert "transaction_id" in res
        tx_uuid = uuid.UUID(res["transaction_id"])

        # Inspect Transaction in DB
        async with AsyncSessionLocal() as check_db:
            stmt_tx = select(EnterprisePayoutTransactionModel).where(
                EnterprisePayoutTransactionModel.public_id == tx_uuid
            )
            tx = (await check_db.execute(stmt_tx)).scalars().first()
            assert tx is not None
            assert tx.idempotency_key == idempotency_key
            assert tx.amount == 1000.0
            assert tx.net_debit > 1000.0

            # Verify 8 Ledger Entries
            stmt_l = select(PayoutDoubleEntryLedgerModel).where(
                PayoutDoubleEntryLedgerModel.transaction_id == tx_uuid,
                PayoutDoubleEntryLedgerModel.is_reversal_entry == False
            )
            ledgers = (await check_db.execute(stmt_l)).scalars().all()
            assert len(ledgers) == 8

        # Test Double Reversal Guard
        async with AsyncSessionLocal() as rev_db:
            if not res.get("is_reversed"):
                rev_res1 = await EnterprisePayoutExecutionService.execute_auto_reversal(
                    db=rev_db,
                    transaction_id=tx_uuid,
                    reversal_reason="Test Auto Reversal"
                )
                await rev_db.commit()
                assert rev_res1["success"] == True
                assert rev_res1["status"] == PayoutTransactionStatus.REVERSED.value

            # Second Reversal Call MUST BE BLOCKED BY DOUBLE REVERSAL GUARD
            rev_res2 = await EnterprisePayoutExecutionService.execute_auto_reversal(
                db=rev_db,
                transaction_id=tx_uuid,
                reversal_reason="Duplicate Reversal Attempt"
            )
            assert rev_res2["success"] == False
            assert rev_res2["already_reversed"] == True
            assert "already been reversed" in rev_res2["message"]

@pytest.mark.asyncio
async def test_duplicate_idempotency_key_rejection():
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
            first_name="Dup",
            last_name="Tester",
            full_name="Dup Tester",
            mobile_number=f"97{uuid.uuid4().hex[:8]}",
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
            full_name="Rajesh Kumar",
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
            wallet.wallet_balance = max(wallet.wallet_balance, 50000.0)
            wallet.is_frozen = False

        await db.commit()
        await CustomerMPINService.create_mpin(db, cust_id, "8520", "8520")

        dup_key = f"IDEM-DUP-{uuid.uuid4().hex[:8]}"

        # First Call
        res1 = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=cust_id,
            beneficiary_id=bene_id,
            retailer_id=ret_id,
            tenant_id=tenant_id,
            amount=500.0,
            mpin="8520",
            idempotency_key=dup_key
        )
        assert "transaction_id" in res1

        # Second Call with SAME idempotency key
        res2 = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=cust_id,
            beneficiary_id=bene_id,
            retailer_id=ret_id,
            tenant_id=tenant_id,
            amount=500.0,
            mpin="8520",
            idempotency_key=dup_key
        )
        assert res2["success"] == False
        assert res2["is_duplicate"] == True
        assert res2["status"] == PayoutTransactionStatus.DUPLICATE.value
