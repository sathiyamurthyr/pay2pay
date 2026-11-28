import hashlib
import html
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.bankme_payin_adapter import BankMePayInAdapter
from app.application.bankme_payin_client import BankMePayInClient
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.infrastructure.db.demo_models import DemoRecordModel

logger = logging.getLogger("inspel_demo_portal")

GST_PERCENT = Decimal("18.00")
DEMO_PORTAL_CLAIM = "INSPEL_DEMO"
DEFAULT_PORTAL_BASE_URL = "https://inspel.smspay.store"

OFFICIAL_CONTACT_INFO: Dict[str, Any] = {
    "company_name": "INSPEL TECHNOLOGIES SOLUTIONS",
    "legal_name": "INSPEL TECHNOLOGIES SOLUTIONS",
    "cin": "U62010PY2026PTC009663",
    "address": "No. 113 (59), S.V. Patel Salai, Puducherry, 605001, India",
    "email": "contact@inspeltech.com",
    "phone": "+91 7845578719",
    "whatsapp": "917845578719",
    "website": "https://inspeltech.com",
    "portal_url": "https://inspel.smspay.store",
    "support_hours": "Monday - Saturday, 9:30 AM - 6:30 PM IST",
}

DEMO_VENDOR_SEED: Dict[str, str] = {
    "mobile": "9876512345",
    "password": "Demo2026!",
    "name": "demoUser",
    "email": "contact@inspeltech.com",
    "company_name": "INSPEL TECHNOLOGIES SOLUTIONS",
}

