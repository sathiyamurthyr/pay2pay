import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


# Base API Response Wrapper
class APIResponse(BaseModel):
    success: bool = True
    message: str = "Success"
    data: Optional[Any] = None


# Pagination DTO
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# Authentication DTOs
class LoginRequest(BaseModel):
    email_or_username: str = Field(...)
    password: str = Field(..., min_length=6)
    mfa_code: Optional[str] = Field(default=None)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    requires_mfa: bool = False
    user: Optional[Dict[str, Any]] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class MfaSetupResponse(BaseModel):
    secret: str
    qr_code_uri: str


class MfaVerifyRequest(BaseModel):
    code: str


# Tenant DTOs
class TenantCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    version_no: int = Field(..., description="Optimistic locking version")


class TenantResponse(BaseModel):
    public_id: uuid.UUID
    name: str
    code: str
    status: str
    description: Optional[str] = None
    version_no: int
    created_date: datetime
    updated_date: datetime


# EPIC-002 Company Sub-Module DTOs
class CompanyContactDTO(BaseModel):
    primary_contact: str = Field(..., min_length=2)
    designation: Optional[str] = "Director"
    mobile: str = Field(..., description="10-digit Indian Mobile")
    alternate_mobile: Optional[str] = None
    email: EmailStr
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = None
    emergency_contact: Optional[str] = None


class CompanyAddressDTO(BaseModel):
    address_type: str = "REGISTERED"
    country: str = "India"
    state: str
    district: Optional[str] = None
    city: str
    address: str
    pincode: str = Field(..., description="6-digit Pincode")
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CompanyBankDTO(BaseModel):
    settlement_bank_name: str
    account_holder: str
    account_number: str
    ifsc: str = Field(..., description="11-character IFSC code")
    branch: Optional[str] = None
    cancelled_cheque_url: Optional[str] = None


class CompanySubscriptionDTO(BaseModel):
    plan_name: str = "ENTERPRISE_TRIAL"
    maximum_retailers: int = 500
    maximum_machines: int = 1000
    maximum_admin_users: int = 25
    storage_limit_gb: int = 50
    api_limit_per_minute: int = 1000


class CompanyBrandingDTO(BaseModel):
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_colour: str = "#3b82f6"
    secondary_colour: str = "#1e293b"
    email_template: Optional[str] = None
    sms_template: Optional[str] = None
    invoice_header: Optional[str] = None
    receipt_footer: Optional[str] = None


class CompanySettingDTO(BaseModel):
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    date_format: str = "DD/MM/YYYY"
    number_format: str = "en-IN"
    financial_year_start: str = "04-01"
    gst_enabled: bool = True
    tds_enabled: bool = True
    auto_settlement: bool = True
    auto_payout: bool = False
    approval_workflow: bool = True
    session_timeout_minutes: int = 30
    otp_expiry_seconds: int = 300


# EPIC-002 Full Onboarding Request
class CompanyOnboardingCreateRequest(BaseModel):
    # Basic Info
    company_code: str = Field(..., min_length=2, max_length=50)
    company_name: str = Field(..., min_length=2, max_length=255)
    legal_name: str = Field(..., min_length=2, max_length=255)
    display_name: Optional[str] = None
    short_name: Optional[str] = None
    tenant_code: str = Field(..., min_length=2, max_length=50)
    company_type: str = "PRIVATE_LIMITED"
    industry: Optional[str] = "Retail Technology"
    business_category: Optional[str] = "Payment Aggregation"
    website: Optional[str] = None
    description: Optional[str] = None

    # Registration Info
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    msme_number: Optional[str] = None
    tan_number: Optional[str] = None
    fssai_number: Optional[str] = None
    business_registration_date: Optional[date] = None

    # Nested Detail DTOs
    contact: CompanyContactDTO
    address: CompanyAddressDTO
    bank: CompanyBankDTO
    subscription: Optional[CompanySubscriptionDTO] = Field(default_factory=CompanySubscriptionDTO)
    branding: Optional[CompanyBrandingDTO] = Field(default_factory=CompanyBrandingDTO)
    settings: Optional[CompanySettingDTO] = Field(default_factory=CompanySettingDTO)

    # Initial Admin User Credentials
    admin_full_name: str = "Company Admin"
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)





class CompanyUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    legal_name: Optional[str] = None
    display_name: Optional[str] = None
    short_name: Optional[str] = None
    industry: Optional[str] = None
    business_category: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    version_no: int = Field(..., description="Optimistic locking version")


