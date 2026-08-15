import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


class TenantModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tenant"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    companies: Mapped[List["CompanyModel"]] = relationship("CompanyModel", back_populates="tenant")


class EntityModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "entity"

    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    attributes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class CompanyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company"

    # Core Identifiers & Names
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant.public_id", ondelete="CASCADE"), nullable=False, index=True)
    company_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    short_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tenant_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    company_type: Mapped[str] = mapped_column(String(50), default="PRIVATE_LIMITED", nullable=False)  # PRIVATE_LIMITED, PUBLIC_LIMITED, PROPRIETORSHIP, PARTNERSHIP, LL
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    business_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Registration & Tax Details
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    cin_number: Mapped[Optional[str]] = mapped_column(String(21), nullable=True, index=True)
    msme_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    fssai_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    business_registration_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)

    # Status & Workflow
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False, index=True)  # DRAFT, PENDING_APPROVAL, APPROVED, ACTIVE, SUSPENDED, BLOCKED, EXPIRED, CLOSED, ARCHIVED

    tenant: Mapped["TenantModel"] = relationship("TenantModel", back_populates="companies")
    contacts: Mapped[List["CompanyContactModel"]] = relationship("CompanyContactModel", back_populates="company", cascade="all, delete-orphan")
    addresses: Mapped[List["CompanyAddressModel"]] = relationship("CompanyAddressModel", back_populates="company", cascade="all, delete-orphan")
    banks: Mapped[List["CompanyBankModel"]] = relationship("CompanyBankModel", back_populates="company", cascade="all, delete-orphan")
    documents: Mapped[List["CompanyDocumentModel"]] = relationship("CompanyDocumentModel", back_populates="company", cascade="all, delete-orphan")
    branding: Mapped[Optional["CompanyBrandingModel"]] = relationship("CompanyBrandingModel", back_populates="company", uselist=False, cascade="all, delete-orphan")
    settings: Mapped[Optional["CompanySettingModel"]] = relationship("CompanySettingModel", back_populates="company", uselist=False, cascade="all, delete-orphan")
    subscription: Mapped[Optional["CompanySubscriptionModel"]] = relationship("CompanySubscriptionModel", back_populates="company", uselist=False, cascade="all, delete-orphan")
    status_history: Mapped[List["CompanyStatusHistoryModel"]] = relationship("CompanyStatusHistoryModel", back_populates="company", cascade="all, delete-orphan")
    approvals: Mapped[List["CompanyApprovalModel"]] = relationship("CompanyApprovalModel", back_populates="company", cascade="all, delete-orphan")
    configurations: Mapped[List["CompanyConfigurationModel"]] = relationship("CompanyConfigurationModel", back_populates="company", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "company_code", name="uq_company_tenant_code"),
    )


class CompanyContactModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_contact"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    primary_contact: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    alternate_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    support_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    support_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="contacts")


class CompanyAddressModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_address"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    address_type: Mapped[str] = mapped_column(String(50), default="REGISTERED", nullable=False)  # REGISTERED, OPERATIONAL, BILLING, SHIPPING
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="addresses")


class CompanyBankModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_bank"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_bank_name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_holder: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc: Mapped[str] = mapped_column(String(11), nullable=False)
    branch: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    cancelled_cheque_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="banks")


class CompanyDocumentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_document"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # GST_CERTIFICATE, PAN_CARD, COI, CANCELLED_CHEQUE, ADDRESS_PROOF, OTHER
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="documents")


class CompanyBrandingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_branding"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    favicon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_colour: Mapped[str] = mapped_column(String(20), default="#3b82f6", nullable=False)
    secondary_colour: Mapped[str] = mapped_column(String(20), default="#1e293b", nullable=False)
    email_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sms_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    invoice_header: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_footer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="branding")


class CompanySettingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_setting"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    date_format: Mapped[str] = mapped_column(String(20), default="DD/MM/YYYY", nullable=False)
    number_format: Mapped[str] = mapped_column(String(20), default="en-IN", nullable=False)
    financial_year_start: Mapped[str] = mapped_column(String(10), default="04-01", nullable=False)
    gst_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tds_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_settlement: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_payout: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approval_workflow: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    session_timeout_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    otp_expiry_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="settings")


class CompanySubscriptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_subscription"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    plan_name: Mapped[str] = mapped_column(String(50), default="ENTERPRISE_TRIAL", nullable=False)  # TRIAL, STARTER, PRO, ENTERPRISE
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    maximum_retailers: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    maximum_machines: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    maximum_admin_users: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    storage_limit_gb: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    api_limit_per_minute: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="subscription")


class CompanyStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_status_history"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_email: Mapped[str] = mapped_column(String(255), nullable=False)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="status_history")


class CompanyApprovalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_approval"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    request_type: Mapped[str] = mapped_column(String(50), default="ONBOARDING", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="approvals")


class CompanyConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_configuration"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company.public_id", ondelete="CASCADE"), nullable=False, index=True)
    config_key: Mapped[str] = mapped_column(String(100), nullable=False)
    config_value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="DEFAULT", nullable=False)

    company: Mapped["CompanyModel"] = relationship("CompanyModel", back_populates="configurations")


class UserTypeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "user_type"

    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_user_type_tenant_code"),)


class AdminUserModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "admin_user"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_type: Mapped[Optional[str]] = mapped_column(String(50), default="PLATFORM_ADMIN", nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user_roles: Mapped[List["UserRoleModel"]] = relationship("UserRoleModel", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["UserSessionModel"]] = relationship("UserSessionModel", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_admin_user_tenant_email"),
        UniqueConstraint("tenant_id", "username", name="uq_admin_user_tenant_username"),
    )


class RoleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "role"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    role_permissions: Mapped[List["RolePermissionModel"]] = relationship("RolePermissionModel", back_populates="role", cascade="all, delete-orphan")
    user_roles: Mapped[List["UserRoleModel"]] = relationship("UserRoleModel", back_populates="role", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_role_tenant_code"),)


class PermissionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "permission"

    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    role_permissions: Mapped[List["RolePermissionModel"]] = relationship("RolePermissionModel", back_populates="permission", cascade="all, delete-orphan")


class RolePermissionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "role_permission"

    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("role.id", ondelete="CASCADE"), nullable=False)
    permission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("permission.id", ondelete="CASCADE"), nullable=False)

    role: Mapped["RoleModel"] = relationship("RoleModel", back_populates="role_permissions")
    permission: Mapped["PermissionModel"] = relationship("PermissionModel", back_populates="role_permissions")

    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)


class UserRoleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "user_role"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("role.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["AdminUserModel"] = relationship("AdminUserModel", back_populates="user_roles")
    role: Mapped["RoleModel"] = relationship("RoleModel", back_populates="user_roles")

    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)


class AuditLogModel(BaseEntity):
    __tablename__ = "audit_log"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    actor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)


class SystemConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "system_configuration"

    key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (UniqueConstraint("tenant_id", "key", name="uq_system_config_tenant_key"),)


class UserSessionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "user_session"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    token_jti: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["AdminUserModel"] = relationship("AdminUserModel", back_populates="sessions")


class ApiKeyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_key"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False)
    scopes: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordResetTokenModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "password_reset_token"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


# EPIC-003 — Organization & Hierarchy Management Models
class RegionalManagerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "regional_manager"

    employee_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    designation: Mapped[str] = mapped_column(String(100), default="Regional Manager", nullable=False)
    joining_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    reporting_manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, SUSPENDED, INACTIVE
    kyc_status: Mapped[str] = mapped_column(String(30), default="VERIFIED", nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_code", name="uq_rm_tenant_employee_code"),
        UniqueConstraint("tenant_id", "email", name="uq_rm_tenant_email"),
        UniqueConstraint("tenant_id", "mobile", name="uq_rm_tenant_mobile"),
    )


class SuperDistributorModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "super_distributor"

    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ifsc: Mapped[Optional[str]] = mapped_column(String(11), nullable=True)
    wallet_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit_limit: Mapped[float] = mapped_column(Float, default=500000.0, nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Text] = mapped_column(Text, nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)
    mapped_rm_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("regional_manager.public_id", ondelete="SET NULL"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_sd_tenant_email"),
        UniqueConstraint("tenant_id", "mobile", name="uq_sd_tenant_mobile"),
    )


class DistributorModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "distributor"

    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ifsc: Mapped[Optional[str]] = mapped_column(String(11), nullable=True)
    wallet_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit_limit: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Text] = mapped_column(Text, nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)
    mapped_super_distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("super_distributor.public_id", ondelete="SET NULL"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_distributor_tenant_email"),
        UniqueConstraint("tenant_id", "mobile", name="uq_distributor_tenant_mobile"),
    )


class OrganizationHierarchyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "organization_hierarchy"

    parent_entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # COMPANY, REGIONAL_MANAGER, SUPER_DISTRIBUTOR
    parent_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    child_entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)   # REGIONAL_MANAGER, SUPER_DISTRIBUTOR, DISTRIBUTOR
    child_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approved_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class OrganizationTransferModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "organization_transfer"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    old_parent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    old_parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    new_parent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    new_parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    transfer_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_APPROVAL", nullable=False, index=True)  # PENDING_APPROVAL, APPROVED, REJECTED
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approved_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class OrganizationHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "organization_history"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    snapshot_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    performed_by: Mapped[str] = mapped_column(String(255), nullable=False)


class OrganizationAttachmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "organization_attachment"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)


class OrganizationNoteModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "organization_note"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    author_email: Mapped[str] = mapped_column(String(255), nullable=False)


# EPIC-004 — Retailer Management Models
class RetailerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer"

    retailer_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_category: Mapped[str] = mapped_column(String(100), default="General Store", nullable=False)
    store_type: Mapped[str] = mapped_column(String(50), default="BRICK_AND_MORTAR", nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_APPROVAL", nullable=False, index=True)  # DRAFT, PENDING_KYC, PENDING_APPROVAL, ACTIVE, SUSPENDED, BLOCKED, CLOSED
    mapped_distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("distributor.public_id", ondelete="SET NULL"), nullable=True, index=True)

    contacts: Mapped[List["RetailerContactModel"]] = relationship("RetailerContactModel", back_populates="retailer", cascade="all, delete-orphan")
    addresses: Mapped[List["RetailerAddressModel"]] = relationship("RetailerAddressModel", back_populates="retailer", cascade="all, delete-orphan")
    banks: Mapped[List["RetailerBankModel"]] = relationship("RetailerBankModel", back_populates="retailer", cascade="all, delete-orphan")
    kyc: Mapped[Optional["RetailerKycModel"]] = relationship("RetailerKycModel", back_populates="retailer", uselist=False, cascade="all, delete-orphan")
    wallet: Mapped[Optional["RetailerWalletModel"]] = relationship("RetailerWalletModel", back_populates="retailer", uselist=False, cascade="all, delete-orphan")
    status_history: Mapped[List["RetailerStatusHistoryModel"]] = relationship("RetailerStatusHistoryModel", back_populates="retailer", cascade="all, delete-orphan")
    approvals: Mapped[List["RetailerApprovalModel"]] = relationship("RetailerApprovalModel", back_populates="retailer", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "retailer_code", name="uq_retailer_tenant_code"),
    )


class RetailerContactModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_contact"
    __table_args__ = (
        UniqueConstraint("tenant_id", "company_id", "mobile", name="uq_retailer_contact_tenant_company_mobile"),
        UniqueConstraint("tenant_id", "company_id", "email", name="uq_retailer_contact_tenant_company_email"),
        {"extend_existing": True}
    )

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    primary_contact: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[Optional[str]] = mapped_column(String(100), default="Owner", nullable=True)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    alternate_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    support_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="contacts")


class RetailerAddressModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_address"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    address_type: Mapped[str] = mapped_column(String(50), default="STORE", nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Text] = mapped_column(Text, nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="addresses")


class RetailerBankModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_bank"
    __table_args__ = (
        UniqueConstraint("tenant_id", "company_id", "account_number", name="uq_retailer_bank_tenant_company_account"),
        UniqueConstraint("tenant_id", "company_id", "upi_id", name="uq_retailer_bank_tenant_company_upi"),
        {"extend_existing": True}
    )

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_bank_name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_holder: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    upi_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    ifsc: Mapped[str] = mapped_column(String(11), nullable=False)
    branch: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="banks")


class RetailerKycModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_kyc"
    __table_args__ = (
        UniqueConstraint("tenant_id", "company_id", "pan_number", name="uq_retailer_kyc_tenant_company_pan"),
        UniqueConstraint("tenant_id", "company_id", "gst_number", name="uq_retailer_kyc_tenant_company_gst"),
        UniqueConstraint("tenant_id", "company_id", "aadhaar_number", name="uq_retailer_kyc_tenant_company_aadhaar"),
        {"extend_existing": True}
    )

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    aadhaar_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    aadhaar_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    business_proof_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    aadhaar_front_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    aadhaar_back_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="kyc")


class RetailerDuplicateAuditLogModel(BaseEntity, EnterpriseBaseMixin):
    """Audit log for duplicate validation hits and attempts."""
    __tablename__ = "retailer_duplicate_audit_log"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    field_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    masked_value: Mapped[str] = mapped_column(String(255), nullable=False)
    attempt_type: Mapped[str] = mapped_column(String(50), nullable=False, default="CREATE")  # CREATE, UPDATE, REALTIME_CHECK
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)



class RetailerWalletModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_wallet"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    wallet_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    daily_transaction_limit: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    single_transaction_limit: Mapped[float] = mapped_column(Float, default=25000.0, nullable=False)
    is_frozen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    freeze_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="wallet")


class RetailerStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_status_history"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_email: Mapped[str] = mapped_column(String(255), nullable=False)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="status_history")


class RetailerApprovalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_approval"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    request_type: Mapped[str] = mapped_column(String(50), default="ONBOARDING", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="approvals")


# EPIC-005 — Swipe Machine (POS/EDC Terminal) Management Models
class SwipeMachineModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "swipe_machine"

    serial_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tid: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # Terminal ID
    mid: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # Merchant ID
    pos_model: Mapped[str] = mapped_column(String(100), default="Pax A920", nullable=False)
    machine_type: Mapped[str] = mapped_column(String(50), default="ANDROID_POS", nullable=False)
    os_version: Mapped[Optional[str]] = mapped_column(String(50), default="Android 11", nullable=True)
    firmware_version: Mapped[Optional[str]] = mapped_column(String(50), default="v2.4.1", nullable=True)
    sim_iccid: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    telecom_provider: Mapped[Optional[str]] = mapped_column(String(50), default="Airtel M2M", nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # INVENTORY, ALLOCATED, ACTIVE, SUSPENDED, FAULTY, REPLACED, DECOMMISSIONED
    mapped_retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="SET NULL"), nullable=True, index=True)

    telemetry: Mapped[Optional["MachineTelemetryModel"]] = relationship("MachineTelemetryModel", back_populates="machine", uselist=False, cascade="all, delete-orphan")
    key_profile: Mapped[Optional["MachineKeyProfileModel"]] = relationship("MachineKeyProfileModel", back_populates="machine", uselist=False, cascade="all, delete-orphan")
    maintenances: Mapped[List["MachineMaintenanceModel"]] = relationship("MachineMaintenanceModel", back_populates="machine", cascade="all, delete-orphan")
    status_history: Mapped[List["MachineStatusHistoryModel"]] = relationship("MachineStatusHistoryModel", back_populates="machine", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "serial_number", name="uq_machine_tenant_serial"),
        UniqueConstraint("tenant_id", "tid", name="uq_machine_tenant_tid"),
    )


class MachineInventoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_inventory"

    batch_stock_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    manufacturer: Mapped[str] = mapped_column(String(100), nullable=False)
    model_code: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity_received: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    received_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    warranty_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    warehouse_location: Mapped[str] = mapped_column(String(150), default="Central Warehouse", nullable=False)


class MachineAssignmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_assignment"

    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_type: Mapped[str] = mapped_column(String(50), nullable=False)  # DISTRIBUTOR or RETAILER
    assigned_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    unassigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class MachineTelemetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_telemetry"

    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    battery_percentage: Mapped[int] = mapped_column(Integer, default=95, nullable=False)
    network_type: Mapped[str] = mapped_column(String(20), default="4G", nullable=False)
    signal_strength: Mapped[int] = mapped_column(Integer, default=-75, nullable=False)
    app_version: Mapped[str] = mapped_column(String(50), default="v1.8.0", nullable=False)
    last_ping_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    total_txns_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_volume_processed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    machine: Mapped["SwipeMachineModel"] = relationship("SwipeMachineModel", back_populates="telemetry")


class MachineKeyProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_key_profile"

    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    dukpt_ksn: Mapped[str] = mapped_column(String(100), nullable=False)
    master_key_alias: Mapped[str] = mapped_column(String(100), default="MK_STAGE_01", nullable=False)
    encryption_standard: Mapped[str] = mapped_column(String(50), default="AES-256", nullable=False)
    injected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    machine: Mapped["SwipeMachineModel"] = relationship("SwipeMachineModel", back_populates="key_profile")


class MachineMaintenanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_maintenance"

    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, index=True)
    maintenance_type: Mapped[str] = mapped_column(String(50), nullable=False)  # REPAIR, SIM_SWAP, FIRMWARE_UPDATE, KEY_RESET
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    technician_email: Mapped[str] = mapped_column(String(255), nullable=False)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    machine: Mapped["SwipeMachineModel"] = relationship("SwipeMachineModel", back_populates="maintenances")


class MachineStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_status_history"

    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_email: Mapped[str] = mapped_column(String(255), nullable=False)

    machine: Mapped["SwipeMachineModel"] = relationship("SwipeMachineModel", back_populates="status_history")


class MachineReplacementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "machine_replacement"

    old_machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    old_serial_number: Mapped[str] = mapped_column(String(100), nullable=False)
    new_machine_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    requested_by_email: Mapped[str] = mapped_column(String(255), nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


# EPIC-006 — Settlement Engine, MDR Split & Payout Models
class TransactionRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "transaction_record"

    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    rrn: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # Retrieval Reference Number
    auth_code: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(50), default="VISA_CREDIT", nullable=False)  # VISA_CREDIT, VISA_DEBIT, MASTERCARD_CREDIT, RUPAY_DEBIT, UPI
    card_number_masked: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False, index=True)  # SUCCESS, FAILED, PENDING
    settlement_status: Mapped[str] = mapped_column(String(30), default="UNSETTLED", nullable=False, index=True)  # UNSETTLED, IN_BATCH, SETTLED
    mapped_tid: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    mapped_retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)

    fee_split: Mapped[Optional["TransactionFeeSplitModel"]] = relationship("TransactionFeeSplitModel", back_populates="transaction", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "transaction_id", name="uq_txn_tenant_txnid"),
        UniqueConstraint("tenant_id", "rrn", name="uq_txn_tenant_rrn"),
    )


class MdrFeePlanModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "mdr_fee_plan"

    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    mdr_percentage: Mapped[float] = mapped_column(Float, default=1.5, nullable=False)  # e.g. 1.5%
    fixed_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_percentage: Mapped[float] = mapped_column(Float, default=18.0, nullable=False)  # 18% GST on MDR
    distributor_share_pct: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)  # 10% of MDR to Distributor
    sd_share_pct: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)  # 5% of MDR to Super Distributor


class TransactionFeeSplitModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "transaction_fee_split"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_record.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    mdr_fee: Mapped[float] = mapped_column(Float, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False)
    total_deduction: Mapped[float] = mapped_column(Float, nullable=False)
    net_retailer_payout: Mapped[float] = mapped_column(Float, nullable=False)
    platform_retention: Mapped[float] = mapped_column(Float, nullable=False)
    distributor_commission: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sd_commission: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rm_commission: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    transaction: Mapped["TransactionRecordModel"] = relationship("TransactionRecordModel", back_populates="fee_split")


class SettlementBatchModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_batch"

    batch_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    batch_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    gross_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_mdr: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_gst: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_payout_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    transaction_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SETTLED", nullable=False, index=True)  # OPEN, PROCESSING, SETTLED, FAILED
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=True)

    items: Mapped[List["SettlementItemModel"]] = relationship("SettlementItemModel", back_populates="batch", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "batch_number", name="uq_batch_tenant_number"),
    )


class SettlementItemModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_item"

    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_batch.public_id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_record.public_id", ondelete="CASCADE"), nullable=False, index=True)
    net_amount: Mapped[float] = mapped_column(Float, nullable=False)

    batch: Mapped["SettlementBatchModel"] = relationship("SettlementBatchModel", back_populates="items")


class PayoutInstructionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_instruction"

    payout_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    bank_account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc: Mapped[str] = mapped_column(String(11), nullable=False)
    payout_method: Mapped[str] = mapped_column(String(30), default="IMPS", nullable=False)  # IMPS, NEFT, WALLET_FLOAT
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    utr_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False, index=True)  # PENDING, PROCESSING, SUCCESS, FAILED
    dispatched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "payout_reference", name="uq_payout_tenant_reference"),
    )


class WalletLedgerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_ledger"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SWIPE_CREDIT, BANK_PAYOUT, ADJUSTMENT
    credit_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    debit_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    balance_before: Mapped[float] = mapped_column(Float, nullable=False)
    balance_after: Mapped[float] = mapped_column(Float, nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)


class ReconciliationReportModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "reconciliation_report"

    report_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False, index=True)
    gateway_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    settled_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discrepancy_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="MATCHED", nullable=False)  # MATCHED, DISCREPANCY


# EPIC-007 — Developer API Gateway, Webhooks & Fraud Control Models
class DeveloperApiKeyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "developer_api_key"

    key_name: Mapped[str] = mapped_column(String(100), nullable=False)
    client_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    hashed_secret: Mapped[str] = mapped_column(String(255), nullable=False)
    scopes: Mapped[str] = mapped_column(String(255), default="transactions.read,settlements.write", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class WebhookSubscriptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "webhook_subscription"

    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret_key: Mapped[str] = mapped_column(String(100), nullable=False)
    events: Mapped[str] = mapped_column(String(255), default="transaction.created,settlement.completed", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    logs: Mapped[List["WebhookEventLogModel"]] = relationship("WebhookEventLogModel", back_populates="subscription", cascade="all, delete-orphan")


class WebhookEventLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "webhook_event_log"

    subscription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("webhook_subscription.public_id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    response_code: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="DELIVERED", nullable=False, index=True)  # DELIVERED, FAILED

    subscription: Mapped["WebhookSubscriptionModel"] = relationship("WebhookSubscriptionModel", back_populates="logs")


class RiskRuleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_rule"

    rule_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rule_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    threshold_amount: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    action: Mapped[str] = mapped_column(String(50), default="FLAG_FRAUD", nullable=False)  # FLAG_FRAUD, REJECT, HOLD
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ChargebackCaseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "chargeback_case"

    case_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    dispute_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(100), default="UNAUTHORIZED_TRANSACTION", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False, index=True)  # OPEN, UNDER_REVIEW, WON, LOST
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    evidences: Mapped[List["ChargebackEvidenceModel"]] = relationship("ChargebackEvidenceModel", back_populates="chargeback", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "case_reference", name="uq_cb_tenant_ref"),
    )


class ChargebackEvidenceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "chargeback_evidence"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chargeback_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(50), default="PROOF_OF_DELIVERY", nullable=False)
    document_url: Mapped[str] = mapped_column(String(500), nullable=False)
    notes: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    chargeback: Mapped["ChargebackCaseModel"] = relationship("ChargebackCaseModel", back_populates="evidences")


class DisputeStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dispute_status_history"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chargeback_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_email: Mapped[str] = mapped_column(String(255), nullable=False)


# EPIC-008 — Configuration, Audit & Compliance Reporting Models
class TenantConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tenant_configuration"

    config_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    config_value: Mapped[str] = mapped_column(Text, nullable=False)
    data_type: Mapped[str] = mapped_column(String(30), default="STRING", nullable=False)
    description: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "config_key", name="uq_tenant_config_key"),
    )


class AuditExportJobModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "audit_export_job"

    export_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    filter_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    format: Mapped[str] = mapped_column(String(20), default="CSV", nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False, index=True)


class ComplianceReportModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "compliance_report"

    report_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(50), default="GSTR_1_SUMMARY", nullable=False, index=True)  # GSTR_1_SUMMARY, GSTR_3B_SUMMARY, TDS_194O_STATEMENT, SETTLEMENT_AUDIT
    tax_period: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # YYYY-MM
    service_name: Mapped[Optional[str]] = mapped_column(String(100), default="ALL_SERVICES", nullable=True)     # POS Swipe, UPI, DMT, AEPS, BBPS, All Services
    gst_rate: Mapped[Optional[str]] = mapped_column(String(50), default="18%", nullable=True)                     # Service-wise GST Rate (e.g. 18% CGST/SGST, 0% Exempt)
    tds_rate: Mapped[Optional[str]] = mapped_column(String(50), default="1% Sec 194O", nullable=True)            # Service-wise TDS Rate (e.g. 1% Sec 194O, 5% Sec 194H)
    entity_scope: Mapped[Optional[str]] = mapped_column(String(30), default="PLATFORM", nullable=True, index=True)  # PLATFORM, SUPER_DISTRIBUTOR, DISTRIBUTOR, RETAILER
    entity_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)   # SD / Distributor / Retailer name
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)     # public_id of the entity
    generated_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # name of user who generated
    total_txns_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_taxable_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_gst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_tds_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="FINALIZED", nullable=False, index=True)  # DRAFT, FINALIZED, FILED

    items: Mapped[List["ComplianceReportItemModel"]] = relationship("ComplianceReportItemModel", back_populates="report", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "report_number", name="uq_rep_tenant_number"),
    )


class ComplianceReportItemModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "compliance_report_item"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("compliance_report.public_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_code: Mapped[str] = mapped_column(String(100), nullable=False)
    pan: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    gross_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    mdr_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tds_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    report: Mapped["ComplianceReportModel"] = relationship("ComplianceReportModel", back_populates="items")


class TdsDeductionRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tds_deduction_record"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_year: Mapped[str] = mapped_column(String(20), default="2026-2027", nullable=False)
    section_code: Mapped[str] = mapped_column(String(30), default="194O", nullable=False)
    gross_payment_amount: Mapped[float] = mapped_column(Float, nullable=False)
    tds_rate_pct: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)  # 1% Section 194O
    tds_amount: Mapped[float] = mapped_column(Float, nullable=False)
    filing_status: Mapped[str] = mapped_column(String(30), default="FILED", nullable=False)


class GstFilingSummaryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "gst_filing_summary"

    tax_period: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    state_code: Mapped[str] = mapped_column(String(10), default="33", nullable=False)
    cgst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sgst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    igst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class SystemAlertPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "system_alert_policy"

    policy_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    recipient_emails: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class SystemHealthLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "system_health_log"

    component_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="HEALTHY", nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


# Financial Configuration Engine Models
class FinancialConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "financial_configuration"

    config_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    config_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # MDR, BANK_CHARGE, COMPANY_CHARGE, RETAILER_CHARGE, GST, TDS, COMMISSION, SETTLEMENT, WALLET, NUMBER_SERIES
    config_name: Mapped[str] = mapped_column(String(150), nullable=False)
    hierarchy_level: Mapped[str] = mapped_column(String(50), default="COMPANY", nullable=False, index=True)  # MACHINE, RETAILER, DISTRIBUTOR, SUPER_DISTRIBUTOR, REGIONAL_MANAGER, COMPANY, PLATFORM
    entity_target_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False, index=True)  # 1 (Machine) to 7 (Platform)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False, index=True)  # DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approved_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    remarks: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    mdr_details: Mapped[Optional["MdrConfigurationModel"]] = relationship("MdrConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    bank_details: Mapped[Optional["BankChargeConfigurationModel"]] = relationship("BankChargeConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    company_details: Mapped[Optional["CompanyChargeConfigurationModel"]] = relationship("CompanyChargeConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    retailer_details: Mapped[Optional["RetailerChargeConfigurationModel"]] = relationship("RetailerChargeConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    commission_details: Mapped[Optional["CommissionConfigurationModel"]] = relationship("CommissionConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    gst_details: Mapped[Optional["GstConfigurationModel"]] = relationship("GstConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    tds_details: Mapped[Optional["TdsConfigurationModel"]] = relationship("TdsConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    wallet_details: Mapped[Optional["WalletConfigurationModel"]] = relationship("WalletConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")
    settlement_details: Mapped[Optional["SettlementConfigurationModel"]] = relationship("SettlementConfigurationModel", back_populates="header", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "config_code", "version", name="uq_tenant_config_code_version"),
    )


class MdrConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "mdr_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(50), default="COMPANY", nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=1.5, nullable=False)
    fixed_charge: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    minimum_charge: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    maximum_charge: Mapped[float] = mapped_column(Float, default=500.0, nullable=False)
    gst_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="mdr_details")


class BankChargeConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_charge_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    charge_code: Mapped[str] = mapped_column(String(50), nullable=False)
    charge_name: Mapped[str] = mapped_column(String(100), nullable=False)
    charge_type: Mapped[str] = mapped_column(String(30), default="PERCENTAGE", nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    fixed_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="bank_details")


class CompanyChargeConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "company_charge_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    platform_fee_pct: Mapped[float] = mapped_column(Float, default=0.2, nullable=False)
    processing_fee_pct: Mapped[float] = mapped_column(Float, default=0.1, nullable=False)
    service_fee_pct: Mapped[float] = mapped_column(Float, default=0.05, nullable=False)
    settlement_fee_fixed: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    minimum_amount: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    maximum_amount: Mapped[float] = mapped_column(Float, default=1000.0, nullable=False)
    gst_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="company_details")


class RetailerChargeConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_charge_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    percentage: Mapped[float] = mapped_column(Float, default=1.5, nullable=False)
    fixed_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    monthly_platform_fee: Mapped[float] = mapped_column(Float, default=299.0, nullable=False)
    transaction_fee: Mapped[float] = mapped_column(Float, default=2.0, nullable=False)
    service_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="retailer_details")


class CommissionConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "commission_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    hierarchy_level: Mapped[str] = mapped_column(String(50), default="DISTRIBUTOR", nullable=False)
    rm_commission_pct: Mapped[float] = mapped_column(Float, default=2.0, nullable=False)
    super_distributor_commission_pct: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    distributor_commission_pct: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    retailer_commission_pct: Mapped[float] = mapped_column(Float, default=83.0, nullable=False)
    fixed_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="commission_details")


class GstConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "gst_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    gst_code: Mapped[str] = mapped_column(String(30), default="GST18", nullable=False)
    cgst_pct: Mapped[float] = mapped_column(Float, default=9.0, nullable=False)
    sgst_pct: Mapped[float] = mapped_column(Float, default=9.0, nullable=False)
    igst_pct: Mapped[float] = mapped_column(Float, default=18.0, nullable=False)
    cess_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(20), default="998599", nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="gst_details")


class TdsConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tds_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    tds_section: Mapped[str] = mapped_column(String(30), default="194O", nullable=False)
    tds_percentage: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    threshold_amount: Mapped[float] = mapped_column(Float, default=500000.0, nullable=False)
    pan_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="tds_details")


class WalletConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    opening_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    minimum_balance: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    maximum_balance: Mapped[float] = mapped_column(Float, default=1000000.0, nullable=False)
    credit_limit: Mapped[float] = mapped_column(Float, default=50000.0, nullable=False)
    auto_credit_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_debit_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    freeze_balance: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    negative_balance_allowed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="wallet_details")


class SettlementConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_configuration"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_mode: Mapped[str] = mapped_column(String(30), default="AUTO", nullable=False)  # AUTO, MANUAL
    settlement_cycle: Mapped[str] = mapped_column(String(20), default="T_1", nullable=False)  # T_0, T_1, T_2
    cut_off_time: Mapped[str] = mapped_column(String(10), default="18:00", nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    holiday_handling: Mapped[str] = mapped_column(String(50), default="NEXT_WORKING_DAY", nullable=False)
    auto_settlement_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    header: Mapped["FinancialConfigurationModel"] = relationship("FinancialConfigurationModel", back_populates="settlement_details")


class NumberSeriesModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "number_series"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # RETAILER_CODE, MACHINE_CODE, SETTLEMENT_NO, PAYOUT_NO, WALLET_TXN_NO, INVOICE_NO
    prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    suffix: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    current_running_no: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    min_digits: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    financial_year_reset: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "entity_type", name="uq_tenant_number_series"),
    )


class CurrencyConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "currency_configuration"

    currency_code: Mapped[str] = mapped_column(String(10), default="INR", nullable=False, index=True)
    country_code: Mapped[str] = mapped_column(String(10), default="IN", nullable=False)
    decimal_precision: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(10), default="₹", nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)


class ConfigurationVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "configuration_version"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_version: Mapped[str] = mapped_column(String(20), nullable=False)
    new_version: Mapped[str] = mapped_column(String(20), nullable=False)
    change_summary: Mapped[Text] = mapped_column(Text, nullable=False)
    approved_by: Mapped[str] = mapped_column(String(255), nullable=False)
    approved_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    rollback_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


class ApprovalWorkflowModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "approval_workflow"

    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    maker_email: Mapped[str] = mapped_column(String(255), nullable=False)
    checker_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approver_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_step: Mapped[str] = mapped_column(String(50), default="PENDING_CHECKER", nullable=False, index=True)
    decision_comments: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


# EPIC-007 — Settlement File Intake & Validation Models
class SettlementFileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_file"

    file_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(100), default="HDFC", nullable=False, index=True)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    original_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # SHA-256
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="UPLOADED", nullable=False, index=True)  # UPLOADED, VALIDATING, STAGED, PARTIALLY_REJECTED, FAILED
    uploaded_by: Mapped[str] = mapped_column(String(255), nullable=False)
    completed_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    remarks: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    details: Mapped[List["SettlementFileDetailModel"]] = relationship("SettlementFileDetailModel", back_populates="file_header", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "file_hash", name="uq_tenant_settlement_file_hash"),
    )


class SettlementFileDetailModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_file_detail"

    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_file.public_id", ondelete="CASCADE"), nullable=False, index=True)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    txn_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    mid: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    tid: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    settlement_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="VALID", nullable=False, index=True)  # VALID, REJECTED, DUPLICATE
    validation_result: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)
    reject_reason: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)

    file_header: Mapped["SettlementFileModel"] = relationship("SettlementFileModel", back_populates="details")


class SettlementStagingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_staging"

    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    validation_status: Mapped[str] = mapped_column(String(30), default="READY_FOR_PROCESSING", nullable=False, index=True)
    processed_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SettlementRejectModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_reject"

    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    reject_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # INVALID_TID, UNMAPPED_MID, DUPLICATE_RRN, AMOUNT_MISMATCH
    reject_message: Mapped[str] = mapped_column(Text, nullable=False)
    original_data: Mapped[Text] = mapped_column(Text, nullable=False)
    corrected_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resolved_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class SettlementDuplicateModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_duplicate"

    duplicate_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # HASH, RRN, FILE_NAME
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    existing_batch: Mapped[str] = mapped_column(String(100), nullable=False)
    current_batch: Mapped[str] = mapped_column(String(100), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    action_taken: Mapped[str] = mapped_column(String(30), default="BLOCKED", nullable=False)


class SettlementValidationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_validation"

    validation_rule: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(30), default="PASSED", nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="CRITICAL", nullable=False)
    executed_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    executed_by: Mapped[str] = mapped_column(String(255), nullable=False)


class SettlementImportLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_import_log"

    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Text] = mapped_column(Text, nullable=False)


class SettlementFileHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_file_history"

    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_file.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)


class SettlementUploadBatchModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_upload_batch"

    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    total_files_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)


# EPIC-008 — Settlement Processing Engine Models
class SettlementTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_transaction"

    settlement_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    machine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("swipe_machine.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    net_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False, index=True)  # PENDING, QUEUED, PROCESSING, CALCULATED, WALLET_CREDITED, JOURNAL_POSTED, COMPLETED, RECONCILED, CLOSED
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    calculation: Mapped[Optional["SettlementCalculationModel"]] = relationship("SettlementCalculationModel", back_populates="settlement", uselist=False, cascade="all, delete-orphan")
    charges: Mapped[List["SettlementChargeModel"]] = relationship("SettlementChargeModel", back_populates="settlement", cascade="all, delete-orphan")
    commissions: Mapped[List["SettlementCommissionModel"]] = relationship("SettlementCommissionModel", back_populates="settlement", cascade="all, delete-orphan")
    taxes: Mapped[List["SettlementTaxModel"]] = relationship("SettlementTaxModel", back_populates="settlement", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "settlement_number", name="uq_tenant_settlement_number"),
    )


class SettlementCalculationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_calculation"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    calculation_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    charge_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tds_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_settlement: Mapped[float] = mapped_column(Float, nullable=False)
    calculation_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    settlement: Mapped["SettlementTransactionModel"] = relationship("SettlementTransactionModel", back_populates="calculation")


class SettlementChargeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_charge"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    charge_type: Mapped[str] = mapped_column(String(50), nullable=False)  # BANK_MDR, COMPANY_PLATFORM, RETAILER_SERVICE
    charge_source: Mapped[str] = mapped_column(String(50), default="CONFIG_ENGINE", nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fixed_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    calculated_amount: Mapped[float] = mapped_column(Float, nullable=False)
    configuration_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)

    settlement: Mapped["SettlementTransactionModel"] = relationship("SettlementTransactionModel", back_populates="charges")


class SettlementCommissionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_commission"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    hierarchy_level: Mapped[str] = mapped_column(String(50), nullable=False)  # RM, SUPER_DISTRIBUTOR, DISTRIBUTOR, RETAILER
    commission_type: Mapped[str] = mapped_column(String(30), default="PERCENTAGE", nullable=False)
    commission_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Float, nullable=False)
    recipient_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    settlement: Mapped["SettlementTransactionModel"] = relationship("SettlementTransactionModel", back_populates="commissions")


class SettlementTaxModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_tax"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    tax_type: Mapped[str] = mapped_column(String(30), nullable=False)  # GST, TDS
    cgst_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sgst_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    igst_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cess_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tds_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, nullable=False)

    settlement: Mapped["SettlementTransactionModel"] = relationship("SettlementTransactionModel", back_populates="taxes")


class WalletTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_transaction"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    txn_type: Mapped[str] = mapped_column(String(30), default="CREDIT", nullable=False)  # CREDIT, DEBIT, REVERSAL
    credit_amount: Mapped[float] = mapped_column(Float, nullable=False)
    opening_balance: Mapped[float] = mapped_column(Float, nullable=False)
    closing_balance: Mapped[float] = mapped_column(Float, nullable=False)
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    transaction_status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)


class WalletBalanceHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_balance_history"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    previous_balance: Mapped[float] = mapped_column(Float, nullable=False)
    new_balance: Mapped[float] = mapped_column(Float, nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class TransactionLedgerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "transaction_ledger"

    ledger_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    transaction_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    ledger_type: Mapped[str] = mapped_column(String(50), default="SETTLEMENT_CREDIT", nullable=False)  # SETTLEMENT_CREDIT, COMMISSION_PAYOUT, FEE_DEDUCTION
    debit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    balance: Mapped[float] = mapped_column(Float, nullable=False)
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    ledger_status: Mapped[str] = mapped_column(String(30), default="POSTED", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "ledger_number", name="uq_tenant_ledger_number"),
    )


class AccountingJournalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "accounting_journal"

    journal_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    journal_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    posting_status: Mapped[str] = mapped_column(String(30), default="POSTED", nullable=False)
    posting_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_module: Mapped[str] = mapped_column(String(50), default="SETTLEMENT_ENGINE", nullable=False)

    entries: Mapped[List["JournalEntryModel"]] = relationship("JournalEntryModel", back_populates="journal", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "journal_number", name="uq_tenant_journal_number"),
    )


class JournalEntryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "journal_entry"

    journal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounting_journal.public_id", ondelete="CASCADE"), nullable=False, index=True)
    account_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # 1001_BANK, 2001_WALLET, 3001_MDR_REVENUE, 4001_GST_PAYABLE, 5001_TDS_PAYABLE
    debit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cost_centre: Mapped[str] = mapped_column(String(50), default="RETAILER_PLATFORM", nullable=False)
    narration: Mapped[str] = mapped_column(Text, nullable=False)

    journal: Mapped["AccountingJournalModel"] = relationship("AccountingJournalModel", back_populates="entries")


class SettlementProcessingLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_processing_log"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Text] = mapped_column(Text, nullable=False)


class SettlementRetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_retry"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="RETRIED", nullable=False)
    exception_message: Mapped[Text] = mapped_column(Text, nullable=False)
    next_retry_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class SettlementExceptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "settlement_exception"

    settlement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("settlement_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    error_code: Mapped[str] = mapped_column(String(50), nullable=False)
    exception_details: Mapped[Text] = mapped_column(Text, nullable=False)
    resolution_status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)