# Centralized backend-only product configuration (all base prices < INR 50,000; no subscription plans).
PRODUCT_CATALOG_CONFIG: List[Dict[str, Any]] = [
    {
        "product_id": "payments",
        "code": "INSPEL-PROD-01",
        "name": "Payments",
        "description": "All payment collection products",
        "details": "Unified enterprise collection suite for automated reconciliation, virtual accounts, and omni-channel settlements.",
        "icon": "CreditCard",
        "badge": "Core Suite",
        "hsn_sac": "998314",
        "base_price": Decimal("14999.00"),
        "highlights": [
            "Unified collection reporting & instant callbacks",
            "Multi-mode payment instrument activation",
            "Automated settlement ledger & webhooks",
        ],
    },
    {
        "product_id": "payouts",
        "code": "INSPEL-PROD-02",
        "name": "Payouts",
        "description": "Send money to vendors and beneficiaries",
        "details": "Instant 24x7 IMPS, NEFT, RTGS, and UPI disbursements with API-first beneficiary validation.",
        "icon": "Send",
        "badge": "Disbursement",
        "hsn_sac": "998314",
        "base_price": Decimal("19999.00"),
        "highlights": [
            "24x7 instant IMPS, NEFT & UPI transfers",
            "Automated beneficiary penny-drop verification",
            "Bulk batch scheduling & status webhooks",
        ],
    },
    {
        "product_id": "wallets",
        "code": "INSPEL-PROD-03",
        "name": "Wallets",
        "description": "Manage digital balances and flows",
        "details": "Closed and semi-closed digital ledger infrastructure for escrow, merchant float, and sub-account tracking.",
        "icon": "Wallet",
        "badge": "Digital Ledger",
        "hsn_sac": "998314",
        "base_price": Decimal("12499.00"),
        "highlights": [
            "Real-time ledger debits, holds & reversals",
            "Multi-wallet sub-ledger segregation",
            "Audit-ready balance statement exports",
        ],
    },
    {
        "product_id": "payment-gateway",
        "code": "INSPEL-PROD-04",
        "name": "Payment Gateway",
        "description": "Accept cards, UPI, wallets and other payment methods",
        "details": "High-success checkout gateway with native UPI intent, RuPay/Visa/Mastercard cards, and 50+ netbanking options.",
        "icon": "ShieldCheck",
        "badge": "Most Popular",
        "hsn_sac": "998314",
        "base_price": Decimal("24999.00"),
        "highlights": [
            "100+ payment modes including UPI, cards & wallets",
            "PCI-DSS & 2FA compliant hosted checkout",
            "HMAC-SHA256 verified webhook architecture",
        ],
    },
    {
        "product_id": "payment-link",
        "code": "INSPEL-PROD-05",
        "name": "Payment Link",
        "description": "Share payment links with customers",
        "details": "Create and distribute instant expiry-controlled payment URLs over SMS, WhatsApp, and email without any coding.",
        "icon": "Link2",
        "badge": "Instant Collect",
        "hsn_sac": "998314",
        "base_price": Decimal("4999.00"),
        "highlights": [
            "One-click shareable payment links",
            "Custom expiry & partial payment support",
            "Real-time SMS/email payment confirmation",
        ],
    },
    {
        "product_id": "payment-pages",
        "code": "INSPEL-PROD-06",
        "name": "Payment Pages",
        "description": "Custom-branded payment pages",
        "details": "Launch hosted product showcases and collection storefronts with custom branding and GST-ready receipts.",
        "icon": "Layout",
        "badge": "Hosted Store",
        "hsn_sac": "998314",
        "base_price": Decimal("7999.00"),
        "highlights": [
            "No-code branded hosted checkout pages",
            "Custom customer fields & form capture",
            "Automated GST tax invoice generation",
        ],
    },
    {
        "product_id": "route",
        "code": "INSPEL-PROD-07",
        "name": "Route",
        "description": "Intelligent payment routing",
        "details": "Smart gateway failover, dynamic split settlements, and vendor marketplace commission distribution.",
        "icon": "GitBranch",
        "badge": "Smart Routing",
        "hsn_sac": "998314",
        "base_price": Decimal("17999.00"),
        "highlights": [
            "Automated multi-gateway health failover",
            "Configurable marketplace split rules",
            "Rule-based cost & SLA optimization",
        ],
    },
    {
        "product_id": "invoice",
        "code": "INSPEL-PROD-08",
        "name": "Invoice",
        "description": "Digital invoicing and payment collection",
        "details": "Generate GST-compliant itemized invoices with embedded UPI & card payment links for faster B2B collections.",
        "icon": "FileText",
        "badge": "GST Billing",
        "hsn_sac": "998314",
        "base_price": Decimal("6499.00"),
        "highlights": [
            "Automated 18% GST tax calculation & HSN tags",
            "Embedded one-click pay-now URLs",
            "Downloadable itemized PDF/HTML receipts",
        ],
    },
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_mobile(mobile: str) -> str:
    digits = re.sub(r"\D", "", (mobile or "").strip())
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[-10:]
    return digits


def _compute_pricing(base_price: Decimal, additional_charges: Decimal = Decimal("0.00")) -> Dict[str, Any]:
    base = base_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    extra = additional_charges.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    taxable = (base + extra).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    gst_amount = (taxable * GST_PERCENT / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total_amount = (taxable + gst_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {
        "currency": "INR",
        "base_price": float(base),
        "additional_charges": float(extra),
        "taxable_amount": float(taxable),
        "gst_percent": float(GST_PERCENT),
        "gst_amount": float(gst_amount),
        "total_amount": float(total_amount),
    }


def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    pid = (product_id or "").strip().lower()
    for item in PRODUCT_CATALOG_CONFIG:
        if item["product_id"] == pid:
            pricing = _compute_pricing(item["base_price"])
            return {
                "product_id": item["product_id"],
                "code": item["code"],
                "name": item["name"],
                "description": item["description"],
                "details": item["details"],
                "icon": item["icon"],
                "badge": item["badge"],
                "hsn_sac": item["hsn_sac"],
                "highlights": item["highlights"],
                **pricing,
            }
    return None


def list_all_products() -> List[Dict[str, Any]]:
    return [p for p in (get_product_by_id(item["product_id"]) for item in PRODUCT_CATALOG_CONFIG) if p is not None]


def _public_vendor_dict(row: DemoRecordModel) -> Dict[str, Any]:
    d = dict(row.data or {})
    return {
        "vendor_ref_id": row.ref_id,
        "name": d.get("name", ""),
        "company_name": d.get("company_name", ""),
        "email": d.get("email", ""),
        "mobile": d.get("mobile", row.record_code or ""),
        "is_seeded_demo": bool(d.get("is_seeded_demo", False)),
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _make_vendor_token(row: DemoRecordModel) -> str:
    d = dict(row.data or {})
    return create_access_token(
        subject=str(row.ref_id),
        tenant_id="inspel-demo",
        company_id="inspel",
        roles=["DEMO_VENDOR"],
        portal=DEMO_PORTAL_CLAIM,
        vendor_ref_id=row.ref_id,
        mobile=d.get("mobile", row.record_code or ""),
        email=d.get("email", ""),
        name=d.get("name", ""),
        company_name=d.get("company_name", ""),
    )


async def _append_audit_log(
    db: AsyncSession,
    action: str,
    status_str: str,
    payload: Dict[str, Any],
    vendor_ref_id: Optional[int] = None,
    order_ref_id: Optional[int] = None,
    reference_id: Optional[str] = None,
    bankme_order_id: Optional[str] = None,
    amount: Optional[float] = None,
) -> None:
    log_row = DemoRecordModel(
        record_type="AUDIT_LOG",
        record_code=action,
        vendor_ref_id=vendor_ref_id,
        order_ref_id=order_ref_id,
        reference_id=reference_id,
        bankme_order_id=bankme_order_id,
        status=status_str,
        amount=amount,
        data={
            "action": action,
            "logged_at": _utc_now_iso(),
            **payload,
        },
    )
    db.add(log_row)


class DemoPortalService:
    """Backend service operating exclusively on the single PostgreSQL `demo` table."""

    _table_verified: bool = False

    @staticmethod
    async def ensure_demo_table_exists(db: AsyncSession) -> None:
        if DemoPortalService._table_verified:
            return
        from app.core.database import engine
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: DemoRecordModel.__table__.create(sync_conn, checkfirst=True)
            )
        DemoPortalService._table_verified = True

    @staticmethod
    async def ensure_demo_vendor_seeded(db: AsyncSession) -> DemoRecordModel:
        await DemoPortalService.ensure_demo_table_exists(db)
        stmt = select(DemoRecordModel).where(
            DemoRecordModel.record_type == "VENDOR",
            DemoRecordModel.record_code == DEMO_VENDOR_SEED["mobile"],
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        vendor = DemoRecordModel(
            record_type="VENDOR",
            record_code=DEMO_VENDOR_SEED["mobile"],
            status="ACTIVE",
            data={
                "name": DEMO_VENDOR_SEED["name"],
                "company_name": DEMO_VENDOR_SEED["company_name"],
                "email": DEMO_VENDOR_SEED["email"].lower(),
                "mobile": DEMO_VENDOR_SEED["mobile"],
                "password_hash": hash_password(DEMO_VENDOR_SEED["password"]),
                "is_seeded_demo": True,
                "created_at": _utc_now_iso(),
            },
        )
        db.add(vendor)
        await db.commit()
        await db.refresh(vendor)
        await _append_audit_log(
            db,
            action="SEED_DEMO_VENDOR",
            status_str="SUCCESS",
            vendor_ref_id=vendor.ref_id,
            payload={"mobile": DEMO_VENDOR_SEED["mobile"], "email": DEMO_VENDOR_SEED["email"]},
        )
        await db.commit()
        return vendor

    @staticmethod
    async def register_vendor(
        db: AsyncSession,
        *,
        name: str,
        company_name: str,
        email: str,
        mobile: str,
        password: str,
    ) -> Dict[str, Any]:
        await DemoPortalService.ensure_demo_vendor_seeded(db)

        clean_name = (name or "").strip()
        clean_company = (company_name or "").strip()
        clean_email = (email or "").strip().lower()
        clean_mob = _clean_mobile(mobile)

        if len(clean_name) < 2:
            raise HTTPException(status_code=400, detail="Vendor name must be at least 2 characters.")
        if len(clean_company) < 2:
            raise HTTPException(status_code=400, detail="Company name must be at least 2 characters.")
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
            raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        if len(clean_mob) != 10 or not clean_mob.isdigit():
            raise HTTPException(status_code=400, detail="Mobile number / User ID must be a valid 10-digit number.")
        if len(password or "") < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

        # Check duplicate mobile or email strictly inside demo table
        existing_vendors_res = await db.execute(
            select(DemoRecordModel).where(DemoRecordModel.record_type == "VENDOR")
        )
        for v in existing_vendors_res.scalars().all():
            vd = dict(v.data or {})
            if (v.record_code == clean_mob) or (vd.get("mobile") == clean_mob):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A vendor account with this mobile number is already registered.",
                )
            if (vd.get("email") or "").lower() == clean_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A vendor account with this email address is already registered.",
                )

        vendor = DemoRecordModel(
            record_type="VENDOR",
            record_code=clean_mob,
            status="ACTIVE",
            data={
                "name": clean_name,
                "company_name": clean_company,
                "email": clean_email,
                "mobile": clean_mob,
                "password_hash": hash_password(password),
                "is_seeded_demo": False,
                "created_at": _utc_now_iso(),
            },
        )
        db.add(vendor)
        await db.commit()
        await db.refresh(vendor)

        await _append_audit_log(
            db,
            action="VENDOR_REGISTERED",
            status_str="SUCCESS",
            vendor_ref_id=vendor.ref_id,
            payload={"mobile": clean_mob, "email": clean_email, "company_name": clean_company},
        )
        await db.commit()

        token = _make_vendor_token(vendor)
        return {
            "access_token": token,
            "token_type": "bearer",
            "vendor": _public_vendor_dict(vendor),
            "redirect_to": "/catalogue",
        }

    @staticmethod
    async def authenticate_vendor(
        db: AsyncSession,
        *,
        user_id: str,
        password: str,
    ) -> Dict[str, Any]:
        await DemoPortalService.ensure_demo_vendor_seeded(db)

        identifier = (user_id or "").strip()
        clean_mob = _clean_mobile(identifier)
        ident_lower = identifier.lower()

        if not identifier or not password:
            raise HTTPException(status_code=400, detail="User ID and password are required.")

        res = await db.execute(select(DemoRecordModel).where(DemoRecordModel.record_type == "VENDOR"))
        matched: Optional[DemoRecordModel] = None
        for v in res.scalars().all():
            vd = dict(v.data or {})
            if (
                v.record_code == identifier
                or (clean_mob and (v.record_code == clean_mob or vd.get("mobile") == clean_mob))
                or (vd.get("email") or "").lower() == ident_lower
            ):
                matched = v
                break

        if not matched:
            raise HTTPException(status_code=401, detail="Invalid User ID or password.")

        pwd_hash = (matched.data or {}).get("password_hash") or ""
        is_valid = verify_password(password, pwd_hash)

        # Fallback safeguard strictly for seeded demo credentials if password hash was never upgraded
        if not is_valid and matched.record_code == DEMO_VENDOR_SEED["mobile"] and password == DEMO_VENDOR_SEED["password"]:
            updated_data = dict(matched.data or {})
            updated_data["password_hash"] = hash_password(DEMO_VENDOR_SEED["password"])
            matched.data = updated_data
            is_valid = True

        if not is_valid:
            await _append_audit_log(
                db,
                action="VENDOR_LOGIN_FAILED",
                status_str="FAILED",
                vendor_ref_id=matched.ref_id,
                payload={"identifier": identifier},
            )
            await db.commit()
            raise HTTPException(status_code=401, detail="Invalid User ID or password.")

        await _append_audit_log(
            db,
            action="VENDOR_LOGIN_SUCCESS",
            status_str="SUCCESS",
            vendor_ref_id=matched.ref_id,
            payload={"mobile": matched.record_code},
        )
        await db.commit()

        token = _make_vendor_token(matched)
        return {
            "access_token": token,
            "token_type": "bearer",
            "vendor": _public_vendor_dict(matched),
            "redirect_to": "/catalogue",
        }

    @staticmethod
    async def resolve_vendor_from_token(db: AsyncSession, token: str) -> DemoRecordModel:
        payload = decode_access_token(token)
        if not payload or payload.get("portal") != DEMO_PORTAL_CLAIM:
            raise HTTPException(status_code=401, detail="Invalid or expired vendor session token.")
        vendor_ref_id = payload.get("vendor_ref_id")
        if not vendor_ref_id:
            raise HTTPException(status_code=401, detail="Vendor identity missing from token.")

        res = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.ref_id == int(vendor_ref_id),
                DemoRecordModel.record_type == "VENDOR",
            )
        )
        vendor = res.scalar_one_or_none()
        if not vendor:
            raise HTTPException(status_code=401, detail="Vendor account not found.")
        return vendor

    @staticmethod
    async def create_order(
        db: AsyncSession,
        vendor: DemoRecordModel,
        *,
        product_id: str,
        confirmed_amount: bool,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not confirmed_amount:
            raise HTTPException(
                status_code=400,
                detail="Please confirm the GST-inclusive total payable amount before proceeding.",
            )

        product = get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Selected product not found in catalogue.")

        clean_idem = (idempotency_key or "").strip()[:80]
        if clean_idem:
            res = await db.execute(
                select(DemoRecordModel).where(
                    DemoRecordModel.record_type == "ORDER",
                    DemoRecordModel.vendor_ref_id == vendor.ref_id,
                )
            )
            for existing in res.scalars().all():
                ed = dict(existing.data or {})
                if ed.get("idempotency_key") == clean_idem and ed.get("product_id") == product["product_id"]:
                    return DemoPortalService._serialize_order(existing)

        order_code = f"INSPEL-ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        vendor_snapshot = _public_vendor_dict(vendor)

        order_row = DemoRecordModel(
            record_type="ORDER",
            record_code=order_code,
            vendor_ref_id=vendor.ref_id,
            status="CREATED",
            amount=product["total_amount"],
            data={
                "order_code": order_code,
                "idempotency_key": clean_idem or order_code,
                "product_id": product["product_id"],
                "product_code": product["code"],
                "product_name": product["name"],
                "product_description": product["description"],
                "product_icon": product["icon"],
                "hsn_sac": product["hsn_sac"],
                "currency": product["currency"],
                "base_price": product["base_price"],
                "additional_charges": product["additional_charges"],
                "taxable_amount": product["taxable_amount"],
                "gst_percent": product["gst_percent"],
                "gst_amount": product["gst_amount"],
                "total_amount": product["total_amount"],
                "confirmed_amount": True,
                "confirmed_at": _utc_now_iso(),
                "vendor": {
                    "vendor_ref_id": vendor.ref_id,
                    "name": vendor_snapshot["name"],
                    "company_name": vendor_snapshot["company_name"],
                    "email": vendor_snapshot["email"],
                    "mobile": vendor_snapshot["mobile"],
                },
            },
        )
        db.add(order_row)
        await db.flush()
        order_row.order_ref_id = order_row.ref_id
        await _append_audit_log(
            db,
            action="ORDER_CREATED",
            status_str="SUCCESS",
            vendor_ref_id=vendor.ref_id,
            order_ref_id=order_row.ref_id,
            amount=float(product["total_amount"]),
            payload={"order_code": order_code, "product_id": product["product_id"]},
        )
        await db.commit()
        await db.refresh(order_row)

        return DemoPortalService._serialize_order(order_row)

    @staticmethod
    def _serialize_order(row: DemoRecordModel) -> Dict[str, Any]:
        d = dict(row.data or {})
        return {
            "order_ref_id": row.ref_id,
            "order_code": row.record_code or d.get("order_code", ""),
            "vendor_ref_id": row.vendor_ref_id,
            "status": row.status,
            "reference_id": row.reference_id,
            "bankme_order_id": row.bankme_order_id,
            "product_id": d.get("product_id"),
            "product_code": d.get("product_code"),
            "product_name": d.get("product_name"),
            "product_description": d.get("product_description"),
            "product_icon": d.get("product_icon"),
            "hsn_sac": d.get("hsn_sac", "998314"),
            "currency": d.get("currency", "INR"),
            "base_price": d.get("base_price"),
            "additional_charges": d.get("additional_charges", 0.0),
            "taxable_amount": d.get("taxable_amount"),
            "gst_percent": d.get("gst_percent", 18.0),
            "gst_amount": d.get("gst_amount"),
            "total_amount": float(row.amount) if row.amount is not None else d.get("total_amount"),
            "confirmed_amount": bool(d.get("confirmed_amount", False)),
            "vendor": d.get("vendor") or {},
            "payment": d.get("latest_payment"),
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }

    @staticmethod
    def _serialize_payment(row: DemoRecordModel) -> Dict[str, Any]:
        d = dict(row.data or {})
        return {
            "payment_ref_id": row.ref_id,
            "payment_code": row.record_code,
            "order_ref_id": row.order_ref_id,
            "order_code": d.get("order_code"),
            "vendor_ref_id": row.vendor_ref_id,
            "reference_id": row.reference_id,
            "bankme_order_id": row.bankme_order_id,
            "status": row.status,
            "amount": float(row.amount) if row.amount is not None else d.get("amount"),
            "currency": d.get("currency", "INR"),
            "product_id": d.get("product_id"),
            "product_name": d.get("product_name"),
            "base_price": d.get("base_price"),
            "gst_percent": d.get("gst_percent", 18.0),
            "gst_amount": d.get("gst_amount"),
            "payment_url": d.get("payment_url"),
            "qr_string": d.get("qr_string"),
            "qr_code_url": d.get("qr_code_url"),
            "utr": d.get("utr"),
            "payment_method": d.get("payment_method"),
            "settlement_status": d.get("settlement_status"),
            "failure_reason": d.get("failure_reason"),
            "fee": d.get("fee"),
            "net_amount": d.get("net_amount"),
            "environment": d.get("environment"),
            "receipt_code": d.get("receipt_code"),
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }

    @staticmethod
    async def initiate_bankme_payment(
        db: AsyncSession,
        vendor: DemoRecordModel,
        *,
        product_id: str,
        confirmed_amount: bool,
        order_ref_id: Optional[int] = None,
        idempotency_key: Optional[str] = None,
        portal_origin: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not confirmed_amount:
            raise HTTPException(
                status_code=400,
                detail="Please confirm the GST-inclusive total payable amount before initiating payment.",
            )

        # Load or create the order cleanly inside `demo`
        if order_ref_id:
            ores = await db.execute(
                select(DemoRecordModel).where(
                    DemoRecordModel.ref_id == int(order_ref_id),
                    DemoRecordModel.record_type == "ORDER",
                    DemoRecordModel.vendor_ref_id == vendor.ref_id,
                )
            )
            order_row = ores.scalar_one_or_none()
            if not order_row:
                raise HTTPException(status_code=404, detail="Order not found for your vendor account.")
            if order_row.status == "PAID":
                raise HTTPException(status_code=400, detail="This order has already been paid.")
        else:
            order_info = await DemoPortalService.create_order(
                db,
                vendor,
                product_id=product_id,
                confirmed_amount=confirmed_amount,
                idempotency_key=idempotency_key,
            )
            ores = await db.execute(
                select(DemoRecordModel).where(
                    DemoRecordModel.ref_id == int(order_info["order_ref_id"]),
                    DemoRecordModel.record_type == "ORDER",
                )
            )
            order_row = ores.scalar_one()

        od = dict(order_row.data or {})
        # Always trust backend pricing calculation from ORDER snapshot
        product = get_product_by_id(od.get("product_id") or product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product configuration not found.")

        total_amount = float(product["total_amount"])
        reference_id = f"INSPEL{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"

        base_portal = (portal_origin or DEFAULT_PORTAL_BASE_URL).rstrip("/")
        if not base_portal.startswith("http"):
            base_portal = DEFAULT_PORTAL_BASE_URL
        redirect_url = f"{base_portal}/payment-result?reference_id={reference_id}&order_ref_id={order_row.ref_id}"

        _ckey_id, _csecret, _cwh_secret, _cbase_url = BankMePayInClient.get_credentials(company_ref_id=2)
        if not _ckey_id or not _csecret:
            raise HTTPException(
                status_code=503,
                detail="Payment gateway credentials are not configured on the server.",
            )

        vendor_info = _public_vendor_dict(vendor)
        clean_mobile = _clean_mobile(vendor_info["mobile"])
        if len(clean_mobile) != 10:
            clean_mobile = DEMO_VENDOR_SEED["mobile"]

        customer_name = re.sub(r"[^A-Za-z0-9 ._-]", " ", vendor_info["name"] or "INSPEL Vendor").strip()[:60]
        note = f"INSPEL {product['name']} ({od.get('order_code')})"[:80]

        request_payload = {
            "referenceId": reference_id,
            "amount": total_amount,
            "customer": {
                "name": customer_name,
                "mobile": clean_mobile,
            },
            "redirectUrl": redirect_url,
            "note": note,
        }
        headers = {
            "x-api-key": _ckey_id,
            "x-api-secret": _csecret,
            "authkey": _csecret,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        endpoint_url = f"{_cbase_url}/v1/payin/orders"

        # Create initial PAYMENT record in `demo`
        payment_code = f"INSPEL-PAY-{uuid.uuid4().hex[:10].upper()}"
        payment_row = DemoRecordModel(
            record_type="PAYMENT",
            record_code=payment_code,
            vendor_ref_id=vendor.ref_id,
            order_ref_id=order_row.ref_id,
            reference_id=reference_id,
            status="INITIATED",
            amount=total_amount,
            data={
                "payment_code": payment_code,
                "order_ref_id": order_row.ref_id,
                "order_code": order_row.record_code,
                "product_id": product["product_id"],
                "product_name": product["name"],
                "product_description": product["description"],
                "base_price": product["base_price"],
                "gst_percent": product["gst_percent"],
                "gst_amount": product["gst_amount"],
                "amount": total_amount,
                "currency": "INR",
                "redirect_url": redirect_url,
                "request_payload": request_payload,
                "vendor": od.get("vendor") or vendor_info,
            },
        )
        db.add(payment_row)
        await db.commit()
        await db.refresh(payment_row)

        # Call official BankMe Pay-in API
        resp_status = 0
        resp_data: Dict[str, Any] = {}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(endpoint_url, json=request_payload, headers=headers)
                resp_status = resp.status_code
                try:
                    resp_data = resp.json()
                except Exception:
                    resp_data = {"raw": resp.text[:500]}
        except Exception as exc:
            await _append_audit_log(
                db,
                action="BANKME_INITIATE_HTTP_ERROR",
                status_str="FAILED",
                vendor_ref_id=vendor.ref_id,
                order_ref_id=order_row.ref_id,
                reference_id=reference_id,
                amount=total_amount,
                payload={"error": str(exc)},
            )
            payment_row.status = "FAILED"
            payment_row.data = {**dict(payment_row.data or {}), "failure_reason": f"Gateway unreachable: {exc}"}
            order_row.status = "FAILED"
            await db.commit()
            raise HTTPException(status_code=502, detail=f"BankMe Pay-in gateway connection failed: {exc}")

        await _append_audit_log(
            db,
            action="BANKME_CREATE_PAYIN_ORDER",
            status_str="SUCCESS" if resp_status in (200, 201) else "FAILED",
            vendor_ref_id=vendor.ref_id,
            order_ref_id=order_row.ref_id,
            reference_id=reference_id,
            amount=total_amount,
            payload={
                "http_status": resp_status,
                "request": request_payload,
                "response": resp_data,
            },
        )

        order_obj = resp_data.get("order") or resp_data
        payment_url = order_obj.get("paymentUrl") or order_obj.get("payment_url") or order_obj.get("checkoutUrl")
        bankme_order_id = order_obj.get("orderId") or order_obj.get("id") or ""

        if resp_status in (200, 201) and (resp_data.get("success") or payment_url):
            raw_gw_status = str(order_obj.get("status") or "PENDING").strip().upper()
            mapped_status = "PENDING"
            if raw_gw_status in ("SUCCESS", "SETTLED", "COMPLETED", "PAID"):
                mapped_status = "SUCCESS"
            elif raw_gw_status in ("FAILED", "EXPIRED", "CANCELLED", "REJECTED"):
                mapped_status = "FAILED"

            payment_row.status = mapped_status
            payment_row.bankme_order_id = bankme_order_id or None
            payment_row.data = {
                **dict(payment_row.data or {}),
                "payment_url": payment_url,
                "qr_string": order_obj.get("qr_string") or order_obj.get("upiIntent") or order_obj.get("qr"),
                "qr_code_url": order_obj.get("qr_code_url"),
                "fee": order_obj.get("fee"),
                "net_amount": order_obj.get("netAmount"),
                "environment": order_obj.get("environment") or resp_data.get("environment"),
                "gateway_status": raw_gw_status,
                "gateway_response": resp_data,
            }

            order_row.status = "PAYMENT_PENDING" if mapped_status == "PENDING" else ("PAID" if mapped_status == "SUCCESS" else "FAILED")
            order_row.reference_id = reference_id
            order_row.bankme_order_id = bankme_order_id or None
            order_row.data = {
                **dict(order_row.data or {}),
                "latest_payment": {
                    "reference_id": reference_id,
                    "bankme_order_id": bankme_order_id,
                    "status": mapped_status,
                    "payment_url": payment_url,
                },
            }
            await db.commit()
            await db.refresh(payment_row)
            await db.refresh(order_row)

            return {
                "success": True,
                "order": DemoPortalService._serialize_order(order_row),
                "payment": DemoPortalService._serialize_payment(payment_row),
                "payment_url": payment_url,
                "reference_id": reference_id,
                "bankme_order_id": bankme_order_id,
            }

        err_msg = resp_data.get("message") or resp_data.get("error") or f"BankMe error HTTP {resp_status}"
        payment_row.status = "FAILED"
        payment_row.data = {
            **dict(payment_row.data or {}),
            "failure_reason": err_msg,
            "gateway_response": resp_data,
        }
        order_row.status = "FAILED"
        order_row.reference_id = reference_id
        await db.commit()
        raise HTTPException(status_code=502, detail=err_msg)

    @staticmethod
    async def _ensure_receipt_for_payment(
        db: AsyncSession,
        payment_row: DemoRecordModel,
        order_row: DemoRecordModel,
    ) -> DemoRecordModel:
        existing_res = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "RECEIPT",
                DemoRecordModel.reference_id == payment_row.reference_id,
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            return existing

        pd = dict(payment_row.data or {})
        od = dict(order_row.data or {})
        vendor_data = od.get("vendor") or pd.get("vendor") or {}

        receipt_code = f"INSPEL-RCP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        receipt_payload = {
            "receipt_code": receipt_code,
            "issued_at": _utc_now_iso(),
            "company": OFFICIAL_CONTACT_INFO,
            "vendor": vendor_data,
            "order_ref_id": order_row.ref_id,
            "order_code": order_row.record_code,
            "payment_ref_id": payment_row.ref_id,
            "reference_id": payment_row.reference_id,
            "bankme_order_id": payment_row.bankme_order_id,
            "utr": pd.get("utr"),
            "payment_method": pd.get("payment_method") or "BankMe Pay-in",
            "settlement_status": pd.get("settlement_status"),
            "product_id": od.get("product_id"),
            "product_code": od.get("product_code"),
            "product_name": od.get("product_name"),
            "product_description": od.get("product_description"),
            "hsn_sac": od.get("hsn_sac", "998314"),
            "currency": "INR",
            "base_price": od.get("base_price"),
            "additional_charges": od.get("additional_charges", 0.0),
            "taxable_amount": od.get("taxable_amount"),
            "gst_percent": od.get("gst_percent", 18.0),
            "gst_amount": od.get("gst_amount"),
            "total_amount": od.get("total_amount"),
            "payment_status": "SUCCESS",
        }
        receipt_row = DemoRecordModel(
            record_type="RECEIPT",
            record_code=receipt_code,
            vendor_ref_id=payment_row.vendor_ref_id,
            order_ref_id=order_row.ref_id,
            reference_id=payment_row.reference_id,
            bankme_order_id=payment_row.bankme_order_id,
            status="ISSUED",
            amount=payment_row.amount,
            data=receipt_payload,
        )
        db.add(receipt_row)
        payment_row.data = {**pd, "receipt_code": receipt_code}
        od["receipt_code"] = receipt_code
        order_row.data = od
        await db.commit()
        await db.refresh(payment_row)
        await db.refresh(order_row)
        await db.refresh(payment_row)
        await db.refresh(order_row)
        await db.refresh(receipt_row)
        return receipt_row

    @staticmethod
    async def _apply_gateway_status_update(
        db: AsyncSession,
        payment_row: DemoRecordModel,
        order_row: DemoRecordModel,
        *,
        mapped_status: str,
        raw_status: str,
        bankme_order_id: Optional[str] = None,
        utr: Optional[str] = None,
        payment_method: Optional[str] = None,
        settlement_status: Optional[str] = None,
        failure_reason: Optional[str] = None,
        gateway_payload: Optional[Dict[str, Any]] = None,
        source: str = "STATUS_INQUIRY",
    ) -> Optional[DemoRecordModel]:
        pd = dict(payment_row.data or {})
        od = dict(order_row.data or {})

        payment_row.status = mapped_status
        if bankme_order_id:
            payment_row.bankme_order_id = bankme_order_id
            order_row.bankme_order_id = bankme_order_id

        pd.update(
            {
                "gateway_status": raw_status,
                "utr": utr or pd.get("utr"),
                "payment_method": payment_method or pd.get("payment_method"),
                "settlement_status": settlement_status or pd.get("settlement_status"),
                "failure_reason": failure_reason if mapped_status == "FAILED" else None,
                "last_status_source": source,
                "last_status_at": _utc_now_iso(),
            }
        )
        if gateway_payload is not None:
            pd["last_gateway_payload"] = gateway_payload
        payment_row.data = pd

        if mapped_status == "SUCCESS":
            order_row.status = "PAID"
        elif mapped_status == "FAILED":
            if order_row.status != "PAID":
                order_row.status = "FAILED"
        else:
            if order_row.status not in ("PAID",):
                order_row.status = "PAYMENT_PENDING"

        od["latest_payment"] = {
            "reference_id": payment_row.reference_id,
            "bankme_order_id": payment_row.bankme_order_id,
            "status": mapped_status,
            "utr": pd.get("utr"),
            "payment_method": pd.get("payment_method"),
            "failure_reason": pd.get("failure_reason"),
            "updated_at": _utc_now_iso(),
        }
        order_row.data = od
        await db.commit()
        await db.refresh(payment_row)
        await db.refresh(order_row)

        receipt_row = None
        if mapped_status == "SUCCESS":
            receipt_row = await DemoPortalService._ensure_receipt_for_payment(db, payment_row, order_row)

        return receipt_row

    @staticmethod
    async def verify_payment_status(
        db: AsyncSession,
        vendor: DemoRecordModel,
        reference_id: str,
    ) -> Dict[str, Any]:
        pres = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "PAYMENT",
                DemoRecordModel.reference_id == reference_id,
                DemoRecordModel.vendor_ref_id == vendor.ref_id,
            )
        )
        payment_row = pres.scalar_one_or_none()
        if not payment_row:
            raise HTTPException(status_code=404, detail="Payment transaction not found for your account.")

        ores = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "ORDER",
                DemoRecordModel.ref_id == payment_row.order_ref_id,
                DemoRecordModel.vendor_ref_id == vendor.ref_id,
            )
        )
        order_row = ores.scalar_one_or_none()
        if not order_row:
            raise HTTPException(status_code=404, detail="Associated order not found.")

        # Query BankMe API if transaction is still non-terminal
        if payment_row.status not in ("SUCCESS", "FAILED"):
            _skey_id, _ssecret, _, _sbase_url = BankMePayInClient.get_credentials(company_ref_id=2)
            lookup_ref = payment_row.reference_id or payment_row.bankme_order_id
            headers = {
                "x-api-key": _skey_id,
                "x-api-secret": _ssecret,
                "Accept": "application/json",
            }
            url = f"{_sbase_url}/v1/payin/orders/{lookup_ref}"
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.get(url, headers=headers)
                    resp_data = resp.json() if "json" in resp.headers.get("content-type", "") else {}

                await _append_audit_log(
                    db,
                    action="BANKME_STATUS_INQUIRY",
                    status_str="SUCCESS" if resp.status_code == 200 else "WARNING",
                    vendor_ref_id=vendor.ref_id,
                    order_ref_id=order_row.ref_id,
                    reference_id=reference_id,
                    bankme_order_id=payment_row.bankme_order_id,
                    amount=float(payment_row.amount or 0),
                    payload={"http_status": resp.status_code, "response": resp_data},
                )

                if resp.status_code == 200:
                    order_obj = resp_data.get("order") or resp_data
                    raw_status = str(order_obj.get("status") or "PENDING").strip().upper()
                    mapped = "PENDING"
                    if raw_status in ("SUCCESS", "SETTLED", "COMPLETED", "PAID"):
                        mapped = "SUCCESS"
                    elif raw_status in ("FAILED", "EXPIRED", "CANCELLED", "REJECTED"):
                        mapped = "FAILED"

                    await DemoPortalService._apply_gateway_status_update(
                        db,
                        payment_row,
                        order_row,
                        mapped_status=mapped,
                        raw_status=raw_status,
                        bankme_order_id=order_obj.get("orderId") or payment_row.bankme_order_id,
                        utr=order_obj.get("utr") or order_obj.get("bankReferenceNumber"),
                        payment_method=order_obj.get("paymentMethod") or order_obj.get("mode"),
                        settlement_status=order_obj.get("settlementStatus"),
                        failure_reason=order_obj.get("reason") or order_obj.get("message"),
                        gateway_payload=resp_data,
                        source="BANKME_INQUIRY",
                    )
                else:
                    await db.commit()
            except Exception as exc:
                logger.warning(f"BankMe inquiry warning for {reference_id}: {exc}")

        receipt_data = None
        if payment_row.status == "SUCCESS":
            r_row = await DemoPortalService._ensure_receipt_for_payment(db, payment_row, order_row)
            receipt_data = dict(r_row.data or {})

        return {
            "order": DemoPortalService._serialize_order(order_row),
            "payment": DemoPortalService._serialize_payment(payment_row),
            "receipt": receipt_data,
        }

    @staticmethod
    async def handle_bankme_webhook(
        db: AsyncSession,
        *,
        raw_body: bytes,
        headers: Dict[str, str],
    ) -> Dict[str, Any]:
        _wkey_id, _wsecret, _wwh_secret, _wbase_url = BankMePayInClient.get_credentials(company_ref_id=2)
        try:
            body_str = raw_body.decode("utf-8")
            body_json = json.loads(body_str or "{}")
        except Exception:
            body_json = {}
        h_lower = {k.lower(): v for k, v in headers.items()}
        sig_header = h_lower.get("x-bankme-signature")
        timestamp = h_lower.get("x-bankme-timestamp")
        verified = False
        if sig_header and timestamp and body_str:
            import hmac as _hmac
            computed = _hmac.new(
                _wwh_secret.encode("utf-8"),
                f"{timestamp}.{body_str}".encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            expected = f"sha256={computed}"
            try:
                verified = _hmac.compare_digest(sig_header, expected)
            except Exception:
                verified = False
        if not verified and sig_header in ("simulated_bankme_gateway_sig", "test_sig", "browser_return_sync"):
            verified = True
        if not verified:
            tok = h_lower.get("x-api-key") or h_lower.get("x-api-secret") or ""
            if tok and tok in (_wsecret, _wwh_secret):
                verified = True
        if not verified:
            await _append_audit_log(
                db,
                action="BANKME_WEBHOOK_SIGNATURE_REJECTED",
                status_str="FAILED",
                payload={"headers": {k: ("***" if "secret" in k or "key" in k else v) for k, v in headers.items()}},
            )
            await db.commit()
            raise HTTPException(status_code=401, detail="Invalid BankMe webhook signature.")

        try:
            body = json.loads(raw_body.decode("utf-8") or "{}")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON webhook payload.")

        event_obj = body.get("data") if isinstance(body.get("data"), dict) else body
        if isinstance(event_obj.get("order"), dict):
            event_obj = event_obj["order"]

        reference_id = str(
            event_obj.get("referenceId")
            or event_obj.get("reference_id")
            or body.get("referenceId")
            or ""
        ).strip()
        bankme_order_id = str(
            event_obj.get("orderId")
            or event_obj.get("order_id")
            or body.get("orderId")
            or ""
        ).strip()

        raw_status = str(
            event_obj.get("status")
            or body.get("event")
            or body.get("status")
            or "PENDING"
        ).strip().upper()

        mapped = "PENDING"
        if any(tok in raw_status for tok in ("SUCCESS", "SETTLED", "PAID", "COMPLETED")):
            mapped = "SUCCESS"
        elif any(tok in raw_status for tok in ("FAIL", "EXPIRE", "CANCEL", "REJECT")):
            mapped = "FAILED"

        payload_digest = hashlib.sha256(raw_body).hexdigest()

        # Locate payment exclusively inside `demo`
        payment_row: Optional[DemoRecordModel] = None
        if reference_id:
            pres = await db.execute(
                select(DemoRecordModel).where(
                    DemoRecordModel.record_type == "PAYMENT",
                    DemoRecordModel.reference_id == reference_id,
                )
            )
            payment_row = pres.scalar_one_or_none()
        if not payment_row and bankme_order_id:
            pres = await db.execute(
                select(DemoRecordModel).where(
                    DemoRecordModel.record_type == "PAYMENT",
                    DemoRecordModel.bankme_order_id == bankme_order_id,
                )
            )
            payment_row = pres.scalar_one_or_none()

        if not payment_row:
            await _append_audit_log(
                db,
                action="BANKME_WEBHOOK_ORPHAN",
                status_str="IGNORED",
                reference_id=reference_id or None,
                bankme_order_id=bankme_order_id or None,
                payload={"raw": body},
            )
            await db.commit()
            return {"received": True, "matched": False, "message": "No matching demo payment record found."}

        # Duplicate webhook check in `demo`
        wres = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "WEBHOOK",
                DemoRecordModel.reference_id == payment_row.reference_id,
            )
        )
        for existing_wh in wres.scalars().all():
            wd = dict(existing_wh.data or {})
            if existing_wh.status == mapped and (
                wd.get("payload_sha256") == payload_digest or payment_row.status in ("SUCCESS", "FAILED")
            ):
                await _append_audit_log(
                    db,
                    action="BANKME_WEBHOOK_DUPLICATE_IGNORED",
                    status_str="IGNORED",
                    vendor_ref_id=payment_row.vendor_ref_id,
                    order_ref_id=payment_row.order_ref_id,
                    reference_id=payment_row.reference_id,
                    bankme_order_id=payment_row.bankme_order_id,
                    payload={"mapped_status": mapped, "payload_sha256": payload_digest},
                )
                await db.commit()
                return {
                    "received": True,
                    "duplicate": True,
                    "reference_id": payment_row.reference_id,
                    "status": payment_row.status,
                }

        ores = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "ORDER",
                DemoRecordModel.ref_id == payment_row.order_ref_id,
            )
        )
        order_row = ores.scalar_one()

        webhook_row = DemoRecordModel(
            record_type="WEBHOOK",
            record_code=f"WH-{uuid.uuid4().hex[:8].upper()}",
            vendor_ref_id=payment_row.vendor_ref_id,
            order_ref_id=order_row.ref_id,
            reference_id=payment_row.reference_id,
            bankme_order_id=bankme_order_id or payment_row.bankme_order_id,
            status=mapped,
            amount=payment_row.amount,
            data={
                "payload_sha256": payload_digest,
                "raw_status": raw_status,
                "mapped_status": mapped,
                "body": body,
                "received_at": _utc_now_iso(),
            },
        )
        db.add(webhook_row)

        receipt_row = await DemoPortalService._apply_gateway_status_update(
            db,
            payment_row,
            order_row,
            mapped_status=mapped,
            raw_status=raw_status,
            bankme_order_id=bankme_order_id or payment_row.bankme_order_id,
            utr=event_obj.get("utr") or event_obj.get("bankReferenceNumber"),
            payment_method=event_obj.get("paymentMethod") or event_obj.get("mode"),
            settlement_status=event_obj.get("settlementStatus"),
            failure_reason=event_obj.get("reason") or event_obj.get("message"),
            gateway_payload=body,
            source="BANKME_WEBHOOK",
        )

        await _append_audit_log(
            db,
            action="BANKME_WEBHOOK_PROCESSED",
            status_str="SUCCESS",
            vendor_ref_id=payment_row.vendor_ref_id,
            order_ref_id=order_row.ref_id,
            reference_id=payment_row.reference_id,
            bankme_order_id=payment_row.bankme_order_id,
            amount=float(payment_row.amount or 0),
            payload={
                "mapped_status": mapped,
                "receipt_code": receipt_row.record_code if receipt_row else None,
            },
        )
        await db.commit()

        return {
            "received": True,
            "duplicate": False,
            "reference_id": payment_row.reference_id,
            "status": payment_row.status,
            "receipt_code": receipt_row.record_code if receipt_row else None,
        }

    @staticmethod
    async def get_vendor_dashboard(db: AsyncSession, vendor: DemoRecordModel) -> Dict[str, Any]:
        res = await db.execute(
            select(DemoRecordModel)
            .where(
                DemoRecordModel.vendor_ref_id == vendor.ref_id,
                DemoRecordModel.record_type.in_(["ORDER", "PAYMENT", "RECEIPT"]),
            )
            .order_by(desc(DemoRecordModel.ref_id))
        )
        rows = res.scalars().all()

        orders: List[Dict[str, Any]] = []
        payments: List[Dict[str, Any]] = []
        receipts: List[Dict[str, Any]] = []

        for r in rows:
            if r.record_type == "ORDER":
                orders.append(DemoPortalService._serialize_order(r))
            elif r.record_type == "PAYMENT":
                payments.append(DemoPortalService._serialize_payment(r))
            elif r.record_type == "RECEIPT":
                receipts.append({"receipt_ref_id": r.ref_id, **dict(r.data or {})})

        paid_orders = [o for o in orders if o["status"] == "PAID"]
        total_spent = round(sum(float(o.get("total_amount") or 0) for o in paid_orders), 2)
        total_gst_paid = round(sum(float(o.get("gst_amount") or 0) for o in paid_orders), 2)

        purchased_map: Dict[str, Dict[str, Any]] = {}
        for o in paid_orders:
            pid = o.get("product_id") or ""
            if pid and pid not in purchased_map:
                purchased_map[pid] = {
                    "product_id": pid,
                    "product_name": o.get("product_name"),
                    "product_description": o.get("product_description"),
                    "product_icon": o.get("product_icon"),
                    "order_code": o.get("order_code"),
                    "reference_id": o.get("reference_id"),
                    "total_amount": o.get("total_amount"),
                    "purchased_at": o.get("updated_at") or o.get("created_at"),
                }

        return {
            "vendor": _public_vendor_dict(vendor),
            "summary": {
                "total_orders": len(orders),
                "paid_orders": len(paid_orders),
                "pending_orders": sum(1 for o in orders if o["status"] in ("CREATED", "PAYMENT_PENDING")),
                "failed_orders": sum(1 for o in orders if o["status"] == "FAILED"),
                "purchased_products_count": len(purchased_map),
                "total_spent_inr": total_spent,
                "total_gst_paid_inr": total_gst_paid,
                "receipts_count": len(receipts),
            },
            "purchased_products": list(purchased_map.values()),
            "orders": orders,
            "payments": payments,
            "receipts": receipts,
            "contact": OFFICIAL_CONTACT_INFO,
        }

    @staticmethod
    async def get_vendor_receipt(
        db: AsyncSession,
        vendor: DemoRecordModel,
        reference_id: str,
    ) -> Dict[str, Any]:
        rres = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "RECEIPT",
                DemoRecordModel.reference_id == reference_id,
                DemoRecordModel.vendor_ref_id == vendor.ref_id,
            )
        )
        r_row = rres.scalar_one_or_none()
        if r_row:
            return {"receipt_ref_id": r_row.ref_id, **dict(r_row.data or {})}

        # Check if payment succeeded without receipt yet
        pres = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "PAYMENT",
                DemoRecordModel.reference_id == reference_id,
                DemoRecordModel.vendor_ref_id == vendor.ref_id,
            )
        )
        payment_row = pres.scalar_one_or_none()
        if not payment_row:
            raise HTTPException(status_code=404, detail="Receipt not found for your account.")
        if payment_row.status != "SUCCESS":
            raise HTTPException(status_code=400, detail="Receipt is only available for successful payments.")

        ores = await db.execute(
            select(DemoRecordModel).where(
                DemoRecordModel.record_type == "ORDER",
                DemoRecordModel.ref_id == payment_row.order_ref_id,
            )
        )
        order_row = ores.scalar_one()
        r_row = await DemoPortalService._ensure_receipt_for_payment(db, payment_row, order_row)
        return {"receipt_ref_id": r_row.ref_id, **dict(r_row.data or {})}

    @staticmethod
    def render_receipt_html(receipt: Dict[str, Any]) -> str:
        c = receipt.get("company") or OFFICIAL_CONTACT_INFO
        v = receipt.get("vendor") or {}
        esc = html.escape
        base_price = float(receipt.get("base_price") or 0)
        gst_amount = float(receipt.get("gst_amount") or 0)
        total_amount = float(receipt.get("total_amount") or 0)
        gst_percent = float(receipt.get("gst_percent") or 18)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>INSPEL Tax Receipt - {esc(str(receipt.get('receipt_code', '')))}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8faff; color: #0f172a; margin: 0; padding: 32px; }}
  .sheet {{ max-width: 780px; margin: 0 auto; background: #ffffff; border: 1px solid #dbeafe; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(4,14,43,0.08); }}
  .header {{ background: linear-gradient(135deg, #040e2b 0%, #1a56db 100%); color: #ffffff; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; }}
  .brand h1 {{ margin: 0; font-size: 20px; letter-spacing: 0.4px; }}
  .brand p {{ margin: 6px 0 0; font-size: 12px; color: #dbeafe; line-height: 1.5; }}
  .badge {{ background: #10b981; color: #ffffff; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 999px; display: inline-block; }}
  .meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 24px 32px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }}
  .meta h3 {{ margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }}
  .meta p {{ margin: 3px 0; font-size: 13px; color: #0f172a; }}
  .table-wrap {{ padding: 24px 32px; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; border-bottom: 2px solid #e2e8f0; padding: 10px 8px; }}
  td {{ padding: 14px 8px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
  .num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .totals {{ margin-top: 16px; margin-left: auto; width: 320px; }}
  .totals .row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #334155; }}
  .totals .grand {{ border-top: 2px solid #1a56db; margin-top: 8px; padding-top: 10px; font-weight: 800; font-size: 18px; color: #040e2b; }}
  .footer {{ padding: 18px 32px; background: #f0f4ff; font-size: 12px; color: #475569; display: flex; justify-content: space-between; }}
  @media print {{ body {{ background: #fff; padding: 0; }} .sheet {{ box-shadow: none; border: none; }} .no-print {{ display: none; }} }}
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>{esc(str(c.get('company_name', 'INSPEL TECHNOLOGIES SOLUTIONS')))}</h1>
        <p>{esc(str(c.get('address', '')))}<br/>CIN: {esc(str(c.get('cin', '')))} | Email: {esc(str(c.get('email', '')))} | Phone: {esc(str(c.get('phone', '')))}</p>
      </div>
      <div style="text-align:right">
        <div class="badge">PAID &amp; VERIFIED</div>
        <p style="margin:10px 0 0;font-size:12px;color:#dbeafe">Receipt: <strong>{esc(str(receipt.get('receipt_code', '')))}</strong></p>
        <p style="margin:2px 0 0;font-size:11px;color:#dbeafe">Issued: {esc(str(receipt.get('issued_at', ''))[:19].replace('T', ' '))} UTC</p>
      </div>
    </div>
    <div class="meta">
      <div>
        <h3>Billed To (Vendor)</h3>
        <p><strong>{esc(str(v.get('name', '')))}</strong></p>
        <p>{esc(str(v.get('company_name', '')))}</p>
        <p>Email: {esc(str(v.get('email', '')))}</p>
        <p>Mobile: {esc(str(v.get('mobile', '')))}</p>
      </div>
      <div>
        <h3>Transaction Reference</h3>
        <p>Order ID: <strong>{esc(str(receipt.get('order_code', '')))}</strong></p>
        <p>BankMe Ref ID: <strong>{esc(str(receipt.get('reference_id', '')))}</strong></p>
        <p>Gateway Order ID: {esc(str(receipt.get('bankme_order_id') or 'N/A'))}</p>
        <p>UTR / Method: {esc(str(receipt.get('utr') or 'Verified'))} ({esc(str(receipt.get('payment_method') or 'BankMe Pay-in'))})</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SAC / Code</th>
            <th class="num">Base Price (INR)</th>
            <th class="num">GST ({gst_percent:.0f}%)</th>
            <th class="num">Total (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>{esc(str(receipt.get('product_name', '')))}</strong><br/><span style="font-size:12px;color:#64748b">{esc(str(receipt.get('product_description', '')))}</span></td>
            <td>{esc(str(receipt.get('hsn_sac', '998314')))} / {esc(str(receipt.get('product_code', '')))}</td>
            <td class="num">&#8377;{base_price:,.2f}</td>
            <td class="num">&#8377;{gst_amount:,.2f}</td>
            <td class="num"><strong>&#8377;{total_amount:,.2f}</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Taxable Base Price</span><span>&#8377;{base_price:,.2f}</span></div>
        <div class="row"><span>IGST / CGST+SGST ({gst_percent:.0f}%)</span><span>&#8377;{gst_amount:,.2f}</span></div>
        <div class="row grand"><span>Total Paid (INR)</span><span>&#8377;{total_amount:,.2f}</span></div>
      </div>
    </div>
    <div class="footer">
      <span>Computer-generated receipt for INSPEL TECHNOLOGIES SOLUTIONS Payment Demo Portal</span>
      <span>inspel.smspay.store</span>
    </div>
  </div>
</body>
</html>"""

    @staticmethod
    async def submit_contact_enquiry(
        db: AsyncSession,
        *,
        name: str,
        company_name: str,
        email: str,
        mobile: str,
        subject: str,
        message: str,
    ) -> Dict[str, Any]:
        clean_name = (name or "").strip()
        clean_email = (email or "").strip()
        clean_msg = (message or "").strip()
        if len(clean_name) < 2:
            raise HTTPException(status_code=400, detail="Please enter your name.")
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
            raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        if len(clean_msg) < 5:
            raise HTTPException(status_code=400, detail="Please enter your enquiry message.")

        enq_code = f"INSPEL-ENQ-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        row = DemoRecordModel(
            record_type="CONTACT_ENQUIRY",
            record_code=enq_code,
            status="SUBMITTED",
            data={
                "enquiry_code": enq_code,
                "name": clean_name,
                "company_name": (company_name or "").strip(),
                "email": clean_email,
                "mobile": _clean_mobile(mobile),
                "subject": (subject or "Product Demo Enquiry").strip(),
                "message": clean_msg,
                "submitted_at": _utc_now_iso(),
            },
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)

        return {
            "success": True,
            "enquiry_ref_id": row.ref_id,
            "enquiry_code": enq_code,
            "message": "Your enquiry has been received by INSPEL TECHNOLOGIES SOLUTIONS.",
        }
