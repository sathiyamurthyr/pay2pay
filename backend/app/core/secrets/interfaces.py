"""Enterprise Bitwarden Secrets Management Platform — Clean Architecture Interfaces"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.core.secrets.models import SecretItem, SecretRotationEvent, SecretAuditRecord


class SecretProviderInterface(ABC):
    @abstractmethod
    def authenticate(self) -> bool:
        """Authenticate with Bitwarden CLI or Secrets Manager (BWS)."""
        pass

    @abstractmethod
    def unlock_vault(self) -> bool:
        """Unlock the Bitwarden vault session."""
        pass

    @abstractmethod
    def get_secret(self, key: str) -> Optional[SecretItem]:
        """Fetch a single secret by key/name."""
        pass

    @abstractmethod
    def list_secrets(self, folder: Optional[str] = None) -> List[SecretItem]:
        """Fetch all secrets under a folder/environment."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if vault is reachable and unlocked."""
        pass


class SecretCacheInterface(ABC):
    @abstractmethod
    def get(self, key: str) -> Optional[SecretItem]:
        """Retrieve secret from memory cache."""
        pass

    @abstractmethod
    def set(self, key: str, secret: SecretItem, ttl_seconds: int = 300) -> None:
        """Set secret in memory cache with TTL."""
        pass

    @abstractmethod
    def invalidate(self, key: Optional[str] = None) -> None:
        """Invalidate single or all cached secrets."""
        pass


class SecretValidatorInterface(ABC):
    @abstractmethod
    def validate_required_secrets(self, secrets: Dict[str, SecretItem]) -> List[str]:
        """Validate presence and strength of critical enterprise secrets."""
        pass


class SecretRotatorInterface(ABC):
    @abstractmethod
    def rotate_secret(self, key: str, new_value: str, rotated_by: str) -> SecretRotationEvent:
        """Perform zero-downtime secret rotation."""
        pass


class SecretAuditorInterface(ABC):
    @abstractmethod
    def log_access(self, action: str, key: str, actor: str, success: bool = True, details: Optional[str] = None) -> SecretAuditRecord:
        """Log secret access with masked values."""
        pass
