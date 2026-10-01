"""
Enterprise Wallet Balance Adjustment & Stored Procedure Router.

Unified senior-architect-level API for all wallet credit, debit, topup, commission,
and adjustment transactions across all applications (Admin, Retailer, Distributor, Super Distributor).

All state modifications strictly and exclusively execute via the PostgreSQL Stored Procedure:
public.wallet_balance_update
"""

import uuid
import asyncio
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import security_scheme, get_current_token_payload, get_current_user
from app.application.wallet_balance_service import (
    WalletBalanceAdjustmentService, WalletAdjustmentDTO, WalletAdjustmentResult
)
from app.infrastructure.db.models import AdminUserModel, RetailerModel, RetailerWalletModel
from app.infrastructure.db.transaction_engine_models import CentralTransactionModel

logger = logging.getLogger("wallet_adjustment_router")

router = APIRouter(prefix="", tags=["Enterprise Wallet Balance Adjustment Engine"])


# ==============================================================================
# UNIFIED CREDIT / DEBIT ADJUSTMENT ENDPOINTS
# ==============================================================================

@router.post(
    "/wallet/adjust",
    response_model=WalletAdjustmentResult,
    summary="Execute Wallet Balance Adjustment (Credit/Debit via Stored Procedure)"
)
@router.post(
    "/wallet/balance-update",
    response_model=WalletAdjustmentResult,
    summary="Canonical Wallet Balance Update via SP wallet_balance_update"
)
@router.post(
    "/admin/wallet/adjust",
    response_model=WalletAdjustmentResult,
    summary="Admin Wallet Balance Adjustment"
)
async def adjust_wallet_balance_endpoint(
    req: WalletAdjustmentDTO,
    request: Request,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes an atomic wallet balance adjustment (CREDIT or DEBIT) using
    PostgreSQL Stored Procedure `public.wallet_balance_update`.

    - Strictly enforced server-side authentication & administrative authorization.
    - Locks the wallet row with FOR UPDATE.
    - Prevents race conditions and dirty balance reads.
    - Emits granular double-entry transaction lines with continuous running balances.
    - Guarantees 100% database ledger auditability.
    """
    admin_type = (getattr(current_admin, "user_type", "") or "").upper()
    is_admin = admin_type in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN")
    if not is_admin:
        # Check explicit role assignment
        has_admin_role = any(
            (ur.role and ur.role.code in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN"))
            for ur in (getattr(current_admin, "user_roles", []) or [])
        )
        if not has_admin_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Administrative privileges required to execute wallet adjustments."
            )

    result = await WalletBalanceAdjustmentService.execute_wallet_balance_update(
        db=db,
        dto=req
    )

    if not result.success:
        err_code = result.error_code or "ADJUSTMENT_FAILED"
        err_msg = result.error_message or "Failed to execute wallet adjustment."

        if err_code in ("INSUFFICIENT_BALANCE", "INSUFFICIENT_FUNDS"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction Rejected: {err_msg} (Available: ₹{result.balance_before:,.2f}, Required: ₹{result.amount:,.2f})"
            )
        elif err_code in ("USER_NOT_FOUND", "WALLET_NOT_FOUND"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entity Error: {err_msg}"
            )
        elif err_code in ("DUPLICATE_TRANSACTION", "ALREADY_EXISTS"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate Transaction: {err_msg}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Adjustment Error [{err_code}]: {err_msg}"
            )

    # Dispatch centralized in-app notification (fire-and-forget)
    async def _emit_wallet_notif():
        try:
            from app.core.database import AsyncSessionLocal
            from app.application.notification_event_service import (
                notification_event_service, wallet_notification_event
            )
            from app.infrastructure.db.models import RetailerModel
            async with AsyncSessionLocal() as notif_db:
                u_uuid = None
                t_uuid = None
                c_uuid = None
                try:
                    u_uuid = uuid.UUID(str(req.user_ref_id))
                except Exception:
                    pass
                if not u_uuid:
                    stmt = select(RetailerModel).where(
                        or_(
                            RetailerModel.retailer_code == str(req.user_ref_id),
                            RetailerModel.public_id == getattr(result, "wallet_id", None)
                        )
                    ).limit(1)
                    res = await notif_db.execute(stmt)
                    ret = res.scalar_one_or_none()
                    if ret:
                        u_uuid = ret.public_id
                        t_uuid = ret.tenant_id
                        c_uuid = getattr(ret, "company_id", None)
                if u_uuid:
                    ev = wallet_notification_event(
                        user_id=u_uuid,
                        tenant_id=t_uuid or uuid.UUID("00000000-0000-0000-0000-000000000000"),
                        company_id=c_uuid,
                        entry_type=req.adjustment_type,
                        amount=float(result.amount or req.amount),
                        balance_after=float(result.balance_after) if result.balance_after is not None else None,
                        reference_number=result.transaction_reference or req.transaction_reference,
                        narration=req.narration,
                        usertype_ref_id=req.usertype_ref_id,
                        user_ref_id=str(req.user_ref_id),
                    )
                    await notification_event_service.emit_safe(notif_db, ev)
        except Exception as e:
            logger.warning(f"[WalletNotif] Non-critical notification error: {e}")

    asyncio.create_task(_emit_wallet_notif())

    return result


# ==============================================================================
# FAST LIVE BALANCE LOOKUP
# ==============================================================================

@router.get(
    "/wallet/balance",
    summary="Get Real-Time Live Wallet Balance"
)
async def get_wallet_balance_endpoint(
    user_ref_id: Optional[int] = Query(None, description="User Ref ID (BIGINT)"),
    retailer_code: Optional[str] = Query(None, description="Retailer Code"),
    user_id: Optional[str] = Query(None, description="User / Retailer UUID"),
    retailer_id: Optional[str] = Query(None, description="Retailer UUID or Code"),
    request: Request = None,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real-time authoritative wallet balance from PostgreSQL.
    Enforces that non-admin callers can ONLY view their own wallet balance.
    """
    user_type = (getattr(current_user, "user_type", "") or "").upper()
    is_admin = user_type in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN")

    if not is_admin:
        # Enforce zero-trust identity: non-admins can strictly only query their own wallet
        requested_target = retailer_id or user_id or retailer_code
        if requested_target and str(requested_target) != str(current_user.public_id) and str(requested_target) != str(current_user.username):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Retailers cannot access external wallet balances."
            )
        retailer_code = current_user.username
        user_id = str(current_user.public_id)
        retailer_id = str(current_user.public_id)
        user_ref_id = None

    target_id = retailer_id or user_id
    dto = WalletAdjustmentDTO(
        user_ref_id=user_ref_id,
        retailer_code=retailer_code,
        user_id=target_id,
        retailer_id=target_id,
        entry_type="CREDIT",
        amount=1.0
    )
    retailer = await WalletBalanceAdjustmentService._resolve_retailer_entity(db, dto)
    if not retailer and request:
        try:
            from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
            ctx = await resolve_retailer_context(request, retailer_id=target_id, db=db)
            if ctx.get("public_id"):
                r_stmt = select(RetailerModel).where(RetailerModel.public_id == ctx.get("public_id"))
                retailer = (await db.execute(r_stmt)).scalars().first()
        except Exception:
            pass

    if not retailer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated retailer session required. Please log in."
        )

    wal_stmt = select(RetailerWalletModel).where(
        RetailerWalletModel.retailer_id == retailer.public_id,
        RetailerWalletModel.is_deleted == False
    )
    wal_res = await db.execute(wal_stmt)
    wallet = wal_res.scalars().first()

    balance = float(wallet.wallet_balance) if wallet else 0.0
    is_frozen = wallet.is_frozen if wallet else False

    ret_name = (
        getattr(retailer, "store_name", None)
        or getattr(retailer, "owner_name", None)
        or getattr(retailer, "legal_name", None)
        or retailer.retailer_code
    )

    return {
        "success": True,
        "user_ref_id": getattr(retailer, "retailer_ref_id", None) or getattr(retailer, "user_ref_id", None) or getattr(retailer, "id", None) or user_ref_id,
        "user_type_ref_id": 2,
        "retailer_code": retailer.retailer_code,
        "retailer_id": str(retailer.public_id),
        "retailer_name": ret_name,
        "wallet_id": str(wallet.public_id) if wallet else None,
        "wallet_balance": balance,
        "available_balance": balance,
        "balance": balance,
        "mainBalance": balance,
        "formatted_balance": f"₹{balance:,.2f}",
        "is_frozen": is_frozen,
        "status": "ACTIVE" if not is_frozen else "FROZEN"
    }


