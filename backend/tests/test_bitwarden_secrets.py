import pytest
import os
from unittest.mock import MagicMock

from app.core.secrets.models import SecretItem, SecretVaultConfig
from app.core.secrets.cache import SecretMemoryCache
from app.core.secrets.bitwarden_provider import BitwardenProvider
from app.core.secrets.provider import SecretProvider, get_secret
from app.core.secrets.validator import SecretValidator
from app.core.secrets.rotation import SecretRotator
from app.core.secrets.audit import SecretAuditor
from app.core.secrets.health import SecretHealthCheck
from app.core.secrets.exceptions import SecretNotFoundError, SecretValidationError, SecretRotationError


def test_secret_item_masked_value():
    item = SecretItem(key="JWT_SECRET_KEY", value="super_secret_jwt_key_2026")
    assert item.get_masked_value() == "su****26"

    short_item = SecretItem(key="PIN", value="123")
    assert short_item.get_masked_value() == "****"


def test_memory_cache_hit_and_latency():
    cache = SecretMemoryCache(default_ttl_seconds=300)
    item = SecretItem(key="POSTGRES_PASSWORD", value="secure_pass")
    
    cache.set("POSTGRES_PASSWORD", item)
    res = cache.get("POSTGRES_PASSWORD")

    assert res is not None
    assert res.value == "secure_pass"
    assert cache.size() == 1


def test_secret_provider_lookup():
    provider = SecretProvider.get_instance()
    val = provider.get("JWT_SECRET_KEY")
    assert val is not None
    assert len(val) > 0


def test_secret_validator_success():
    validator = SecretValidator()
    validated_keys = validator.validate_required_secrets()
    assert "JWT_SECRET_KEY" in validated_keys
    assert "POSTGRES_PASSWORD" in validated_keys


def test_secret_rotation():
    rotator = SecretRotator()
    event = rotator.rotate_secret("JWT_SECRET_KEY", "new_rotated_jwt_key_2026_val", rotated_by="admin@retailer.com")

    assert event.key == "JWT_SECRET_KEY"
    assert event.new_version == event.old_version + 1
    assert os.getenv("JWT_SECRET_KEY") == "new_rotated_jwt_key_2026_val"


def test_secret_rotation_fails_short_value():
    rotator = SecretRotator()
    with pytest.raises(SecretRotationError):
        rotator.rotate_secret("JWT_SECRET_KEY", "short")


def test_secret_auditor():
    auditor = SecretAuditor()
    log = auditor.log_access("LOADED", "JWT_SECRET_KEY", actor="system")

    assert log.action == "LOADED"
    assert log.key == "JWT_SECRET_KEY"
    assert log.masked_value == "****"
    assert len(auditor.get_audit_trail()) == 1


def test_secret_health_check():
    health = SecretHealthCheck.check_health()
    assert health.vault_connected is True
    assert health.cache_healthy is True
    assert health.rotation_service_healthy is True
