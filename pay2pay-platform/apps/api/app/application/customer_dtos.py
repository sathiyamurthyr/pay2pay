"""EPIC-021 — Customer Lifecycle, KYC & Service Eligibility — DTOs"""
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Customer Registration & Update ────────────────────────────────────────────

class CustomerRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = None
    last_name: str = Field(..., min_length=1, max_length=100)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    occupation: Optional[str] = None
    customer_category: str = "REGULAR"
    customer_type: str = "INDIVIDUAL"
    preferred_language: Optional[str] = "en"
    preferred_channel: Optional[str] = "SMS"
    referral_code: Optional[str] = None
    introduced_by_retailer_id: Optional[uuid.UUID] = None


class CustomerUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    occupation: Optional[str] = None
    customer_category: Optional[str] = None
    preferred_language: Optional[str] = None
    preferred_channel: Optional[str] = None


class CustomerStatusChangeRequest(BaseModel):
    to_status: str
    reason: str
    reason_code: Optional[str] = None
    remarks: Optional[str] = None


# ── Customer Response ─────────────────────────────────────────────────────────

class CustomerResponse(BaseModel):
    public_id: uuid.UUID
    customer_number: str
    customer_category: str
    customer_type: str
    full_name: str
    mobile_number: str
    email: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    nationality: Optional[str]
    kyc_level: str
    kyc_status: str
    risk_category: str
    customer_status: str
    registration_date: Optional[datetime]
    activation_date: Optional[datetime]
    created_date: Optional[datetime] = None
    photo_url: Optional[str] = None
    photo_base64: Optional[str] = None
    masked_aadhaar: Optional[str] = None
    aadhaar_verified: bool = False
    aadhaar_verification_status: str = "PENDING"
    beneficiaries: List[Dict[str, Any]] = []


# ── Address ───────────────────────────────────────────────────────────────────

class CustomerAddressRequest(BaseModel):
    address_type: str = "PERMANENT"
    address_line1: str
    address_line2: Optional[str] = None
    landmark: Optional[str] = None
    village: Optional[str] = None
    city: str
    district: Optional[str] = None
    state: str
    pin_code: str
    country: str = "INDIA"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    proof_type: Optional[str] = None
    proof_number: Optional[str] = None
    is_primary: bool = True


class CustomerAddressResponse(BaseModel):
    public_id: uuid.UUID
    address_type: str
    address_line1: str
    address_line2: Optional[str]
    city: str
    district: Optional[str]
    state: str
    pin_code: str
    country: str
    is_primary: bool
    is_verified: bool


# ── Identity ──────────────────────────────────────────────────────────────────

class CustomerIdentityRequest(BaseModel):
    identity_type: str
    identity_number: str
    name_on_document: Optional[str] = None
    dob_on_document: Optional[date] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    is_primary: bool = False


class CustomerIdentityResponse(BaseModel):
    public_id: uuid.UUID
    identity_type: str
    identity_number_masked: Optional[str]
    verification_status: str
    verified_at: Optional[datetime]
    is_primary: bool
    expiry_date: Optional[date]


# ── KYC ───────────────────────────────────────────────────────────────────────

class CustomerKycSubmitRequest(BaseModel):
    kyc_level: str = "MINIMUM_KYC"
    kyc_type: str = "SELF"
    remarks: Optional[str] = None


class CustomerKycReviewRequest(BaseModel):
    kyc_status: str
    rejection_reason: Optional[str] = None
    rejection_code: Optional[str] = None
    remarks: Optional[str] = None
    face_match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    aadhaar_verified: bool = False
    pan_verified: bool = False
    bank_verified: bool = False
    ckyc_number: Optional[str] = None
    ckyc_verified: bool = False