class CompanyApprovalRequest(BaseModel):
    comments: Optional[str] = None


class CompanyStatusChangeRequest(BaseModel):
    status: str  # PENDING_APPROVAL, APPROVED, ACTIVE, SUSPENDED, BLOCKED, EXPIRED, CLOSED, ARCHIVED
    reason: Optional[str] = None


class CompanyDocumentUploadRequest(BaseModel):
    document_type: str  # GST_CERTIFICATE, PAN_CARD, COI, CANCELLED_CHEQUE, ADDRESS_PROOF, OTHER
    document_name: str
    file_url: str
    file_size_bytes: Optional[int] = None


class CompanyDetailsResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_code: str
    company_name: str
    legal_name: str
    display_name: Optional[str] = None
    short_name: Optional[str] = None
    tenant_code: str
    company_type: str
    industry: Optional[str] = None
    business_category: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    msme_number: Optional[str] = None
    tan_number: Optional[str] = None
    fssai_number: Optional[str] = None
    business_registration_date: Optional[date] = None
    status: str
    version_no: int
    created_date: datetime

    contact: Optional[Dict[str, Any]] = None
    address: Optional[Dict[str, Any]] = None
    bank: Optional[Dict[str, Any]] = None
    subscription: Optional[Dict[str, Any]] = None
    branding: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    documents: List[Dict[str, Any]] = []
    status_history: List[Dict[str, Any]] = []
    approvals: List[Dict[str, Any]] = []


# Aliases for backward compatibility
CompanyCreate = CompanyOnboardingCreateRequest
CompanyUpdate = CompanyUpdateRequest
CompanyResponse = CompanyDetailsResponse


# Admin User DTOs
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    full_name: str
    phone: Optional[str] = None
    company_id: Optional[uuid.UUID] = None
    role_ids: List[uuid.UUID] = []


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    company_id: Optional[uuid.UUID] = None
    version_no: int = Field(..., description="Optimistic locking version")


class UserResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    status: str
    mfa_enabled: bool
    last_login_at: Optional[datetime] = None
    roles: List[Dict[str, Any]] = []
    version_no: int
    created_date: datetime


# Role & Permission DTOs
class PermissionResponse(BaseModel):
    public_id: uuid.UUID
    code: str
    name: str
    module: str
    action: str
    description: Optional[str] = None


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    permission_ids: List[uuid.UUID] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[uuid.UUID]] = None
    version_no: int = Field(..., description="Optimistic locking version")


class RoleResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None
    is_system: bool
    version_no: int
    permissions: List[PermissionResponse] = []
    created_date: datetime


class RolePermissionMatrixResponse(BaseModel):
    roles: List[RoleResponse]
    permissions: List[PermissionResponse]
    matrix: Dict[str, List[str]]


# Audit Log DTOs
class AuditLogResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    actor_id: Optional[uuid.UUID] = None
    actor_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime


# Profile, Sessions & API Keys
class ProfileUpdate(BaseModel):
    full_name: str
    phone: Optional[str] = None


class SessionResponse(BaseModel):
    public_id: uuid.UUID
    token_jti: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    last_accessed_at: datetime
    expires_at: datetime
    is_current: bool = False


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    scopes: List[str] = ["read"]


class ApiKeyResponse(BaseModel):
    public_id: uuid.UUID
    name: str
    key_prefix: str
    scopes: List[str]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    secret_key: Optional[str] = None


# System Config DTOs
class ConfigCreateUpdate(BaseModel):
    key: str
    value: str
    category: str = "GENERAL"
    description: Optional[str] = None
    is_encrypted: bool = False


class ConfigResponse(BaseModel):
    public_id: uuid.UUID
    key: str
    value: str
    category: str
    description: Optional[str] = None
    is_encrypted: bool
    version_no: int


# EPIC-002 Company Dashboard Metrics Response DTO
class CompanyDashboardMetricsResponse(BaseModel):
    total_companies: int
    active_companies: int
    inactive_companies: int
    suspended_companies: int
    created_today: int
    expiring_soon: int
    trial_companies: int
    live_companies: int
    growth_chart: List[Dict[str, Any]]
    status_distribution: Dict[str, int]
    state_distribution: Dict[str, int]
    subscription_distribution: Dict[str, int]


