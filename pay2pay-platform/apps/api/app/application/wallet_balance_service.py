"""
Enterprise Wallet Balance Adjustment Service.

Provides senior-architect-level orchestration for all wallet credit and debit transactions
exclusively through the PostgreSQL stored procedure: public.wallet_balance_update.

Guarantees:
- Zero direct updates to wallet tables.
- Atomic row-locking (FOR UPDATE) at the database engine level.
- Multi-component accounting (Principal Amount, Charges, GST) with strictly continuous running balances.
- Partition key generation and unified reporting ledger population.
- Full idempotency with duplicate transaction rejection.
"""

import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy import text, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.infrastructure.db.models import (
    RetailerModel, RetailerWalletModel, AdminUserModel,
    DistributorModel, SuperDistributorModel
)

logger = logging.getLogger("wallet_balance_service")


class WalletAdjustmentDTO(BaseModel):
    user_ref_id: Optional[int] = Field(None, description="Standardized User/Entity Ref ID (BIGINT)")
    user_type_ref_id: Optional[int] = Field(2, description="1=Admin, 2=Retailer, 3=Distributor, 4=Super Distributor")
    retailer_code: Optional[str] = Field(None, description="Retailer code (e.g. RET-10928, P2P-R404667)")
    user_id: Optional[str] = Field(None, description="User or Retailer UUID / public_id")
    retailer_id: Optional[str] = Field(None, description="Alias for user_id")
    
    entry_type: str = Field(..., description="CREDIT or DEBIT")
    amount: float = Field(..., gt=0, description="Total transaction amount (INR)")
    payout_amount: Optional[float] = Field(None, description="Principal amount (defaults to total - charge - gst)")
    charge_amount: Optional[float] = Field(0.0, description="Charge/Fee component")
    gst_amount: Optional[float] = Field(0.0, description="GST component")
    
    service_name: Optional[str] = Field("MANUAL_ADJUSTMENT", description="Service category: MANUAL_ADJUSTMENT, TOPUP, PAYOUT, COMMISSION, REFUND, CHARGES, PENALTY")
    wallet_type: Optional[str] = Field("MAIN", description="Wallet type: MAIN, COMMISSION, HOLD, SETTLEMENT")
    user_type: Optional[str] = Field("RETAILER", description="User role: RETAILER, DISTRIBUTOR, SUPER_DISTRIBUTOR")
    
    txn_id: Optional[str] = Field(None, description="Custom transaction ID. If omitted, generated automatically.")
    ref_id: Optional[str] = Field(None, description="External reference number or UTR")
    table_ref_id: Optional[str] = Field(None, description="UUID of source record (e.g. topup_request_id)")
    
    narration: Optional[str] = Field(None, description="Audit narration / remarks for line item")
    admin_notes: Optional[str] = Field(None, description="Internal admin remarks")
    actor_id: Optional[str] = Field(None, description="UUID of admin or actor performing adjustment")
    actor_name: Optional[str] = Field("Platform Admin", description="Name/email of actor")


class WalletAdjustmentResult(BaseModel):
    success: bool
    txn_id: str
    entry_type: str
    amount: float
    payout_amount: float
    charge_amount: float
    gst_amount: float
    balance_before: float
    balance_after: float
    status: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    service_name: str
    wallet_type: str
    user_ref_id: Optional[int]
    user_type_ref_id: Optional[int]
    user_code: Optional[str]
    user_name: Optional[str]
    narration: Optional[str]
    timestamp: str


