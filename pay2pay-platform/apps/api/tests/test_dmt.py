import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.application.dmt_dtos import (
    DmtChargeCalculateRequest, DmtTransferCreateRequest, DmtReversalRequest
)
from app.application.dmt_service import DmtService, _generate_txn_number, _generate_utr, _generate_rrn


def test_dmt_number_generators():
    txn_num = _generate_txn_number()
    assert txn_num.startswith("DMT")
    assert len(txn_num) == 11

    utr = _generate_utr()
    assert utr.startswith("UTR2026")

    rrn = _generate_rrn()
    assert rrn.startswith("RRN2026")


def test_calculate_charges():
    req = DmtChargeCalculateRequest(
        transfer_amount=5000.0,
        transaction_mode="IMPS",
        customer_id=uuid.uuid4(),
        beneficiary_id=uuid.uuid4()
    )

    calc = DmtService.calculate_charges(req)

    # 1% of 5000 is 50.0
    assert calc.service_charge == 50.0
    # 18% of 50.0 is 9.0
    assert calc.gst_amount == 9.0
    assert calc.total_debit_amount == 5059.0
    assert calc.net_beneficiary_credit == 5000.0
    assert calc.retailer_commission == 20.0  # 40% of 50


@pytest.mark.asyncio
async def test_create_transfer():
    db = AsyncMock()
    req = DmtTransferCreateRequest(
        customer_id=uuid.uuid4(),
        beneficiary_id=uuid.uuid4(),
        retailer_id=uuid.uuid4(),
        transfer_amount=10000.0,
        transaction_mode="IMPS",
        purpose="Family Transfer"
    )

    res = await DmtService.create_transfer(db, req)

    assert res.transaction_number.startswith("DMT")
    assert res.transaction_status == "SUCCESS"
    assert res.transfer_amount == 10000.0
    assert res.utr is not None
    db.add.assert_called()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_reverse_transfer():
    db = AsyncMock()
    txn_id = uuid.uuid4()

    mock_txn = MagicMock()
    mock_txn.public_id = txn_id
    mock_txn.transaction_number = "DMT12345678"
    mock_txn.total_debit_amount = 10059.0
    mock_txn.tenant_id = uuid.uuid4()
    mock_txn.transaction_status = "SUCCESS"

    db.execute.return_value.scalar_one_or_none.return_value = mock_txn

    req = DmtReversalRequest(reason="Customer requested cancellation")

    res = await DmtService.reverse_transfer(db, txn_id, req)

    assert res.reversal_number.startswith("REV")
    assert res.reversal_amount == 10059.0
    assert res.reversal_status == "COMPLETED"
    assert mock_txn.transaction_status == "REVERSED"
