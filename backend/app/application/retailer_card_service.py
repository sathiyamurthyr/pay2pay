"""
Retailer Credit Card Management Service.

Handles:
- Card validation (10-digit Indian mobile, Luhn checksum, card length, day-of-month clamping)
- Secure card fingerprinting (HMAC-SHA256) & masking (never exposes/stores raw PAN or CVV)
- Strict multi-tenant isolation scoped by (company_ref_id, retailer_ref_id, tenant_id)
- Two-level duplicate card prevention per retailer + company
- Billing cycle calculation: Bills Generated Today, Bills Due Today, Upcoming Bill Generation,
  Upcoming Bill Due, and Overdue Bills
- Audit logging for CREATE, UPDATE, DELETE, MARK_PAID
"""

import calendar
import hashlib
import hmac
import json
import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.menu_favorite_service import ResolvedFavoriteIdentity
from app.application.payin_mdr_service import PayInMdrService
from app.core.config import settings
from app.infrastructure.db.bank_master_models import BankMasterModel
from app.infrastructure.db.models import CompanyModel, RetailerModel
from app.infrastructure.db.payin_models import PayinCardTypeModel, PayinMdrCfgModel
from app.infrastructure.db.retailer_card_models import (
    RetailerCardAuditLogModel,
    RetailerCreditCardModel,
)

logger = logging.getLogger("retailer_card_service")

IST_TZ = timezone(timedelta(hours=5, minutes=30))

DUPLICATE_CARD_MESSAGE = "This credit card is already registered with your retailer account."

CARD_TYPE_OPTIONS: List[Dict[str, Any]] = [
    {"card_type_ref_id": 1, "card_type_code": "VISA", "card_type_name": "Visa", "card_network": "VISA"},
    {"card_type_ref_id": 2, "card_type_code": "MASTERCARD", "card_type_name": "MasterCard", "card_network": "MASTERCARD"},
    {"card_type_ref_id": 3, "card_type_code": "RUPAY", "card_type_name": "RuPay", "card_network": "RUPAY"},
    {"card_type_ref_id": 4, "card_type_code": "AMEX", "card_type_name": "AMEX / Diners", "card_network": "AMEX"},
    {"card_type_ref_id": 5, "card_type_code": "CORP", "card_type_name": "Business / Corporate", "card_network": "CORP"},
]

