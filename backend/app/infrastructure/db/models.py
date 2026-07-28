import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, AuditMixin, BusinessMixin, VersionedMixin, SoftDeleteMixin


class TenantModel(BaseEntity, AuditMixin, VersionedMixin, SoftDeleteMixin):
    __tablename__ = "tenant"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    companies: Mapped[List["CompanyModel"]] = relationship("CompanyModel", back_populates="tenant")


class CompanyModel(BaseEntity, AuditMixin, VersionedMixin, SoftDeleteMixin):
    __tablename__ = "company"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenant.public_id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    tenant: Mapped["TenantModel"] = relationship("TenantModel", back_populates="companies")
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_company_tenant_code"),)


class EntityModel(BaseEntity, AuditMixin, BusinessMixin, VersionedMixin, SoftDeleteMixin):
    __tablename__ = "entity"

    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., BRANCH, REGION, STORE
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    attributes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class AdminUserModel(BaseEntity, AuditMixin, BusinessMixin, VersionedMixin, SoftDeleteMixin):
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


class RoleModel(BaseEntity, AuditMixin, VersionedMixin, SoftDeleteMixin):
    __tablename__ = "role"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    role_permissions: Mapped[List["RolePermissionModel"]] = relationship("RolePermissionModel", back_populates="role", cascade="all, delete-orphan")
    user_roles: Mapped[List["UserRoleModel"]] = relationship("UserRoleModel", back_populates="role", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_role_tenant_code"),)


class PermissionModel(BaseEntity, AuditMixin):
    __tablename__ = "permission"

    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT, IMPORT, MANAGE
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    role_permissions: Mapped[List["RolePermissionModel"]] = relationship("RolePermissionModel", back_populates="permission", cascade="all, delete-orphan")


class RolePermissionModel(BaseEntity, AuditMixin):
    __tablename__ = "role_permission"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("role.id", ondelete="CASCADE"), nullable=False)
    permission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("permission.id", ondelete="CASCADE"), nullable=False)

    role: Mapped["RoleModel"] = relationship("RoleModel", back_populates="role_permissions")
    permission: Mapped["PermissionModel"] = relationship("PermissionModel", back_populates="role_permissions")

    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)


class UserRoleModel(BaseEntity, AuditMixin):
    __tablename__ = "user_role"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
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
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXPORT, IMPORT, APPROVE, REJECT
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)


class SystemConfigurationModel(BaseEntity, AuditMixin, VersionedMixin):
    __tablename__ = "system_configuration"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (UniqueConstraint("tenant_id", "key", name="uq_system_config_tenant_key"),)


class UserSessionModel(BaseEntity):
    __tablename__ = "user_session"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    token_jti: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["AdminUserModel"] = relationship("AdminUserModel", back_populates="sessions")


class ApiKeyModel(BaseEntity, AuditMixin, SoftDeleteMixin):
    __tablename__ = "api_key"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False)
    scopes: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordResetTokenModel(BaseEntity):
    __tablename__ = "password_reset_token"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_user.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
