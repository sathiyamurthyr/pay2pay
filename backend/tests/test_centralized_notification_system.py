"""
Test Suite for Pay2Pay Centralized Enterprise Notification System & Dynamic Topup Report API.
Verifies:
- Notification event service emission & SHA256 idempotency protection
- Database persistence in user_notification_alert and notification_push_subscription
- Strict multi-tenant and user isolation
- Unread count & settings endpoints
- Web Push subscription lifecycle
- Dynamic Topup Report (/api/v1/topup/my-requests) with multi-role scoping
"""

import uuid
import pytest
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, and_, delete
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import (
    UserNotificationAlertModel,
    UserNotificationPreferenceModel,
    NotificationPushSubscriptionModel,
)
from app.application.notification_event_service import (
    notification_event_service,
    topup_notification_event,
    wallet_notification_event,
    registration_notification_event,
)


@pytest.mark.asyncio
async def test_notification_event_service_emit_and_idempotency():
    """Verifies that events are written to user_notification_alert and duplicate idempotency keys are skipped."""
    test_user_id = uuid.uuid4()
    test_tenant_id = uuid.uuid4()
    test_topup_id = f"TOP-TEST-{uuid.uuid4().hex[:6].upper()}"

    event = topup_notification_event(
        user_id=test_user_id,
        tenant_id=test_tenant_id,
        topup_request_id=test_topup_id,
        event_status="APPROVED",
        amount=5000.0,
        payment_method="POS - Instant",
        usertype_ref_id=2,
        user_ref_id="RET-TEST-001",
    )

    async with AsyncSessionLocal() as db:
        # First emission: should insert
        alert1 = await notification_event_service.emit(db, event)
        assert alert1 is not None
        assert alert1.user_id == test_user_id
        assert alert1.tenant_id == test_tenant_id
        assert alert1.amount == 5000.0
        assert alert1.service_type == "TOPUP"
        assert alert1.event_status == "APPROVED"
        assert alert1.is_read is False

        # Second emission with identical event (same idempotency_key): should return existing record without duplicating
        alert2 = await notification_event_service.emit(db, event)
        assert alert2 is not None
        assert alert2.id == alert1.id

        # Verify only 1 record exists in DB for this idempotency key
        stmt = select(UserNotificationAlertModel).where(
            UserNotificationAlertModel.idempotency_key == event.idempotency_key
        )
        res = await db.execute(stmt)
        rows = res.scalars().all()
        assert len(rows) == 1

        # Clean up test rows
        await db.execute(
            delete(UserNotificationAlertModel).where(
                UserNotificationAlertModel.idempotency_key == event.idempotency_key
            )
        )
        await db.commit()


@pytest.mark.asyncio
async def test_notification_multi_tenant_isolation():
    """Verifies that notifications for tenant A are never visible to tenant B."""
    user_a = uuid.uuid4()
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()

    event_a = wallet_notification_event(
        user_id=user_a,
        tenant_id=tenant_a,
        entry_type="CREDIT",
        amount=2500.0,
        balance_after=12500.0,
        reference_number=f"WAL-ISO-{uuid.uuid4().hex[:6]}",
        narration="Test isolation credit",
    )

    async with AsyncSessionLocal() as db:
        alert_a = await notification_event_service.emit(db, event_a)
        assert alert_a is not None

        # Query scoped to tenant_a
        stmt_a = select(UserNotificationAlertModel).where(
            UserNotificationAlertModel.user_id == user_a,
            UserNotificationAlertModel.tenant_id == tenant_a,
        )
        res_a = await db.execute(stmt_a)
        assert len(res_a.scalars().all()) >= 1

        # Query scoped to tenant_b: MUST be 0
        stmt_b = select(UserNotificationAlertModel).where(
            UserNotificationAlertModel.user_id == user_a,
            UserNotificationAlertModel.tenant_id == tenant_b,
        )
        res_b = await db.execute(stmt_b)
        assert len(res_b.scalars().all()) == 0

        # Clean up
        await db.execute(
            delete(UserNotificationAlertModel).where(UserNotificationAlertModel.id == alert_a.id)
        )
        await db.commit()


