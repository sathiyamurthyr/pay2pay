"""
Enterprise PayIn Request, Response, and Webhook DTOs.
Strict adherence to the common PayIn contract across all companies.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone


class CommonPayInRequest(BaseModel):
    """
    Common PayIn API Request Contract.
    Unified across all companies. Authentication and Company Ref ID
    are strictly resolved from server-side session context.
    """
    amount: float = Field(..., gt=0, description="Collection amount in INR (minimum ₹1.00)")
    customer_name: str = Field(..., min_length=2, max_length=150, description="Customer Full Name")
    customer_mobile: str = Field(..., min_length=10, max_length=15, description="Customer Mobile Number")
    customer_email: Optional[str] = Field(None, description="Customer Email Address")
    reference_id: str = Field(..., min_length=3, max_length=100, description="Unique Merchant / Retailer Reference ID")
    callback_url: Optional[str] = Field(None, max_length=500, description="Client Webhook Callback URL")
    payment_mode: Optional[str] = Field("UPI", description="Payment Mode: UPI, QR, NETBANKING, CARD")
    note: Optional[str] = Field(None, max_length=255, description="Optional Transaction Remark or Note")


class CommonPayInResponse(BaseModel):
    """
    Common PayIn API Response Contract.
    Returned to all clients regardless of underlying provider.
    """
    success: bool = Field(..., description="Whether initiation succeeded")
    status: str = Field(..., description="Transaction status: INITIATED, PENDING, SUCCESS, FAILED")
    tid: str = Field(..., description="Authoritative immutable Transaction ID")
    merchant_reference: str = Field(..., description="Merchant supplied reference ID")
    provider_reference: Optional[str] = Field(None, description="Gateway provider reference ID")
    amount: float = Field(..., description="Transaction gross amount")
    mdr_charge: float = Field(0.0, description="Calculated MDR charge")
    gst_amount: float = Field(0.0, description="Calculated 18% GST on MDR")
    net_amount: float = Field(..., description="Net settlement amount (gross - mdr - gst)")
    provider: str = Field(..., description="Resolved provider code (e.g. BANKME, EXISTING)")
    payment_url: Optional[str] = Field(None, description="Payment gateway checkout / intent URL")
    qr_string: Optional[str] = Field(None, description="Raw UPI payment URI / QR payload")
    qr_code_url: Optional[str] = Field(None, description="Visual QR code image URL")
    expires_at: Optional[str] = Field(None, description="Payment link / QR expiry timestamp")
    message: str = Field(..., description="Human-readable outcome description")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PayInStatusResponse(BaseModel):
    """
    Transaction Status Inquiry Response.
    """
    success: bool
    tid: str
    merchant_reference: str
    provider_reference: Optional[str] = None
    status: str
    amount: float
    mdr_charge: float = 0.0
    gst_amount: float = 0.0
    net_amount: float
    provider: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BankMeWebhookPayload(BaseModel):
    """
    BankMe Inbound Webhook / Callback Payload.
    """
    event: Optional[str] = Field(None, description="Webhook Event Type (e.g. PAYMENT_SUCCESS, PAYMENT_FAILED)")
    tid: Optional[str] = Field(None, description="Our authoritative Transaction ID")
    reference_id: Optional[str] = Field(None, description="Merchant reference ID")
    bankme_ref: Optional[str] = Field(None, description="BankMe transaction ID / order ID")
    utr: Optional[str] = Field(None, description="Bank UTR / RRN")
    amount: Optional[float] = Field(None, description="Collected Amount")
    status: Optional[str] = Field(None, description="Provider status: SUCCESS, FAILED, PENDING")
    signature: Optional[str] = Field(None, description="HMAC / digital signature for verification")
    raw_payload: Optional[Dict[str, Any]] = None

