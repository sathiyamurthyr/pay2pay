"""
Authoritative Automated Test Suite for Customer Payable Amount Policy.

Tests:
1. Admin Policy View and Update:
   - OPTION A: WITH MDR ("Customer Pays MDR Charges")
   - OPTION B: WITHOUT MDR ("Retailer Bears MDR Charges")
   - Audit trail in payin_audit_logs.
2. Dynamic Financial Calculations & MDR Preview:
   - Option A calculation: Customer payable = Top-up + MDR + GST; Retailer credit = 100% Top-up
   - Option B calculation: Customer payable = Top-up; Retailer credit = Top-up - (MDR + GST)
3. Retailer Options API Integration:
   - GET /api/v1/payin/options dynamically delivers effective policy.
4. Transaction Policy Snapshot & Immutability:
   - A subsequent policy change does not retroactively modify past transactions.
5. Multi-Company / Tenant Isolation:
   - Changing policy on SMSPAY does not affect Near4You or Pay2Pay.
"""

import pytest
import uuid
from decimal import Decimal
from unittest.mock import patch, AsyncMock
from sqlalchemy import text, select
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.application.payin_routing_service import SMSPAY_COMPANY_REF_ID
from app.application.payin_mdr_service import PayInMdrService
from app.application.payin_config_service import PayInConfigService
from app.application.payin_service import PayInService
from app.application.payin_dtos import (
    CommonPayInRequest, MdrPreviewRequest
)
from app.infrastructure.db.payin_models import (
    PayinCompanyCfgModel, PayinTransactionModel, PayinAuditLogModel
)


async def get_admin_auth_headers(ac: AsyncClient, email: str = "admin@smspay.store") -> dict:
    """Helper to authenticate admin and return Bearer token headers."""
    resp = await ac.post("/api/v1/auth/login", json={
        "email_or_username": email,
        "password": "Admin@123"
    })
    if resp.status_code == 200:
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


@pytest.mark.asyncio
async def test_admin_policy_view_and_update_with_mdr():
    """Verify Admin can view and set Option A: WITH MDR (Customer Pays MDR Charges)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = await get_admin_auth_headers(ac, "admin@smspay.store")
        assert "Authorization" in headers, "Admin authentication failed"

        # 1. Update to WITH_MDR
        update_resp = await ac.post(
            "/api/v1/admin/payin/policy",
            json={"company_ref_id": SMSPAY_COMPANY_REF_ID, "policy": "WITH_MDR"},
            headers=headers
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        data = update_resp.json()
        assert data["success"] is True
        assert data["policy"] == "WITH_MDR"
        assert data["display_name"] == "Customer Pays MDR Charges"
        assert data["option"] == "OPTION A: WITH MDR"
        assert data["mdr_treatment"] == "COLLECT_ADDITIONALLY"
        assert data["company_ref_id"] == SMSPAY_COMPANY_REF_ID

        # 2. Query policy via GET
        get_resp = await ac.get(f"/api/v1/admin/payin/policy?company_ref_id={SMSPAY_COMPANY_REF_ID}", headers=headers)
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        assert get_data["policy"] == "WITH_MDR"
        assert get_data["display_name"] == "Customer Pays MDR Charges"
        assert len(get_data["available_policies"]) == 2

    # 3. Verify Database Persistence and Audit Log
    async with AsyncSessionLocal() as db:
        cfg = (await db.execute(
            select(PayinCompanyCfgModel).where(PayinCompanyCfgModel.company_ref_id == SMSPAY_COMPANY_REF_ID)
        )).scalars().first()
        assert cfg is not None
        assert cfg.customer_payable_policy == "WITH_MDR"

        audit = (await db.execute(
            select(PayinAuditLogModel)
            .where(
                PayinAuditLogModel.company_ref_id == SMSPAY_COMPANY_REF_ID,
                PayinAuditLogModel.action_type == "UPDATE_CUSTOMER_PAYABLE_POLICY"
            )
            .order_by(PayinAuditLogModel.payin_audit_log_ref_id.desc())
        )).scalars().first()
        assert audit is not None
        assert audit.new_value.get("policy") == "WITH_MDR"


@pytest.mark.asyncio
async def test_admin_policy_view_and_update_without_mdr():
    """Verify Admin can view and set Option B: WITHOUT MDR (Retailer Bears MDR Charges)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = await get_admin_auth_headers(ac, "admin@smspay.store")
        assert "Authorization" in headers

        update_resp = await ac.post(
            "/api/v1/admin/payin/policy",
            json={"company_ref_id": SMSPAY_COMPANY_REF_ID, "policy": "WITHOUT_MDR"},
            headers=headers
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        data = update_resp.json()
        assert data["success"] is True
        assert data["policy"] == "WITHOUT_MDR"
        assert data["display_name"] == "Retailer Bears MDR Charges"
        assert data["option"] == "OPTION B: WITHOUT MDR"
        assert data["mdr_treatment"] == "DEDUCT_FROM_TOPUP"

    # Verify Database Persistence
    async with AsyncSessionLocal() as db:
        cfg = (await db.execute(
            select(PayinCompanyCfgModel).where(PayinCompanyCfgModel.company_ref_id == SMSPAY_COMPANY_REF_ID)
        )).scalars().first()
        assert cfg is not None
        assert cfg.customer_payable_policy == "WITHOUT_MDR"


@pytest.mark.asyncio
async def test_mdr_preview_calculations_under_both_policies():
    """Verify dynamic financial calculations switch correctly between Option A and Option B."""
    test_amount = 5000.0

    async with AsyncSessionLocal() as db:
        # Set to WITH_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITH_MDR' 
            WHERE company_ref_id = :comp_ref
        """), {"comp_ref": SMSPAY_COMPANY_REF_ID})
        await db.commit()

        # Preview under WITH_MDR
        prev_a = await PayInService.calculate_preview(
            db=db,
            company_ref_id=SMSPAY_COMPANY_REF_ID,
            preview_req=MdrPreviewRequest(
                amount=test_amount,
                service_type_code="UTILITY",
                payment_mode_code="CARD",
                card_network="VISA"
            )
        )
        assert prev_a.customer_payable_policy == "WITH_MDR"
        assert prev_a.policy_display_name == "Customer Pays MDR Charges"
        assert prev_a.mdr_treatment == "COLLECT_ADDITIONALLY"
        # Under WITH_MDR: Customer pays Top-Up + Charges, Retailer gets full Top-Up
        assert prev_a.customer_payable == round(test_amount + prev_a.total_charges, 2)
        assert prev_a.retailer_credit == test_amount

        # Set to WITHOUT_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITHOUT_MDR' 
            WHERE company_ref_id = :comp_ref
        """), {"comp_ref": SMSPAY_COMPANY_REF_ID})
        await db.commit()

        # Preview under WITHOUT_MDR
        prev_b = await PayInService.calculate_preview(
            db=db,
            company_ref_id=SMSPAY_COMPANY_REF_ID,
            preview_req=MdrPreviewRequest(
                amount=test_amount,
                service_type_code="UTILITY",
                payment_mode_code="CARD",
                card_network="VISA"
            )
        )
        assert prev_b.customer_payable_policy == "WITHOUT_MDR"
        assert prev_b.policy_display_name == "Retailer Bears MDR Charges"
        assert prev_b.mdr_treatment == "DEDUCT_FROM_TOPUP"
        # Under WITHOUT_MDR: Customer pays only Top-Up, Retailer gets Top-Up - Charges
        assert prev_b.customer_payable == test_amount
        assert prev_b.retailer_credit == round(test_amount - prev_b.total_charges, 2)


