import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
UUID = Uuid(as_uuid=True)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BaseEntity(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID, default=uuid.uuid4, unique=True, nullable=False, index=True
    )


class EnterpriseBaseMixin:
    """
    Mandatory Enterprise Base Entity fields adhering to enterprise standards.
    """
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False, index=True)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID, nullable=True, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID, nullable=True, index=True)
    business_unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID, nullable=True)
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID, nullable=True)

    # Date & Partition Keys
    day_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    week_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    month_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    quarter_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    year_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    financial_year_key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    financial_quarter_key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    financial_month_key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    date_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    time_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    partition_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    partition_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    partition_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Audit & Versioning
    created_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    version_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    record_status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
