"""
Admin Payout Gateway Routing & Switcher Controller Router
Provides APIs for Admins to:
- Inspect configured payout gateways (BulkPe, WowPe, etc.)
- Switch primary gateway on-the-fly (BulkPe <-> WowPe)
- Update gateway credentials, priority order, active/inactive state
- Fetch live gateway balances simultaneously
- Ping / test connection for each gateway
- Configure auto-failover & routing policies
"""

import uuid
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.payout_routing_service import PayoutRoutingService

logger = logging.getLogger("admin_payout_routing_router")

router = APIRouter(prefix="/admin/payout-routing", tags=["Admin Payout Routing & Gateway Controller"])


class PrimarySwitchRequest(BaseModel):
    provider_code: str = Field(..., description="Provider code to make primary: WOWPE, BULKPE, or UTKALDIGITAL")
    reason: Optional[str] = Field("Admin manual priority switch", description="Audit reason for switch")
    tenant_id: Optional[str] = Field(None, description="Optional tenant UUID")


class GatewayUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    priority_order: Optional[int] = None
    weight_percentage: Optional[int] = None
    api_endpoint: Optional[str] = None
    account_number: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    user_id: Optional[str] = None
    merchant_id: Optional[str] = None
    encryption_key: Optional[str] = None
    config_params: Optional[Dict[str, Any]] = None


class RoutingPolicyUpdateRequest(BaseModel):
    routing_mode: Optional[str] = Field("PRIORITY", description="PRIORITY / WEIGHTED_LOAD_BALANCE / ROUND_ROBIN")
    auto_failover_enabled: Optional[bool] = True
    max_failover_attempts: Optional[int] = 2
    status_polling_interval_seconds: Optional[int] = 60
    max_poll_retries: Optional[int] = 30


class TestConnectionRequest(BaseModel):
    provider_code: str = Field(..., description="Provider code to test: WOWPE, BULKPE, or UTKALDIGITAL")


@router.get("/config")
async def get_routing_configuration(
    tenant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns current active primary provider, routing policy, and all registered payout gateway configurations.
    """
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else None
    await PayoutRoutingService.ensure_default_configs(db, tid)

    active_primary = await PayoutRoutingService.get_active_primary_provider(db, tid)
    gateways = await PayoutRoutingService.get_all_gateways(db, tid)
    policy = await PayoutRoutingService.get_routing_policy(db, tid)

    # Format gateway details masking secrets
    formatted_gateways = []
    for gw in gateways:
        masked_secret = None
        sec = gw.secret_key or ""
        if sec:
            masked_secret = f"{sec[:4]}***{sec[-4:]}" if len(sec) > 8 else "***"

        formatted_gateways.append({
            "id": str(gw.public_id),
            "provider_name": gw.provider_name,
            "provider_code": gw.provider_code,
            "is_active": gw.status == "ACTIVE",
            "is_primary": gw.provider_code == active_primary or gw.is_default,
            "priority_order": gw.priority,
            "weight_percentage": 100 if gw.is_default else 0,
            "api_endpoint": gw.base_url,
            "account_number": "",
            "user_id": gw.client_id or "",
            "merchant_id": gw.client_id or "",
            "masked_secret": masked_secret,
            "last_balance_check_at": gw.last_balance_checked_at.isoformat() if gw.last_balance_checked_at else None,
            "last_known_balance": gw.last_balance,
            "updated_at": (getattr(gw, "updated_date", None) or getattr(gw, "updated_at", None)).isoformat() if (getattr(gw, "updated_date", None) or getattr(gw, "updated_at", None)) else None
        })

    return {
        "status": "SUCCESS",
        "data": {
            "active_primary_provider": active_primary,
            "routing_policy": {
                "routing_mode": getattr(policy, "routing_mode", "PRIORITY"),
                "auto_failover_enabled": getattr(policy, "auto_failover_enabled", True),
                "max_failover_attempts": getattr(policy, "max_failover_attempts", 3),
                "status_polling_interval_seconds": getattr(policy, "status_polling_interval_seconds", 60),
                "max_poll_retries": getattr(policy, "max_poll_retries", 30)
            },
            "gateways": formatted_gateways
        }
    }


@router.post("/switch")
async def switch_primary_gateway(
    req: PrimarySwitchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Switches the active primary payout provider (e.g., WowPe <-> BulkPe) immediately.
    Updates DB priorities and logs administrative audit.
    """
    code = req.provider_code.strip().upper()
    if code not in ("WOWPE", "BULKPE", "UTKALDIGITAL"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider code '{req.provider_code}'. Supported providers: WOWPE, BULKPE, UTKALDIGITAL."
        )

    tid = uuid.UUID(req.tenant_id) if req.tenant_id and len(req.tenant_id) == 36 else None
    result = await PayoutRoutingService.switch_primary_provider(
        db=db,
        provider_code=code,
        tenant_id=tid,
        reason=req.reason or "Admin priority switch"
    )

    return {
        "status": "SUCCESS",
        "message": f"Primary payout gateway successfully switched to {result['active_primary']}.",
        "data": result
    }


@router.put("/gateway/{provider_code}")
async def update_gateway_configuration(
    provider_code: str,
    req: GatewayUpdateRequest,
    tenant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates configuration, priority, or API credentials for a specific gateway.
    """
    code = provider_code.strip().upper()
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else None

    updated_gw = await PayoutRoutingService.update_gateway_settings(
        db=db,
        provider_code=code,
        is_active=req.is_active,
        priority_order=req.priority_order,
        weight_percentage=req.weight_percentage,
        api_endpoint=req.api_endpoint,
        account_number=req.account_number,
        api_key=req.api_key,
        api_secret=req.api_secret,
        user_id=req.user_id,
        merchant_id=req.merchant_id,
        encryption_key=req.encryption_key,
        config_params=req.config_params,
        tenant_id=tid
    )

    return {
        "status": "SUCCESS",
        "message": f"Configuration for {code} updated successfully.",
        "data": {
            "provider_code": updated_gw.provider_code,
            "is_active": updated_gw.is_active,
            "is_primary": updated_gw.is_primary,
            "priority_order": updated_gw.priority_order,
            "api_endpoint": updated_gw.api_endpoint
        }
    }


@router.get("/balances")
async def get_all_live_balances(
    tenant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Queries live balances from all configured payout gateways in real-time.
    """
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else None
    balances = await PayoutRoutingService.fetch_live_balances(db, tid)
    return {"status": "SUCCESS", "data": balances}


@router.post("/test-connection")
async def test_gateway_connection(
    req: TestConnectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Tests live connectivity and credential authorization for the specified gateway.
    """
    code = req.provider_code.strip().upper()
    if code not in ("WOWPE", "BULKPE", "UTKALDIGITAL", "UTKAL"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider code: {code}"
        )

    from app.application.payout_vendor_adapter import PayoutVendorAdapterFactory
    vendor_adapter = PayoutVendorAdapterFactory.get_adapter()
    bal_res = await vendor_adapter.check_balance(code)

    return {
        "status": "SUCCESS" if bal_res.get("success") or bal_res.get("http_status") == 200 else "FAILED",
        "provider": code,
        "connected": bal_res.get("success", False) or bal_res.get("http_status") == 200,
        "is_simulated": bal_res.get("is_simulated", False),
        "response": bal_res
    }
