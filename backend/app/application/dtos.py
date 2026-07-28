import uuid
from datetime import datetime
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
    email_or_username: str = Field(..., example="admin@pay2pay.com")
    password: str = Field(..., min_length=6)
    mfa_code: Optional[str] = Field(default=None, example="123456")


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
    version: int = Field(..., description="Optimistic locking version")


class TenantResponse(BaseModel):
    public_id: uuid.UUID
    name: str
    code: str
    status: str
    description: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime


# Company DTOs
class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    tax_id: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    tax_id: Optional[str] = None
    status: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    version: int = Field(..., description="Optimistic locking version")


class CompanyResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    code: str
    tax_id: Optional[str] = None
    status: str
    email: Optional[str] = None
    phone: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime


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
    version: int = Field(..., description="Optimistic locking version")


class UserRoleAssignRequest(BaseModel):
    role_ids: List[uuid.UUID]


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
    version: int
    created_at: datetime


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
    version: int = Field(..., description="Optimistic locking version")


class RoleResponse(BaseModel):
    public_id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None
    is_system: bool
    version: int
    permissions: List[PermissionResponse] = []
    created_at: datetime


class PermissionMatrixItem(BaseModel):
    permission_id: uuid.UUID
    code: str
    module: str
    action: str
    name: str


class RolePermissionMatrixResponse(BaseModel):
    roles: List[RoleResponse]
    permissions: List[PermissionResponse]
    matrix: Dict[str, List[str]]  # role_code -> list of permission codes


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
    expires_in_days: Optional[int] = 30


class ApiKeyResponse(BaseModel):
    public_id: uuid.UUID
    name: str
    key_prefix: str
    scopes: List[str]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    secret_key: Optional[str] = None  # Returned only on creation


# System Configuration DTOs
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
    version: int


# Admin Dashboard DTOs (10 Real-time Widgets)
class WidgetMetric(BaseModel):
    title: str
    value: str
    change: str
    trend: str  # "up", "down", "neutral"
    format: str = "number"  # "currency", "number", "percentage"


class RecentActivityItem(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    action: str
    target: str
    status: str


class DashboardWidgetsResponse(BaseModel):
    total_companies: WidgetMetric
    active_retailers: WidgetMetric
    total_machines: WidgetMetric
    todays_settlement: WidgetMetric
    wallet_liability: WidgetMetric
    pending_payouts: WidgetMetric
    todays_profit: WidgetMetric
    failed_settlement: WidgetMetric
    pending_approvals: WidgetMetric
    recent_activities: List[RecentActivityItem]
