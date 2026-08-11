"""EPIC-023 — Customer & Beneficiary Policy, Limit & Configuration Engine — DTOs"""
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Policy Definition Requests ────────────────────────────────────────────────

class PolicyCreateRequest(BaseModel):
    policy_code: str = Field(..., min_length=2, max_length=100)
    policy_name: str = Field(..., min_length=2, max_length=200)
    policy_category: str = "LIMIT"  # CUSTOMER, BENEFICIARY, SERVICE, LIMIT, RISK, APPROVAL, OTP, COOLING
    description: Optional[str] = None
    is_mandatory: bool = True
    scope_level: str = "PLATFORM"  # 11-tier level
    rules: Dict[str, Any] = Field(default_factory=dict)


class PolicyVersionCreateRequest(BaseModel):
    policy_id: uuid.UUID
    rules_payload: Dict[str, Any]
    effective_from: datetime = Field(default_factory=lambda: datetime.now())
    effective_to: Optional[datetime] = None


# ── Policy Evaluation Context ─────────────────────────────────────────────────

class PolicyEvaluationContext(BaseModel):
    service_code: str
    amount: float
    customer_id: Optional[uuid.UUID] = None
    beneficiary_id: Optional[uuid.UUID] = None
    retailer_id: Optional[uuid.UUID] = None
    distributor_id: Optional[uuid.UUID] = None
    super_distributor_id: Optional[uuid.UUID] = None
    regional_manager_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    customer_category: str = "REGULAR"
    beneficiary_category: str = "REGULAR"
    kyc_level: str = "MINIMUM_KYC"
    risk_score: int = 15
    channel: str = "WEB"


class PolicyEvaluationResult(BaseModel):
    is_allowed: bool
    service_code: str
    evaluated_hierarchy_level: str  # Nearest level that resolved
    effective_single_txn_max: float
    effective_daily_amount_max: float
    effective_monthly_amount_max: float
    cooling_period_active: bool
    kyc_sufficient: bool
    otp_required: bool
    approval_type: str
    rejection_reasons: List[str] = []
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now())


# ── Policy Responses ──────────────────────────────────────────────────────────

class PolicyResponse(BaseModel):
    public_id: uuid.UUID
    policy_code: str
    policy_name: str
    policy_category: str
    description: Optional[str]
    current_version: int
    policy_status: str
    is_mandatory: bool
    created_date: Optional[datetime]


class PolicyDashboardMetricsResponse(BaseModel):
    total_policies: int
    active_policies: int
    published_versions: int
    overrides_count: int
    category_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]
    average_evaluation_latency_ms: float
