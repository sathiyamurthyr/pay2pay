"""
Enterprise Admin PayIn Management Router.
Provides administrative endpoints for managing companies, vendors, mappings,
service catalogs, payment modes, card types, dynamic MDR, transactions,
callbacks, and audit trails.
"""

import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text, select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload
from app.infrastructure.db.payin_models import (
    PayinCompanyCfgModel, PayinVendorModel, PayinCompanyVendorModel,
    PayinServiceTypeModel, PayinPaymentModeModel, PayinCardTypeModel,
    PayinMdrCfgModel, PayinTransactionModel, PayinCallbackLogModel,
    PayinAuditLogModel
)
from app.application.payin_config_service import PayInConfigService

logger = logging.getLogger("admin_payin_router")

router = APIRouter(prefix="/admin/payin", tags=["Admin PayIn Management Suite"])


# --- DTOs for Admin operations ---
class ToggleStatusRequest(BaseModel):
    is_enabled: bool


class CreateMdrRuleRequest(BaseModel):
    company_ref_id: int
    payin_vendor_ref_id: int
    payin_service_type_ref_id: Optional[int] = None
    payin_payment_mode_ref_id: Optional[int] = None
    payin_card_type_ref_id: Optional[int] = None
    card_network: Optional[str] = None
    mdr_pct: float = Field(..., ge=0, le=1)  # e.g. 0.018 for 1.8%
    mdr_fixed: float = Field(0.0, ge=0)
    tax_pct: float = Field(0.18, ge=0)
    min_mdr: float = Field(0.0, ge=0)
    max_mdr: float = Field(5000.0, ge=0)
    mdr_treatment: str = Field("DEDUCT_FROM_TOPUP")
    priority: int = Field(100, ge=1)


class UpdateCompanyLimitsRequest(BaseModel):
    payin_enabled: Optional[bool] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    daily_txn_limit: Optional[int] = None
    daily_amt_limit: Optional[float] = None


