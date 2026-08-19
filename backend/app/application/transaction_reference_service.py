"""
Enterprise Authoritative Transaction Reference Generation Service.

Implements the dynamic reference format:
<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>
Example: W170826093612345

Features:
- Dynamically resolves vendor code/name (W for WowPe, B for BulkPe, etc.)
- Server-side timezone aware (default: Asia/Kolkata)
- Cryptographically secure 5-digit sequence (secrets module)
- Atomic collision detection with automatic retry loop
- Never trusts frontend inputs
"""

import uuid
import secrets
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.transaction_engine_models import (
    TransactionConfigurationModel, CentralTransactionModel
)
from app.core.exceptions import DomainException

logger = logging.getLogger("transaction_reference_service")

DEFAULT_TENANT_ID = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
DEFAULT_TIMEZONE = "Asia/Kolkata"


class TransactionReferenceService:
    """
    Authoritative Server-Side Transaction Reference Generator.
    """

    @classmethod
    async def get_or_create_config(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        vendor_code: str = "DEFAULT"
    ) -> TransactionConfigurationModel:
        """
        Retrieves transaction configuration rule for the given tenant & vendor.
        Creates fallback default configuration if not found.
        """
        v_code = (vendor_code or "DEFAULT").strip().upper()
        
        # 1. Try vendor-specific config
        stmt = select(TransactionConfigurationModel).where(
            TransactionConfigurationModel.tenant_id == tenant_id,
            TransactionConfigurationModel.vendor_code == v_code,
            TransactionConfigurationModel.is_active == True
        )
        res = await db.execute(stmt)
        cfg = res.scalars().first()
        if cfg:
            return cfg

        # 2. Try tenant default config
        if v_code != "DEFAULT":
            stmt_default = select(TransactionConfigurationModel).where(
                TransactionConfigurationModel.tenant_id == tenant_id,
                TransactionConfigurationModel.vendor_code == "DEFAULT",
                TransactionConfigurationModel.is_active == True
            )
            res_default = await db.execute(stmt_default)
            cfg_default = res_default.scalars().first()
            if cfg_default:
                return cfg_default

        # 3. Create fallback config
        new_cfg = TransactionConfigurationModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            vendor_code=v_code,
            prefix_source="VENDOR_FIRST_CHAR",
            date_format="%d%m%y%H%M",
            include_year=True,
            include_hour=True,
            include_minute=True,
            random_length=5,
            transaction_format="<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>",
            timezone=DEFAULT_TIMEZONE,
            is_active=True,
            created_by="SYSTEM",
            updated_by="SYSTEM"
        )
        db.add(new_cfg)
        await db.flush()
        return new_cfg

    @classmethod
    def resolve_vendor_first_char(
        cls,
        vendor_code: Optional[str] = None,
        vendor_name: Optional[str] = None,
        custom_prefix: Optional[str] = None
    ) -> str:
        """
        Extracts the first alphanumeric character from the vendor code or name dynamically.
        Examples:
        - WOWPE / WowPe Payout API -> W
        - BULKPE / BulkPe API -> B
        - ICICI / ICICI Bank -> I
        - RAZORPAY -> R
        - PAYTM -> P
        """
        if custom_prefix and custom_prefix.strip():
            return custom_prefix.strip().upper()[0]

        source = (vendor_code or vendor_name or "T").strip()
        for char in source:
            if char.isalnum():
                return char.upper()
        return "T"

    @classmethod
    def generate_candidate_reference(
        cls,
        vendor_first_char: str,
        tz_name: str = DEFAULT_TIMEZONE,
        random_length: int = 5
    ) -> str:
        """
        Generates a candidate reference string in format:
        <VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>
        """
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = timezone.utc

        now = datetime.now(tz)
        # Format: DD (2 digits), MM (2 digits), YY (2 digits), HH (2 digits 24h), MI (2 digits)
        timestamp_str = now.strftime("%d%m%y%H%M")

        # Cryptographically secure 5-digit number (10000 to 99999)
        min_val = 10 ** (random_length - 1)
        max_val = (10 ** random_length) - 1
        secure_rand_num = min_val + secrets.randbelow(max_val - min_val + 1)

        return f"{vendor_first_char}{timestamp_str}{secure_rand_num}"

    @classmethod
    async def generate_unique_reference(
        cls,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        vendor_code: Optional[str] = "WOWPE",
        vendor_name: Optional[str] = None,
        max_retries: int = 10
    ) -> str:
        """
        Generates an authoritative, collision-free transaction reference with atomic DB validation.
        Retries up to max_retries if collision occurs within the same minute.
        """
        tid = tenant_id or DEFAULT_TENANT_ID
        v_code = (vendor_code or "DEFAULT").strip().upper()
        
        cfg = await cls.get_or_create_config(db, tid, v_code)
        
        # Determine prefix
        prefix_char = cls.resolve_vendor_first_char(
            vendor_code=v_code,
            vendor_name=vendor_name,
            custom_prefix=cfg.custom_prefix if cfg.prefix_source == "CUSTOM_PREFIX" else None
        )
        
        tz_name = cfg.timezone or DEFAULT_TIMEZONE
        rand_len = cfg.random_length or 5

        # Atomic collision check with retry loop
        for attempt in range(1, max_retries + 1):
            candidate = cls.generate_candidate_reference(
                vendor_first_char=prefix_char,
                tz_name=tz_name,
                random_length=rand_len
            )

            # Check if reference already exists in transactions table
            stmt_check = select(CentralTransactionModel.id).where(
                CentralTransactionModel.transaction_reference == candidate
            )
            exists = (await db.execute(stmt_check)).scalars().first()

            if not exists:
                logger.info(
                    f"Generated Unique Transaction Reference: {candidate} "
                    f"(Vendor: {v_code}, Attempt: {attempt})"
                )
                return candidate

            logger.warning(
                f"Collision detected for candidate reference {candidate} on attempt {attempt}/{max_retries}. "
                "Regenerating..."
            )

        raise DomainException(
            f"Failed to generate unique transaction reference after {max_retries} attempts."
        )
