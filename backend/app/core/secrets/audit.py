"""Enterprise Bitwarden Secrets Management Platform — Masked Audit Logging Engine"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from app.core.secrets.models import SecretAuditRecord
from app.core.secrets.interfaces import SecretAuditorInterface

logger = logging.getLogger("secrets_audit")


class SecretAuditor(SecretAuditorInterface):
    """
    Audit logger for secrets platform.
    Records every secret load, access, rotation, and validation event.
    NEVER logs actual unmasked secret values.
    """
    def __init__(self):
        self._audit_logs: List[SecretAuditRecord] = []

    def log_access(
        self, action: str, key: str, actor: str, success: bool = True, details: Optional[str] = None
    ) -> SecretAuditRecord:
        masked_val = "****"
        record = SecretAuditRecord(
            audit_id=str(uuid.uuid4()),
            action=action.upper(),
            key=key,
            masked_value=masked_val,
            actor=actor,
            timestamp=datetime.now(timezone.utc),
            success=success,
            details=details,
        )
        self._audit_logs.append(record)
        logger.info(f"SECRET_AUDIT | Action: {record.action} | Key: {key} | Actor: {actor} | Success: {success}")
        return record

    def get_audit_trail(self) -> List[SecretAuditRecord]:
        return self._audit_logs
