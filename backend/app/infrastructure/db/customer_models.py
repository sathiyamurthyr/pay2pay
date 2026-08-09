"""EPIC-021 — Customer Lifecycle, KYC & Service Eligibility — ORM Models"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class CustomerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer"

    customer_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    customer_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    customer_type: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    preferred_language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    preferred_channel: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    referral_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    referred_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    introduced_by_retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    kyc_level: Mapped[str] = mapped_column(String(50), nullable=False)
    kyc_status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    risk_category: Mapped[str] = mapped_column(String(30), nullable=False)
    customer_status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    registration_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    activation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_active_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # MPIN Security Fields
    mpin_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    mpin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mpin_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    mpin_last_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    cust_profile: Mapped[Optional["CustomerProfileModel"]] = relationship("CustomerProfileModel", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    cust_addresses: Mapped[List["CustomerAddressModel"]] = relationship("CustomerAddressModel", back_populates="customer", cascade="all, delete-orphan")
    cust_identities: Mapped[List["CustomerIdentityModel"]] = relationship("CustomerIdentityModel", back_populates="customer", cascade="all, delete-orphan")
    cust_kyc_records: Mapped[List["CustomerKycModel"]] = relationship("CustomerKycModel", back_populates="customer", cascade="all, delete-orphan")
    cust_documents: Mapped[List["CustomerDocumentModel"]] = relationship("CustomerDocumentModel", back_populates="customer", cascade="all, delete-orphan")
    cust_services: Mapped[List["CustomerServiceModel"]] = relationship("CustomerServiceModel", back_populates="customer", cascade="all, delete-orphan")
    cust_limit_overrides: Mapped[List["CustomerLimitOverrideModel"]] = relationship("CustomerLimitOverrideModel", back_populates="customer", cascade="all, delete-orphan")
    cust_risk_profile: Mapped[Optional["CustomerRiskProfileModel"]] = relationship("CustomerRiskProfileModel", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    cust_status_history: Mapped[List["CustomerStatusHistoryModel"]] = relationship("CustomerStatusHistoryModel", back_populates="customer", cascade="all, delete-orphan")
    cust_relationships: Mapped[List["CustomerRelationshipModel"]] = relationship("CustomerRelationshipModel", back_populates="customer", cascade="all, delete-orphan")
    cust_timeline: Mapped[List["CustomerTimelineModel"]] = relationship("CustomerTimelineModel", back_populates="customer", cascade="all, delete-orphan")
    cust_preference: Mapped[Optional["CustomerPreferenceModel"]] = relationship("CustomerPreferenceModel", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    cust_consents: Mapped[List["CustomerConsentModel"]] = relationship("CustomerConsentModel", back_populates="customer", cascade="all, delete-orphan")
    cust_whitelists: Mapped[List["CustomerWhitelistModel"]] = relationship("CustomerWhitelistModel", back_populates="customer", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "customer_number", name="uq_customer_tenant_number"),
        UniqueConstraint("tenant_id", "mobile_number", name="uq_customer_tenant_mobile"),
    )


class CustomerProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_profile"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    signature_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    father_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    mother_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    spouse_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    annual_income: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    income_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    education: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    marital_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    politically_exposed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_nri: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_minor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    guardian_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    guardian_relation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    profile_completeness_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_profile")


class CustomerAddressModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_address"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    address_type: Mapped[str] = mapped_column(String(30), nullable=False)
    address_line1: Mapped[str] = mapped_column(String(500), nullable=False)
    address_line2: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    landmark: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    village: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    proof_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    proof_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_addresses")


class CustomerIdentityModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_identity"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    identity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    identity_number: Mapped[str] = mapped_column(String(100), nullable=False)
    identity_number_masked: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    name_on_document: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    dob_on_document: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    issuing_authority: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verification_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_identities")

    __table_args__ = (
        UniqueConstraint("tenant_id", "identity_type", "identity_number", name="uq_customer_identity_tenant_type_number"),
    )


class CustomerKycModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_kyc"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    kyc_level: Mapped[str] = mapped_column(String(50), nullable=False)
    kyc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    kyc_status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    submission_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    face_match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    liveness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    document_verification_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    aadhaar_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pan_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    bank_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ckyc_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ckyc_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    kyc_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    re_kyc_due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_kyc_records")


class CustomerDocumentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_document"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    document_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_documents")


class CustomerServiceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_service"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    eligibility_status: Mapped[str] = mapped_column(String(30), nullable=False)
    eligibility_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    enabled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    disabled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cooling_period_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_services")

    __table_args__ = (
        UniqueConstraint("customer_id", "service_code", name="uq_customer_service"),
    )


class CustomerServiceConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_service_configuration"

    service_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requires_full_kyc: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    minimum_kyc_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    minimum_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    maximum_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cooling_period_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_beneficiaries: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    risk_validation_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allowed_categories: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    blocked_categories: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    config_status: Mapped[str] = mapped_column(String(30), nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "service_code", name="uq_service_config_tenant_code"),
    )


class CustomerLimitConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_limit_configuration"

    service_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    hierarchy_level: Mapped[str] = mapped_column(String(50), nullable=False)
    hierarchy_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    customer_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    kyc_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    single_txn_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    single_txn_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    daily_txn_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    daily_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weekly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_txn_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    monthly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quarterly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    yearly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_outstanding: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_failed_attempts: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_beneficiaries: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cooling_period_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    override_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    limit_status: Mapped[str] = mapped_column(String(30), nullable=False)


class CustomerLimitOverrideModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_limit_override"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    override_type: Mapped[str] = mapped_column(String(50), nullable=False)
    single_txn_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    daily_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    yearly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approval_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    override_status: Mapped[str] = mapped_column(String(30), nullable=False)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_limit_overrides")


class CustomerTransactionCounterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_transaction_counter"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counter_date: Mapped[date] = mapped_column(Date, nullable=False)
    txn_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("customer_id", "service_code", "counter_date", name="uq_daily_counter"),
    )


class CustomerMonthlyCounterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_monthly_counter"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counter_year: Mapped[int] = mapped_column(Integer, nullable=False)
    counter_month: Mapped[int] = mapped_column(Integer, nullable=False)
    txn_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("customer_id", "service_code", "counter_year", "counter_month", name="uq_monthly_counter"),
    )


class CustomerYearlyCounterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_yearly_counter"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counter_year: Mapped[int] = mapped_column(Integer, nullable=False)
    txn_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("customer_id", "service_code", "counter_year", name="uq_yearly_counter"),
    )


class CustomerRiskProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_risk_profile"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    aml_level: Mapped[str] = mapped_column(String(30), nullable=False)
    is_pep: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pep_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sanction_check_result: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    sanction_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    watch_list_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    geo_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    behaviour_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    velocity_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    device_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ip_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_review_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    risk_factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_risk_profile")


class CustomerStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_status_history"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reason_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    changed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    changed_by_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_status_history")


class CustomerRelationshipModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_relationship"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    related_name: Mapped[str] = mapped_column(String(300), nullable=False)
    related_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    related_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    related_customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    identity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    identity_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    share_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active_rel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_relationships")


class CustomerTimelineModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_timeline"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    event_code: Mapped[str] = mapped_column(String(100), nullable=False)
    event_title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    performed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    performed_by_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_timeline")


class CustomerPreferenceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_preference"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    notification_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notification_sms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notification_whatsapp: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notification_push: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Kolkata")
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    biometric_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    marketing_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_sharing_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    preferred_upi_app: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_preference")


class CustomerConsentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_consent"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    consent_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consent_version: Mapped[str] = mapped_column(String(20), nullable=False)
    is_given: Mapped[bool] = mapped_column(Boolean, nullable=False)
    given_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    channel: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_consents")


class CustomerBlacklistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_blacklist"

    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    blacklist_type: Mapped[str] = mapped_column(String(50), nullable=False)
    identity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    identity_value: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    mobile_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    reason_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    blacklisted_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    blacklist_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_permanent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_system: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    blacklist_status: Mapped[str] = mapped_column(String(30), nullable=False)


class CustomerWhitelistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_whitelist"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    whitelist_type: Mapped[str] = mapped_column(String(50), nullable=False)
    service_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    override_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    whitelist_status: Mapped[str] = mapped_column(String(30), nullable=False)

    customer: Mapped["CustomerModel"] = relationship("CustomerModel", back_populates="cust_whitelists")
