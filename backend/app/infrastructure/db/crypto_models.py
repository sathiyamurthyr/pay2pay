import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    DateTime, Integer, String, Text, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class RetailerEncryptedRecordModel(BaseEntity, EnterpriseBaseMixin):
    """
    Enterprise Data-at-Rest Encrypted Record Store.
    Stores sensitive business data (customer PII, invoice amounts, vendor negotiations,
    payment payloads, and private notes) using AES-256-GCM envelope encryption.
    """
    __tablename__ = "retailer_encrypted_records"

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # ORDER_NOTE | INVOICE | CUSTOMER_DATA | PRIVATE_NOTE | PAYMENT_PAYLOAD
    resource_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    
    # Standardized AES-256-GCM Envelope: {"v": 1, "alg": "AES-256-GCM", "iv": "...", "ciphertext": "...", "tag": "..."}
    encrypted_envelope: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    key_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    metadata_tags: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
