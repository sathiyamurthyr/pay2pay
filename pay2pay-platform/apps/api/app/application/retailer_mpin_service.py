"""
Enterprise Retailer MPIN Security & Admin Unlock Service
Handles MPIN status inspection, rate-limiting, lockout management, admin unlocking, and audit trail.
"""

import uuid
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union, List
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.infrastructure.db.models import RetailerModel, RetailerMpinAuditModel, AdminUserModel
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.session_security_models import UserSecuritySettingsModel
from app.core.security import verify_password, hash_password

MPIN_SECRET_SALT = "PAY2PAY_ENTERPRISE_MPIN_SALT_KEY_v1_2026"


def _hash_mpin(pin: str, salt_key: str) -> str:
    """Securely hash MPIN using HMAC-SHA256 with tenant/user salt."""
    salt = f"{MPIN_SECRET_SALT}:{salt_key}".encode("utf-8")
    return hmac.new(salt, pin.encode("utf-8"), hashlib.sha256).hexdigest()


class RetailerMpinService:
    @classmethod
    async def get_retailer(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
    ) -> RetailerModel:
        """Finds retailer with strict tenant and optional company scoping."""
        try:
            r_uuid = uuid.UUID(str(retailer_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid retailer ID format.",
            )

        stmt = select(RetailerModel).where(
            RetailerModel.public_id == r_uuid,
            RetailerModel.is_deleted == False,
        )
        if tenant_id:
            stmt = stmt.where(RetailerModel.tenant_id == tenant_id)
        if company_id:
            stmt = stmt.where(or_(RetailerModel.company_id == company_id, RetailerModel.company_id.is_(None)))

        res = await db.execute(stmt)
        retailer = res.scalars().first()
        if not retailer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Retailer not found in authorized tenant/company context.",
            )
        return retailer

    @classmethod
    async def get_mpin_status(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Fetches MPIN lockout status, attempt counts, and latest audit history for a retailer.
        Never exposes raw or hashed MPIN values.
        """
        retailer = await cls.get_retailer(db, retailer_id, tenant_id, company_id)

        # Check associated customer / security settings for fallback MPIN configuration check
        mpin_configured = bool(retailer.mpin_hash)
        if not mpin_configured:
            cust_stmt = select(CustomerModel).where(
                CustomerModel.public_id == retailer.public_id,
                CustomerModel.is_deleted == False,
            )
            cust = (await db.execute(cust_stmt)).scalars().first()
            if cust and cust.mpin_hash:
                mpin_configured = True
            else:
                user_sec_stmt = select(UserSecuritySettingsModel).where(
                    UserSecuritySettingsModel.user_id == retailer.public_id,
                    UserSecuritySettingsModel.is_deleted == False,
                )
                user_sec = (await db.execute(user_sec_stmt)).scalars().first()
                if user_sec and user_sec.security_pin_hash:
                    mpin_configured = True

        # Fetch recent audit logs
        audit_stmt = (
            select(RetailerMpinAuditModel)
            .where(RetailerMpinAuditModel.retailer_id == retailer.public_id)
            .order_by(desc(RetailerMpinAuditModel.created_at))
            .limit(10)
        )
        audit_res = await db.execute(audit_stmt)
        audit_logs = [
            {
                "public_id": str(log.public_id),
                "action": log.action,
                "failed_attempts": log.failed_attempts,
                "performed_by": log.performed_by or "SYSTEM",
                "reason": log.reason,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in audit_res.scalars().all()
        ]

        return {
            "retailer_id": str(retailer.public_id),
            "retailer_code": retailer.retailer_code,
            "store_name": retailer.store_name,
            "mpin_configured": mpin_configured,
            "mpin_locked": bool(retailer.mpin_locked),
            "mpin_failed_attempts": retailer.mpin_failed_attempts,
            "mpin_max_attempts": retailer.mpin_max_attempts or 5,
            "mpin_locked_at": retailer.mpin_locked_at.isoformat() if retailer.mpin_locked_at else None,
            "mpin_unlocked_at": retailer.mpin_unlocked_at.isoformat() if retailer.mpin_unlocked_at else None,
            "mpin_unlocked_by": retailer.mpin_unlocked_by,
            "audit_history": audit_logs,
        }

    @classmethod
    async def unlock_mpin(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        admin_user: Optional[AdminUserModel] = None,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Unlocks a retailer's MPIN account.
        - Resets failed attempts to 0.
        - Clears mpin_locked flag and locked_at timestamp.
        - Records mpin_unlocked_at and mpin_unlocked_by.
        - Preserves existing MPIN (does NOT reset or modify hash).
        - Fully idempotent.
        - Audits unlock event.
        """
        retailer = await cls.get_retailer(db, retailer_id, tenant_id, company_id)

        now = datetime.now(timezone.utc)
        admin_identifier = (
            admin_user.username
            if admin_user and getattr(admin_user, "username", None)
            else (admin_user.email if admin_user and getattr(admin_user, "email", None) else "ADMIN")
        )
        admin_uuid = admin_user.public_id if admin_user and getattr(admin_user, "public_id", None) else None

        # Reset retailer lockout state
        retailer.mpin_failed_attempts = 0
        retailer.mpin_locked = False
        retailer.mpin_locked_at = None
        retailer.mpin_unlocked_at = now
        retailer.mpin_unlocked_by = admin_identifier
        retailer.updated_date = now
        retailer.updated_by = admin_identifier

        # Sync associated Customer / UserSecuritySettings records if they exist
        cust_stmt = select(CustomerModel).where(
            CustomerModel.public_id == retailer.public_id,
            CustomerModel.is_deleted == False,
        )
        cust = (await db.execute(cust_stmt)).scalars().first()
        if cust:
            cust.is_locked = False
            cust.failed_attempts = 0

        user_sec_stmt = select(UserSecuritySettingsModel).where(
            UserSecuritySettingsModel.user_id == retailer.public_id,
            UserSecuritySettingsModel.is_deleted == False,
        )
        user_sec = (await db.execute(user_sec_stmt)).scalars().first()
        if user_sec:
            user_sec.failed_attempt_count = 0
            user_sec.locked_until = None

        # Record audit log
        audit_entry = RetailerMpinAuditModel(
            public_id=uuid.uuid4(),
            retailer_id=retailer.public_id,
            tenant_id=retailer.tenant_id,
            company_id=retailer.company_id,
            action="UNLOCKED",
            failed_attempts=0,
            performed_by=admin_identifier,
            admin_user_id=admin_uuid,
            reason=reason or "Administrative MPIN unlock",
            ip_address=ip_address or "127.0.0.1",
            created_at=now,
        )
        db.add(audit_entry)
        await db.commit()

        return {
            "success": True,
            "message": f"Retailer MPIN successfully unlocked for {retailer.retailer_code}.",
            "retailer_id": str(retailer.public_id),
            "retailer_code": retailer.retailer_code,
            "mpin_locked": False,
            "mpin_failed_attempts": 0,
            "mpin_unlocked_at": now.isoformat(),
            "mpin_unlocked_by": admin_identifier,
            "reason": reason or "Administrative MPIN unlock",
        }

    @classmethod
    async def lock_mpin(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        tenant_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        admin_user: Optional[AdminUserModel] = None,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Manually locks a retailer's MPIN account by Admin."""
        retailer = await cls.get_retailer(db, retailer_id, tenant_id, company_id)

        now = datetime.now(timezone.utc)
        admin_identifier = (
            admin_user.username
            if admin_user and getattr(admin_user, "username", None)
            else (admin_user.email if admin_user and getattr(admin_user, "email", None) else "ADMIN")
        )
        admin_uuid = admin_user.public_id if admin_user and getattr(admin_user, "public_id", None) else None

        retailer.mpin_locked = True
        retailer.mpin_locked_at = now
        retailer.updated_date = now
        retailer.updated_by = admin_identifier

        # Sync customer lock state if present
        cust_stmt = select(CustomerModel).where(
            CustomerModel.public_id == retailer.public_id,
            CustomerModel.is_deleted == False,
        )
        cust = (await db.execute(cust_stmt)).scalars().first()
        if cust:
            cust.is_locked = True

        # Record audit log
        audit_entry = RetailerMpinAuditModel(
            public_id=uuid.uuid4(),
            retailer_id=retailer.public_id,
            tenant_id=retailer.tenant_id,
            company_id=retailer.company_id,
            action="MANUAL_LOCKED",
            failed_attempts=retailer.mpin_failed_attempts,
            performed_by=admin_identifier,
            admin_user_id=admin_uuid,
            reason=reason or "Manual Administrative MPIN lockout",
            ip_address=ip_address or "127.0.0.1",
            created_at=now,
        )
        db.add(audit_entry)
        await db.commit()

        return {
            "success": True,
            "message": f"Retailer MPIN locked for {retailer.retailer_code}.",
            "retailer_id": str(retailer.public_id),
            "retailer_code": retailer.retailer_code,
            "mpin_locked": True,
            "mpin_locked_at": now.isoformat(),
            "reason": reason or "Manual Administrative MPIN lockout",
        }

    @classmethod
    async def verify_retailer_mpin(
        cls,
        db: AsyncSession,
        retailer_id: Union[uuid.UUID, str],
        mpin: str,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verifies retailer MPIN with strict attempt tracking, rate-limiting, and automatic account lockout.
        """
        if not mpin or not str(mpin).strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MPIN is required.",
            )

        clean_mpin = str(mpin).strip()
        retailer = await cls.get_retailer(db, retailer_id)

        # 1. Check if already locked
        if retailer.mpin_locked:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Retailer MPIN is locked due to too many failed attempts. Please contact Administrator to unlock.",
            )

        # 2. Check if MPIN is configured on retailer or fallback models
        hashed_input = _hash_mpin(clean_mpin, str(retailer.public_id))
        is_valid = False

        if retailer.mpin_hash:
            if retailer.mpin_hash == hashed_input or verify_password(clean_mpin, retailer.mpin_hash):
                is_valid = True
        else:
            # Check Customer model
            cust_stmt = select(CustomerModel).where(
                CustomerModel.public_id == retailer.public_id,
                CustomerModel.is_deleted == False,
            )
            cust = (await db.execute(cust_stmt)).scalars().first()
            if cust and cust.mpin_hash:
                if cust.mpin_hash == hashed_input or _hash_mpin(clean_mpin, str(cust.public_id)) == cust.mpin_hash or verify_password(clean_mpin, cust.mpin_hash):
                    is_valid = True
                    # Auto-sync hash to retailer model
                    retailer.mpin_hash = cust.mpin_hash
            else:
                # Check UserSecuritySettingsModel
                user_sec_stmt = select(UserSecuritySettingsModel).where(
                    UserSecuritySettingsModel.user_id == retailer.public_id,
                    UserSecuritySettingsModel.is_deleted == False,
                )
                user_sec = (await db.execute(user_sec_stmt)).scalars().first()
                if user_sec and user_sec.security_pin_hash:
                    if verify_password(clean_mpin, user_sec.security_pin_hash):
                        is_valid = True
                        retailer.mpin_hash = user_sec.security_pin_hash
                else:
                    # If not initialized, initialize with current MPIN
                    retailer.mpin_hash = hashed_input
                    retailer.mpin_failed_attempts = 0
                    retailer.mpin_locked = False
                    is_valid = True

        now = datetime.now(timezone.utc)

        # 3. Handle Invalid MPIN
        if not is_valid:
            retailer.mpin_failed_attempts += 1
            max_att = retailer.mpin_max_attempts or 5

            if retailer.mpin_failed_attempts >= max_att:
                retailer.mpin_locked = True
                retailer.mpin_locked_at = now

                audit_entry = RetailerMpinAuditModel(
                    public_id=uuid.uuid4(),
                    retailer_id=retailer.public_id,
                    tenant_id=retailer.tenant_id,
                    company_id=retailer.company_id,
                    action="LOCKED",
                    failed_attempts=retailer.mpin_failed_attempts,
                    performed_by="SYSTEM",
                    reason=f"Exceeded maximum {max_att} failed MPIN attempts.",
                    ip_address=ip_address or "127.0.0.1",
                    created_at=now,
                )
                db.add(audit_entry)
                await db.commit()

                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Maximum MPIN attempts ({max_att}) exceeded. Your MPIN is now locked. Please contact Administrator to unlock.",
                )
            else:
                remaining = max_att - retailer.mpin_failed_attempts

                audit_entry = RetailerMpinAuditModel(
                    public_id=uuid.uuid4(),
                    retailer_id=retailer.public_id,
                    tenant_id=retailer.tenant_id,
                    company_id=retailer.company_id,
                    action="FAILED_ATTEMPT",
                    failed_attempts=retailer.mpin_failed_attempts,
                    performed_by="SYSTEM",
                    reason=f"Incorrect MPIN attempt ({retailer.mpin_failed_attempts}/{max_att}).",
                    ip_address=ip_address or "127.0.0.1",
                    created_at=now,
                )
                db.add(audit_entry)
                await db.commit()

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Incorrect MPIN. {remaining} attempt(s) remaining before account lockout.",
                )

        # 4. Successful MPIN verification
        retailer.mpin_failed_attempts = 0
        await db.commit()

        return {
            "status": "SUCCESS",
            "message": "Retailer MPIN verified successfully.",
            "retailer_id": str(retailer.public_id),
            "mpin_verified": True,
        }