@router.get("/dashboard")
async def get_payin_dashboard_metrics(
    company_ref_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Calculates high-level metrics for the Admin PayIn Dashboard."""
    filter_clause = "WHERE 1=1"
    params = {}
    if company_ref_id:
        filter_clause += " AND company_ref_id = :comp_ref"
        params["comp_ref"] = company_ref_id

    stmt = text(f"""
        SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN txn_status = 'SUCCESS' THEN txn_amount ELSE 0 END), 0) as total_volume,
            COALESCE(SUM(CASE WHEN txn_status = 'SUCCESS' THEN total_charges ELSE 0 END), 0) as total_mdr,
            COALESCE(SUM(CASE WHEN txn_status = 'SUCCESS' THEN company_mdr_liability ELSE 0 END), 0) as total_company_liability,
            COUNT(CASE WHEN txn_status = 'SUCCESS' THEN 1 END) as success_count,
            COUNT(CASE WHEN txn_status = 'PENDING' THEN 1 END) as pending_count,
            COUNT(CASE WHEN txn_status = 'FAILED' THEN 1 END) as failed_count
        FROM public.payin_transactions
        {filter_clause};
    """)
    res = await db.execute(stmt, params)
    row = res.mappings().first()

    return {
        "success": True,
        "metrics": {
            "total_transactions": int(row["total_count"] or 0),
            "total_volume": float(row["total_volume"] or 0.0),
            "total_mdr_collected": float(row["total_mdr"] or 0.0),
            "company_mdr_liability": float(row["total_company_liability"] or 0.0),
            "successful_transactions": int(row["success_count"] or 0),
            "pending_transactions": int(row["pending_count"] or 0),
            "failed_transactions": int(row["failed_count"] or 0)
        }
    }


@router.get("/companies")
async def list_company_configurations(db: AsyncSession = Depends(get_db)):
    """Lists company PayIn configurations joined with company details."""
    stmt = text("""
        SELECT 
            cfg.payin_company_cfg_ref_id,
            cfg.company_ref_id,
            c.company_name,
            c.company_code,
            cfg.payin_enabled,
            cfg.min_amount,
            cfg.max_amount,
            cfg.daily_txn_limit,
            cfg.daily_amt_limit,
            cfg.updated_at
        FROM public.payin_company_cfg cfg
        JOIN public.company c ON cfg.company_ref_id = c.company_ref_id
        ORDER BY cfg.company_ref_id ASC;
    """)
    res = await db.execute(stmt)
    return {"success": True, "companies": [dict(r) for r in res.mappings().all()]}


@router.post("/companies/{company_ref_id}/toggle")
async def toggle_company_payin(
    company_ref_id: int,
    req: ToggleStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    """Enables or disables PayIn for a company."""
    stmt = select(PayinCompanyCfgModel).where(PayinCompanyCfgModel.company_ref_id == company_ref_id)
    res = await db.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Company configuration not found")

    cfg.payin_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "company_ref_id": company_ref_id, "payin_enabled": cfg.payin_enabled}


@router.get("/vendors")
async def list_vendors(db: AsyncSession = Depends(get_db)):
    """Lists all configured payment vendors."""
    stmt = select(PayinVendorModel).order_by(PayinVendorModel.payin_vendor_ref_id.asc())
    res = await db.execute(stmt)
    vendors = res.scalars().all()
    return {
        "success": True,
        "vendors": [
            {
                "payin_vendor_ref_id": v.payin_vendor_ref_id,
                "vendor_code": v.vendor_code,
                "vendor_name": v.vendor_name,
                "provider_name": v.provider_name,
                "provider_type": v.provider_type,
                "api_base_url": v.api_base_url,
                "vendor_status": v.vendor_status,
                "timeout_sec": v.timeout_sec
            } for v in vendors
        ]
    }


@router.get("/company-vendors")
async def list_company_vendors(db: AsyncSession = Depends(get_db)):
    """Lists company to vendor mapping."""
    stmt = text("""
        SELECT 
            cv.payin_company_vendor_ref_id,
            cv.company_ref_id,
            c.company_name,
            v.vendor_code,
            v.vendor_name,
            cv.merchant_id,
            cv.vendor_priority,
            cv.is_default,
            cv.is_enabled
        FROM public.payin_company_vendors cv
        JOIN public.company c ON cv.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
        ORDER BY cv.company_ref_id ASC, cv.vendor_priority ASC;
    """)
    res = await db.execute(stmt)
    return {"success": True, "mappings": [dict(r) for r in res.mappings().all()]}


@router.get("/services")
async def list_service_types(db: AsyncSession = Depends(get_db)):
    """Lists all service types."""
    stmt = select(PayinServiceTypeModel).order_by(PayinServiceTypeModel.display_order.asc())
    res = await db.execute(stmt)
    services = res.scalars().all()
    return {
        "success": True,
        "services": [
            {
                "payin_service_type_ref_id": s.payin_service_type_ref_id,
                "svc_code": s.svc_code,
                "svc_name": s.svc_name,
                "svc_desc": s.svc_desc,
                "svc_icon": s.svc_icon,
                "display_order": s.display_order,
                "is_enabled": s.is_enabled
            } for s in services
        ]
    }


@router.post("/services/{svc_ref_id}/toggle")
async def toggle_service(svc_ref_id: int, req: ToggleStatusRequest, db: AsyncSession = Depends(get_db)):
    """Enables or disables a service type."""
    stmt = select(PayinServiceTypeModel).where(PayinServiceTypeModel.payin_service_type_ref_id == svc_ref_id)
    svc = (await db.execute(stmt)).scalars().first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service type not found")
    svc.is_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "payin_service_type_ref_id": svc_ref_id, "is_enabled": svc.is_enabled}


@router.get("/payment-modes")
async def list_payment_modes(db: AsyncSession = Depends(get_db)):
    """Lists all payment modes."""
    stmt = select(PayinPaymentModeModel).order_by(PayinPaymentModeModel.display_order.asc())
    modes = (await db.execute(stmt)).scalars().all()
    return {
        "success": True,
        "payment_modes": [
            {
                "payin_payment_mode_ref_id": m.payin_payment_mode_ref_id,
                "pay_mode_code": m.pay_mode_code,
                "pay_mode_name": m.pay_mode_name,
                "pay_mode_desc": m.pay_mode_desc,
                "pay_icon": m.pay_icon,
                "display_order": m.display_order,
                "is_enabled": m.is_enabled
            } for m in modes
        ]
    }


@router.post("/payment-modes/{mode_ref_id}/toggle")
async def toggle_payment_mode(mode_ref_id: int, req: ToggleStatusRequest, db: AsyncSession = Depends(get_db)):
    """Enables or disables a payment mode."""
    stmt = select(PayinPaymentModeModel).where(PayinPaymentModeModel.payin_payment_mode_ref_id == mode_ref_id)
    mode = (await db.execute(stmt)).scalars().first()
    if not mode:
        raise HTTPException(status_code=404, detail="Payment mode not found")
    mode.is_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "payin_payment_mode_ref_id": mode_ref_id, "is_enabled": mode.is_enabled}


@router.get("/card-types")
async def list_card_types(db: AsyncSession = Depends(get_db)):
    """Lists all card types."""
    stmt = select(PayinCardTypeModel).order_by(PayinCardTypeModel.card_type_code.asc())
    cards = (await db.execute(stmt)).scalars().all()
    return {
        "success": True,
        "card_types": [
            {
                "payin_card_type_ref_id": c.payin_card_type_ref_id,
                "card_type_code": c.card_type_code,
                "card_type_name": c.card_type_name,
                "card_network": c.card_network,
                "is_enabled": c.is_enabled
            } for c in cards
        ]
    }


@router.post("/card-types/{card_ref_id}/toggle")
async def toggle_card_type(card_ref_id: int, req: ToggleStatusRequest, db: AsyncSession = Depends(get_db)):
    """Enables or disables a card type."""
    stmt = select(PayinCardTypeModel).where(PayinCardTypeModel.payin_card_type_ref_id == card_ref_id)
    card = (await db.execute(stmt)).scalars().first()
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    card.is_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "payin_card_type_ref_id": card_ref_id, "is_enabled": card.is_enabled}


@router.get("/mdr")
async def list_mdr_rules(
    company_ref_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lists dynamic MDR rules."""
    stmt = text("""
        SELECT 
            m.payin_mdr_cfg_ref_id,
            m.company_ref_id,
            c.company_name,
            v.vendor_name,
            s.svc_name,
            p.pay_mode_name,
            ct.card_type_name,
            m.card_network,
            m.mdr_pct,
            m.mdr_fixed,
            m.tax_pct,
            m.min_mdr,
            m.max_mdr,
            m.mdr_treatment,
            m.priority,
            m.is_enabled
        FROM public.payin_mdr_cfg m
        JOIN public.company c ON m.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON m.payin_vendor_ref_id = v.payin_vendor_ref_id
        LEFT JOIN public.payin_service_types s ON m.payin_service_type_ref_id = s.payin_service_type_ref_id
        LEFT JOIN public.payin_payment_modes p ON m.payin_payment_mode_ref_id = p.payin_payment_mode_ref_id
        LEFT JOIN public.payin_card_types ct ON m.payin_card_type_ref_id = ct.payin_card_type_ref_id
        ORDER BY m.company_ref_id ASC, m.priority DESC;
    """)
    res = await db.execute(stmt)
    return {"success": True, "rules": [dict(r) for r in res.mappings().all()]}


