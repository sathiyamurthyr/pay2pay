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
    customer_payable_policy: Optional[str] = Field("WITH_MDR", description="Policy code: WITH_MDR or WITHOUT_MDR")
    policy_display_name: Optional[str] = Field("Customer Pays MDR Charges", description="Policy display name")
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
    customer_payable_policy: Optional[str] = "WITH_MDR"
    policy_display_name: Optional[str] = "Customer Pays MDR Charges"


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


class CardSchemeMdrItem(BaseModel):
    """
    Informational card scheme display item with Admin-configured MDR rate.
    Strictly isolated by the authenticated retailer's Company Ref ID.
    """
    id: str
    name: str
    category: str
    card_network: str
    mdr_percent: Optional[float] = None
    mdr_display: str
    mdr_treatment: Optional[str] = None
    is_configured: bool = False
    is_active: bool = True
    brand_color: str
    icon_text: str
    rule_ref_id: Optional[int] = None


class VendorOptionItem(BaseModel):
    payin_vendor_ref_id: int
    vendor_code: str
    vendor_name: str
    provider_name: str
    is_default: bool
    gateway_code: Optional[str] = "G-1"
    display_name: Optional[str] = "Gateway G-1"
    subtitle: Optional[str] = "Primary Payment Gateway"
    description: Optional[str] = "Fast and secure payment processing with instant confirmation."
    display_order: Optional[int] = 1
    badge: Optional[str] = "Active"
    badge_color: Optional[str] = "#10B981"
    is_active: Optional[bool] = True
    is_enabled: Optional[bool] = True
    supported_methods: List[str] = ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"]


class GatewayConfigItemResponse(BaseModel):
    payin_company_vendor_ref_id: int
    company_ref_id: int
    company_name: str
    payin_vendor_ref_id: int
    vendor_code: str
    internal_provider_name: str
    gateway_code: str
    retailer_display_name: str
    description: str
    display_order: int
    status: str
    is_enabled: bool
    is_default: bool
    updated_by: str
    updated_at: str


class UpdateGatewayConfigRequest(BaseModel):
    retailer_display_name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=255)
    display_order: Optional[int] = Field(None, ge=1, le=100)
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE)$")
    is_enabled: Optional[bool] = None


class CreateGatewayConfigRequest(BaseModel):
    company_ref_id: int
    payin_vendor_ref_id: int
    gateway_code: str = Field(..., min_length=1, max_length=50)
    retailer_display_name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = Field("Fast and secure payment processing with instant confirmation.", max_length=255)
    display_order: Optional[int] = Field(1, ge=1, le=100)
    status: Optional[str] = Field("ACTIVE", pattern="^(ACTIVE|INACTIVE)$")
    is_enabled: Optional[bool] = True


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
    card_schemes: List[CardSchemeMdrItem] = []
    customer_payable_policy: Optional[str] = "WITH_MDR"
    policy_display_name: Optional[str] = "Customer Pays MDR Charges"
    mdr_treatment: Optional[str] = "COLLECT_ADDITIONALLY"


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
    card_network: Optional[str] = None
    mdr_treatment: Optional[str] = None
    customer_payable_policy: Optional[str] = None
    policy_display_name: Optional[str] = None
    ledger_txn_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BankMeWebhookPayload(BaseModel):
    """
    BankMe Inbound Webhook / Callback Payload.
    Official BankMe webhook body fields:
    event: payin.success | payin.failed
    orderId: BankMe order id
    referenceId: Merchant order reference (our TID)
    amount, fee, netAmount, status, utr, settlementStatus, reason, environment
    """
    event: Optional[str] = Field(None, description="Webhook Event Type (e.g. payin.success, payin.failed)")
    tid: Optional[str] = Field(None, description="Our authoritative Transaction ID")
    referenceId: Optional[str] = Field(None, description="BankMe referenceId (maps to TID)")
    reference_id: Optional[str] = Field(None, description="Merchant reference ID alias")
    merchant_tid: Optional[str] = Field(None, description="Merchant transaction ID alias for TID")
    orderId: Optional[str] = Field(None, description="BankMe order ID")
    bankme_ref: Optional[str] = Field(None, description="BankMe transaction ID / order ID alias")
    utr: Optional[str] = Field(None, description="Bank UTR / RRN")
    amount: Optional[float] = Field(None, description="Collected Amount")
    fee: Optional[float] = Field(None, description="BankMe Fee")
    netAmount: Optional[float] = Field(None, description="Net Amount credited to BankMe wallet")
    status: Optional[str] = Field(None, description="Provider status: pending, success, failed, expired")
    settlementStatus: Optional[str] = Field(None, description="Settlement status: pending, settled")
    reason: Optional[str] = Field(None, description="Failure reason")
    environment: Optional[str] = Field(None, description="sandbox or live")
    signature: Optional[str] = Field(None, description="HMAC / digital signature for verification")
    card_network: Optional[str] = Field(None, description="Actual card network returned by provider (e.g. VISA, MASTERCARD, RUPAY, AMEX, CORP)")
    card_type: Optional[str] = Field(None, description="Actual card type / category returned by provider")
    card_category: Optional[str] = Field(None, description="Card category: DEBIT, CREDIT, CORPORATE")
    raw_payload: Optional[Dict[str, Any]] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.tid:
            self.tid = self.referenceId or self.reference_id or self.merchant_tid
        if not self.bankme_ref and self.orderId:
            self.bankme_ref = self.orderId
        if not self.reference_id and self.tid:
            self.reference_id = self.tid

        # Normalize BankMe events / statuses
        if self.event:
            ev = self.event.lower()
            if "success" in ev:
                self.status = "SUCCESS"
            elif "fail" in ev or "expire" in ev:
                self.status = "FAILED"
        elif self.status:
            st = self.status.upper()
            if st in ("SUCCESS", "SETTLED"):
                self.status = "SUCCESS"
            elif st in ("FAILED", "EXPIRED", "DECLINED"):
                self.status = "FAILED"
            else:
                self.status = "PENDING"


class PayinPolicyOptionItem(BaseModel):
    policy: str
    display_name: str
    option: str
    description: str
    mdr_treatment: str


class PayinPolicyResponse(BaseModel):
    success: bool = True
    company_ref_id: int
    company_name: str
    company_code: str
    policy: str
    display_name: str
    option: str
    description: str
    mdr_treatment: str
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None
    available_policies: List[PayinPolicyOptionItem] = []


class UpdatePayinPolicyRequest(BaseModel):
    company_ref_id: Optional[int] = None
    policy: str = Field(..., description="WITH_MDR or WITHOUT_MDR")

