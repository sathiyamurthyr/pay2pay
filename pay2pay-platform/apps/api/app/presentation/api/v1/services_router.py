"""
Platform Service Availability & Enable/Disable Router.

Manages availability configuration for:
- Platform Services: Mobile Recharge (RECHARGE), DMT, BBPS, AEPS, POS Top-Up (POS_TOPUP)
- Independent POS Settlement Modes: POS Instant, POS T+1, POS T+2

Reuses existing database schema (customer_service_configuration & pos_payment_mode_config)
and executes stored procedures:
- sp_toggle_platform_service
- sp_toggle_pos_payment_mode
- sp_get_active_pos_payment_modes
- sp_get_all_pos_payment_modes
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.pos_mdr_service import PosMdrService

router = APIRouter(tags=["Platform Service Enable/Disable Configuration"])


class ToggleServiceRequest(BaseModel):
    is_enabled: Optional[bool] = None


class TogglePosModeRequest(BaseModel):
    is_active: Optional[bool] = None


@router.get("/services/status")
async def get_services_status(db: AsyncSession = Depends(get_db)):
    """
    Public / Retailer endpoint returning live availability status of all platform services
    and active POS settlement modes directly from the database.
    Zero local storage dependency.
    """
    res = await db.execute(text(
        "SELECT service_code, service_name, is_enabled "
        "FROM customer_service_configuration "
        "WHERE is_deleted = false "
        "ORDER BY service_code;"
    ))
    rows = res.fetchall()
    services_map = {r[0]: bool(r[2]) for r in rows}
    
    # Active POS payment modes
    pos_modes = await PosMdrService.get_active_payment_modes(db)

    return {
        "success": True,
        "services": services_map,
        "services_list": [
            {"code": r[0], "name": r[1], "is_enabled": bool(r[2])}
            for r in rows
        ],
        "active_pos_modes": pos_modes,
        "pos_instant_enabled": any(m["code"] == "POS - Instant" for m in pos_modes),
        "pos_t1_enabled": any(m["code"] == "POS+T1" for m in pos_modes),
        "pos_t2_enabled": any(m["code"] == "POS+T2" for m in pos_modes)
    }


@router.get("/admin/services/status")
async def get_admin_services_status(db: AsyncSession = Depends(get_db)):
    """
    Admin endpoint returning all platform services and all POS settlement modes
    with their enabled/disabled status.
    """
    res = await db.execute(text(
        "SELECT service_code, service_name, is_enabled, config_status "
        "FROM customer_service_configuration "
        "WHERE is_deleted = false "
        "ORDER BY service_code;"
    ))
    services = [
        {
            "code": r[0],
            "name": r[1],
            "is_enabled": bool(r[2]),
            "status": r[3]
        }
        for r in res.fetchall()
    ]
    all_pos_modes = await PosMdrService.get_all_payment_modes(db)

    return {
        "success": True,
        "services": services,
        "pos_modes": all_pos_modes
    }


@router.patch("/admin/services/{service_code}/toggle")
async def toggle_platform_service(
    service_code: str,
    req: Optional[ToggleServiceRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles or sets the enabled status of a platform service using sp_toggle_platform_service.
    """
    code_upper = service_code.strip().upper()
    cur_res = await db.execute(
        text("SELECT is_enabled FROM customer_service_configuration WHERE service_code = :code AND is_deleted = false;"),
        {"code": code_upper}
    )
    row = cur_res.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service '{service_code}' not found in customer_service_configuration."
        )

    new_val = not row[0] if (req is None or req.is_enabled is None) else req.is_enabled

    sp_res = await db.execute(
        text("SELECT * FROM sp_toggle_platform_service(:code, :is_enabled, :updated_by);"),
        {"code": code_upper, "is_enabled": new_val, "updated_by": "ADMIN"}
    )
    await db.commit()

    # Return refreshed status
    res = await db.execute(text(
        "SELECT service_code, service_name, is_enabled, config_status "
        "FROM customer_service_configuration "
        "WHERE is_deleted = false "
        "ORDER BY service_code;"
    ))
    services = [
        {
            "code": r[0],
            "name": r[1],
            "is_enabled": bool(r[2]),
            "status": r[3]
        }
        for r in res.fetchall()
    ]
    all_pos_modes = await PosMdrService.get_all_payment_modes(db)

    return {
        "success": True,
        "message": f"Service '{code_upper}' status successfully updated to {'ENABLED' if new_val else 'DISABLED'}",
        "service": {"code": code_upper, "is_enabled": new_val},
        "services": services,
        "pos_modes": all_pos_modes
    }


@router.patch("/admin/services/pos-modes/{mode_code}/toggle")
async def toggle_pos_mode_from_services(
    mode_code: str,
    req: Optional[TogglePosModeRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles or sets the active status of an individual POS settlement mode (POS Instant, POS+T1, POS+T2)
    using sp_toggle_pos_payment_mode.
    """
    is_active = req.is_active if req else None
    result = await PosMdrService.toggle_payment_mode(
        db=db,
        code=mode_code,
        is_active=is_active,
        updated_by="ADMIN"
    )
    all_modes = await PosMdrService.get_all_payment_modes(db)
    return {
        "success": True,
        "message": f"POS Settlement Mode '{mode_code}' status successfully updated to {'ENABLED' if result['is_active'] else 'DISABLED'}",
        "mode": result,
        "pos_modes": all_modes
    }
