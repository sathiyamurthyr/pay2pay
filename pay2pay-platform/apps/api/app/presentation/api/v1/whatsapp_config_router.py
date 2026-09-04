"""
Enterprise WhatsApp Notification Configuration Router
Provides Admin endpoints to inspect and manage WhatsApp notification settings,
specifically Top-Up request alerts for administrators, backed by PostgreSQL stored procedures.
"""

import uuid
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.adapters.whatsapp_service import whatsapp_service

logger = logging.getLogger("whatsapp_config_router")

router = APIRouter(prefix="/admin/whatsapp-config", tags=["Admin WhatsApp Configuration"])


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class WhatsAppTopupConfigUpdateRequest(BaseModel):
    is_enabled: bool = Field(True, description="Enable or disable automated WhatsApp alerts on top-up requests")
    template_id: str = Field("1043386768499813", description="Approved Meta WhatsApp Template ID")
    template_name: str = Field("topup_request_admin", description="Meta WhatsApp Template Name")
    phone_number_id: str = Field("497102120160245", description="Meta Phone Number ID")
    admin_phone_numbers: str = Field("7013914767", description="Comma-separated admin phone numbers")
    language_code: Optional[str] = Field("en", description="Template language code")
    button_base_url: Optional[str] = Field("https://receipt.pay2pay.in/r/", description="Receipt view base URL")


