"""
Enterprise Bank Master Service
Provides high-performance caching and fuzzy resolution for Indian Banking Directory,
resolving IFSC prefixes, Utkal Digital Bank Codes, and NPCI Bank Identifiers.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text

from app.infrastructure.db.bank_master_models import BankMasterModel


class BankMasterService:
    """Service to query, resolve, and sync Bank Master directory."""

    @classmethod
    async def resolve_bank_details(
        cls,
        db: AsyncSession,
        ifsc_code: Optional[str] = None,
        bank_name: Optional[str] = None,
        bank_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Resolves the exact Bank Code, Standard Bank Name, and IFSC details
        for vendor payout dispatches (Utkal Digital, WowPe, BulkPe).
        """
        clean_ifsc = str(ifsc_code or "").strip().upper()
        clean_prefix = clean_ifsc[:4] if len(clean_ifsc) >= 4 else ""
        clean_name = str(bank_name or "").strip()

        # 1. Search by exact IFSC Prefix
        if clean_prefix:
            stmt = select(BankMasterModel).where(
                BankMasterModel.ifsc_prefix == clean_prefix,
                BankMasterModel.is_active == True
            ).order_by(BankMasterModel.id.asc())
            bank = (await db.execute(stmt)).scalars().first()
            if bank:
                return {
                    "bank_id": bank.bank_id or bank.bank_ifsc_ref_id or bank.id,
                    "bank_code": bank.short_code or bank.ifsc_prefix,
                    "bank_name": bank.bank_name,
                    "ifsc_code": clean_ifsc if len(clean_ifsc) == 11 else bank.ifsc,
                    "ifsc_prefix": bank.ifsc_prefix,
                    "imps_status": bank.imps_status or "ACTIVE",
                    "found": True
                }

        # 2. Search by Bank ID
        if bank_id:
            stmt = select(BankMasterModel).where(
                or_(
                    BankMasterModel.bank_id == bank_id,
                    BankMasterModel.bank_ifsc_ref_id == bank_id,
                    BankMasterModel.id == bank_id
                )
            )
            bank = (await db.execute(stmt)).scalars().first()
            if bank:
                return {
                    "bank_id": bank.bank_id or bank.bank_ifsc_ref_id or bank.id,
                    "bank_code": bank.short_code or bank.ifsc_prefix,
                    "bank_name": bank.bank_name,
                    "ifsc_code": clean_ifsc or bank.ifsc,
                    "ifsc_prefix": bank.ifsc_prefix,
                    "imps_status": bank.imps_status or "ACTIVE",
                    "found": True
                }

        # 3. Search by Bank Name (fuzzy / ILIKE)
        if clean_name:
            stmt = select(BankMasterModel).where(
                or_(
                    BankMasterModel.bank_name.ilike(f"%{clean_name}%"),
                    BankMasterModel.short_code.ilike(f"%{clean_name}%")
                ),
                BankMasterModel.is_active == True
            ).order_by(BankMasterModel.id.asc())
            bank = (await db.execute(stmt)).scalars().first()
            if bank:
                return {
                    "bank_id": bank.bank_id or bank.bank_ifsc_ref_id or bank.id,
                    "bank_code": bank.short_code or bank.ifsc_prefix,
                    "bank_name": bank.bank_name,
                    "ifsc_code": clean_ifsc or bank.ifsc,
                    "ifsc_prefix": bank.ifsc_prefix,
                    "imps_status": bank.imps_status or "ACTIVE",
                    "found": True
                }

        # 4. Fallback defaults if no match found in database
        fallback_code = clean_prefix or "BANK"
        return {
            "bank_id": 1,
            "bank_code": fallback_code,
            "bank_name": clean_name or "Commercial Bank",
            "ifsc_code": clean_ifsc or "SBIN0000001",
            "ifsc_prefix": clean_prefix or "SBIN",
            "imps_status": "ACTIVE",
            "found": False
        }

    @classmethod
    async def get_bank_list(
        cls,
        db: AsyncSession,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Fetch list of active banks with pagination and search."""
        query = select(BankMasterModel).where(BankMasterModel.is_active == True)
        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.where(
                or_(
                    BankMasterModel.bank_name.ilike(s),
                    BankMasterModel.short_code.ilike(s),
                    BankMasterModel.ifsc_prefix.ilike(s)
                )
            )
        query = query.order_by(BankMasterModel.bank_name.asc()).offset(offset).limit(limit)
        results = (await db.execute(query)).scalars().all()
        
        return [
            {
                "bank_id": b.bank_id or b.bank_ifsc_ref_id or b.id,
                "bank_name": b.bank_name,
                "bank_code": b.short_code or b.ifsc_prefix,
                "ifsc": b.ifsc,
                "ifsc_prefix": b.ifsc_prefix,
                "imps_status": b.imps_status or "ACTIVE",
                "neft_status": b.neft_status or "ACTIVE"
            }
            for b in results
        ]