class DashboardWidgetsResponse(BaseModel):
    total_companies: Dict[str, Any]
    active_retailers: Dict[str, Any]
    total_machines: Dict[str, Any]
    todays_settlement: Dict[str, Any]
    wallet_liability: Dict[str, Any]
    pending_payouts: Dict[str, Any]
    todays_profit: Dict[str, Any]
    failed_settlement: Dict[str, Any]
    pending_approvals: Dict[str, Any]
    recent_activities: List[Dict[str, Any]]


# EPIC-003 Organization & Hierarchy DTOs
class RMCreateRequest(BaseModel):
    employee_code: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., description="10-digit Mobile")
    email: EmailStr
    photo_url: Optional[str] = None
    designation: str = "Regional Manager"
    joining_date: Optional[date] = None
    reporting_manager_id: Optional[uuid.UUID] = None
    remarks: Optional[str] = None
    company_id: uuid.UUID


class RMUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    version_no: int = Field(..., description="Optimistic locking version")


class RMResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    employee_code: str
    full_name: str
    mobile: str
    email: str
    photo_url: Optional[str] = None
    designation: str
    joining_date: Optional[date] = None
    reporting_manager_id: Optional[uuid.UUID] = None
    status: str
    kyc_status: str
    remarks: Optional[str] = None
    version_no: int
    created_date: datetime


class SuperDistributorCreateRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., description="10-digit Mobile")
    email: EmailStr
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc: Optional[str] = None
    credit_limit: float = 500000.0
    state: str
    city: str
    address: str
    pincode: str
    mapped_rm_id: uuid.UUID
    company_id: uuid.UUID


class SuperDistributorUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    mobile: Optional[str] = None
    credit_limit: Optional[float] = None
    status: Optional[str] = None
    mapped_rm_id: Optional[uuid.UUID] = None
    version_no: int = Field(..., description="Optimistic locking version")


class SuperDistributorResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    business_name: str
    owner_name: str
    mobile: str
    email: str
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc: Optional[str] = None
    wallet_balance: float
    credit_limit: float
    state: str
    city: str
    address: str
    pincode: str
    status: str
    mapped_rm_id: Optional[uuid.UUID] = None
    version_no: int
    created_date: datetime


class DistributorCreateRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., description="10-digit Mobile")
    email: EmailStr
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc: Optional[str] = None
    credit_limit: float = 100000.0
    state: str
    city: str
    address: str
    pincode: str
    mapped_super_distributor_id: uuid.UUID
    company_id: uuid.UUID


class DistributorUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    mobile: Optional[str] = None
    credit_limit: Optional[float] = None
    status: Optional[str] = None
    mapped_super_distributor_id: Optional[uuid.UUID] = None
    version_no: int = Field(..., description="Optimistic locking version")


class DistributorResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    business_name: str
    owner_name: str
    mobile: str
    email: str
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc: Optional[str] = None
    wallet_balance: float
    credit_limit: float
    state: str
    city: str
    address: str
    pincode: str
    status: str
    mapped_super_distributor_id: Optional[uuid.UUID] = None
    version_no: int
    created_date: datetime


class OrganizationTransferCreateRequest(BaseModel):
    entity_type: str = Field(..., description="SUPER_DISTRIBUTOR or DISTRIBUTOR")
    entity_id: uuid.UUID
    new_parent_type: str = Field(..., description="REGIONAL_MANAGER or SUPER_DISTRIBUTOR")
    new_parent_id: uuid.UUID
    effective_date: datetime = Field(default_factory=datetime.utcnow)
    reason: str = Field(..., min_length=5)


class OrganizationTransferApprovalRequest(BaseModel):
    comments: Optional[str] = None


class OrganizationTransferResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    entity_type: str
    entity_id: uuid.UUID
    old_parent_type: str
    old_parent_id: uuid.UUID
    new_parent_type: str
    new_parent_id: uuid.UUID
    transfer_date: datetime
    effective_date: datetime
    reason: str
    status: str
    approved_by: Optional[str] = None
    approved_date: Optional[datetime] = None
    version_no: int
    created_date: datetime


class OrganizationTreeNode(BaseModel):
    id: str
    type: str  # COMPANY, REGIONAL_MANAGER, SUPER_DISTRIBUTOR, DISTRIBUTOR
    name: str
    code_or_email: str
    status: str
    children: List["OrganizationTreeNode"] = []


class OrganizationDashboardMetricsResponse(BaseModel):
    total_rms: int
    total_super_distributors: int
    total_distributors: int
    mapped_entities: int
    unmapped_entities: int
    suspended_entities: int
    inactive_entities: int
    pending_transfers: int
    growth_chart: List[Dict[str, Any]]
    tier_distribution: Dict[str, int]


