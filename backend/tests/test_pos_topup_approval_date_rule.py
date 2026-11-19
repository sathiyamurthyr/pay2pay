"""
Unit and Integration Tests for POS Top-up Request Approval Date Business Rule.

Validates:
1. POS Instant (POS_INSTANT):
   - Admin can approve on current date (req_date <= current_date).
2. POS T1 (POS_T1):
   - Admin is NOT allowed to approve on current day (req_date >= current_date is blocked).
   - Admin is allowed to approve on next calendar day (T+1) and onwards (req_date < current_date).
   - Clear error message: "POS T1 requests can be approved from the next day (T+1)."
3. Timezone:
   - Indian Standard Time (Asia/Kolkata, UTC+05:30) calendar date comparison.
4. Status Protection:
   - Non-pending statuses (APPROVED, REJECTED, CANCELLED) are protected.
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta, date
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.presentation.api.v1.topup_router import (
    validate_topup_approval_date,
    is_pos_t1,
    is_pos_instant,
    get_business_calendar_date,
    INDIA_TZ
)
from app.infrastructure.db.models import RetailerModel, RetailerWalletModel, TopupRequestModel


def test_pos_classifiers():
    # POS T1 matches
    assert is_pos_t1("POS_T1") is True
    assert is_pos_t1("POS - T1") is True
    assert is_pos_t1("POS+T1") is True
    assert is_pos_t1("POST1") is True
    assert is_pos_t1("T1") is True
    assert is_pos_t1("POS_T+1") is True

    # POS Instant matches
    assert is_pos_instant("POS_INSTANT") is True
    assert is_pos_instant("POS - Instant") is True
    assert is_pos_instant("POS-INSTANT") is True
    assert is_pos_instant("POSINSTANT") is True
    assert is_pos_instant("INSTANT") is True

    # Cross check
    assert is_pos_t1("POS_INSTANT") is False
    assert is_pos_instant("POS_T1") is False


def test_business_calendar_date_conversion():
    # Test today in IST
    today_ist = datetime.now(INDIA_TZ).date()
    assert get_business_calendar_date(None) == today_ist

    # Date string
    assert get_business_calendar_date("2026-08-31T10:00:00Z") == date(2026, 8, 31)

    # Date object
    d = date(2026, 8, 31)
    assert get_business_calendar_date(d) == d


def test_pos_instant_approval_date_rules():
    now_ist = datetime.now(INDIA_TZ)
    today = now_ist.date()
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)
    tomorrow = today + timedelta(days=1)

    # 1. POS Instant - Current Date (Allowed)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_INSTANT",
        submitted_at=now_ist,
        status_val="PENDING"
    )
    assert valid is True
    assert reason is None

    # 2. POS Instant - Past Date (Allowed)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS - Instant",
        submitted_at=now_ist - timedelta(days=1),
        status_val="PENDING"
    )
    assert valid is True
    assert reason is None

    # 3. POS Instant - Future Date (Blocked)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_INSTANT",
        submitted_at=now_ist + timedelta(days=1),
        status_val="PENDING"
    )
    assert valid is False
    assert "Future-dated" in (reason or "")


def test_pos_t1_approval_date_rules():
    now_ist = datetime.now(INDIA_TZ)

    # 1. POS T1 - Current Date (BLOCKED on Same Day)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_T1",
        submitted_at=now_ist,
        status_val="PENDING"
    )
    assert valid is False
    assert reason == "POS T1 requests can be approved from the next day (T+1)."

    # 2. POS T1 - Formats (POS - T1, POS+T1) on Current Date (BLOCKED)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS - T1",
        submitted_at=now_ist,
        status_val="PENDING"
    )
    assert valid is False
    assert reason == "POS T1 requests can be approved from the next day (T+1)."

    # 3. POS T1 - Yesterday (T+1) (ALLOWED)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_T1",
        submitted_at=now_ist - timedelta(days=1),
        status_val="PENDING"
    )
    assert valid is True
    assert reason is None

    # 4. POS T1 - 2 Days Ago (ALLOWED)
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_T1",
        submitted_at=now_ist - timedelta(days=2),
        status_val="PENDING"
    )
    assert valid is True
    assert reason is None


def test_status_protection():
    now_ist = datetime.now(INDIA_TZ)

    # If status is already APPROVED, date validation is bypassed
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_T1",
        submitted_at=now_ist,
        status_val="APPROVED"
    )
    assert valid is True
    assert reason is None

    # If status is REJECTED, date validation is bypassed
    valid, reason = validate_topup_approval_date(
        payment_mode_or_method="POS_T1",
        submitted_at=now_ist,
        status_val="REJECTED"
    )
    assert valid is True
    assert reason is None


from app.core.security import create_access_token
from app.infrastructure.db.models import AdminUserModel, RetailerModel, RetailerWalletModel, TopupRequestModel


@pytest.mark.asyncio
async def test_api_pos_topup_date_validation_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch admin and generate token
        async with AsyncSessionLocal() as db:
            admin_stmt = select(AdminUserModel).where(AdminUserModel.is_deleted == False).limit(1)
            admin = (await db.execute(admin_stmt)).scalars().first()
            admin_id = str(admin.public_id) if admin else str(uuid.uuid4())
            tenant_id = str(admin.tenant_id) if admin and admin.tenant_id else str(uuid.uuid4())
            company_id = str(admin.company_id) if admin and admin.company_id else str(uuid.uuid4())

        token = create_access_token(
            subject=admin_id,
            tenant_id=tenant_id,
            company_id=company_id,
            roles=["SUPER_ADMIN", "ADMIN"]
        )
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Query topup requests list to inspect metadata fields
        list_res = await ac.get("/api/v1/topup/requests?page=1&page_size=10", headers=headers)
        assert list_res.status_code == 200
        data = list_res.json()
        assert data["success"] is True
        assert "items" in data
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "pos_type" in item
            assert "is_pos_t1" in item
            assert "can_approve" in item
            assert "request_date" in item
            assert "current_business_date" in item

        # 3. Create a test POS T1 request in DB submitted today
        async with AsyncSessionLocal() as db:
            ret_stmt = select(RetailerModel).where(RetailerModel.is_deleted == False).limit(1)
            ret = (await db.execute(ret_stmt)).scalars().first()
            assert ret is not None, "Active retailer needed for test"

            now_utc = datetime.now(timezone.utc)
            t1_same_day_id = f"TOP-T1-TEST-{uuid.uuid4().hex[:6].upper()}"
            t1_req = TopupRequestModel(
                public_id=uuid.uuid4(),
                tenant_id=ret.tenant_id,
                company_id=ret.company_id,
                retailer_id=ret.public_id,
                topup_request_id=t1_same_day_id,
                requested_amount=1000.0,
                received_amount=1000.0,
                currency="INR",
                payment_reference=f"UTR-T1-{uuid.uuid4().hex[:8].upper()}",
                payment_method="POS - T1",
                payment_date=now_utc,
                status="PENDING",
                submitted_at=now_utc,
                created_date=now_utc,
                updated_date=now_utc,
                created_by="test",
                updated_by="test"
            )
            db.add(t1_req)
            await db.commit()
            await db.refresh(t1_req)
            t1_req_uuid = str(t1_req.public_id)

        # 4. Attempt to approve same-day POS T1 request -> MUST FAIL with 400 Bad Request
        approve_res = await ac.post(
            f"/api/v1/topup/requests/{t1_req_uuid}/approve",
            json={"approved_amount": 1000.0, "admin_notes": "Test same-day approval"},
            headers=headers
        )
        assert approve_res.status_code == 400
        assert approve_res.json()["detail"] == "POS T1 requests can be approved from the next day (T+1)."

        # 5. Update submission date of the test request to yesterday (T+1 eligible)
        async with AsyncSessionLocal() as db:
            stmt = select(TopupRequestModel).where(TopupRequestModel.public_id == uuid.UUID(t1_req_uuid))
            req_obj = (await db.execute(stmt)).scalars().first()
            yesterday_utc = now_utc - timedelta(days=1)
            req_obj.submitted_at = yesterday_utc
            req_obj.payment_date = yesterday_utc
            req_obj.created_date = yesterday_utc
            await db.commit()

        # 6. Verify GET detail returns can_approve = True
        detail_res = await ac.get(f"/api/v1/topup/requests/{t1_req_uuid}", headers=headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()["data"]
        assert detail_data["is_pos_t1"] is True
        assert detail_data["can_approve"] is True
        assert detail_data["approval_block_reason"] is None