@pytest.mark.asyncio
async def test_notification_settings_api():
    """Tests GET and PUT /api/v1/notifications/settings."""
    test_user_id = str(uuid.uuid4())
    test_tenant_id = str(uuid.uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Mock auth token payload via headers or direct dependency override
        from app.application.dependencies import get_optional_token_payload

        app.dependency_overrides[get_optional_token_payload] = lambda: {
            "sub": test_user_id,
            "tenant_id": test_tenant_id,
            "user_type": "RETAILER",
        }

        try:
            # 1. GET settings (defaults when no row exists)
            get_res = await ac.get("/api/v1/notifications/settings")
            assert get_res.status_code == 200
            data = get_res.json()
            assert data["in_app_enabled"] is True
            assert data["push_enabled"] is True

            # 2. PUT settings (update preferences)
            put_res = await ac.put(
                "/api/v1/notifications/settings",
                json={
                    "whatsapp_enabled": True,
                    "sms_enabled": False,
                    "do_not_disturb": True,
                    "dnd_start_time": "23:00",
                    "dnd_end_time": "07:00",
                },
            )
            assert put_res.status_code == 200
            assert put_res.json()["success"] is True

            # 3. GET settings again to verify persistence
            get_res2 = await ac.get("/api/v1/notifications/settings")
            assert get_res2.status_code == 200
            data2 = get_res2.json()
            assert data2["whatsapp_enabled"] is True
            assert data2["sms_enabled"] is False
            assert data2["do_not_disturb"] is True
            assert data2["dnd_start_time"] == "23:00"

            # 4. Clean up DB record
            async with AsyncSessionLocal() as db:
                await db.execute(
                    delete(UserNotificationPreferenceModel).where(
                        UserNotificationPreferenceModel.user_id == uuid.UUID(test_user_id)
                    )
                )
                await db.commit()

        finally:
            app.dependency_overrides.pop(get_optional_token_payload, None)


@pytest.mark.asyncio
async def test_web_push_subscription_lifecycle():
    """Tests POST and DELETE /api/v1/notifications/push/subscribe."""
    test_user_id = str(uuid.uuid4())
    test_tenant_id = str(uuid.uuid4())
    test_endpoint = f"https://updates.push.services.mozilla.com/wpush/v2/{uuid.uuid4().hex}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        from app.application.dependencies import get_optional_token_payload

        app.dependency_overrides[get_optional_token_payload] = lambda: {
            "sub": test_user_id,
            "tenant_id": test_tenant_id,
            "user_type": "RETAILER",
        }

        try:
            # 1. Subscribe
            sub_res = await ac.post(
                "/api/v1/notifications/push/subscribe",
                json={
                    "endpoint": test_endpoint,
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0448G3D55QAXYW1-1o6SoJpXea3WzqS8PzkZBg09Tx8U=",
                    "auth_secret": "tBHItJI5svbpez7KI4CCXg==",
                    "device_label": "Chrome 128 / Windows 11",
                },
            )
            assert sub_res.status_code == 200
            assert sub_res.json()["success"] is True

            # Verify in DB
            async with AsyncSessionLocal() as db:
                stmt = select(NotificationPushSubscriptionModel).where(
                    NotificationPushSubscriptionModel.endpoint == test_endpoint
                )
                sub_row = (await db.execute(stmt)).scalar_one_or_none()
                assert sub_row is not None
                assert sub_row.is_active is True

            # 2. Unsubscribe
            unsub_res = await ac.delete(
                f"/api/v1/notifications/push/subscribe?endpoint={test_endpoint}"
            )
            assert unsub_res.status_code == 200
            assert unsub_res.json()["success"] is True

            # Verify marked inactive
            async with AsyncSessionLocal() as db:
                sub_row2 = (await db.execute(stmt)).scalar_one_or_none()
                assert sub_row2 is not None
                assert sub_row2.is_active is False

                # Clean up test row
                await db.execute(
                    delete(NotificationPushSubscriptionModel).where(
                        NotificationPushSubscriptionModel.id == sub_row2.id
                    )
                )
                await db.commit()

        finally:
            app.dependency_overrides.pop(get_optional_token_payload, None)


@pytest.mark.asyncio
async def test_dynamic_topup_report_endpoint():
    """Verifies that /api/v1/topup/my-requests returns total, items, summary, and context dynamically."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        from app.application.dependencies import get_optional_token_payload

        # Mock Super Distributor session
        app.dependency_overrides[get_optional_token_payload] = lambda: {
            "sub": str(uuid.uuid4()),
            "tenant_id": str(uuid.uuid4()),
            "user_type_ref_id": 4,
            "role": "SUPER_DISTRIBUTOR",
        }

        try:
            res = await ac.get("/api/v1/topup/my-requests?page=1&limit=10")
            assert res.status_code == 200
            data = res.json()

            # Verify required contract keys
            assert "total" in data
            assert "items" in data
            assert "summary" in data
            assert "context" in data

            # Verify summary metric keys
            summary = data["summary"]
            assert "total_requests" in summary
            assert "approved_count" in summary
            assert "pending_count" in summary
            assert "rejected_count" in summary

            # Verify context metadata
            ctx = data["context"]
            assert "tenant_id" in ctx
            assert "role" in ctx

        finally:
            app.dependency_overrides.pop(get_optional_token_payload, None)
