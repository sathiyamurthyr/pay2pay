"""
POS Payment Modes & Dynamic MDR API Router.

Endpoints:
- GET /api/v1/pos/payment-modes : Active POS payment modes list (POS - Instant, POS+T1, POS+T2)
- POST /api/v1/pos/calculate-mdr : Dynamic MDR calculation returning exact breakdown (mdr, gst, charges, received_amount)
- Admin MDR configuration CRUD:
    - GET /api/v1/pos/admin/mdr-configs
    - POST /api/v1/pos/admin/mdr-configs
    - PUT /api/v1/pos/admin/mdr-configs/{config_id}
    - DELETE /api/v1/pos/admin/mdr-configs/{config_id}
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload, get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel, RetailerModel
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


class PosMdrConfigCreateRequest(BaseModel):
    payment_mode: str = Field(..., description="POS - Instant, POS+T1, or POS+T2")
    mdr: float = Field(..., ge=0, description="MDR rate (percentage or fixed amount)")
    mdr_type: Optional[str] = Field("PERCENTAGE", description="PERCENTAGE or FIXED")
    gst_rate: Optional[float] = Field(18.00, ge=0, description="GST rate percentage on MDR")
    retailer_id: Optional[str] = Field(None, description="Retailer UUID or Code (leave empty for Default MDR)")
    effective_from: Optional[datetime] = Field(None, description="Effective from timestamp")
    effective_to: Optional[datetime] = Field(None, description="Effective to timestamp (optional)")
    remarks: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(True)


class PosMdrConfigUpdateRequest(BaseModel):
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
    Returns active allowed POS payment modes:
    1. POS - Instant
    2. POS+T1
    3. POS+T2
    """
    modes = await PosMdrService.get_active_payment_modes(db)
    return {"items": modes, "total": len(modes)}


@router.post("/calculate-mdr", response_model=CalculateMdrResponse)
async def calculate_mdr(
    req: CalculateMdrRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamic MDR and Received Amount calculation.
    Priority: Retailer-Specific MDR -> Default MDR -> Error.
    Returns:
    - payment_mode
    - transaction_amount
    - mdr (MDR charge)
    - gst (GST on MDR charge)
    - charges (Applicable charges = MDR)
    - received_amount (transaction_amount - charges - gst)
    """
    mdr_config = await PosMdrService.resolve_mdr_configuration(
        db=db,
        payment_mode=req.payment_mode,
        retailer_id=req.retailer_id
    )
    result = PosMdrService.calculate_mdr(
        amount=req.transaction_amount,
        mdr_config=mdr_config
    )
    return CalculateMdrResponse(
        payment_mode=result["payment_mode"],
        transaction_amount=result["transaction_amount"],
        mdr=result["mdr"],
        gst=result["gst"],
        charges=result["charges"],
        received_amount=result["received_amount"],
        mdr_config_id=result["mdr_config_id"]
    )


# ==============================================================================
# ADMIN CONFIGURATION ENDPOINTS
# ==============================================================================

@router.get("/admin/mdr-configs")
async def list_admin_mdr_configs(
    payment_mode: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists configured POS MDR rates (both retailer-specific and default rates).
    """
    stmt = select(PosMdrConfigurationModel).where(
        PosMdrConfigurationModel.is_deleted == False
    )
    if payment_mode:
        stmt = stmt.where(PosMdrConfigurationModel.payment_mode == payment_mode.strip())
    if is_active is not None:
        stmt = stmt.where(PosMdrConfigurationModel.is_active == is_active)
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
                "name": r.store_name or r.owner_name or r.legal_name or r.retailer_code
            }

    items = []
    for c in configs:
        ret_info = ret_map.get(c.retailer_id) if c.retailer_id else None
        items.append({
            "id": str(c.public_id),
            "payment_mode": c.payment_mode,
            "mdr": float(c.mdr),
            "mdr_type": c.mdr_type,
            "gst_rate": float(c.gst_rate) if c.gst_rate is not None else 18.00,
            "is_default": c.retailer_id is None,
            "retailer_id": str(c.retailer_id) if c.retailer_id else None,
            "retailer_code": ret_info["retailer_code"] if ret_info else None,
            "retailer_name": ret_info["name"] if ret_info else None,
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
        gst_rate=req.gst_rate if req.gst_rate is not None else 18.00,
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


@router.delete("/admin/mdr-configs/{config_id}")
async def delete_admin_mdr_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Soft-deletes / deactivates an MDR configuration.
    Historical transactions remain preserved.
    """
    stmt = select(PosMdrConfigurationModel).where(
        PosMdrConfigurationModel.public_id == config_id,
        PosMdrConfigurationModel.is_deleted == False
    )
    res = await db.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        raise HTTPException(status_code=404, detail="MDR configuration not found.")

    cfg.is_deleted = True
    cfg.is_active = False
    cfg.updated_date = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "MDR configuration deactivated successfully."}
