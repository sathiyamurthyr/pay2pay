import pytest
import uuid
from app.core.database import AsyncSessionLocal, engine, Base
from app.application.error_management_service import ErrorManagementService
from app.infrastructure.db.error_management_models import (
    ErrorMasterModel, VendorApiLogModel, TransactionErrorModel
)
from sqlalchemy import select

@pytest.mark.asyncio
async def test_seed_error_master():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await ErrorManagementService.seed_error_master(db)
        stmt = select(ErrorMasterModel)
        res = await db.execute(stmt)
        rules = res.scalars().all()
        assert len(rules) >= 12
        codes = [r.internal_error_code for r in rules]
        assert "PAY-1001" in codes
        assert "PAY-1008" in codes
        assert "PAY-1012" in codes

@pytest.mark.asyncio
async def test_vendor_api_log_creation():
    async with AsyncSessionLocal() as db:
        log_entry = await ErrorManagementService.log_vendor_api(
            db=db,
            vendor_name="BulkPe",
            vendor_url="https://api.bulkpe.in/payout",
            http_method="POST",
            headers={"Authorization": "Bearer secret123", "Content-Type": "application/json"},
            request_json={"amount": 1000, "account_number": "918273645019"},
            response_json={"status": "FAILED", "message": "Product is not activated"},
            http_status=400,
            latency_ms=145
        )
        assert log_entry.id is not None
        assert log_entry.headers["Authorization"] == "********"
        assert log_entry.vendor_name == "BulkPe"
        assert log_entry.http_status == 400

@pytest.mark.asyncio
async def test_error_mapping_and_role_sanitization():
    async with AsyncSessionLocal() as db:
        tx_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        
        # Test Retailer Role Sanitization
        retailer_res = await ErrorManagementService.process_transaction_failure(
            db=db,
            transaction_id=tx_id,
            vendor_name="BulkPe",
            vendor_url="https://api.bulkpe.in/payout",
            http_method="POST",
            request_json={"amount": 500},
            response_json={"status": "FAILED", "message": "Product is not activated"},
            http_status=400,
            latency_ms=120,
            vendor_error_message="Product is not activated",
            rollback_performed=True,
            user_role="RETAILER"
        )

        assert retailer_res["success"] == False
        assert retailer_res["internal_error_code"] == "PAY-1001"
        assert "Payout service is temporarily unavailable" in retailer_res["friendly_message"]
        assert "admin_details" not in retailer_res
        assert "BulkPe" not in retailer_res["friendly_message"]

        # Test Admin Role Details
        admin_res = await ErrorManagementService.process_transaction_failure(
            db=db,
            transaction_id=tx_id,
            vendor_name="BulkPe",
            vendor_url="https://api.bulkpe.in/payout",
            http_method="POST",
            request_json={"amount": 500},
            response_json={"status": "FAILED", "message": "Product is not activated"},
            http_status=400,
            latency_ms=120,
            vendor_error_message="Product is not activated",
            rollback_performed=True,
            user_role="ADMIN"
        )

        assert admin_res["success"] == False
        assert "admin_details" in admin_res
        assert admin_res["admin_details"]["vendor_name"] == "BulkPe"
        assert admin_res["admin_details"]["response_json"]["message"] == "Product is not activated"