# EPIC-004 Retailer DTOs
class RetailerOnboardCreateRequest(BaseModel):
    retailer_code: str = Field(..., min_length=3, max_length=50)
    store_name: str = Field(..., min_length=2, max_length=255)
    legal_name: str = Field(..., min_length=2, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    business_category: str = "General Store"
    store_type: str = "BRICK_AND_MORTAR"
    website: Optional[str] = None
    mapped_distributor_id: uuid.UUID
    company_id: uuid.UUID

    # Contact & Address
    primary_contact: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., description="10-digit mobile")
    email: EmailStr
    state: str
    city: str
    address: str
    pincode: str

    # Bank Details
    settlement_bank_name: str
    account_holder: str
    account_number: str
    ifsc: str

    # KYC Info
    pan_number: Optional[str] = None
    gst_number: Optional[str] = None
    aadhaar_number: Optional[str] = None

    # Wallet & Limits
    daily_transaction_limit: float = 100000.0
    single_transaction_limit: float = 25000.0


class RetailerUpdateRequest(BaseModel):
    store_name: Optional[str] = None
    owner_name: Optional[str] = None
    business_category: Optional[str] = None
    status: Optional[str] = None
    mapped_distributor_id: Optional[uuid.UUID] = None
    version_no: int = Field(..., description="Optimistic locking version")


class RetailerApprovalRequest(BaseModel):
    action: str = Field(..., description="APPROVE or REJECT")
    comments: Optional[str] = None


class RetailerStatusChangeRequest(BaseModel):
    new_status: str = Field(..., description="ACTIVE, SUSPENDED, BLOCKED, CLOSED")
    reason: str = Field(..., min_length=3)


class RetailerResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    retailer_code: str
    store_name: str
    legal_name: str
    owner_name: str
    business_category: str
    store_type: str
    status: str
    mapped_distributor_id: Optional[uuid.UUID] = None
    version_no: int
    created_date: datetime


class RetailerDetailsResponse(BaseModel):
    retailer: RetailerResponse
    contacts: List[Dict[str, Any]]
    addresses: List[Dict[str, Any]]
    banks: List[Dict[str, Any]]
    kyc: Optional[Dict[str, Any]] = None
    wallet: Optional[Dict[str, Any]] = None
    status_history: List[Dict[str, Any]]
    approvals: List[Dict[str, Any]]


class RetailerDashboardMetricsResponse(BaseModel):
    total_retailers: int
    active_retailers: int
    pending_kyc: int
    suspended_retailers: int
    created_today: int
    total_wallet_balance: float
    growth_chart: List[Dict[str, Any]]
    category_distribution: Dict[str, int]
    status_distribution: Dict[str, int]


# EPIC-005 Swipe Machine DTOs
class MachineCreateRequest(BaseModel):
    serial_number: str = Field(..., min_length=5, max_length=100)
    tid: str = Field(..., min_length=8, max_length=16, description="Terminal ID")
    mid: str = Field(..., min_length=8, max_length=24, description="Merchant ID")
    pos_model: str = "Pax A920"
    machine_type: str = "ANDROID_POS"
    os_version: Optional[str] = "Android 11"
    firmware_version: Optional[str] = "v2.4.1"
    sim_iccid: Optional[str] = None
    telecom_provider: Optional[str] = "Airtel M2M"
    mapped_retailer_id: uuid.UUID
    company_id: uuid.UUID


class MachineUpdateRequest(BaseModel):
    pos_model: Optional[str] = None
    status: Optional[str] = None
    mapped_retailer_id: Optional[uuid.UUID] = None
    version_no: int = Field(..., description="Optimistic locking version")


class MachineTelemetryPingRequest(BaseModel):
    battery_percentage: int = Field(..., ge=0, le=100)
    network_type: str = "4G"
    signal_strength: int = -75
    app_version: str = "v1.8.0"
    txns_processed: int = 0
    volume_processed: float = 0.0


class MachineReplacementCreateRequest(BaseModel):
    old_serial_number: str
    reason: str = Field(..., min_length=5)


class MachineResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    serial_number: str
    tid: str
    mid: str
    pos_model: str
    machine_type: str
    os_version: Optional[str] = None
    firmware_version: Optional[str] = None
    sim_iccid: Optional[str] = None
    telecom_provider: Optional[str] = None
    status: str
    mapped_retailer_id: Optional[uuid.UUID] = None
    version_no: int
    created_date: datetime


