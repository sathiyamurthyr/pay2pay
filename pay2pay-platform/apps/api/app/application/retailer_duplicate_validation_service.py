import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.infrastructure.db.models import (
    RetailerModel, RetailerContactModel, RetailerKycModel, RetailerBankModel,
    RetailerDuplicateAuditLogModel
)


class DuplicateRetailerException(HTTPException):
    """Structured HTTP 409 Conflict Exception for duplicate retailer fields."""
    def __init__(self, field: str, message: str):
        super().__init__(
            status_code=409,
            detail={
                "success": False,
                "code": "DUPLICATE_RETAILER",
                "field": field,
                "message": message
            }
        )


FIELD_ERROR_MESSAGES = {
    "mobile_number": "Mobile number already exists in this company.",
    "pan_number": "PAN already exists in this company.",
    "aadhaar_number": "Aadhaar already exists in this company.",
    "bank_account_number": "Bank account already exists in this company.",
    "gst_number": "GST already exists in this company.",
    "email_address": "Email already exists in this company.",
    "upi_id": "UPI ID already exists in this company."
}


class RetailerDuplicateValidationService:
    """Enterprise Multi-Tenant Scoped (tenant_id + company_id) Duplicate Validation Service."""

    @staticmethod
    def normalize_value(field: str, value: Optional[str]) -> Optional[str]:
        """Field-specific enterprise normalization."""
        if not value:
            return None
        clean = value.strip()
        if not clean:
            return None

        if field in ("mobile_number", "mobile"):
            digits = re.sub(r"\D", "", clean)
            return digits[-10:] if len(digits) >= 10 else digits
        elif field in ("pan_number", "pan"):
            return clean.upper()
        elif field in ("gst_number", "gst"):
            return clean.upper()
        elif field in ("aadhaar_number", "aadhaar"):
            return re.sub(r"\D", "", clean)
        elif field in ("email_address", "email"):
            return clean.lower()
        elif field == "upi_id":
            return clean.lower()
        elif field in ("bank_account_number", "account_number"):
            return clean
        return clean

    @staticmethod
    def mask_value(field: str, value: str) -> str:
        """Utility for audit log masking (never exposes plaintext PII)."""
        if not value:
            return "N/A"
        
        if field in ("mobile_number", "mobile"):
            if len(value) >= 10:
                return f"{value[:2]}****{value[-4:]}"
            return "*****"
        elif field in ("pan_number", "pan"):
            if len(value) == 10:
                return f"{value[:3]}**{value[-5:]}"
            return "PAN*****"
        elif field in ("aadhaar_number", "aadhaar"):
            if len(value) >= 4:
                return f"XXXX-XXXX-{value[-4:]}"
            return "XXXX-XXXX-XXXX"
        elif field in ("bank_account_number", "account_number"):
            if len(value) >= 4:
                return f"*****{value[-4:]}"
            return "*****"
        elif field in ("gst_number", "gst"):
            if len(value) >= 5:
                return f"{value[:5]}****{value[-3:]}"
            return "GST*****"
        elif field in ("email_address", "email"):
            parts = value.split("@")
            if len(parts) == 2 and len(parts[0]) > 1:
                return f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}"
            return "e***l@pay2pay.in"
        elif field == "upi_id":
            parts = value.split("@")
            if len(parts) == 2 and len(parts[0]) > 1:
                return f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}"
            return "u***i@bank"
        return "*****"

    @classmethod
    async def log_audit_attempt(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        field_name: str,
        value: str,
        user_id: Optional[uuid.UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        attempt_type: str = "CREATE",
        request_id: Optional[str] = None
    ) -> None:
        """Audit log recording of duplicate validation hits."""
        try:
            audit = RetailerDuplicateAuditLogModel(
                tenant_id=tenant_id,
                company_id=company_id,
                user_id=user_id,
                user_email=user_email,
                ip_address=ip_address,
                field_name=field_name,
                masked_value=cls.mask_value(field_name, value),
                attempt_type=attempt_type,
                request_id=request_id
            )
            db.add(audit)
            await db.flush()
        except Exception as e:
            print(f"[AUDIT LOG WARNING] Could not write duplicate audit record: {e}")

    @classmethod
    async def check_duplicate_field(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        field_name: str,
        raw_value: Optional[str],
        exclude_retailer_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        attempt_type: str = "CREATE",
        request_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates if raw_value exists within (tenant_id, company_id).
        Returns (is_duplicate: bool, error_message: str | None).
        """
        norm_val = cls.normalize_value(field_name, raw_value)
        if not norm_val:
            return False, None

        is_duplicate = False

        if field_name in ("mobile_number", "mobile"):
            stmt = select(RetailerContactModel.id).join(
                RetailerModel, RetailerContactModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerContactModel.tenant_id == tenant_id,
                RetailerContactModel.company_id == company_id,
                RetailerContactModel.mobile == norm_val,
                RetailerContactModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        elif field_name in ("email_address", "email"):
            stmt = select(RetailerContactModel.id).join(
                RetailerModel, RetailerContactModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerContactModel.tenant_id == tenant_id,
                RetailerContactModel.company_id == company_id,
                RetailerContactModel.email == norm_val,
                RetailerContactModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        elif field_name in ("pan_number", "pan"):
            stmt = select(RetailerKycModel.id).join(
                RetailerModel, RetailerKycModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerKycModel.tenant_id == tenant_id,
                RetailerKycModel.company_id == company_id,
                RetailerKycModel.pan_number == norm_val,
                RetailerKycModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        elif field_name in ("gst_number", "gst"):
            stmt = select(RetailerKycModel.id).join(
                RetailerModel, RetailerKycModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerKycModel.tenant_id == tenant_id,
                RetailerKycModel.company_id == company_id,
                RetailerKycModel.gst_number == norm_val,
                RetailerKycModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        elif field_name in ("aadhaar_number", "aadhaar"):
            stmt = select(RetailerKycModel.id).join(
                RetailerModel, RetailerKycModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerKycModel.tenant_id == tenant_id,
                RetailerKycModel.company_id == company_id,
                RetailerKycModel.aadhaar_number == norm_val,
                RetailerKycModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        elif field_name in ("bank_account_number", "account_number"):
            stmt = select(RetailerBankModel.id).join(
                RetailerModel, RetailerBankModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerBankModel.tenant_id == tenant_id,
                RetailerBankModel.company_id == company_id,
                RetailerBankModel.account_number == norm_val,
                RetailerBankModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        elif field_name == "upi_id":
            stmt = select(RetailerBankModel.id).join(
                RetailerModel, RetailerBankModel.retailer_id == RetailerModel.public_id
            ).where(
                RetailerBankModel.tenant_id == tenant_id,
                RetailerBankModel.company_id == company_id,
                RetailerBankModel.upi_id == norm_val,
                RetailerBankModel.is_deleted == False,
                RetailerModel.is_deleted == False
            )
            if exclude_retailer_id:
                stmt = stmt.where(RetailerModel.public_id != exclude_retailer_id)
            res = await db.execute(stmt)
            if res.scalar_one_or_none():
                is_duplicate = True

        if is_duplicate:
            await cls.log_audit_attempt(
                db, tenant_id, company_id, field_name, norm_val,
                user_id=user_id, user_email=user_email, ip_address=ip_address,
                attempt_type=attempt_type, request_id=request_id
            )
            msg = FIELD_ERROR_MESSAGES.get(field_name, f"{field_name} already exists in this company.")
            return True, msg

        return False, None

    @classmethod
    async def validate_all_retailer_fields(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        company_id: uuid.UUID,
        mobile_number: Optional[str] = None,
        pan_number: Optional[str] = None,
        aadhaar_number: Optional[str] = None,
        bank_account_number: Optional[str] = None,
        gst_number: Optional[str] = None,
        email_address: Optional[str] = None,
        upi_id: Optional[str] = None,
        exclude_retailer_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        attempt_type: str = "CREATE"
    ) -> None:
        """
        Validates all 7 fields in order of priority.
        Raises DuplicateRetailerException (HTTP 409) on the FIRST duplicate encountered.
        """
        fields = [
            ("mobile_number", mobile_number),
            ("pan_number", pan_number),
            ("aadhaar_number", aadhaar_number),
            ("bank_account_number", bank_account_number),
            ("gst_number", gst_number),
            ("email_address", email_address),
            ("upi_id", upi_id),
        ]

        for field_name, val in fields:
            if val:
                is_dup, err_msg = await cls.check_duplicate_field(
                    db, tenant_id, company_id, field_name, val,
                    exclude_retailer_id=exclude_retailer_id,
                    user_id=user_id, user_email=user_email, ip_address=ip_address,
                    attempt_type=attempt_type
                )
                if is_dup and err_msg:
                    raise DuplicateRetailerException(field=field_name, message=err_msg)
