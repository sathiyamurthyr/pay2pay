"""
Company Profile ORM Model.

Table conventions:
- First column: `company_profile_ref_id BIGINT AUTO_INCREMENT PRIMARY KEY`
- Links to `public.company.company_ref_id` (unique per company) and `company_id` / `tenant_ref_id`
- Stores all 4 Admin Company Profile sections cleanly with created/updated audit timestamps
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CompanyProfileModel(Base):
    """Authoritative Admin-managed corporate profile for each company."""

    __tablename__ = "company_profile"

    company_profile_ref_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True
    )
    company_ref_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("company.company_ref_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # A. Company Branding & Header
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    company_legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand_name: Mapped[str] = mapped_column(String(255), nullable=False)
    operating_partner_info: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    corporate_portal_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    regulatory_status_badge: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # B. Corporate Entity Profile
    cin_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    business_entity_type: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    industry_sector: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    operating_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_badge: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # C. Merchant Helpdesk & Support Channels
    support_helpline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    support_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    operating_hours: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    direct_operations_line: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # D. Registered Headquarters & Grievance Redressal
    registered_office_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    official_website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    grievance_officer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    grievance_officer_designation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    grievance_escalation_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tat_level_1: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    tat_level_2: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Status & Audit Timestamps
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_ref_id", name="uq_company_profile_company_ref_id"),
        {"extend_existing": True},
    )
