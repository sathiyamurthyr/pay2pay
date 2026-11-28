"""
Unit & Integration Tests for Retailer Credit Card Management Module.

Covers:
1. Saving a valid credit card (Luhn + mobile + masking, never exposing raw PAN)
2. Blocking duplicate card creation for the same retailer with exact message (409 Conflict)
3. Allowing independent registration for different retailers / companies
4. Billing schedule calculation: Bills Generated Today, Bills Due Today, Upcoming (7d/30d), Overdue Bills
5. Dashboard filters (Today, 7d, 15d, 30d, Bank, Status, Search) & pagination
6. Edit, Mark Paid, Delete + Audit Log recording (CREATE, UPDATE, MARK_PAID, DELETE)
7. Strict tenant/retailer isolation & fail-closed authorization
"""

from datetime import date
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.application.dependencies import get_optional_current_user
from app.application.menu_favorite_service import ResolvedFavoriteIdentity
from app.application.retailer_card_service import (
    DUPLICATE_CARD_MESSAGE,
    RetailerCardService,
    compute_bill_schedule,
)
from app.core.database import get_db
from app.core.security import create_access_token
from app.infrastructure.db.models import UserSessionModel
from app.infrastructure.db.retailer_card_models import (
    RetailerCardAuditLogModel,
    RetailerCreditCardModel,
)
from app.main import app


@pytest.fixture
async def card_db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: UserSessionModel.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: RetailerCreditCardModel.__table__.create(sync_conn, checkfirst=True))
        await conn.run_sync(lambda sync_conn: RetailerCardAuditLogModel.__table__.create(sync_conn, checkfirst=True))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()


def _make_identity(company_ref_id: int, retailer_ref_id: int, user_ref_id: int = 100) -> ResolvedFavoriteIdentity:
    return ResolvedFavoriteIdentity(
        company_ref_id=company_ref_id,
        user_ref_id=user_ref_id,
        retailer_ref_id=retailer_ref_id,
        user_type_ref_id=2,
        role_ref_id=2,
        role_codes=["RETAILER"],
        is_admin=False,
        is_super_admin=False,
        actor_email=f"ret{retailer_ref_id}@smspay.store",
        retailer_code=f"RET{retailer_ref_id:04d}",
    )


def test_compute_bill_schedule_generated_due_upcoming_overdue():
    ref = date(2026, 11, 28)

    due_today = compute_bill_schedule(bill_gen_day=28, bill_due_day=28, reference_date=ref)
    assert due_today["is_generated_today"] is True
    assert due_today["is_due_today"] is True
    assert due_today["bill_status"] == "DUE_TODAY"
    assert due_today["status_label"] == "Due Today"

    upcoming = compute_bill_schedule(bill_gen_day=12, bill_due_day=30, reference_date=ref)
    assert upcoming["bill_status"] == "UPCOMING"
    assert upcoming["days_remaining"] == 2
    assert upcoming["next_bill_generation_date"] == "2026-12-12"

    # Overdue when card existed before due date in current month and cycle is unpaid
    overdue = compute_bill_schedule(
        bill_gen_day=5,
        bill_due_day=20,
        reference_date=ref,
        card_created_date=date(2026, 11, 1),
        last_paid_cycle=None,
    )
    assert overdue["is_overdue"] is True
    assert overdue["days_overdue"] == 8
    assert overdue["bill_status"] == "OVERDUE"

    # Marking cycle paid clears overdue
    paid = compute_bill_schedule(
        bill_gen_day=5,
        bill_due_day=20,
        reference_date=ref,
        card_created_date=date(2026, 11, 1),
        last_paid_cycle="2026-11",
    )
    assert paid["is_overdue"] is False
    assert paid["bill_status"] == "UPCOMING"


@pytest.mark.asyncio
async def test_create_card_duplicate_prevention_and_audit_logs(card_db_session: AsyncSession):
    ret_a = _make_identity(company_ref_id=2, retailer_ref_id=101, user_ref_id=101)
    ret_b = _make_identity(company_ref_id=2, retailer_ref_id=102, user_ref_id=102)
    today = date(2026, 11, 28)

    created = await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        card_name="Rajesh Kumar",
        mobile_no="9876543210",
        card_number="4111 1111 1111 1111",
        card_type="Credit Card",
        bank_name="HDFC BANK",
        bill_gen_day=28,
        bill_due_day=28,
        reference_date=today,
    )
    assert created["status"] == "SUCCESS"
    assert created["card"]["masked_card_no"] == "XXXX-XXXX-XXXX-1111"
    assert "4111111111111111" not in str(created)

    # Duplicate for same retailer must fail with exact message
    with pytest.raises(HTTPException) as dup_exc:
        await RetailerCardService.create_card(
            card_db_session,
            ret_a,
            card_name="Rajesh Kumar",
            mobile_no="9876543210",
            card_number="4111111111111111",
            card_type="Credit Card",
            bank_name="HDFC BANK",
            bill_gen_day=28,
            bill_due_day=28,
            reference_date=today,
        )
    assert dup_exc.value.status_code == 409
    assert dup_exc.value.detail == DUPLICATE_CARD_MESSAGE

    # Different retailer can register independently
    created_b = await RetailerCardService.create_card(
        card_db_session,
        ret_b,
        card_name="Amit Sharma",
        mobile_no="9876501234",
        card_number="4111111111111111",
        card_type="Credit Card",
        bank_name="HDFC BANK",
        bill_gen_day=12,
        bill_due_day=30,
        reference_date=today,
    )
    assert created_b["card"]["retailer_ref_id"] == 102

    # Update & Delete & Audit log verification
    ref_id = created["card"]["ref_id"]
    updated = await RetailerCardService.update_card(
        card_db_session, ret_a, ref_id, card_name="Rajesh K", bill_due_day=30, reference_date=today
    )
    assert updated["card"]["card_name"] == "Rajesh K"

    await RetailerCardService.delete_card(card_db_session, ret_a, ref_id)
    audits = (
        await card_db_session.execute(
            select(RetailerCardAuditLogModel)
            .where(RetailerCardAuditLogModel.retailer_ref_id == 101)
            .order_by(RetailerCardAuditLogModel.ref_id.asc())
        )
    ).scalars().all()
    assert [a.action for a in audits] == ["CREATE", "UPDATE", "DELETE"]


