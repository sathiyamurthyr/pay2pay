"""Enterprise Bitwarden Secrets Management Platform — Unified Provider & Manager"""
import os
from typing import Dict, List, Optional
from app.core.secrets.models import SecretItem, SecretVaultConfig
from app.core.secrets.cache import SecretMemoryCache
from app.core.secrets.bitwarden_provider import BitwardenProvider
from app.core.secrets.exceptions import SecretNotFoundError


class SecretProvider:
    """
    Centralized Secrets Manager.
    Orchestrates Bitwarden CLI provider, memory cache, and environment injection.
    """
    _instance: Optional["SecretProvider"] = None

    def __init__(self, config: Optional[SecretVaultConfig] = None):
        self.config = config or SecretVaultConfig(
            client_id=os.getenv("BITWARDEN_CLIENT_ID"),
            client_secret=os.getenv("BITWARDEN_CLIENT_SECRET"),
            master_password=os.getenv("BITWARDEN_MASTER_PASSWORD"),
            app_env=os.getenv("APP_ENV", "DEVELOPMENT"),
        )
        self.cache = SecretMemoryCache(default_ttl_seconds=self.config.cache_ttl_seconds)
        self.bw_provider = BitwardenProvider(self.config)
        self.bw_provider.authenticate()
        self.bw_provider.unlock_vault()

    @classmethod
    def get_instance(cls) -> "SecretProvider":
        if cls._instance is None:
            cls._instance = SecretProvider()
        return cls._instance

    def get(self, key: str, default: Optional[str] = None) -> str:
        """Fetch secret value with <5ms cache lookup or Bitwarden fallback."""
        # 1. Check Memory Cache
        cached = self.cache.get_fresh(key)
        if cached:
            return cached.value

        # 2. Fetch from Bitwarden
        secret = self.bw_provider.get_secret(key)
        if secret:
            self.cache.set(key, secret)
            return secret.value

        if default is not None:
            return default

        raise SecretNotFoundError(f"Required secret key '{key}' not found in Bitwarden or cache")

    def get_item(self, key: str) -> Optional[SecretItem]:
        cached = self.cache.get(key)
        if cached:
            return cached
        sec = self.bw_provider.get_secret(key)
        if sec:
            self.cache.set(key, sec)
        return sec

    def invalidate_cache(self) -> None:
        self.cache.invalidate()


def get_secret(key: str, default: Optional[str] = None) -> str:
    """Convenience helper function for secret retrieval."""
    return SecretProvider.get_instance().get(key, default)
