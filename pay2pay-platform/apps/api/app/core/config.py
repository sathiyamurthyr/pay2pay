import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Retailer Enterprise Platform — Admin Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = Field(default="production")
    DEBUG: bool = Field(default=False)
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"
    )
    ALEMBIC_DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"
    )
    
    # JWT Security
    SECRET_KEY: str = Field(default="e674b934091a133f9dfca4b967a544c207908b8b8017c669145695029a73887c")
    REFRESH_SECRET_KEY: str = Field(default="5f3a0937a098863f6696b997c6d66e7f12e8ad28b8577a111b154b5e6702c2e0")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "https://pay2pay.vercel.app",
    ]
    
    # Session Timeout (Minutes)
    SESSION_TIMEOUT_MINUTES: int = 30
    
    # System Defaults
    PLATFORM_TENANT_CODE: str = "PLATFORM"
    DEFAULT_COMPANY_CODE: str = "HQ_COMP"

    # ── Backblaze B2 Storage ──────────────────────────────────────────────────
    # These are overridden by .env (which is populated by secrets_bootstrap.py)
    B2_KEY_ID:      str = Field(default="008e0d1d842b")
    B2_APP_KEY:     str = Field(default="0030f1320724707dc33f380426ddf3371c3fedb37a")
    B2_BUCKET_NAME: str = Field(default="sathus-pay2pay")

    # ── Bitwarden (used by secrets_bootstrap.py only) ─────────────────────────
    BITWARDEN_SERVER:          str = Field(default="https://vault.bitwarden.com")
    BITWARDEN_CLIENT_ID:       str = Field(default="")
    BITWARDEN_CLIENT_SECRET:   str = Field(default="")
    BITWARDEN_MASTER_PASSWORD: str = Field(default="")
    
    # ── Meta WhatsApp Cloud API Credentials ──────────────────────────────────
    WHATSAPP_API_URL: str = Field(default="https://graph.facebook.com/v21.0")
    WHATSAPP_PHONE_NUMBER_ID: str = Field(default="497102120160245")
    WHATSAPP_AUTH_TOKEN: str = Field(default="EAAHe8ickOaEBO5X8Afgq8gNGq3mYEe9BmlyZBYnZCgRZBx9P1ZCjRJizHMH4P3lbtKAewLIRRgGWoOlWmlo0EfUWmGLMO5x2oZAyLOqKCAAhok9ZCp0hEYzWV9819cIlyDjVVjuc3jENdB52SdH1i4JNDComK1cruqsC752ts4qzujJB7TD5ymUtphwjEZBYZCX8KQZDZD")

    # ── SMTP Email Dispatcher Credentials ────────────────────────────────────
    SMTP_SERVER: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USERNAME: str = Field(default="Paymebalu@gmail.com")
    SMTP_PASSWORD: str = Field(default="pbcr sgsm cugn ducm")
    SMTP_FROM_EMAIL: str = Field(default="Paymebalu@gmail.com")
    SMTP_FROM_NAME: str = Field(default="Pay2Pay Enterprise")

    # ── Support Metadata Configuration ──────────────────────────────────────
    COMPANY_NAME: str = Field(default="Pay2Pay Financial Technologies Pvt. Ltd.")
    COMPANY_LOGO_URL: str = Field(default="/logo.png")
    SUPPORT_EMAIL: str = Field(default="support@pay2pay.com")
    SUPPORT_PHONE: str = Field(default="+91 1800 292 982")
    SUPPORT_WHATSAPP: str = Field(default="+91 91766 69426")
    SUPPORT_HOURS: str = Field(default="Monday - Saturday | 09:00 AM - 07:00 PM IST")
    LIVE_CHAT_ENABLED: bool = Field(default=True)
    SUPPORT_URL: str = Field(default="https://pay2pay.in/support")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
