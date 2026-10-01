"""
Centralized Notification Event Service -- Pay2Pay Enterprise Platform
====================================================================
Single entry-point for all business services to generate in-app notifications.

Usage:
    from app.application.notification_event_service import notification_event_service, ServiceType, EventType, NotificationEvent

    await notification_event_service.emit(
        db=db,
        event=topup_notification_event(
            user_id=retailer.public_id,
            tenant_id=retailer.tenant_id,
            topup_request_id=topup_record.topup_request_id,
            event_status="APPROVED",
            amount=1000.0,
        ),
    )

Rules:
 - DO NOT hard-code user IDs -- always pass from authenticated session / DB model.
 - DO NOT use localStorage/sessionStorage for user resolution.
 - Idempotency key prevents duplicate alerts for the same business event+status.
 - Tenant isolation is enforced at DB-write level.
 - Required integer ref columns: usertype_ref_id, user_ref_id, tenant_ref_id, company_ref_id
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import UserNotificationAlertModel

logger = logging.getLogger("notification_event_service")


# -- Service / Event Taxonomy --------------------------------------------------

class ServiceType(str, Enum):
    TOPUP = "TOPUP"
    RECHARGE = "RECHARGE"
    TRANSACTION = "TRANSACTION"
    MDR = "MDR"
    WALLET = "WALLET"
    PAYOUT = "PAYOUT"
    KYC = "KYC"
    REGISTRATION = "REGISTRATION"
    BENEFICIARY = "BENEFICIARY"
    MAPPING = "MAPPING"
    ADMIN = "ADMIN"
    SYSTEM = "SYSTEM"
    COMPLIANCE = "COMPLIANCE"


class EventType(str, Enum):
    STATUS_CHANGED = "STATUS_CHANGED"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"
    REFUNDED = "REFUNDED"
    ON_HOLD = "ON_HOLD"
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    MAPPED = "MAPPED"
    UNMAPPED = "UNMAPPED"
    REGISTERED = "REGISTERED"
    ESCALATED = "ESCALATED"
    REMINDER = "REMINDER"
    ALERT = "ALERT"


class NotificationEvent:
    """Structured payload for a single business notification event."""
    __slots__ = (
        "user_id", "tenant_id", "company_id",
        "service_type", "event_type", "event_status",
        "title", "message",
        "amount", "currency",
        "reference_number", "reference_type", "reference_ref_id",
        "transaction_id", "transaction_type",
        "customer_id",
        "notification_type",
        "usertype_ref_id", "user_ref_id",
        "tenant_ref_id", "company_ref_id",
        "metadata",
    )

    def __init__(
        self,
        *,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        service_type: ServiceType,
        event_type: EventType,
        event_status: str,
        title: str,
        message: str,
        amount: Optional[float] = None,
        currency: str = "INR",
        reference_number: Optional[str] = None,
        reference_type: Optional[str] = None,
        reference_ref_id: Optional[str] = None,
        transaction_id: Optional[uuid.UUID] = None,
        transaction_type: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        notification_type: Optional[str] = None,
        usertype_ref_id: Optional[int] = None,
        user_ref_id: Optional[str] = None,
        tenant_ref_id: Optional[int] = None,
        company_ref_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.company_id = company_id
        self.service_type = service_type
        self.event_type = event_type
        self.event_status = event_status.upper() if event_status else "UNKNOWN"
        self.title = title
        self.message = message
        self.amount = amount
        self.currency = currency or "INR"
        self.reference_number = reference_number
        self.reference_type = reference_type
        self.reference_ref_id = reference_ref_id
        self.transaction_id = transaction_id
        self.transaction_type = transaction_type
        self.customer_id = customer_id
        self.notification_type = notification_type or service_type.value
        self.usertype_ref_id = usertype_ref_id
        self.user_ref_id = user_ref_id
        self.tenant_ref_id = tenant_ref_id
        self.company_ref_id = company_ref_id
        self.metadata = metadata or {}

    def build_idempotency_key(self) -> str:
        """Deterministic dedup key: same user+service+reference+status = same key."""
        parts = [
            str(self.user_id),
            str(self.tenant_id),
            self.service_type.value,
            self.event_status,
            self.reference_ref_id or self.reference_number or "",
        ]
        return hashlib.sha256("|".join(parts).encode()).hexdigest()

    @property
    def idempotency_key(self) -> str:
        return self.build_idempotency_key()


# -- SSE Broadcast Registry ---------------------------------------------------
_sse_listeners: Dict[str, list] = {}


def register_sse_listener(user_id_str: str, queue: asyncio.Queue) -> None:
    _sse_listeners.setdefault(user_id_str, []).append(queue)


def deregister_sse_listener(user_id_str: str, queue: asyncio.Queue) -> None:
    listeners = _sse_listeners.get(user_id_str, [])
    try:
        listeners.remove(queue)
    except ValueError:
        pass
    if not listeners:
        _sse_listeners.pop(user_id_str, None)


async def _broadcast_sse(user_id: uuid.UUID, event_data: Dict[str, Any]) -> None:
    key = str(user_id)
    listeners = list(_sse_listeners.get(key, []))
    if not listeners:
        return
    serialized = json.dumps(event_data, default=str)
    dead = []
    for q in listeners:
        try:
            q.put_nowait(serialized)
        except (asyncio.QueueFull, Exception):
            dead.append(q)
    for q in dead:
        deregister_sse_listener(key, q)


# -- Main Service -------------------------------------------------------------

class NotificationEventService:
    """Central notification service -- call emit() from any business handler."""

    async def emit(
        self,
        db: AsyncSession,
        event: NotificationEvent,
        *,
        flush_only: bool = False,
    ) -> Optional[UserNotificationAlertModel]:
        """
        Persist and broadcast a notification event.

        Args:
            db: Active async SQLAlchemy session.
            event: The fully-constructed NotificationEvent.
            flush_only: If True, only flush without commit (for use inside a
                        larger transaction committed by the caller).

        Returns:
            The persisted UserNotificationAlertModel, or None on failure.
        """
        try:
            idempotency_key = event.build_idempotency_key()

            # Idempotency check
            dup = (await db.execute(
                select(UserNotificationAlertModel).where(
                    and_(
                        UserNotificationAlertModel.idempotency_key == idempotency_key,
                        UserNotificationAlertModel.user_id == event.user_id,
                        UserNotificationAlertModel.tenant_id == event.tenant_id,
                    )
                )
            )).scalars().first()
            if dup:
                logger.debug(f"[NotificationEventService] Duplicate suppressed: {idempotency_key[:16]}...")
                return dup

            now = datetime.now(timezone.utc)

            alert = UserNotificationAlertModel(
                public_id=uuid.uuid4(),
                tenant_id=event.tenant_id,
                company_id=event.company_id,
                user_id=event.user_id,
                user_ref_id=event.user_ref_id,
                usertype_ref_id=event.usertype_ref_id,
                notification_type=event.notification_type,
                service_type=event.service_type.value,
                event_type=event.event_type.value,
                event_status=event.event_status,
                title=event.title,
                message=event.message,
                amount=event.amount,
                currency=event.currency,
                reference_number=event.reference_number,
                reference_type=event.reference_type,
                reference_ref_id=event.reference_ref_id,
                transaction_id=event.transaction_id,
                transaction_type=event.transaction_type,
                customer_id=event.customer_id,
                status="UNREAD",
                is_read=False,
                delivery_status="CREATED",
                push_sent=False,
                idempotency_key=idempotency_key,
                metadata_json=event.metadata or {},
                created_date=now,
                updated_date=now,
            )

            db.add(alert)

            if flush_only:
                await db.flush()
            else:
                await db.commit()
                await db.refresh(alert)

            # SSE broadcast (fire-and-forget)
            asyncio.create_task(_broadcast_sse(event.user_id, {
                "id": str(alert.public_id),
                "service_type": event.service_type.value,
                "event_type": event.event_type.value,
                "event_status": event.event_status,
                "title": event.title,
                "message": event.message,
                "amount": event.amount,
                "currency": event.currency,
                "reference_number": event.reference_number,
                "reference_ref_id": event.reference_ref_id,
                "notification_type": event.notification_type,
                "is_read": False,
                "created_at": now.isoformat(),
            }))

            logger.info(
                f"[NotifSvc] OK {event.service_type.value}/{event.event_status} "
                f"user={event.user_id} ref={event.reference_ref_id}"
            )
            return alert

        except Exception as exc:
            logger.error(
                f"[NotifSvc] Non-critical emit failure "
                f"(svc={event.service_type}, ref={event.reference_ref_id}): {exc}",
                exc_info=True,
            )
            try:
                await db.rollback()
            except Exception:
                pass
            return None

    async def emit_safe(
        self,
        db: AsyncSession,
        event: NotificationEvent,
        *,
        flush_only: bool = False,
    ) -> None:
        """Fire-and-forget -- never raises. Use inside atomic business transactions."""
        try:
            await self.emit(db, event, flush_only=flush_only)
        except Exception as exc:
            logger.warning(f"[NotifSvc.emit_safe] Suppressed: {exc}")


# Singleton
notification_event_service = NotificationEventService()


# -- Convenience Factory Functions --------------------------------------------

def topup_notification_event(
    *,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    company_id: Optional[uuid.UUID] = None,
    topup_request_id: str,
    event_status: str,
    amount: Optional[float] = None,
    payment_method: Optional[str] = None,
    usertype_ref_id: Optional[int] = None,
    user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None,
    company_ref_id: Optional[int] = None,
    admin_notes: Optional[str] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon_map = {
        "APPROVED": "✅", "REJECTED": "❌", "PENDING": "⏳",
        "SUBMITTED": "📤", "UNDER_REVIEW": "🔍", "ON_HOLD": "⏸", "CANCELLED": "🚫"
    }
    icon = icon_map.get(status_upper, "🔔")
    amt_str = f" ₹{amount:,.2f}" if amount else ""

    title_map = {
        "SUBMITTED": f"{icon} Top-Up Request Submitted",
        "APPROVED": f"{icon} Top-Up Approved",
        "REJECTED": f"{icon} Top-Up Rejected",
        "UNDER_REVIEW": f"{icon} Top-Up Under Review",
        "ON_HOLD": f"{icon} Top-Up On Hold",
        "CANCELLED": f"{icon} Top-Up Cancelled",
    }
    title = title_map.get(status_upper, f"{icon} Top-Up Status Updated")

    if status_upper == "SUBMITTED":
        message = f"Your top-up request {topup_request_id}{amt_str} has been submitted and is awaiting admin approval."
    elif status_upper == "APPROVED":
        message = f"Your top-up request {topup_request_id}{amt_str} has been approved and credited to your wallet."
    elif status_upper == "REJECTED":
        reason = f" Reason: {admin_notes}" if admin_notes else ""
        message = f"Your top-up request {topup_request_id} has been rejected.{reason}"
    elif status_upper == "UNDER_REVIEW":
        message = f"Your top-up request {topup_request_id} is currently under review."
    elif status_upper == "ON_HOLD":
        message = f"Your top-up request {topup_request_id} has been placed on hold."
    else:
        message = f"Top-up request {topup_request_id} status changed to {status_upper}."

    event_type_map = {
        "SUBMITTED": EventType.SUBMITTED, "APPROVED": EventType.APPROVED,
        "REJECTED": EventType.REJECTED, "COMPLETED": EventType.COMPLETED,
        "CANCELLED": EventType.FAILED, "ON_HOLD": EventType.ON_HOLD,
        "UNDER_REVIEW": EventType.STATUS_CHANGED,
    }
    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.TOPUP,
        event_type=event_type_map.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper,
        title=title, message=message,
        amount=amount, currency="INR",
        reference_number=topup_request_id,
        reference_type="TOPUP_REQUEST",
        reference_ref_id=topup_request_id,
        notification_type="TOPUP",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"payment_method": payment_method, "admin_notes": admin_notes},
    )


def transaction_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    txn_id: str, event_status: str,
    amount: Optional[float] = None, service_name: Optional[str] = None,
    transaction_type: Optional[str] = None, transaction_id: Optional[uuid.UUID] = None,
    customer_id: Optional[uuid.UUID] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = {"SUCCESS": "✅", "FAILED": "❌", "PENDING": "⏳", "REVERSED": "🔄"}.get(status_upper, "🔔")
    svc = service_name or "Transaction"
    amt_str = f" ₹{amount:,.2f}" if amount else ""
    title = f"{icon} {svc} {status_upper.title()}"
    if status_upper == "SUCCESS":
        message = f"Your {svc.lower()} of{amt_str} was successful. Ref: {txn_id}"
    elif status_upper == "FAILED":
        message = f"Your {svc.lower()} {txn_id} failed. Please retry or contact support."
    else:
        message = f"{svc} {txn_id} status updated to {status_upper}."

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.TRANSACTION,
        event_type={"SUCCESS": EventType.COMPLETED, "FAILED": EventType.FAILED,
                    "REVERSED": EventType.REVERSED}.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper, title=title, message=message,
        amount=amount, currency="INR",
        reference_number=txn_id, reference_type="TRANSACTION", reference_ref_id=txn_id,
        transaction_id=transaction_id, transaction_type=transaction_type, customer_id=customer_id,
        notification_type="TRANSACTION",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
    )


def mdr_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    request_id: str, event_status: str,
    mdr_rate: Optional[float] = None, payment_mode: Optional[str] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
    admin_notes: Optional[str] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = {"APPROVED": "✅", "REJECTED": "❌", "SUBMITTED": "📤"}.get(status_upper, "🔔")
    mode = payment_mode or "MDR"
    if status_upper == "SUBMITTED":
        title, message = f"{icon} MDR Request Submitted", f"MDR request {request_id} for {mode} submitted."
    elif status_upper == "APPROVED":
        rate_str = f" New rate: {mdr_rate}%" if mdr_rate is not None else ""
        title, message = f"{icon} MDR Request Approved", f"MDR request {request_id} approved.{rate_str}"
    elif status_upper == "REJECTED":
        reason = f" Reason: {admin_notes}" if admin_notes else ""
        title, message = f"{icon} MDR Request Rejected", f"MDR request {request_id} rejected.{reason}"
    else:
        title, message = f"{icon} MDR Updated", f"MDR request {request_id} status: {status_upper}."

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.MDR,
        event_type={"SUBMITTED": EventType.SUBMITTED, "APPROVED": EventType.APPROVED,
                    "REJECTED": EventType.REJECTED}.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper, title=title, message=message,
        reference_number=request_id, reference_type="MDR_REQUEST", reference_ref_id=request_id,
        notification_type="MDR",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"mdr_rate": mdr_rate, "payment_mode": payment_mode, "admin_notes": admin_notes},
    )


def recharge_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    txn_id: str, event_status: str,
    amount: Optional[float] = None, operator: Optional[str] = None,
    mobile_number: Optional[str] = None, customer_id: Optional[uuid.UUID] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = {"SUCCESS": "✅", "FAILED": "❌", "PENDING": "⏳"}.get(status_upper, "🔔")
    op = operator or "Recharge"
    amt_str = f" ₹{amount:,.2f}" if amount else ""
    mob = f" (*{mobile_number[-4:]})" if mobile_number and len(mobile_number) >= 4 else ""
    if status_upper == "SUCCESS":
        title = f"{icon} Recharge Successful"
        message = f"Recharge of{amt_str} for {op}{mob} was successful. Ref: {txn_id}"
    elif status_upper == "FAILED":
        title = f"{icon} Recharge Failed"
        message = f"Recharge {txn_id} for {op}{mob} failed."
    else:
        title = f"{icon} Recharge {status_upper.title()}"
        message = f"Recharge {txn_id} status: {status_upper}."

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.RECHARGE,
        event_type={"SUCCESS": EventType.COMPLETED, "FAILED": EventType.FAILED}.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper, title=title, message=message,
        amount=amount, currency="INR",
        reference_number=txn_id, reference_type="RECHARGE_TRANSACTION", reference_ref_id=txn_id,
        customer_id=customer_id, notification_type="RECHARGE",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"operator": operator, "mobile_number": mobile_number},
    )


def payout_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    txn_id: str, event_status: str,
    amount: Optional[float] = None, beneficiary_name: Optional[str] = None,
    bank_name: Optional[str] = None, account_number: Optional[str] = None,
    transaction_id: Optional[uuid.UUID] = None, customer_id: Optional[uuid.UUID] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = {"SUCCESS": "✅", "FAILED": "❌", "PENDING": "⏳",
            "PROCESSING": "⚙️", "REVERSED": "🔄"}.get(status_upper, "🔔")
    ben = f" to {beneficiary_name}" if beneficiary_name else ""
    acc = f" (**{account_number[-4:]})" if account_number and len(account_number) >= 4 else ""
    amt_str = f" ₹{amount:,.2f}" if amount else ""
    if status_upper == "SUCCESS":
        title = f"{icon} Payout Successful"
        message = f"Payout of{amt_str}{ben}{acc} completed. Ref: {txn_id}"
    elif status_upper == "FAILED":
        title = f"{icon} Payout Failed"
        message = f"Payout {txn_id}{ben}{acc} failed."
    elif status_upper == "REVERSED":
        title = f"{icon} Payout Reversed"
        message = f"Payout {txn_id}{ben} reversed."
    else:
        title = f"{icon} Payout {status_upper.title()}"
        message = f"Payout {txn_id} status: {status_upper}."

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.PAYOUT,
        event_type={"SUCCESS": EventType.COMPLETED, "FAILED": EventType.FAILED,
                    "REVERSED": EventType.REVERSED}.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper, title=title, message=message,
        amount=amount, currency="INR",
        reference_number=txn_id, reference_type="PAYOUT_TRANSACTION", reference_ref_id=txn_id,
        transaction_id=transaction_id, transaction_type="PAYOUT",
        customer_id=customer_id, notification_type="PAYOUT",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"beneficiary_name": beneficiary_name, "bank_name": bank_name, "account_number": account_number},
    )


def wallet_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    entry_type: str, amount: float,
    balance_after: Optional[float] = None, reference_number: Optional[str] = None,
    narration: Optional[str] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
) -> NotificationEvent:
    entry_upper = (entry_type or "").upper()
    icon = "📈" if entry_upper == "CREDIT" else "📉"
    bal_str = f" Balance: ₹{balance_after:,.2f}" if balance_after is not None else ""
    if entry_upper == "CREDIT":
        title, message = f"{icon} Wallet Credited", f"₹{amount:,.2f} credited to your wallet.{bal_str}"
    else:
        title, message = f"{icon} Wallet Debited", f"₹{amount:,.2f} debited from your wallet.{bal_str}"
    if narration:
        message += f" -- {narration}"

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.WALLET,
        event_type=EventType.CREDIT if entry_upper == "CREDIT" else EventType.DEBIT,
        event_status=entry_upper, title=title, message=message,
        amount=amount, currency="INR",
        reference_number=reference_number, reference_type="WALLET_LEDGER", reference_ref_id=reference_number,
        notification_type="WALLET",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"narration": narration, "balance_after": balance_after},
    )


def kyc_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    kyc_ref: str, event_status: str, kyc_type: Optional[str] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = {"VERIFIED": "✅", "REJECTED": "❌", "PENDING": "⏳", "SUBMITTED": "📤"}.get(status_upper, "🔔")
    ktype = kyc_type or "KYC"
    title = f"{icon} {ktype} {status_upper.title()}"
    if status_upper == "VERIFIED":
        message = f"Your {ktype} verification {kyc_ref} completed successfully."
    elif status_upper == "REJECTED":
        r = f" Reason: {reason}" if reason else ""
        message = f"Your {ktype} verification {kyc_ref} was not approved.{r}"
    else:
        message = f"Your {ktype} verification {kyc_ref} status: {status_upper}."

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.KYC,
        event_type={"SUBMITTED": EventType.SUBMITTED, "VERIFIED": EventType.VERIFIED,
                    "REJECTED": EventType.UNVERIFIED}.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper, title=title, message=message,
        reference_number=kyc_ref, reference_type="KYC", reference_ref_id=kyc_ref,
        notification_type="KYC",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"kyc_type": kyc_type, "reason": reason},
    )


def registration_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    retailer_code: str, event_status: str,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = {"APPROVED": "✅", "ACTIVE": "🟢", "REJECTED": "❌", "PENDING_APPROVAL": "⏳"}.get(status_upper, "🔔")
    if status_upper in ("APPROVED", "ACTIVE"):
        title, message = f"{icon} Account Activated", f"Your retailer account ({retailer_code}) has been approved and activated."
    elif status_upper == "REJECTED":
        r = f" Reason: {reason}" if reason else ""
        title, message = f"{icon} Account Registration Rejected", f"Your retailer account ({retailer_code}) registration was rejected.{r}"
    elif status_upper == "PENDING_APPROVAL":
        title, message = f"{icon} Registration Pending Approval", f"Your retailer account ({retailer_code}) is awaiting admin approval."
    else:
        title, message = f"{icon} Account Status Updated", f"Your account ({retailer_code}) status changed to {status_upper}."

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.REGISTRATION,
        event_type={"APPROVED": EventType.APPROVED, "ACTIVE": EventType.APPROVED,
                    "REJECTED": EventType.REJECTED, "PENDING_APPROVAL": EventType.SUBMITTED}.get(status_upper, EventType.STATUS_CHANGED),
        event_status=status_upper, title=title, message=message,
        reference_number=retailer_code, reference_type="RETAILER_REGISTRATION", reference_ref_id=retailer_code,
        notification_type="REGISTRATION",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"reason": reason},
    )


def mapping_notification_event(
    *,
    user_id: uuid.UUID, tenant_id: uuid.UUID, company_id: Optional[uuid.UUID] = None,
    mapping_ref: str, event_status: str,
    mapped_to: Optional[str] = None, mapped_type: Optional[str] = None,
    usertype_ref_id: Optional[int] = None, user_ref_id: Optional[str] = None,
    tenant_ref_id: Optional[int] = None, company_ref_id: Optional[int] = None,
) -> NotificationEvent:
    status_upper = (event_status or "").upper()
    icon = "🔗" if "MAPPED" in status_upper else "🔓"
    m_to = f" to {mapped_to}" if mapped_to else ""
    m_type = mapped_type or "entity"
    if "MAPPED" in status_upper and "UN" not in status_upper:
        title, message = f"{icon} Retailer Mapped", f"You have been mapped{m_to}. Ref: {mapping_ref}"
    else:
        title, message = f"{icon} Retailer Unmapped", f"Your mapping{m_to} removed. Ref: {mapping_ref}"

    return NotificationEvent(
        user_id=user_id, tenant_id=tenant_id, company_id=company_id,
        service_type=ServiceType.MAPPING,
        event_type=EventType.MAPPED if ("MAPPED" in status_upper and "UN" not in status_upper) else EventType.UNMAPPED,
        event_status=status_upper, title=title, message=message,
        reference_number=mapping_ref, reference_type="MAPPING", reference_ref_id=mapping_ref,
        notification_type="MAPPING",
        usertype_ref_id=usertype_ref_id, user_ref_id=user_ref_id,
        tenant_ref_id=tenant_ref_id, company_ref_id=company_ref_id,
        metadata={"mapped_to": mapped_to, "mapped_type": m_type},
    )
