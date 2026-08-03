import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.application.policy_dtos import (
    PolicyCreateRequest, PolicyEvaluationContext
)
from app.application.policy_service import PolicyService


@pytest.mark.asyncio
async def test_create_policy():
    db = AsyncMock()
    req = PolicyCreateRequest(
        policy_code="POL_DMT_LIMIT",
        policy_name="DMT Transfer Limit Policy",
        policy_category="LIMIT",
        description="Limit cap for DMT",
        scope_level="PLATFORM",
        rules={"single_max": 50000.0}
    )

    res = await PolicyService.create_policy(db, req)

    assert res.policy_code == "POL_DMT_LIMIT"
    assert res.policy_name == "DMT Transfer Limit Policy"
    assert res.policy_status == "DRAFT"
    assert res.current_version == 1
    db.add.assert_called()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_evaluate_policy_allowed():
    db = AsyncMock()
    ctx = PolicyEvaluationContext(
        service_code="DMT",
        amount=25000.0,
        kyc_level="FULL_KYC",
        risk_score=15
    )

    res = await PolicyService.evaluate_policy(db, ctx)

    assert res.is_allowed is True
    assert res.service_code == "DMT"
    assert res.effective_single_txn_max == 50000.0
    assert len(res.rejection_reasons) == 0


@pytest.mark.asyncio
async def test_evaluate_policy_rejected_exceeds_limit():
    db = AsyncMock()
    ctx = PolicyEvaluationContext(
        service_code="DMT",
        amount=75000.0,
        kyc_level="FULL_KYC",
        risk_score=15
    )

    res = await PolicyService.evaluate_policy(db, ctx)

    assert res.is_allowed is False
    assert len(res.rejection_reasons) > 0
    assert "exceeds single transaction limit" in res.rejection_reasons[0]


@pytest.mark.asyncio
async def test_evaluate_policy_rejected_high_risk():
    db = AsyncMock()
    ctx = PolicyEvaluationContext(
        service_code="DMT",
        amount=10000.0,
        kyc_level="FULL_KYC",
        risk_score=95
    )

    res = await PolicyService.evaluate_policy(db, ctx)

    assert res.is_allowed is False
    assert any("risk score" in r for r in res.rejection_reasons)