class CustomerKycResponse(BaseModel):
    public_id: uuid.UUID
    customer_id: uuid.UUID
    kyc_level: str
    kyc_type: str
    kyc_status: str
    submission_date: Optional[datetime]
    completed_at: Optional[datetime]
    reviewed_by: Optional[str]
    rejection_reason: Optional[str]
    face_match_score: Optional[float]
    liveness_score: Optional[float]
    aadhaar_verified: bool
    pan_verified: bool
    bank_verified: bool
    ckyc_verified: bool
    kyc_expiry_date: Optional[date]


# ── Document ──────────────────────────────────────────────────────────────────

class CustomerDocumentUploadRequest(BaseModel):
    document_type: str
    document_name: str
    file_url: str
    document_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None


class CustomerDocumentResponse(BaseModel):
    public_id: uuid.UUID
    document_type: str
    document_name: str
    file_url: str
    document_number: Optional[str]
    expiry_date: Optional[date]
    verification_status: str
    is_current: bool
    version_number: int


# ── Service Eligibility ───────────────────────────────────────────────────────

class CustomerServiceResponse(BaseModel):
    public_id: uuid.UUID
    service_code: str
    service_name: str
    is_enabled: bool
    eligibility_status: str
    eligibility_reason: Optional[str]
    enabled_at: Optional[datetime]
    last_used_at: Optional[datetime]


class ServiceToggleRequest(BaseModel):
    service_code: str
    is_enabled: bool
    reason: Optional[str] = None


class ServiceConfigRequest(BaseModel):
    service_code: str
    service_name: str
    is_enabled: bool = True
    requires_full_kyc: bool = False
    minimum_kyc_level: Optional[str] = None
    minimum_age: Optional[int] = None
    maximum_age: Optional[int] = None
    cooling_period_days: Optional[int] = None
    max_beneficiaries: Optional[int] = None
    requires_approval: bool = False
    risk_validation_enabled: bool = True


class ServiceConfigResponse(BaseModel):
    public_id: uuid.UUID
    service_code: str
    service_name: str
    is_enabled: bool
    requires_full_kyc: bool
    minimum_kyc_level: Optional[str]
    minimum_age: Optional[int]
    maximum_age: Optional[int]
    cooling_period_days: Optional[int]
    max_beneficiaries: Optional[int]
    config_status: str


# ── Limits ────────────────────────────────────────────────────────────────────

class CustomerLimitConfigRequest(BaseModel):
    service_code: str
    hierarchy_level: str = "CUSTOMER"
    customer_category: Optional[str] = None
    kyc_level: Optional[str] = None
    single_txn_min: Optional[float] = None
    single_txn_max: Optional[float] = None
    daily_txn_count: Optional[int] = None
    daily_amount: Optional[float] = None
    weekly_amount: Optional[float] = None
    monthly_txn_count: Optional[int] = None
    monthly_amount: Optional[float] = None
    quarterly_amount: Optional[float] = None
    yearly_amount: Optional[float] = None
    max_outstanding: Optional[float] = None
    max_failed_attempts: Optional[int] = None
    max_beneficiaries: Optional[int] = None
    cooling_period_hours: Optional[int] = None
    override_allowed: bool = True
    effective_from: date = Field(default_factory=date.today)
    effective_to: Optional[date] = None


class CustomerLimitConfigResponse(BaseModel):
    public_id: uuid.UUID
    service_code: str
    hierarchy_level: str
    customer_category: Optional[str]
    kyc_level: Optional[str]
    single_txn_max: Optional[float]
    daily_amount: Optional[float]
    monthly_amount: Optional[float]
    yearly_amount: Optional[float]
    override_allowed: bool
    effective_from: date
    effective_to: Optional[date]
    limit_status: str


class CustomerLimitOverrideRequest(BaseModel):
    service_code: str
    override_type: str = "TEMPORARY"
    single_txn_max: Optional[float] = None
    daily_amount: Optional[float] = None
    monthly_amount: Optional[float] = None
    yearly_amount: Optional[float] = None
    effective_from: date = Field(default_factory=date.today)
    effective_to: Optional[date] = None
    approval_reason: Optional[str] = None


# ── Risk Profile ──────────────────────────────────────────────────────────────

