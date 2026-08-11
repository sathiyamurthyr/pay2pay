import uuid
import pytest
from app.application.retailer_duplicate_validation_service import (
    RetailerDuplicateValidationService, DuplicateRetailerException
)


def test_normalization_rules():
    """Verify input normalization across all 7 fields."""
    # Mobile
    assert RetailerDuplicateValidationService.normalize_value("mobile_number", "+91 9876543210") == "9876543210"
    assert RetailerDuplicateValidationService.normalize_value("mobile", "9876-543-210") == "9876543210"

    # PAN
    assert RetailerDuplicateValidationService.normalize_value("pan_number", " abcde1234f ") == "ABCDE1234F"

    # Aadhaar
    assert RetailerDuplicateValidationService.normalize_value("aadhaar_number", "1234 5678 9012") == "123456789012"

    # Bank Account
    assert RetailerDuplicateValidationService.normalize_value("bank_account_number", " 501000123456 ") == "501000123456"

    # GST
    assert RetailerDuplicateValidationService.normalize_value("gst_number", " 33abcde1234f1z5 ") == "33ABCDE1234F1Z5"

    # Email
    assert RetailerDuplicateValidationService.normalize_value("email_address", " Retailer@Pay2Pay.IN ") == "retailer@pay2pay.in"

    # UPI
    assert RetailerDuplicateValidationService.normalize_value("upi_id", " RETAILER@YBL ") == "retailer@ybl"


def test_masking_rules_pii_protection():
    """Verify masking logic never exposes unmasked PII in audit log."""
    assert RetailerDuplicateValidationService.mask_value("mobile_number", "9876543210") == "98****3210"
    assert RetailerDuplicateValidationService.mask_value("pan_number", "ABCDE1234F") == "ABC**1234F"
    assert RetailerDuplicateValidationService.mask_value("aadhaar_number", "123456789012") == "XXXX-XXXX-9012"
    assert RetailerDuplicateValidationService.mask_value("bank_account_number", "501000123456") == "*****3456"
    assert RetailerDuplicateValidationService.mask_value("gst_number", "33ABCDE1234F1Z5") == "33ABC****1Z5"
    assert RetailerDuplicateValidationService.mask_value("email_address", "retailer@pay2pay.in") == "r***r@pay2pay.in"
    assert RetailerDuplicateValidationService.mask_value("upi_id", "retailer@ybl") == "r***r@ybl"


def test_duplicate_exception_structure():
    """Verify HTTP 409 exception payload adheres strictly to enterprise spec."""
    exc = DuplicateRetailerException(field="mobile_number", message="Mobile number already exists in this company.")
    assert exc.status_code == 409
    assert exc.detail["success"] is False
    assert exc.detail["code"] == "DUPLICATE_RETAILER"
    assert exc.detail["field"] == "mobile_number"
    assert exc.detail["message"] == "Mobile number already exists in this company."
