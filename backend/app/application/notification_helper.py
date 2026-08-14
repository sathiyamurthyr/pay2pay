import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.infrastructure.db.models import UserNotificationAlertModel

async def create_user_notification_event(
    db: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "TRANSACTION",
    company_id: Optional[uuid.UUID] = None,
    customer_id: Optional[uuid.UUID] = None,
    transaction_id: Optional[uuid.UUID] = None,
    transaction_type: Optional[str] = None,
    amount: Optional[float] = None,
    status: str = "SUCCESS",
    reference_number: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None
) -> UserNotificationAlertModel:
    """
    Creates and persists a real notification event record in the database.
    Prevents duplicate alerts for identical transaction status events.
    """
    if transaction_id and reference_number:
        stmt = select(UserNotificationAlertModel).where(
            and_(
                UserNotificationAlertModel.user_id == user_id,
                UserNotificationAlertModel.transaction_id == transaction_id,
                UserNotificationAlertModel.status == status
            )
        )
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            return existing

    alert = UserNotificationAlertModel(
        public_id=uuid.uuid4(),
        user_id=user_id,
        tenant_id=tenant_id,
        company_id=company_id,
        customer_id=customer_id,
        notification_type=notification_type,
        title=title,
        message=message,
        transaction_id=transaction_id,
        transaction_type=transaction_type,
        amount=amount,
        currency="INR",
        status=status,
        reference_number=reference_number,
        is_read=False,
        metadata_json=metadata_json or {}
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert
