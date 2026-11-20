"""
Platform Service Availability & Enable/Disable Router.

Manages availability configuration for:
- Platform Services: Mobile Recharge (RECHARGE), DMT, BBPS, AEPS, POS Top-Up (POS_TOPUP), UPI, PayIn (PAYIN)
- Independent POS Settlement Modes: POS Instant, POS T+1, POS T+2

Reuses existing database schema (customer_service_configuration & pos_payment_mode_config)
and executes stored procedures:
- sp_toggle_platform_service
- sp_toggle_pos_payment_mode
- sp_get_active_pos_payment_modes
- sp_get_all_pos_payment_modes
"""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, text, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.company_resolver import resolve_request_company_ref, COMPANY_MAPPINGS
from app.application.dependencies import get_optional_token_payload, get_optional_current_user
from app.application.pos_mdr_service import PosMdrService
from app.infrastructure.db.customer_models import CustomerServiceConfigurationModel

router = APIRouter(tags=["Platform Service Enable/Disable Configuration"])

SERVICE_SUBMENU_MAPPINGS: Dict[str, List[str]] = {
    "DMT": [
        "/retailer/dmt",
        "/retailer/beneficiary",
        "/retailer/beneficiaries",
        "/retailer/reports/payout-transactions",
        "/retailer/dmt/reports"
    ],
    "PAYIN": [
        "/retailer/payin",
        "/retailer/reports/payin-transactions",
        "/retailer/reports/payin"
    ],
    "POS_TOPUP": [
        "/retailer/card-to-cash",
        "/retailer/settlement",
        "/retailer/reports/settlement",
        "/retailer/settlements"
    ],
    "RECHARGE": [
        "/retailer/recharge"
    ],
    "AEPS": [
        "/retailer/aeps"
    ],
    "BBPS": [
        "/retailer/bbps"
    ],
    "UPI": [
        "/retailer/upi"
    ],
}

DEFAULT_SERVICES = [
    {"code": "DMT", "name": "Domestic Money Transfer (DMT)", "default_enabled": True},
    {"code": "RECHARGE", "name": "Mobile & DTH Recharge", "default_enabled": True},
    {"code": "AEPS", "name": "Aadhaar Enabled Payment System (AePS)", "default_enabled": True},
    {"code": "BBPS", "name": "Bharat Bill Payment System (BBPS)", "default_enabled": True},
    {"code": "POS_TOPUP", "name": "POS Card Settlement Top-Up", "default_enabled": True},
    {"code": "UPI", "name": "UPI QR Top-Up", "default_enabled": True},
    {"code": "PAYIN", "name": "PayIn Gateway (Add Money)", "default_enabled": True},
]


class ToggleServiceRequest(BaseModel):
    is_enabled: Optional[bool] = None
    company_ref_id: Optional[int] = None


class TogglePosModeRequest(BaseModel):
    is_active: Optional[bool] = None