# ==============================================================================
# RECENT WALLET TRANSACTIONS LEDGER
# ==============================================================================

@router.get(
    "/wallet/transactions",
    summary="Get Recent Wallet Transactions & Line Entries"
)
async def get_wallet_transactions_endpoint(
    user_ref_id: Optional[int] = Query(None),
    retailer_code: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns recent granular line entries recorded by wallet_balance_update.
    Enforces that non-admin callers can only view their own transactions.
    """
    user_type = (getattr(current_user, "user_type", "") or "").upper()
    is_admin = user_type in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN")

    conds = [CentralTransactionModel.is_deleted == False]
    
    if not is_admin:
        # Non-admin users are strictly scoped to their own transactions
        conds.append(
            or_(
                CentralTransactionModel.retailer_id == current_user.public_id,
                CentralTransactionModel.user_ref_id == getattr(current_user, "user_ref_id", -1)
            )
        )
    else:
        if user_ref_id:
            conds.append(CentralTransactionModel.user_ref_id == user_ref_id)

    if service_name:
        conds.append(CentralTransactionModel.service_name.ilike(f"%{service_name}%"))

    stmt = select(CentralTransactionModel).where(
        *conds
    ).order_by(desc(CentralTransactionModel.created_at)).limit(limit)

    res = await db.execute(stmt)
    txns = res.scalars().all()

    items = []
    for t in txns:
        items.append({
            "id": str(t.public_id),
            "txn_id": t.txn_id,
            "ref_id": t.ref_id,
            "user_ref_id": t.user_ref_id,
            "user_type_ref_id": t.user_type_ref_id,
            "retailer_id": str(t.retailer_id) if t.retailer_id else None,
            "service_name": t.service_name,
            "wallet_type": t.wallet_type,
            "entry_type": t.entry_type,
            "amount": float(t.amount or 0.0),
            "balance_before": float(t.balance_before or 0.0),
            "balance_after": float(t.balance_after or 0.0),
            "status": t.status,
            "narration": t.narration,
            "created_at": t.created_at.isoformat() if t.created_at else None
        })

    return {
        "success": True,
        "total": len(items),
        "items": items
    }