@router.post("/mdr")
async def create_mdr_rule(req: CreateMdrRuleRequest, db: AsyncSession = Depends(get_db)):
    """Creates a new dynamic MDR rule."""
    rule = PayinMdrCfgModel(
        company_ref_id=req.company_ref_id,
        payin_vendor_ref_id=req.payin_vendor_ref_id,
        payin_service_type_ref_id=req.payin_service_type_ref_id,
        payin_payment_mode_ref_id=req.payin_payment_mode_ref_id,
        payin_card_type_ref_id=req.payin_card_type_ref_id,
        card_network=req.card_network,
        mdr_pct=req.mdr_pct,
        mdr_fixed=req.mdr_fixed,
        tax_pct=req.tax_pct,
        min_mdr=req.min_mdr,
        max_mdr=req.max_mdr,
        mdr_treatment=req.mdr_treatment,
        priority=req.priority,
        is_enabled=True
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"success": True, "payin_mdr_cfg_ref_id": rule.payin_mdr_cfg_ref_id}


@router.get("/transactions")
async def list_transactions(
    company_ref_id: Optional[int] = None,
    txn_status: Optional[str] = None,
    tid: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Lists PayIn transactions with filtering."""
    stmt = text("""
        SELECT 
            t.payin_transactions_ref_id,
            t.tid,
            t.company_ref_id,
            c.company_name,
            v.vendor_name,
            t.merchant_ref_id,
            t.provider_ref_id,
            s.svc_name,
            p.pay_mode_name,
            t.cust_name,
            t.cust_mobile,
            t.txn_amount,
            t.total_charges,
            t.customer_payable,
            t.retailer_credit,
            t.company_mdr_liability,
            t.mdr_treatment,
            t.txn_status,
            t.provider_status,
            t.ledger_txn_id,
            t.created_at
        FROM public.payin_transactions t
        JOIN public.company c ON t.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
        LEFT JOIN public.payin_service_types s ON t.svc_type_ref_id = s.payin_service_type_ref_id
        LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
        WHERE (:comp_ref IS NULL OR t.company_ref_id = :comp_ref)
          AND (:status IS NULL OR t.txn_status = :status)
          AND (:tid_query IS NULL OR t.tid ILIKE :tid_query)
        ORDER BY t.created_at DESC
        LIMIT :limit OFFSET :offset;
    """)
    res = await db.execute(stmt, {
        "comp_ref": company_ref_id,
        "status": txn_status.upper() if txn_status else None,
        "tid_query": f"%{tid}%" if tid else None,
        "limit": limit,
        "offset": offset
    })
    return {"success": True, "transactions": [dict(r) for r in res.mappings().all()]}


@router.get("/callbacks")
async def list_callback_logs(
    tid: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Lists incoming webhook callback logs."""
    stmt = select(PayinCallbackLogModel)
    if tid:
        stmt = stmt.where(PayinCallbackLogModel.tid == tid)
    stmt = stmt.order_by(PayinCallbackLogModel.received_at.desc()).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return {
        "success": True,
        "callback_logs": [
            {
                "payin_callback_log_ref_id": l.payin_callback_log_ref_id,
                "tid": l.tid,
                "company_ref_id": l.company_ref_id,
                "provider_ref_id": l.provider_ref_id,
                "callback_status": l.callback_status,
                "signature_valid": l.signature_valid,
                "process_status": l.process_status,
                "error_msg": l.error_msg,
                "received_at": l.received_at.isoformat() if l.received_at else None
            } for l in logs
        ]
    }

