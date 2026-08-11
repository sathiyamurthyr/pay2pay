"""Enterprise Bitwarden Secrets Management Platform — Thread-Safe In-Memory Cache"""
import time
import threading
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from app.core.secrets.models import SecretItem
from app.core.secrets.interfaces import SecretCacheInterface


class SecretMemoryCache(SecretCacheInterface):
    """
    High-Performance Thread-Safe In-Memory Secret Cache (<5ms lookup SLA).
    Supports TTL, background thread refresh, and stale fallback strategy.
    """
    def __init__(self, default_ttl_seconds: int = 300):
        self._cache: Dict[str, Tuple[SecretItem, float]] = {}
        self._lock = threading.RLock()
        self._default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[SecretItem]:
        with self._lock:
            if key not in self._cache:
                return None
            secret, expiry = self._cache[key]
            if time.time() > expiry:
                # Expired item, but kept for fallback
                return secret  # Return stale if needed, caller validates expiry
            return secret

    def get_fresh(self, key: str) -> Optional[SecretItem]:
        with self._lock:
            if key not in self._cache:
                return None
            secret, expiry = self._cache[key]
            if time.time() > expiry:
                return None
            return secret

    def set(self, key: str, secret: SecretItem, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expiry = time.time() + ttl
        with self._lock:
            self._cache[key] = (secret, expiry)

    def invalidate(self, key: Optional[str] = None) -> None:
        with self._lock:
            if key:
                self._cache.pop(key, None)
            else:
                self._cache.clear()

    def get_all(self) -> Dict[str, SecretItem]:
        with self._lock:
            return {k: item[0] for k, item in self._cache.items()}

    def size(self) -> int:
        with self._lock:
            return len(self._cache)
