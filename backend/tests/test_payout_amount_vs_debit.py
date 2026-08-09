import pytest
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import RetailerWalletModel, RetailerModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel, PayoutTransactionStatus
)
from app.application.enterprise_payout_execution_service import EnterprisePayoutExecutionService
from app.application.mpin_service import CustomerMPINService
from app.core.exceptions import DomainException

async def get_or_create_retailer(db, tenant_id: uuid.UUID) -> uuid.UUID:
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
async def test_transfer_amount_equals_beneficiary_credit_amount():
    """
    Acceptance Criteria:
    ✓ Beneficiary receives exact entered amount (Transfer Amount = Beneficiary Credit Amount).
    ✓ Vendor API receives only the Transfer Amount.
    ✓ Wallet debited by Transfer Amount + Fees + GST.
    ✓ Ledger balanced to exact cent.
    """
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
            first_name="Amount",
            last_name="Debit",
            full_name="Amount Debit Test",
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
            full_name="Rajesh Kumar",
            relationship="SELF",
            verification_status="VERIFIED",
            beneficiary_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(bene)

        # Setup Retailer Wallet
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

        # Set Customer MPIN
        await CustomerMPINService.create_mpin(db, cust_id, "2116", "2116")

        idem_key = f"IDEM-CALC-{uuid.uuid4().hex[:8]}"

        # Execute Payout: Entered Amount = 5000.0
        res = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=cust_id,
            beneficiary_id=bene_id,
            retailer_id=ret_id,
            tenant_id=tenant_id,
            amount=5000.0,
            mpin="2116",
            idempotency_key=idem_key
        )

        assert "transaction_id" in res
        tx_uuid = uuid.UUID(res["transaction_id"])

        # Fetch Transaction Record
        async with AsyncSessionLocal() as check_db:
            stmt_tx = select(EnterprisePayoutTransactionModel).where(
                EnterprisePayoutTransactionModel.public_id == tx_uuid
            )
            tx = (await check_db.execute(stmt_tx)).scalars().first()
            assert tx is not None
            
            # Key Assertions
            assert tx.amount == 5000.0, "Transfer Amount must be exact entered amount"
            assert tx.beneficiary_credit_amount == 5000.0, "Beneficiary Credit must equal Transfer Amount"
            assert tx.vendor_amount == 5000.0, "Vendor API Amount must equal Transfer Amount"
            
            # Fee & GST breakdown
            assert tx.charges > 0, "Convenience Fee must be calculated"
            assert tx.gst_amount == round(tx.charges * 0.18, 2), "GST must be 18% of Convenience Fee"
            assert tx.net_debit == round(tx.amount + tx.charges + tx.gst_amount, 2), "Net Debit must be Transfer Amount + Charges + GST"
            assert tx.wallet_debit_amount == tx.net_debit

            # Wallet Balance Deduction Check
            expected_wallet_after = 100000.0 - tx.net_debit
            assert tx.wallet_after == expected_wallet_after

            # Check Double Entry Ledger Balancing
            stmt_l = select(PayoutDoubleEntryLedgerModel).where(
                PayoutDoubleEntryLedgerModel.transaction_id == tx_uuid,
                PayoutDoubleEntryLedgerModel.is_reversal_entry == False
            )
            ledgers = (await check_db.execute(stmt_l)).scalars().all()
            assert len(ledgers) == 8

            debit_total = sum(l.amount for l in ledgers if l.entry_type == "DEBIT")
            credit_total = sum(l.amount for l in ledgers if l.entry_type == "CREDIT")
            assert debit_total == credit_total, "Double entry ledger debits and credits must be equal"

@pytest.mark.asyncio
async def test_insufficient_wallet_balance_rejection_before_vendor_call():
    """
    Acceptance Criteria:
    ✓ Retailer Wallet Balance must be >= Transfer Amount + Fees + GST.
    ✓ Rejects transaction BEFORE vendor API call if balance is insufficient.
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
            first_name="Low",
            last_name="Balance",
            full_name="Low Balance Test",
            mobile_number=f"91{uuid.uuid4().hex[:8]}",
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
            full_name="Low Balance Bene",
            relationship="SELF",
            verification_status="VERIFIED",
            beneficiary_status="ACTIVE",
            is_active=True,
            is_deleted=False
        )
        db.add(bene)

        # Set wallet balance to 5010.0 (Transfer 5000 + charges ~30 + GST ~5.40 = ~5035.40 required)
        stmt_w2 = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_id)
        wallet = (await db.execute(stmt_w2)).scalars().first()
        if not wallet:
            wallet = RetailerWalletModel(
                public_id=uuid.uuid4(),
                retailer_id=ret_id,
                tenant_id=tenant_id,
                wallet_balance=5010.0,
                is_frozen=False,
                is_active=True,
                is_deleted=False
            )
            db.add(wallet)
        else:
            wallet.wallet_balance = 5010.0
            wallet.is_frozen = False
        await db.commit()

        await CustomerMPINService.create_mpin(db, cust_id, "8520", "8520")

        idem_key = f"IDEM-LOWBAL-{uuid.uuid4().hex[:8]}"

        # Execution should raise DomainException before calling vendor
        with pytest.raises(DomainException) as exc_info:
            await EnterprisePayoutExecutionService.initiate_payout_execution(
                db=db,
                customer_id=cust_id,
                beneficiary_id=bene_id,
                retailer_id=ret_id,
                tenant_id=tenant_id,
                amount=5000.0,
                mpin="8520",
                idempotency_key=idem_key
            )
        
        assert "Insufficient Retailer Wallet balance" in str(exc_info.value)

        # Verify wallet balance remained intact at 5010.0
        async with AsyncSessionLocal() as check_db:
            stmt_w = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_id)
            w_obj = (await check_db.execute(stmt_w)).scalars().first()
            assert w_obj.wallet_balance == 5010.0