# EPIC-009 — Enterprise Wallet & Ledger Platform Models
class EnterpriseWalletModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "enterprise_wallet"

    wallet_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    wallet_type: Mapped[str] = mapped_column(String(50), default="RETAILER", nullable=False, index=True)  # COMPANY, RM, SUPER_DISTRIBUTOR, DISTRIBUTOR, RETAILER, SETTLEMENT, COMMISSION, ADJUSTMENT, SUSPENSE, RESERVE
    owner_type: Mapped[str] = mapped_column(String(50), default="RETAILER", nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, FROZEN, BLOCKED, CLOSED
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    opening_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)

    balance: Mapped[Optional["EnterpriseWalletBalanceModel"]] = relationship("EnterpriseWalletBalanceModel", back_populates="wallet", uselist=False, cascade="all, delete-orphan")
    holds: Mapped[List["WalletHoldModel"]] = relationship("WalletHoldModel", back_populates="wallet", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "wallet_number", name="uq_tenant_enterprise_wallet_number"),
    )


class EnterpriseWalletBalanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "enterprise_wallet_balance"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("enterprise_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    opening_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    debit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    closing_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    hold_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reserved_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    available_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    wallet: Mapped["EnterpriseWalletModel"] = relationship("EnterpriseWalletModel", back_populates="balance")


class WalletHoldModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_hold"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("enterprise_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    hold_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    hold_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, RELEASED, EXPIRED
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    wallet: Mapped["EnterpriseWalletModel"] = relationship("EnterpriseWalletModel", back_populates="holds")


class WalletAdjustmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_adjustment"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("enterprise_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    adjustment_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    adjustment_type: Mapped[str] = mapped_column(String(30), default="CREDIT", nullable=False)  # CREDIT, DEBIT, REVERSAL
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    approved_by: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)


class WalletStatementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_statement"

    statement_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("enterprise_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    statement_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="PDF", nullable=False)


class ChartOfAccountsModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "chart_of_accounts"

    account_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True, unique=True)
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_account: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    nature: Mapped[str] = mapped_column(String(20), default="DEBIT", nullable=False)  # DEBIT, CREDIT
    posting_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "account_code", name="uq_tenant_coa_account_code"),
    )


class GlAccountModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "gl_account"

    gl_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "gl_code", name="uq_tenant_gl_code"),
    )


class LedgerEntryDetailModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ledger_entry_detail"

    ledger_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    gl_account_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    debit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    narration: Mapped[Text] = mapped_column(Text, nullable=False)
    cost_centre: Mapped[str] = mapped_column(String(50), default="RETAILER_PLATFORM", nullable=False)
    profit_centre: Mapped[str] = mapped_column(String(50), default="SETTLEMENT_OPERATIONS", nullable=False)


class LedgerBalanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ledger_balance"

    gl_account_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    as_on_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    debit_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class LedgerReversalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ledger_reversal"

    original_ledger_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reversal_ledger_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    reversed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    reversed_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class LedgerAdjustmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ledger_adjustment"

    adjustment_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    original_ledger_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    adjustment_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    approved_by: Mapped[str] = mapped_column(String(255), nullable=False)


class ReconciliationBatchModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "reconciliation_batch"

    reconciliation_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_module: Mapped[str] = mapped_column(String(50), default="WALLET_ENGINE", nullable=False)
    target_module: Mapped[str] = mapped_column(String(50), default="GL_LEDGER", nullable=False)
    difference_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="MATCHED", nullable=False, index=True)  # MATCHED, DISCREPANCY
    completed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    completed_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "reconciliation_number", name="uq_tenant_reconciliation_number"),
    )


# EPIC-010 — Enterprise Payout Engine Models
class PayoutRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_request"

    payout_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("enterprise_wallet.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    charges: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_amount: Mapped[float] = mapped_column(Float, nullable=False)
    purpose: Mapped[str] = mapped_column(String(100), default="MERCHANT_SETTLEMENT_PAYOUT", nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # NORMAL, URGENT
    status: Mapped[str] = mapped_column(String(30), default="CREATED", nullable=False, index=True)  # CREATED, PENDING_APPROVAL, APPROVED, QUEUED, PROCESSING, SUCCESS, FAILED, REVERSED, CANCELLED
    requested_by: Mapped[str] = mapped_column(String(255), nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    transactions: Mapped[List["PayoutTransactionModel"]] = relationship("PayoutTransactionModel", back_populates="payout", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "payout_number", name="uq_tenant_payout_number"),
    )


class PayoutBatchModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_batch"

    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    total_payouts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="IMPS", nullable=False)  # IMPS, NEFT, RTGS, UPI
    status: Mapped[str] = mapped_column(String(30), default="PROCESSING", nullable=False)


class PayoutTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_transaction"

    transaction_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    gateway_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bank_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    utr_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    rrn: Mapped[str] = mapped_column(String(100), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="IMPS", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False, index=True)
    processed_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    payout: Mapped["PayoutRequestModel"] = relationship("PayoutRequestModel", back_populates="transactions")


class PayoutBankRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_bank_request"

    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    gateway_code: Mapped[str] = mapped_column(String(50), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    payload: Mapped[Text] = mapped_column(Text, nullable=False)
    request_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    response_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class PayoutBankResponseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_bank_response"

    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    http_status: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    gateway_status: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_status: Mapped[str] = mapped_column(String(50), nullable=False)
    response_code: Mapped[str] = mapped_column(String(50), nullable=False)
    response_message: Mapped[Text] = mapped_column(Text, nullable=False)
    reference: Mapped[str] = mapped_column(String(100), nullable=False)


class PayoutWebhookModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_webhook"

    webhook_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    gateway_code: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[Text] = mapped_column(Text, nullable=False)
    signature: Mapped[str] = mapped_column(String(255), nullable=False)
    validation_result: Mapped[str] = mapped_column(String(30), default="VALID", nullable=False)
    processed_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class PayoutStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_status_history"

    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class PayoutRetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_retry"

    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retry_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    retry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="RETRIED", nullable=False)


class PayoutReversalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_reversal"

    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    reversal_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)


class PayoutExceptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_exception"

    payout_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payout_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    error_code: Mapped[str] = mapped_column(String(50), nullable=False)
    exception_details: Mapped[Text] = mapped_column(Text, nullable=False)
    resolution_status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)


class PayoutReconciliationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_reconciliation"

    payout_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    gateway_status: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_status: Mapped[str] = mapped_column(String(50), nullable=False)
    ledger_status: Mapped[str] = mapped_column(String(50), nullable=False)
    wallet_status: Mapped[str] = mapped_column(String(50), nullable=False)
    difference_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    resolution: Mapped[str] = mapped_column(String(50), default="MATCHED", nullable=False)


class BankGatewayModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_gateway"

    gateway_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    gateway_name: Mapped[str] = mapped_column(String(100), nullable=False)
    api_endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_type: Mapped[str] = mapped_column(String(50), default="BEARER_TOKEN", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    timeout_sec: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "gateway_code", name="uq_tenant_bank_gateway_code"),
    )


# EPIC-011 — Enterprise Reporting, Analytics & MIS Platform Models
class ReportDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "report_definition"

    report_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    report_name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="FINANCIAL", nullable=False)  # FINANCIAL, OPERATIONAL, COMPLIANCE, AUDIT
    query_template: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "report_code", name="uq_tenant_report_code"),
    )


class ReportExecutionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "report_execution"

    execution_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    execution_status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)  # RUNNING, COMPLETED, FAILED
    record_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    executed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=150, nullable=False)


class ReportScheduleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "report_schedule"

    schedule_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    frequency: Mapped[str] = mapped_column(String(30), default="DAILY", nullable=False)  # DAILY, WEEKLY, MONTHLY
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="EXCEL", nullable=False)  # EXCEL, CSV, PDF
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    last_executed: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DashboardWidgetModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dashboard_widget"

    widget_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    widget_name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="EXECUTIVE", nullable=False)
    chart_type: Mapped[str] = mapped_column(String(30), default="LINE", nullable=False)  # LINE, BAR, DONUT
    config_json: Mapped[Text] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class DashboardLayoutModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dashboard_layout"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("admin_user.public_id", ondelete="CASCADE"), nullable=False, index=True)
    layout_name: Mapped[str] = mapped_column(String(100), default="DEFAULT_DASHBOARD", nullable=False)
    widget_grid_config: Mapped[Text] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AnalyticsSnapshotModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "analytics_snapshot"

    snapshot_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    snapshot_type: Mapped[str] = mapped_column(String(50), default="DAILY_CLOSING", nullable=False)
    total_settlements: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gross_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    active_merchants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class DailySummaryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "daily_summary"

    summary_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    total_transactions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gross_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    mdr_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gst_collected: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tds_deducted: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_wallet_credit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    outbound_payout_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class MonthlySummaryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "monthly_summary"

    year_month: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    total_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    active_pos_terminals: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_retailers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class YearlySummaryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "yearly_summary"

    financial_year: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    total_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gross_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class AuditReportModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "audit_report"

    audit_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    audit_event: Mapped[str] = mapped_column(String(150), nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_severity: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)
    details_json: Mapped[Text] = mapped_column(Text, nullable=False)
    generated_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ReportExportModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "report_export"

    export_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    format: Mapped[str] = mapped_column(String(20), default="EXCEL", nullable=False)  # EXCEL, CSV, PDF
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ReportHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "report_history"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    downloaded_by: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    downloaded_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class MisDistributionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "mis_distribution"

    distribution_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    scheduled_report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report_schedule.public_id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_list: Mapped[Text] = mapped_column(Text, nullable=False)
    delivery_channel: Mapped[str] = mapped_column(String(50), default="EMAIL", nullable=False)  # EMAIL, SFTP
    status: Mapped[str] = mapped_column(String(30), default="DELIVERED", nullable=False)


# EPIC-012 — Enterprise Platform Security, Operations & Production Readiness Models
class SystemAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "system_audit"

    audit_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("admin_user.public_id", ondelete="SET NULL"), nullable=True, index=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=False)
    details_json: Mapped[Text] = mapped_column(Text, nullable=False)


class SystemLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "system_log"

    log_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    log_level: Mapped[str] = mapped_column(String(20), default="INFO", nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    exception_trace: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


class ApplicationLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "application_log"

    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class SecurityLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "security_log"

    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class MonitoringMetricModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "monitoring_metric"

    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    component: Mapped[str] = mapped_column(String(50), nullable=False)


class AlertModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "alert"

    alert_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), default="WARNING", nullable=False)  # CRITICAL, WARNING, INFO
    component: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, ACKNOWLEDGED, RESOLVED

    __table_args__ = (
        UniqueConstraint("tenant_id", "alert_code", name="uq_tenant_alert_code"),
    )


class AlertHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "alert_history"

    alert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("alert.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class SchedulerJobModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "scheduler_job"

    job_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    job_name: Mapped[str] = mapped_column(String(150), nullable=False)
    cron_expression: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    last_run_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class JobExecutionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "job_execution"

    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scheduler_job.public_id", ondelete="CASCADE"), nullable=False, index=True)
    execution_status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class BackgroundQueueModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "background_queue"

    queue_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pending_jobs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_workers: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    failed_jobs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class DeadLetterQueueModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dead_letter_queue"

    dlq_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    payload_json: Mapped[Text] = mapped_column(Text, nullable=False)
    error_message: Mapped[Text] = mapped_column(Text, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)


class FeatureFlagModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "feature_flag"

    flag_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rollout_percentage: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "flag_key", name="uq_tenant_flag_key"),
    )


class MaintenanceWindowModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "maintenance_window"

    title: Mapped[str] = mapped_column(String(150), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allowed_ips: Mapped[Text] = mapped_column(Text, default="127.0.0.1", nullable=False)


class SystemHealthModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "system_health"

    service_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="HEALTHY", nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    uptime_sec: Mapped[int] = mapped_column(Integer, default=86400, nullable=False)


class ApiUsageModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_usage"

    endpoint: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    total_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_5xx_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_latency_ms: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)


class IntegrationHealthModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "integration_health"

    gateway_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="UP", nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=120, nullable=False)


class BackupHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "backup_history"

    backup_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    backup_type: Mapped[str] = mapped_column(String(50), default="FULL_DB", nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=104857600, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False)


class RestoreHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "restore_history"

    restore_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    backup_number: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="VERIFIED", nullable=False)


# EPIC-013 — Enterprise CRM, Customer Service & Support Platform Models
class CrmCustomerProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "crm_customer_profile"

    profile_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    relationship_status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    lifetime_volume: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_tickets: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "retailer_id", name="uq_tenant_crm_retailer_id"),
    )


class SupportTicketModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "support_ticket"

    ticket_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="SETTLEMENT_ISSUE", nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False, index=True)  # NEW, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
    assigned_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sla_due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "ticket_number", name="uq_tenant_ticket_number"),
    )


class TicketAssignmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ticket_assignment"

    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_user: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    skill_set: Mapped[str] = mapped_column(String(100), default="GENERAL_SUPPORT", nullable=False)


class TicketHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ticket_history"

    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class TicketCommentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ticket_comment"

    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="CASCADE"), nullable=False, index=True)
    comment_text: Mapped[Text] = mapped_column(Text, nullable=False)
    is_internal_note: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)


class TicketAttachmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ticket_attachment"

    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=1024, nullable=False)


class TicketSlaModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ticket_sla"

    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="CASCADE"), nullable=False, index=True)
    response_sla_sec: Mapped[int] = mapped_column(Integer, default=3600, nullable=False)
    resolution_sla_sec: Mapped[int] = mapped_column(Integer, default=86400, nullable=False)
    response_breach: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolution_breach: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TicketEscalationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ticket_escalation"

    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="CASCADE"), nullable=False, index=True)
    escalation_level: Mapped[str] = mapped_column(String(20), default="L2", nullable=False)  # L1, L2, L3, L4
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    escalated_to: Mapped[str] = mapped_column(String(255), nullable=False)


class CustomerInteractionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_interaction"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(30), default="PHONE", nullable=False)  # EMAIL, SMS, PHONE
    summary: Mapped[Text] = mapped_column(Text, nullable=False)


class CustomerFeedbackModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_feedback"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    ticket_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("support_ticket.public_id", ondelete="SET NULL"), nullable=True, index=True)
    csat_rating: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    nps_score: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    comments: Mapped[Text] = mapped_column(Text, nullable=False)


class FieldVisitModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "field_visit"

    visit_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    executive_user: Mapped[str] = mapped_column(String(255), nullable=False)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)


class VisitReportModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "visit_report"

    visit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("field_visit.public_id", ondelete="CASCADE"), nullable=False, index=True)
    checkin_lat_lng: Mapped[str] = mapped_column(String(50), default="12.9716,77.5946", nullable=False)
    checkout_lat_lng: Mapped[str] = mapped_column(String(50), default="12.9716,77.5946", nullable=False)
    notes: Mapped[Text] = mapped_column(Text, nullable=False)
    photo_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    digital_signature_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class KnowledgeArticleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "knowledge_article"

    article_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="SETTLEMENT", nullable=False)
    content: Mapped[Text] = mapped_column(Text, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PUBLISHED", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "article_code", name="uq_tenant_article_code"),
    )


class AnnouncementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "announcement"

    announcement_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[Text] = mapped_column(Text, nullable=False)
    audience: Mapped[str] = mapped_column(String(50), default="ALL_RETAILERS", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class NotificationHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_history"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(30), default="EMAIL", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SENT", nullable=False)


# EPIC-014 — Enterprise Fraud, Risk & Compliance Platform Models
class RiskProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_profile"

    profile_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # RETAILER, MACHINE, PAYOUT
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    risk_band: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL

    __table_args__ = (
        UniqueConstraint("tenant_id", "entity_type", "entity_id", name="uq_tenant_risk_entity"),
    )


class RiskScoreModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_score"

    risk_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("risk_profile.public_id", ondelete="CASCADE"), nullable=False, index=True)
    component: Mapped[str] = mapped_column(String(50), nullable=False)
    score_delta: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class FraudRuleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_rule"

    rule_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SETTLEMENT, PAYOUT, MACHINE
    category: Mapped[str] = mapped_column(String(50), default="VELOCITY", nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float, default=100000.0, nullable=False)
    action: Mapped[str] = mapped_column(String(30), default="HOLD", nullable=False)  # APPROVE, HOLD, REJECT, FREEZE_WALLET
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "rule_code", name="uq_tenant_fraud_rule_code"),
    )


class FraudRuleVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_rule_version"

    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fraud_rule.public_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    changes_description: Mapped[Text] = mapped_column(Text, nullable=False)


class FraudAlertModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_alert"

    alert_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fraud_rule.public_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), default="CRITICAL", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "alert_code", name="uq_tenant_fraud_alert_code"),
    )


class FraudCaseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_case"

    case_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    alert_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("fraud_alert.public_id", ondelete="SET NULL"), nullable=True, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="UNDER_INVESTIGATION", nullable=False)
    assigned_investigator: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "case_number", name="uq_tenant_fraud_case_number"),
    )


class FraudCaseHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_case_history"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fraud_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class FraudInvestigationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_investigation"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fraud_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    findings_text: Mapped[Text] = mapped_column(Text, nullable=False)
    risk_outcome: Mapped[str] = mapped_column(String(30), default="HIGH_RISK", nullable=False)


class FraudDecisionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_decision"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fraud_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    decision_action: Mapped[str] = mapped_column(String(50), nullable=False)  # APPROVE, REJECT, FREEZE_WALLET, BLOCK_MACHINE
    approved_by: Mapped[str] = mapped_column(String(255), nullable=False)


class BlacklistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "blacklist"

    entry_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PAN, BANK_ACCOUNT, IP, UPI, MOBILE
    item_value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class WhitelistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "whitelist"

    entry_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)
    item_value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class WatchlistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "watchlist"

    watch_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)
    item_value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)


class RiskEventModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_event"

    event_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    raw_details_json: Mapped[Text] = mapped_column(Text, nullable=False)


class RiskHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_history"

    risk_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("risk_profile.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_score: Mapped[int] = mapped_column(Integer, nullable=False)
    new_score: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)


class DeviceFingerprintModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "device_fingerprint"

    fingerprint_hash: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    os: Mapped[str] = mapped_column(String(50), nullable=False)
    browser: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=5, nullable=False)


class LoginHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "login_history"

    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(50), default="IN", nullable=False)
    city: Mapped[str] = mapped_column(String(100), default="Bangalore", nullable=False)
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class BehaviourProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "behaviour_profile"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    avg_daily_settlement: Mapped[float] = mapped_column(Float, default=50000.0, nullable=False)
    max_payout_volume: Mapped[float] = mapped_column(Float, default=200000.0, nullable=False)
    velocity_baseline: Mapped[int] = mapped_column(Integer, default=10, nullable=False)


# EPIC-015 — Enterprise Finance, Accounting & Reconciliation Platform Models
class AccountingPeriodModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "accounting_period"

    period_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    period_name: Mapped[str] = mapped_column(String(150), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)  # OPEN, LOCKED, CLOSED

    __table_args__ = (
        UniqueConstraint("tenant_id", "period_code", name="uq_tenant_period_code"),
    )


class AccountingPeriodCloseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "accounting_period_close"

    close_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounting_period.public_id", ondelete="CASCADE"), nullable=False, index=True)
    closed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    closed_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    summary_json: Mapped[Text] = mapped_column(Text, nullable=False)


class GlBalanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "gl_balance"

    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("gl_account.public_id", ondelete="CASCADE"), nullable=False, index=True)
    period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounting_period.public_id", ondelete="CASCADE"), nullable=False, index=True)
    opening_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_debits: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_credits: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    closing_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class SubledgerMappingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "subledger_mapping"

    subledger_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    gl_account_code: Mapped[str] = mapped_column(String(50), nullable=False)


class BankStatementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_statement"

    statement_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(100), default="HDFC_BANK", nullable=False)
    closing_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="RECONCILED", nullable=False)


class BankStatementLineModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_statement_line"

    statement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_statement.public_id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    reference_utr: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    line_type: Mapped[str] = mapped_column(String(20), default="CREDIT", nullable=False)  # CREDIT, DEBIT
    is_matched: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BankReconciliationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_reconciliation"

    reconcile_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    statement_line_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_statement_line.public_id", ondelete="CASCADE"), nullable=False, index=True)
    journal_entry_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entry.public_id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="MATCHED", nullable=False)


class ReconciliationExceptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "reconciliation_exception"

    exception_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    statement_line_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_statement_line.public_id", ondelete="CASCADE"), nullable=False, index=True)
    variance_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)


class FinancialAdjustmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "financial_adjustment"

    adj_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("gl_account.public_id", ondelete="CASCADE"), nullable=False, index=True)
    debit_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credit_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reason: Mapped[Text] = mapped_column(Text, nullable=False)


class TrialBalanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "trial_balance"

    period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounting_period.public_id", ondelete="CASCADE"), nullable=False, index=True)
    total_debits: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_credits: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    difference: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_balanced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FinancialStatementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "financial_statement"

    statement_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # BALANCE_SHEET, PROFIT_LOSS
    period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounting_period.public_id", ondelete="CASCADE"), nullable=False, index=True)
    statement_data_json: Mapped[Text] = mapped_column(Text, nullable=False)


class TaxConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tax_configuration"

    tax_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    cgst_rate: Mapped[float] = mapped_column(Float, default=9.0, nullable=False)
    sgst_rate: Mapped[float] = mapped_column(Float, default=9.0, nullable=False)
    igst_rate: Mapped[float] = mapped_column(Float, default=18.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class TaxTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tax_transaction"

    tax_code_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_configuration.public_id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    taxable_amount: Mapped[float] = mapped_column(Float, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, nullable=False)


class TaxSummaryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "tax_summary"

    period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounting_period.public_id", ondelete="CASCADE"), nullable=False, index=True)
    total_taxable: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_cgst: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_sgst: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_igst: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_tds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class BudgetModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "budget"

    budget_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("gl_account.public_id", ondelete="CASCADE"), nullable=False, index=True)
    allocated_amount: Mapped[float] = mapped_column(Float, nullable=False)
    spent_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class ForecastModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "forecast"

    forecast_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    projected_amount: Mapped[float] = mapped_column(Float, nullable=False)


class AuditFinanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "audit_finance"

    audit_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    details_json: Mapped[Text] = mapped_column(Text, nullable=False)


# EPIC-016 — Enterprise Operations, Workflow & Business Process Management (BPM) Models
class WorkflowDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_definition"

    workflow_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    workflow_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SETTLEMENT, PAYOUT, RETAILER, JOURNAL
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "workflow_code", name="uq_tenant_workflow_code"),
    )


class WorkflowVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_version"

    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    definition_json: Mapped[Text] = mapped_column(Text, nullable=False)


class WorkflowInstanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_instance"

    instance_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    current_step: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="IN_PROGRESS", nullable=False)  # IN_PROGRESS, COMPLETED, REJECTED


class WorkflowStepModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_step"

    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    step_code: Mapped[str] = mapped_column(String(100), nullable=False)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    step_type: Mapped[str] = mapped_column(String(50), default="APPROVAL", nullable=False)  # APPROVAL, TASK, NOTIFICATION


class WorkflowTransitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_transition"

    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    from_step: Mapped[str] = mapped_column(String(100), nullable=False)
    to_step: Mapped[str] = mapped_column(String(100), nullable=False)


class WorkflowConditionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_condition"

    transition_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_transition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    expression: Mapped[Text] = mapped_column(Text, nullable=False)


class WorkflowHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "workflow_history"

    instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_instance.public_id", ondelete="CASCADE"), nullable=False, index=True)
    step_code: Mapped[str] = mapped_column(String(100), nullable=False)
    action_taken: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class TaskModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "task"

    task_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(30), default="ASSIGNED", nullable=False)  # NEW, ASSIGNED, COMPLETED
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "task_number", name="uq_tenant_task_number"),
    )


class TaskAssignmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "task_assignment"

    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("task.public_id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_to: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class TaskHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "task_history"

    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("task.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ApprovalRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "approval_request"

    request_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("task.public_id", ondelete="SET NULL"), nullable=True, index=True)
    requested_by: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    required_level: Mapped[int] = mapped_column(Integer, default=2, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "request_code", name="uq_tenant_approval_request_code"),
    )


class ApprovalHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "approval_history"

    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("approval_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    approver_email: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)  # APPROVED, REJECTED
    comments: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


class ApprovalMatrixModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "approval_matrix"

    matrix_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    min_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_amount: Mapped[float] = mapped_column(Float, default=1000000.0, nullable=False)
    required_approvers_json: Mapped[Text] = mapped_column(Text, nullable=False)


class OperationalQueueModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "operational_queue"

    queue_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    queue_name: Mapped[str] = mapped_column(String(255), nullable=False)
    queue_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SETTLEMENT, PAYOUT, COMPLIANCE
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class QueueItemModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "queue_item"

    queue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("operational_queue.public_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)


class SlaDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "sla_definition"

    sla_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    process_name: Mapped[str] = mapped_column(String(100), nullable=False)
    max_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    warning_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)


class SlaTrackerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "sla_tracker"

    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    sla_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sla_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    target_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ON_TRACK", nullable=False)  # ON_TRACK, WARNING, BREACHED


class EscalationRuleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "escalation_rule"

    sla_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sla_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_condition: Mapped[str] = mapped_column(String(50), default="BREACHED", nullable=False)
    escalate_to_role: Mapped[str] = mapped_column(String(100), nullable=False)


class AutomationRuleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "automation_rule"

    rule_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    action_json: Mapped[Text] = mapped_column(Text, nullable=False)


class AutomationExecutionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "automation_execution"

    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("automation_rule.public_id", ondelete="CASCADE"), nullable=False, index=True)
    execution_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False)
    details_json: Mapped[Text] = mapped_column(Text, nullable=False)


class BusinessCaseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "business_case"

    case_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="INVESTIGATING", nullable=False)


class CaseHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "case_history"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("business_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ExceptionCaseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "exception_case"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("business_case.public_id", ondelete="CASCADE"), nullable=False, index=True)
    exception_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_json: Mapped[Text] = mapped_column(Text, nullable=False)


class WorkCalendarModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "work_calendar"

    calendar_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    working_hours_json: Mapped[Text] = mapped_column(Text, nullable=False)


class HolidayCalendarModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "holiday_calendar"

    calendar_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    holiday_name: Mapped[str] = mapped_column(String(255), nullable=False)


class TeamModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "team"

    team_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)


class TeamMemberModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "team_member"

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("team.public_id", ondelete="CASCADE"), nullable=False, index=True)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), default="MEMBER", nullable=False)


class ShiftScheduleModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "shift_schedule"

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("team.public_id", ondelete="CASCADE"), nullable=False, index=True)
    shift_name: Mapped[str] = mapped_column(String(100), default="DAY_SHIFT", nullable=False)
    start_time: Mapped[str] = mapped_column(String(20), default="09:00", nullable=False)
    end_time: Mapped[str] = mapped_column(String(20), default="18:00", nullable=False)


class CapacityPlanModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "capacity_plan"

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("team.public_id", ondelete="CASCADE"), nullable=False, index=True)
    max_workload_capacity: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    current_assigned_workload: Mapped[int] = mapped_column(Integer, default=45, nullable=False)


# EPIC-018 — Enterprise Integration Platform (EIP), API Gateway & Partner Ecosystem Models
class ApiDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_definition"

    api_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    api_name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_path: Mapped[str] = mapped_column(String(255), nullable=False)
    protocol: Mapped[str] = mapped_column(String(30), default="REST", nullable=False)  # REST, SOAP, GRAPHQL, GRPC
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "api_code", name="uq_tenant_api_code"),
    )


class ApiVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_version"

    api_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("api_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    version_string: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    openapi_spec_json: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class ApiSubscriptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_subscription"

    partner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    api_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("api_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), default="ENTERPRISE", nullable=False)
    quota_limit: Mapped[int] = mapped_column(Integer, default=1000000, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class PartnerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "partner"

    partner_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    partner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="BANK", nullable=False)  # BANK, GATEWAY, ERP, CRM
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "partner_code", name="uq_tenant_partner_code"),
    )


class PartnerApplicationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "partner_application"

    app_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    partner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("partner.public_id", ondelete="CASCADE"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)


class PartnerCertificateModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "partner_certificate"

    partner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("partner.public_id", ondelete="CASCADE"), nullable=False, index=True)
    cert_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    valid_until_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class ConnectorDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "connector_definition"

    connector_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    connector_type: Mapped[str] = mapped_column(String(50), default="BANK", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "connector_code", name="uq_tenant_connector_code"),
    )


class ConnectorInstanceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "connector_instance"

    connector_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("connector_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    instance_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    endpoint_url: Mapped[str] = mapped_column(String(500), nullable=False)
    health_status: Mapped[str] = mapped_column(String(30), default="HEALTHY", nullable=False)


class IntegrationFlowModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "integration_flow"

    flow_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    flow_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_service: Mapped[str] = mapped_column(String(100), nullable=False)
    target_service: Mapped[str] = mapped_column(String(100), nullable=False)


class IntegrationExecutionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "integration_execution"

    flow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_flow.public_id", ondelete="CASCADE"), nullable=False, index=True)
    execution_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=120, nullable=False)


class IntegrationMappingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "integration_mapping"

    flow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_flow.public_id", ondelete="CASCADE"), nullable=False, index=True)
    source_field: Mapped[str] = mapped_column(String(100), nullable=False)
    target_field: Mapped[str] = mapped_column(String(100), nullable=False)
    transformation_code: Mapped[str] = mapped_column(String(50), default="RAW_COPY", nullable=False)


class WebhookDeliveryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "webhook_delivery"

    delivery_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    http_status: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="DELIVERED", nullable=False)  # DELIVERED, FAILED, RETRYING


class EventDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "event_definition"

    event_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_name: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)


class EventLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "event_log"

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("event_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    payload_json: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PUBLISHED", nullable=False)
    partition_key: Mapped[str] = mapped_column(String(100), nullable=False)


class EventSubscriptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "event_subscription"

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("event_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    subscriber_code: Mapped[str] = mapped_column(String(100), nullable=False)
    filter_expression: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


class EventRetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "event_retry"

    event_log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("event_log.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    next_retry_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    error_details: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


class ApiRateLimitModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_rate_limit"

    app_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    requests_per_minute: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    burst_capacity: Mapped[int] = mapped_column(Integer, default=1500, nullable=False)


class IntegrationErrorModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "integration_error"

    execution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_execution.public_id", ondelete="CASCADE"), nullable=False, index=True)
    error_code: Mapped[str] = mapped_column(String(100), nullable=False)
    stacktrace_text: Mapped[Text] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class FileTransferModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "file_transfer"

    transfer_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), default="INBOUND", nullable=False)  # INBOUND, OUTBOUND
    protocol: Mapped[str] = mapped_column(String(30), default="SFTP", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)


class FileTransferHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "file_transfer_history"

    transfer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("file_transfer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    step_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS", nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class DeveloperApplicationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "developer_application"

    app_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "app_code", name="uq_tenant_developer_app_code"),
    )


# EPIC-019 — Enterprise AI, Decision Intelligence & Predictive Analytics Platform Models
class FeatureStoreModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "feature_store"

    store_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), default="RETAILER", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "store_code", name="uq_tenant_feature_store_code"),
    )


class FeatureDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "feature_definition"

    feature_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feature_store.public_id", ondelete="CASCADE"), nullable=False, index=True)
    data_type: Mapped[str] = mapped_column(String(30), default="FLOAT", nullable=False)
    calculation_logic: Mapped[Text] = mapped_column(Text, nullable=False)


class FeatureValueModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "feature_value"

    feature_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feature_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    value_text: Mapped[str] = mapped_column(String(255), nullable=False)


class ModelRegistryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "model_registry"

    model_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="FORECASTING", nullable=False)  # FORECASTING, ANOMALY, RECOMMENDATION, CHURN
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "model_code", name="uq_tenant_model_code"),
    )


class ModelVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "model_version"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("model_registry.public_id", ondelete="CASCADE"), nullable=False, index=True)
    version_string: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    accuracy_score: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)
    precision_score: Mapped[float] = mapped_column(Float, default=0.94, nullable=False)
    f1_score: Mapped[float] = mapped_column(Float, default=0.94, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class TrainingJobModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "training_job"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("model_registry.public_id", ondelete="CASCADE"), nullable=False, index=True)
    job_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)
    training_loss: Mapped[float] = mapped_column(Float, default=0.034, nullable=False)
    epochs: Mapped[int] = mapped_column(Integer, default=100, nullable=False)


class TrainingDatasetModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "training_dataset"

    dataset_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    record_count: Mapped[int] = mapped_column(Integer, default=500000, nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)


class TrainingMetricModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "training_metric"

    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("training_job.public_id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    step: Mapped[int] = mapped_column(Integer, default=100, nullable=False)


class PredictionRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "prediction_request"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("model_registry.public_id", ondelete="CASCADE"), nullable=False, index=True)
    request_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    input_features_json: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PROCESSED", nullable=False)


class PredictionResultModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "prediction_result"

    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    output_json: Mapped[Text] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=18, nullable=False)


class RecommendationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "recommendation"

    rec_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="COMMISSION_OPTIMIZATION", nullable=False)
    action_text: Mapped[Text] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.92, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED

    __table_args__ = (
        UniqueConstraint("tenant_id", "rec_code", name="uq_tenant_rec_code"),
    )


class ForecastResultModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "forecast_result"

    target_topic: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[float] = mapped_column(Float, nullable=False)
    upper_bound: Mapped[float] = mapped_column(Float, nullable=False)


class AnomalyEventModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "anomaly_event"

    anomaly_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    anomaly_type: Mapped[str] = mapped_column(String(50), default="SETTLEMENT_SPIKE", nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.98, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False)  # OPEN, INVESTIGATING, RESOLVED


class DecisionLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "decision_log"

    decision_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    recommendation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("recommendation.public_id", ondelete="CASCADE"), nullable=False, index=True)
    decision_action: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)


class CopilotSessionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "copilot_session"

    session_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)


class CopilotPromptModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "copilot_prompt"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("copilot_session.public_id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_text: Mapped[Text] = mapped_column(Text, nullable=False)


class CopilotResponseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "copilot_response"

    prompt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("copilot_prompt.public_id", ondelete="CASCADE"), nullable=False, index=True)
    response_text: Mapped[Text] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.97, nullable=False)


class InsightDefinitionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "insight_definition"

    insight_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="CUSTOMER_RETENTION", nullable=False)


class InsightSnapshotModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "insight_snapshot"

    insight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("insight_definition.public_id", ondelete="CASCADE"), nullable=False, index=True)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    summary_text: Mapped[Text] = mapped_column(Text, nullable=False)


class AiFeedbackModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "ai_feedback"

    prediction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    feedback_score: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    user_comment: Mapped[Optional[Text]] = mapped_column(Text, nullable=True)


class ModelMonitoringModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "model_monitoring"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("model_registry.public_id", ondelete="CASCADE"), nullable=False, index=True)
    drift_score: Mapped[float] = mapped_column(Float, default=0.02, nullable=False)
    latency_p99_ms: Mapped[int] = mapped_column(Integer, default=22, nullable=False)
    health_status: Mapped[str] = mapped_column(String(30), default="HEALTHY", nullable=False)


# ============================================================
# EPIC-020: Enterprise Notification, Communication & Engagement
# ============================================================

class NotificationProviderModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_provider"

    provider_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    provider_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SMTP")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    daily_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rate_limit_per_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notif_health_status: Mapped[str] = mapped_column(String(30), nullable=False, default="HEALTHY")
    last_health_check: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_sent: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_failed: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    notif_provider_status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)


class ProviderConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "provider_configuration"

    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_provider.public_id", ondelete="CASCADE"), nullable=False, index=True)
    config_key: Mapped[str] = mapped_column(String(100), nullable=False)
    config_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    config_group: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class NotificationTemplateModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_template"

    template_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    template_name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False, default="TRANSACTIONAL", index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_rich_html: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_conditional_sections: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), nullable=False, default="APPROVED")
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    template_status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "template_code", "channel", "language", name="uq_template_tenant_code_channel_lang"),
    )


class TemplateVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "template_version"

    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_template.public_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    change_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


class TemplateVariableModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "template_variable"

    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_template.public_id", ondelete="CASCADE"), nullable=False, index=True)
    variable_name: Mapped[str] = mapped_column(String(100), nullable=False)
    variable_type: Mapped[str] = mapped_column(String(30), nullable=False, default="STRING")
    default_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class NotificationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification"

    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False, default="TRANSACTIONAL")
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    recipient_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    recipient_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    recipient_address: Mapped[str] = mapped_column(String(500), nullable=False)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_template.public_id", ondelete="SET NULL"), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    variables: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    business_event: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="NORMAL")
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notif_status: Mapped[str] = mapped_column(String(30), nullable=False, default="QUEUED", index=True)
    provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_notification_idempotency_key"),
        Index("ix_notification_status_channel", "notif_status", "channel"),
    )


class NotificationBatchModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_batch"

    batch_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    batch_name: Mapped[str] = mapped_column(String(255), nullable=False)
    batch_type: Mapped[str] = mapped_column(String(50), nullable=False, default="BULK")
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    total_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    batch_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class NotificationQueueModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_queue_item"

    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification.public_id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    queue_priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    worker_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    queue_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_notification_queue_status_priority", "queue_status", "queue_priority"),
    )


class NotificationDeliveryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_delivery"

    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification.public_id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    external_message_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(30), nullable=False, default="QUEUED", index=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    bounced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_response: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class NotificationRetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_retry"

    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification.public_id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    retry_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    retry_type: Mapped[str] = mapped_column(String(30), nullable=False, default="AUTO")
    provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    provider_switched: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    result_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retried_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CommunicationTimelineModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "communication_timeline"

    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    notification_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("notification.public_id", ondelete="SET NULL"), nullable=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body_preview: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    business_event: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timeline_delivery_status: Mapped[str] = mapped_column(String(30), nullable=False, default="QUEUED")
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_comm_timeline_entity_type", "entity_id", "entity_type"),
    )


class CampaignModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "campaign"

    campaign_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    campaign_name: Mapped[str] = mapped_column(String(255), nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), nullable=False, default="BROADCAST")
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False, default="MARKETING")
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_template.public_id", ondelete="SET NULL"), nullable=True)
    audience_definition: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    audience_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    has_ab_test: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ab_test_config: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    open_tracking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    click_tracking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    campaign_status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT", index=True)


class CampaignAudienceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "campaign_audience"

    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaign.public_id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    recipient_type: Mapped[str] = mapped_column(String(50), nullable=False)
    recipient_address: Mapped[str] = mapped_column(String(500), nullable=False)
    segment_group: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ab_variant: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    inclusion_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class CampaignExecutionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "campaign_execution"

    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaign.public_id", ondelete="CASCADE"), nullable=False, index=True)
    execution_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    total_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_delivered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_opened: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_clicked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_bounced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    open_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    click_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    exec_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    exec_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    execution_status: Mapped[str] = mapped_column(String(30), nullable=False, default="RUNNING")


class CampaignResultModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "campaign_result"

    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaign.public_id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    notification_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    result_delivery_status: Mapped[str] = mapped_column(String(30), nullable=False, default="QUEUED")
    opened: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    clicked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    converted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bounced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unsubscribed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ab_variant: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)


class OtpRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "otp_request"

    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), nullable=False)
    recipient_address: Mapped[str] = mapped_column(String(500), nullable=False)
    otp_purpose: Mapped[str] = mapped_column(String(100), nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(500), nullable=False)
    otp_length: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class OtpValidationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "otp_validation"

    otp_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("otp_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class UserNotificationPreferenceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "user_notification_preference"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_type: Mapped[str] = mapped_column(String(50), nullable=False, default="USER")
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    marketing_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    do_not_disturb: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dnd_start_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    dnd_end_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    language_preference: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="Asia/Kolkata")
    frequency_daily_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transactional_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    security_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    operational_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "tenant_id", name="uq_user_notification_pref"),
    )


class NotificationSubscriptionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_subscription"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_code: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    is_subscribed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "event_code", "channel", "tenant_id", name="uq_notification_subscription"),
    )


class DeliveryStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "delivery_status_history"

    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification.public_id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


class UserNotificationAlertModel(BaseEntity, EnterpriseBaseMixin):
    """
    User-facing in-app notification inbox.
    Stores per-user notification alerts with read/unread state.
    Created to support the /notifications/recent and mark-as-read endpoints.
    """
    __tablename__ = "user_notification_alert"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    notification_type: Mapped[str] = mapped_column(String(80), nullable=False, default="SYSTEM")
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNREAD")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    __table_args__ = (
        Index("ix_user_notif_alert_user_tenant", "user_id", "tenant_id"),
        Index("ix_user_notif_alert_unread", "user_id", "is_read"),
    )


class NotificationAnalyticsModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_analytics"

    analytics_day_key: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    analytics_month_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    analytics_year_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    total_queued: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_delivered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_read: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_bounced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_retried: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    open_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    click_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    bounce_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    failure_rate_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    provider_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)















