"""
Enterprise Sales Portal & Tenant-Isolated Hierarchy Management Models.

Strictly follows Pay2Pay enterprise standards:
- First column MUST be <table_name>_ref_id BIGINT PRIMARY KEY
- Complete tenant and company scoping
- Strict sales hierarchy mapping (Tenant -> Company -> Sales User -> SD -> Dist -> Retailer -> POS)
- Full enterprise audit logging with temporal financial keys (daykey, weekkey, monthkey, yearkey, financialyearkey)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    String, Text, Boolean, Integer, BigInteger, Numeric, DateTime, Index, UniqueConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SalesUserModel(Base):
    """
    Dedicated Sales User Identity Table.
    Assigned strictly to a Tenant and optionally to a Company.
    Managed only from Admin Portal.
    """
    __tablename__ = "sales_user"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_sales_user_tenant_email"),
        UniqueConstraint("tenant_id", "mobile", name="uq_sales_user_tenant_mobile"),
        UniqueConstraint("tenant_id", "employee_code", name="uq_sales_user_tenant_emp_code"),
        Index("idx_sales_user_tenant_comp", "tenant_id", "company_id"),
        Index("idx_sales_user_status", "status", "is_active"),
        Index("idx_sales_user_mobile", "mobile"),
        Index("idx_sales_user_email", "email"),
        {"extend_existing": True}
    )

    sales_user_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    # Scoping Identifiers
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    
    # Core User Credentials & Profile
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Assignment & Territory
    territory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # e.g. "North Region - Zone 2"
    department: Mapped[Optional[str]] = mapped_column(String(100), default="Field Sales", nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(100), default="Sales Officer", nullable=True)
    
    # Status & Life cycle
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True) # ACTIVE, INACTIVE, SUSPENDED
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class SalesHierarchyMappingModel(Base):
    """
    Mapping Table between Sales User and the Partner Hierarchy.
    Allows granular assignment:
    - ALL: Full tenant network visibility
    - SUPER_DISTRIBUTOR: Specific Super Distributor and all downstream Distributors & Retailers
    - DISTRIBUTOR: Specific Distributor and all downstream Retailers
    - RETAILER: Specific Retailers only
    """
    __tablename__ = "sales_hierarchy_mapping"
    __table_args__ = (
        Index("idx_shm_sales_user", "sales_user_id"),
        Index("idx_shm_tenant_comp", "tenant_id", "company_id"),
        Index("idx_shm_sd_id", "super_distributor_id"),
        Index("idx_shm_dist_id", "distributor_id"),
        Index("idx_shm_ret_id", "retailer_id"),
        Index("idx_shm_type_status", "mapping_type", "status", "is_active"),
        {"extend_existing": True}
    )

    sales_mapping_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    # Scoping Identifiers
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Sales User Association
    sales_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    sales_user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    
    # Hierarchy Target
    mapping_type: Mapped[str] = mapped_column(String(50), nullable=False, default="ALL", index=True) # ALL, SUPER_DISTRIBUTOR, DISTRIBUTOR, RETAILER
    super_distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    super_distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    retailer_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class SalesAuditLogModel(Base):
    """
    Dedicated Audit Log Table for all Sales Portal Interactions.
    Tracks view actions, configuration attempts, unauthorized cross-tenant attempts, etc.
    Captures temporal keys (daykey, weekkey, monthkey, yearkey, financialyearkey).
    """
    __tablename__ = "sales_audit_log"
    __table_args__ = (
        Index("idx_sal_tenant_id", "tenant_id"),
        Index("idx_sal_sales_user", "sales_user_id"),
        Index("idx_sal_action", "action"),
        Index("idx_sal_entity", "entity_type", "entity_ref_id"),
        Index("idx_sal_created_at", "created_at"),
        Index("idx_sal_status", "status"),
        {"extend_existing": True}
    )

    sales_audit_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    # Scoping Identifiers
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    
    # Actor Information
    sales_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    sales_user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    actor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Audit Event Details
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g. LOGIN, VIEW_RETAILER, VIEW_TRANSACTION, VIEW_POS, MDR_CHANGE, EXPORT_REPORT, UNAUTHORIZED_ATTEMPT
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g. RETAILER, POS_MACHINE, TRANSACTION, MDR_CONFIG, REPORT
    entity_ref_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    
    old_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS", nullable=False, index=True) # SUCCESS, UNAUTHORIZED, FAILED
    
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Temporal Keys for Enterprise BI / Reporting
    day_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    week_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    month_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    year_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    financial_year_key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)


class SalesActivityLogModel(Base):
    """
    Sales Activity & Partner Engagement Tracker.
    Captures sales field activities, retailer visits, onboarding support, and notes.
    """
    __tablename__ = "sales_activity_log"
    __table_args__ = (
        Index("idx_act_tenant_sales", "tenant_id", "sales_user_id"),
        Index("idx_act_retailer", "retailer_id"),
        Index("idx_act_type", "activity_type"),
        {"extend_existing": True}
    )

    activity_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    sales_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # RETAILER_VISIT, POS_ONBOARDING, INACTIVITY_FOLLOWUP, MDR_CONSULTATION, GENERAL_NOTE
    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # RESOLVED, PENDING_FOLLOWUP, COMPLETED
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
