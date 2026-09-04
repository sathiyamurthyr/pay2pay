"""
EPIC — Cashfree Reverse Penny Drop (VRS v2) DTOs
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ReversePennyDropCreateRequest(BaseModel):
    retailer_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    customer_id: Optional[str] = None
    name: str = Field(..., description="Customer Name for verification")
    phone: str = Field(..., description="Customer Mobile Number")
    amount: float = Field(default=1.0, description="Nominal ₹1 amount for reverse penny drop")


class ReversePennyDropCreateResponse(BaseModel):
    success: bool
    status: str  # PENDING, COMPLETED, EXPIRED
    verification_id: str
    upi_link: str
    qr_code_url: str
    created_at: str
    expires_at: str
    raw_vendor_response: Optional[Dict[str, Any]] = None
    message: str


class ReversePennyDropStatusResponse(BaseModel):
    success: bool
    verification_id: str
    status: str  # PENDING, SUCCESS, FAILED
    account_status: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    bank_name: Optional[str] = None
    vpa: Optional[str] = None
    utr: Optional[str] = None
    raw_vendor_response: Optional[Dict[str, Any]] = None
    message: str
