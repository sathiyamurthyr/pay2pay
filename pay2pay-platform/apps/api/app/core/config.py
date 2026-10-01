import os
from typing import List
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env is explicitly loaded into os.environ
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Retailer Enterprise Platform — Admin Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Sandbox Settings
    ENVIRONMENT: str = Field(default="development")
    APP_ENV: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    
    # ── Payout Vendor Sandbox & Simulation Configuration ─────────────────────
    # Allowed modes: SIMULATED, LIVE
    # In DEV/STAGING: SIMULATED is allowed and default.
    # In PROD: LIVE only. Any attempt to enable simulation in PROD is strictly rejected.
    PAYOUT_VENDOR_MODE: str = Field(default="SIMULATED")
    PAYOUT_SIMULATION_ENABLED: bool = Field(default=True)
    PAYOUT_SIMULATION_SUCCESS_PERCENT: int = Field(default=70)
    PAYOUT_SIMULATION_PENDING_PERCENT: int = Field(default=20)
    PAYOUT_SIMULATION_FAILED_PERCENT: int = Field(default=10)
    
    # Database
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/pay2pay"
        )
    )
    ALEMBIC_DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "ALEMBIC_DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@localhost:5432/pay2pay"
        )
    )
    
    # JWT Security
    SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv(
            "SECRET_KEY",
            "0000000000000000000000000000000000000000000000000000000000000000"
        )
    )
    REFRESH_SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv(
            "REFRESH_SECRET_KEY",
            "0000000000000000000000000000000000000000000000000000000000000000"
        )
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (Maximum Session Validity)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
        "http://localhost:3004",
        "http://127.0.0.1:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "http://localhost:3006",
        "http://127.0.0.1:3006",
        "http://localhost:3007",
        "http://127.0.0.1:3007",
        "http://localhost:3008",
        "http://127.0.0.1:3008",
        "https://pay2pay.vercel.app",
        "https://pay2pay.in",
        "https://www.pay2pay.in",
        "https://admin.pay2pay.in",
        "https://super.pay2pay.in",
        "https://sd.pay2pay.in",
        "https://dist.pay2pay.in",
        "https://ret.pay2pay.in",
        "https://sales.pay2pay.in",
        "https://auth.pay2pay.in",
        "https://api.pay2pay.in",
    ]
    
    # Session Inactivity Timeout (Minutes) - Closes session after 15m idle
    SESSION_TIMEOUT_MINUTES: int = 15
    
    # System Defaults
    PLATFORM_TENANT_CODE: str = "PLATFORM"
    DEFAULT_COMPANY_CODE: str = "HQ_COMP"

    # ── Cashfree Production Verification Suite v2 Credentials ──────────────────
    CASHFREE_CLIENT_ID: str = Field(default_factory=lambda: os.getenv("CASHFREE_CLIENT_ID", ""))
    CASHFREE_CLIENT_SECRET: str = Field(default_factory=lambda: os.getenv("CASHFREE_CLIENT_SECRET", ""))
    CASHFREE_BASE_URL: str = Field(default_factory=lambda: os.getenv("CASHFREE_BASE_URL", "https://api.cashfree.com/verification"))
    CASHFREE_API_VERSION: str = Field(default_factory=lambda: os.getenv("CASHFREE_API_VERSION", "2025-01-01"))

    # ── Backblaze B2 Storage ──────────────────────────────────────────────────
    # These are overridden by .env (which is populated by secrets_bootstrap.py)
    B2_KEY_ID:      str = Field(default_factory=lambda: os.getenv("B2_KEY_ID", ""))
    B2_APP_KEY:     str = Field(default_factory=lambda: os.getenv("B2_APP_KEY", ""))
    B2_BUCKET_NAME: str = Field(default_factory=lambda: os.getenv("B2_BUCKET_NAME", "sathus-pay2pay"))

    # ── Bitwarden (used by secrets_bootstrap.py only) ─────────────────────────
    BITWARDEN_SERVER:          str = Field(default_factory=lambda: os.getenv("BITWARDEN_SERVER", "https://vault.bitwarden.com"))
    BITWARDEN_CLIENT_ID:       str = Field(default_factory=lambda: os.getenv("BITWARDEN_CLIENT_ID", ""))
    BITWARDEN_CLIENT_SECRET:   str = Field(default_factory=lambda: os.getenv("BITWARDEN_CLIENT_SECRET", ""))
    BITWARDEN_MASTER_PASSWORD: str = Field(default_factory=lambda: os.getenv("BITWARDEN_MASTER_PASSWORD", ""))
    
    # ── Meta WhatsApp Cloud API Credentials ──────────────────────────────────
    WHATSAPP_API_URL: str = Field(default_factory=lambda: os.getenv("WHATSAPP_API_URL", "https://graph.facebook.com/v21.0"))
    WHATSAPP_PHONE_NUMBER_ID: str = Field(default_factory=lambda: os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
    WHATSAPP_AUTH_TOKEN: str = Field(default_factory=lambda: os.getenv("WHATSAPP_AUTH_TOKEN", ""))

    # ── SMTP Email Dispatcher Credentials ────────────────────────────────────
    SMTP_SERVER: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USERNAME: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_FROM_EMAIL: str = Field(default="")
    SMTP_FROM_NAME: str = Field(default="Pay2Pay Enterprise")


    # ── Support Metadata Configuration ──────────────────────────────────────
    COMPANY_NAME: str = Field(default="SATHUS PRIVATE LIMITED")
    COMPANY_LOGO_URL: str = Field(default="/logo.png")
    SUPPORT_EMAIL: str = Field(default="support@pay2pay.com")
    SUPPORT_PHONE: str = Field(default="+91 1800 292 982")
    SUPPORT_WHATSAPP: str = Field(default="+91 70139 14767")
    SUPPORT_HOURS: str = Field(default="Monday - Saturday | 09:00 AM - 07:00 PM IST")
    LIVE_CHAT_ENABLED: bool = Field(default=True)
    SUPPORT_URL: str = Field(default="https://pay2pay.in/support")

    @property
    def is_production(self) -> bool:
        """Determines if the application is running in a live production environment."""
        raw_env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or self.APP_ENV or self.ENVIRONMENT).strip().lower()
        return raw_env in ("production", "prod", "live")

    @property
    def is_payout_simulation_active(self) -> bool:
        """
        STRICT ENVIRONMENT SAFEGUARD:
        In PROD: Simulation is strictly disabled and rejected.
        In DEV/STAGING: Simulation is enabled if configured.
        """
        # Hard production safeguard: NEVER simulate in production
        if self.is_production:
            return False

        mode = (os.getenv("PAYOUT_VENDOR_MODE") or self.PAYOUT_VENDOR_MODE).strip().upper()
        sim_env = os.getenv("PAYOUT_SIMULATION_ENABLED")
        if sim_env is not None:
            sim_enabled = sim_env.strip().lower() in ("true", "1", "yes")
        else:
            sim_enabled = self.PAYOUT_SIMULATION_ENABLED

        return sim_enabled or mode == "SIMULATED"

    @property
    def simulation_probabilities(self) -> dict:
        """Returns validated percentage weights for simulator outcome distribution."""
        try:
            s_pct = int(os.getenv("PAYOUT_SIMULATION_SUCCESS_PERCENT") or self.PAYOUT_SIMULATION_SUCCESS_PERCENT)
            p_pct = int(os.getenv("PAYOUT_SIMULATION_PENDING_PERCENT") or self.PAYOUT_SIMULATION_PENDING_PERCENT)
            f_pct = int(os.getenv("PAYOUT_SIMULATION_FAILED_PERCENT") or self.PAYOUT_SIMULATION_FAILED_PERCENT)
        except (ValueError, TypeError):
            s_pct, p_pct, f_pct = 70, 20, 10

        total = s_pct + p_pct + f_pct
        if total <= 0:
            s_pct, p_pct, f_pct = 70, 20, 10
            total = 100

        return {
            "SUCCESS": s_pct,
            "PENDING": p_pct,
            "FAILED": f_pct,
            "SUCCESS_PCT": round((s_pct / total) * 100, 1),
            "PENDING_PCT": round((p_pct / total) * 100, 1),
            "FAILED_PCT": round((f_pct / total) * 100, 1),
        }

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
