import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
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


class AdminUserModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "admin_user"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
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

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_bank_name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_holder: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc: Mapped[str] = mapped_column(String(11), nullable=False)
    branch: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="banks")


class RetailerKycModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_kyc"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    aadhaar_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    business_proof_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    aadhaar_front_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    aadhaar_back_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    retailer: Mapped["RetailerModel"] = relationship("RetailerModel", back_populates="kyc")


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


class FraudAlertModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "fraud_alert"

    transaction_ref: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    risk_level: Mapped[str] = mapped_column(String(30), default="HIGH", nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    reason: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False, index=True)  # OPEN, CLEARED, CONFIRMED_FRAUD


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





