"""
EPIC — Bank Master & IFSC Directory — ORM Models
Single Master Table storing Bank List, IFSC, IMPS/NEFT status, and Credit Card banks.
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class BankMasterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_master"
    __table_args__ = {'extend_existing': True}

    bank_ifsc_ref_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    bank_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bank_name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    short_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ifsc: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    ifsc_prefix: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    imps_status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    neft_status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    is_credit_card: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    validation_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="VALIDATED")
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1 = Active, 0 = Inactive