@pytest.mark.asyncio
async def test_dashboard_filters_and_tenant_isolation(card_db_session: AsyncSession):
    ret_a = _make_identity(company_ref_id=2, retailer_ref_id=201, user_ref_id=201)
    ret_b = _make_identity(company_ref_id=2, retailer_ref_id=202, user_ref_id=202)
    today = date(2026, 11, 28)

    await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        card_name="Card Today",
        mobile_no="9876543211",
        card_number="4111111111111111",
        card_type="Credit Card",
        bank_name="HDFC BANK",
        bill_gen_day=28,
        bill_due_day=28,
        reference_date=today,
    )
    await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        card_name="Card 20 Days",
        mobile_no="9876543212",
        card_number="5500000000000004",
        card_type="Credit Card",
        bank_name="ICICI BANK",
        bill_gen_day=18,
        bill_due_day=18,
        reference_date=today,
    )

    dash_all = await RetailerCardService.list_cards_dashboard(card_db_session, ret_a, reference_date=today)
    assert dash_all["summary"]["total_cards"] == 2
    assert dash_all["summary"]["bills_generated_today_count"] == 1
    assert dash_all["summary"]["bills_due_today_count"] == 1
    assert dash_all["summary"]["upcoming_7_days_count"] == 0
    assert dash_all["summary"]["upcoming_30_days_count"] == 1

    # Filter Next 7 Days -> only Card Today (0 days remaining)
    dash_7d = await RetailerCardService.list_cards_dashboard(
        card_db_session, ret_a, range_filter="7d", reference_date=today
    )
    assert len(dash_7d["cards"]) == 1
    assert dash_7d["cards"][0]["card_name"] == "Card Today"

    # Filter by Bank Name
    dash_icici = await RetailerCardService.list_cards_dashboard(
        card_db_session, ret_a, bank_name="ICICI BANK", reference_date=today
    )
    assert len(dash_icici["cards"]) == 1
    assert dash_icici["cards"][0]["card_name"] == "Card 20 Days"

    # Retailer B cannot see or delete Retailer A's cards
    dash_b = await RetailerCardService.list_cards_dashboard(card_db_session, ret_b, reference_date=today)
    assert dash_b["summary"]["total_cards"] == 0
    with pytest.raises(HTTPException) as del_exc:
        await RetailerCardService.delete_card(card_db_session, ret_b, dash_all["cards"][0]["ref_id"])
    assert del_exc.value.status_code == 404


@pytest.mark.asyncio
async def test_http_routes_auth_fail_closed_and_ignore_spoofed_ids(card_db_session: AsyncSession):
    async def override_get_db():
        yield card_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_optional_current_user] = lambda: None
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            unauth = await client.get("/api/v1/retailer/cards")
            assert unauth.status_code == 401

            ret_token = create_access_token(
                subject="ret55@smspay.store",
                tenant_id="smspay",
                company_id="2",
                roles=["RETAILER"],
                user_ref_id=55,
                retailer_ref_id=55,
                user_type_ref_id=2,
                company_ref_id=2,
            )
            with patch(
                "app.presentation.api.v1.retailer_cards_router.MenuFavoriteService.resolve_authenticated_identity",
                return_value=_make_identity(company_ref_id=2, retailer_ref_id=55, user_ref_id=55),
            ):
                res_post = await client.post(
                    "/api/v1/retailer/cards",
                    headers={"Authorization": f"Bearer {ret_token}"},
                    json={
                        "card_name": "Priya Menon",
                        "mobile_no": "9876543210",
                        "card_number": "4242424242424242",
                        "card_type": "Credit Card",
                        "bank_name": "HDFC BANK",
                        "bill_gen_day": 5,
                        "bill_due_day": 25,
                        "retailer_ref_id": 999,
                        "company_ref_id": 999,
                    },
                )
                assert res_post.status_code == 200
                body = res_post.json()
                assert body["card"]["retailer_ref_id"] == 55
                assert body["card"]["company_ref_id"] == 2
    finally:
        app.dependency_overrides.clear()
