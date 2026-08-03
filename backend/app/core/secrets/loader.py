"""Enterprise Bitwarden Secrets Management Platform — Startup Secret Loader & Injector"""
import os
import logging
from typing import Dict, List
from app.core.secrets.provider import SecretProvider
from app.core.secrets.models import SecretItem

logger = logging.getLogger("secrets_loader")


class SecretLoader:
    """
    Application Startup Secret Loader.
    Loads secrets from Bitwarden and injects them into process runtime.
    """
    @staticmethod
    def load_and_inject_secrets() -> Dict[str, str]:
        provider = SecretProvider.get_instance()
        items = provider.bw_provider.list_secrets()
        loaded = {}

        for item in items:
            # Inject into os.environ if not already present
            if item.key not in os.environ:
                os.environ[item.key] = item.value
            provider.cache.set(item.key, item)
            loaded[item.key] = item.get_masked_value()

        logger.info(f"Loaded {len(loaded)} enterprise secrets securely from Bitwarden into runtime.")
        return loaded
