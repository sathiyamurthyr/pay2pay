"""
Enterprise WhatsApp Notification Configuration Router
Provides Admin endpoints to inspect and manage WhatsApp notification settings:
1. Admin Alert on Retailer Top-Up Submission (Template ID: 1043386768499813, topup_request_admin)
2. Retailer Status Alert on Admin Approval / Rejection (Template ID: 1586618753193150, topup_status_retailer)
Backed by PostgreSQL stored procedures and Meta WhatsApp Business Cloud API.
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
    # Admin Alert Settings
    is_enabled: bool = Field(True, description="Enable or disable automated WhatsApp alerts to Admin on new top-up requests")
    template_id: str = Field("1043386768499813", description="Approved Meta WhatsApp Template ID for Admin alert")
    template_name: str = Field("topup_request_admin", description="Meta WhatsApp Template Name for Admin alert")
    phone_number_id: str = Field("497102120160245", description="Meta Phone Number ID")
    admin_phone_numbers: str = Field("7013914767", description="Comma-separated admin phone numbers")
    language_code: Optional[str] = Field("en", description="Template language code")
    button_base_url: Optional[str] = Field("https://receipt.pay2pay.in/r/", description="Receipt view base URL")

    # Retailer Status Alert Settings
    retailer_alert_enabled: bool = Field(True, description="Enable or disable automated WhatsApp alerts to Retailer on approval/rejection")
    retailer_template_id: str = Field("1586618753193150", description="Approved Meta WhatsApp Template ID for Retailer status update")
    retailer_template_name: str = Field("topup_status_retailer", description="Meta WhatsApp Template Name for Retailer status update")
    retailer_language_code: Optional[str] = Field("en", description="Retailer template language code")
    retailer_button_base_url: Optional[str] = Field("https://receipt.pay2pay.in/r/", description="Retailer receipt view base URL")


class WhatsAppTestAlertRequest(BaseModel):
    test_mobile: Optional[str] = Field(None, description="Mobile number to receive test alert (defaults to primary admin)")
    retailer_name: Optional[str] = Field("sathiya", description="Sample Retailer Name")
    retailer_id: Optional[str] = Field("12345", description="Sample Retailer Code/ID")
    request_id: Optional[str] = Field("TOP-REQ-TEST", description="Sample Request ID")
    amount: Optional[float] = Field(1000.0, description="Sample Requested Amount")
    payment_mode: Optional[str] = Field("POS - Instant", description="Sample Payment Mode")
    status_text: Optional[str] = Field("Pending Approval", description="Sample Status")
    view_id: Optional[str] = Field("test-demo", description="Sample view token / ID")


class WhatsAppRetailerTestAlertRequest(BaseModel):
    test_mobile: Optional[str] = Field(None, description="Retailer mobile number to receive test alert")
    retailer_name: Optional[str] = Field("123", description="Sample Retailer Name or Identifier (Variable 1)")
    request_id: Optional[str] = Field("1000", description="Sample Request ID (Variable 2)")
    amount_requested: Optional[float] = Field(9999.0, description="Sample Amount Requested (Variable 3)")
    approved_amount: Optional[float] = Field(9999.0, description="Sample Approved Amount (Variable 4)")
    wallet_credit: Optional[float] = Field(9999.0, description="Sample Wallet Credit Amount (Variable 5)")
    payment_mode: Optional[str] = Field("pos", description="Sample Payment Mode (Variable 6)")
    transaction_id: Optional[str] = Field("123erdfdfdf", description="Sample Transaction ID (Variable 7)")
    approved_date_time: Optional[str] = Field(None, description="Sample Approved Date & Time (Variable 8)")
    status_text: Optional[str] = Field("Approved", description="Sample Status Text (Variable 9)")
    view_id: Optional[str] = Field("1234", description="Sample Receipt View ID for Button")


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/topup", summary="Get WhatsApp Top-Up Alert Configuration")
async def get_whatsapp_topup_config(db: AsyncSession = Depends(get_db)):
    """
    Fetches the active WhatsApp Top-Up alert configuration (Admin + Retailer) from PostgreSQL stored procedure.
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
                    "retailer_alert_enabled": True,
                    "retailer_template_id": "1586618753193150",
                    "retailer_template_name": "topup_status_retailer",
                    "retailer_language_code": "en",
                    "retailer_button_base_url": "https://receipt.pay2pay.in/r/",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }

        return {
            "success": True,
            "config": {
                "id": row.get("out_id"),
                "public_id": str(row.get("out_public_id")),
                # Admin Alert
                "is_enabled": bool(row.get("out_is_enabled")),
                "template_id": str(row.get("out_template_id") or "1043386768499813"),
                "template_name": str(row.get("out_template_name") or "topup_request_admin"),
                "phone_number_id": str(row.get("out_phone_number_id") or "497102120160245"),
                "admin_phone_numbers": str(row.get("out_admin_phone_numbers") or "7013914767"),
                "language_code": str(row.get("out_language_code") or "en"),
                "button_base_url": str(row.get("out_button_base_url") or "https://receipt.pay2pay.in/r/"),
                # Retailer Status Alert
                "retailer_alert_enabled": bool(row.get("out_retailer_alert_enabled") if row.get("out_retailer_alert_enabled") is not None else True),
                "retailer_template_id": str(row.get("out_retailer_template_id") or "1586618753193150"),
                "retailer_template_name": str(row.get("out_retailer_template_name") or "topup_status_retailer"),
                "retailer_language_code": str(row.get("out_retailer_language_code") or "en"),
                "retailer_button_base_url": str(row.get("out_retailer_button_base_url") or "https://receipt.pay2pay.in/r/"),
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
                "retailer_alert_enabled": True,
                "retailer_template_id": "1586618753193150",
                "retailer_template_name": "topup_status_retailer",
                "retailer_language_code": "en",
                "retailer_button_base_url": "https://receipt.pay2pay.in/r/",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }


@router.post("/topup", summary="Update WhatsApp Top-Up Alert Configuration")
async def update_whatsapp_topup_config(
    req: WhatsAppTopupConfigUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the active WhatsApp Top-Up alert configuration (Admin + Retailer) in PostgreSQL via stored procedure.
    """
    # Clean admin phone numbers
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
                :updated_by,
                :retailer_alert_enabled,
                :retailer_template_id,
                :retailer_template_name,
                :retailer_language_code,
                :retailer_button_base_url
            );
        """)
        res = await db.execute(stmt, {
            "is_enabled": req.is_enabled,
            "template_id": req.template_id.strip(),
            "template_name": req.template_name.strip(),
            "phone_number_id": req.phone_number_id.strip(),
            "admin_phone_numbers": clean_numbers,
            "updated_by": "ADMIN",
            "retailer_alert_enabled": req.retailer_alert_enabled,
            "retailer_template_id": req.retailer_template_id.strip(),
            "retailer_template_name": req.retailer_template_name.strip(),
            "retailer_language_code": (req.retailer_language_code or "en").strip(),
            "retailer_button_base_url": req.retailer_button_base_url.strip()
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
                "retailer_alert_enabled": bool(row.get("out_retailer_alert_enabled")),
                "retailer_template_id": str(row.get("out_retailer_template_id")),
                "retailer_template_name": str(row.get("out_retailer_template_name")),
                "retailer_language_code": str(row.get("out_retailer_language_code") or "en"),
                "retailer_button_base_url": str(row.get("out_retailer_button_base_url") or "https://receipt.pay2pay.in/r/"),
                "updated_at": row.get("out_updated_at").isoformat() if row.get("out_updated_at") else None
            }
        }
    except Exception as ex:
        logger.error(f"Error updating whatsapp config: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update WhatsApp configuration: {str(ex)}"
        )


@router.post("/test-alert", summary="Send Test WhatsApp Top-Up Alert to Admin")
async def send_test_whatsapp_alert(
    req: WhatsAppTestAlertRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatches an immediate sample test notification to Admin using approved Meta template
    (Template ID: 1043386768499813, topup_request_admin).
    """
    cfg_stmt = text("SELECT * FROM sp_get_whatsapp_topup_config();")
    cfg_res = await db.execute(cfg_stmt)
    cfg_row = cfg_res.mappings().first()

    template_id = str(cfg_row.get("out_template_id") or "1043386768499813") if cfg_row else "1043386768499813"
    template_name = str(cfg_row.get("out_template_name") or "topup_request_admin") if cfg_row else "topup_request_admin"
    phone_id = str(cfg_row.get("out_phone_number_id") or "497102120160245") if cfg_row else "497102120160245"
    lang_code = str(cfg_row.get("out_language_code") or "en") if cfg_row else "en"

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


@router.post("/test-retailer-alert", summary="Send Test WhatsApp Top-Up Status Alert to Retailer")
async def send_test_retailer_whatsapp_alert(
    req: WhatsAppRetailerTestAlertRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dispatches an immediate sample status update notification to Retailer using Meta template
    (Template ID: 1586618753193150, topup_status_retailer).
    """
    cfg_stmt = text("SELECT * FROM sp_get_whatsapp_topup_config();")
    cfg_res = await db.execute(cfg_stmt)
    cfg_row = cfg_res.mappings().first()

    template_id = str(cfg_row.get("out_retailer_template_id") or "1586618753193150") if cfg_row else "1586618753193150"
    template_name = str(cfg_row.get("out_retailer_template_name") or "topup_status_retailer") if cfg_row else "topup_status_retailer"
    phone_id = str(cfg_row.get("out_phone_number_id") or "497102120160245") if cfg_row else "497102120160245"
    lang_code = str(cfg_row.get("out_retailer_language_code") or "en") if cfg_row else "en"

    dest_mobile = (req.test_mobile or "").strip()
    if not dest_mobile and cfg_row and cfg_row.get("out_admin_phone_numbers"):
        dest_mobile = cfg_row.get("out_admin_phone_numbers").split(",")[0].strip()
    if not dest_mobile:
        dest_mobile = "7013914767"

    now_str = req.approved_date_time or datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M")
    req_id = req.request_id or "1000"

    res = await whatsapp_service.send_retailer_topup_status_alert(
        mobile_number=dest_mobile,
        retailer_name=req.retailer_name or "123",
        request_id=req_id,
        amount_requested=req.amount_requested if req.amount_requested is not None else 9999.0,
        approved_amount=req.approved_amount if req.approved_amount is not None else 9999.0,
        wallet_credit=req.wallet_credit if req.wallet_credit is not None else 9999.0,
        payment_mode=req.payment_mode or "pos",
        transaction_id=req.transaction_id or "123erdfdfdf",
        approved_date_time=now_str,
        status=req.status_text or "Approved",
        view_id=req.view_id or "1234",
        template_name=template_name,
        template_id=template_id,
        language_code=lang_code,
        phone_number_id=phone_id
    )

    return {
        "success": res.get("status") == "SUCCESS",
        "delivery_result": res,
        "message": "Retailer WhatsApp status notification delivered successfully." if res.get("status") == "SUCCESS" else "Delivery rejected or pending template approval by Meta WhatsApp Cloud API."
    }