class WhatsAppTestAlertRequest(BaseModel):
    test_mobile: Optional[str] = Field(None, description="Mobile number to receive test alert (defaults to primary admin)")
    retailer_name: Optional[str] = Field("sathiya", description="Sample Retailer Name")
    retailer_id: Optional[str] = Field("12345", description="Sample Retailer Code/ID")
    request_id: Optional[str] = Field("TOP-REQ-TEST", description="Sample Request ID")
    amount: Optional[float] = Field(1000.0, description="Sample Requested Amount")
    payment_mode: Optional[str] = Field("POS - Instant", description="Sample Payment Mode")
    status_text: Optional[str] = Field("Pending Approval", description="Sample Status")
    view_id: Optional[str] = Field("test-demo", description="Sample view token / ID")


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/topup", summary="Get WhatsApp Top-Up Alert Configuration")
async def get_whatsapp_topup_config(db: AsyncSession = Depends(get_db)):
    """
    Fetches the active WhatsApp Top-Up alert configuration from PostgreSQL stored procedure.
    """
    try:
        res = await db.execute(text("SELECT * FROM sp_get_whatsapp_topup_config();"))
        row = res.mappings().first()
        if not row:
            # Fallback default
            return {
                "success": True,
                "config": {
                    "is_enabled": True,
                    "template_id": "1043386768499813",
                    "template_name": "topup_request_admin",
                    "phone_number_id": "497102120160245",
                    "admin_phone_numbers": "7013914767",
                    "language_code": "en",
                    "button_base_url": "https://receipt.pay2pay.in/r/",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }

        return {
            "success": True,
            "config": {
                "id": row.get("out_id"),
                "public_id": str(row.get("out_public_id")),
                "is_enabled": bool(row.get("out_is_enabled")),
                "template_id": str(row.get("out_template_id") or "1043386768499813"),
                "template_name": str(row.get("out_template_name") or "topup_request_admin"),
                "phone_number_id": str(row.get("out_phone_number_id") or "497102120160245"),
                "admin_phone_numbers": str(row.get("out_admin_phone_numbers") or "7013914767"),
                "language_code": str(row.get("out_language_code") or "en"),
                "button_base_url": str(row.get("out_button_base_url") or "https://receipt.pay2pay.in/r/"),
                "updated_at": row.get("out_updated_at").isoformat() if row.get("out_updated_at") else None
            }
        }
    except Exception as ex:
        logger.error(f"Error fetching whatsapp config: {ex}")
        return {
            "success": True,
            "config": {
                "is_enabled": True,
                "template_id": "1043386768499813",
                "template_name": "topup_request_admin",
                "phone_number_id": "497102120160245",
                "admin_phone_numbers": "7013914767",
                "language_code": "en",
                "button_base_url": "https://receipt.pay2pay.in/r/",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }


@router.post("/topup", summary="Update WhatsApp Top-Up Alert Configuration")
async def update_whatsapp_topup_config(
    req: WhatsAppTopupConfigUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the active WhatsApp Top-Up alert configuration in PostgreSQL via stored procedure.
    """
    # Clean phone numbers
    clean_numbers = ", ".join([
        n.strip() for n in req.admin_phone_numbers.replace("\n", ",").split(",") if n.strip()
    ])
    if not clean_numbers:
        clean_numbers = "7013914767"

    try:
        stmt = text("""
            SELECT * FROM sp_update_whatsapp_topup_config(
                :is_enabled,
                :template_id,
                :template_name,
                :phone_number_id,
                :admin_phone_numbers,
                :updated_by
            );
        """)
        res = await db.execute(stmt, {
            "is_enabled": req.is_enabled,
            "template_id": req.template_id.strip(),
            "template_name": req.template_name.strip(),
            "phone_number_id": req.phone_number_id.strip(),
            "admin_phone_numbers": clean_numbers,
            "updated_by": "ADMIN"
        })
        await db.commit()
        row = res.mappings().first()

        return {
            "success": True,
            "message": "WhatsApp top-up notification configuration updated successfully.",
            "config": {
                "id": row.get("out_id"),
                "public_id": str(row.get("out_public_id")),
                "is_enabled": bool(row.get("out_is_enabled")),
                "template_id": str(row.get("out_template_id")),
                "template_name": str(row.get("out_template_name")),
                "phone_number_id": str(row.get("out_phone_number_id")),
                "admin_phone_numbers": str(row.get("out_admin_phone_numbers")),
                "language_code": str(row.get("out_language_code") or "en"),
                "button_base_url": str(row.get("out_button_base_url") or "https://receipt.pay2pay.in/r/"),
                "updated_at": row.get("out_updated_at").isoformat() if row.get("out_updated_at") else None
            }
        }
    except Exception as ex:
        logger.error(f"Error updating whatsapp config: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update WhatsApp configuration: {str(ex)}"
        )


@router.post("/test-alert", summary="Send Test WhatsApp Top-Up Alert")
async def send_test_whatsapp_alert(
    req: WhatsAppTestAlertRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatches an immediate sample test notification using the approved Meta template
    to verify live connectivity and template rendering.
    """
    # 1. Fetch current config
    cfg_stmt = text("SELECT * FROM sp_get_whatsapp_topup_config();")
    cfg_res = await db.execute(cfg_stmt)
    cfg_row = cfg_res.mappings().first()

    template_id = str(cfg_row.get("out_template_id") or "1043386768499813") if cfg_row else "1043386768499813"
    template_name = str(cfg_row.get("out_template_name") or "topup_request_admin") if cfg_row else "topup_request_admin"
    phone_id = str(cfg_row.get("out_phone_number_id") or "497102120160245") if cfg_row else "497102120160245"
    lang_code = str(cfg_row.get("out_language_code") or "en") if cfg_row else "en"

    # Destination mobile
    dest_mobile = (req.test_mobile or "").strip()
    if not dest_mobile and cfg_row and cfg_row.get("out_admin_phone_numbers"):
        dest_mobile = cfg_row.get("out_admin_phone_numbers").split(",")[0].strip()
    if not dest_mobile:
        dest_mobile = "7013914767"

    now_str = datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M")
    req_id = req.request_id or f"TOP-TEST-{uuid.uuid4().hex[:6].upper()}"

    res = await whatsapp_service.send_admin_topup_alert(
        mobile_number=dest_mobile,
        retailer_name=req.retailer_name or "sathiya",
        retailer_id=req.retailer_id or "12345",
        request_id=req_id,
        amount=req.amount or 1000.0,
        payment_mode=req.payment_mode or "POS - Instant",
        date_time_str=now_str,
        status=req.status_text or "Pending Approval",
        view_id=req.view_id or req_id,
        template_name=template_name,
        template_id=template_id,
        language_code=lang_code,
        phone_number_id=phone_id
    )

    return {
        "success": res.get("status") == "SUCCESS",
        "delivery_result": res,
        "message": "WhatsApp test notification delivered successfully." if res.get("status") == "SUCCESS" else "Failed to deliver WhatsApp test notification."
    }
