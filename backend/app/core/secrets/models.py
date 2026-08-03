"""Enterprise Bitwarden Secrets Management Platform — Domain Models & Schemas"""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


@dataclass
class SecretItem:
    key: str
    value: str
    category: str = "GENERAL"  # APPLICATION, DATABASE, CLOUD, BANKING, NOTIFICATION, AI, MONITORING
    environment: str = "DEVELOPMENT"
    version: int = 1
    folder: Optional[str] = None
    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def get_masked_value(self) -> str:
        if len(self.value) <= 4:
            return "****"
        return f"{self.value[:2]}****{self.value[-2:]}"


@dataclass
class SecretVaultConfig:
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    master_password: Optional[str] = None
    server_url: str = "https://vault.bitwarden.com"
    app_env: str = "DEVELOPMENT"
    cache_ttl_seconds: int = 300
    circuit_breaker_threshold: int = 3


@dataclass
class SecretRotationEvent:
    rotation_id: str
    key: str
    old_version: int
    new_version: int
    rotated_by: str
    rotated_at: datetime
    status: str = "COMPLETED"


@dataclass
class SecretAuditRecord:
    audit_id: str
    action: str  # LOADED, ROTATED, VALIDATED, FAILED, ACCESS_DENIED
    key: str
    masked_value: str
    actor: str
    timestamp: datetime
    success: bool = True
    details: Optional[str] = None


class SecretHealthResponse(BaseModel):
    vault_connected: bool
    vault_unlocked: bool
    cache_healthy: bool
    total_secrets_cached: int
    rotation_service_healthy: bool
    cli_available: bool
    last_synced_at: Optional[datetime] = None
    app_env: str