class MachineDetailsResponse(BaseModel):
    machine: MachineResponse
    telemetry: Optional[Dict[str, Any]] = None
    key_profile: Optional[Dict[str, Any]] = None
    maintenances: List[Dict[str, Any]]
    status_history: List[Dict[str, Any]]


class MachineDashboardMetricsResponse(BaseModel):
    total_machines: int
    active_machines: int
    inventory_stock: int
    faulty_machines: int
    offline_24h: int
    total_daily_volume: float
    model_distribution: Dict[str, int]
    network_distribution: Dict[str, int]


# EPIC-006 Settlement Engine DTOs
class TransactionIngestCreateRequest(BaseModel):
    transaction_id: str = Field(..., min_length=5, max_length=100)
    rrn: str = Field(..., min_length=12, max_length=30)
    auth_code: str = Field(..., min_length=4, max_length=20)
    amount: float = Field(..., gt=0)
    payment_mode: str = "VISA_CREDIT"
    card_number_masked: Optional[str] = "4111xxxxxx1111"
    mapped_tid: str = Field(..., min_length=8, max_length=20)
    mapped_retailer_id: uuid.UUID
    company_id: uuid.UUID


class TransactionResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    transaction_id: str
    rrn: str
    auth_code: str
    amount: float
    payment_mode: str
    card_number_masked: Optional[str] = None
    status: str
    settlement_status: str
    mapped_tid: str
    mapped_retailer_id: uuid.UUID
    created_date: datetime
    fee_split: Optional[Dict[str, Any]] = None


class SettlementBatchGenerateRequest(BaseModel):
    company_id: uuid.UUID


class SettlementBatchResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    batch_number: str
    batch_date: date
    gross_volume: float
    total_mdr: float
    total_gst: float
    net_payout_amount: float
    transaction_count: int
    status: str
    created_date: datetime


class BankPayoutProcessRequest(BaseModel):
    retailer_id: uuid.UUID
    amount: float = Field(..., gt=0)
    payout_method: str = "IMPS"
    bank_account_number: str
    ifsc: str


class BankPayoutResponse(BaseModel):
    public_id: uuid.UUID
    payout_reference: str
    retailer_id: uuid.UUID
    amount: float
    utr_number: Optional[str] = None
    status: str
    dispatched_at: datetime


class SettlementDashboardMetricsResponse(BaseModel):
    total_processed_volume: float
    total_settled_amount: float
    pending_settlement_volume: float
    total_mdr_earned: float
    total_gst_liability: float
    total_distributor_commissions: float
    total_payouts_dispatched: int
    volume_by_mode: Dict[str, float]
    hourly_trend: List[Dict[str, Any]]


# EPIC-007 Developer API Gateway & Risk DTOs
class ApiKeyCreateRequest(BaseModel):
    key_name: str = Field(..., min_length=3, max_length=100)
    scopes: str = "transactions.read,settlements.write"


class ApiKeyResponse(BaseModel):
    public_id: uuid.UUID
    key_name: str
    client_id: str
    secret_key_raw: Optional[str] = None  # Only returned upon creation
    scopes: str
    status: str
    created_date: datetime


class WebhookSubscriptionCreateRequest(BaseModel):
    target_url: str = Field(..., min_length=10, max_length=500)
    events: str = "transaction.created,settlement.completed,payout.dispatched"


class WebhookSubscriptionResponse(BaseModel):
    public_id: uuid.UUID
    target_url: str
    secret_key: str
    events: str
    status: str
    created_date: datetime


class ChargebackCaseCreateRequest(BaseModel):
    case_reference: str = Field(..., min_length=5, max_length=50)
    transaction_id: str = Field(..., min_length=5, max_length=100)
    retailer_id: uuid.UUID
    dispute_amount: float = Field(..., gt=0)
    reason_code: str = "UNAUTHORIZED_TRANSACTION"
    due_date: date


class ChargebackCaseResponse(BaseModel):
    public_id: uuid.UUID
    case_reference: str
    transaction_id: str
    retailer_id: uuid.UUID
    dispute_amount: float
    reason_code: str
    status: str
    due_date: date
    created_date: datetime


class DeveloperDashboardMetricsResponse(BaseModel):
    total_api_keys: int
    active_webhooks: int
    total_webhook_events_delivered: int
    webhook_success_rate_pct: float
    open_fraud_alerts: int
    active_chargebacks: int
    total_disputed_amount: float
    event_distribution: Dict[str, int]





