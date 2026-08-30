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
    email_or_username: Optional[str] = Field(default=None)
    username: Optional[str] = Field(default=None)
    mobile_number: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    mobile: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    password: str = Field(..., min_length=4)
    mfa_code: Optional[str] = Field(default=None)

    def get_identifier(self) -> str:
        return (
            self.email_or_username
            or self.mobile_number
            or self.username
            or self.phone
            or self.mobile
            or self.email
            or ""
        )


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


# User Type DTO
class UserTypeResponse(BaseModel):
    user_type_ref_id: int
    user_type_code: str
    user_type_name: str
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    public_id: Optional[uuid.UUID] = None
    is_system: bool = True


# Admin User DTOs
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    full_name: str
    phone: Optional[str] = None
    user_type: Optional[str] = "PLATFORM_ADMIN"
    company_id: Optional[uuid.UUID] = None
    role_ids: List[uuid.UUID] = []


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    user_type: Optional[str] = None
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
    user_type: Optional[str] = "PLATFORM_ADMIN"
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
    mapped_rm_id: Optional[uuid.UUID] = None
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
    action: str = Field(..., description="APPROVE, APPROVED, HOLD, REJECT, REJECTED")
    comments: Optional[str] = None
    remarks: Optional[str] = None


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


class RetailerHierarchyMapRequest(BaseModel):
    company_id: Optional[uuid.UUID] = None
    distributor_id: Optional[uuid.UUID] = None
    super_distributor_id: Optional[uuid.UUID] = None
    rm_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class RetailerDetailsResponse(BaseModel):
    retailer: RetailerResponse
    contacts: List[Dict[str, Any]]
    addresses: List[Dict[str, Any]]
    banks: List[Dict[str, Any]]
    kyc: Optional[Dict[str, Any]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    wallet: Optional[Dict[str, Any]] = None
    status_history: List[Dict[str, Any]]
    approvals: List[Dict[str, Any]]
    hierarchy: Optional[Dict[str, Any]] = None
    assigned_distributor: Optional[Dict[str, Any]] = None
    assigned_sd: Optional[Dict[str, Any]] = None
    assigned_rm: Optional[Dict[str, Any]] = None
    company: Optional[Dict[str, Any]] = None


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


# EPIC-008 Compliance & Audit DTOs
class TenantConfigUpdateRequest(BaseModel):
    config_key: str = Field(..., min_length=3, max_length=100)
    config_value: str
    data_type: str = "STRING"
    description: Optional[str] = None


class ComplianceReportGenerateRequest(BaseModel):
    report_type: str = "GSTR_1_SUMMARY"
    tax_period: str = Field(..., min_length=7, max_length=7, description="YYYY-MM")
    service_name: Optional[str] = "ALL_SERVICES"     # POS Swipe, UPI, DMT, AEPS, BBPS, All Services
    gst_rate: Optional[str] = "18%"                   # Service GST rate string
    tds_rate: Optional[str] = "1% Sec 194O"           # Service TDS rate string
    entity_scope: Optional[str] = "PLATFORM"          # PLATFORM, SUPER_DISTRIBUTOR, DISTRIBUTOR, RETAILER
    entity_id: Optional[str] = None                   # public_id of SD / Distributor / Retailer
    entity_name: Optional[str] = None                 # human-readable name
    generated_by: Optional[str] = None                # name of the logged-in user
    generated_by_role: Optional[str] = None           # role of the user


class ComplianceReportResponse(BaseModel):
    public_id: uuid.UUID
    report_number: str
    report_type: str
    tax_period: str
    service_name: Optional[str] = "ALL_SERVICES"
    gst_rate: Optional[str] = "18%"
    tds_rate: Optional[str] = "1% Sec 194O"
    entity_scope: Optional[str] = "PLATFORM"
    entity_name: Optional[str] = None
    entity_id: Optional[str] = None
    generated_by: Optional[str] = None
    total_txns_count: int
    total_taxable_value: float
    total_gst_amount: float
    total_tds_amount: float
    status: str
    created_date: datetime


class ComplianceDashboardMetricsResponse(BaseModel):
    total_taxable_volume: float
    total_gst_collected: float
    total_tds_deducted: float
    generated_reports_count: int
    system_health_status: str
    component_latencies: Dict[str, int]


# Financial Configuration Engine DTOs
class MdrConfigDTO(BaseModel):
    percentage: float = 1.5
    fixed_charge: float = 0.0
    minimum_charge: float = 0.0
    maximum_charge: float = 500.0
    gst_applicable: bool = True
    priority: int = 5


class GstConfigDTO(BaseModel):
    gst_code: str = "GST18"
    cgst_pct: float = 9.0
    sgst_pct: float = 9.0
    igst_pct: float = 18.0
    cess_pct: float = 0.0
    hsn_code: str = "998599"


class TdsConfigDTO(BaseModel):
    tds_section: str = "194O"
    tds_percentage: float = 1.0
    threshold_amount: float = 500000.0
    pan_required: bool = True


class CommissionConfigDTO(BaseModel):
    hierarchy_level: str = "DISTRIBUTOR"
    rm_commission_pct: float = 2.0
    super_distributor_commission_pct: float = 5.0
    distributor_commission_pct: float = 10.0
    retailer_commission_pct: float = 83.0
    fixed_amount: float = 0.0


class SettlementConfigDTO(BaseModel):
    settlement_mode: str = "AUTO"
    settlement_cycle: str = "T_1"
    cut_off_time: str = "18:00"
    retry_count: int = 3
    holiday_handling: str = "NEXT_WORKING_DAY"
    auto_settlement_enabled: bool = True


class FinancialConfigCreateRequest(BaseModel):
    config_code: str = Field(..., min_length=3, max_length=100)
    config_type: str = "MDR"  # MDR, BANK_CHARGE, COMPANY_CHARGE, RETAILER_CHARGE, GST, TDS, COMMISSION, SETTLEMENT, WALLET, NUMBER_SERIES
    config_name: str = Field(..., min_length=3, max_length=150)
    hierarchy_level: str = "COMPANY"  # MACHINE, RETAILER, DISTRIBUTOR, SUPER_DISTRIBUTOR, REGIONAL_MANAGER, COMPANY, PLATFORM
    entity_target_id: Optional[uuid.UUID] = None
    priority: int = 5  # 1 to 7
    version: str = "1.0"
    remarks: Optional[str] = None
    mdr: Optional[MdrConfigDTO] = None
    gst: Optional[GstConfigDTO] = None
    tds: Optional[TdsConfigDTO] = None
    commission: Optional[CommissionConfigDTO] = None
    settlement: Optional[SettlementConfigDTO] = None


class FinancialConfigResponse(BaseModel):
    public_id: uuid.UUID
    config_code: str
    config_type: str
    config_name: str
    hierarchy_level: str
    priority: int
    version: str
    approval_status: str
    created_by: str
    created_date: datetime


class FinancialConfigDashboardMetricsResponse(BaseModel):
    total_configs_count: int
    pending_approvals_count: int
    overrides_count: int
    avg_mdr_percentage: float
    standard_gst_rate: float
    tds_section_code: str


# EPIC-007 Settlement File Intake & Validation DTOs
class SettlementFileUploadRequest(BaseModel):
    bank_name: str = "HDFC"
    settlement_date: date
    file_content_csv: str
    original_file_name: str = "hdfc_settlement_batch.csv"


class SettlementFileResponse(BaseModel):
    public_id: uuid.UUID
    file_number: str
    bank_name: str
    settlement_date: date
    original_file_name: str
    file_hash: str
    checksum: str
    file_size: int
    status: str
    uploaded_by: str
    created_date: datetime


class SettlementFileDetailResponse(BaseModel):
    public_id: uuid.UUID
    line_number: int
    txn_reference: str
    mid: str
    tid: str
    amount: float
    settlement_amount: float
    status: str
    validation_result: Optional[str] = None
    reject_reason: Optional[str] = None


class SettlementStagingResponse(BaseModel):
    public_id: uuid.UUID
    batch_number: str
    settlement_date: date
    machine_id: uuid.UUID
    retailer_id: uuid.UUID
    settlement_amount: float
    currency: str
    validation_status: str


class SettlementRejectResponse(BaseModel):
    public_id: uuid.UUID
    batch_number: str
    line_number: int
    reject_code: str
    reject_message: str
    original_data: str
    corrected_flag: bool


class SettlementRejectResolveRequest(BaseModel):
    corrected_tid: str
    corrected_mid: str
    remarks: Optional[str] = None


class SettlementIntakeDashboardMetricsResponse(BaseModel):
    total_files_uploaded: int
    files_processing_count: int
    files_failed_count: int
    files_completed_count: int
    total_records_count: int
    valid_staged_records_count: int
    rejected_records_count: int
    duplicate_records_count: int
    todays_upload_volume: float


# EPIC-008 Settlement Processing Engine DTOs
class SettlementBatchProcessRequest(BaseModel):
    batch_number: Optional[str] = None
    settlement_date: date


class SettlementTransactionResponse(BaseModel):
    public_id: uuid.UUID
    settlement_number: str
    batch_number: str
    machine_id: uuid.UUID
    retailer_id: uuid.UUID
    settlement_date: date
    gross_amount: float
    net_amount: float
    status: str
    reference_number: str
    created_date: datetime


class JournalEntryResponse(BaseModel):
    account_code: str
    debit: float
    credit: float
    cost_centre: str
    narration: str


class AccountingJournalResponse(BaseModel):
    public_id: uuid.UUID
    journal_number: str
    journal_date: date
    posting_status: str
    posting_reference: str
    source_module: str
    entries: List[JournalEntryResponse] = []


class SettlementProcessingDashboardMetricsResponse(BaseModel):
    pending_processing_count: int
    processing_count: int
    completed_settlements_count: int
    failed_settlements_count: int
    retried_count: int
    total_wallet_credits: float
    total_commission_amount: float
    total_gst_amount: float
    avg_processing_time_ms: int


# EPIC-009 Enterprise Wallet & Ledger Platform DTOs
class EnterpriseWalletCreateRequest(BaseModel):
    wallet_type: str = "RETAILER"
    owner_type: str = "RETAILER"
    owner_id: uuid.UUID
    initial_balance: float = 0.0


class EnterpriseWalletResponse(BaseModel):
    public_id: uuid.UUID
    wallet_number: str
    wallet_type: str
    owner_type: str
    owner_id: uuid.UUID
    status: str
    currency: str
    current_balance: float
    available_balance: float
    hold_balance: float
    created_date: datetime


class WalletFreezeRequest(BaseModel):
    action: str = "FREEZE"  # FREEZE, UNFREEZE
    reason: str = "Compliance risk hold"


class WalletAdjustmentCreateRequest(BaseModel):
    adjustment_type: str = "CREDIT"  # CREDIT, DEBIT, REVERSAL
    amount: float
    reason: str


class ChartOfAccountsResponse(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    nature: str
    posting_allowed: bool
    status: str


class ReconciliationBatchResponse(BaseModel):
    public_id: uuid.UUID
    reconciliation_number: str
    source_module: str
    target_module: str
    difference_amount: float
    status: str
    completed_by: str
    completed_date: datetime


class WalletLedgerDashboardMetricsResponse(BaseModel):
    total_wallets_count: int
    active_wallets_count: int
    frozen_wallets_count: int
    todays_total_credits: float
    todays_total_debits: float
    total_hold_balance: float
    reconciliation_discrepancies_count: int


# EPIC-010 Enterprise Payout Engine DTOs
class PayoutCreateRequest(BaseModel):
    wallet_id: uuid.UUID
    retailer_id: uuid.UUID
    amount: float
    purpose: str = "MERCHANT_SETTLEMENT_PAYOUT"
    priority: str = "NORMAL"  # NORMAL, URGENT


class PayoutResponse(BaseModel):
    public_id: uuid.UUID
    payout_number: str
    wallet_id: uuid.UUID
    retailer_id: uuid.UUID
    amount: float
    charges: float
    gst: float
    net_amount: float
    purpose: str
    priority: str
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    utr_number: Optional[str] = None
    created_date: datetime


class PayoutApprovalRequest(BaseModel):
    decision: str = "APPROVED"  # APPROVED, REJECTED
    comments: Optional[str] = None


class PayoutProcessRequest(BaseModel):
    gateway_code: str = "HDFC_IMPS"
    mode: str = "IMPS"  # IMPS, NEFT, RTGS, UPI


class BankGatewayResponse(BaseModel):
    gateway_code: str
    gateway_name: str
    api_endpoint: str
    auth_type: str
    status: str
    priority: int


class BeneficiaryBankAccountResponse(BaseModel):
    public_id: uuid.UUID
    retailer_id: uuid.UUID
    bank_name: str
    account_holder: str
    account_number: str
    ifsc_code: str
    upi_id: Optional[str] = None
    verification_status: str
    primary_flag: bool


class PayoutDashboardMetricsResponse(BaseModel):
    todays_total_payout_volume: float
    pending_approval_count: int
    queued_payouts_count: int
    successful_payouts_count: int
    failed_payouts_count: int
    reversed_payouts_count: int
    avg_bank_latency_ms: int


# EPIC-011 Enterprise Reporting, Analytics & MIS Platform DTOs
class ExecutiveMISMetricsResponse(BaseModel):
    total_settlement_volume: float
    todays_settlement_volume: float
    monthly_settlement_volume: float
    yearly_settlement_volume: float
    gross_mdr_revenue: float
    net_company_revenue: float
    total_gst_collected: float
    total_tds_deducted: float
    total_commission_paid: float
    payout_success_rate: float
    avg_processing_latency_sec: float
    growth_rate_percentage: float


class FinancialMISMetricsResponse(BaseModel):
    gross_volume: float
    bank_mdr_charge: float
    company_revenue: float
    retailer_commission: float
    gst_payable: float
    tds_payable: float
    net_merchant_payout: float


class ReportDefinitionResponse(BaseModel):
    public_id: uuid.UUID
    report_code: str
    report_name: str
    description: str
    category: str
    status: str


class ReportExecutionCreateRequest(BaseModel):
    report_id: uuid.UUID
    export_format: str = "EXCEL"  # EXCEL, CSV, PDF


class ReportExecutionResponse(BaseModel):
    public_id: uuid.UUID
    execution_number: str
    report_id: uuid.UUID
    execution_status: str
    record_count: int
    file_path: Optional[str] = None
    executed_by: str
    created_date: datetime


class ReportScheduleCreateRequest(BaseModel):
    report_id: uuid.UUID
    frequency: str = "DAILY"  # DAILY, WEEKLY, MONTHLY
    recipient_email: str
    format: str = "EXCEL"


class ReportScheduleResponse(BaseModel):
    public_id: uuid.UUID
    schedule_code: str
    report_id: uuid.UUID
    frequency: str
    recipient_email: str
    format: str
    status: str
    last_executed: Optional[datetime] = None


class DailySummaryResponse(BaseModel):
    summary_date: date
    total_transactions: int
    gross_amount: float
    mdr_revenue: float
    gst_collected: float
    tds_deducted: float
    net_wallet_credit: float
    outbound_payout_volume: float


# EPIC-012 Enterprise Platform Security, Operations & Production Readiness DTOs
class OperationsTelemetryMetricsResponse(BaseModel):
    cpu_utilization_pct: float
    memory_utilization_pct: float
    db_connection_pool_active: int
    db_connection_pool_size: int
    redis_cache_hit_rate_pct: float
    api_p99_latency_ms: int
    active_background_workers: int
    pending_dlq_count: int
    active_critical_alerts: int
    system_status: str


class FeatureFlagResponse(BaseModel):
    public_id: uuid.UUID
    flag_key: str
    description: str
    is_enabled: bool
    rollout_percentage: int


class BackgroundQueueResponse(BaseModel):
    public_id: uuid.UUID
    queue_name: str
    pending_jobs: int
    active_workers: int
    failed_jobs: int


class DeadLetterQueueResponse(BaseModel):
    public_id: uuid.UUID
    dlq_number: str
    payload_json: str
    error_message: str
    retry_count: int
    status: str
    created_date: datetime


class SystemAlertResponse(BaseModel):
    public_id: uuid.UUID
    alert_code: str
    severity: str
    component: str
    message: str
    status: str
    created_date: datetime


class MaintenanceStatusResponse(BaseModel):
    is_maintenance_mode: bool
    title: str
    allowed_ips: str


# EPIC-013 Enterprise CRM, Customer Service & Support Platform DTOs
class SupportTicketCreateRequest(BaseModel):
    retailer_id: uuid.UUID
    subject: str
    category: str = "SETTLEMENT_ISSUE"
    priority: str = "MEDIUM"


class SupportTicketAssignRequest(BaseModel):
    agent_email: str


class SupportTicketResolveRequest(BaseModel):
    resolution_notes: str


class SupportTicketResponse(BaseModel):
    public_id: uuid.UUID
    ticket_number: str
    retailer_id: uuid.UUID
    subject: str
    category: str
    priority: str
    status: str
    assigned_agent: Optional[str]
    sla_due_date: datetime
    created_date: datetime


class Retailer360ViewResponse(BaseModel):
    retailer_id: uuid.UUID
    merchant_name: str
    business_name: str
    mobile: str
    email: str
    kyc_status: str
    wallet_balance: float
    total_terminals: int
    relationship_status: str
    risk_score: int
    lifetime_volume: float
    open_tickets_count: int


class KnowledgeArticleResponse(BaseModel):
    public_id: uuid.UUID
    article_code: str
    title: str
    category: str
    content: str
    view_count: int


class AnnouncementResponse(BaseModel):
    public_id: uuid.UUID
    announcement_code: str
    title: str
    content: str
    audience: str
    created_date: datetime


class CrmDashboardMetricsResponse(BaseModel):
    total_retailers: int
    active_retailers: int
    open_tickets: int
    pending_tickets: int
    escalated_tickets: int
    sla_breached_tickets: int
    average_csat_rating: float
    total_field_visits: int


# EPIC-014 Enterprise Fraud, Risk & Compliance Platform DTOs
class FraudRuleCreateRequest(BaseModel):
    rule_name: str
    entity_type: str = "SETTLEMENT"
    category: str = "VELOCITY"
    threshold_value: float = 100000.0
    action: str = "HOLD"


class FraudRuleResponse(BaseModel):
    public_id: uuid.UUID
    rule_code: str
    rule_name: str
    entity_type: str
    category: str
    threshold_value: float
    action: str
    status: str


class FraudCaseDecisionRequest(BaseModel):
    decision_action: str = "FREEZE_WALLET"  # APPROVE, REJECT, FREEZE_WALLET, BLOCK_MACHINE
    findings_text: str


class FraudCaseResponse(BaseModel):
    public_id: uuid.UUID
    case_number: str
    subject: str
    status: str
    assigned_investigator: Optional[str]
    created_date: datetime


class BlacklistCreateRequest(BaseModel):
    item_type: str  # PAN, BANK_ACCOUNT, IP, UPI, MOBILE
    item_value: str
    reason: str


class BlacklistResponse(BaseModel):
    public_id: uuid.UUID
    entry_code: str
    item_type: str
    item_value: str
    reason: str
    status: str


class FraudScreeningRequest(BaseModel):
    entity_type: str
    entity_id: uuid.UUID
    amount: float
    ip_address: Optional[str] = "127.0.0.1"


class FraudScreeningResponse(BaseModel):
    risk_score: int
    risk_band: str
    recommendation: str
    triggered_rules: List[str]
    is_blocked: bool


class FraudDashboardMetricsResponse(BaseModel):
    today_alerts: int
    critical_alerts: int
    high_risk_retailers: int
    blocked_retailers: int
    blocked_machines: int
    high_risk_payouts: int
    cases_under_investigation: int
    resolved_cases: int


# EPIC-015 Enterprise Finance, Accounting & Reconciliation Platform DTOs
class AccountingPeriodResponse(BaseModel):
    public_id: uuid.UUID
    period_code: str
    period_name: str
    start_date: date
    end_date: date
    status: str


class TrialBalanceRow(BaseModel):
    account_code: str
    account_name: str
    debit_amount: float
    credit_amount: float


class TrialBalanceResponse(BaseModel):
    period_name: str
    rows: List[TrialBalanceRow]
    total_debits: float
    total_credits: float
    difference: float
    is_balanced: bool


class FinancialStatementResponse(BaseModel):
    statement_type: str
    period_name: str
    summary_data: str


class BankReconciliationMatchRequest(BaseModel):
    statement_line_id: uuid.UUID
    journal_entry_id: Optional[uuid.UUID] = None


class BankReconciliationMatchResponse(BaseModel):
    status: str
    message: str


class ManualJournalCreateRequest(BaseModel):
    debit_account_code: str
    credit_account_code: str
    amount: float
    narration: str


class ManualJournalResponse(BaseModel):
    journal_number: str
    debit_account: str
    credit_account: str
    amount: float
    status: str


class FinanceDashboardMetricsResponse(BaseModel):
    today_revenue: float
    today_expenses: float
    total_bank_balance: float
    wallet_liability: float
    outstanding_payouts: float
    gst_payable: float
    tds_payable: float
    trial_balance_status: str


# EPIC-016 Enterprise Operations, Workflow & BPM Platform DTOs
class WorkflowCreateRequest(BaseModel):
    workflow_name: str
    entity_type: str = "SETTLEMENT"


class WorkflowResponse(BaseModel):
    public_id: uuid.UUID
    workflow_code: str
    workflow_name: str
    entity_type: str
    status: str


class TaskResponse(BaseModel):
    public_id: uuid.UUID
    task_number: str
    title: str
    priority: str
    status: str
    assigned_to: Optional[str]
    created_date: datetime


class ApprovalActionRequest(BaseModel):
    action: str = "APPROVED"  # APPROVED, REJECTED
    comments: Optional[str] = "Checked and approved"


class ApprovalResponse(BaseModel):
    public_id: uuid.UUID
    request_code: str
    requested_by: str
    status: str
    required_level: int


class QueueResponse(BaseModel):
    public_id: uuid.UUID
    queue_code: str
    queue_name: str
    queue_type: str
    status: str


class BpmDashboardMetricsResponse(BaseModel):
    active_workflows: int
    pending_approvals: int
    open_tasks: int
    sla_warnings: int
    sla_breaches: int
    total_queue_items: int
    teams_count: int
    active_automation_rules: int


# EPIC-018 Enterprise Integration Platform (EIP), API Gateway & Partner Ecosystem DTOs
class PartnerCreateRequest(BaseModel):
    partner_name: str
    category: str = "BANK"  # BANK, GATEWAY, ERP, CRM


class PartnerResponse(BaseModel):
    public_id: uuid.UUID
    partner_code: str
    partner_name: str
    category: str
    status: str


class ConnectorResponse(BaseModel):
    public_id: uuid.UUID
    connector_code: str
    name: str
    connector_type: str
    status: str


class WebhookDeliveryResponse(BaseModel):
    public_id: uuid.UUID
    delivery_code: str
    event_code: str
    target_url: str
    http_status: int
    latency_ms: int
    status: str


class WebhookReplayResponse(BaseModel):
    status: str
    message: str


class EventDefinitionResponse(BaseModel):
    public_id: uuid.UUID
    event_code: str
    event_name: str
    topic: str


class DeveloperAppResponse(BaseModel):
    public_id: uuid.UUID
    app_code: str
    name: str
    api_key: str
    status: str


class EipDashboardMetricsResponse(BaseModel):
    requests_per_minute: int
    active_connectors: int
    webhook_success_rate: float
    registered_partners: int
    total_events_published: int
    developer_apps_count: int
    p99_latency_ms: int
    rate_limit_blocks_today: int


# EPIC-019 Enterprise AI, Decision Intelligence & Predictive Analytics Platform DTOs
class CopilotQueryRequest(BaseModel):
    prompt: str


class CopilotQueryResponse(BaseModel):
    response_text: str
    confidence_score: float
    intent_category: str
    suggested_actions: List[str]


class ForecastResponse(BaseModel):
    public_id: uuid.UUID
    target_topic: str
    forecast_date: date
    predicted_value: float
    lower_bound: float
    upper_bound: float


class RecommendationResponse(BaseModel):
    public_id: uuid.UUID
    rec_code: str
    category: str
    action_text: str
    confidence_score: float
    status: str


class RecommendationActionRequest(BaseModel):
    decision: str = "APPROVED"  # APPROVED, REJECTED
    notes: Optional[str] = "Decision applied"


class AnomalyResponse(BaseModel):
    public_id: uuid.UUID
    anomaly_code: str
    anomaly_type: str
    severity: str
    anomaly_score: float
    status: str


class ModelRegistryResponse(BaseModel):
    public_id: uuid.UUID
    model_code: str
    model_name: str
    category: str
    status: str


class FeatureStoreResponse(BaseModel):
    public_id: uuid.UUID
    store_code: str
    store_name: str
    entity_type: str
    status: str


class AiDashboardMetricsResponse(BaseModel):
    model_accuracy_pct: float
    daily_predictions_count: int
    active_forecast_models: int
    anomalies_detected_today: int
    open_recommendations_count: int
    copilot_queries_today: int
    feature_store_features_count: int
    avg_inference_latency_ms: int


# ============================================================
# EPIC-020: Enterprise Notification, Communication & Engagement
# ============================================================

class NotificationProviderCreateRequest(BaseModel):
    provider_code: str
    provider_name: str
    channel: str
    provider_type: str = "SMTP"
    priority: int = 1
    is_default: bool = False
    daily_limit: Optional[int] = None
    rate_limit_per_min: Optional[int] = None


class NotificationProviderResponse(BaseModel):
    public_id: uuid.UUID
    provider_code: str
    provider_name: str
    channel: str
    provider_type: str
    priority: int
    is_default: bool
    notif_health_status: str
    total_sent: int
    total_failed: int
    notif_provider_status: str


class NotificationTemplateCreateRequest(BaseModel):
    template_code: str
    template_name: str
    channel: str
    notification_type: str = "TRANSACTIONAL"
    language: str = "en"
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    is_rich_html: bool = False


class NotificationTemplateResponse(BaseModel):
    public_id: uuid.UUID
    template_code: str
    template_name: str
    channel: str
    notification_type: str
    language: str
    subject: Optional[str]
    approval_status: str
    template_status: str


class SendNotificationRequest(BaseModel):
    notification_type: str = "TRANSACTIONAL"
    channel: str
    recipient_id: Optional[uuid.UUID] = None
    recipient_type: Optional[str] = None
    recipient_address: str
    template_code: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None
    business_event: Optional[str] = None
    reference_id: Optional[uuid.UUID] = None
    reference_type: Optional[str] = None
    priority: str = "NORMAL"
    scheduled_at: Optional[datetime] = None
    idempotency_key: Optional[str] = None


class NotificationResponse(BaseModel):
    public_id: uuid.UUID
    notification_type: str
    channel: str
    recipient_address: str
    subject: Optional[str]
    business_event: Optional[str]
    priority: str
    notif_status: str
    retry_count: int
    created_date: datetime


class NotificationDeliveryResponse(BaseModel):
    public_id: uuid.UUID
    notification_id: uuid.UUID
    channel: str
    delivery_status: str
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    failure_reason: Optional[str]
    attempt_number: int


class OtpSendRequest(BaseModel):
    channel: str
    recipient_address: str
    otp_purpose: str
    reference_id: Optional[uuid.UUID] = None
    reference_type: Optional[str] = None
    otp_length: int = 6
    expiry_minutes: int = 10


class OtpVerifyRequest(BaseModel):
    otp_request_id: uuid.UUID
    otp_code: str
    ip_address: Optional[str] = None


class OtpSendResponse(BaseModel):
    public_id: uuid.UUID
    channel: str
    otp_purpose: str
    expires_at: datetime
    max_attempts: int
    otp_status: str


class OtpVerifyResponse(BaseModel):
    success: bool
    message: str
    is_verified: bool
    attempt_number: int


class CampaignCreateRequest(BaseModel):
    campaign_code: str
    campaign_name: str
    campaign_type: str = "BROADCAST"
    channel: str
    notification_type: str = "MARKETING"
    template_code: Optional[str] = None
    audience_definition: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None
    has_ab_test: bool = False
    open_tracking: bool = True
    click_tracking: bool = True


class CampaignApproveRequest(BaseModel):
    campaign_id: uuid.UUID
    notes: Optional[str] = None


class CampaignResponse(BaseModel):
    public_id: uuid.UUID
    campaign_code: str
    campaign_name: str
    campaign_type: str
    channel: str
    notification_type: str
    audience_count: int
    approval_status: str
    campaign_status: str
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class CampaignExecutionResponse(BaseModel):
    public_id: uuid.UUID
    campaign_id: uuid.UUID
    execution_number: int
    total_sent: int
    total_delivered: int
    total_failed: int
    total_opened: int
    total_clicked: int
    delivery_rate_pct: float
    open_rate_pct: float
    click_rate_pct: float
    execution_status: str


class UserPreferenceUpdateRequest(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    marketing_consent: Optional[bool] = None
    do_not_disturb: Optional[bool] = None
    dnd_start_time: Optional[str] = None
    dnd_end_time: Optional[str] = None
    language_preference: Optional[str] = None
    timezone: Optional[str] = None
    frequency_daily_limit: Optional[int] = None


class UserPreferenceResponse(BaseModel):
    public_id: uuid.UUID
    user_id: uuid.UUID
    email_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    marketing_consent: bool
    do_not_disturb: bool
    language_preference: str
    timezone: str


class CommunicationTimelineResponse(BaseModel):
    public_id: uuid.UUID
    entity_id: uuid.UUID
    entity_type: str
    channel: str
    notification_type: str
    subject: Optional[str]
    body_preview: Optional[str]
    business_event: Optional[str]
    timeline_delivery_status: str
    sent_at: Optional[datetime]
    created_date: datetime


class NotificationEventResponse(BaseModel):
    public_id: uuid.UUID
    event_code: str
    event_name: str
    event_category: str
    notification_type: str
    is_mandatory: bool
    event_status: str


class NotificationBatchResponse(BaseModel):
    public_id: uuid.UUID
    batch_code: str
    batch_name: str
    channel: str
    total_count: int
    sent_count: int
    delivered_count: int
    failed_count: int
    batch_status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class NotificationAnalyticsResponse(BaseModel):
    channel: str
    notification_type: str
    total_sent: int
    total_delivered: int
    total_failed: int
    total_read: int
    delivery_rate_pct: float
    open_rate_pct: float
    click_rate_pct: float
    bounce_rate_pct: float
    failure_rate_pct: float


class NotificationDashboardMetricsResponse(BaseModel):
    total_notifications_today: int
    total_delivered_today: int
    total_failed_today: int
    delivery_rate_pct: float
    active_campaigns: int
    otp_requests_today: int
    otp_success_rate_pct: float
    active_providers: int
    queued_notifications: int
    channel_breakdown: Dict[str, int]


# Payout Slab DTOs (EPIC-027)
class PayoutSlabCreateRequest(BaseModel):
    service_code: str = Field(default="PAYOUT", min_length=1, max_length=50)
    slab_name: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = None
    min_amount: float = Field(..., ge=0.0, description="Minimum Transaction Amount in Slab")
    max_amount: float = Field(..., ge=0.0, description="Maximum Transaction Amount in Slab")

    commission: float = Field(default=0.0, ge=0.0)
    commission_type: str = Field(default="FIXED", pattern="^(FIXED|PERCENTAGE)$")

    gst: float = Field(default=0.0, ge=0.0)
    gst_type: str = Field(default="PERCENTAGE", pattern="^(FIXED|PERCENTAGE)$")

    vendor_charge: float = Field(default=0.0, ge=0.0)
    vendor_charge_type: str = Field(default="FIXED", pattern="^(FIXED|PERCENTAGE)$")

    company_charges: float = Field(default=0.0, ge=0.0)
    company_charges_type: str = Field(default="FIXED", pattern="^(FIXED|PERCENTAGE)$")

    company_gst: float = Field(default=0.0, ge=0.0)
    company_gst_type: str = Field(default="PERCENTAGE", pattern="^(FIXED|PERCENTAGE)$")

    tds: float = Field(default=0.0, ge=0.0)
    tds_type: str = Field(default="PERCENTAGE", pattern="^(FIXED|PERCENTAGE)$")

    other_charges: float = Field(default=0.0, ge=0.0)
    other_charges_type: str = Field(default="FIXED", pattern="^(FIXED|PERCENTAGE)$")

    currency: str = Field(default="INR", max_length=10)
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    is_active: bool = True
    notes: Optional[str] = None


class PayoutSlabUpdateRequest(BaseModel):
    slab_name: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = None
    min_amount: Optional[float] = Field(default=None, ge=0.0)
    max_amount: Optional[float] = Field(default=None, ge=0.0)

    commission: Optional[float] = Field(default=None, ge=0.0)
    commission_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    gst: Optional[float] = Field(default=None, ge=0.0)
    gst_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    vendor_charge: Optional[float] = Field(default=None, ge=0.0)
    vendor_charge_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    company_charges: Optional[float] = Field(default=None, ge=0.0)
    company_charges_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    company_gst: Optional[float] = Field(default=None, ge=0.0)
    company_gst_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    tds: Optional[float] = Field(default=None, ge=0.0)
    tds_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    other_charges: Optional[float] = Field(default=None, ge=0.0)
    other_charges_type: Optional[str] = Field(default=None, pattern="^(FIXED|PERCENTAGE)$")

    currency: Optional[str] = Field(default=None, max_length=10)
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    reason: Optional[str] = Field(default="Configuration update", description="Audit change reason")


class PayoutSlabStatusChangeRequest(BaseModel):
    reason: Optional[str] = Field(default="Administrative status change", description="Reason for activation/deactivation")


class PayoutSlabAuditResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    payout_slab_id: uuid.UUID
    action: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    changed_by: Optional[str] = None
    changed_at: datetime
    reason: Optional[str] = None


class PayoutSlabResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    service_code: str
    slab_name: Optional[str] = None
    description: Optional[str] = None

    min_amount: float
    max_amount: float

    commission: float
    commission_type: str

    gst: float
    gst_type: str

    vendor_charge: float
    vendor_charge_type: str

    company_charges: float
    company_charges_type: str

    company_gst: float
    company_gst_type: str

    tds: float
    tds_type: str

    other_charges: float
    other_charges_type: str

    currency: str
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None

    is_active: bool
    is_deleted: bool
    version_no: int
    notes: Optional[str] = None

    created_date: datetime
    created_by: Optional[str] = None
    updated_date: datetime
    updated_by: Optional[str] = None

    audit_logs: Optional[List[PayoutSlabAuditResponse]] = None


class PayoutSlabListResponse(BaseModel):
    items: List[PayoutSlabResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    active_count: int
    inactive_count: int





















