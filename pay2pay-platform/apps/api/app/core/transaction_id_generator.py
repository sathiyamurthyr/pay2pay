import random
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


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


async def generate_transaction_number(
    db: Optional[AsyncSession] = None,
    service_prefix: str = "PO",
    model_class: Optional[Any] = None,
    column_name: str = "transaction_number",
    date_format: str = "%d%m%y",
    random_digits_count: int = 5
) -> str:
    """
    Generates a unique, standardized transaction ID across all services.
    Format: [SERVICE_PREFIX][DDMMYY][5-DIGIT RANDOM INTEGER]
    Sample: PO09082642083, SW09082691823, RPD09082619482
    
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