@pytest.mark.asyncio
async def test_retailer_payin_options_dynamic_policy():
    """Verify Retailer Options API returns the company's active policy dynamically."""
    async with AsyncSessionLocal() as db:
        # 1. Test when policy is WITHOUT_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITHOUT_MDR' 
            WHERE company_ref_id = :comp_ref
        """), {"comp_ref": SMSPAY_COMPANY_REF_ID})
        await db.commit()

        opt_b = await PayInConfigService.get_retailer_payin_options(
            db=db,
            company_ref_id=SMSPAY_COMPANY_REF_ID
        )
        assert opt_b.customer_payable_policy == "WITHOUT_MDR"
        assert opt_b.policy_display_name == "Retailer Bears MDR Charges"
        assert opt_b.mdr_treatment == "DEDUCT_FROM_TOPUP"

        # 2. Test when policy is WITH_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITH_MDR' 
            WHERE company_ref_id = :comp_ref
        """), {"comp_ref": SMSPAY_COMPANY_REF_ID})
        await db.commit()

        opt_a = await PayInConfigService.get_retailer_payin_options(
            db=db,
            company_ref_id=SMSPAY_COMPANY_REF_ID
        )
        assert opt_a.customer_payable_policy == "WITH_MDR"
        assert opt_a.policy_display_name == "Customer Pays MDR Charges"
        assert opt_a.mdr_treatment == "COLLECT_ADDITIONALLY"


