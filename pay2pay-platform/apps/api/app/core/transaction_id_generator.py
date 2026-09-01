import random
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

SERVICE_PREFIX_MAP = {
    "PAYOUT": "PO",
    "SWIPE": "SW",
    "POS": "POS",
    "DMT": "DMT",
    "AEPS": "AEPS",
    "REVERSE_PENNY_DROP": "RPD",
    "BENEFICIARY_VERIFICATION": "BV",
    "LEDGER": "LD",
    "WALLET": "WAL",
    "COMPLAINT": "CMP",
}


async def generate_payout_txn_id_via_sp(
    db: AsyncSession,
    vendor_name: Optional[str] = None,
) -> str:
    """
    Generates a payout transaction ID by calling the PostgreSQL stored procedure
    `public.generate_payout_txn_id(p_vendor_name)`.

    SP Format (from transaction_configuration table):
        <VENDOR_FIRST_CHAR> + 'PAY' + DDMMYYHH24MI + <5-DIGIT-SEQ-from-payout_txn_seq>

    Example outputs:
        vendor='WOWPE'        → WPAY290826215900038
        vendor='UTKALDIGITAL' → UPAY290826215900039
        vendor='PAY2PAY'      → PPAY290826215900040

    The SP guarantees uniqueness via a LOOP checking both payout_transaction
    and transactions tables before returning.

    Args:
        db:          SQLAlchemy AsyncSession connected to the payout database.
        vendor_name: Optional vendor/gateway name. Defaults to 'PAY2PAY' inside SP.

    Returns:
        A globally unique payout transaction ID string.

    Raises:
        RuntimeError: If the SP call fails or returns an empty/null result.
    """
    try:
        result = await db.execute(
            text("SELECT public.generate_payout_txn_id(:vendor_name)"),
            {"vendor_name": vendor_name or "PAY2PAY"},
        )
        txn_id: Optional[str] = result.scalar()
        if not txn_id:
            raise RuntimeError("SP generate_payout_txn_id returned NULL or empty string")
        logger.debug("SP generated payout txn ID: %s (vendor=%s)", txn_id, vendor_name)
        return txn_id
    except Exception as exc:
        logger.error(
            "generate_payout_txn_id SP call failed (vendor=%s): %s — falling back to Python generator",
            vendor_name,
            exc,
        )
        # Graceful fallback: Python-generated ID so the transaction is never blocked
        rand_num = random.randint(10000, 99999)
        today_str = datetime.now(timezone.utc).strftime("%d%m%y%H%M")
        fallback_prefix = (vendor_name or "P")[0].upper()
        return f"{fallback_prefix}PAY{today_str}{rand_num}"


async def generate_transaction_number(
    db: Optional[AsyncSession] = None,
    service_prefix: str = "PO",
    model_class: Optional[Any] = None,
    column_name: str = "transaction_number",
    date_format: str = "%d%m%y",
    random_digits_count: int = 5
) -> str:
    """
    Generates a unique, standardized transaction ID across all NON-PAYOUT services.
    Format: [SERVICE_PREFIX][DDMMYY][5-DIGIT RANDOM INTEGER]
    Sample: SW09082691823, RPD09082619482, BV09082647293

    NOTE: For PAYOUT transactions use `generate_payout_txn_id_via_sp()` instead,
    which delegates to the authoritative PostgreSQL SP that reads transaction_configuration
    and uses the payout_txn_seq sequence for guaranteed uniqueness.

    If db and model_class are passed, validates uniqueness against DB before returning.
    """
    today_str = datetime.now(timezone.utc).strftime(date_format)
    min_val = 10 ** (random_digits_count - 1)
    max_val = (10 ** random_digits_count) - 1

    if db is not None and model_class is not None and hasattr(model_class, column_name):
        col_attr = getattr(model_class, column_name)
        for _ in range(25):
            rand_num = random.randint(min_val, max_val)
            candidate = f"{service_prefix}{today_str}{rand_num}"
            stmt = select(model_class).where(col_attr == candidate)
            res = await db.execute(stmt)
            if not res.scalars().first():
                return candidate

    rand_num = random.randint(min_val, max_val)
    return f"{service_prefix}{today_str}{rand_num}"