class CustomerRiskProfileResponse(BaseModel):
    public_id: uuid.UUID
    customer_id: uuid.UUID
    risk_score: int
    risk_category: str
    aml_level: str
    is_pep: bool
    sanction_check_result: Optional[str]
    watch_list_match: bool
    geo_risk_score: Optional[int]
    behaviour_risk_score: Optional[int]
    velocity_risk_score: Optional[int]
    last_reviewed_at: Optional[datetime]
    next_review_date: Optional[date]


class CustomerRiskUpdateRequest(BaseModel):
    risk_score: int
    risk_category: str
    aml_level: str
    is_pep: bool = False
    pep_category: Optional[str] = None
    sanction_check_result: Optional[str] = None
    watch_list_match: bool = False
    override_reason: Optional[str] = None


# ── Relationship ──────────────────────────────────────────────────────────────

class CustomerRelationshipRequest(BaseModel):
    relation_type: str
    related_name: str
    related_mobile: Optional[str] = None
    related_email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    identity_type: Optional[str] = None
    identity_number: Optional[str] = None
    share_percentage: Optional[float] = None
    is_primary: bool = False


class CustomerRelationshipResponse(BaseModel):
    public_id: uuid.UUID
    relation_type: str
    related_name: str
    related_mobile: Optional[str]
    is_primary: bool
    is_active_rel: bool


# ── Timeline ──────────────────────────────────────────────────────────────────

class CustomerTimelineResponse(BaseModel):
    public_id: uuid.UUID
    event_type: str
    event_code: str
    event_title: str
    event_description: Optional[str]
    performed_by: Optional[str]
    event_timestamp: datetime


# ── Blacklist / Whitelist ─────────────────────────────────────────────────────

class CustomerBlacklistRequest(BaseModel):
    blacklist_type: str = "CUSTOMER"
    identity_type: Optional[str] = None
    identity_value: Optional[str] = None
    mobile_number: Optional[str] = None
    reason: str
    reason_code: Optional[str] = None
    is_permanent: bool = False
    expiry_date: Optional[datetime] = None
    source_system: Optional[str] = None


class CustomerBlacklistResponse(BaseModel):
    public_id: uuid.UUID
    blacklist_type: str
    mobile_number: Optional[str]
    identity_type: Optional[str]
    reason: str
    is_permanent: bool
    blacklist_date: datetime
    blacklist_status: str


class CustomerWhitelistRequest(BaseModel):
    whitelist_type: str = "SERVICE_LIMIT"
    service_code: Optional[str] = None
    override_limit: Optional[float] = None
    reason: str
    effective_from: date = Field(default_factory=date.today)
    effective_to: Optional[date] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class CustomerDashboardMetricsResponse(BaseModel):
    total_customers: int
    active_customers: int
    today_registrations: int
    pending_kyc: int
    rejected_kyc: int
    blocked_customers: int
    high_risk_customers: int
    inactive_customers: int
    monthly_growth_pct: float
    category_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]
    kyc_level_breakdown: Dict[str, int]


# ── Search ────────────────────────────────────────────────────────────────────

class CustomerSearchRequest(BaseModel):
    query: Optional[str] = None
    mobile_number: Optional[str] = None
    customer_category: Optional[str] = None
    customer_status: Optional[str] = None
    kyc_status: Optional[str] = None
    kyc_level: Optional[str] = None
    risk_category: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    page: int = 1
    page_size: int = 20


# ── Customer 360 ──────────────────────────────────────────────────────────────

class Customer360Response(BaseModel):
    customer: CustomerResponse
    addresses: List[CustomerAddressResponse] = []
    identities: List[CustomerIdentityResponse] = []
    kyc: Optional[CustomerKycResponse] = None
    documents: List[CustomerDocumentResponse] = []
    services: List[CustomerServiceResponse] = []
    risk_profile: Optional[CustomerRiskProfileResponse] = None
    relationships: List[CustomerRelationshipResponse] = []
    timeline: List[CustomerTimelineResponse] = []
