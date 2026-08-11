"""EPIC-025 — Aadhaar Enabled Payment System (AEPS) Platform — DTOs"""
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Biometric Capture & AEPS Requests ─────────────────────────────────────────

class AepsTransferCreateRequest(BaseModel):
    customer_id: uuid.UUID
    retailer_id: uuid.UUID
    aadhaar_number: str = Field(..., min_length=12, max_length=12)
    bank_iin: str = Field(..., min_length=6, max_length=6)  # e.g., 607094 (SBI), 607152 (ICICI)
    service_type: str = "CASH_WITHDRAWAL"  # CASH_WITHDRAWAL, BALANCE_ENQUIRY, MINI_STATEMENT, CASH_DEPOSIT
    transaction_amount: float = Field(default=0.0, ge=0)
    biometric_type: str = "FINGERPRINT"
    device_serial_number: str
    vendor_name: str  # MANTRA, MORPHO, STARTEK, COGENT
    pid_block_encrypted: str


class AepsTransactionResponse(BaseModel):
    public_id: uuid.UUID
    transaction_number: str
    rrn: Optional[str]
    stan: Optional[str]
    customer_id: uuid.UUID
    retailer_id: uuid.UUID
    masked_aadhaar: str
    bank_iin: str
    bank_name: str
    service_type: str
    transaction_amount: float
    available_balance: Optional[float]
    retailer_commission: float
    transaction_status: str
    initiated_at: datetime
    completed_at: Optional[datetime]


class AepsDeviceRegisterRequest(BaseModel):
    device_serial_number: str
    vendor_name: str  # MANTRA, MORPHO, STARTEK, COGENT
    model_name: str
    rd_service_version: str = "1.0.4"
    firmware_version: str = "2.0.1"
    assigned_retailer_id: Optional[uuid.UUID] = None


class AepsDeviceResponse(BaseModel):
    public_id: uuid.UUID
    device_serial_number: str
    vendor_name: str
    model_name: str
    rd_service_version: str
    firmware_version: str
    device_status: str
    assigned_retailer_id: Optional[uuid.UUID]


class AepsDashboardMetricsResponse(BaseModel):
    today_transfers_count: int
    today_volume_amount: float
    cash_withdrawals_count: int
    balance_enquiries_count: int
    success_rate_pct: float
    failure_rate_pct: float
    active_devices_count: int
    service_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]


class AepsSearchRequest(BaseModel):
    query: Optional[str] = None
    customer_id: Optional[uuid.UUID] = None
    retailer_id: Optional[uuid.UUID] = None
    service_type: Optional[str] = None
    transaction_status: Optional[str] = None
    page: int = 1
    page_size: int = 20
