"""
Enterprise Payout Gateway & Dynamic Provider Routing Database Models.
Stores persistent configurations, priority routing rules, credentials, and health metrics
for Payout Providers (BulkPe, WowPe, etc.).
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Boolean, Float, Integer, DateTime, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.infrastructure.db.models import BaseEntity, EnterpriseBaseMixin


class PayoutGatewayConfigModel(BaseEntity, EnterpriseBaseMixin):
    """Configuration & credentials for individual payout providers (BulkPe, WowPe)."""
    __tablename__ = "payout_gateway_configs"
    __table_args__ = (
        UniqueConstraint("provider_code", name="uq_payout_gateway_provider_code"),
        {'extend_existing': True}
    )

    provider_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    provider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    secret_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE", index=True)  # ACTIVE, INACTIVE, MAINTENANCE
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)  # 1 = Highest
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    supports_imps: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    supports_neft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    supports_rtgs: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    supports_upi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    supports_account_validation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    daily_limit: Mapped[float] = mapped_column(Float, nullable=False, default=5000000.0)
    current_day_volume: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    success_rate: Mapped[float] = mapped_column(Float, nullable=False, default=99.8)
    
    last_balance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_balance_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_health_check_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PayoutRoutingPolicyModel(BaseEntity, EnterpriseBaseMixin):
    """System-wide payout routing policy controlled by Super Admin / Admin."""
    __tablename__ = "payout_routing_policies"
    __table_args__ = {'extend_existing': True}

    routing_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="PRIORITY")  # PRIORITY, MANUAL_SWITCH, FAILOVER
    active_primary_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="WOWPE")  # WOWPE or BULKPE
    auto_failover_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    failover_threshold_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False, default="ADMIN")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
