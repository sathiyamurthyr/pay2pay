"""
Enterprise PayIn Request, Response, and Webhook DTOs.
Strict adherence to the common PayIn contract across all companies,
with support for multi-vendor dynamic MDR and retailer top-up previews.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
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
    
    # Extended Multi-Vendor & Service parameters (optional with backward-compatible defaults)
    payment_mode: Optional[str] = Field("UPI", description="Payment Mode: UPI, QR, NETBANKING, CARD")
    service_type_code: Optional[str] = Field("UTILITY", description="Service Category Code")
    payment_mode_code: Optional[str] = Field(None, description="Detailed Mode Code: UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET")
    card_type_code: Optional[str] = Field(None, description="Card Classification Code: CREDIT_VISA, DEBIT_RUPAY, etc.")
    card_network: Optional[str] = Field(None, description="Card Network: VISA, MASTERCARD, RUPAY")
    vendor_code: Optional[str] = Field(None, description="Optional vendor override if authorized")
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
    total_charges: float = Field(0.0, description="Total charges (MDR + GST)")
    customer_payable: float = Field(..., description="Total amount customer must pay")
    retailer_credit: float = Field(..., description="Amount to be credited to retailer wallet")
    net_amount: Optional[float] = Field(None, description="Net amount credited to retailer (backward-compatible alias)")
    company_mdr_liability: float = Field(0.0, description="Company absorbed MDR liability")
    mdr_treatment: str = Field("DEDUCT_FROM_TOPUP", description="Applied MDR treatment")
    provider: str = Field(..., description="Resolved provider code (e.g. BANKME, EXISTING)")
    payment_url: Optional[str] = Field(None, description="Payment gateway checkout / intent URL")
    qr_string: Optional[str] = Field(None, description="Raw UPI payment URI / QR payload")
    qr_code_url: Optional[str] = Field(None, description="Visual QR code image URL")
    expires_at: Optional[str] = Field(None, description="Payment link / QR expiry timestamp")
    message: str = Field(..., description="Human-readable outcome description")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def model_post_init(self, __context: Any) -> None:
        if self.net_amount is None:
            self.net_amount = self.retailer_credit


class MdrPreviewRequest(BaseModel):
    """
    Retailer Top-Up Live MDR Preview Request.
    """
    amount: float = Field(..., gt=0, description="Top-up Amount in INR")
    service_type_code: Optional[str] = Field("UTILITY", description="Selected Service Type Code")
    payment_mode_code: Optional[str] = Field("UPI", description="Selected Payment Mode Code")
    card_type_code: Optional[str] = Field(None, description="Selected Card Type Code")
    card_network: Optional[str] = Field(None, description="Card Network")
    vendor_code: Optional[str] = Field(None, description="Vendor Code if explicitly selected")


class MdrPreviewResponse(BaseModel):
    """
    Live MDR Breakdown response calculated by backend.
    """
    success: bool = True
    txn_amount: float
    mdr_pct: float
    mdr_fixed: float
    mdr_amount: float
    tax_pct: float
    tax_amount: float
    total_charges: float
    customer_payable: float
    retailer_credit: float
    company_mdr_liability: float
    mdr_treatment: str
    rule_ref_id: Optional[int] = None
    vendor_name: str


class ServiceOptionItem(BaseModel):
    service_type_ref_id: int
    svc_code: str
    svc_name: str
    svc_desc: Optional[str]
    svc_icon: Optional[str]
    is_enabled: bool


class PaymentModeOptionItem(BaseModel):
    payment_mode_ref_id: int
    pay_mode_code: str
    pay_mode_name: str
    pay_mode_desc: Optional[str]
    pay_icon: Optional[str]
    is_enabled: bool


class CardTypeOptionItem(BaseModel):
    card_type_ref_id: int
    card_type_code: str
    card_type_name: str
    card_network: str
    is_enabled: bool


class VendorOptionItem(BaseModel):
    payin_vendor_ref_id: int
    vendor_code: str
    vendor_name: str
    provider_name: str
    is_default: bool


class PayInOptionsResponse(BaseModel):
    """
    Eligible options available for the authenticated retailer's company.
    """
    success: bool = True
    company_ref_id: int
    company_name: str
    min_amount: float
    max_amount: float
    services: List[ServiceOptionItem]
    payment_modes: List[PaymentModeOptionItem]
    card_types: List[CardTypeOptionItem]
    vendors: List[VendorOptionItem]


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
    total_charges: float = 0.0
    customer_payable: float = 0.0
    retailer_credit: float = 0.0
    provider: str
    ledger_txn_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BankMeWebhookPayload(BaseModel):
    """
    BankMe Inbound Webhook / Callback Payload.
    """
    event: Optional[str] = Field(None, description="Webhook Event Type (e.g. PAYMENT_SUCCESS, PAYMENT_FAILED)")
    tid: Optional[str] = Field(None, description="Our authoritative Transaction ID")
    merchant_tid: Optional[str] = Field(None, description="Merchant transaction ID alias for TID")
    reference_id: Optional[str] = Field(None, description="Merchant reference ID")
    bankme_ref: Optional[str] = Field(None, description="BankMe transaction ID / order ID")
    utr: Optional[str] = Field(None, description="Bank UTR / RRN")
    amount: Optional[float] = Field(None, description="Collected Amount")
    status: Optional[str] = Field(None, description="Provider status: SUCCESS, FAILED, PENDING")
    signature: Optional[str] = Field(None, description="HMAC / digital signature for verification")
    raw_payload: Optional[Dict[str, Any]] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.tid and self.merchant_tid:
            self.tid = self.merchant_tid
