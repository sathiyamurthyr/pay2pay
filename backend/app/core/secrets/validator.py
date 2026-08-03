"""Enterprise Bitwarden Secrets Management Platform — Startup Secret Validator"""
from typing import List, Dict, Any
from app.core.secrets.provider import SecretProvider
from app.core.secrets.exceptions import SecretValidationError
from app.core.secrets.interfaces import SecretValidatorInterface


# Mandatory Banking-Grade Secrets Required for Platform Startup
REQUIRED_SECRET_KEYS = [
    "JWT_SECRET_KEY",
    "JWT_REFRESH_SECRET_KEY",
    "AES_ENCRYPTION_KEY",
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "SMTP_PASSWORD",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "RAZORPAY_API_SECRET",
    "CASHFREE_CLIENT_SECRET",
    "NPCI_SIGNING_KEY",
]


class SecretValidator(SecretValidatorInterface):
    """
    Validates presence and non-empty values for required secrets at startup.
    Fails application boot if any mandatory secret is absent.
    """
    def validate_required_secrets(self, secrets: Dict[str, Any] = None) -> List[str]:
        provider = SecretProvider.get_instance()
        missing_keys = []

        for key in REQUIRED_SECRET_KEYS:
            try:
                val = provider.get(key)
                if not val or len(val.strip()) == 0:
                    missing_keys.append(key)
            except Exception:
                missing_keys.append(key)

        if missing_keys:
            raise SecretValidationError(
                f"Startup Failed: {len(missing_keys)} mandatory secrets missing in Bitwarden vault: {missing_keys}"
            )

        return REQUIRED_SECRET_KEYS
