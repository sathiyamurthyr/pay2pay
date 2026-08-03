import pytest
import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

from app.application.customer_dtos import (
    CustomerRegisterRequest, CustomerStatusChangeRequest,
    CustomerSearchRequest, CustomerKycSubmitRequest,
    CustomerDocumentUploadRequest, ServiceConfigRequest,
    CustomerLimitConfigRequest, CustomerBlacklistRequest
)
from app.application.customer_service import CustomerService


@pytest.mark.asyncio
async def test_register_customer():
    db = AsyncMock()
    req = CustomerRegisterRequest(
        first_name="Rajesh",
        last_name="Kumar",
        mobile_number="9876543210",
        email="rajesh.kumar@example.com",
        customer_category="REGULAR",
        customer_type="INDIVIDUAL"
    )

    res = await CustomerService.register_customer(db, req)

    assert res.full_name == "Rajesh Kumar"
    assert res.mobile_number == "9876543210"
    assert res.customer_category == "REGULAR"
    assert res.kyc_status == "PENDING_KYC"
    assert res.customer_status == "DRAFT"
    db.add.assert_called_once()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_list_customers():
    db = AsyncMock()
    mock_customer = MagicMock()
    mock_customer.public_id = uuid.uuid4()
    mock_customer.customer_number = "CUS12345678"
    mock_customer.customer_category = "REGULAR"
    mock_customer.customer_type = "INDIVIDUAL"
    mock_customer.full_name = "Rajesh Kumar"
    mock_customer.mobile_number = "9876543210"
    mock_customer.email = "rajesh@example.com"
    mock_customer.dob = None
    mock_customer.gender = "MALE"
    mock_customer.nationality = "INDIAN"
    mock_customer.kyc_level = "MINIMUM_KYC"
    mock_customer.kyc_status = "PENDING_KYC"
    mock_customer.risk_category = "LOW"
    mock_customer.customer_status = "ACTIVE"
    mock_customer.registration_date = None
    mock_customer.activation_date = None
    mock_customer.created_date = None

    db.execute.return_value.scalars.return_value.all.return_value = [mock_customer]

    search_req = CustomerSearchRequest(query="Rajesh", page=1, page_size=10)
    result = await CustomerService.list_customers(db, search_req)

    assert len(result) == 1
    assert result[0].customer_number == "CUS12345678"
    assert result[0].full_name == "Rajesh Kumar"


@pytest.mark.asyncio
async def test_create_service_config():
    db = AsyncMock()
    req = ServiceConfigRequest(
        service_code="DMT",
        service_name="Domestic Money Transfer",
        is_enabled=True,
        requires_full_kyc=True,
        minimum_age=18
    )

    res = await CustomerService.create_service_config(db, req)

    assert res.service_code == "DMT"
    assert res.service_name == "Domestic Money Transfer"
    assert res.requires_full_kyc is True
    assert res.minimum_age == 18
    db.add.assert_called_once()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_add_to_blacklist():
    db = AsyncMock()
    req = CustomerBlacklistRequest(
        blacklist_type="CUSTOMER",
        mobile_number="9876543210",
        reason="Fraudulent velocity pattern detected",
        is_permanent=True
    )

    res = await CustomerService.add_to_blacklist(db, req)

    assert res.blacklist_type == "CUSTOMER"
    assert res.mobile_number == "9876543210"
    assert res.reason == "Fraudulent velocity pattern detected"
    assert res.is_permanent is True
    db.add.assert_called_once()
    db.commit.assert_called_once()
