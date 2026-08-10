import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, Float, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class RetailerVerificationModel(BaseEntity, EnterpriseBaseMixin):
    """Core verification request record for retailer onboarding."""
    __tablename__ = "retailer_verifications"
    __table_args__ = {"extend_existing": True}

    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    retailer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    retailer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    shop_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Statuses
    registration_status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUBMITTED")  # SUBMITTED, COMPLETED
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING", index=True) # PENDING, UNDER_REVIEW, APPROVED, REJECTED, ON_HOLD, NEED_INFO
    account_status: Mapped[str] = mapped_column(String(50), nullable=False, default="ONBOARDING")  # ONBOARDING, ACTIVE, SUSPENDED
    retailer_status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNDER_REVIEW") # UNDER_REVIEW, ACTIVE, ON_HOLD, REJECTED

    is_business: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pan_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=15)  # 0 to 100
    risk_category: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW") # LOW, MEDIUM, HIGH
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="NORMAL") # NORMAL, HIGH, URGENT

    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    assigned_admin_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class VerificationWorkflowModel(BaseEntity, EnterpriseBaseMixin):
    """Workflow state transitions and SLA tracking."""
    __tablename__ = "verification_workflows"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    registration_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    current_step: Mapped[str] = mapped_column(String(100), nullable=False, default="ADMIN_REVIEW")
    estimated_completion_mins: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    sla_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_escalated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class VerificationDocumentModel(BaseEntity, EnterpriseBaseMixin):
    """Uploaded compliance documents verification metadata."""
    __tablename__ = "verification_documents"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PAN, AADHAAR_FRONT, AADHAAR_BACK, SHOP_PHOTO, BANK_PROOF, GST_CERT, SELFIE, VIDEO
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False, default="image/jpeg")
    ocr_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="VERIFIED")  # PENDING, VERIFIED, REJECTED, REUPLOAD_REQUESTED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class VerificationReviewModel(BaseEntity, EnterpriseBaseMixin):
    """Detailed admin review checklist scores."""
    __tablename__ = "verification_reviews"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pan_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    gst_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    aadhaar_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    bank_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    liveness_video_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    location_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    admin_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)


class VerificationStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    """Immutable log of verification status transitions."""
    __tablename__ = "verification_status_history"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    previous_status: Mapped[str] = mapped_column(String(50), nullable=False)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    action_by_admin_id: Mapped[str] = mapped_column(String(100), nullable=False)
    remarks: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class VerificationCommentModel(BaseEntity, EnterpriseBaseMixin):
    """Admin notes & comments on verification requests."""
    __tablename__ = "verification_comments"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    admin_id: Mapped[str] = mapped_column(String(100), nullable=False)
    admin_role: Mapped[str] = mapped_column(String(50), nullable=False, default="COMPLIANCE_OFFICER")
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class VerificationNotificationModel(BaseEntity, EnterpriseBaseMixin):
    """System notification logs for retailer & admin."""
    __tablename__ = "verification_notifications"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    recipient_type: Mapped[str] = mapped_column(String(20), nullable=False)  # ADMIN, RETAILER
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # IN_APP, EMAIL, WHATSAPP, BROWSER
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class VerificationAuditModel(BaseEntity, EnterpriseBaseMixin):
    """Security audit trail for compliance operations."""
    __tablename__ = "verification_audits"
    __table_args__ = {"extend_existing": True}

    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # APPROVE, REJECT, ON_HOLD, NEED_INFO, UNDER_REVIEW
    admin_id: Mapped[str] = mapped_column(String(100), nullable=False)
    admin_role: Mapped[str] = mapped_column(String(50), nullable=False, default="COMPLIANCE_OFFICER")
    remarks: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False, default=lambda: str(uuid.uuid4()))
    trace_id: Mapped[str] = mapped_column(String(100), nullable=False, default=lambda: str(uuid.uuid4()))