DEFAULT_CREDIT_CARD_BANKS: List[Dict[str, Any]] = [
    {"bank_id": None, "bank_name": "HDFC BANK", "short_code": "HDFC", "is_credit_card": True},
    {"bank_id": None, "bank_name": "ICICI BANK", "short_code": "ICIC", "is_credit_card": True},
    {"bank_id": None, "bank_name": "STATE BANK OF INDIA", "short_code": "SBIN", "is_credit_card": True},
    {"bank_id": None, "bank_name": "AXIS BANK", "short_code": "UTIB", "is_credit_card": True},
    {"bank_id": None, "bank_name": "KOTAK MAHINDRA BANK", "short_code": "KKBK", "is_credit_card": True},
    {"bank_id": None, "bank_name": "INDUSIND BANK", "short_code": "INDB", "is_credit_card": True},
    {"bank_id": None, "bank_name": "YES BANK", "short_code": "YESB", "is_credit_card": True},
    {"bank_id": None, "bank_name": "IDFC FIRST BANK", "short_code": "IDFB", "is_credit_card": True},
    {"bank_id": None, "bank_name": "RBL BANK", "short_code": "RATN", "is_credit_card": True},
    {"bank_id": None, "bank_name": "FEDERAL BANK", "short_code": "FDRL", "is_credit_card": True},
    {"bank_id": None, "bank_name": "STANDARD CHARTERED BANK", "short_code": "SCBL", "is_credit_card": True},
    {"bank_id": None, "bank_name": "HSBC BANK", "short_code": "HSBC", "is_credit_card": True},
    {"bank_id": None, "bank_name": "AMERICAN EXPRESS", "short_code": "AMEX", "is_credit_card": True},
    {"bank_id": None, "bank_name": "AU SMALL FINANCE BANK", "short_code": "AUBL", "is_credit_card": True},
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
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
    Returns (normalized_digits, masked_card_no, last4, bin6).
    """
    digits = re.sub(r"\D", "", str(raw_card_number or ""))
    if len(digits) < 13 or len(digits) > 19:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Card number must contain between 13 and 19 digits.",
        )
    if not luhn_check(digits):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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


def fingerprint_card_number(digits: str) -> str:
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
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{field_label} must be a valid day of month (1-31) or YYYY-MM-DD date.",
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field_label} must be a valid day of month (1-31).",
        )

    if day < 1 or day > 31:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field_label} must be between 1 and 31.",
        )
    return day


def _clamped_month_date(year: int, month: int, day: int) -> date:
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_day))


def _next_month(year: int, month: int) -> Tuple[int, int]:
    return (year + 1, 1) if month == 12 else (year, month + 1)


def compute_bill_schedule(
    bill_gen_day: int,
    bill_due_day: int,
    reference_date: Optional[date] = None,
    card_created_date: Optional[date] = None,
    last_paid_cycle: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes current & next occurrence of bill generation date and bill due date,
    along with overdue detection for unpaid cycles already active on or before due date.
    """
    ref = reference_date or _ist_today()
    gen_this_month = _clamped_month_date(ref.year, ref.month, bill_gen_day)
    due_this_month = _clamped_month_date(ref.year, ref.month, bill_due_day)
    current_cycle_key = f"{ref.year:04d}-{ref.month:02d}"

    is_generated_today = gen_this_month == ref
    if gen_this_month >= ref:
        next_bill_gen_date = gen_this_month
    else:
        ny, nm = _next_month(ref.year, ref.month)
        next_bill_gen_date = _clamped_month_date(ny, nm, bill_gen_day)
    days_until_generation = (next_bill_gen_date - ref).days

    # Check if overdue: due_this_month < ref, card existed on/before due_this_month, and cycle not marked paid
    is_overdue = False
    days_overdue = 0
    if due_this_month < ref and last_paid_cycle != current_cycle_key:
        if card_created_date is None or card_created_date <= due_this_month:
            is_overdue = True
            days_overdue = (ref - due_this_month).days

    is_due_today = due_this_month == ref
    if due_this_month >= ref:
        next_bill_due_date = due_this_month
    else:
        ny, nm = _next_month(ref.year, ref.month)
        next_bill_due_date = _clamped_month_date(ny, nm, bill_due_day)

    days_remaining = (next_bill_due_date - ref).days

    if is_overdue:
        bill_status = "OVERDUE"
        status_label = f"Overdue by {days_overdue} day" + ("s" if days_overdue != 1 else "")
    elif is_due_today:
        bill_status = "DUE_TODAY"
        status_label = "Due Today"
    else:
        bill_status = "UPCOMING"
        status_label = "Due Tomorrow" if days_remaining == 1 else f"Due in {days_remaining} days"

    return {
        "bill_status": bill_status,
        "status_label": status_label,
        "is_generated_today": is_generated_today,
        "is_due_today": is_due_today,
        "is_overdue": is_overdue,
        "days_overdue": days_overdue,
        "days_remaining": days_remaining,
        "days_until_generation": days_until_generation,
        "current_cycle_key": current_cycle_key,
        "bill_generation_date": gen_this_month.isoformat(),
        "bill_due_date": due_this_month.isoformat(),
        "next_bill_generation_date": next_bill_gen_date.isoformat(),
        "next_bill_due_date": next_bill_due_date.isoformat(),
    }


def _require_retailer_scope(identity: ResolvedFavoriteIdentity) -> Tuple[int, int]:
    """Fail closed if company_ref_id or retailer_ref_id cannot be verified from the session."""
    if not identity or not identity.company_ref_id or not identity.retailer_ref_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated retailer & company context is required for Credit Card Management.",
        )
    return int(identity.company_ref_id), int(identity.retailer_ref_id)


async def _resolve_tenant_uuid(
    db: AsyncSession, company_ref_id: int, retailer_ref_id: int
) -> Optional[uuid.UUID]:
    try:
        ret = (
            await db.execute(
                select(RetailerModel.tenant_id).where(RetailerModel.retailer_ref_id == retailer_ref_id)
            )
        ).scalars().first()
        if ret:
            return ret
        comp = (
            await db.execute(
                select(CompanyModel.tenant_id).where(CompanyModel.company_ref_id == company_ref_id)
            )
        ).scalars().first()
        if comp:
            return comp
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"sathus-company-{company_ref_id}")