@pytest.mark.asyncio
async def test_transaction_policy_snapshot_and_immutability():
    """
    Verify transaction policy snapshot:
    Transactions capture effective policy at initiation; subsequent Admin changes
    never retroactively alter past transactions.
    """
    ref_1 = f"ORDER-{uuid.uuid4().hex[:8].upper()}"
    ref_2 = f"ORDER-{uuid.uuid4().hex[:8].upper()}"
    test_amount = 2000.0

    mock_bankme = {
        "success": True,
        "status": "PENDING",
        "order_id": f"BM-{uuid.uuid4().hex[:6]}",
        "payment_url": "https://sandbox.bankme.co/checkout/test",
        "qr_string": "upi://pay?pa=test@bankme&am=2000"
    }

    async with AsyncSessionLocal() as db:
        # 1. Set policy to WITH_MDR and initiate Txn 1
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITH_MDR' 
            WHERE company_ref_id = :comp_ref
        """), {"comp_ref": SMSPAY_COMPANY_REF_ID})
        await db.commit()

        with patch("app.application.bankme_payin_adapter.BankMePayInAdapter.initiate_payin", new=AsyncMock(return_value=mock_bankme)):
            init_1 = await PayInService.initiate_payin(
                db=db,
                request_dto=CommonPayInRequest(
                    amount=test_amount,
                    reference_id=ref_1,
                    customer_name="Test Merchant",
                    customer_mobile="9876543210",
                    payment_mode_code="CARD",
                    card_network="VISA"
                ),
                auth_context={"company_ref_id": SMSPAY_COMPANY_REF_ID, "retailer_ref_id": 1, "roles": ["RETAILER"]}
            )

        tid_1 = init_1.tid
        assert init_1.customer_payable_policy == "WITH_MDR"
        assert init_1.retailer_credit == test_amount
        assert init_1.customer_payable > test_amount

        # 2. Admin changes policy to WITHOUT_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITHOUT_MDR' 
            WHERE company_ref_id = :comp_ref
        """), {"comp_ref": SMSPAY_COMPANY_REF_ID})
        await db.commit()

        # 3. Initiate Txn 2 under WITHOUT_MDR
        with patch("app.application.bankme_payin_adapter.BankMePayInAdapter.initiate_payin", new=AsyncMock(return_value=mock_bankme)):
            init_2 = await PayInService.initiate_payin(
                db=db,
                request_dto=CommonPayInRequest(
                    amount=test_amount,
                    reference_id=ref_2,
                    customer_name="Test Merchant 2",
                    customer_mobile="9876543210",
                    payment_mode_code="CARD",
                    card_network="VISA"
                ),
                auth_context={"company_ref_id": SMSPAY_COMPANY_REF_ID, "retailer_ref_id": 1, "roles": ["RETAILER"]}
            )

        tid_2 = init_2.tid
        assert init_2.customer_payable_policy == "WITHOUT_MDR"
        assert init_2.customer_payable == test_amount
        assert init_2.retailer_credit < test_amount

        # 4. Verify Past Transaction (Txn 1) Remains UNTOUCHED in Database
        stmt_1 = select(PayinTransactionModel).where(PayinTransactionModel.tid == tid_1)
        row_1 = (await db.execute(stmt_1)).scalars().first()
        assert row_1.customer_payable_policy == "WITH_MDR"
        assert float(row_1.customer_payable) == init_1.customer_payable
        assert float(row_1.retailer_credit) == test_amount
        assert row_1.mdr_treatment == "COLLECT_ADDITIONALLY"

        # 5. Verify Txn 2 Snapshot in Database
        stmt_2 = select(PayinTransactionModel).where(PayinTransactionModel.tid == tid_2)
        row_2 = (await db.execute(stmt_2)).scalars().first()
        assert row_2.customer_payable_policy == "WITHOUT_MDR"
        assert float(row_2.customer_payable) == test_amount
        assert float(row_2.retailer_credit) == init_2.retailer_credit
        assert row_2.mdr_treatment == "DEDUCT_FROM_TOPUP"


@pytest.mark.asyncio
async def test_company_tenant_isolation():
    """Verify changing policy on one company does NOT affect another company."""
    async with AsyncSessionLocal() as db:
        # SMSPAY (Company 2) set to WITHOUT_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITHOUT_MDR' 
            WHERE company_ref_id = 2;
        """))
        # Pay2Pay (Company 47) set to WITH_MDR
        await db.execute(text("""
            UPDATE public.payin_company_cfg 
            SET customer_payable_policy = 'WITH_MDR' 
            WHERE company_ref_id = 47;
        """))
        await db.commit()

        # Check SMSPAY policy
        opt_sms = await PayInConfigService.get_retailer_payin_options(db=db, company_ref_id=2)
        assert opt_sms.customer_payable_policy == "WITHOUT_MDR"
        assert opt_sms.policy_display_name == "Retailer Bears MDR Charges"

        # Check Pay2Pay policy
        opt_p2p = await PayInConfigService.get_retailer_payin_options(db=db, company_ref_id=47)
        assert opt_p2p.customer_payable_policy == "WITH_MDR"
        assert opt_p2p.policy_display_name == "Customer Pays MDR Charges"

        # Reset SMSPAY to WITH_MDR
        await db.execute(text("UPDATE public.payin_company_cfg SET customer_payable_policy = 'WITH_MDR' WHERE company_ref_id = 2;"))
        await db.commit()
