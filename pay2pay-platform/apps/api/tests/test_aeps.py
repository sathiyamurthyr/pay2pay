import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.application.aeps_dtos import (
    AepsTransferCreateRequest, AepsDeviceRegisterRequest
)
from app.application.aeps_service import (
    AepsService, _mask_aadhaar, _generate_txn_number, _generate_rrn, _generate_stan
)


def test_aadhaar_masking():
    masked = _mask_aadhaar("987654321012")
    assert masked == "XXXX-XXXX-1012"

    short = _mask_aadhaar("123")
    assert short == "XXXX-XXXX-1234"


def test_aeps_number_generators():
    txn_num = _generate_txn_number()
    assert txn_num.startswith("AEPS")
    assert len(txn_num) == 12

    rrn = _generate_rrn()
    assert rrn.startswith("RRN2026")

    stan = _generate_stan()
    assert stan.startswith("STAN")


@pytest.mark.asyncio
async def test_register_device():
    db = AsyncMock()
    req = AepsDeviceRegisterRequest(
        device_serial_number="MANTRA-123",
        vendor_name="MANTRA",
        model_name="MFS100",
        rd_service_version="1.0.4",
        firmware_version="2.0.1"
    )

    res = await AepsService.register_device(db, req)

    assert res.device_serial_number == "MANTRA-123"
    assert res.vendor_name == "MANTRA"
    assert res.device_status == "ACTIVE"
    db.add.assert_called()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_create_transfer_cash_withdrawal():
    db = AsyncMock()
    req = AepsTransferCreateRequest(
        customer_id=uuid.uuid4(),
        retailer_id=uuid.uuid4(),
        aadhaar_number="987654321012",
        bank_iin="607094",  # SBI
        service_type="CASH_WITHDRAWAL",
        transaction_amount=2000.0,
        vendor_name="MANTRA",
        device_serial_number="MANTRA-123",
        pid_block_encrypted="PID_ENCRYPTED_DATA"
    )

    res = await AepsService.create_transfer(db, req)

    assert res.transaction_number.startswith("AEPS")
    assert res.masked_aadhaar == "XXXX-XXXX-1012"
    assert res.bank_name == "State Bank of India"
    assert res.transaction_status == "SUCCESS"
    assert res.retailer_commission == 10.0  # ₹10 commission for withdrawal >= 1000
    db.add.assert_called()
    db.commit.assert_called_once()
