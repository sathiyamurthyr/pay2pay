import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class RegistrationDraftModel(BaseEntity, EnterpriseBaseMixin):
    """Core progressive registration draft tracking table."""
    __tablename__ = "registration_drafts"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    completed_steps: Mapped[List[int]] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT")  # DRAFT, MOBILE_VERIFIED, EMAIL_VERIFIED, KYC_PENDING, KYC_SUBMITTED, KYC_APPROVED
    is_business: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    draft_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RegistrationProgressModel(BaseEntity, EnterpriseBaseMixin):
    """Step-by-step audit progress log."""
    __tablename__ = "registration_progress"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    payload_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class RegistrationPanModel(BaseEntity, EnterpriseBaseMixin):
    """Verified PAN records for onboarding."""
    __tablename__ = "registration_pan"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pan_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    pan_holder_name: Mapped[str] = mapped_column(String(255), nullable=False)
    pan_type: Mapped[str] = mapped_column(String(50), nullable=False, default="INDIVIDUAL")  # INDIVIDUAL, COMPANY, FIRM, LLP
    pan_status: Mapped[str] = mapped_column(String(50), nullable=False, default="VALID")
    verification_raw: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class RegistrationGstModel(BaseEntity, EnterpriseBaseMixin):
    """Verified GST records for business onboarding."""
    __tablename__ = "registration_gst"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    gst_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    legal_business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    business_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gst_status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    address_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class RegistrationAadhaarModel(BaseEntity, EnterpriseBaseMixin):
    """Verified Aadhaar records for onboarding."""
    __tablename__ = "registration_aadhaar"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    aadhaar_masked: Mapped[str] = mapped_column(String(20), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class RegistrationBankModel(BaseEntity, EnterpriseBaseMixin):
    """Verified Bank Account records via Reverse Penny Drop."""
    __tablename__ = "registration_bank"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    account_number_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name_at_bank: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False, default="SAVINGS")
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="VERIFIED")


class RegistrationShopModel(BaseEntity, EnterpriseBaseMixin):
    """Shop & Business details."""
    __tablename__ = "registration_shop"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    shop_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    years_in_business: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    employees: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    monthly_estimate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    annual_turnover: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class RegistrationAddressModel(BaseEntity, EnterpriseBaseMixin):
    """Shop physical address and geolocation."""
    __tablename__ = "registration_address"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False, default="India")
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shop_photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class RegistrationDocumentModel(BaseEntity, EnterpriseBaseMixin):
    """Uploaded KYC documents."""
    __tablename__ = "registration_documents"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PAN, AADHAAR, CHEQUE, SHOP_PHOTO, SELFIE, GST
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="image/jpeg")
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class RegistrationVideoModel(BaseEntity, EnterpriseBaseMixin):
    """Live Video Verification recording."""
    __tablename__ = "registration_video"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    video_url: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    script_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class RegistrationAuditModel(BaseEntity, EnterpriseBaseMixin):
    """Security and audit trail for onboarding operations."""
    __tablename__ = "registration_audit"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
