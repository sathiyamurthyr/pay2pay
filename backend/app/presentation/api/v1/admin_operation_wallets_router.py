from __future__ import annotations

import json
import uuid
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, Body, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel, AdminServiceVendorWalletModel

router = APIRouter(prefix="/admin/operation-wallets", tags=["Admin Service & Vendor Operation Wallets"])


class AdminWalletTopupRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to add to the Admin Service/Vendor wallet")
    remarks: Optional[str] = Field(None, description="Notes/Remarks for this fund topup")


@router.get("")
async def get_admin_operation_wallets(
    service: Optional[str] = Query(None, description="Filter by service name or code (e.g. Payout)"),
    vendor: Optional[str] = Query(None, description="Filter by vendor name or code (e.g. Utkal)"),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the list of dynamic Admin Service + Vendor Operation Wallets (e.g., Payout + Utkal, Recharge + Utkal).
    Uses Stored Procedure public.sp_get_admin_service_vendor_wallets with fallback.
    """
    try:
        sp_query = text("""
            SELECT id, public_id, tenant_id, company_id, service_code, service_name,
                   vendor_code, vendor_name, wallet_number, available_balance, hold_balance,
                   currency, is_active, created_date, updated_date
            FROM public.sp_get_admin_service_vendor_wallets(:tenant_id, :service, :vendor);
        """)
        res = await db.execute(sp_query, {
            "tenant_id": tenant_id,
            "service": service or None,
            "vendor": vendor or None
        })
        rows = res.fetchall()
        items = [
            {
                "id": str(r.public_id),
                "public_id": str(r.public_id),
                "service_code": r.service_code,
                "service_name": r.service_name,
                "vendor_code": r.vendor_code,
                "vendor_name": r.vendor_name,
                "wallet_number": r.wallet_number,
                "available_balance": float(r.available_balance) if r.available_balance is not None else 0.0,
                "hold_balance": float(r.hold_balance) if r.hold_balance is not None else 0.0,
                "currency": r.currency,
                "is_active": r.is_active,
                "updated_date": r.updated_date.isoformat() if r.updated_date else None
            }
            for r in rows
        ]
        return {"success": True, "items": items, "total": len(items)}
    except Exception as sp_err:
        print(f"[OPERATION WALLETS ROUTER WARNING] SP error: {sp_err}. Falling back to ORM query.")

    # ORM Fallback
    stmt = select(AdminServiceVendorWalletModel).where(
        AdminServiceVendorWalletModel.is_deleted == False
    ).order_by(
        case(
            (
                (AdminServiceVendorWalletModel.service_code.ilike("%PAYOUT%")) &
                (AdminServiceVendorWalletModel.vendor_code.ilike("%URBAN%")),
                1
            ),
            (AdminServiceVendorWalletModel.service_code.ilike("%PAYOUT%"), 2),
            else_=3
        ).asc(),
        AdminServiceVendorWalletModel.service_code.asc(),
        AdminServiceVendorWalletModel.id.asc()
    )

    if service:
        stmt = stmt.where(
            (AdminServiceVendorWalletModel.service_code.ilike(f"%{service}%")) |
            (AdminServiceVendorWalletModel.service_name.ilike(f"%{service}%"))
        )
    if vendor:
        stmt = stmt.where(
            (AdminServiceVendorWalletModel.vendor_code.ilike(f"%{vendor}%")) |
            (AdminServiceVendorWalletModel.vendor_name.ilike(f"%{vendor}%"))
        )

    res = await db.execute(stmt)
    records = res.scalars().all()

    items = [
        {
            "id": str(r.public_id),
            "public_id": str(r.public_id),
            "service_code": r.service_code,
            "service_name": r.service_name,
            "vendor_code": r.vendor_code,
            "vendor_name": r.vendor_name,
            "wallet_number": r.wallet_number,
            "available_balance": float(r.available_balance),
            "hold_balance": float(r.hold_balance),
            "currency": r.currency,
            "is_active": r.is_active,
            "updated_date": r.updated_date.isoformat() if r.updated_date else None
        }
        for r in records
    ]
    return {"success": True, "items": items, "total": len(items)}


@router.get("/{wallet_id}")
async def get_admin_operation_wallet_detail(
    wallet_id: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns single Admin Service + Vendor Operation Wallet detail.
    """
    try:
        w_uuid = uuid.UUID(str(wallet_id).strip())
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid wallet ID format: '{wallet_id}'")

    stmt = select(AdminServiceVendorWalletModel).where(
        AdminServiceVendorWalletModel.public_id == w_uuid,
        AdminServiceVendorWalletModel.is_deleted == False
    )
    res = await db.execute(stmt)
    w = res.scalars().first()
    if not w:
        raise HTTPException(status_code=404, detail="Admin operation wallet not found.")

    return {
        "success": True,
        "wallet": {
            "id": str(w.public_id),
            "public_id": str(w.public_id),
            "service_code": w.service_code,
            "service_name": w.service_name,
            "vendor_code": w.vendor_code,
            "vendor_name": w.vendor_name,
            "wallet_number": w.wallet_number,
            "available_balance": float(w.available_balance),
            "hold_balance": float(w.hold_balance),
            "currency": w.currency,
            "is_active": w.is_active,
            "updated_date": w.updated_date.isoformat() if w.updated_date else None
        }
    }


@router.put("/{wallet_id}/topup")
@router.post("/{wallet_id}/topup")
async def topup_admin_operation_wallet(
    wallet_id: str,
    req: AdminWalletTopupRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Adds fund balance to an Admin Service + Vendor Operation Wallet.
    Uses Stored Procedure public.sp_topup_admin_service_vendor_wallet.
    """
    try:
        w_uuid = uuid.UUID(str(wallet_id).strip())
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid wallet ID format: '{wallet_id}'")

    admin_email = getattr(current_user, "email", "admin@pay2pay.in") or "admin@pay2pay.in"

    try:
        sp_query = text("SELECT public.sp_topup_admin_service_vendor_wallet(:wallet_id, :amount, :email, :remarks);")
        sp_res = await db.execute(sp_query, {
            "wallet_id": w_uuid,
            "amount": req.amount,
            "email": admin_email,
            "remarks": req.remarks or f"Manual fund added by {admin_email}"
        })
        raw = sp_res.scalar()
        if raw is not None:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            await db.commit()
            return parsed
    except Exception as sp_err:
        await db.rollback()
        # ORM Fallback
        stmt = select(AdminServiceVendorWalletModel).where(
            AdminServiceVendorWalletModel.public_id == w_uuid,
            AdminServiceVendorWalletModel.is_deleted == False
        ).with_for_update()
        res = await db.execute(stmt)
        w = res.scalars().first()
        if not w:
            raise HTTPException(status_code=404, detail="Admin operation wallet not found.")

        bal_before = float(w.available_balance)
        w.available_balance = bal_before + float(req.amount)
        w.updated_by = admin_email
        await db.commit()

        return {
            "success": True,
            "wallet_id": str(w.public_id),
            "service_code": w.service_code,
            "service_name": w.service_name,
            "vendor_code": w.vendor_code,
            "vendor_name": w.vendor_name,
            "added_amount": req.amount,
            "balance_before": bal_before,
            "balance_after": float(w.available_balance),
            "updated_by": admin_email
        }
