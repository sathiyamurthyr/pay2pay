"""
Database Reset & Re-seeding Script for Customer & Beneficiary Entities.
Resets test customer and beneficiary tables with clean verified test data.
"""

import asyncio
import uuid
import datetime
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.customer_models import CustomerModel, CustomerTimelineModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel, BeneficiaryBankAccountModel
from app.application.mpin_service import _hash_mpin


async def reset_data():
    async with AsyncSessionLocal() as db:
        print("=========================================================")
        print("RESETTING CUSTOMER & BENEFICIARY TEST TABLES...")
        print("=========================================================")

        tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
        cust_id = uuid.UUID("8f64d450-8b7c-4414-a998-52f1d99e01b1")
        bene_id = uuid.UUID("a46ec999-57db-4138-a79b-a208a6d75109")
        bank_acc_id = uuid.UUID("b77cd888-68ec-4219-b68c-b309a7d86210")

        # 1. Clean existing test beneficiaries & bank accounts
        await db.execute(delete(BeneficiaryBankAccountModel))
        await db.execute(delete(BeneficiaryModel))

        # 2. Clean existing test customers & timelines
        await db.execute(delete(CustomerTimelineModel))
        await db.execute(delete(CustomerModel))
        await db.commit()

        print("--> Cleaned previous customer & beneficiary records.")

        # 3. Create Clean Test Customer (Ramesh Kumar - 7013914767)
        now = datetime.datetime.now(datetime.timezone.utc)
        mpin_hash_val = _hash_mpin("2468", str(cust_id))

        customer = CustomerModel(
            public_id=cust_id,
            tenant_id=tenant_id,
            customer_number="CUST-CUST3914767",
            customer_category="REGULAR",
            customer_type="INDIVIDUAL",
            first_name="Ramesh",
            last_name="Kumar",
            full_name="Ramesh Kumar",
            mobile_number="7013914767",
            email="ramesh.kumar@pay2pay.com",
            kyc_level="FULL_KYC",
            kyc_status="VERIFIED",
            risk_category="LOW",
            customer_status="ACTIVE",
            registration_date=now,
            activation_date=now,
            last_active_date=now,
            mpin_enabled=True,
            mpin_hash=mpin_hash_val,
            mpin_created_at=now,
            mpin_last_changed_at=now,
            failed_attempts=0,
            is_locked=False,
            is_active=True,
            is_deleted=False
        )
        db.add(customer)

        # 4. Create Audit Timeline Event
        timeline_event = CustomerTimelineModel(
            public_id=uuid.uuid4(),
            customer_id=cust_id,
            tenant_id=tenant_id,
            event_type="MPIN_CREATED",
            event_code="MPIN_CREATED",
            event_title="Security MPIN Configured",
            event_description="Security MPIN 2468 initialized for enterprise customer transactions.",
            event_timestamp=now,
            created_by="system",
            created_date=now,
            is_active=True,
            is_deleted=False
        )
        db.add(timeline_event)

        # 5. Create Clean Verified Beneficiary (Rajesh Sharma)
        beneficiary = BeneficiaryModel(
            public_id=bene_id,
            customer_id=cust_id,
            tenant_id=tenant_id,
            beneficiary_number="BEN-4412",
            full_name="Rajesh Sharma",
            relationship="SELF",
            mobile_number="9876543210",
            email="rajesh.sharma@example.com",
            beneficiary_category="REGULAR",
            beneficiary_type="INDIVIDUAL",
            verification_status="VERIFIED",
            risk_category="LOW",
            beneficiary_status="ACTIVE",
            is_favourite=True,
            registration_date=now,
            activation_date=now,
            is_active=True,
            is_deleted=False
        )
        db.add(beneficiary)

        # 6. Create Beneficiary Bank Account Details
        bank_account = BeneficiaryBankAccountModel(
            public_id=bank_acc_id,
            beneficiary_id=bene_id,
            tenant_id=tenant_id,
            account_holder_name="Rajesh Sharma",
            account_number="91823901283",
            account_number_masked="XXXX-XXXX-283",
            ifsc_code="HDFC0001234",
            bank_name="HDFC Bank",
            branch_name="Connaught Place, New Delhi",
            account_type="SAVINGS",
            verification_status="VERIFIED",
            penny_drop_status="SUCCESS",
            name_match_score=100.0,
            registered_name_in_bank="Rajesh Sharma",
            is_primary=True,
            is_active=True,
            is_deleted=False
        )
        db.add(bank_account)

        await db.commit()

        print("=========================================================")
        print("RESET & SEEDING COMPLETED SUCCESSFULLY!")
        print("=========================================================")
        print(f"Customer: {customer.full_name} | Mobile: {customer.mobile_number} | MPIN: 2468")
        print(f"Beneficiary: {beneficiary.full_name} | Account: {bank_account.account_number} | Bank: {bank_account.bank_name}")
        print("=========================================================")


if __name__ == "__main__":
    asyncio.run(reset_data())