class RetailerCardService:
    """Service layer for Retailer Credit Card Management."""

    @classmethod
    async def ensure_tables_exist(cls, db: AsyncSession) -> None:
        try:
            await db.execute(select(RetailerCreditCardModel.ref_id, RetailerCreditCardModel.bill_amount).limit(1))
            await db.execute(select(RetailerCardAuditLogModel.ref_id).limit(1))
        except Exception:
            await db.rollback()
            conn = await db.connection()
            await conn.run_sync(
                lambda sync_conn: RetailerCreditCardModel.__table__.create(sync_conn, checkfirst=True)
            )
            await conn.run_sync(
                lambda sync_conn: RetailerCardAuditLogModel.__table__.create(sync_conn, checkfirst=True)
            )
            try:
                await db.execute(
                    text("ALTER TABLE public.retailer_credit_cards ADD COLUMN IF NOT EXISTS bill_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00")
                )
            except Exception:
                await db.rollback()
            await db.commit()

    @classmethod
    async def _record_audit(
        cls,
        db: AsyncSession,
        *,
        identity: ResolvedFavoriteIdentity,
        tenant_id: Optional[uuid.UUID],
        card_ref_id: Optional[int],
        action: str,
        masked_card_no: Optional[str],
        details: Dict[str, Any],
    ) -> None:
        audit_row = RetailerCardAuditLogModel(
            card_ref_id=card_ref_id,
            tenant_id=tenant_id,
            company_ref_id=int(identity.company_ref_id),
            retailer_ref_id=int(identity.retailer_ref_id),
            user_type_ref_id=int(identity.user_type_ref_id or 2),
            user_ref_id=identity.user_ref_id,
            action=action,
            masked_card_no=masked_card_no,
            details_json=json.dumps(details, default=str),
        )
        db.add(audit_row)

    @classmethod
    async def get_metadata(cls, db: AsyncSession) -> Dict[str, Any]:
        """Loads active Card Types from payin_card_types and supported Banks from bank_master."""
        card_types: List[Dict[str, Any]] = []
        try:
            ct_rows = (
                await db.execute(
                    select(
                        PayinCardTypeModel.payin_card_type_ref_id,
                        PayinCardTypeModel.card_type_code,
                        PayinCardTypeModel.card_type_name,
                        PayinCardTypeModel.card_network,
                    )
                    .where(PayinCardTypeModel.is_enabled == True)
                    .order_by(PayinCardTypeModel.payin_card_type_ref_id.asc())
                )
            ).all()
            for ct in ct_rows:
                card_types.append(
                    {
                        "card_type_ref_id": ct.payin_card_type_ref_id,
                        "card_type_code": ct.card_type_code,
                        "card_type_name": ct.card_type_name,
                        "card_network": ct.card_network,
                    }
                )
        except Exception as exc:
            logger.debug(f"Fallback to default card types: {exc}")
            try:
                await db.rollback()
            except Exception:
                pass

        if not card_types:
            card_types = list(CARD_TYPE_OPTIONS)

        banks: List[Dict[str, Any]] = []
        try:
            bank_cols = (
                BankMasterModel.bank_ifsc_ref_id,
                BankMasterModel.bank_name,
                BankMasterModel.short_code,
                BankMasterModel.ifsc_prefix,
                BankMasterModel.is_credit_card,
            )
            bank_rows = (
                await db.execute(
                    select(*bank_cols)
                    .where(
                        BankMasterModel.status == 1,
                        BankMasterModel.is_credit_card == True,
                    )
                    .order_by(BankMasterModel.bank_name.asc())
                    .limit(300)
                )
            ).all()
            if not bank_rows:
                bank_rows = (
                    await db.execute(
                        select(*bank_cols)
                        .where(BankMasterModel.status == 1)
                        .order_by(BankMasterModel.bank_name.asc())
                        .limit(300)
                    )
                ).all()
            for b in bank_rows:
                banks.append(
                    {
                        "bank_id": b.bank_ifsc_ref_id,
                        "bank_name": b.bank_name,
                        "short_code": b.short_code or b.ifsc_prefix,
                        "is_credit_card": bool(b.is_credit_card),
                    }
                )
        except Exception as exc:
            logger.debug(f"Fallback to default credit card banks: {exc}")
            try:
                await db.rollback()
            except Exception:
                pass

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
        created_d = row.created_at.astimezone(IST_TZ).date() if row.created_at else None
        schedule = compute_bill_schedule(
            bill_gen_day=row.bill_gen_day,
            bill_due_day=row.bill_due_day,
            reference_date=reference_date,
            card_created_date=created_d,
            last_paid_cycle=row.last_paid_cycle,
        )
        is_paid_current_cycle = row.last_paid_cycle == schedule["current_cycle_key"]
        return {
            "ref_id": row.ref_id,
            "public_id": str(row.public_id),
            "tenant_id": str(row.tenant_id) if row.tenant_id else None,
            "company_ref_id": row.company_ref_id,
            "retailer_ref_id": row.retailer_ref_id,
            "user_type_ref_id": row.user_type_ref_id,
            "user_ref_id": row.user_ref_id,
            "card_name": row.card_name,
            "mobile_no": row.mobile_no,
            "masked_card_no": row.masked_card_no,
            "card_last4": row.card_last4,
            "card_type_ref_id": row.card_type_ref_id,
            "card_type": row.card_type,
            "bank_id": row.bank_id,
            "bank_name": row.bank_name,
            "bank_short_code": row.bank_short_code,
            "bill_gen_day": row.bill_gen_day,
            "bill_due_day": row.bill_due_day,
            "bill_amount": float(row.bill_amount or 0),
            "last_paid_cycle": row.last_paid_cycle,
            "is_paid_current_cycle": is_paid_current_cycle,
            "payment_status": "PAID" if is_paid_current_cycle else "UNPAID",
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            **schedule,
        }

    @classmethod
    async def list_cards_dashboard(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        *,
        range_filter: str = "all",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        bank_name: Optional[str] = None,
        card_status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_tables_exist(db)
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
        all_rows = (await db.execute(stmt)).scalars().all()
        all_serialized = [cls._serialize_card(r, reference_date=ref_date) for r in all_rows]

        # Summary KPIs across all active cards for this retailer
        bills_generated_today = [c for c in all_serialized if c["is_generated_today"]]
        bills_due_today = [c for c in all_serialized if c["is_due_today"]]
        overdue_bills = sorted(
            [c for c in all_serialized if c["is_overdue"]],
            key=lambda c: (-c["days_overdue"], c["card_name"].lower()),
        )
        upcoming_bill_due = sorted(
            [c for c in all_serialized if c["bill_status"] == "UPCOMING"],
            key=lambda c: (c["days_remaining"], c["card_name"].lower()),
        )
        upcoming_bill_generation = sorted(
            [c for c in all_serialized if not c["is_generated_today"]],
            key=lambda c: (c["days_until_generation"], c["card_name"].lower()),
        )
        upcoming_7_days = [c for c in all_serialized if 1 <= c["days_remaining"] <= 7]
        upcoming_30_days = [c for c in all_serialized if 1 <= c["days_remaining"] <= 30]

        # Apply dashboard filters to table rows
        filtered = list(all_serialized)
        if search and search.strip():
            q = search.strip().lower()
            filtered = [
                c
                for c in filtered
                if q in c["card_name"].lower()
                or q in c["mobile_no"].lower()
                or q in c["card_last4"].lower()
                or q in c["bank_name"].lower()
            ]
        if bank_name and bank_name.strip() and bank_name.strip().upper() != "ALL":
            bn = bank_name.strip().upper()
            filtered = [c for c in filtered if c["bank_name"].strip().upper() == bn]

        if card_status and card_status.strip() and card_status.strip().upper() != "ALL":
            cs = card_status.strip().upper()
            if cs == "GENERATED_TODAY":
                filtered = [c for c in filtered if c["is_generated_today"]]
            else:
                filtered = [c for c in filtered if c["bill_status"] == cs]

        rf = (range_filter or "all").strip().lower()
        if rf == "today":
            filtered = [c for c in filtered if c["is_due_today"] or c["is_generated_today"]]
        elif rf == "7d":
            filtered = [c for c in filtered if 0 <= c["days_remaining"] <= 7]
        elif rf == "15d":
            filtered = [c for c in filtered if 0 <= c["days_remaining"] <= 15]
        elif rf == "30d":
            filtered = [c for c in filtered if 0 <= c["days_remaining"] <= 30]
        elif rf == "custom" and (from_date or to_date):
            try:
                f_dt = date.fromisoformat(from_date[:10]) if from_date else date.min
                t_dt = date.fromisoformat(to_date[:10]) if to_date else date.max
                filtered = [
                    c
                    for c in filtered
                    if f_dt <= date.fromisoformat(c["next_bill_due_date"]) <= t_dt
                    or f_dt <= date.fromisoformat(c["next_bill_generation_date"]) <= t_dt
                ]
            except ValueError:
                pass

        total_filtered = len(filtered)
        safe_page = max(1, int(page))
        safe_size = max(1, min(100, int(page_size)))
        start = (safe_page - 1) * safe_size
        paginated_cards = filtered[start : start + safe_size]

        return {
            "status": "SUCCESS",
            "reference_date": ref_date.isoformat(),
            "company_ref_id": company_ref_id,
            "retailer_ref_id": retailer_ref_id,
            "summary": {
                "total_cards": len(all_serialized),
                "bills_generated_today_count": len(bills_generated_today),
                "bills_due_today_count": len(bills_due_today),
                "upcoming_7_days_count": len(upcoming_7_days),
                "upcoming_30_days_count": len(upcoming_30_days),
                "overdue_bills_count": len(overdue_bills),
            },
            "bills_generated_today": bills_generated_today,
            "bills_due_today": bills_due_today,
            "upcoming_bill_generation": upcoming_bill_generation,
            "upcoming_bill_due": upcoming_bill_due,
            "overdue_bills": overdue_bills,
            "cards": paginated_cards,
            "total_filtered": total_filtered,
            "page": safe_page,
            "page_size": safe_size,
            "banks_in_use": sorted({c["bank_name"] for c in all_serialized}),
        }

    @classmethod
    async def get_card(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        card_ref_id: int,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_tables_exist(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)
        row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.ref_id == int(card_ref_id),
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found.")
        return {"status": "SUCCESS", "card": cls._serialize_card(row, reference_date=reference_date)}

    @classmethod
    async def create_card(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        *,
        card_name: str,
        mobile_no: str,
        card_number: str,
        card_type: str = "Credit Card",
        bank_name: str,
        bill_gen_day: Any,
        bill_due_day: Any,
        bill_amount: float = 0.0,
        bank_id: Optional[int] = None,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_tables_exist(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)
        tenant_uuid = await _resolve_tenant_uuid(db, company_ref_id, retailer_ref_id)

        clean_name = re.sub(r"\s+", " ", str(card_name or "")).strip()
        if len(clean_name) < 2 or len(clean_name) > 150:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cardholder Name must be between 2 and 150 characters.",
            )

        clean_mobile = normalize_mobile(mobile_no)
        digits, masked_card, last4, bin6 = normalize_and_validate_card_number(card_number)
        card_fp = fingerprint_card_number(digits)

        gen_day = parse_day_of_month(bill_gen_day, "Bill Generation Date")
        due_day = parse_day_of_month(bill_due_day, "Bill Due Date")

        clean_card_type = str(card_type or "Visa").strip()
        resolved_ct_ref: Optional[int] = None
        try:
            ct_row = (
                await db.execute(
                    select(
                        PayinCardTypeModel.payin_card_type_ref_id,
                        PayinCardTypeModel.card_type_name,
                    ).where(
                        or_(
                            PayinCardTypeModel.card_type_code.ilike(clean_card_type),
                            PayinCardTypeModel.card_type_name.ilike(clean_card_type),
                        ),
                        PayinCardTypeModel.is_enabled == True,
                    )
                )
            ).first()
            if ct_row:
                resolved_ct_ref = ct_row.payin_card_type_ref_id
                clean_card_type = ct_row.card_type_name
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

        clean_bank = re.sub(r"\s+", " ", str(bank_name or "")).strip()
        if not clean_bank and not bank_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Bank Name is required.",
            )
        resolved_bank_id = bank_id
        resolved_bank_short: Optional[str] = None
        try:
            bank_cols = (
                BankMasterModel.bank_ifsc_ref_id,
                BankMasterModel.bank_name,
                BankMasterModel.short_code,
                BankMasterModel.ifsc_prefix,
            )
            if bank_id:
                b_row = (
                    await db.execute(
                        select(*bank_cols).where(BankMasterModel.bank_ifsc_ref_id == int(bank_id))
                    )
                ).first()
            else:
                b_row = (
                    await db.execute(
                        select(*bank_cols).where(
                            BankMasterModel.bank_name.ilike(clean_bank),
                            BankMasterModel.status == 1,
                        )
                    )
                ).first()
            if b_row:
                resolved_bank_id = b_row.bank_ifsc_ref_id
                clean_bank = b_row.bank_name
                resolved_bank_short = b_row.short_code or b_row.ifsc_prefix
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

        # Level 1 Duplicate Check: backend validation scoped to (company_ref_id, retailer_ref_id, card_fingerprint)
        existing = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.card_fingerprint == card_fp,
                    RetailerCreditCardModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=DUPLICATE_CARD_MESSAGE,
            )

        deleted_row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.card_fingerprint == card_fp,
                    RetailerCreditCardModel.is_deleted == True,
                )
            )
        ).scalars().first()

        if deleted_row:
            deleted_row.tenant_id = tenant_uuid
            deleted_row.user_type_ref_id = int(identity.user_type_ref_id or 2)
            deleted_row.user_ref_id = identity.user_ref_id
            deleted_row.card_name = clean_name
            deleted_row.mobile_no = clean_mobile
            deleted_row.masked_card_no = masked_card
            deleted_row.card_last4 = last4
            deleted_row.card_bin6 = bin6
            deleted_row.card_type_ref_id = resolved_ct_ref
            deleted_row.card_type = clean_card_type
            deleted_row.bank_id = resolved_bank_id
            deleted_row.bank_name = clean_bank
            deleted_row.bank_short_code = resolved_bank_short
            deleted_row.bill_gen_day = gen_day
            deleted_row.bill_due_day = due_day
            deleted_row.bill_amount = max(0.0, round(float(bill_amount or 0), 2))
            deleted_row.last_paid_cycle = None
            deleted_row.status = "ACTIVE"
            deleted_row.is_active = True
            deleted_row.is_deleted = False
            row = deleted_row
        else:
            row = RetailerCreditCardModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_uuid,
                company_ref_id=company_ref_id,
                retailer_ref_id=retailer_ref_id,
                user_type_ref_id=int(identity.user_type_ref_id or 2),
                user_ref_id=identity.user_ref_id,
                card_name=clean_name,
                mobile_no=clean_mobile,
                card_fingerprint=card_fp,
                masked_card_no=masked_card,
                card_last4=last4,
                card_bin6=bin6,
                card_type_ref_id=resolved_ct_ref,
                card_type=clean_card_type,
                bank_id=resolved_bank_id,
                bank_name=clean_bank,
                bank_short_code=resolved_bank_short,
                bill_gen_day=gen_day,
                bill_due_day=due_day,
                bill_amount=max(0.0, round(float(bill_amount or 0), 2)),
                status="ACTIVE",
                is_active=True,
                is_deleted=False,
            )
            db.add(row)

        try:
            await db.flush()
            await cls._record_audit(
                db,
                identity=identity,
                tenant_id=tenant_uuid,
                card_ref_id=row.ref_id,
                action="CREATE",
                masked_card_no=masked_card,
                details={
                    "card_name": clean_name,
                    "bank_name": clean_bank,
                    "bill_gen_day": gen_day,
                    "bill_due_day": due_day,
                },
            )
            await db.commit()
            await db.refresh(row)
        except IntegrityError:
            await db.rollback()
            # Level 2 Duplicate Check: DB unique constraint violation
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=DUPLICATE_CARD_MESSAGE,
            )

        return {
            "status": "SUCCESS",
            "message": "Credit card registered successfully.",
            "card": cls._serialize_card(row, reference_date=reference_date),
        }

    @classmethod
    async def update_card(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        card_ref_id: int,
        *,
        card_name: Optional[str] = None,
        mobile_no: Optional[str] = None,
        bank_name: Optional[str] = None,
        bank_id: Optional[int] = None,
        bill_gen_day: Optional[Any] = None,
        bill_due_day: Optional[Any] = None,
        bill_amount: Optional[float] = None,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_tables_exist(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)

        row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.ref_id == int(card_ref_id),
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found.")

        if card_name is not None:
            clean_name = re.sub(r"\s+", " ", card_name).strip()
            if len(clean_name) < 2 or len(clean_name) > 150:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Cardholder Name must be between 2 and 150 characters.",
                )
            row.card_name = clean_name
        if mobile_no is not None:
            row.mobile_no = normalize_mobile(mobile_no)
        if bank_name is not None and bank_name.strip():
            row.bank_name = re.sub(r"\s+", " ", bank_name).strip()
            row.bank_id = bank_id
        if bill_gen_day is not None:
            row.bill_gen_day = parse_day_of_month(bill_gen_day, "Bill Generation Date")
        if bill_due_day is not None:
            row.bill_due_day = parse_day_of_month(bill_due_day, "Bill Due Date")
        if bill_amount is not None:
            if float(bill_amount) < 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Bill amount cannot be negative.",
                )
            row.bill_amount = round(float(bill_amount), 2)

        await cls._record_audit(
            db,
            identity=identity,
            tenant_id=row.tenant_id,
            card_ref_id=row.ref_id,
            action="UPDATE",
            masked_card_no=row.masked_card_no,
            details={
                "card_name": row.card_name,
                "bank_name": row.bank_name,
                "bill_gen_day": row.bill_gen_day,
                "bill_due_day": row.bill_due_day,
            },
        )
        await db.commit()
        await db.refresh(row)
        return {
            "status": "SUCCESS",
            "message": "Credit card updated successfully.",
            "card": cls._serialize_card(row, reference_date=reference_date),
        }

    @classmethod
    async def mark_cycle_paid(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        card_ref_id: int,
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        await cls.ensure_tables_exist(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)
        ref = reference_date or _ist_today()
        cycle_key = f"{ref.year:04d}-{ref.month:02d}"

        row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.ref_id == int(card_ref_id),
                    RetailerCreditCardModel.company_ref_id == company_ref_id,
                    RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                    RetailerCreditCardModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found.")

        row.last_paid_cycle = cycle_key
        await cls._record_audit(
            db,
            identity=identity,
            tenant_id=row.tenant_id,
            card_ref_id=row.ref_id,
            action="MARK_PAID",
            masked_card_no=row.masked_card_no,
            details={"cycle_key": cycle_key},
        )
        await db.commit()
        await db.refresh(row)
        return {
            "status": "SUCCESS",
            "message": f"Marked {cycle_key} bill cycle as paid.",
            "card": cls._serialize_card(row, reference_date=ref),
        }

    @classmethod
    async def delete_card(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        card_ref_id: int,
    ) -> Dict[str, Any]:
        await cls.ensure_tables_exist(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)

        row = (
            await db.execute(
                select(RetailerCreditCardModel).where(
                    RetailerCreditCardModel.ref_id == int(card_ref_id),
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
        await cls._record_audit(
            db,
            identity=identity,
            tenant_id=row.tenant_id,
            card_ref_id=row.ref_id,
            action="DELETE",
            masked_card_no=row.masked_card_no,
            details={"card_name": row.card_name, "bank_name": row.bank_name},
        )
        await db.commit()
        return {"status": "SUCCESS", "message": "Credit card removed."}

    @classmethod
    async def _resolve_charge_rule(
        cls,
        db: AsyncSession,
        company_ref_id: int,
        card_type_ref_id: Optional[int],
        card_type: str,
    ) -> Dict[str, Decimal]:
        """
        Resolves dynamic service charge & GST rates from payin_mdr_cfg (matching company_ref_id & card_type),
        falling back to PayInMdrService.get_mdr_for_company when no specific rule is present.
        """
        try:
            stmt = (
                select(
                    PayinMdrCfgModel.mdr_pct,
                    PayinMdrCfgModel.mdr_fixed,
                    PayinMdrCfgModel.tax_pct,
                    PayinMdrCfgModel.min_mdr,
                    PayinMdrCfgModel.max_mdr,
                    PayinMdrCfgModel.payin_card_type_ref_id,
                    PayinMdrCfgModel.card_network,
                    PayinMdrCfgModel.priority,
                )
                .where(
                    PayinMdrCfgModel.company_ref_id == company_ref_id,
                    PayinMdrCfgModel.is_enabled == True,
                )
                .order_by(PayinMdrCfgModel.priority.desc(), PayinMdrCfgModel.payin_mdr_cfg_ref_id.desc())
            )
            rows = (await db.execute(stmt)).all()
            if rows:
                ct_upper = (card_type or "").strip().upper()
                best = None
                best_score = -1
                for r in rows:
                    score = int(r.priority or 0)
                    if card_type_ref_id and r.payin_card_type_ref_id == card_type_ref_id:
                        score += 50
                    if r.card_network and r.card_network.upper() in ct_upper:
                        score += 40
                    if r.card_network == "UPI" and "UPI" not in ct_upper:
                        continue
                    if score > best_score:
                        best_score = score
                        best = r
                if best:
                    return {
                        "mdr_pct": Decimal(str(best.mdr_pct or "0")),
                        "mdr_fixed": Decimal(str(best.mdr_fixed or "0")),
                        "tax_pct": Decimal(str(best.tax_pct or "0.1800")),
                        "min_mdr": Decimal(str(best.min_mdr or "0")),
                        "max_mdr": Decimal(str(best.max_mdr or "5000.00")),
                    }
        except Exception as exc:
            logger.debug(f"MDR rule lookup fallback: {exc}")
            try:
                await db.rollback()
            except Exception:
                pass

        try:
            legacy = await PayInMdrService.get_mdr_for_company(db, company_ref_id)
            return {
                "mdr_pct": Decimal(str(legacy.get("mdr_pct", "0.0150"))),
                "mdr_fixed": Decimal(str(legacy.get("mdr_fixed", "0.00"))),
                "tax_pct": Decimal(str(legacy.get("tax_pct", "0.1800"))),
                "min_mdr": Decimal(str(legacy.get("min_mdr", "0.00"))),
                "max_mdr": Decimal(str(legacy.get("max_mdr", "5000.00"))),
            }
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
        return {
            "mdr_pct": Decimal("0.0150"),
            "mdr_fixed": Decimal("0.00"),
            "tax_pct": Decimal("0.1800"),
            "min_mdr": Decimal("0.00"),
            "max_mdr": Decimal("5000.00"),
        }

    @classmethod
    async def quote_bill_payments(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        items: List[Dict[str, Any]],
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Computes authoritative Single or Bulk credit card bill payment breakdown."""
        await cls.ensure_tables_exist(db)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)
        if not items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Select at least one credit card bill to continue.",
            )

        ref_date = reference_date or _ist_today()
        two_places = Decimal("0.01")
        seen_ids = set()
        card_quotes: List[Dict[str, Any]] = []

        total_bill = Decimal("0.00")
        total_service_charge = Decimal("0.00")
        total_gst = Decimal("0.00")
        total_other = Decimal("0.00")
        grand_total = Decimal("0.00")

        for item in items:
            cid = int(item["card_ref_id"])
            if cid in seen_ids:
                continue
            seen_ids.add(cid)

            row = (
                await db.execute(
                    select(RetailerCreditCardModel).where(
                        RetailerCreditCardModel.ref_id == cid,
                        RetailerCreditCardModel.company_ref_id == company_ref_id,
                        RetailerCreditCardModel.retailer_ref_id == retailer_ref_id,
                        RetailerCreditCardModel.is_deleted == False,
                        RetailerCreditCardModel.is_active == True,
                    )
                )
            ).scalars().first()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Credit card #{cid} not found for your retailer account.",
                )

            serialized = cls._serialize_card(row, reference_date=ref_date)
            if serialized["is_paid_current_cycle"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Card {row.masked_card_no} is already marked paid for {serialized['current_cycle_key']}.",
                )

            override_amt = item.get("bill_amount")
            raw_amt = Decimal(str(override_amt if override_amt is not None else (row.bill_amount or 0)))
            bill_amt = raw_amt.quantize(two_places, rounding=ROUND_HALF_UP)
            if bill_amt <= Decimal("0.00"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Please enter a valid bill amount (> ₹0) for {row.masked_card_no}.",
                )

            rule = await cls._resolve_charge_rule(
                db, company_ref_id, serialized["card_type_ref_id"], serialized["card_type"]
            )
            raw_charge = (bill_amt * rule["mdr_pct"]) + rule["mdr_fixed"]
            if raw_charge < rule["min_mdr"]:
                raw_charge = rule["min_mdr"]
            if rule["max_mdr"] > Decimal("0") and raw_charge > rule["max_mdr"]:
                raw_charge = rule["max_mdr"]
            service_charge = raw_charge.quantize(two_places, rounding=ROUND_HALF_UP)

            gst_amount = (service_charge * rule["tax_pct"]).quantize(two_places, rounding=ROUND_HALF_UP)
            other_charges = Decimal("0.00")
            card_total = (bill_amt + service_charge + gst_amount + other_charges).quantize(
                two_places, rounding=ROUND_HALF_UP
            )

            total_bill += bill_amt
            total_service_charge += service_charge
            total_gst += gst_amount
            total_other += other_charges
            grand_total += card_total

            card_quotes.append(
                {
                    "card_ref_id": serialized["ref_id"],
                    "card_name": serialized["card_name"],
                    "mobile_no": serialized["mobile_no"],
                    "bank_name": serialized["bank_name"],
                    "bank_short_code": serialized["bank_short_code"],
                    "masked_card_no": serialized["masked_card_no"],
                    "card_type": serialized["card_type"],
                    "bill_generation_date": serialized["bill_generation_date"],
                    "bill_due_date": serialized["next_bill_due_date"],
                    "bill_status": serialized["bill_status"],
                    "bill_amount": float(bill_amt),
                    "service_charge": float(service_charge),
                    "charge_pct": float((rule["mdr_pct"] * Decimal("100")).quantize(two_places)),
                    "gst_rate_pct": float((rule["tax_pct"] * Decimal("100")).quantize(two_places)),
                    "gst_amount": float(gst_amount),
                    "other_charges": float(other_charges),
                    "total_payable": float(card_total),
                }
            )

        return {
            "status": "SUCCESS",
            "mode": "BULK" if len(card_quotes) > 1 else "SINGLE",
            "items": card_quotes,
            "summary": {
                "selected_cards_count": len(card_quotes),
                "total_bill_amount": float(total_bill),
                "total_service_charges": float(total_service_charge),
                "total_gst": float(total_gst),
                "total_other_charges": float(total_other),
                "grand_total": float(grand_total),
            },
        }

    @classmethod
    async def confirm_bill_payments(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        *,
        items: List[Dict[str, Any]],
        confirmed: bool,
        mode: str = "SINGLE",
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        if not confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please confirm the total payable amount before proceeding.",
            )

        quote = await cls.quote_bill_payments(db, identity, items, reference_date=reference_date)
        company_ref_id, retailer_ref_id = _require_retailer_scope(identity)
        tenant_uuid = await _resolve_tenant_uuid(db, company_ref_id, retailer_ref_id)

        await cls._record_audit(
            db,
            identity=identity,
            tenant_id=tenant_uuid,
            card_ref_id=quote["items"][0]["card_ref_id"] if len(quote["items"]) == 1 else None,
            action="PAYMENT_PENDING_PROVIDER",
            masked_card_no=", ".join(c["masked_card_no"] for c in quote["items"])[:32],
            details={
                "mode": mode,
                "selected_cards_count": quote["summary"]["selected_cards_count"],
                "grand_total": quote["summary"]["grand_total"],
            },
        )
        await db.commit()

        return {
            "status": "PENDING_PROVIDER",
            "provider_configured": False,
            "message": "Payment gateway integration is pending. Please configure the payment provider.",
            "quote": quote,
        }
