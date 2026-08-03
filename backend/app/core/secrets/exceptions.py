"""Enterprise Bitwarden Secrets Management Platform — Domain Exceptions"""

class SecretException(Exception):
    """Base exception for secrets management platform."""
    pass


class VaultAuthenticationError(SecretException):
    """Raised when Bitwarden CLI / BWS login or unlock fails."""
    pass


class SecretNotFoundError(SecretException):
    """Raised when a required secret key cannot be resolved."""
    pass


class SecretValidationError(SecretException):
    """Raised when startup validation fails due to missing or weak required secrets."""
    pass


class SecretRotationError(SecretException):
    """Raised when zero-downtime secret rotation fails."""
    pass


class CircuitBreakerTrippedError(SecretException):
    """Raised when Bitwarden server is unreachable and fallback cache is exhausted."""
    pass
