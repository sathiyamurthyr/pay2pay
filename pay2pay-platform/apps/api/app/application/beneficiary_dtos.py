"""EPIC-022 — Beneficiary Management & Verification Platform — DTOs"""
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Registration & Update ─────────────────────────────────────────────────────

class BeneficiaryRegisterRequest(BaseModel):
    customer_id: uuid.UUID
    full_name: str = Field(..., min_length=1, max_length=300)
    nickname: Optional[str] = None
    relationship: str = "FAMILY"
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    beneficiary_category: str = "REGULAR"
    beneficiary_type: str = "INDIVIDUAL"
    preferred_language: Optional[str] = "en"
    remarks: Optional[str] = None
    # Initial Bank details (Optional)
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = "SAVINGS"
    # Initial UPI details (Optional)
    upi_id: Optional[str] = None


class BeneficiaryUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    relationship: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    beneficiary_category: Optional[str] = None
    remarks: Optional[str] = None
    is_favourite: Optional[bool] = None


class BeneficiaryStatusChangeRequest(BaseModel):
    to_status: str
    reason: str


# ── Bank Verification ─────────────────────────────────────────────────────────

class BankVerificationRequest(BaseModel):
    account_number: str
    ifsc_code: str
    account_holder_name: str
    bank_name: str
    perform_penny_drop: bool = True


class BankVerificationResponse(BaseModel):
    verification_id: uuid.UUID
    verification_status: str
    penny_drop_ref: Optional[str]
    name_returned_by_bank: Optional[str]
    name_match_score: float
    is_name_matched: bool
    failure_reason: Optional[str]


# ── UPI Verification ──────────────────────────────────────────────────────────

class UpiVerificationRequest(BaseModel):
    upi_id: str
    provider_app: Optional[str] = None


class UpiVerificationResponse(BaseModel):
    verification_id: uuid.UUID
    upi_id: str
    registered_name: Optional[str]
    verification_status: str


# ── Responses ─────────────────────────────────────────────────────────────────

class BeneficiaryResponse(BaseModel):
    public_id: uuid.UUID
    beneficiary_number: str
    customer_id: uuid.UUID
    full_name: str
    nickname: Optional[str] = None
    relationship: str = "FAMILY"
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    beneficiary_category: str = "RETAIL"
    beneficiary_type: str = "INDIVIDUAL"
    verification_status: str = "VERIFIED"
    risk_category: str = "LOW"
    beneficiary_status: str = "ACTIVE"
    cooling_period_ends_at: Optional[datetime] = None
    is_favourite: bool = False
    account_number: Optional[str] = None
    masked_account_number: Optional[str] = None
    account_number_masked: Optional[str] = None
    ifsc: Optional[str] = None
    ifsc_code: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None


class BeneficiaryBankAccountResponse(BaseModel):
    public_id: uuid.UUID
    account_holder_name: str
    account_number_masked: Optional[str]
    ifsc_code: str
    bank_name: str
    branch_name: Optional[str]
    account_type: str
    verification_status: str
    is_primary: bool


class BeneficiaryUpiResponse(BaseModel):
    public_id: uuid.UUID
    upi_id: str
    provider_app: Optional[str]
    registered_name: Optional[str]
    verification_status: str
    is_primary: bool


# ── Service & Limits ──────────────────────────────────────────────────────────

class BeneficiaryServiceConfigResponse(BaseModel):
    public_id: uuid.UUID
    service_code: str
    service_name: str
    is_enabled: bool
    verification_required: bool
    cooling_period_hours: Optional[int]
    max_transfer_amount: Optional[float]
    max_monthly_amount: Optional[float]
    approval_required: bool
    otp_required: bool


class BeneficiaryLimitConfigResponse(BaseModel):
    public_id: uuid.UUID
    service_code: str
    hierarchy_level: str
    beneficiary_category: Optional[str]
    single_txn_max: Optional[float]
    daily_amount: Optional[float]
    monthly_amount: Optional[float]
    cooling_period_hours: Optional[int]
    limit_status: str


class BeneficiaryRiskProfileResponse(BaseModel):
    public_id: uuid.UUID
    beneficiary_id: uuid.UUID
    risk_score: int
    risk_category: str
    aml_screening: Optional[str]
    pep_screening: bool
    sanction_match: bool
    watch_list_match: bool


class BeneficiaryTimelineResponse(BaseModel):
    public_id: uuid.UUID
    event_type: str
    event_title: str
    event_description: Optional[str]
    performed_by: Optional[str]
    event_timestamp: datetime


# ── Beneficiary 360° ──────────────────────────────────────────────────────────

class Beneficiary360Response(BaseModel):
    beneficiary: BeneficiaryResponse
    bank_accounts: List[BeneficiaryBankAccountResponse] = []
    upis: List[BeneficiaryUpiResponse] = []
    verifications: List[BankVerificationResponse] = []
    risk_profile: Optional[BeneficiaryRiskProfileResponse] = None
    timeline: List[BeneficiaryTimelineResponse] = []


# ── Dashboard & Search ────────────────────────────────────────────────────────

class BeneficiaryDashboardMetricsResponse(BaseModel):
    total_beneficiaries: int
    today_registrations: int
    pending_verification: int
    cooling_period_active: int
    active_beneficiaries: int
    blocked_beneficiaries: int
    high_risk_beneficiaries: int
    favourite_count: int
    monthly_growth_pct: float
    category_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]


class BeneficiarySearchRequest(BaseModel):
    query: Optional[str] = None
    customer_id: Optional[str] = None
    beneficiary_status: Optional[str] = None
    beneficiary_category: Optional[str] = None
    verification_status: Optional[str] = None
    risk_category: Optional[str] = None
    page: int = 1
    page_size: int = 20