class WalletBalanceAdjustmentService:
    """
    Authoritative service to execute wallet balance adjustments via public.wallet_balance_update Stored Procedure.
    """

    @classmethod
    async def get_realtime_wallet_balance(
        cls,
        db: AsyncSession,
        retailer_id: Any
    ) -> float:
        """Fetch authoritative live wallet balance for retailer from RetailerWalletModel."""
        r_uuid = None
        try:
            r_uuid = uuid.UUID(str(retailer_id))
        except Exception:
            stmt = select(RetailerModel).where(
                or_(
                    RetailerModel.retailer_code == str(retailer_id).strip(),
                    RetailerModel.mobile == str(retailer_id).strip()
                )
            )
            ret = (await db.execute(stmt)).scalars().first()
            r_uuid = ret.public_id if ret else None

        if not r_uuid:
            return 0.0

        wallet_stmt = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == r_uuid,
            RetailerWalletModel.is_deleted == False
        )
        wallet_res = await db.execute(wallet_stmt)
        wallet_obj = wallet_res.scalars().first()
        return float(wallet_obj.wallet_balance) if wallet_obj else 0.0

    @classmethod
    async def execute_wallet_balance_update(
        cls,
        db: AsyncSession,
        dto: WalletAdjustmentDTO,
        actor_user: Optional[AdminUserModel] = None
    ) -> WalletAdjustmentResult:
        """
        Resolves target user entity, prepares parameters, and invokes wallet_balance_update SP.
        """
        now_utc = datetime.now(timezone.utc)
        entry_type = dto.entry_type.strip().upper()
        if entry_type not in ("CREDIT", "DEBIT"):
            return WalletAdjustmentResult(
                success=False,
                txn_id=dto.txn_id or "UNKNOWN",
                entry_type=entry_type,
                amount=dto.amount,
                payout_amount=0.0,
                charge_amount=0.0,
                gst_amount=0.0,
                balance_before=0.0,
                balance_after=0.0,
                status="FAILED",
                error_code="INVALID_ENTRY_TYPE",
                error_message="Entry type must be CREDIT or DEBIT.",
                service_name=dto.service_name or "MANUAL_ADJUSTMENT",
                wallet_type=dto.wallet_type or "MAIN",
                user_ref_id=dto.user_ref_id,
                user_type_ref_id=dto.user_type_ref_id,
                user_code=dto.retailer_code,
                user_name=None,
                narration=dto.narration,
                timestamp=now_utc.isoformat()
            )

        # 1. Resolve Target User Entity
        retailer = await cls._resolve_retailer_entity(db, dto)
        if not retailer:
            return WalletAdjustmentResult(
                success=False,
                txn_id=dto.txn_id or "UNKNOWN",
                entry_type=entry_type,
                amount=dto.amount,
                payout_amount=0.0,
                charge_amount=0.0,
                gst_amount=0.0,
                balance_before=0.0,
                balance_after=0.0,
                status="FAILED",
                error_code="USER_NOT_FOUND",
                error_message=f"Target user entity could not be found with provided identifiers (user_ref_id={dto.user_ref_id}, code={dto.retailer_code}, id={dto.user_id or dto.retailer_id}).",
                service_name=dto.service_name or "MANUAL_ADJUSTMENT",
                wallet_type=dto.wallet_type or "MAIN",
                user_ref_id=dto.user_ref_id,
                user_type_ref_id=dto.user_type_ref_id,
                user_code=dto.retailer_code,
                user_name=None,
                narration=dto.narration,
                timestamp=now_utc.isoformat()
            )

        # 2. Resolve Hierarchy Details
        hierarchy = await cls._resolve_hierarchy(db, retailer)

        # 3. Generate or sanitize Txn ID
        now_date_str = now_utc.strftime("%Y%m%d")
        txn_id = (dto.txn_id or "").strip()
        if not txn_id:
            txn_id = f"TXN-{now_date_str}-{uuid.uuid4().hex[:6].upper()}"

        ref_id = dto.ref_id or txn_id

        # 4. Component Amount Calculation
        total_amt = round(float(dto.amount), 2)
        charge_amt = round(float(dto.charge_amount or 0.0), 2)
        gst_amt = round(float(dto.gst_amount or 0.0), 2)
        
        if dto.payout_amount is not None:
            payout_amt = round(float(dto.payout_amount), 2)
        else:
            payout_amt = round(total_amt - charge_amt - gst_amt, 2)

        # Ensure component sum matches total
        if round(payout_amt + charge_amt + gst_amt, 2) != total_amt:
            payout_amt = round(total_amt - charge_amt - gst_amt, 2)

        # 5. Actor & Context Resolution
        actor_uuid = None
        if actor_user:
            actor_uuid = actor_user.public_id
        elif dto.actor_id:
            try:
                actor_uuid = uuid.UUID(str(dto.actor_id))
            except Exception:
                pass

        table_ref_uuid = None
        if dto.table_ref_id:
            try:
                table_ref_uuid = uuid.UUID(str(dto.table_ref_id))
            except Exception:
                pass

        user_ref_id_val = getattr(retailer, "retailer_ref_id", None) or dto.user_ref_id or 24
        user_type_ref_id_val = dto.user_type_ref_id or 2
        tenant_ref_id_val = getattr(retailer, "tenant_ref_id", None) or 1
        company_ref_id_val = getattr(retailer, "company_ref_id", None) or 1
        retailer_code_val = getattr(retailer, "retailer_code", None) or dto.retailer_code or ""
        tenant_uuid = retailer.tenant_id
        company_uuid = retailer.company_id
        retailer_uuid = retailer.public_id

        retailer_display_name = (
            getattr(retailer, "store_name", None)
            or getattr(retailer, "owner_name", None)
            or getattr(retailer, "legal_name", None)
            or retailer_code_val
        )

        # 6. Execute Stored Procedure: public.wallet_balance_update
        sp_query = text("""
            SELECT success, txn_id, balance_before, balance_after, total_amount, status, error_code, error_message
            FROM public.wallet_balance_update(
                CAST(:p_tenant_id AS UUID),
                CAST(:p_company_id AS UUID),
                CAST(:p_retailer_id AS UUID),
                CAST(:p_txn_id AS VARCHAR),
                CAST(:p_ref_id AS VARCHAR),
                CAST(:p_table_ref_id AS UUID),
                CAST(:p_entry_type AS VARCHAR),
                CAST(:p_total_amount AS NUMERIC),
                CAST(:p_payout_amount AS NUMERIC),
                CAST(:p_charge_amount AS NUMERIC),
                CAST(:p_gst_amount AS NUMERIC),
                CAST(:p_service_name AS VARCHAR),
                CAST(:p_wallet_type AS VARCHAR),
                CAST(:p_user_type AS VARCHAR),
                CAST(:p_retailer_name AS VARCHAR),
                CAST(:p_dist_id AS UUID),
                CAST(:p_dist_name AS VARCHAR),
                CAST(:p_sd_id AS UUID),
                CAST(:p_sd_name AS VARCHAR),
                CAST(:p_rm_id AS UUID),
                CAST(:p_rm_name AS VARCHAR),
                CAST(:p_vendor_id AS UUID),
                CAST(:p_vendor_name AS VARCHAR),
                CAST(:p_created_by AS UUID),
                CAST(:p_user_ref_id AS BIGINT),
                CAST(:p_user_type_ref_id AS BIGINT),
                CAST(:p_tenant_ref_id AS BIGINT),
                CAST(:p_company_ref_id AS BIGINT),
                CAST(:p_narration AS VARCHAR)
            );
        """)

        params = {
            "p_tenant_id": tenant_uuid,
            "p_company_id": company_uuid,
            "p_retailer_id": retailer_uuid,
            "p_txn_id": txn_id,
            "p_ref_id": ref_id,
            "p_table_ref_id": table_ref_uuid,
            "p_entry_type": entry_type,
            "p_total_amount": total_amt,
            "p_payout_amount": payout_amt,
            "p_charge_amount": charge_amt,
            "p_gst_amount": gst_amt,
            "p_service_name": dto.service_name or "MANUAL_ADJUSTMENT",
            "p_wallet_type": dto.wallet_type or "MAIN",
            "p_user_type": dto.user_type or "RETAILER",
            "p_retailer_name": retailer_display_name,
            "p_dist_id": hierarchy.get("dist_id"),
            "p_dist_name": hierarchy.get("dist_name"),
            "p_sd_id": hierarchy.get("sd_id"),
            "p_sd_name": hierarchy.get("sd_name"),
            "p_rm_id": hierarchy.get("rm_id"),
            "p_rm_name": hierarchy.get("rm_name"),
            "p_vendor_id": None,
            "p_vendor_name": "Commercial Bank",
            "p_created_by": actor_uuid,
            "p_user_ref_id": user_ref_id_val,
            "p_user_type_ref_id": user_type_ref_id_val,
            "p_tenant_ref_id": tenant_ref_id_val,
            "p_company_ref_id": company_ref_id_val,
            "p_narration": dto.narration
        }

        try:
            sp_res = await db.execute(sp_query, params)
            row = sp_res.fetchone()

            if not row:
                raise RuntimeError("Stored procedure wallet_balance_update did not return any result.")

            sp_success = bool(row[0])
            sp_txn_id = str(row[1] or txn_id)
            sp_bal_before = float(row[2] or 0.0)
            sp_bal_after = float(row[3] or 0.0)
            sp_total = float(row[4] or total_amt)
            sp_status = str(row[5] or ("SUCCESS" if sp_success else "FAILED"))
            sp_err_code = str(row[6]) if row[6] else None
            sp_err_msg = str(row[7]) if row[7] else None

            if sp_success:
                await db.commit()
            else:
                await db.rollback()

            return WalletAdjustmentResult(
                success=sp_success,
                txn_id=sp_txn_id,
                entry_type=entry_type,
                amount=sp_total,
                payout_amount=payout_amt,
                charge_amount=charge_amt,
                gst_amount=gst_amt,
                balance_before=sp_bal_before,
                balance_after=sp_bal_after,
                status=sp_status,
                error_code=sp_err_code,
                error_message=sp_err_msg,
                service_name=dto.service_name or "MANUAL_ADJUSTMENT",
                wallet_type=dto.wallet_type or "MAIN",
                user_ref_id=user_ref_id_val,
                user_type_ref_id=user_type_ref_id_val,
                user_code=retailer_code_val,
                user_name=retailer_display_name,
                narration=dto.narration,
                timestamp=now_utc.isoformat()
            )

        except Exception as ex:
            await db.rollback()
            logger.exception("Database error while executing wallet_balance_update: %s", ex)
            return WalletAdjustmentResult(
                success=False,
                txn_id=txn_id,
                entry_type=entry_type,
                amount=total_amt,
                payout_amount=payout_amt,
                charge_amount=charge_amt,
                gst_amount=gst_amt,
                balance_before=0.0,
                balance_after=0.0,
                status="FAILED",
                error_code="DB_EXECUTION_ERROR",
                error_message=str(ex),
                service_name=dto.service_name or "MANUAL_ADJUSTMENT",
                wallet_type=dto.wallet_type or "MAIN",
                user_ref_id=user_ref_id_val,
                user_type_ref_id=user_type_ref_id_val,
                user_code=retailer_code_val,
                user_name=retailer_display_name,
                narration=dto.narration,
                timestamp=now_utc.isoformat()
            )

    @classmethod
    async def _resolve_retailer_entity(
        cls,
        db: AsyncSession,
        dto: WalletAdjustmentDTO
    ) -> Optional[RetailerModel]:
        """
        Resolves RetailerModel by user_ref_id, retailer_code, or UUID.
        """
        # 1. By user_ref_id / retailer_ref_id
        if dto.user_ref_id:
            try:
                ref_int = int(dto.user_ref_id)
                stmt = select(RetailerModel).where(
                    or_(
                        RetailerModel.retailer_ref_id == ref_int,
                        RetailerModel.id == ref_int
                    ),
                    RetailerModel.is_deleted == False
                ).order_by(RetailerModel.id.asc())
                res = await db.execute(stmt)
                ret = res.scalars().first()
                if ret:
                    return ret
            except (ValueError, TypeError):
                pass

        # 2. By retailer_code
        target_code = dto.retailer_code or dto.user_id or dto.retailer_id
        if target_code and not cls._is_uuid(target_code):
            stmt = select(RetailerModel).where(
                or_(
                    RetailerModel.retailer_code == str(target_code).strip(),
                    RetailerModel.retailer_code.ilike(str(target_code).strip())
                ),
                RetailerModel.is_deleted == False
            )
            res = await db.execute(stmt)
            ret = res.scalars().first()
            if ret:
                return ret

        # 3. By UUID public_id
        raw_uuid = dto.user_id or dto.retailer_id or dto.retailer_code
        if raw_uuid and cls._is_uuid(raw_uuid):
            try:
                u = uuid.UUID(str(raw_uuid))
                stmt = select(RetailerModel).where(
                    RetailerModel.public_id == u,
                    RetailerModel.is_deleted == False
                )
                res = await db.execute(stmt)
                ret = res.scalars().first()
                if ret:
                    return ret
            except Exception:
                pass

        return None

    @classmethod
    async def _resolve_hierarchy(
        cls,
        db: AsyncSession,
        retailer: RetailerModel
    ) -> Dict[str, Any]:
        """
        Resolves distributor, super distributor, and regional manager hierarchy.
        """
        hierarchy: Dict[str, Any] = {
            "dist_id": None,
            "dist_name": None,
            "sd_id": None,
            "sd_name": None,
            "rm_id": None,
            "rm_name": None
        }

        dist_pid = getattr(retailer, "mapped_distributor_id", None) or getattr(retailer, "distributor_id", None)
        if dist_pid:
            try:
                d_stmt = select(DistributorModel).where(
                    DistributorModel.public_id == dist_pid,
                    DistributorModel.is_deleted == False
                )
                d_res = await db.execute(d_stmt)
                dist = d_res.scalars().first()
                if dist:
                    hierarchy["dist_id"] = dist.public_id
                    hierarchy["dist_name"] = dist.company_name or dist.distributor_name or dist.distributor_code
                    sd_pid = getattr(dist, "mapped_super_distributor_id", None) or getattr(dist, "super_distributor_id", None)
                    if sd_pid:
                        sd_stmt = select(SuperDistributorModel).where(
                            SuperDistributorModel.public_id == sd_pid,
                            SuperDistributorModel.is_deleted == False
                        )
                        sd_res = await db.execute(sd_stmt)
                        sd = sd_res.scalars().first()
                        if sd:
                            hierarchy["sd_id"] = sd.public_id
                            hierarchy["sd_name"] = sd.company_name or sd.super_distributor_name or sd.super_distributor_code
            except Exception:
                pass

        return hierarchy

    @staticmethod
    def _is_uuid(val: Any) -> bool:
        if not val:
            return False
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, TypeError, AttributeError):
            return False
