"""
Retailer Credit Card Management Service.

Handles:
- Card validation (10-digit Indian mobile, Luhn checksum, card length, day-of-month clamping)
- Secure card hashing & masking (never exposes or stores raw PAN)
- Strict multi-tenant isolation scoped by (company_ref_id, retailer_ref_id)
- Duplicate card prevention per retailer + company
- Current Date Bills vs. Upcoming Days Bills computation
- Reuse of existing `payin_card_types` and `bank_master` tables
"""

import calendar
import hashlib
import hmac
import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.menu_favorite_service import ResolvedFavoriteIdentity
from app.core.config import settings
from app.infrastructure.db.bank_master_models import BankMasterModel
from app.infrastructure.db.payin_models import PayinCardTypeModel
from app.infrastructure.db.retailer_card_models import RetailerCreditCardModel

logger = logging.getLogger("retailer_card_service")

IST_TZ = timezone(timedelta(hours=5, minutes=30))

DEFAULT_CARD_TYPES: List[Dict[str, Any]] = [
    {"card_type_ref_id": None, "card_type_code": "VISA", "card_type_name": "Visa"},
    {"card_type_ref_id": None, "card_type_code": "MASTERCARD", "card_type_name": "Mastercard"},
    {"card_type_ref_id": None, "card_type_code": "RUPAY", "card_type_name": "RuPay"},
    {"card_type_ref_id": None, "card_type_code": "AMEX", "card_type_name": "American Express"},
    {"card_type_ref_id": None, "card_type_code": "DINERS", "card_type_name": "Diners Club"},
]

DEFAULT_CREDIT_CARD_BANKS: List[Dict[str, Any]] = [
    {"bank_ifsc_ref_id": None, "bank_name": "HDFC BANK", "short_code": "HDFC", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "ICICI BANK", "short_code": "ICIC", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "STATE BANK OF INDIA", "short_code": "SBIN", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "AXIS BANK", "short_code": "UTIB", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "KOTAK MAHINDRA BANK", "short_code": "KKBK", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "INDUSIND BANK", "short_code": "INDB", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "YES BANK", "short_code": "YESB", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "IDFC FIRST BANK", "short_code": "IDFB", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "RBL BANK", "short_code": "RATN", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "FEDERAL BANK", "short_code": "FDRL", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "STANDARD CHARTERED BANK", "short_code": "SCBL", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "HSBC BANK", "short_code": "HSBC", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "AMERICAN EXPRESS", "short_code": "AMEX", "is_credit_card": True},
    {"bank_ifsc_ref_id": None, "bank_name": "AU SMALL FINANCE BANK", "short_code": "AUBL", "is_credit_card": True},
]


def _ist_today() -> date:
    return datetime.now(IST_TZ).date()


def normalize_mobile(raw_mobile: str) -> str:
    digits = re.sub(r"\D", "", str(raw_mobile or ""))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid 10-digit Indian mobile number.",
        )
    return digits


def luhn_check(digits: str) -> bool:
    total = 0
    reverse_digits = digits[::-1]
    for idx, ch in enumerate(reverse_digits):
        n = int(ch)
        if idx % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def normalize_and_validate_card_number(raw_card_number: str) -> Tuple[str, str, str, str]:
    """
    Validates card number length (13-19 digits) and Luhn checksum.
    Returns (normalized_digits, masked_card_number, last4, bin6).
    """
    digits = re.sub(r"\D", "", str(raw_card_number or ""))
    if len(digits) < 13 or len(digits) > 19:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Card number must contain between 13 and 19 digits.",
        )
    if not luhn_check(digits):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid credit card number (checksum verification failed).",
        )
    last4 = digits[-4:]
    bin6 = digits[:6]
    if len(digits) == 15:
        masked = f"XXXX-XXXXXX-X{last4}"
    elif len(digits) == 16:
        masked = f"XXXX-XXXX-XXXX-{last4}"
    else:
        masked = f"{'X' * (len(digits) - 4)}-{last4}"
    return digits, masked, last4, bin6


def hash_card_number(digits: str) -> str:
    secret = (getattr(settings, "SECRET_KEY", None) or "sathus-card-secret").encode("utf-8")
    return hmac.new(secret, digits.encode("utf-8"), hashlib.sha256).hexdigest()


def parse_day_of_month(raw_val: Any, field_label: str) -> int:
    """Accepts either an integer 1..31 or an ISO date string YYYY-MM-DD and returns day 1..31."""
    if isinstance(raw_val, int) and not isinstance(raw_val, bool):
        day = raw_val
    elif isinstance(raw_val, str):
        cleaned = raw_val.strip()
        if cleaned.isdigit():
            day = int(cleaned)
        else:
            try:
                day = datetime.strptime(cleaned[:10], "%Y-%m-%d").day
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field_label} must be a valid day of month (1-31) or YYYY-MM-DD date.",
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_label} must be a valid day of month (1-31).",
        )

    if day < 1 or day > 31:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_label} must be between 1 and 31.",
        )
    return day


