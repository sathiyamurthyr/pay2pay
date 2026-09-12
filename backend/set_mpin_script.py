"""
Admin script to set MPIN for a retailer by retailer_code.
Uses the same hashing logic as the production backend:
  - HMAC-SHA256 (mpin_hash on RetailerModel / CustomerModel)
  - argon2 hash_password (UserSecuritySettingsModel + sp_update_retailer_mpin)
  - SP: public.sp_update_retailer_mpin(retailer_uuid, hashed_pin, source)
No hardcoded IDs in logic – retailer_code passed as param.
"""

import asyncio
import uuid
import hmac
import hashlib
import sys
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text, or_, desc
from sqlalchemy.orm.attributes import flag_modified

# ── Load DB URL from env (never hardcoded) ──────────────────────────────────
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── Import models from project ───────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from app.infrastructure.db.models import RetailerModel, RetailerMpinAuditModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.session_security_models import UserSecuritySettingsModel
from app.core.security import hash_password  # argon2/bcrypt

MPIN_SECRET_SALT = "PAY2PAY_ENTERPRISE_MPIN_SALT_KEY_v1_2026"


def _hmac_hash(pin: str, salt_key: str) -> str:
    """HMAC-SHA256 hash used on RetailerModel.mpin_hash and CustomerModel.mpin_hash."""
    salt = f"{MPIN_SECRET_SALT}:{salt_key}".encode("utf-8")
    return hmac.new(salt, pin.encode("utf-8"), hashlib.sha256).hexdigest()


async def set_retailer_mpin(retailer_code: str, new_pin: str):
    print(f"\n{'='*60}")
    print(f" Setting MPIN for retailer_code: {retailer_code}")
    print(f"{'='*60}")

    async with AsyncSessionLocal() as db:
        # ── 1. Lookup retailer by code ───────────────────────────────────
        stmt = select(RetailerModel).where(
            RetailerModel.retailer_code == retailer_code,
            RetailerModel.is_deleted == False,
        )
        retailer = (await db.execute(stmt)).scalars().first()

        if not retailer:
            print(f"[ERROR] Retailer '{retailer_code}' not found in database.")
            return

        print(f"[OK]  Found retailer: {retailer.store_name} ({retailer.retailer_code})")
        print(f"      UUID: {retailer.public_id}")
        print(f"      Status: {retailer.status}")

        r_uuid = retailer.public_id
        now = datetime.now(timezone.utc)

        # ── 2. Generate both hash types ──────────────────────────────────
        hmac_hash   = _hmac_hash(new_pin, str(r_uuid))          # for RetailerModel + CustomerModel
        argon_hash  = hash_password(new_pin)                    # for UserSecuritySettingsModel + SP

        # ── 3. Update RetailerModel ──────────────────────────────────────
        retailer.mpin_hash = hmac_hash
        retailer.mpin_locked = False
        retailer.mpin_failed_attempts = 0
        retailer.mpin_locked_at = None
        retailer.updated_date = now
        retailer.updated_by = "ADMIN_SCRIPT"
        print(f"[OK]  Updated RetailerModel.mpin_hash")

        # ── 4. Update CustomerModel (if exists) ──────────────────────────
        cust_stmt = select(CustomerModel).where(
            CustomerModel.public_id == r_uuid,
            CustomerModel.is_deleted == False,
        )
        cust = (await db.execute(cust_stmt)).scalars().first()
        if cust:
            cust_hmac = _hmac_hash(new_pin, str(cust.public_id))
            cust.mpin_hash = cust_hmac
            cust.mpin_enabled = True
            cust.failed_attempts = 0
            cust.is_locked = False
            cust.mpin_last_changed_at = now
            print(f"[OK]  Updated CustomerModel.mpin_hash")
        else:
            print(f"[--]  No CustomerModel found for this retailer UUID (skip)")

        # ── 5. Update UserSecuritySettingsModel (if exists) ──────────────
        sec_stmt = select(UserSecuritySettingsModel).where(
            UserSecuritySettingsModel.user_id == r_uuid,
            UserSecuritySettingsModel.portal == "RETAILER",
        )
        user_sec = (await db.execute(sec_stmt)).scalars().first()
        if user_sec:
            user_sec.security_pin_hash = argon_hash
            user_sec.pin_enabled = True
            user_sec.failed_attempt_count = 0
            user_sec.locked_until = None
            user_sec.last_pin_verified_at = now
            print(f"[OK]  Updated UserSecuritySettingsModel.security_pin_hash")
        else:
            # Create it — tenant_id comes from the retailer record in DB
            user_sec = UserSecuritySettingsModel(
                public_id=uuid.uuid4(),
                user_id=r_uuid,
                tenant_id=retailer.tenant_id,  # always from DB, never hardcoded
                portal="RETAILER",
                security_pin_hash=argon_hash,
                pin_enabled=True,
                failed_attempt_count=0,
            )
            db.add(user_sec)
            print(f"[OK]  Created new UserSecuritySettingsModel")

        # ── 6. Call SP: public.sp_update_retailer_mpin ───────────────────
        try:
            await db.execute(
                text("SELECT public.sp_update_retailer_mpin(:rid, :nh, 'ADMIN_SET_MPIN')"),
                {"rid": r_uuid, "nh": argon_hash}
            )
            print(f"[OK]  Executed sp_update_retailer_mpin successfully")
        except Exception as sp_err:
            print(f"[WARN] sp_update_retailer_mpin error (non-fatal): {sp_err}")

        # ── 7. Audit log ─────────────────────────────────────────────────
        try:
            audit = RetailerMpinAuditModel(
                public_id=uuid.uuid4(),
                retailer_id=r_uuid,
                tenant_id=retailer.tenant_id,  # always from DB, never hardcoded
                company_id=retailer.company_id,
                action="ADMIN_SET_MPIN",
                failed_attempts=0,
                performed_by="ADMIN_SCRIPT",
                reason=f"MPIN set by admin script for retailer {retailer_code}",
                ip_address="127.0.0.1",
                created_at=now,
            )
            db.add(audit)
            print(f"[OK]  Audit log created")
        except Exception as ae:
            print(f"[WARN] Audit log error (non-fatal): {ae}")

        # ── 8. Commit all ────────────────────────────────────────────────
        await db.commit()
        print(f"\n{'='*60}")
        print(f" [SUCCESS] MPIN successfully set for {retailer_code}")
        print(f"    Retailer: {retailer.store_name}")
        print(f"    UUID:     {r_uuid}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    # Args: retailer_code  new_pin
    if len(sys.argv) != 3:
        print("Usage: python set_mpin_script.py <RETAILER_CODE> <PIN>")
        sys.exit(1)

    r_code = sys.argv[1].strip().upper()
    pin    = sys.argv[2].strip()

    if not pin.isdigit() or len(pin) not in (4, 6):
        print(f"[ERROR] PIN must be exactly 4 or 6 numeric digits. Got: '{pin}'")
        sys.exit(1)

    asyncio.run(set_retailer_mpin(r_code, pin))
