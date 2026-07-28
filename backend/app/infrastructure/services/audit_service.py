import uuid
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import AuditLogModel


class AuditLogger:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        action: str,
        resource_type: str,
        actor_id: Optional[uuid.UUID] = None,
        actor_email: Optional[str] = None,
        company_id: Optional[uuid.UUID] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLogModel:
        audit_entry = AuditLogModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=company_id,
            actor_id=actor_id,
            actor_email=actor_email,
            action=action.upper(),
            resource_type=resource_type.upper(),
            resource_id=str(resource_id) if resource_id else None,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)
        return audit_entry
