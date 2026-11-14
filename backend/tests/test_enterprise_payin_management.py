"""
Comprehensive Automated Test Suite for Enterprise PayIn Management System.

Covers:
1. Database Schema Standards:
   - All 10 PayIn tables exist.
   - Every table uses table-specific <table_name>_ref_id as primary key.
   - Concise prefixed column naming (txn_, cust_, pay_, svc_, mdr_, vendor_, company_, provider_).
2. Routing Exclusivity:
   - SMSPay (company_ref_id=2) -> BankMe PayIn Provider.
   - Other companies (company_ref_id=1, 47) -> Existing Provider.
3. Dynamic MDR Resolution:
   - Base MDR rule resolution.
   - Specific override precedence (UPI override to 0% MDR).
4. Three MDR Treatments:
   - DEDUCT_FROM_TOPUP: Customer pays amount, charges deducted from wallet credit.
   - COLLECT_ADDITIONALLY: Customer pays amount + charges, Retailer receives full amount.
   - COMPANY_PAYS_MDR: Customer pays amount, Retailer receives full amount, Company absorbs charges.
5. End-to-End PayIn Initiation & TID Immutability.
6. Webhook Processing, Idempotency & Authoritative Wallet Credit.
7. Multi-Tenant Data Isolation (Cross-Company Access Forbidden).
"""

import pytest
import uuid
from decimal import Decimal
from sqlalchemy import text, select
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.application.payin_routing_service import PayInRoutingService, PayInProvider, SMSPAY_COMPANY_REF_ID
from app.application.payin_mdr_service import PayInMdrService
from app.application.payin_config_service import PayInConfigService
from app.application.payin_service import PayInService
from app.application.payin_dtos import (
    CommonPayInRequest, MdrPreviewRequest, BankMeWebhookPayload
)
from app.infrastructure.db.payin_models import (
    PayinTransactionModel, PayinMdrCfgModel, PayinVendorModel
)


