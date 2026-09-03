"""
POS Payment Modes & Dynamic MDR API Router.

Endpoints:
- GET /api/v1/pos/payment-modes : Active POS payment modes list (POS - Instant, POS+T1, POS+T2)
- POST /api/v1/pos/calculate-mdr : Dynamic MDR calculation returning exact breakdown (mdr, gst, charges, received_amount, vendor commission)
- Admin MDR configuration CRUD:
    - GET /api/v1/pos/admin/mdr-configs
    - POST /api/v1/pos/admin/mdr-configs
    - PUT /api/v1/pos/admin/mdr-configs/{config_id}
    - DELETE /api/v1/pos/admin/mdr-configs/{config_id}
    - POST /api/v1/pos/admin/retailers/{retailer_id}/provision-defaults
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload, get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel, RetailerModel, RetailerContactModel
from app.infrastructure.db.pos_mdr_models import (
    PosPaymentModeConfigModel, PosMdrConfigurationModel
)
from app.application.pos_mdr_service import PosMdrService

router = APIRouter(prefix="/pos", tags=["POS Payment Modes & Dynamic MDR Engine"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class CalculateMdrRequest(BaseModel):
    payment_mode: str = Field(..., description="POS - Instant, POS+T1, or POS+T2")
    transaction_amount: float = Field(..., gt=0, description="Gross POS transaction amount")
    retailer_id: Optional[str] = Field(None, description="Retailer ID, code, or UUID")


class CalculateMdrResponse(BaseModel):
    payment_mode: str
    transaction_amount: float
    mdr: float
    gst: float
    charges: float
    received_amount: float
    mdr_config_id: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_commission_rate: Optional[float] = None
    vendor_commission_amount: Optional[float] = None
    pos_serial_number: Optional[str] = None
    pos_mobile_number: Optional[str] = None


class PosMdrConfigCreateRequest(BaseModel):
    payment_mode: str = Field(..., description="POS - Instant, POS+T1, or POS+T2")
    mdr: float = Field(..., ge=0, description="MDR rate (percentage or fixed amount)")
    mdr_type: Optional[str] = Field("PERCENTAGE", description="PERCENTAGE or FIXED")
    gst_rate: Optional[float] = Field(0.00, ge=0, description="GST rate percentage on MDR (default 0.00)")
    retailer_id: Optional[str] = Field(None, description="Retailer UUID or Code (leave empty for Default MDR)")
    effective_from: Optional[datetime] = Field(None, description="Effective from timestamp")
    effective_to: Optional[datetime] = Field(None, description="Effective to timestamp (optional)")
    remarks: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(True)


class PosMdrConfigUpdateRequest(BaseModel):
    id: Optional[str] = Field(None)
    config_id: Optional[str] = Field(None)
    mdr: Optional[float] = Field(None, ge=0)
    mdr_type: Optional[str] = Field(None)
    gst_rate: Optional[float] = Field(None, ge=0)
    effective_from: Optional[datetime] = Field(None)
    effective_to: Optional[datetime] = Field(None)
    remarks: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)


# ==============================================================================
# PUBLIC / RETAILER ENDPOINTS
# ==============================================================================

@router.get("/payment-modes")
async def get_payment_modes(db: AsyncSession = Depends(get_db)):
    """
    Returns active allowed POS payment modes ordered by priority/display_order.
    Allowed: POS - Instant, POS+T1 (excluding deactivated modes like POS+T2).
    """
    modes = await PosMdrService.get_active_payment_modes(db)
    return {"items": modes, "total": len(modes)}


@router.post("/calculate-mdr", response_model=CalculateMdrResponse)
async def calculate_mdr(
    req: CalculateMdrRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamic MDR, Vendor Commission, and Received Amount calculation.
    Priority: Retailer-Specific MDR -> Default MDR -> Error.
    """
    result = await PosMdrService.calculate_pos_topup_pricing(
        db=db,
        amount=req.transaction_amount,
        payment_mode=req.payment_mode,
        retailer_id=req.retailer_id
    )
    return CalculateMdrResponse(
        payment_mode=result["payment_mode"],
        transaction_amount=result["transaction_amount"],
        mdr=result["mdr"],
        gst=result["gst"],
        charges=result["charges"],
        received_amount=result["received_amount"],
        mdr_config_id=result.get("mdr_config_id"),
        vendor_id=result.get("vendor_id"),
        vendor_name=result.get("vendor_name"),
        vendor_commission_rate=result.get("vendor_commission_rate"),
        vendor_commission_amount=result.get("vendor_commission_amount"),
        pos_serial_number=result.get("pos_serial_number"),
        pos_mobile_number=result.get("pos_mobile_number"),
    )


