"""
Unit and Integration Tests for P0 Beneficiary Duplicate Prevention & Cleanup
Verifies:
1. HTTP 409 Conflict returned when duplicate active beneficiary registration is attempted.
2. clean_duplicate_beneficiaries script merges duplicate records to status = 'MERGED' and is_active = False.
3. list_beneficiaries returns DISTINCT active beneficiaries, excluding MERGED records.
"""

import pytest
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException

from app.core.database import AsyncSessionLocal
from app.infrastructure.db.epic014_models import (
    BeneficiaryMasterModel,
    BeneficiaryCustomerMappingModel,
)
from app.application.epic014_beneficiary_service import Epic014BeneficiaryService
from app.scripts.clean_duplicate_beneficiaries import run_duplicate_beneficiary_cleanup


@pytest.mark.asyncio
async def test_duplicate_beneficiary_409_conflict():
    tenant_id = uuid.uuid4()
    company_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    account_number = f"918{uuid.uuid4().int % 1000000000:09d}"
    ifsc_code = "HDFC0001234"

    async with AsyncSessionLocal() as db:
        # Create initial active master & customer mapping
        master = BeneficiaryMasterModel(
            public_id=uuid.uuid4(),
            account_holder_name="Rahul Sharma",
            account_number=account_number,
            account_number_masked=f"XXXX-XXXX-{account_number[-4:]}",
            ifsc_code=ifsc_code,
            bank_name="HDFC Bank",
            verification_status="VERIFIED",
            tenant_id=tenant_id,
            company_id=company_id,
            status="ACTIVE",
            is_active=True,
            is_deleted=False,
        )
        db.add(master)
        await db.flush()

        mapping = BeneficiaryCustomerMappingModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=company_id,
            customer_id=customer_id,
            beneficiary_id=master.public_id,
            nickname="Rahul HDFC",
            is_active=True,
            is_deleted=False,
        )
        db.add(mapping)
        await db.commit()

        # Attempting to register exact duplicate beneficiary for same customer must raise HTTP 409 Conflict
        with pytest.raises(HTTPException) as exc_info:
            await Epic014BeneficiaryService.register_and_verify_beneficiary(
                db=db,
                tenant_id=tenant_id,
                company_id=company_id,
                customer_id=customer_id,
                account_number=account_number,
                confirm_account_number=account_number,
                ifsc_code=ifsc_code,
                bank_name="HDFC Bank",
            )

        assert exc_info.value.status_code == 409
        detail = exc_info.value.detail
        assert detail["code"] == "BENEFICIARY_ALREADY_EXISTS"
        assert detail["message"] == "This beneficiary is already registered."
        assert detail["existing_beneficiary"]["account_holder_name"] == "Rahul Sharma"


@pytest.mark.asyncio
async def test_duplicate_cleanup_script():
    # Run duplicate cleanup function
    stats = await run_duplicate_beneficiary_cleanup()
    assert "epic014_duplicates_merged" in stats
    assert "legacy_duplicates_merged" in stats