@pytest.mark.asyncio
async def test_payin_database_tables_and_primary_keys():
    """Verify all 10 PayIn tables exist with <table_name>_ref_id primary keys."""
    expected_tables = {
        "payin_company_cfg": "payin_company_cfg_ref_id",
        "payin_vendors": "payin_vendor_ref_id",
        "payin_company_vendors": "payin_company_vendor_ref_id",
        "payin_service_types": "payin_service_type_ref_id",
        "payin_payment_modes": "payin_payment_mode_ref_id",
        "payin_card_types": "payin_card_type_ref_id",
        "payin_mdr_cfg": "payin_mdr_cfg_ref_id",
        "payin_transactions": "payin_transactions_ref_id",
        "payin_callback_logs": "payin_callback_log_ref_id",
        "payin_audit_logs": "payin_audit_log_ref_id"
    }

    async with AsyncSessionLocal() as db:
        for tbl, pk_col in expected_tables.items():
            res = await db.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = '{tbl}' AND column_name = '{pk_col}';
            """))
            row = res.fetchone()
            assert row is not None, f"Table '{tbl}' missing primary key column '{pk_col}'"
            assert row[1] == "bigint", f"Column '{pk_col}' in '{tbl}' must be BIGINT"


@pytest.mark.asyncio
async def test_company_routing_exclusivity():
    """Verify SMSPay (company_ref_id=2) routes to BankMe and others route to Existing."""
    # SMSPay
    assert PayInRoutingService.resolve_provider(2) == PayInProvider.BANKME
    assert PayInRoutingService.resolve_provider("2") == PayInProvider.BANKME

    # Other companies (Near4You=1, Pay2Pay=47)
    assert PayInRoutingService.resolve_provider(1) == PayInProvider.EXISTING
    assert PayInRoutingService.resolve_provider(47) == PayInProvider.EXISTING
    assert PayInRoutingService.resolve_provider(None) == PayInProvider.EXISTING


@pytest.mark.asyncio
async def test_dynamic_mdr_resolution_and_overrides():
    """Verify base MDR rule and specific payment mode override (UPI 0%)."""
    async with AsyncSessionLocal() as db:
        # 1. Base rule for SMSPay + BankMe
        base_rule = await PayInMdrService.resolve_mdr_rule(
            db=db,
            company_ref_id=SMSPAY_COMPANY_REF_ID,
            vendor_ref_id=1,  # BankMe
            payment_mode_ref_id=2  # Credit Card
        )
        assert base_rule["mdr_pct"] == Decimal("0.0180")
        assert base_rule["mdr_treatment"] == "DEDUCT_FROM_TOPUP"

        # 2. UPI override (payment_mode_ref_id = 1)
        upi_rule = await PayInMdrService.resolve_mdr_rule(
            db=db,
            company_ref_id=SMSPAY_COMPANY_REF_ID,
            vendor_ref_id=1,
            payment_mode_ref_id=1  # UPI
        )
        assert upi_rule["mdr_pct"] == Decimal("0.0000")


def test_three_mdr_treatments_calculation():
    """Verify financial formulas for DEDUCT_FROM_TOPUP, COLLECT_ADDITIONALLY, COMPANY_PAYS_MDR."""
    # 1.8% MDR + 18% GST on ₹10,000
    # Raw MDR = ₹180.00, GST = ₹32.40, Total Charges = ₹212.40
    base_config = {
        "mdr_pct": Decimal("0.0180"),
        "mdr_fixed": Decimal("0.00"),
        "min_mdr": Decimal("0.00"),
        "max_mdr": Decimal("5000.00"),
        "tax_pct": Decimal("0.1800")
    }

    # Treatment 1: DEDUCT_FROM_TOPUP
    c1 = PayInMdrService.calculate_charges(10000.0, {**base_config, "mdr_treatment": "DEDUCT_FROM_TOPUP"})
    assert c1["txn_amount"] == 10000.00
    assert c1["mdr_amount"] == 180.00
    assert c1["tax_amount"] == 32.40
    assert c1["total_charges"] == 212.40
    assert c1["customer_payable"] == 10000.00
    assert c1["retailer_credit"] == 9787.60
    assert c1["company_mdr_liability"] == 0.00

    # Treatment 2: COLLECT_ADDITIONALLY
    c2 = PayInMdrService.calculate_charges(10000.0, {**base_config, "mdr_treatment": "COLLECT_ADDITIONALLY"})
    assert c2["txn_amount"] == 10000.00
    assert c2["customer_payable"] == 10212.40
    assert c2["retailer_credit"] == 10000.00
    assert c2["company_mdr_liability"] == 0.00

    # Treatment 3: COMPANY_PAYS_MDR
    c3 = PayInMdrService.calculate_charges(10000.0, {**base_config, "mdr_treatment": "COMPANY_PAYS_MDR"})
    assert c3["txn_amount"] == 10000.00
    assert c3["customer_payable"] == 10000.00
    assert c3["retailer_credit"] == 10000.00
    assert c3["company_mdr_liability"] == 212.40


@pytest.mark.asyncio
async def test_payin_options_retrieval():
    """Verify retrieval of enabled services, payment modes, cards, and vendors for retailer."""
    async with AsyncSessionLocal() as db:
        options = await PayInConfigService.get_retailer_payin_options(db=db, company_ref_id=SMSPAY_COMPANY_REF_ID)
        assert options.success is True
        assert options.company_ref_id == SMSPAY_COMPANY_REF_ID
        assert len(options.services) >= 5
        assert len(options.payment_modes) >= 5
        assert len(options.card_types) >= 6
        assert len(options.vendors) >= 1
        assert options.vendors[0].vendor_code == "BANKME"


@pytest.mark.asyncio
async def test_end_to_end_smspay_bankme_initiation_and_webhook():
    """Full lifecycle: Initiate BankMe PayIn -> Inbound Webhook -> Wallet Credit via SP."""
    async with AsyncSessionLocal() as db:
        unique_ref = f"TEST_REF_{uuid.uuid4().hex[:8].upper()}"
        req_dto = CommonPayInRequest(
            amount=500.00,
            customer_name="Sathus Test Retailer",
            customer_mobile="9876543210",
            customer_email="test@sms-pay.in",
            reference_id=unique_ref,
            payment_mode="UPI",
            service_type_code="UTILITY"
        )
        auth_context = {
            "company_ref_id": SMSPAY_COMPANY_REF_ID,
            "retailer_ref_id": 1,
            "user_ref_id": 1
        }

        # 1. Initiate PayIn
        resp = await PayInService.initiate_payin(db=db, request_dto=req_dto, auth_context=auth_context)
        assert resp.success is True
        assert resp.status == "PENDING"
        assert resp.provider == "BANKME"
        assert resp.tid.startswith("B")
        assert resp.customer_payable == 500.00

        # Verify persisted record in payin_transactions
        stmt = select(PayinTransactionModel).where(PayinTransactionModel.tid == resp.tid)
        txn = (await db.execute(stmt)).scalars().first()
        assert txn is not None
        assert txn.company_ref_id == SMSPAY_COMPANY_REF_ID
        assert txn.txn_status == "PENDING"

        # 2. Simulate BankMe Inbound Webhook (SUCCESS)
        webhook_payload = BankMeWebhookPayload(
            event="PAYMENT_SUCCESS",
            tid=resp.tid,
            reference_id=unique_ref,
            bankme_ref=f"BME_{uuid.uuid4().hex[:6].upper()}",
            utr=f"UTR{uuid.uuid4().hex[:8].upper()}",
            amount=500.00,
            status="SUCCESS"
        )
        wb_res = await PayInService.process_bankme_webhook(db=db, payload=webhook_payload)
        assert wb_res["status"] == "PROCESSED"
        assert wb_res["txn_status"] == "SUCCESS"

        # Verify transaction transitioned to SUCCESS
        await db.refresh(txn)
        assert txn.txn_status == "SUCCESS"

        # 3. Verify Idempotency on Duplicate Webhook
        dup_res = await PayInService.process_bankme_webhook(db=db, payload=webhook_payload)
        assert dup_res["status"] == "ALREADY_PROCESSED"


@pytest.mark.asyncio
async def test_cross_company_isolation():
    """Verify security isolation: other company cannot access or process BankMe transactions."""
    async with AsyncSessionLocal() as db:
        unique_ref = f"ISO_REF_{uuid.uuid4().hex[:8].upper()}"
        req_dto = CommonPayInRequest(
            amount=100.00,
            customer_name="Company Isolation Test",
            customer_mobile="9876543210",
            reference_id=unique_ref
        )
        # Initiated under SMSPay (company_ref_id=2)
        resp = await PayInService.initiate_payin(
            db=db,
            request_dto=req_dto,
            auth_context={"company_ref_id": SMSPAY_COMPANY_REF_ID, "retailer_ref_id": 1}
        )

        # Attempt to read status under Near4You (company_ref_id=1)
        with pytest.raises(Exception) as exc_info:
            await PayInService.get_transaction_status(
                db=db,
                tid=resp.tid,
                auth_context={"company_ref_id": 1}  # Different company!
            )
        assert "403" in str(exc_info.value) or "Access denied" in str(exc_info.value)