def _clamped_month_date(year: int, month: int, day: int) -> date:
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_day))


def _next_month(year: int, month: int) -> Tuple[int, int]:
    return (year + 1, 1) if month == 12 else (year, month + 1)


def _prev_month(year: int, month: int) -> Tuple[int, int]:
    return (year - 1, 12) if month == 1 else (year, month - 1)


def compute_bill_schedule(
    bill_generate_day: int,
    bill_due_day: int,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Computes whether a card's bill is due today or upcoming, with days remaining.
    """
    ref = reference_date or _ist_today()
    due_this_month = _clamped_month_date(ref.year, ref.month, bill_due_day)

    if due_this_month == ref:
        next_due_date = due_this_month
        days_remaining = 0
        bill_bucket = "CURRENT_DATE"
        status_label = "Due Today"
    elif due_this_month > ref:
        next_due_date = due_this_month
        days_remaining = (next_due_date - ref).days
        bill_bucket = "UPCOMING"
        status_label = "Due Tomorrow" if days_remaining == 1 else f"Due in {days_remaining} days"
    else:
        ny, nm = _next_month(ref.year, ref.month)
        next_due_date = _clamped_month_date(ny, nm, bill_due_day)
        days_remaining = (next_due_date - ref).days
        bill_bucket = "UPCOMING"
        status_label = "Due Tomorrow" if days_remaining == 1 else f"Due in {days_remaining} days"

    # Determine corresponding bill generate date for this cycle
    gen_in_due_month = _clamped_month_date(next_due_date.year, next_due_date.month, bill_generate_day)
    if bill_generate_day <= bill_due_day:
        cycle_generate_date = gen_in_due_month
    else:
        py, pm = _prev_month(next_due_date.year, next_due_date.month)
        cycle_generate_date = _clamped_month_date(py, pm, bill_generate_day)

    return {
        "bill_bucket": bill_bucket,
        "is_due_today": days_remaining == 0,
        "days_remaining": days_remaining,
        "status_label": status_label,
        "next_due_date": next_due_date.isoformat(),
        "cycle_generate_date": cycle_generate_date.isoformat(),
    }


def _require_retailer_scope(identity: ResolvedFavoriteIdentity) -> Tuple[int, int]:
    """Fail closed if company_ref_id or retailer_ref_id cannot be verified from the session."""
    if not identity or not identity.company_ref_id or not identity.retailer_ref_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated retailer & company context is required for Card Management.",
        )
    return int(identity.company_ref_id), int(identity.retailer_ref_id)


class RetailerCardService:
    """Service layer for Retailer Credit Card Management."""

    @classmethod
    async def ensure_table_exists(cls, db: AsyncSession) -> None:
        try:
            await db.execute(select(RetailerCreditCardModel.card_ref_id).limit(1))
        except Exception:
            await db.rollback()
            conn = await db.connection()
            await conn.run_sync(
                lambda sync_conn: RetailerCreditCardModel.__table__.create(sync_conn, checkfirst=True)
            )
            await db.commit()

    @classmethod
    async def get_metadata(cls, db: AsyncSession) -> Dict[str, Any]:
        """Loads card types from payin_card_types and credit card banks from bank_master."""
        card_types: List[Dict[str, Any]] = []
        try:
            rows = (
                await db.execute(
                    select(PayinCardTypeModel)
                    .where(
                        PayinCardTypeModel.is_active == True,
                        PayinCardTypeModel.is_deleted == False,
                    )
                    .order_by(PayinCardTypeModel.payin_card_type_ref_id.asc())
                )
            ).scalars().all()
            for r in rows:
                card_types.append(
                    {
                        "card_type_ref_id": r.payin_card_type_ref_id,
                        "card_type_code": r.card_type_code,
                        "card_type_name": r.card_type_name,
                    }
                )
        except Exception as exc:
            logger.debug(f"Fallback to default card types: {exc}")

        if not card_types:
            card_types = list(DEFAULT_CARD_TYPES)

        banks: List[Dict[str, Any]] = []
        try:
            bank_rows = (
                await db.execute(
                    select(BankMasterModel)
                    .where(
                        BankMasterModel.status == 1,
                        BankMasterModel.is_credit_card == True,
                    )
                    .order_by(BankMasterModel.bank_name.asc())
                    .limit(200)
                )
            ).scalars().all()
            if not bank_rows:
                bank_rows = (
                    await db.execute(
                        select(BankMasterModel)
                        .where(BankMasterModel.status == 1)
                        .order_by(BankMasterModel.bank_name.asc())
                        .limit(200)
                    )
                ).scalars().all()
            for b in bank_rows:
                banks.append(
                    {
                        "bank_ifsc_ref_id": b.bank_ifsc_ref_id,
                        "bank_name": b.bank_name,
                        "short_code": b.short_code or b.ifsc_prefix,
                        "is_credit_card": bool(b.is_credit_card),
                    }
                )
        except Exception as exc:
            logger.debug(f"Fallback to default credit card banks: {exc}")

        if not banks:
            banks = list(DEFAULT_CREDIT_CARD_BANKS)

        return {
            "status": "SUCCESS",
            "card_types": card_types,
            "banks": banks,
        }

    @classmethod
    def _serialize_card(
        cls,
        row: RetailerCreditCardModel,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        schedule = compute_bill_schedule(
            bill_generate_day=row.bill_generate_day,
            bill_due_day=row.bill_due_day,
            reference_date=reference_date,
        )
        return {
            "card_ref_id": row.card_ref_id,
            "public_id": str(row.public_id),
            "company_ref_id": row.company_ref_id,
            "retailer_ref_id": row.retailer_ref_id,
            "cardholder_name": row.cardholder_name,
            "mobile_number": row.mobile_number,
            "masked_card_number": row.masked_card_number,
            "card_last4": row.card_last4,
            "card_type_ref_id": row.card_type_ref_id,
            "card_type_code": row.card_type_code,
            "card_type_name": row.card_type_name,
            "bank_ifsc_ref_id": row.bank_ifsc_ref_id,
            "bank_name": row.bank_name,
            "bank_short_code": row.bank_short_code,
            "bill_generate_day": row.bill_generate_day,
            "bill_due_day": row.bill_due_day,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            **schedule,
        }

    @classmethod
    async def list_cards_dashboard(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        search: Optional[str] = None,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_table_exists(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)
        ref_date = reference_date or _ist_today()

        stmt = (
            select(RetailerCreditCardModel)
            .where(
                RetailerCreditCardModel.company_ref_id == company_ref_id,
                RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                RetailerCreditCardModel.is_deleted == False,
                RetailerCreditCardModel.is_active == True,
            )
            .order_by(RetailerCreditCardModel.created_at.desc())
        )
        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    RetailerCreditCardModel.cardholder_name.ilike(q),
                    RetailerCreditCardModel.mobile_number.ilike(q),
                    RetailerCreditCardModel.card_last4.ilike(q),
                    RetailerCreditCardModel.bank_name.ilike(q),
                    RetailerCreditCardModel.card_type_name.ilike(q),
                )
            )

        rows = (await db.execute(stmt)).scalars().all()
        serialized = [cls._serialize_card(r, reference_date=ref_date) for r in rows]

        current_date_bills = [c for c in serialized if c["is_due_today"]]
        upcoming_bills = sorted(
            [c for c in serialized if not c["is_due_today"]],
            key=lambda c: (c["days_remaining"], c["cardholder_name"].lower()),
        )
        due_next_7_days = [c for c in upcoming_bills if 1 <= c["days_remaining"] <= 7]

        return {
            "status": "SUCCESS",
            "reference_date": ref_date.isoformat(),
            "company_ref_id": company_ref_id,
            "retailer_ref_id": retailer_ref_id,
            "summary": {
                "total_cards": len(serialized),
                "current_date_bills_count": len(current_date_bills),
                "upcoming_bills_count": len(upcoming_bills),
                "due_next_7_days_count": len(due_next_7_days),
                "banks_count": len({c["bank_name"] for c in serialized}),
            },
            "current_date_bills": current_date_bills,
            "upcoming_bills": upcoming_bills,
            "all_cards": serialized,
        }

    @classmethod
    async def create_card(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        *,
        cardholder_name: str,
        mobile_number: str,
        card_number: str,
        card_type: str,
        bank_name: str,
        bill_generate_date: Any,
        bill_due_date: Any,
        bank_ifsc_ref_id: Optional[int] = None,
        card_type_ref_id: Optional[int] = None,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_table_exists(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)

        clean_name = re.sub(r"\s+", " ", str(cardholder_name or "")).strip()
        if len(clean_name) < 2 or len(clean_name) > 150:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cardholder name must be between 2 and 150 characters.",
            )

        clean_mobile = normalize_mobile(mobile_number)
        digits, masked_card, last4, bin6 = normalize_and_validate_card_number(card_number)
        card_hash = hash_card_number(digits)

        bill_gen_day = parse_day_of_month(bill_generate_date, "Bill Generate Date")
        bill_due_day = parse_day_of_month(bill_due_date, "Bill Due Date")

        # Resolve Card Type from payin_card_types if present
        raw_ct = str(card_type or "").strip()
        if not raw_ct:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Card Type is required.",
            )
        ct_code = raw_ct.upper().replace(" ", "_")
        ct_name = raw_ct
        resolved_ct_ref = card_type_ref_id
        try:
            ct_row = (
                await db.execute(
                    select(PayinCardTypeModel).where(
                        or_(
                            PayinCardTypeModel.card_type_code.ilike(raw_ct),
                            PayinCardTypeModel.card_type_name.ilike(raw_ct),
                        ),
                        PayinCardTypeModel.is_deleted == False,
                    )
                )
            ).scalars().first()
            if ct_row:
                resolved_ct_ref = ct_row.payin_card_type_ref_id
                ct_code = ct_row.card_type_code
                ct_name = ct_row.card_type_name
        except Exception:
            pass

        # Resolve Bank from bank_master if present
        clean_bank = re.sub(r"\s+", " ", str(bank_name or "")).strip()
        if not clean_bank and not bank_ifsc_ref_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Bank is required.",
            )
        resolved_bank_ref = bank_ifsc_ref_id
        resolved_bank_short: Optional[str] = None
        try:
            if bank_ifsc_ref_id:
                b_row = (
                    await db.execute(
                        select(BankMasterModel).where(BankMasterModel.bank_ifsc_ref_id == int(bank_ifsc_ref_id))
                    )
                ).scalars().first()
            else:
                b_row = (
                    await db.execute(
                        select(BankMasterModel).where(
                            BankMasterModel.bank_name.ilike(clean_bank),
                            BankMasterModel.status == 1,
                        )
                    )
                ).scalars().first()
            if b_row:
                resolved_bank_ref = b_row.bank_ifsc_ref_id
                clean_bank = b_row.bank_name
                resolved_bank_short = b_row.short_code or b_row.ifsc_prefix
        except Exception:
            pass

        # Duplicate check scoped strictly to (company_ref_id, retailer_ref_id, card_number_hash)
        existing = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.card_number_hash == card_hash,
                    RetailerCreditCardModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This credit card ({existing.masked_card_number}) is already registered in your Card Management list.",
            )

        # If a previously soft-deleted row exists for the same (company, retailer, hash), reactivate it cleanly
        deleted_row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.card_number_hash == card_hash,
                    RetailerCreditCardModel.is_deleted == True,
                )
            )
        ).scalars().first()

        if deleted_row:
            deleted_row.user_ref_id = identity.user_ref_id
            deleted_row.cardholder_name = clean_name
            deleted_row.mobile_number = clean_mobile
            deleted_row.masked_card_number = masked_card
            deleted_row.card_last4 = last4
            deleted_row.card_bin6 = bin6
            deleted_row.card_type_ref_id = resolved_ct_ref
            deleted_row.card_type_code = ct_code
            deleted_row.card_type_name = ct_name
            deleted_row.bank_ifsc_ref_id = resolved_bank_ref
            deleted_row.bank_name = clean_bank
            deleted_row.bank_short_code = resolved_bank_short
            deleted_row.bill_generate_day = bill_gen_day
            deleted_row.bill_due_day = bill_due_day
            deleted_row.status = "ACTIVE"
            deleted_row.is_active = True
            deleted_row.is_deleted = False
            row = deleted_row
        else:
            row = RetailerCreditCardModel(
                public_id=uuid.uuid4(),
                company_ref_id=company_ref_id,
                retailer_ref_id=retailer_ref_id,
                user_ref_id=identity.user_ref_id,
                cardholder_name=clean_name,
                mobile_number=clean_mobile,
                card_number_hash=card_hash,
                masked_card_number=masked_card,
                card_last4=last4,
                card_bin6=bin6,
                card_type_ref_id=resolved_ct_ref,
                card_type_code=ct_code,
                card_type_name=ct_name,
                bank_ifsc_ref_id=resolved_bank_ref,
                bank_name=clean_bank,
                bank_short_code=resolved_bank_short,
                bill_generate_day=bill_gen_day,
                bill_due_day=bill_due_day,
                status="ACTIVE",
                is_active=True,
                is_deleted=False,
            )
            db.add(row)

        try:
            await db.commit()
            await db.refresh(row)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This credit card ({masked_card}) is already registered in your Card Management list.",
            )

        return {
            "status": "SUCCESS",
            "message": "Credit card saved successfully.",
            "card": cls._serialize_card(row, reference_date=reference_date),
        }

    @classmethod
    async def delete_card(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        card_ref_id: int,
    ) -> Dict[str, Any]:
        await cls.ensure_table_exists(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)

        row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.card_ref_id == int(card_ref_id),
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit card not found for your retailer account.",
            )

        row.is_deleted = True
        row.is_active = False
        row.status = "REMOVED"
        await db.commit()
        return {"status": "SUCCESS", "message": "Credit card removed."}
