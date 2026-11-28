"""
Unit & Integration Tests for Retailer Card Management Module.

Covers:
1. Saving a valid credit card (Luhn + mobile + masking, never exposing raw PAN)
2. Blocking duplicate card creation for the same retailer (409 Conflict)
3. Allowing independent registration for different retailers / companies
4. Current Date Bills vs. Upcoming Days Bills calculation, chronological sorting, & month-end clamping
5. Strict tenant/retailer isolation & fail-closed authorization
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.application.menu_favorite_service import ResolvedFavoriteIdentity
from app.application.retailer_card_service import (
    RetailerCardService,
    compute_bill_schedule,
    normalize_and_validate_card_number,
)
from app.application.dependencies import get_optional_current_user
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.infrastructure.db.models import UserSessionModel
from app.infrastructure.db.retailer_card_models import RetailerCreditCardModel
from app.main import app


@pytest.fixture
async def card_db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: UserSessionModel.__table__.create(sync_conn, checkfirst=True)
        )
        await conn.run_sync(
            lambda sync_conn: RetailerCreditCardModel.__table__.create(sync_conn, checkfirst=True)
        )
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


def test_compute_bill_schedule_current_and_upcoming():
    ref = date(2026, 11, 28)

    due_today = compute_bill_schedule(bill_generate_day=10, bill_due_day=28, reference_date=ref)
    assert due_today["is_due_today"] is True
    assert due_today["days_remaining"] == 0
    assert due_today["bill_bucket"] == "CURRENT_DATE"
    assert due_today["status_label"] == "Due Today"
    assert due_today["next_due_date"] == "2026-11-28"

    due_in_2_days = compute_bill_schedule(bill_generate_day=12, bill_due_day=30, reference_date=ref)
    assert due_in_2_days["is_due_today"] is False
    assert due_in_2_days["days_remaining"] == 2
    assert due_in_2_days["bill_bucket"] == "UPCOMING"
    assert due_in_2_days["status_label"] == "Due in 2 days"

    # Past due day this month rolls over to next month
    next_month_due = compute_bill_schedule(bill_generate_day=20, bill_due_day=5, reference_date=ref)
    assert next_month_due["is_due_today"] is False
    assert next_month_due["next_due_date"] == "2026-12-05"
    assert next_month_due["days_remaining"] == 7

    # Month-end clamping (day 31 in Feb 2026 -> Feb 28)
    feb_ref = date(2026, 2, 15)
    feb_clamped = compute_bill_schedule(bill_generate_day=1, bill_due_day=31, reference_date=feb_ref)
    assert feb_clamped["next_due_date"] == "2026-02-28"
    assert feb_clamped["days_remaining"] == 13


@pytest.mark.asyncio
async def test_create_card_and_duplicate_prevention(card_db_session: AsyncSession):
    ret_a = _make_identity(company_ref_id=2, retailer_ref_id=101, user_ref_id=101)
    ret_b = _make_identity(company_ref_id=2, retailer_ref_id=102, user_ref_id=102)
    ret_other_company = _make_identity(company_ref_id=3, retailer_ref_id=101, user_ref_id=201)

    today = date(2026, 11, 28)

    # 1. Save valid card (Visa test Luhn 4111111111111111)
    created = await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        cardholder_name="Rajesh Kumar",
        mobile_number="9876543210",
        card_number="4111 1111 1111 1111",
        card_type="VISA",
        bank_name="HDFC BANK",
        bill_generate_date=10,
        bill_due_date=28,
        reference_date=today,
    )
    assert created["status"] == "SUCCESS"
    assert created["card"]["masked_card_number"] == "XXXX-XXXX-XXXX-1111"
    assert "4111111111111111" not in str(created)
    assert created["card"]["is_due_today"] is True

    # 2. Duplicate card for SAME retailer + SAME company must be blocked (409)
    with pytest.raises(HTTPException) as dup_exc:
        await RetailerCardService.create_card(
            card_db_session,
            ret_a,
            cardholder_name="Rajesh Kumar",
            mobile_number="9876543210",
            card_number="4111111111111111",
            card_type="VISA",
            bank_name="HDFC BANK",
            bill_generate_date=10,
            bill_due_date=28,
            reference_date=today,
        )
    assert dup_exc.value.status_code == 409
    assert "already registered" in dup_exc.value.detail.lower()

    # 3. Different retailer in same company can save the card independently
    created_b = await RetailerCardService.create_card(
        card_db_session,
        ret_b,
        cardholder_name="Amit Sharma",
        mobile_number="9876501234",
        card_number="4111111111111111",
        card_type="VISA",
        bank_name="HDFC BANK",
        bill_generate_date=12,
        bill_due_date=30,
        reference_date=today,
    )
    assert created_b["status"] == "SUCCESS"
    assert created_b["card"]["retailer_ref_id"] == 102

    # 4. Different company with same retailer_ref_id can save independently
    created_c = await RetailerCardService.create_card(
        card_db_session,
        ret_other_company,
        cardholder_name="Suresh Nair",
        mobile_number="9876509999",
        card_number="4111111111111111",
        card_type="VISA",
        bank_name="ICICI BANK",
        bill_generate_date=5,
        bill_due_date=20,
        reference_date=today,
    )
    assert created_c["card"]["company_ref_id"] == 3


@pytest.mark.asyncio
async def test_dashboard_filtering_and_tenant_isolation(card_db_session: AsyncSession):
    ret_a = _make_identity(company_ref_id=2, retailer_ref_id=201, user_ref_id=201)
    ret_b = _make_identity(company_ref_id=2, retailer_ref_id=202, user_ref_id=202)
    today = date(2026, 11, 28)

    # Due today (28th)
    await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        cardholder_name="Card Today",
        mobile_number="9876543211",
        card_number="4111111111111111",
        card_type="VISA",
        bank_name="HDFC BANK",
        bill_generate_date=10,
        bill_due_date=28,
        reference_date=today,
    )
    # Due in 10 days (8th of next month) - valid Luhn 5500000000000004
    await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        cardholder_name="Card Later",
        mobile_number="9876543212",
        card_number="5500000000000004",
        card_type="MASTERCARD",
        bank_name="ICICI BANK",
        bill_generate_date=18,
        bill_due_date=8,
        reference_date=today,
    )
    # Due in 2 days (30th) - valid Luhn 4000000000000002 -> check: use 4242424242424242
    await RetailerCardService.create_card(
        card_db_session,
        ret_a,
        cardholder_name="Card Soon",
        mobile_number="9876543213",
        card_number="4242424242424242",
        card_type="VISA",
        bank_name="AXIS BANK",
        bill_generate_date=12,
        bill_due_date=30,
        reference_date=today,
    )

    dash_a = await RetailerCardService.list_cards_dashboard(card_db_session, ret_a, reference_date=today)
    assert dash_a["summary"]["total_cards"] == 3
    assert dash_a["summary"]["current_date_bills_count"] == 1
    assert dash_a["summary"]["upcoming_bills_count"] == 2
    assert dash_a["current_date_bills"][0]["cardholder_name"] == "Card Today"
    # Upcoming bills sorted chronologically (2 days before 10 days)
    assert [c["cardholder_name"] for c in dash_a["upcoming_bills"]] == ["Card Soon", "Card Later"]

    # Retailer B sees 0 cards and cannot delete Retailer A's card
    dash_b = await RetailerCardService.list_cards_dashboard(card_db_session, ret_b, reference_date=today)
    assert dash_b["summary"]["total_cards"] == 0

    card_a_id = dash_a["current_date_bills"][0]["card_ref_id"]
    with pytest.raises(HTTPException) as del_exc:
        await RetailerCardService.delete_card(card_db_session, ret_b, card_ref_id=card_a_id)
    assert del_exc.value.status_code == 404


@pytest.mark.asyncio
async def test_validation_rejects_invalid_luhn_and_mobile(card_db_session: AsyncSession):
    ret_a = _make_identity(company_ref_id=2, retailer_ref_id=301, user_ref_id=301)

    with pytest.raises(HTTPException) as bad_luhn:
        await RetailerCardService.create_card(
            card_db_session,
            ret_a,
            cardholder_name="Bad Card",
            mobile_number="9876543210",
            card_number="4111111111111112",
            card_type="VISA",
            bank_name="HDFC BANK",
            bill_generate_date=10,
            bill_due_date=20,
        )
    assert bad_luhn.value.status_code == 422

    with pytest.raises(HTTPException) as bad_mob:
        await RetailerCardService.create_card(
            card_db_session,
            ret_a,
            cardholder_name="Bad Mobile",
            mobile_number="1234567890",
            card_number="4111111111111111",
            card_type="VISA",
            bank_name="HDFC BANK",
            bill_generate_date=10,
            bill_due_date=20,
        )
    assert bad_mob.value.status_code == 422


@pytest.mark.asyncio
async def test_http_routes_auth_fail_closed_and_ignore_spoofed_ids(card_db_session: AsyncSession):
    async def override_get_db():
        yield card_db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_optional_current_user] = lambda: None
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Unauthenticated request must fail closed
            unauth = await client.get("/api/v1/retailer/cards")
            assert unauth.status_code == 401

            # Non-retailer identity (retailer_ref_id=None) must fail closed with 403
            admin_token = create_access_token(
                subject="admin@smspay.store",
                tenant_id="smspay",
                company_id="2",
                roles=["ADMIN"],
                user_ref_id=1,
                user_type_ref_id=1,
                company_ref_id=2,
            )
            with patch(
                "app.presentation.api.v1.retailer_cards_router.MenuFavoriteService.resolve_authenticated_identity",
                return_value=ResolvedFavoriteIdentity(
                    company_ref_id=2,
                    user_ref_id=1,
                    retailer_ref_id=None,
                    user_type_ref_id=1,
                    role_ref_id=1,
                    role_codes=["ADMIN"],
                    is_admin=True,
                    is_super_admin=False,
                    actor_email="admin@smspay.store",
                ),
            ):
                forbidden = await client.get(
                    "/api/v1/retailer/cards",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                assert forbidden.status_code == 403

            # Valid retailer session ignores any spoofed retailer_ref_id / company_ref_id
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
                        "cardholder_name": "Priya Menon",
                        "mobile_number": "9876543210",
                        "card_number": "4111111111111111",
                        "card_type": "VISA",
                        "bank_name": "HDFC BANK",
                        "bill_generate_date": 5,
                        "bill_due_date": 25,
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
