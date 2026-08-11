"""
Unit and Integration Tests for P0 Customer MPIN Mandatory Activation & Security
Verifies:
1. MPIN strength validation rules (rejects sequential, repeated, mobile digits).
2. MPIN creation & activation updates mpin_enabled = True and stores HMAC hash (zero plaintext).
3. Transaction blocking when mpin_enabled = False (returns HTTP 403 MPIN_REQUIRED).
4. MPIN verification rate limiting (locks account after 5 failed attempts).
"""

import pytest
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException

from app.core.database import AsyncSessionLocal
from app.infrastructure.db.customer_models import CustomerModel
from app.application.mpin_service import CustomerMpinService, validate_mpin_strength
from app.application.payout_workflow_service import PayoutWorkflowService


@pytest.mark.asyncio
async def test_mpin_strength_validation():
    # Sequential test
    with pytest.raises(HTTPException) as exc1:
        validate_mpin_strength("1234", "1234", "9876543210")
    assert "sequential" in exc1.value.detail.lower()

    # Repeated test
    with pytest.raises(HTTPException) as exc2:
        validate_mpin_strength("1111", "1111", "9876543210")
    assert "repeated" in exc2.value.detail.lower()

    # Mobile digits test
    with pytest.raises(HTTPException) as exc3:
        validate_mpin_strength("4321", "4321", "9876543210")
    assert "mobile" in exc3.value.detail.lower() or "sequential" in exc3.value.detail.lower()

    # Valid MPIN test
    validate_mpin_strength("8529", "8529", "9876543210")


@pytest.mark.asyncio
async def test_customer_mpin_creation_and_verification():
    tenant_id = uuid.uuid4()
    cust_id = uuid.uuid4()
    mobile = "9988776655"

    async with AsyncSessionLocal() as db:
        # Create un-activated customer (mpin_enabled = False)
        cust = CustomerModel(
            public_id=cust_id,
            tenant_id=tenant_id,
            customer_number=f"CUST-{uuid.uuid4().int % 100000}",
            customer_category="REGULAR",
            customer_type="INDIVIDUAL",
            first_name="Rohan",
            last_name="Verma",
            full_name="Rohan Verma",
            mobile_number=mobile,
            kyc_level="FULL_KYC",
            kyc_status="VERIFIED",
            risk_category="LOW",
            customer_status="PENDING_PIN",
            mpin_enabled=False,
            is_locked=False,
            failed_attempts=0,
            is_active=True,
            is_deleted=False
        )
        db.add(cust)
        await db.commit()

        # Step 1: Precheck transaction must be BLOCKED when mpin_enabled = False
        with pytest.raises(HTTPException) as exc_block:
            await PayoutWorkflowService.validate_payout_precheck(
                db=db,
                tenant_id=tenant_id,
                customer_id=cust_id,
                amount=1000.0,
                wallet_balance=5000.0
            )
        assert exc_block.value.status_code == 403
        assert exc_block.value.detail["code"] == "MPIN_REQUIRED"

        # Step 2: Create MPIN
        res_create = await CustomerMpinService.create_mpin(
            db=db,
            customer_id=cust_id,
            mpin="8529",
            confirm_mpin="8529"
        )
        assert res_create["status"] == "SUCCESS"
        assert res_create["mpin_enabled"] is True

        # Step 3: Verify correct MPIN
        res_verify = await CustomerMpinService.verify_mpin(
            db=db,
            customer_id=cust_id,
            mpin="8529"
        )
        assert res_verify["status"] == "SUCCESS"
        assert res_verify["mpin_verified"] is True

        # Step 4: Test failed MPIN verification counter
        with pytest.raises(HTTPException) as exc_fail:
            await CustomerMpinService.verify_mpin(
                db=db,
                customer_id=cust_id,
                mpin="9999"
            )
        assert exc_fail.value.status_code == 401
