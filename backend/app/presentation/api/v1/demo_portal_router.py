from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.demo_portal_service import (
    DEFAULT_PORTAL_BASE_URL,
    DEMO_VENDOR_SEED,
    OFFICIAL_CONTACT_INFO,
    DemoPortalService,
    get_product_by_id,
    list_all_products,
)
from app.core.database import get_db
from app.infrastructure.db.demo_models import DemoRecordModel

router = APIRouter(prefix="/demo", tags=["INSPEL Demo Portal"])


class VendorRegisterRequest(BaseModel):
    name: str
    company_name: str
    email: str
    mobile: str
    password: str


class VendorLoginRequest(BaseModel):
    user_id: str
    password: str


class CreateOrderRequest(BaseModel):
    product_id: str
    confirmed_amount: bool = False
    idempotency_key: Optional[str] = None


class InitiatePaymentRequest(BaseModel):
    product_id: str
    confirmed_amount: bool = False
    order_ref_id: Optional[int] = None
    idempotency_key: Optional[str] = None


class ContactEnquiryRequest(BaseModel):
    name: str
    company_name: str = ""
    email: str
    mobile: str = ""
    subject: str = "Product Demo Enquiry"
    message: str


async def get_current_demo_vendor(
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> DemoRecordModel:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Vendor authentication required.")
    token = authorization.split(" ", 1)[1].strip()
    return await DemoPortalService.resolve_vendor_from_token(db, token)


@router.get("/health")
async def demo_health():
    return {"status": "OK", "portal": "INSPEL TECHNOLOGIES SOLUTIONS", "table": "demo"}


@router.get("/contact-info")
async def get_contact_info():
    return {"contact": OFFICIAL_CONTACT_INFO}


@router.post("/contact-enquiry")
async def submit_contact_enquiry(
    payload: ContactEnquiryRequest,
    db: AsyncSession = Depends(get_db),
):
    return await DemoPortalService.submit_contact_enquiry(
        db,
        name=payload.name,
        company_name=payload.company_name,
        email=payload.email,
        mobile=payload.mobile,
        subject=payload.subject,
        message=payload.message,
    )


@router.get("/products")
async def get_demo_products():
    return {
        "company": OFFICIAL_CONTACT_INFO["company_name"],
        "currency": "INR",
        "gst_percent": 18.0,
        "products": list_all_products(),
    }


@router.get("/products/{product_id}")
async def get_single_demo_product(product_id: str):
    product = get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return {"product": product}


@router.post("/auth/register")
async def register_demo_vendor(
    payload: VendorRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    return await DemoPortalService.register_vendor(
        db,
        name=payload.name,
        company_name=payload.company_name,
        email=payload.email,
        mobile=payload.mobile,
        password=payload.password,
    )


@router.post("/auth/login")
async def login_demo_vendor(
    payload: VendorLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await DemoPortalService.authenticate_vendor(
        db,
        user_id=payload.user_id,
        password=payload.password,
    )


@router.get("/auth/demo-hint")
async def demo_login_hint(db: AsyncSession = Depends(get_db)):
    """Ensures the hardcoded demo vendor exists and returns public demo reference info."""
    await DemoPortalService.ensure_demo_vendor_seeded(db)
    return {
        "user_id": DEMO_VENDOR_SEED["mobile"],
        "name": DEMO_VENDOR_SEED["name"],
        "email": DEMO_VENDOR_SEED["email"],
    }


@router.get("/auth/me")
async def get_demo_vendor_me(
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
):
    d = dict(vendor.data or {})
    return {
        "vendor": {
            "vendor_ref_id": vendor.ref_id,
            "name": d.get("name", ""),
            "company_name": d.get("company_name", ""),
            "email": d.get("email", ""),
            "mobile": d.get("mobile", vendor.record_code or ""),
            "status": vendor.status,
        }
    }


@router.post("/orders")
async def create_demo_order(
    payload: CreateOrderRequest,
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
    db: AsyncSession = Depends(get_db),
):
    order = await DemoPortalService.create_order(
        db,
        vendor,
        product_id=payload.product_id,
        confirmed_amount=payload.confirmed_amount,
        idempotency_key=payload.idempotency_key,
    )
    return {"order": order}


@router.post("/payments/initiate")
async def initiate_demo_payment(
    payload: InitiatePaymentRequest,
    request: Request,
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
    db: AsyncSession = Depends(get_db),
):
    origin = request.headers.get("origin") or DEFAULT_PORTAL_BASE_URL
    return await DemoPortalService.initiate_bankme_payment(
        db,
        vendor,
        product_id=payload.product_id,
        confirmed_amount=payload.confirmed_amount,
        order_ref_id=payload.order_ref_id,
        idempotency_key=payload.idempotency_key,
        portal_origin=origin,
    )


@router.get("/payments/verify/{reference_id}")
async def verify_demo_payment(
    reference_id: str,
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
    db: AsyncSession = Depends(get_db),
):
    return await DemoPortalService.verify_payment_status(db, vendor, reference_id)


@router.post("/payments/webhook/bankme")
@router.post("/webhook/bankme")
async def receive_bankme_demo_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    raw_body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    return await DemoPortalService.handle_bankme_webhook(
        db,
        raw_body=raw_body,
        headers=headers,
    )


@router.get("/dashboard")
async def get_demo_vendor_dashboard(
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
    db: AsyncSession = Depends(get_db),
):
    return await DemoPortalService.get_vendor_dashboard(db, vendor)


@router.get("/receipt/{reference_id}")
async def get_demo_receipt(
    reference_id: str,
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
    db: AsyncSession = Depends(get_db),
):
    receipt = await DemoPortalService.get_vendor_receipt(db, vendor, reference_id)
    return {"receipt": receipt}


@router.get("/receipt/{reference_id}/download")
async def download_demo_receipt(
    reference_id: str,
    vendor: DemoRecordModel = Depends(get_current_demo_vendor),
    db: AsyncSession = Depends(get_db),
):
    receipt = await DemoPortalService.get_vendor_receipt(db, vendor, reference_id)
    html_content = DemoPortalService.render_receipt_html(receipt)
    filename = f"{receipt.get('receipt_code', reference_id)}.html"
    return HTMLResponse(
        content=html_content,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
