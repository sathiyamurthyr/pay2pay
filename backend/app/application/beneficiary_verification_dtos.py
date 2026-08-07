"""
EPIC — Beneficiary Verification DTOs & Request/Response Contracts
"""
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class BeneficiaryVerifyRequest(BaseModel):
    retailer_id: uuid.UUID = Field(..., description="Retailer Operator UUID")
    customer_id: Optional[uuid.UUID] = Field(None, description="Customer UUID")
    beneficiary_id: Optional[uuid.UUID] = Field(None, description="Beneficiary UUID")
    
    account_number: str = Field(..., min_length=6, max_length=40, description="Beneficiary Bank Account Number")
    ifsc_code: str = Field(..., min_length=11, max_length=11, description="Bank IFSC Code")
    account_holder_name: str = Field(..., min_length=2, max_length=300, description="Account Holder Name")
    mobile_number: Optional[str] = Field(None, min_length=10, max_length=15, description="Mobile Number")
    
    vendor_code: str = Field("CASHFREE", description="Vendor Gateway Code (CASHFREE, INTERNAL_SWITCH)")
    idempotency_key: Optional[str] = Field(None, max_length=128, description="Idempotency Unique Token")

    @field_validator("account_number")
    @classmethod
    def validate_account_number(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned.isalnum():
            raise ValueError("Account number must contain only alphanumeric characters.")
        return cleaned

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if len(cleaned) != 11 or not cleaned[:4].isalpha():
            raise ValueError("Invalid IFSC Code format. Must be 11 characters starting with 4 letters.")
        return cleaned


class VerificationPricingBreakdown(BaseModel):
    verification_charge: float = 3.00
    gst_rate: float = 18.00
    gst_amount: float = 0.54
    total_debit_amount: float = 3.54
    
    platform_fee: float = 1.00
    platform_gst: float = 0.18
    company_revenue: float = 1.00
    company_gst: float = 0.18
    vendor_cost: float = 1.00
    vendor_gst: float = 0.18
    
    retailer_commission: float = 0.25
    retailer_gst: float = 0.04
    distributor_commission: float = 0.10
    master_distributor_commission: float = 0.05
    super_distributor_commission: float = 0.05
    partner_commission: float = 0.05


class FraudRiskEvaluationResult(BaseModel):
    is_allowed: bool = True
    risk_score: float = 0.0
    risk_category: str = "LOW"
    passed_velocity_check: bool = True
    passed_duplicate_check: bool = True
    passed_blacklist_check: bool = True
    passed_aml_check: bool = True
    rejection_reason: Optional[str] = None


class BeneficiaryVerifyResponse(BaseModel):
    success: bool
    status: str  # SUCCESS, FAILED, REVERSED
    verification_number: str
    correlation_id: str
    trace_id: str
    
    masked_account_number: str
    ifsc_code: str
    bank_name: str
    input_name: str
    registered_name_in_bank: Optional[str] = None
    
    name_match_score: float = 0.0
    name_match_status: str = "MISMATCH"
    
    utr_number: Optional[str] = None
    vendor_code: str = "CASHFREE"
    vendor_ref_id: Optional[str] = None
    digital_signature: str
    
    pricing_breakdown: VerificationPricingBreakdown
    wallet_balance_before: float
    wallet_balance_after: float
    
    latency_ms: float = 0.0
    message: str
