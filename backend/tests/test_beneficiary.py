import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.application.beneficiary_dtos import (
    BeneficiaryRegisterRequest, BankVerificationRequest,
    UpiVerificationRequest, BeneficiarySearchRequest
)
from app.application.beneficiary_service import BeneficiaryService, _calculate_name_match_score


def test_name_match_score():
    score_exact = _calculate_name_match_score("Rajesh Kumar", "Rajesh Kumar")
    assert score_exact == 100.0

    score_partial = _calculate_name_match_score("Rajesh Kumar", "Rajesh K")
    assert score_partial > 70.0

    score_mismatch = _calculate_name_match_score("Rajesh Kumar", "Vijay Patel")
    assert score_mismatch < 50.0


@pytest.mark.asyncio
async def test_register_beneficiary():
    db = AsyncMock()
    req = BeneficiaryRegisterRequest(
        customer_id=uuid.uuid4(),
        full_name="Anita Sharma",
        relationship="SISTER",
        account_number="987654321012",
        ifsc_code="HDFC0001234",
        account_holder_name="Anita Sharma"
    )

    res = await BeneficiaryService.register_beneficiary(db, req)

    assert res.full_name == "Anita Sharma"
    assert res.relationship == "SISTER"
    assert res.verification_status == "PENDING"
    assert res.beneficiary_status == "COOLING_PERIOD"
    assert res.cooling_period_ends_at is not None
    db.add.assert_called()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_verify_bank_account_penny_drop():
    db = AsyncMock()
    beneficiary_id = uuid.uuid4()

    mock_ben = MagicMock()
    mock_ben.public_id = beneficiary_id
    mock_ben.full_name = "Anita Sharma"
    mock_ben.tenant_id = uuid.uuid4()
    mock_ben.verification_status = "PENDING"
    mock_ben.beneficiary_status = "DRAFT"

    mock_result_ben = MagicMock()
    mock_result_ben.scalar_one_or_none.return_value = mock_ben

    mock_acc = MagicMock()
    mock_result_acc = MagicMock()
    mock_result_acc.scalar_one_or_none.return_value = mock_acc

    db.execute.side_effect = [mock_result_ben, mock_result_acc]

    req = BankVerificationRequest(
        account_number="987654321012",
        ifsc_code="HDFC0001234",
        account_holder_name="Anita Sharma",
        bank_name="HDFC Bank",
        perform_penny_drop=True
    )

    res = await BeneficiaryService.verify_bank_account(db, beneficiary_id, req)

    assert res.verification_status == "VERIFIED"
    assert res.is_name_matched is True
    assert res.name_match_score == 100.0
    assert mock_ben.verification_status == "VERIFIED"
    assert mock_ben.beneficiary_status == "ACTIVE"


@pytest.mark.asyncio
async def test_verify_upi_id():
    db = AsyncMock()
    beneficiary_id = uuid.uuid4()

    mock_ben = MagicMock()
    mock_ben.public_id = beneficiary_id
    mock_ben.full_name = "Anita Sharma"
    mock_ben.tenant_id = uuid.uuid4()

    mock_result_ben = MagicMock()
    mock_result_ben.scalar_one_or_none.return_value = mock_ben

    mock_upi = MagicMock()
    mock_upi.public_id = uuid.uuid4()
    mock_upi.upi_id = "anita@okaxis"
    mock_upi.registered_name = "Anita Sharma"
    mock_result_upi = MagicMock()
    mock_result_upi.scalar_one_or_none.return_value = mock_upi

    db.execute.side_effect = [mock_result_ben, mock_result_upi]

    req = UpiVerificationRequest(
        upi_id="anita@okaxis",
        provider_app="GooglePay"
    )

    res = await BeneficiaryService.verify_upi_id(db, beneficiary_id, req)

    assert res.upi_id == "anita@okaxis"
    assert res.verification_status == "VERIFIED"