@router.get("/services/status")
async def get_services_status(
    request: Request,
    company_ref_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_optional_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """
    Public / Retailer endpoint returning live availability status of all platform services
    and active POS settlement modes scoped by authenticated company_ref_id.
    Zero local storage dependency.
    """
    # Authoritative company resolution:
    resolved_comp_ref = None
    if current_user and hasattr(current_user, "company_ref_id") and current_user.company_ref_id:
        resolved_comp_ref = current_user.company_ref_id
    elif token_payload and token_payload.get("company_ref_id"):
        try:
            resolved_comp_ref = int(token_payload["company_ref_id"])
        except (ValueError, TypeError):
            pass

    if resolved_comp_ref is None:
        resolved_comp_ref = company_ref_id

    if resolved_comp_ref is None:
        resolved_comp_ref = resolve_request_company_ref(request) or 47

    rows = []
    # 1. Primary: PostgreSQL Stored Procedure with company_ref_id
    try:
        sp_res = await db.execute(
            text("SELECT out_service_code, out_service_name, out_is_enabled, out_config_status FROM sp_get_all_platform_services_status(:comp_ref);"),
            {"comp_ref": resolved_comp_ref}
        )
        rows = sp_res.fetchall()
    except Exception:
        await db.rollback()

    # 2. Resilient fallback: direct query on customer_service_configuration
    if not rows:
        try:
            orm_stmt = select(
                CustomerServiceConfigurationModel.service_code,
                CustomerServiceConfigurationModel.service_name,
                CustomerServiceConfigurationModel.is_enabled,
                CustomerServiceConfigurationModel.config_status,
                CustomerServiceConfigurationModel.company_ref_id
            ).where(
                CustomerServiceConfigurationModel.is_deleted == False,
                or_(
                    CustomerServiceConfigurationModel.company_ref_id == resolved_comp_ref,
                    CustomerServiceConfigurationModel.company_ref_id == None
                )
            ).order_by(
                (CustomerServiceConfigurationModel.company_ref_id == resolved_comp_ref).desc()
            )
            orm_res = (await db.execute(orm_stmt)).fetchall()
            seen = set()
            for r in orm_res:
                code = r[0].upper()
                if code not in seen:
                    seen.add(code)
                    rows.append((r[0], r[1], r[2], r[3]))
        except Exception:
            pass

    # Build services map and list with defaults
    services_map = {}
    for d in DEFAULT_SERVICES:
        services_map[d["code"]] = d["default_enabled"]

    for r in rows:
        services_map[r[0].upper()] = bool(r[2])

    services_list = []
    for d in DEFAULT_SERVICES:
        code = d["code"]
        is_en = services_map.get(code, d["default_enabled"])
        services_list.append({
            "code": code,
            "name": d["name"],
            "is_enabled": is_en,
            "company_ref_id": resolved_comp_ref
        })

    # Submenus disabled due to parent service being disabled
    disabled_submenus = []
    for svc_code, is_en in services_map.items():
        if not is_en:
            for sub_path in SERVICE_SUBMENU_MAPPINGS.get(svc_code, []):
                disabled_submenus.append(sub_path)

    pos_modes = await PosMdrService.get_active_payment_modes(db)

    return {
        "success": True,
        "company_ref_id": resolved_comp_ref,
        "services": services_map,
        "services_list": services_list,
        "disabled_submenus": list(set(disabled_submenus)),
        "active_pos_modes": pos_modes,
        "pos_instant_enabled": any(m["code"] == "POS - Instant" for m in pos_modes),
        "pos_t1_enabled": any(m["code"] == "POS+T1" for m in pos_modes),
        "pos_t2_enabled": any(m["code"] == "POS+T2" for m in pos_modes)
    }


@router.get("/admin/services/status")
async def get_admin_services_status(
    request: Request,
    company_ref_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_optional_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """
    Admin endpoint returning all platform services and all POS settlement modes
    with their enabled/disabled status scoped by company_ref_id.
    """
    resolved_comp_ref = company_ref_id
    if resolved_comp_ref is None:
        if current_user and hasattr(current_user, "company_ref_id") and current_user.company_ref_id:
            resolved_comp_ref = current_user.company_ref_id
        elif token_payload and token_payload.get("company_ref_id"):
            try:
                resolved_comp_ref = int(token_payload["company_ref_id"])
            except (ValueError, TypeError):
                pass
    if resolved_comp_ref is None:
        resolved_comp_ref = resolve_request_company_ref(request) or 47

    rows = []
    try:
        sp_res = await db.execute(
            text("SELECT out_service_code, out_service_name, out_is_enabled, out_config_status FROM sp_get_all_platform_services_status(:comp_ref);"),
            {"comp_ref": resolved_comp_ref}
        )
        rows = sp_res.fetchall()
    except Exception:
        await db.rollback()

    if not rows:
        try:
            orm_stmt = select(
                CustomerServiceConfigurationModel.service_code,
                CustomerServiceConfigurationModel.service_name,
                CustomerServiceConfigurationModel.is_enabled,
                CustomerServiceConfigurationModel.config_status
            ).where(
                CustomerServiceConfigurationModel.is_deleted == False,
                or_(
                    CustomerServiceConfigurationModel.company_ref_id == resolved_comp_ref,
                    CustomerServiceConfigurationModel.company_ref_id == None
                )
            ).order_by(
                (CustomerServiceConfigurationModel.company_ref_id == resolved_comp_ref).desc()
            )
            orm_res = (await db.execute(orm_stmt)).fetchall()
            seen = set()
            for r in orm_res:
                code = r[0].upper()
                if code not in seen:
                    seen.add(code)
                    rows.append((r[0], r[1], r[2], r[3]))
        except Exception:
            pass

    status_dict = {r[0].upper(): bool(r[2]) for r in rows}
    services = []
    for d in DEFAULT_SERVICES:
        code = d["code"]
        is_en = status_dict.get(code, d["default_enabled"])
        services.append({
            "code": code,
            "name": d["name"],
            "is_enabled": is_en,
            "status": "CONFIGURED" if is_en else "DISABLED",
            "company_ref_id": resolved_comp_ref,
            "submenus": SERVICE_SUBMENU_MAPPINGS.get(code, [])
        })

    all_pos_modes = await PosMdrService.get_all_payment_modes(db)

    available_companies = [
        {"company_ref_id": 1, "company_code": "NEAR4YOU", "company_name": "Near4You", "domain": "near4you.store"},
        {"company_ref_id": 2, "company_code": "SMSPAY", "company_name": "SMSPAY", "domain": "smspay.store"},
        {"company_ref_id": 47, "company_code": "PAY2PAY", "company_name": "Pay2Pay", "domain": "pay2pay.in"},
    ]

    return {
        "success": True,
        "company_ref_id": resolved_comp_ref,
        "selected_company_ref_id": resolved_comp_ref,
        "available_companies": available_companies,
        "services": services,
        "pos_modes": all_pos_modes
    }


@router.patch("/admin/services/{service_code}/toggle")
async def toggle_platform_service(
    service_code: str,
    request: Request,
    company_ref_id: Optional[int] = Query(None),
    req: Optional[ToggleServiceRequest] = None,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_optional_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """
    Toggles or sets the enabled status of a platform service for a specific company_ref_id
    using sp_toggle_platform_service with resilient ORM persistence.
    """
    code_upper = service_code.strip().upper()

    # Resolve target company_ref_id
    target_comp_ref = None
    if req and req.company_ref_id is not None:
        target_comp_ref = req.company_ref_id
    elif company_ref_id is not None:
        target_comp_ref = company_ref_id
    elif current_user and hasattr(current_user, "company_ref_id") and current_user.company_ref_id:
        target_comp_ref = current_user.company_ref_id
    elif token_payload and token_payload.get("company_ref_id"):
        try:
            target_comp_ref = int(token_payload["company_ref_id"])
        except (ValueError, TypeError):
            pass
    if target_comp_ref is None:
        target_comp_ref = resolve_request_company_ref(request) or 47

    # 1. Check existing state for this company in customer_service_configuration
    cur_stmt = select(CustomerServiceConfigurationModel).where(
        CustomerServiceConfigurationModel.service_code == code_upper,
        CustomerServiceConfigurationModel.company_ref_id == target_comp_ref,
        CustomerServiceConfigurationModel.is_deleted == False
    )
    existing_rec = (await db.execute(cur_stmt)).scalars().first()

    if existing_rec:
        current_enabled = existing_rec.is_enabled
        new_val = not current_enabled if (req is None or req.is_enabled is None) else req.is_enabled
        existing_rec.is_enabled = new_val
        existing_rec.config_status = "CONFIGURED" if new_val else "DISABLED"
        existing_rec.updated_by = getattr(current_user, "email", "ADMIN")
    else:
        global_stmt = select(CustomerServiceConfigurationModel).where(
            CustomerServiceConfigurationModel.service_code == code_upper,
            CustomerServiceConfigurationModel.company_ref_id == None,
            CustomerServiceConfigurationModel.is_deleted == False
        )
        global_rec = (await db.execute(global_stmt)).scalars().first()
        current_enabled = global_rec.is_enabled if global_rec else True
        new_val = not current_enabled if (req is None or req.is_enabled is None) else req.is_enabled

        svc_name = global_rec.service_name if global_rec else next((d["name"] for d in DEFAULT_SERVICES if d["code"] == code_upper), code_upper)
        new_rec = CustomerServiceConfigurationModel(
            public_id=uuid.uuid4(),
            tenant_id=uuid.UUID("fa480c2d-2725-43bd-a7ba-6fc60a89a1cb"),
            company_ref_id=target_comp_ref,
            service_code=code_upper,
            service_name=svc_name,
            is_enabled=new_val,
            config_status="CONFIGURED" if new_val else "DISABLED",
            created_by=getattr(current_user, "email", "ADMIN"),
            updated_by=getattr(current_user, "email", "ADMIN"),
        )
        db.add(new_rec)

    await db.commit()

    # 2. Also execute Stored Procedure if available
    try:
        await db.execute(
            text("SELECT * FROM sp_toggle_platform_service(:code, :is_enabled, :updated_by, :comp_ref);"),
            {"code": code_upper, "is_enabled": new_val, "updated_by": "ADMIN", "comp_ref": target_comp_ref}
        )
        await db.commit()
    except Exception:
        await db.rollback()

    all_pos_modes = await PosMdrService.get_all_payment_modes(db)

    return {
        "success": True,
        "message": f"Service '{code_upper}' status successfully updated to {'ENABLED' if new_val else 'DISABLED'} for company {target_comp_ref}",
        "company_ref_id": target_comp_ref,
        "is_enabled": new_val,
        "is_active": new_val,
        "service": {"code": code_upper, "is_enabled": new_val, "company_ref_id": target_comp_ref},
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
