"""
Bitly-Style Receipt Short URL Generation & Secure Resolution Service
Provides cryptographically secure, random, non-sequential short capability codes (e.g. /r/aB72xK9p)
for official digital payment receipts across SMSPAY, Near4You, and Pay2Pay.
Eliminates long token strings and prevents parameter exposure in browser URLs.
"""

import re
import secrets
import string
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

from fastapi import Request, HTTPException, status
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import GlobalReceiptSecurity
from app.core.company_resolver import resolve_receipt_base_url
from app.infrastructure.db.payin_models import ReceiptShortLinkModel, PayinTransactionModel

logger = logging.getLogger(__name__)

# Base62 character set for Bitly-style short codes (62^8 = ~2.18 * 10^14 combinations)
BASE62_ALPHABET = string.ascii_letters + string.digits
SHORT_CODE_REGEX = re.compile(r"^[0-9a-zA-Z]{6,16}$")


class ReceiptShortLinkService:
    """Authoritative service for generating, persisting, and securely resolving Bitly-style receipt short URLs."""

    @staticmethod
    def generate_random_code(length: int = 8) -> str:
        """
        Generates a cryptographically secure, random, non-sequential alphanumeric code.
        Does not encode or expose internal transaction references or sequence IDs.
        """
        return "".join(secrets.choice(BASE62_ALPHABET) for _ in range(length))

    @classmethod
    async def generate_or_get_short_code(
        cls,
        db: AsyncSession,
        tid: str,
        company_ref_id: int,
        user_type_ref_id: Optional[int] = None,
        user_ref_id: Optional[int] = None,
        payin_txn_id: Optional[int] = None,
        expires_at: Optional[datetime] = None
    ) -> str:
        """
        Idempotently resolves or generates and persists a Bitly-style short code for a transaction.
        Guarantees that the same transaction always returns the exact same short code across repeated calls.
        """
        clean_tid = str(tid).strip()

        # 1. Check existing record on payin_transactions first
        txn_stmt = select(
            PayinTransactionModel.payin_transactions_ref_id,
            PayinTransactionModel.receipt_short_code,
            PayinTransactionModel.company_ref_id,
            PayinTransactionModel.user_type_ref_id,
            PayinTransactionModel.user_ref_id,
            PayinTransactionModel.txn_status,
            PayinTransactionModel.merchant_ref_id,
            PayinTransactionModel.provider_ref_id
        ).where(PayinTransactionModel.tid == clean_tid)
        txn_res = await db.execute(txn_stmt)
        txn_row = txn_res.first()

        existing_short_code = None
        if txn_row:
            existing_short_code = txn_row.receipt_short_code
            if payin_txn_id is None:
                payin_txn_id = txn_row.payin_transactions_ref_id
            if user_type_ref_id is None:
                user_type_ref_id = txn_row.user_type_ref_id
            if user_ref_id is None:
                user_ref_id = txn_row.user_ref_id

        # 2. Check receipt_short_links table for existing active mapping
        link_stmt = select(ReceiptShortLinkModel).where(
            ReceiptShortLinkModel.tid == clean_tid,
            ReceiptShortLinkModel.is_active == True,
            ReceiptShortLinkModel.is_revoked == False
        ).order_by(ReceiptShortLinkModel.created_at.desc())
        link_res = await db.execute(link_stmt)
        existing_link = link_res.scalars().first()

        if existing_link:
            # If txn column was missing, sync it for fast future joins
            if not existing_short_code:
                try:
                    await db.execute(
                        update(PayinTransactionModel)
                        .where(PayinTransactionModel.tid == clean_tid)
                        .values(receipt_short_code=existing_link.short_code)
                    )
                    await db.flush()
                except Exception as sync_err:
                    logger.debug("Notice syncing short code to txn: %s", sync_err)
            return existing_link.short_code

        if existing_short_code:
            # Verify if link model exists; if not, recreate mapping in receipt_short_links
            token_payload = {
                "tid": clean_tid,
                "company_ref_id": company_ref_id,
                "status": "SUCCESS",
                "ts": int(datetime.now(timezone.utc).timestamp())
            }
            enc_token = GlobalReceiptSecurity.encrypt_receipt_token(token_payload)
            new_link = ReceiptShortLinkModel(
                short_code=existing_short_code,
                tid=clean_tid,
                payin_transactions_ref_id=payin_txn_id,
                receipt_token=enc_token,
                company_ref_id=company_ref_id,
                user_type_ref_id=user_type_ref_id,
                user_ref_id=user_ref_id,
                is_active=True,
                is_revoked=False,
                access_count=0,
                expires_at=expires_at
            )
            db.add(new_link)
            await db.flush()
            return existing_short_code

        # 3. Generate a new high-entropy short code with collision protection
        max_attempts = 5
        short_code = None
        for _ in range(max_attempts):
            candidate = cls.generate_random_code(length=8)
            check_stmt = select(ReceiptShortLinkModel.receipt_short_link_ref_id).where(
                ReceiptShortLinkModel.short_code == candidate
            )
            exists = (await db.execute(check_stmt)).first()
            if not exists:
                short_code = candidate
                break

        if not short_code:
            # Fallback to 10 chars if extraordinarily rare 8-char collision occurred
            short_code = cls.generate_random_code(length=10)

        # Build encrypted capability token snapshot
        token_payload = {
            "tid": clean_tid,
            "company_ref_id": company_ref_id,
            "status": "SUCCESS",
            "ts": int(datetime.now(timezone.utc).timestamp())
        }
        enc_token = GlobalReceiptSecurity.encrypt_receipt_token(token_payload)

        short_link_record = ReceiptShortLinkModel(
            short_code=short_code,
            tid=clean_tid,
            payin_transactions_ref_id=payin_txn_id,
            receipt_token=enc_token,
            company_ref_id=company_ref_id,
            user_type_ref_id=user_type_ref_id,
            user_ref_id=user_ref_id,
            is_active=True,
            is_revoked=False,
            access_count=0,
            expires_at=expires_at
        )
        db.add(short_link_record)

        # Update payin_transactions with the generated short code
        await db.execute(
            update(PayinTransactionModel)
            .where(PayinTransactionModel.tid == clean_tid)
            .values(receipt_short_code=short_code)
        )
        await db.flush()

        logger.info(
            "[SHORT_LINK] Generated new short receipt link %s for TID %s (Company %s)",
            short_code, clean_tid, company_ref_id
        )
        return short_code

    @classmethod
    async def resolve_short_code(
        cls,
        db: AsyncSession,
        short_code: str,
        request: Optional[Request] = None
    ) -> Dict[str, Any]:
        """
        Securely resolves a short code to its associated transaction and receipt metadata.
        Validates format, active status, revocation, and expiration.
        Updates access audit metadata.
        """
        clean_code = str(short_code).strip()
        if not clean_code or not SHORT_CODE_REGEX.match(clean_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid receipt short code format."
            )

        # Lookup mapping in receipt_short_links
        stmt = select(ReceiptShortLinkModel).where(
            ReceiptShortLinkModel.short_code == clean_code
        )
        res = await db.execute(stmt)
        record = res.scalars().first()

        # Fallback check on payin_transactions.receipt_short_code
        if not record:
            txn_stmt = select(PayinTransactionModel).where(
                PayinTransactionModel.receipt_short_code == clean_code
            )
            txn_res = await db.execute(txn_stmt)
            txn_fallback = txn_res.scalars().first()
            if txn_fallback:
                # Lazily recreate short link mapping
                token_payload = {
                    "tid": txn_fallback.tid,
                    "company_ref_id": txn_fallback.company_ref_id,
                    "status": (txn_fallback.txn_status or "SUCCESS").upper(),
                    "ts": int(datetime.now(timezone.utc).timestamp())
                }
                enc_token = GlobalReceiptSecurity.encrypt_receipt_token(token_payload)
                record = ReceiptShortLinkModel(
                    short_code=clean_code,
                    tid=txn_fallback.tid,
                    payin_transactions_ref_id=txn_fallback.payin_transactions_ref_id,
                    receipt_token=enc_token,
                    company_ref_id=txn_fallback.company_ref_id,
                    user_type_ref_id=txn_fallback.user_type_ref_id,
                    user_ref_id=txn_fallback.user_ref_id,
                    is_active=True,
                    is_revoked=False,
                    access_count=0
                )
                db.add(record)
                await db.flush()

        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found or link is invalid."
            )

        if record.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"This receipt link has been revoked: {record.revocation_reason or 'Access revoked by administrator.'}"
            )

        if not record.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This receipt link is currently inactive."
            )

        if record.expires_at is not None:
            now_utc = datetime.now(timezone.utc)
            if now_utc > record.expires_at:
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail="This receipt link has expired."
                )

        # Audit increment
        try:
            record.access_count = (record.access_count or 0) + 1
            record.last_accessed_at = datetime.now(timezone.utc)
            await db.flush()
        except Exception as audit_err:
            logger.debug("Notice updating short link audit count: %s", audit_err)

        return {
            "short_code": record.short_code,
            "tid": record.tid,
            "payin_transactions_ref_id": record.payin_transactions_ref_id,
            "company_ref_id": record.company_ref_id,
            "user_type_ref_id": record.user_type_ref_id,
            "user_ref_id": record.user_ref_id,
            "receipt_token": record.receipt_token,
            "created_at": record.created_at,
            "access_count": record.access_count
        }

    @staticmethod
    def get_short_receipt_url(
        short_code: str,
        company_ref_id: int,
        request: Optional[Request] = None
    ) -> str:
        """Constructs the canonical Bitly-style short URL on the verified company receipt subdomain."""
        base_url = resolve_receipt_base_url(company_ref_id=company_ref_id, request=request)
        return f"{base_url}/r/{short_code}"

    @classmethod
    async def revoke_short_code(
        cls,
        db: AsyncSession,
        short_code: str,
        reason: Optional[str] = "Revoked for security verification."
    ) -> bool:
        """Administrative revocation of a receipt short code."""
        stmt = (
            update(ReceiptShortLinkModel)
            .where(ReceiptShortLinkModel.short_code == short_code)
            .values(
                is_revoked=True,
                is_active=False,
                revocation_reason=reason,
                updated_at=datetime.now(timezone.utc)
            )
        )
        res = await db.execute(stmt)
        await db.flush()
        return res.rowcount > 0