# ==============================================================================
# ADMIN CONFIGURATION ENDPOINTS
# ==============================================================================

@router.get("/admin/mdr-configs")
async def list_admin_mdr_configs(
    payment_mode: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True, description="Filter by active status (defaults to True to only show active)"),
    scope: Optional[str] = Query(None, description="ALL, DEFAULT, or RETAILER"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists configured POS MDR rates (both retailer-specific and default rates).
    By default returns only active configurations (hiding deactivated modes like T+2).
    """
    stmt = select(PosMdrConfigurationModel).where(
        PosMdrConfigurationModel.is_deleted == False
    )
    if payment_mode:
        stmt = stmt.where(PosMdrConfigurationModel.payment_mode == payment_mode.strip())
    if is_active is not None:
        stmt = stmt.where(PosMdrConfigurationModel.is_active == is_active)
    if scope == "DEFAULT":
        stmt = stmt.where(PosMdrConfigurationModel.retailer_id == None)
    elif scope == "RETAILER":
        stmt = stmt.where(PosMdrConfigurationModel.retailer_id != None)

    if retailer_id:
        ret_uuid = await PosMdrService.resolve_retailer_uuid(db, retailer_id)
        if ret_uuid:
            stmt = stmt.where(PosMdrConfigurationModel.retailer_id == ret_uuid)

    stmt = stmt.order_by(
        PosMdrConfigurationModel.retailer_id.nulls_first(),
        PosMdrConfigurationModel.payment_mode.asc(),
        PosMdrConfigurationModel.effective_from.desc()
    )
    res = await db.execute(stmt)
    configs = res.scalars().all()

    # Enrich with retailer codes if available
    ret_ids = [c.retailer_id for c in configs if c.retailer_id]
    ret_map = {}
    if ret_ids:
        r_stmt = select(RetailerModel).where(RetailerModel.public_id.in_(ret_ids))
        r_res = await db.execute(r_stmt)
        for r in r_res.scalars().all():
            ret_map[r.public_id] = {
                "retailer_code": r.retailer_code,
                "name": r.store_name or r.owner_name or r.legal_name or r.retailer_code,
                "mobile": None
            }
        c_stmt = select(RetailerContactModel).where(RetailerContactModel.retailer_id.in_(ret_ids))
        c_res = await db.execute(c_stmt)
        for rc in c_res.scalars().all():
            if rc.retailer_id in ret_map and not ret_map[rc.retailer_id]["mobile"]:
                ret_map[rc.retailer_id]["mobile"] = rc.mobile

    items = []
    for c in configs:
        ret_info = ret_map.get(c.retailer_id) if c.retailer_id else None
        
        # Apply search filter across retailer name/code if search query provided
        if search:
            s_low = search.lower()
            code_match = ret_info and ret_info.get("retailer_code") and s_low in ret_info["retailer_code"].lower()
            name_match = ret_info and ret_info.get("name") and s_low in ret_info["name"].lower()
            mode_match = s_low in (c.payment_mode or "").lower()
            if not (code_match or name_match or mode_match):
                continue

        items.append({
            "id": str(c.public_id),
            "payment_mode": c.payment_mode,
            "mdr": float(c.mdr),
            "mdr_type": c.mdr_type,
            "gst_rate": float(c.gst_rate) if c.gst_rate is not None else 0.00,
            "is_default": c.retailer_id is None,
            "retailer_id": str(c.retailer_id) if c.retailer_id else None,
            "retailer_code": ret_info["retailer_code"] if ret_info else None,
            "retailer_name": ret_info["name"] if ret_info else None,
            "retailer_mobile": ret_info["mobile"] if ret_info else None,
            "effective_from": c.effective_from.isoformat() if c.effective_from else None,
            "effective_to": c.effective_to.isoformat() if c.effective_to else None,
            "is_active": c.is_active,
            "remarks": c.remarks,
            "created_date": c.created_date.isoformat() if c.created_date else None
        })

    return {"items": items, "total": len(items)}


@router.post("/admin/mdr-configs", status_code=status.HTTP_201_CREATED)
async def create_admin_mdr_config(
    req: PosMdrConfigCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new POS MDR configuration (Retailer-specific or Default).
    Validates MDR >= 0, GST >= 0, and prevents overlapping active date ranges.
    """
    if req.mdr < 0:
        raise HTTPException(status_code=400, detail="MDR cannot be negative.")
    if (req.gst_rate or 0) < 0:
        raise HTTPException(status_code=400, detail="GST rate cannot be negative.")

    ret_uuid = None
    if req.retailer_id:
        ret_uuid = await PosMdrService.resolve_retailer_uuid(db, req.retailer_id)
        if not ret_uuid:
            raise HTTPException(status_code=404, detail=f"Retailer '{req.retailer_id}' not found.")

    eff_from = req.effective_from or datetime.now(timezone.utc)
    eff_to = req.effective_to

    # Overlap validation if active
    if req.is_active:
        await PosMdrService.validate_no_overlap(
            db=db,
            payment_mode=req.payment_mode.strip(),
            retailer_id=ret_uuid,
            effective_from=eff_from,
            effective_to=eff_to
        )

    new_cfg = PosMdrConfigurationModel(
        public_id=uuid.uuid4(),
        retailer_id=ret_uuid,
        payment_mode=req.payment_mode.strip(),
        mdr=req.mdr,
        mdr_type=(req.mdr_type or "PERCENTAGE").upper(),
        gst_rate=req.gst_rate if req.gst_rate is not None else 0.00,
        effective_from=eff_from,
        effective_to=eff_to,
        is_active=req.is_active if req.is_active is not None else True,
        is_deleted=False,
        remarks=req.remarks,
        created_date=datetime.now(timezone.utc),
        updated_date=datetime.now(timezone.utc),
        created_by="ADMIN"
    )
    db.add(new_cfg)
    await db.commit()
    await db.refresh(new_cfg)

    return {
        "message": "POS MDR configuration created successfully.",
        "id": str(new_cfg.public_id),
        "payment_mode": new_cfg.payment_mode,
        "mdr": float(new_cfg.mdr),
        "mdr_type": new_cfg.mdr_type,
        "gst_rate": float(new_cfg.gst_rate),
        "is_default": new_cfg.retailer_id is None
    }


# ==============================================================================
# APPROVED RETAILERS API (SP BASED)
# ==============================================================================

@router.get("/approved-retailers")
@router.get("/admin/approved-retailers")
async def get_approved_retailers_list(
    search: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns only Approved and Active retailers loaded directly from the database
    via the Stored Procedure public.get_approved_retailers_list.
    """
    comp_uuid = None
    if company_id:
        try:
            comp_uuid = uuid.UUID(str(company_id).strip())
        except Exception:
            pass

    try:
        from sqlalchemy import text, func
        sp_query = text("""
            SELECT id, public_id, retailer_code, store_name, legal_name, owner_name,
                   business_category, registered_mobile, email, status, wallet_balance,
                   company_id, tenant_id, created_date
            FROM public.get_approved_retailers_list(:search, :comp_id)
        """)
        res = await db.execute(sp_query, {"search": search or None, "comp_id": comp_uuid})
        rows = res.fetchall()
        items = [
            {
                "id": r.id,
                "public_id": str(r.public_id),
                "retailer_code": r.retailer_code,
                "store_name": r.store_name,
                "legal_name": r.legal_name,
                "owner_name": r.owner_name,
                "business_category": r.business_category,
                "registered_mobile": r.registered_mobile,
                "email": r.email,
                "status": r.status,
                "wallet_balance": float(r.wallet_balance) if r.wallet_balance is not None else 0.0,
                "company_id": str(r.company_id) if r.company_id else None,
                "tenant_id": str(r.tenant_id) if r.tenant_id else None,
                "created_date": r.created_date.isoformat() if r.created_date else None
            }
            for r in rows
        ]
        return {"items": items, "total": len(items)}
    except Exception as sp_err:
        # Robust SQLAlchemy Fallback in case SP migration is pending
        stmt = (
            select(RetailerModel)
            .where(
                RetailerModel.is_deleted == False,
                RetailerModel.status.in_(["ACTIVE", "APPROVED"])
            )
            .order_by(RetailerModel.store_name.asc())
        )
        if comp_uuid:
            stmt = stmt.where(RetailerModel.company_id == comp_uuid)
        res = await db.execute(stmt)
        ret_list = res.scalars().all()
        ret_ids = [r.public_id for r in ret_list]

        c_map = {}
        if ret_ids:
            from app.infrastructure.db.models import RetailerContactModel
            c_res = await db.execute(
                select(RetailerContactModel).where(
                    RetailerContactModel.retailer_id.in_(ret_ids),
                    RetailerContactModel.is_deleted == False
                )
            )
            for c in c_res.scalars().all():
                if c.retailer_id not in c_map:
                    c_map[c.retailer_id] = c.mobile or ""

        items = []
        for r in ret_list:
            if search:
                s_low = search.lower()
                matched = (
                    s_low in (r.retailer_code or "").lower() or
                    s_low in (r.store_name or "").lower() or
                    s_low in (r.owner_name or "").lower() or
                    s_low in c_map.get(r.public_id, "").lower()
                )
                if not matched:
                    continue

            items.append({
                "id": r.id,
                "public_id": str(r.public_id),
                "retailer_code": r.retailer_code,
                "store_name": r.store_name,
                "legal_name": r.legal_name,
                "owner_name": r.owner_name,
                "business_category": r.business_category,
                "registered_mobile": c_map.get(r.public_id, ""),
                "status": r.status,
                "wallet_balance": 0.0,
                "company_id": str(r.company_id) if r.company_id else None,
                "tenant_id": str(r.tenant_id) if r.tenant_id else None,
                "created_date": r.created_date.isoformat() if r.created_date else None
            })
        return {"items": items, "total": len(items)}


# ==============================================================================
# MDR UPDATE / DELETE / PROVISION ENDPOINTS
# ==============================================================================

async def _perform_mdr_update(
    cfg: PosMdrConfigurationModel,
    req: PosMdrConfigUpdateRequest,
    db: AsyncSession
) -> Dict[str, Any]:
    if req.mdr is not None:
        if req.mdr < 0:
            raise HTTPException(status_code=400, detail="MDR cannot be negative.")
        cfg.mdr = req.mdr
    if req.mdr_type is not None:
        cfg.mdr_type = req.mdr_type.upper()
    if req.gst_rate is not None:
        if req.gst_rate < 0:
            raise HTTPException(status_code=400, detail="GST rate cannot be negative.")
        cfg.gst_rate = req.gst_rate
    if req.effective_from is not None:
        cfg.effective_from = req.effective_from
    if req.effective_to is not None:
        cfg.effective_to = req.effective_to
    if req.remarks is not None:
        cfg.remarks = req.remarks
    if req.is_active is not None:
        cfg.is_active = req.is_active

    cfg.updated_date = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cfg)

    return {
        "message": "POS MDR configuration updated successfully.",
        "id": str(cfg.public_id),
        "payment_mode": cfg.payment_mode,
        "mdr": float(cfg.mdr),
        "mdr_type": cfg.mdr_type,
        "gst_rate": float(cfg.gst_rate),
        "is_active": cfg.is_active
    }


@router.put("/admin/mdr-configs/{config_id}")
@router.patch("/admin/mdr-configs/{config_id}")
async def update_admin_mdr_config(
    config_id: str,
    req: PosMdrConfigUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates an existing POS MDR configuration rate, GST (0.0 allowed), effective dates, or active status.
    Accepts UUID or string/integer ID.
    """
    stmt = select(PosMdrConfigurationModel).where(
        PosMdrConfigurationModel.is_deleted == False
    )
    try:
        val_uuid = uuid.UUID(str(config_id).strip())
        stmt = stmt.where(PosMdrConfigurationModel.public_id == val_uuid)
    except Exception:
        if str(config_id).isdigit():
            stmt = stmt.where(PosMdrConfigurationModel.id == int(config_id))
        else:
            raise HTTPException(status_code=404, detail=f"Invalid MDR configuration ID '{config_id}'.")

    res = await db.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        raise HTTPException(status_code=404, detail="MDR configuration not found.")

    return await _perform_mdr_update(cfg, req, db)


@router.put("/admin/mdr-configs")
@router.patch("/admin/mdr-configs")
async def update_admin_mdr_config_no_path(
    req: PosMdrConfigUpdateRequest,
    id: Optional[str] = Query(None),
    config_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Fallback PUT/PATCH handler when ID is provided via query parameter or body payload.
    """
    target_id = id or config_id or getattr(req, "id", None) or getattr(req, "config_id", None)
    if not target_id:
        raise HTTPException(status_code=400, detail="MDR configuration ID must be provided in URL path, query params, or body.")
    return await update_admin_mdr_config(config_id=str(target_id), req=req, db=db)


@router.delete("/admin/mdr-configs/{config_id}")
async def delete_admin_mdr_config(
    config_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Soft-deletes / deactivates an MDR configuration.
    Historical transactions remain preserved.
    """
    stmt = select(PosMdrConfigurationModel).where(
        PosMdrConfigurationModel.is_deleted == False
    )
    try:
        val_uuid = uuid.UUID(str(config_id).strip())
        stmt = stmt.where(PosMdrConfigurationModel.public_id == val_uuid)
    except Exception:
        if str(config_id).isdigit():
            stmt = stmt.where(PosMdrConfigurationModel.id == int(config_id))
        else:
            raise HTTPException(status_code=404, detail=f"Invalid MDR configuration ID '{config_id}'.")

    res = await db.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        raise HTTPException(status_code=404, detail="MDR configuration not found.")

    cfg.is_deleted = True
    cfg.is_active = False
    cfg.updated_date = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "MDR configuration deactivated successfully."}


@router.post("/admin/retailers/{retailer_id}/provision-defaults")
async def provision_retailer_default_mdr(
    retailer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Provisions default POS MDR configurations (POS Instant 1.70%, POS+T1 1.60%, POS+T2 1.50%) for the specified retailer.
    """
    items = await PosMdrService.create_default_mdr_for_retailer(
        db=db,
        retailer_id=retailer_id,
        created_by="ADMIN"
    )
    await db.commit()
    return {
        "message": f"Successfully provisioned {len(items)} default MDR configurations for retailer.",
        "created_count": len(items)
    }


@router.post("/admin/provision-all-approved-defaults")
async def provision_all_approved_defaults(
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers DB procedure to provision default POS MDR configurations for all approved/active retailers.
    """
    try:
        from sqlalchemy import text
        res = await db.execute(text("SELECT * FROM public.provision_default_mdr_for_approved_retailers()"))
        count = res.scalar() or 0
        await db.commit()
        return {
            "message": f"Successfully provisioned {count} default MDR records for approved retailers.",
            "provisioned_count": count
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to provision default MDR: {str(e)}")
