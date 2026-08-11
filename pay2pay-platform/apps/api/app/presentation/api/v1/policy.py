"""EPIC-023 — Customer & Beneficiary Policy, Limit & Configuration Engine — API Router"""
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.policy_service import PolicyService
from app.application.policy_dtos import (
    PolicyCreateRequest, PolicyVersionCreateRequest,
    PolicyEvaluationContext, PolicyEvaluationResult
)

router = APIRouter(prefix="/policies", tags=["Policy & Configuration Engine"])


# ── Telemetry & Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_policy_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get real-time telemetry metrics for policy engine and evaluation performance."""
    metrics = await PolicyService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Global Customer Monthly Limit & Midnight Reset Endpoints ────────────────

@router.get("/global-monthly-limit", response_model=APIResponse)
async def get_global_monthly_limit(
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get overall customer monthly limit configuration and auto-reset schedule."""
    config = PolicyService.get_global_monthly_limit_config()
    return APIResponse(data=config)


@router.post("/global-monthly-limit", response_model=APIResponse)
async def update_global_monthly_limit(
    payload: Dict[str, Any] = Body(...),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Update overall customer monthly transfer limit (e.g. Rs 50,000) and affected services (DMT, PAYOUT)."""
    updated = PolicyService.update_global_monthly_limit_config(payload)
    return APIResponse(message="Overall customer monthly limit updated successfully", data=updated)


@router.post("/global-monthly-limit/reset", response_model=APIResponse)
async def reset_global_monthly_limit(
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Execute monthly counter reset (resets accumulated customer monthly balances to Rs 0.00). Runs on 1st at midnight."""
    res = PolicyService.reset_monthly_limit_counters()
    return APIResponse(message=res["message"], data=res)


# ── Policy Management ─────────────────────────────────────────────────────────

@router.post("/", response_model=APIResponse, status_code=201)
async def create_policy(
    req: PolicyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Create a new policy rule with draft version."""
    policy = await PolicyService.create_policy(db, req)
    return APIResponse(message="Policy created in draft status", data=policy.model_dump(mode="json"))


@router.get("/", response_model=APIResponse)
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List all policy master definitions and their active statuses."""
    policies = await PolicyService.list_policies(db)
    return APIResponse(data=[p.model_dump(mode="json") for p in policies])


@router.post("/{policy_id}/publish", response_model=APIResponse)
async def publish_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Publish a draft policy version to production (Zero Downtime Hot-Reload)."""
    policy = await PolicyService.publish_policy(db, policy_id)
    return APIResponse(message="Policy version published to production", data=policy.model_dump(mode="json"))


# ── Policy Evaluation Engine (Sub-50ms) ───────────────────────────────────────

@router.post("/evaluate", response_model=APIResponse)
async def evaluate_policy(
    ctx: PolicyEvaluationContext,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """High-performance Policy Evaluation Engine. Resolves 11-tier hierarchy override rules."""
    result = await PolicyService.evaluate_policy(db, ctx)
    return APIResponse(data=result.model_dump(mode="json"))


@router.post("/validate-transaction", response_model=APIResponse)
async def validate_transaction(
    ctx: PolicyEvaluationContext,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Pre-transaction validation check across Limits, KYC, Cooling Period, Risk, and OTP rules."""
    result = await PolicyService.evaluate_policy(db, ctx)
    return APIResponse(
        message="Transaction validated successfully" if result.is_allowed else "Transaction rejected by policy engine",
        data=result.model_dump(mode="json")
    )
