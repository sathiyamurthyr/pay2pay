"""EPIC-024 — Domestic Money Transfer (DMT) Transaction Engine — DTOs"""
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Charge Calculation ────────────────────────────────────────────────────────

class DmtChargeCalculateRequest(BaseModel):
    transfer_amount: float = Field(..., gt=0)
    transaction_mode: str = "IMPS"  # IMPS, NEFT, RTGS
    customer_id: uuid.UUID
    beneficiary_id: uuid.UUID


class DmtChargeCalculateResponse(BaseModel):
    transfer_amount: float
    transaction_mode: str
    service_charge: float
    gst_amount: float
    total_debit_amount: float
    net_beneficiary_credit: float
    retailer_commission: float
    distributor_commission: float


# ── Transfer Initiation ───────────────────────────────────────────────────────

class DmtTransferCreateRequest(BaseModel):
    customer_id: uuid.UUID
    beneficiary_id: uuid.UUID
    retailer_id: uuid.UUID
    transfer_amount: float = Field(..., gt=0)
    transaction_mode: str = "IMPS"
    purpose: Optional[str] = "Family Maintenance"
    remarks: Optional[str] = None
    otp: Optional[str] = None


class DmtTransactionResponse(BaseModel):
    public_id: uuid.UUID
    transaction_number: str
    rrn: Optional[str]
    utr: Optional[str]
    customer_id: uuid.UUID
    beneficiary_id: uuid.UUID
    retailer_id: uuid.UUID
    transaction_mode: str
    transfer_amount: float
    service_charge: float
    gst_amount: float
    total_debit_amount: float
    bank_account_number: str
    bank_ifsc: str
    bank_name: str
    beneficiary_name: str
    transaction_status: str
    initiated_at: datetime
    completed_at: Optional[datetime]


class DmtReversalRequest(BaseModel):
    reason: str


class DmtReversalResponse(BaseModel):
    reversal_id: uuid.UUID
    reversal_number: str
    transaction_number: str
    reversal_amount: float
    reversal_status: str
    reversed_at: datetime


class DmtDashboardMetricsResponse(BaseModel):
    today_transfers_count: int
    today_volume_amount: float
    success_rate_pct: float
    failure_rate_pct: float
    pending_transfers_count: int
    reversals_count: int
    mode_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]


class DmtSearchRequest(BaseModel):
    query: Optional[str] = None
    customer_id: Optional[uuid.UUID] = None
    beneficiary_id: Optional[uuid.UUID] = None
    retailer_id: Optional[uuid.UUID] = None
    transaction_status: Optional[str] = None
    transaction_mode: Optional[str] = None
    page: int = 1
    page_size: int = 20
