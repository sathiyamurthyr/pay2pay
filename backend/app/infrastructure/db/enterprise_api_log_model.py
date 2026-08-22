import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    BigInteger, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, JSON
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, UUID, Base


class EnterpriseApiLogModel(BaseEntity, EnterpriseBaseMixin):
    """
    Centralized Enterprise API Request & Response Log Model.
    Captures complete technical troubleshooting, audit visibility,
    and end-to-end transaction lifecycle tracing across inbound, outbound, and internal communication.
    """
    __tablename__ = "enterprise_api_log"
    __table_args__ = (
        Index("ix_enterprise_api_log_txn_id", "transaction_id"),
        Index("ix_enterprise_api_log_req_id", "request_id"),
        Index("ix_enterprise_api_log_corr_id", "correlation_id"),
        Index("ix_enterprise_api_log_client_ref", "client_reference_id"),
        Index("ix_enterprise_api_log_provider_ref", "provider_reference_id"),
        Index("ix_enterprise_api_log_service", "service_name"),
        Index("ix_enterprise_api_log_direction", "direction"),
        Index("ix_enterprise_api_log_method", "http_method"),
        Index("ix_enterprise_api_log_provider", "provider_name"),
        Index("ix_enterprise_api_log_resp_status", "response_status"),
        Index("ix_enterprise_api_log_http_code", "http_status_code"),
        Index("ix_enterprise_api_log_created", "created_date"),
        Index("ix_enterprise_api_log_retailer", "retailer_id"),
        {"extend_existing": True},
    )

    # Identifiers & Correlation
    log_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    client_reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    provider_reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    parent_request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Classification & Routing
    service_name: Mapped[str] = mapped_column(String(50), nullable=False, default="GENERAL") # PAYOUT, DMT, RECHARGE, BBPS, TOPUP, WALLET, BENEFICIARY, KYC, CARD_TO_CASH, AUTH, SETTLEMENT, SYSTEM
    api_name: Mapped[str] = mapped_column(String(200), nullable=False, default="Enterprise API Call")
    direction: Mapped[str] = mapped_column(String(20), nullable=False, default="INBOUND") # INBOUND, OUTBOUND, INTERNAL
    http_method: Mapped[str] = mapped_column(String(10), nullable=False, default="POST") # GET, POST, PUT, DELETE, PATCH
    endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    base_url_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    environment: Mapped[str] = mapped_column(String(30), nullable=False, default="PRODUCTION")

    # Actors & Parties
    client_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # Retailer Portal Web, Android App, Admin Portal
    client_ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # WowPe, BulkPe, Cashfree, NSDL, NPCI, etc.
    retailer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    performed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Timing & Performance
    request_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    response_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # HTTP & Business Status
    http_status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    response_status: Mapped[str] = mapped_column(String(30), nullable=False, default="SUCCESS") # SUCCESS, FAILED, TIMEOUT, PENDING, PROCESSING, HTTP_ERROR, VALIDATION_ERROR, NETWORK_ERROR, CANCELLED
    provider_response_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider_response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Error Tracking
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Payloads & Headers (Masked)
    request_headers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    request_query: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    request_body: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    request_body_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    response_headers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    response_body: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    response_body_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Truncation & Size Metadata
    payload_truncated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    original_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stored_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
