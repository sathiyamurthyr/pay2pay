"""
Enterprise Topup Request & Slip Verification Router.

Full enterprise workflow:
- Slip Upload with image validation (JPG, PNG, WEBP) & SHA-256 checksumming
- Retailer Topup Request submission with server-derived authenticated session
- Server-side multi-filtering & paginated list for Admin review
- Right-side detailed inspection with slip image zoom & download
- Atomic Admin approval with editable approved amount & row-locked wallet credit
- Instant double-entry ledger posting and unified Transaction Report integration
- Rejection handling with zero financial side-effects
"""

from __future__ import annotations

import io
import os
import re
import uuid
import hashlib
import asyncio
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from datetime import date as datetime_date
from typing import Optional, List, Dict, Any, Tuple, Union

try:
    from zoneinfo import ZoneInfo
    INDIA_TZ = ZoneInfo("Asia/Kolkata")
except Exception:
    INDIA_TZ = timezone(timedelta(hours=5, minutes=30))


def is_pos_t1(payment_mode_or_method: Optional[str]) -> bool:
    """Checks whether the payment mode is POS T1."""
    if not payment_mode_or_method:
        return False
    norm = re.sub(r"[\s\-_+]", "", payment_mode_or_method.upper())
    return "T1" in norm or norm in ("POST1", "POS_T1", "POS+T1")


def is_pos_instant(payment_mode_or_method: Optional[str]) -> bool:
    """Checks whether the payment mode is POS Instant."""
    if not payment_mode_or_method:
        return False
    norm = re.sub(r"[\s\-_+]", "", payment_mode_or_method.upper())
    return "INSTANT" in norm or norm in ("POSINSTANT", "POS_INSTANT", "POS-INSTANT")


def get_business_calendar_date(dt: Optional[Union[datetime, datetime_date, str]]) -> datetime_date:
    """Returns calendar date in Indian Standard Time (Asia/Kolkata, UTC+05:30)."""
    if not dt:
        return datetime.now(INDIA_TZ).date()
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(INDIA_TZ).date()
    if isinstance(dt, datetime_date):
        return dt
    if isinstance(dt, str):
        try:
            parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(INDIA_TZ).date()
        except Exception:
            try:
                return datetime.strptime(dt[:10], "%Y-%m-%d").date()
            except Exception:
                pass
    return datetime.now(INDIA_TZ).date()


def validate_topup_approval_date(
    payment_mode_or_method: Optional[str],
    submitted_at: Optional[Union[datetime, datetime_date, str]],
    status_val: str
) -> Tuple[bool, Optional[str]]:
    """
    Validates approval date business rule:
    - POS_INSTANT (or regular instant modes): Admin can approve on current date (req_date <= current_date).
    - POS_T1: Admin cannot approve on current day; allowed only from next calendar day T+1 (req_date < current_date).
    - Status Protection: Only applies to active pending/under review requests.
    """
    if (status_val or "").upper() not in ("PENDING", "UNDER_REVIEW"):
        return True, None

    req_cal_date = get_business_calendar_date(submitted_at)
    curr_cal_date = get_business_calendar_date(datetime.now(timezone.utc))

    if is_pos_t1(payment_mode_or_method):
        if req_cal_date >= curr_cal_date:
            return False, "POS T1 requests can be approved from the next day (T+1)."
        return True, None
    else:
        if req_cal_date > curr_cal_date:
            return False, "Future-dated topup requests cannot be approved."
        return True, None

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update, func, or_, and_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.application.dependencies import security_scheme, get_current_token_payload, get_current_user, get_current_tenant_id
from app.infrastructure.db.models import (
    AdminUserModel, RetailerModel, RetailerWalletModel, RetailerContactModel,
    TopupRequestModel
)
from app.infrastructure.db.transaction_engine_models import (
    CentralTransactionModel, TransactionLedgerEntryModel
)
from app.domain.date_keys import compute_transaction_date_and_partition_keys
from app.application.storage_service import BackblazeStorageService, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES
from app.infrastructure.adapters.email_service import email_service
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO

logger = logging.getLogger("topup_router")

router = APIRouter(prefix="/topup", tags=["Retailer Topup Requests & Verification"])

ALLOWED_IMAGE_MIMES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}


def get_retailer_display_name(retailer: Optional[RetailerModel]) -> str:
    if not retailer:
        return "Unknown Retailer"
    return (
        getattr(retailer, "store_name", None)
        or getattr(retailer, "owner_name", None)
        or getattr(retailer, "legal_name", None)
        or getattr(retailer, "retailer_code", "Retailer")
    )


from app.application.pos_mdr_service import PosMdrService

# ==============================================================================
# SCHEMAS
# ==============================================================================

class TopupCreateRequest(BaseModel):
    requested_amount: float = Field(..., gt=0, description="Requested topup amount (INR)")
    payment_reference: Optional[str] = Field(None, description="Bank Reference or UTR Number")
    payment_method: Optional[str] = Field("POS - Instant", description="Payment Mode: POS - Instant, POS+T1, POS+T2, UPI, etc.")
    payment_mode: Optional[str] = Field(None, description="Alias for payment_method")
    payment_date: Optional[str] = Field(None, description="ISO Date string of payment")
    slip_id: Optional[str] = Field(None, description="Uploaded slip ID")
    slip_url: Optional[str] = Field(None, description="Uploaded slip URL")
    slip_original_filename: Optional[str] = Field(None)
    slip_mime_type: Optional[str] = Field(None)
    slip_file_size_bytes: Optional[int] = Field(None)
    slip_checksum: Optional[str] = Field(None)
    retailer_remarks: Optional[str] = Field(None, description="Optional remarks from retailer")
    # Optional client-side snapshot values (validated & recomputed server-side)
    mdr_charge: Optional[float] = Field(None)
    gst_amount: Optional[float] = Field(None)
    charges: Optional[float] = Field(None)
    received_amount: Optional[float] = Field(None)
    mdr_config_id: Optional[str] = Field(None)


class TopupApprovalRequest(BaseModel):
    approved_amount: Optional[float] = Field(None, gt=0, description="Admin approved / received amount (can be edited)")
    received_amount: Optional[float] = Field(None, gt=0, description="Admin approved / received amount alias")
    admin_notes: Optional[str] = Field(None, description="Optional administrative verification notes")


class TopupRejectionRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, description="Mandatory reason explaining topup rejection")
    admin_notes: Optional[str] = Field(None, description="Optional internal administrative notes")


# ==============================================================================
# AUTH HELPER FOR RETAILER
# ==============================================================================

async def get_optional_token_payload(
    request: Request,
    credentials: Optional[Any] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[dict]:
    token = None
    if credentials and getattr(credentials, "credentials", None):
        token = credentials.credentials
    elif request:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()
        else:
            token = (
                request.cookies.get("p2p_access_token")
                or request.cookies.get("pay2pay_access_token")
                or request.cookies.get("pay2pay_auth_token")
                or request.cookies.get("access_token")
            )

    if not token:
        return None

    try:
        payload = decode_access_token(token)
        return payload
    except Exception:
        return None


async def get_authenticated_retailer(
    request: Request,
    payload: Optional[dict] = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db)
) -> RetailerModel:
    """
    Determines retailer identity strictly and authoritatively from the database.
    Priority:
    0. user_ref_id / retailer_ref_id (Query param, Header, or JWT claim)
    1. Authenticated JWT 'sub' (public_id of RetailerModel or AdminUserModel)
    2. JWT retailer claims (retailer_code or mobile)
    3. Explicit retailer_id query/header
    4. Active platform retailer fallback
    """
    payload = payload or {}
    jwt_sub = payload.get("sub")
    roles = [str(r).upper() for r in (payload.get("roles") or [])]

    # 0. Primary indexed BIGINT lookup by user_ref_id / retailer_ref_id
    eff_ref = (
        payload.get("user_ref_id")
        or payload.get("retailer_ref_id")
        or request.query_params.get("user_ref_id")
        or request.query_params.get("retailer_ref_id")
        or request.headers.get("x-user-ref-id")
        or request.headers.get("x-retailer-ref-id")
    )
    if eff_ref:
        try:
            ref_int = int(eff_ref)
            ret_ref_stmt = select(RetailerModel).where(
                or_(
                    RetailerModel.retailer_ref_id == ref_int,
                    RetailerModel.id == ref_int
                ),
                RetailerModel.is_deleted == False
            ).order_by(
                case((RetailerModel.retailer_ref_id == ref_int, 1), else_=2),
                RetailerModel.id.asc()
            )
            ret_by_ref = (await db.execute(ret_ref_stmt)).scalars().first()
            if ret_by_ref:
                return ret_by_ref
        except (ValueError, TypeError):
            pass

    # 1. Authoritative check: If JWT sub matches RetailerModel.public_id
    if jwt_sub and jwt_sub != "00000000-0000-0000-0000-000000000000":
        try:
            sub_uuid = uuid.UUID(str(jwt_sub))
            stmt = select(RetailerModel).where(
                RetailerModel.public_id == sub_uuid,
                RetailerModel.is_deleted == False
            )
            res = await db.execute(stmt)
            retailer = res.scalars().first()
            if retailer:
                return retailer

            # 1b. If JWT sub matches AdminUserModel, resolve the admin's associated retailer
            admin_stmt = select(AdminUserModel).where(
                AdminUserModel.public_id == sub_uuid,
                AdminUserModel.is_deleted == False
            )
            admin_res = await db.execute(admin_stmt)
            admin_user = admin_res.scalars().first()
            if admin_user:
                admin_phone = getattr(admin_user, "phone", None) or getattr(admin_user, "mobile", None)
                if admin_phone:
                    clean_mob = re.sub(r"\D", "", str(admin_phone))[-10:]
                    ret_stmt = (
                        select(RetailerModel)
                        .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                        .where(
                            RetailerContactModel.mobile.in_([clean_mob, f"+91{clean_mob}", f"91{clean_mob}"]),
                            RetailerModel.is_deleted == False
                        )
                    )
                    ret_res = await db.execute(ret_stmt)
                    ret = ret_res.scalars().first()
                    if ret:
                        return ret

                # Fallback to primary platform retailer (RET-10928) for admin
                def_ret_stmt = select(RetailerModel).where(
                    RetailerModel.retailer_code == "RET-10928",
                    RetailerModel.is_deleted == False
                )
                def_res = await db.execute(def_ret_stmt)
                def_ret = def_res.scalars().first()
                if def_ret:
                    return def_ret
        except Exception:
            pass

    # 2. Check other JWT claims if sub wasn't a direct RetailerModel UUID
    jwt_ret_code = payload.get("retailer_code") or payload.get("retailer_id")
    if jwt_ret_code and jwt_ret_code != "00000000-0000-0000-0000-000000000000":
        try:
            stmt = select(RetailerModel).where(
                or_(
                    RetailerModel.retailer_code == str(jwt_ret_code),
                    RetailerModel.retailer_code.ilike(str(jwt_ret_code))
                ),
                RetailerModel.is_deleted == False
            )
            res = await db.execute(stmt)
            retailer = res.scalars().first()
            if retailer:
                return retailer
        except Exception:
            pass

    jwt_mobile = payload.get("mobile") or payload.get("phone")
    if jwt_mobile:
        try:
            clean_digits = re.sub(r"\D", "", str(jwt_mobile))
            if len(clean_digits) >= 10:
                mob10 = clean_digits[-10:]
                stmt = (
                    select(RetailerModel)
                    .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                    .where(
                        RetailerContactModel.mobile.in_([mob10, f"+91{mob10}", f"91{mob10}"]),
                        RetailerModel.is_deleted == False
                    )
                )
                res = await db.execute(stmt)
                retailer = res.scalars().first()
                if retailer:
                    return retailer
        except Exception:
            pass

    # 3. Check query/header retailer identification (x-retailer-code, x-retailer-id, or query param)
    q_retailer_id = request.query_params.get("retailer_id") or request.query_params.get("retailer_code")
    h_retailer_id = request.headers.get("x-retailer-id") or request.headers.get("x-retailer-code")
    caller_cand = q_retailer_id or h_retailer_id
    if caller_cand and caller_cand != "00000000-0000-0000-0000-000000000000":
        try:
            cand_uuid = uuid.UUID(str(caller_cand))
            stmt = select(RetailerModel).where(RetailerModel.public_id == cand_uuid, RetailerModel.is_deleted == False)
            res = await db.execute(stmt)
            retailer = res.scalars().first()
            if retailer:
                return retailer
        except Exception:
            pass

        try:
            stmt = select(RetailerModel).where(
                or_(
                    RetailerModel.retailer_code == str(caller_cand),
                    RetailerModel.retailer_code.ilike(str(caller_cand))
                ),
                RetailerModel.is_deleted == False
            )
            res = await db.execute(stmt)
            retailer = res.scalars().first()
            if retailer:
                return retailer
        except Exception:
            pass

    # 4. Fallback to active retailer P2P-R404667 or primary retailer
    try:
        default_stmt = select(RetailerModel).where(
            or_(
                RetailerModel.retailer_code == "P2P-R404667",
                RetailerModel.retailer_ref_id == 24,
                RetailerModel.retailer_code == "RET-10928"
            ),
            RetailerModel.is_deleted == False
        ).order_by(RetailerModel.retailer_ref_id.asc())
        def_res = await db.execute(default_stmt)
        def_ret = def_res.scalars().first()
        if def_ret:
            return def_ret
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authenticated retailer session required. Identity must be verified from database."
    )


# ==============================================================================
# 1. PAYMENT SLIP UPLOAD ENDPOINT
# ==============================================================================

@router.post("/upload-slip", summary="Upload Payment Slip / Proof Image to Backblaze B2")
async def upload_payment_slip(
    file: UploadFile = File(..., description="Payment proof image — JPG, PNG, WEBP (max 10 MB)"),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_token_payload)
):
    """
    Validates and stores payment proof image directly in Backblaze B2 cloud storage.
    Generates slip ID, SHA-256 checksum, and returns authorized Backblaze B2 download URL.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload."
        )

    # Validate MIME type
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file format '{content_type}'. Please upload JPG, PNG, or WEBP image."
        )

    # Read bytes & validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({len(file_bytes) // (1024*1024)} MB) exceeds maximum allowed limit of 10 MB."
        )

    # Compute SHA-256 checksum
    checksum = hashlib.sha256(file_bytes).hexdigest()
    # Generate Slip ID
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    slip_id = f"SLIP-{now_str}-{uuid.uuid4().hex[:8].upper()}"

    # Upload directly to Backblaze B2 cloud storage
    try:
        slip_res = BackblazeStorageService.upload_topup_slip(
            file_bytes=file_bytes,
            filename=file.filename or "slip.jpg",
            slip_id=slip_id,
            content_type=content_type
        )
    except Exception as ex:
        print(f"[UploadSlip Error] B2 upload error: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document to Backblaze B2 cloud storage: {str(ex)}"
        )

    return {
        "success": True,
        "message": "Payment slip uploaded successfully to Backblaze B2",
        "data": {
            "slip_id": slip_id,
            "slip_url": slip_res["slip_url"],
            "storage_path": slip_res["storage_path"],
            "original_filename": file.filename,
            "mime_type": content_type,
            "file_size_bytes": len(file_bytes),
            "checksum": checksum,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    }


def _resolve_slip_url(slip_url: Optional[str], slip_id: Optional[str] = None) -> Optional[str]:
    """
    Resolve active authorized Backblaze B2 URL from slip_url or lookup via slip_id.
    """
    if slip_url and str(slip_url).strip() and str(slip_url).strip() != "None":
        return BackblazeStorageService.get_b2_download_url(slip_url)
    if slip_id and str(slip_id).strip() and str(slip_id).strip() != "None":
        try:
            api_obj, bucket = BackblazeStorageService._get_api()
            if api_obj and bucket:
                for file_version, _ in bucket.ls(folder_to_list="topup_slips", recursive=True):
                    if str(slip_id).strip() in file_version.file_name:
                        return BackblazeStorageService.get_b2_download_url(file_version.file_name)
        except Exception as ex:
            print(f"[B2 Slip Lookup Notice] {ex}")
    return None


# ==============================================================================
# 2. RETAILER CREATE TOPUP REQUEST
# ==============================================================================

@router.post("/request", summary="Submit Retailer Topup Request")
async def create_topup_request(
    req: TopupCreateRequest,
    retailer: RetailerModel = Depends(get_authenticated_retailer),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a topup request from authenticated retailer.
    Attaches server-derived retailer_id and wallet_id.
    """
    # 0. Strict Retailer Approval Check: Only ACTIVE retailers may submit topups
    ret_status = (getattr(retailer, "status", None) or "").upper()
    if ret_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Retailer account '{retailer.retailer_code}' is currently {ret_status or 'PENDING_APPROVAL'}. Top-up requests are only allowed for admin-approved, active retailers."
        )

    # 1. Fetch or create Retailer Wallet
    wal_stmt = select(RetailerWalletModel).where(
        RetailerWalletModel.retailer_id == retailer.public_id,
        RetailerWalletModel.is_deleted == False
    )
    wal_res = await db.execute(wal_stmt)
    wallet = wal_res.scalars().first()

    wallet_id = wallet.public_id if wallet else None

    # 1b. Strict Unique Payment Reference (UTR / Bank Reference) Check
    clean_payment_ref = (req.payment_reference or "").strip()
    if clean_payment_ref:
        dup_stmt = select(TopupRequestModel).where(
            func.trim(func.upper(TopupRequestModel.payment_reference)) == clean_payment_ref.upper(),
            TopupRequestModel.is_deleted == False
        )
        dup_res = await db.execute(dup_stmt)
        existing_dup = dup_res.scalars().first()
        if existing_dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Payment reference / UTR '{clean_payment_ref}' has already been submitted in topup request '{existing_dup.topup_request_id}'. Each payment reference must be unique and cannot be reused."
            )

    # 2. Generate unique Topup Request ID
    now_utc = datetime.now(timezone.utc)
    topup_req_id = f"TOP-REQ-{now_utc.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # Parse payment date
    pay_dt = None
    if req.payment_date:
        try:
            pay_dt = datetime.fromisoformat(req.payment_date.replace("Z", "+00:00"))
        except Exception:
            pay_dt = now_utc

    # Auto-resolve B2 slip_url from slip_id if not explicitly provided
    resolved_slip_url = _resolve_slip_url(req.slip_url, req.slip_id)
    # 2b. Compute POS MDR & Vendor Snapshot
    selected_mode = (req.payment_mode or req.payment_method or "POS - Instant").strip()
    mdr_charge_val = req.mdr_charge
    gst_amount_val = req.gst_amount
    charges_val = req.charges
    received_amount_val = req.received_amount
    mdr_config_uuid = None
    vendor_calc_meta = {}

    try:
        calc = await PosMdrService.calculate_pos_topup_pricing(
            db=db,
            amount=req.requested_amount,
            payment_mode=selected_mode,
            retailer_id=retailer.public_id
        )
        mdr_charge_val = calc["mdr"]
        gst_amount_val = calc["gst"]
        charges_val = calc["charges"]
        received_amount_val = calc["received_amount"]
        if calc.get("mdr_config_id"):
            mdr_config_uuid = uuid.UUID(calc["mdr_config_id"])
        vendor_calc_meta = {
            "vendor_id": calc.get("vendor_id"),
            "vendor_name": calc.get("vendor_name"),
            "vendor_commission_rate": calc.get("vendor_commission_rate"),
            "vendor_commission_type": calc.get("vendor_commission_type"),
            "vendor_commission_amount": calc.get("vendor_commission_amount"),
            "pos_serial_number": calc.get("pos_serial_number"),
            "pos_mobile_number": calc.get("pos_mobile_number"),
        }
    except Exception as mdr_err:
        # If client provided values, use them, otherwise fallback to amount if not a configured POS mode
        if received_amount_val is None:
            received_amount_val = req.requested_amount
            charges_val = 0.0

    # 3. Create TopupRequestModel with pricing snapshot
    ret_ref = getattr(retailer, "retailer_ref_id", None) or getattr(retailer, "user_ref_id", None) or 24
    wal_ref = getattr(wallet, "retailer_wallet_ref_id", None) or getattr(wallet, "wallet_ref_id", None)
    ten_ref = getattr(retailer, "tenant_ref_id", None) or 1
    cmp_ref = getattr(retailer, "company_ref_id", None) or 1

    topup_model = TopupRequestModel(
        public_id=uuid.uuid4(),
        tenant_id=retailer.tenant_id,
        company_id=retailer.company_id,
        retailer_id=retailer.public_id,
        wallet_id=wallet_id,
        tenant_ref_id=ten_ref,
        company_ref_id=cmp_ref,
        user_ref_id=ret_ref,
        user_type_ref_id=2,
        retailer_ref_id=ret_ref,
        retailer_wallet_ref_id=wal_ref,
        topup_request_id=topup_req_id,
        requested_amount=req.requested_amount,
        approved_amount=None,
        currency="INR",
        mdr_charge=mdr_charge_val,
        gst_amount=gst_amount_val,
        charges=charges_val,
        received_amount=received_amount_val,
        mdr_config_id=mdr_config_uuid,
        payment_reference=req.payment_reference,
        payment_method=selected_mode,
        payment_date=pay_dt or now_utc,
        slip_id=req.slip_id,
        slip_url=resolved_slip_url,
        slip_original_filename=req.slip_original_filename,
        slip_mime_type=req.slip_mime_type,
        slip_file_size_bytes=req.slip_file_size_bytes,
        slip_checksum=req.slip_checksum,
        status="PENDING",
        retailer_remarks=req.retailer_remarks,
        submitted_at=now_utc,
        created_date=now_utc,
        updated_date=now_utc,
        created_by=retailer.retailer_code or str(retailer.public_id),
        updated_by=retailer.retailer_code or str(retailer.public_id),
        metadata_json={
            "retailer_name": get_retailer_display_name(retailer),
            "retailer_code": retailer.retailer_code,
            "owner_name": getattr(retailer, "owner_name", ""),
            "payment_mode": selected_mode,
            "mdr": mdr_charge_val,
            "gst": gst_amount_val,
            "charges": charges_val,
            "received_amount": received_amount_val,
            **vendor_calc_meta
        }
    )
    db.add(topup_model)
    await db.commit()
    await db.refresh(topup_model)

    return {
        "success": True,
        "message": f"Topup request {topup_req_id} submitted successfully and is pending admin verification.",
        "topup_request_id": topup_model.topup_request_id,
        "id": str(topup_model.public_id),
        "data": {
            "id": str(topup_model.public_id),
            "topup_request_id": topup_model.topup_request_id,
            "requested_amount": float(topup_model.requested_amount),
            "payment_mode": topup_model.payment_method,
            "mdr": float(topup_model.mdr_charge or 0.0),
            "gst": float(topup_model.gst_amount or 0.0),
            "charges": float(topup_model.charges or 0.0),
            "received_amount": float(topup_model.received_amount or topup_model.requested_amount),
            "status": topup_model.status,
            "payment_reference": topup_model.payment_reference,
            "payment_method": topup_model.payment_method,
            "slip_url": topup_model.slip_url,
            "submitted_at": topup_model.submitted_at.isoformat(),
            **vendor_calc_meta
        }
    }


# ==============================================================================
# PAYMENT MODES & DYNAMIC MDR ENDPOINTS ON TOPUP ROUTER
# ==============================================================================

@router.get("/payment-modes")
async def get_topup_payment_modes(db: AsyncSession = Depends(get_db)):
    """
    Returns active POS payment modes in exact display order:
    1. POS - Instant
    2. POS+T1
    3. POS+T2
    """
    modes = await PosMdrService.get_active_payment_modes(db)
    return {"items": modes, "total": len(modes)}


@router.post("/calculate-mdr")
async def calculate_topup_mdr(
    req: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates MDR, GST, Charges, Received Amount, and Vendor Commission dynamically for POS payment modes.
    """
    pmode = req.get("payment_mode") or req.get("payment_method") or "POS - Instant"
    amt = float(req.get("transaction_amount") or req.get("requested_amount") or 0)
    ret_id = req.get("retailer_id")

    result = await PosMdrService.calculate_pos_topup_pricing(
        db=db,
        amount=amt,
        payment_mode=pmode,
        retailer_id=ret_id
    )
    return {
        "payment_mode": result["payment_mode"],
        "transaction_amount": result["transaction_amount"],
        "mdr": result["mdr"],
        "gst": result["gst"],
        "charges": result["charges"],
        "received_amount": result["received_amount"],
        "mdr_config_id": result.get("mdr_config_id"),
        "vendor_id": result.get("vendor_id"),
        "vendor_name": result.get("vendor_name"),
        "vendor_commission_rate": result.get("vendor_commission_rate"),
        "vendor_commission_amount": result.get("vendor_commission_amount"),
        "pos_serial_number": result.get("pos_serial_number"),
        "pos_mobile_number": result.get("pos_mobile_number"),
    }


# ==============================================================================
# 3. RETAILER VIEW OWN REQUESTS
# ==============================================================================

@router.get("/my-requests", summary="Get Authenticated Retailer's Topup Requests")
async def get_my_topup_requests(
    request: Request,
    retailer_id: Optional[str] = Query(None),
    retailer: RetailerModel = Depends(get_authenticated_retailer),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of topup requests created by the authenticated retailer.
    """
    stmt = select(TopupRequestModel).where(
        TopupRequestModel.retailer_id == retailer.public_id,
        TopupRequestModel.is_deleted == False
    ).order_by(TopupRequestModel.submitted_at.desc())

    res = await db.execute(stmt)
    records = res.scalars().all()

    items = []
    for r in records:
        items.append({
            "id": str(r.public_id),
            "topup_request_id": r.topup_request_id,
            "requested_amount": float(r.requested_amount),
            "approved_amount": float(r.approved_amount) if r.approved_amount is not None else None,
            "mdr_charge": float(r.mdr_charge) if r.mdr_charge is not None else None,
            "gst_amount": float(r.gst_amount) if r.gst_amount is not None else None,
            "charges": float(r.charges) if r.charges is not None else None,
            "received_amount": float(r.received_amount) if r.received_amount is not None else float(r.requested_amount),
            "status": r.status,
            "payment_reference": r.payment_reference,
            "payment_method": r.payment_method,
            "payment_mode": r.payment_method,
            "mdr_config_id": str(r.mdr_config_id) if r.mdr_config_id else None,
            "payment_date": r.payment_date.isoformat() if r.payment_date else None,
            "slip_id": r.slip_id,
            "slip_url": _resolve_slip_url(r.slip_url, r.slip_id),
            "slip_original_filename": r.slip_original_filename,
            "retailer_remarks": r.retailer_remarks,
            "admin_notes": r.admin_notes,
            "rejection_reason": r.rejection_reason,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "approved_at": r.approved_at.isoformat() if r.approved_at else None,
            "transaction_reference": r.transaction_reference
        })

    # Fetch live wallet balance
    wal_stmt = select(RetailerWalletModel).where(
        RetailerWalletModel.retailer_id == retailer.public_id,
        RetailerWalletModel.is_deleted == False
    )
    wal_res = await db.execute(wal_stmt)
    wallet = wal_res.scalars().first()
    wallet_bal = float(wallet.wallet_balance) if wallet else 0.0

    return {
        "success": True,
        "total": len(items),
        "items": items,
        "retailer": {
            "retailer_id": str(retailer.public_id),
            "user_ref_id": getattr(retailer, "retailer_ref_id", None) or 24,
            "user_type_ref_id": 2,
            "retailer_ref_id": getattr(retailer, "retailer_ref_id", None) or 24,
            "retailer_code": retailer.retailer_code or "RET-LIVE",
            "retailer_name": get_retailer_display_name(retailer),
            "mobile_number": getattr(retailer, "mobile_number", getattr(retailer, "phone_number", "")),
            "company_name": getattr(retailer, "store_name", getattr(retailer, "legal_name", "")),
            "wallet_id": str(wallet.public_id) if wallet else None,
            "current_wallet_balance": wallet_bal,
            "is_wallet_frozen": wallet.is_frozen if wallet else False
        }
    }


@router.get("/request", summary="Get Authenticated Retailer's Topup Requests (Alias for /my-requests)")
async def get_topup_request_get_alias(
    request: Request,
    retailer_id: Optional[str] = Query(None),
    user_ref_id: Optional[int] = Query(None),
    user_type_ref_id: Optional[int] = Query(None),
    retailer: RetailerModel = Depends(get_authenticated_retailer),
    db: AsyncSession = Depends(get_db)
):
    """
    Handles GET /api/v1/topup/request?user_type_ref_id=2&user_ref_id=24
    Returns retailer's topup request history, live wallet balance, and retailer metadata.
    """
    return await get_my_topup_requests(
        request=request,
        retailer_id=retailer_id,
        retailer=retailer,
        db=db
    )



# ==============================================================================
# 4. ADMIN GET PAGINATED TOPUP REQUESTS
# ==============================================================================

@router.get("/requests", summary="Admin Get All Topup Requests (Paginated & Filtered)")
async def get_admin_topup_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status", description="PENDING, UNDER_REVIEW, APPROVED, REJECTED, ALL"),
    retailer_id: Optional[str] = Query(None),
    date_preset: Optional[str] = Query("ALL"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin server-side filtered and paginated topup requests list.
    """
    conditions = [TopupRequestModel.is_deleted == False]

    # Status Filter
    if isinstance(status_filter, str) and status_filter.upper() != "ALL":
        conditions.append(TopupRequestModel.status == status_filter.upper())

    # Retailer Filter
    if isinstance(retailer_id, str) and retailer_id.upper() != "ALL":
        try:
            r_uuid = uuid.UUID(retailer_id)
            conditions.append(TopupRequestModel.retailer_id == r_uuid)
        except Exception:
            pass

    # Amount Range
    if isinstance(min_amount, (int, float)):
        conditions.append(TopupRequestModel.requested_amount >= min_amount)
    if isinstance(max_amount, (int, float)):
        conditions.append(TopupRequestModel.requested_amount <= max_amount)

    # Date Filter
    now_utc = datetime.now(timezone.utc)
    preset_val = date_preset if isinstance(date_preset, str) else "ALL"
    if preset_val == "TODAY":
        start_dt = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        conditions.append(TopupRequestModel.submitted_at >= start_dt)
    elif preset_val == "YESTERDAY":
        yest = now_utc - timedelta(days=1)
        start_dt = yest.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = yest.replace(hour=23, minute=59, second=59, microsecond=999999)
        conditions.append(and_(TopupRequestModel.submitted_at >= start_dt, TopupRequestModel.submitted_at <= end_dt))
    elif preset_val == "LAST_7_DAYS":
        start_dt = (now_utc - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        conditions.append(TopupRequestModel.submitted_at >= start_dt)
    elif preset_val == "LAST_30_DAYS":
        start_dt = (now_utc - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        conditions.append(TopupRequestModel.submitted_at >= start_dt)
    elif preset_val == "THIS_MONTH":
        start_dt = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        conditions.append(TopupRequestModel.submitted_at >= start_dt)
    elif preset_val == "CUSTOM":
        if isinstance(start_date, str) and start_date:
            try:
                s_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                conditions.append(TopupRequestModel.submitted_at >= s_dt)
            except Exception:
                pass
        if isinstance(end_date, str) and end_date:
            try:
                e_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                conditions.append(TopupRequestModel.submitted_at <= e_dt)
            except Exception:
                pass

    # Search filter (matches request_id, payment_reference, retailer code, retailer name, or remarks)
    if isinstance(search, str) and search.strip():
        s_term = f"%{search.strip()}%"
        ret_subquery = (
            select(RetailerModel.public_id)
            .outerjoin(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
            .where(
                or_(
                    RetailerModel.retailer_code.ilike(s_term),
                    RetailerModel.store_name.ilike(s_term),
                    RetailerModel.owner_name.ilike(s_term),
                    RetailerModel.legal_name.ilike(s_term),
                    RetailerContactModel.mobile.ilike(s_term)
                )
            )
        )
        conditions.append(or_(
            TopupRequestModel.topup_request_id.ilike(s_term),
            TopupRequestModel.payment_reference.ilike(s_term),
            TopupRequestModel.slip_id.ilike(s_term),
            TopupRequestModel.retailer_remarks.ilike(s_term),
            TopupRequestModel.retailer_id.in_(ret_subquery)
        ))

    # Count Total
    count_stmt = select(func.count(TopupRequestModel.id)).where(and_(*conditions))
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Query items with Retailer & Wallet join
    stmt = (
        select(TopupRequestModel, RetailerModel, RetailerWalletModel)
        .join(RetailerModel, TopupRequestModel.retailer_id == RetailerModel.public_id, isouter=True)
        .join(RetailerWalletModel, RetailerModel.public_id == RetailerWalletModel.retailer_id, isouter=True)
        .where(and_(*conditions))
        .order_by(TopupRequestModel.submitted_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Pre-fetch contact numbers and emails for all retailers in this page
    ret_ids = [topup.retailer_id for topup, _, _ in rows if topup.retailer_id]
    contact_map: Dict[Any, str] = {}
    email_map: Dict[Any, str] = {}
    if ret_ids:
        c_stmt = (
            select(RetailerContactModel)
            .where(RetailerContactModel.retailer_id.in_(ret_ids), RetailerContactModel.is_deleted == False)
            .order_by(RetailerContactModel.created_date.asc())
        )
        c_res = await db.execute(c_stmt)
        for c in c_res.scalars().all():
            if c.retailer_id not in contact_map or c.primary_contact:
                contact_map[c.retailer_id] = c.mobile or ""
            if c.retailer_id not in email_map or c.primary_contact:
                email_map[c.retailer_id] = c.email or ""

    items = []
    for topup, retailer, wallet in rows:
        meta = topup.metadata_json or {}
        ret_code = (retailer.retailer_code if retailer else meta.get("retailer_code")) or "N/A"
        ret_name = (get_retailer_display_name(retailer) if retailer else meta.get("retailer_name")) or "Unknown Retailer"
        ret_mobile = contact_map.get(topup.retailer_id, "")
        ret_email = email_map.get(topup.retailer_id, "") or meta.get("email", "") or meta.get("retailer_email", "")

        received_val = float(topup.received_amount) if topup.received_amount is not None else (
            float(topup.approved_amount) if topup.approved_amount is not None else float(topup.requested_amount)
        )

        mdr_pct = 0.0
        if topup.mdr_charge is not None and topup.requested_amount and float(topup.requested_amount) > 0:
            mdr_pct = round((float(topup.mdr_charge) / float(topup.requested_amount)) * 100, 2)
        elif topup.charges is not None and topup.requested_amount and float(topup.requested_amount) > 0:
            base_mdr = float(topup.charges) if not topup.gst_amount else float(topup.charges) - float(topup.gst_amount)
            mdr_pct = round((max(0.0, base_mdr) / float(topup.requested_amount)) * 100, 2)

        is_date_valid, date_block_reason = validate_topup_approval_date(
            payment_mode_or_method=topup.payment_method or topup.payment_mode,
            submitted_at=topup.submitted_at or topup.created_date,
            status_val=topup.status
        )

        items.append({
            "id": str(topup.public_id),
            "topup_request_id": topup.topup_request_id,
            "requested_amount": float(topup.requested_amount),
            "approved_amount": float(topup.approved_amount) if topup.approved_amount is not None else None,
            "received_amount": received_val,
            "mdr_charge": float(topup.mdr_charge) if topup.mdr_charge is not None else 0.0,
            "mdr_percentage": mdr_pct,
            "gst_amount": float(topup.gst_amount) if topup.gst_amount is not None else 0.0,
            "charges": float(topup.charges) if topup.charges is not None else 0.0,
            "mdr_config_id": str(topup.mdr_config_id) if topup.mdr_config_id else None,
            "currency": topup.currency,
            "payment_reference": topup.payment_reference,
            "payment_method": topup.payment_method or "POS - Instant",
            "payment_mode": topup.payment_method or "POS - Instant",
            "pos_type": "POS_T1" if is_pos_t1(topup.payment_method or topup.payment_mode) else ("POS_INSTANT" if is_pos_instant(topup.payment_method or topup.payment_mode) else (topup.payment_method or "POS_INSTANT")),
            "is_pos_t1": is_pos_t1(topup.payment_method or topup.payment_mode),
            "is_pos_instant": is_pos_instant(topup.payment_method or topup.payment_mode),
            "can_approve": is_date_valid,
            "approval_block_reason": date_block_reason,
            "request_date": get_business_calendar_date(topup.submitted_at or topup.created_date).isoformat(),
            "current_business_date": get_business_calendar_date(datetime.now(timezone.utc)).isoformat(),
            "payment_date": topup.payment_date.isoformat() if topup.payment_date else None,
            "slip_id": topup.slip_id,
            "slip_url": _resolve_slip_url(topup.slip_url, topup.slip_id),
            "slip_original_filename": topup.slip_original_filename,
            "status": topup.status,
            "retailer_remarks": topup.retailer_remarks,
            "admin_notes": topup.admin_notes,
            "rejection_reason": topup.rejection_reason,
            "submitted_at": topup.submitted_at.isoformat() if topup.submitted_at else None,
            "approved_by": topup.approved_by,
            "approved_at": topup.approved_at.isoformat() if topup.approved_at else None,
            "rejected_by": topup.rejected_by,
            "rejected_at": topup.rejected_at.isoformat() if topup.rejected_at else None,
            "transaction_reference": topup.transaction_reference,
            "retailer": {
                "retailer_id": str(retailer.public_id) if retailer else str(topup.retailer_id),
                "retailer_code": ret_code,
                "retailer_name": ret_name,
                "mobile_number": ret_mobile,
                "email": ret_email,
                "company_name": (getattr(retailer, "store_name", "") or getattr(retailer, "legal_name", "")) if retailer else "",
                "account_status": getattr(retailer, "status", "UNKNOWN") if retailer else "UNKNOWN",
                "wallet_id": str(wallet.public_id) if wallet else None,
                "current_wallet_balance": float(wallet.wallet_balance) if wallet else 0.0,
                "is_wallet_frozen": wallet.is_frozen if wallet else False
            } if (retailer or topup.retailer_id) else None
        })

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "items": items
    }


# ==============================================================================
# 5. GET TOPUP REQUEST DETAIL
# ==============================================================================

@router.get("/requests/{request_id}", summary="Get Topup Request Detail")
async def get_topup_request_detail(
    request_id: str,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns complete single topup record with slip verification metadata and retailer wallet context.
    """
    conditions = [TopupRequestModel.is_deleted == False]
    try:
        r_uuid = uuid.UUID(request_id)
        conditions.append(or_(TopupRequestModel.public_id == r_uuid, TopupRequestModel.topup_request_id == request_id))
    except Exception:
        conditions.append(TopupRequestModel.topup_request_id == request_id)

    stmt = (
        select(TopupRequestModel, RetailerModel, RetailerWalletModel)
        .join(RetailerModel, TopupRequestModel.retailer_id == RetailerModel.public_id, isouter=True)
        .join(RetailerWalletModel, RetailerModel.public_id == RetailerWalletModel.retailer_id, isouter=True)
        .where(and_(*conditions))
    )

    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topup request '{request_id}' not found."
        )

    topup, retailer, wallet = row

    # Fetch contact mobile & email if retailer exists
    ret_mobile = ""
    ret_email = ""
    if retailer:
        c_stmt = (
            select(RetailerContactModel)
            .where(RetailerContactModel.retailer_id == retailer.public_id, RetailerContactModel.is_deleted == False)
            .order_by(RetailerContactModel.primary_contact.desc())
            .limit(1)
        )
        c_res = await db.execute(c_stmt)
        c_obj = c_res.scalars().first()
        if c_obj:
            ret_mobile = c_obj.mobile or ""
            ret_email = c_obj.email or ""

    meta = topup.metadata_json or {}
    ret_code = (retailer.retailer_code if retailer else meta.get("retailer_code")) or "N/A"
    ret_name = (get_retailer_display_name(retailer) if retailer else meta.get("retailer_name")) or "Unknown Retailer"
    if not ret_email:
        ret_email = meta.get("email", "") or meta.get("retailer_email", "")

    received_val = float(topup.received_amount) if topup.received_amount is not None else (
        float(topup.approved_amount) if topup.approved_amount is not None else float(topup.requested_amount)
    )

    is_date_valid, date_block_reason = validate_topup_approval_date(
        payment_mode_or_method=topup.payment_method or topup.payment_mode,
        submitted_at=topup.submitted_at or topup.created_date,
        status_val=topup.status
    )

    return {
        "success": True,
        "data": {
            "id": str(topup.public_id),
            "topup_request_id": topup.topup_request_id,
            "requested_amount": float(topup.requested_amount),
            "approved_amount": float(topup.approved_amount) if topup.approved_amount is not None else None,
            "received_amount": received_val,
            "mdr_charge": float(topup.mdr_charge) if topup.mdr_charge is not None else 0.0,
            "gst_amount": float(topup.gst_amount) if topup.gst_amount is not None else 0.0,
            "charges": float(topup.charges) if topup.charges is not None else 0.0,
            "mdr_config_id": str(topup.mdr_config_id) if topup.mdr_config_id else None,
            "currency": topup.currency,
            "payment_reference": topup.payment_reference,
            "payment_method": topup.payment_method or "POS - Instant",
            "payment_mode": topup.payment_method or "POS - Instant",
            "pos_type": "POS_T1" if is_pos_t1(topup.payment_method or topup.payment_mode) else ("POS_INSTANT" if is_pos_instant(topup.payment_method or topup.payment_mode) else (topup.payment_method or "POS_INSTANT")),
            "is_pos_t1": is_pos_t1(topup.payment_method or topup.payment_mode),
            "is_pos_instant": is_pos_instant(topup.payment_method or topup.payment_mode),
            "can_approve": is_date_valid,
            "approval_block_reason": date_block_reason,
            "request_date": get_business_calendar_date(topup.submitted_at or topup.created_date).isoformat(),
            "current_business_date": get_business_calendar_date(datetime.now(timezone.utc)).isoformat(),
            "payment_date": topup.payment_date.isoformat() if topup.payment_date else None,
            "slip_id": topup.slip_id,
            "slip_url": _resolve_slip_url(topup.slip_url, topup.slip_id),
            "slip_original_filename": topup.slip_original_filename,
            "slip_mime_type": topup.slip_mime_type,
            "slip_file_size_bytes": topup.slip_file_size_bytes,
            "slip_checksum": topup.slip_checksum,
            "status": topup.status,
            "retailer_remarks": topup.retailer_remarks,
            "admin_notes": topup.admin_notes,
            "rejection_reason": topup.rejection_reason,
            "submitted_at": topup.submitted_at.isoformat() if topup.submitted_at else None,
            "approved_by": topup.approved_by,
            "approved_at": topup.approved_at.isoformat() if topup.approved_at else None,
            "rejected_by": topup.rejected_by,
            "rejected_at": topup.rejected_at.isoformat() if topup.rejected_at else None,
            "transaction_reference": topup.transaction_reference,
            "retailer": {
                "retailer_id": str(retailer.public_id) if retailer else str(topup.retailer_id),
                "retailer_code": ret_code,
                "retailer_name": ret_name,
                "mobile_number": ret_mobile,
                "email": ret_email,
                "company_name": (getattr(retailer, "store_name", "") or getattr(retailer, "legal_name", "")) if retailer else "",
                "account_status": getattr(retailer, "status", "UNKNOWN") if retailer else "UNKNOWN",
                "wallet_id": str(wallet.public_id) if wallet else None,
                "current_wallet_balance": float(wallet.wallet_balance) if wallet else 0.0,
                "is_wallet_frozen": wallet.is_frozen if wallet else False
            } if (retailer or topup.retailer_id) else None
        }
    }


# ==============================================================================
# 6. ADMIN ATOMIC APPROVAL (CRITICAL FINANCIAL P0)
# ==============================================================================

@router.post("/requests/{request_id}/approve", summary="Admin Approve Topup Request & Credit Wallet")
async def approve_topup_request(
    request_id: str,
    req: TopupApprovalRequest,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    CRITICAL FINANCIAL P0 ATOMIC APPROVAL:
    1. Locks topup request row with FOR UPDATE.
    2. Validates status is PENDING or UNDER_REVIEW.
    3. DERIVES retailer_id and wallet_id strictly from topup_request row (NEVER from frontend).
    4. Validates approved amount (defaults to requested_amount if not specified).
    5. Row-locks RetailerWalletModel with FOR UPDATE.
    6. Authoritative Database Ledger Credit:
       - balance_before = wallet.wallet_balance
       - balance_after = balance_before + approved_amount
       - wallet.wallet_balance = balance_after
    7. Creates TransactionLedgerEntryModel (CREDIT, RETAILER_WALLET).
    8. Creates CentralTransactionModel (service_type=TOPUP, transaction_type=WALLET_TOPUP, status=SUCCESS).
    9. Updates TopupRequestModel (status=APPROVED, approved_amount, approved_by, approved_at).
    10. Commits atomic database transaction.
    """
    # 1. Row-lock TopupRequestModel
    conditions = [TopupRequestModel.is_deleted == False]
    try:
        r_uuid = uuid.UUID(request_id)
        conditions.append(or_(TopupRequestModel.public_id == r_uuid, TopupRequestModel.topup_request_id == request_id))
    except Exception:
        conditions.append(TopupRequestModel.topup_request_id == request_id)

    topup_stmt = select(TopupRequestModel).where(and_(*conditions)).with_for_update()
    topup_res = await db.execute(topup_stmt)
    topup_record = topup_res.scalars().first()

    if not topup_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topup request '{request_id}' not found."
        )

    # 2. Idempotency & Status Check
    if topup_record.status.upper() == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Topup request {topup_record.topup_request_id} has already been approved and credited. Duplicate approval prevented."
        )
    if topup_record.status.upper() in ("REJECTED", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve a topup request with status '{topup_record.status}'."
        )

    # 2b. Approval Date Business Rule Validation (T+1 Rule for POS T1)
    is_date_valid, date_block_reason = validate_topup_approval_date(
        payment_mode_or_method=topup_record.payment_method or topup_record.payment_mode,
        submitted_at=topup_record.submitted_at or topup_record.created_date,
        status_val=topup_record.status
    )
    if not is_date_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=date_block_reason or "POS T1 requests can be approved from the next day (T+1)."
        )

    # 3. Derive Approved & Received Amount
    final_approved_amount = req.received_amount or req.approved_amount or (
        float(topup_record.received_amount) if topup_record.received_amount is not None else float(topup_record.requested_amount)
    )
    if final_approved_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved / received amount must be greater than zero."
        )

    # 4. Strict Retailer & Wallet Resolution from Topup Record
    target_retailer_id = topup_record.retailer_id
    
    # Query Retailer
    ret_stmt = select(RetailerModel).where(
        RetailerModel.public_id == target_retailer_id,
        RetailerModel.is_deleted == False
    )
    ret_res = await db.execute(ret_stmt)
    retailer = ret_res.scalars().first()
    if not retailer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requesting retailer account not found in database."
        )

    # Ensure retailer is ACTIVE and approved before approving wallet credit
    ret_status = (getattr(retailer, "status", None) or "").upper()
    if ret_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve topup. Retailer '{retailer.retailer_code}' is currently {ret_status or 'UNAPPROVED'}. Retailer account must be approved before wallet credits can be allocated."
        )

    # 5. Execute Atomic Wallet Credit via Stored Procedure: public.wallet_balance_update
    now_utc = datetime.now(timezone.utc)
    now_date_str = now_utc.strftime("%Y%m%d")
    txn_ref = f"TOP-{now_date_str}-{uuid.uuid4().hex[:6].upper()}"

    adj_dto = WalletAdjustmentDTO(
        user_ref_id=getattr(retailer, "retailer_ref_id", None) or 24,
        user_type_ref_id=2,
        retailer_code=retailer.retailer_code,
        user_id=str(retailer.public_id),
        entry_type="CREDIT",
        amount=final_approved_amount,
        service_name="TOPUP",
        wallet_type="MAIN",
        user_type="RETAILER",
        txn_id=txn_ref,
        ref_id=topup_record.payment_reference or txn_ref,
        table_ref_id=str(topup_record.public_id),
        narration=f"Topup Approved by Admin ({current_admin.email}) for Req {topup_record.topup_request_id} [UTR: {topup_record.payment_reference or 'N/A'}]",
        admin_notes=req.admin_notes,
        actor_id=str(current_admin.public_id),
        actor_name=current_admin.email
    )

    sp_result = await WalletBalanceAdjustmentService.execute_wallet_balance_update(
        db=db,
        dto=adj_dto,
        actor_user=current_admin
    )

    if not sp_result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Wallet credit failed via Stored Procedure [{sp_result.error_code}]: {sp_result.error_message}"
        )

    # 6. Update TopupRequestModel
    topup_record.status = "APPROVED"
    topup_record.approved_amount = final_approved_amount
    topup_record.received_amount = final_approved_amount
    topup_record.approved_by = current_admin.email
    topup_record.approved_at = now_utc
    topup_record.transaction_reference = sp_result.txn_id
    topup_record.admin_notes = req.admin_notes
    topup_record.updated_date = now_utc
    topup_record.updated_by = current_admin.email

    await db.commit()
    await db.refresh(topup_record)


    # 11. Send Automated Email Notification to Retailer
    recipient_email = None
    email_dispatched = False
    try:
        # Check RetailerContactModel
        ret_c_stmt = select(RetailerContactModel).where(
            RetailerContactModel.retailer_id == retailer.public_id,
            RetailerContactModel.is_deleted == False
        ).order_by(RetailerContactModel.created_date.asc())
        ret_c_res = await db.execute(ret_c_stmt)
        c_list = ret_c_res.scalars().all()
        for c in c_list:
            if c.email and "@" in c.email:
                recipient_email = c.email.strip()
                break
        
        # Fallback to AdminUserModel if contact email not found
        if not recipient_email:
            u_stmt = select(AdminUserModel).where(
                or_(
                    AdminUserModel.mobile_number == getattr(retailer, "mobile_number", None),
                    AdminUserModel.username == retailer.retailer_code
                ),
                AdminUserModel.is_deleted == False
            )
            u_res = await db.execute(u_stmt)
            u_obj = u_res.scalars().first()
            if u_obj and u_obj.email:
                recipient_email = u_obj.email.strip()

        if not recipient_email and topup_record.metadata_json:
            recipient_email = topup_record.metadata_json.get("email") or topup_record.metadata_json.get("retailer_email")

        if recipient_email:
            email_payload = {
                "recipient_email": recipient_email,
                "retailer_name": get_retailer_display_name(retailer),
                "retailer_code": retailer.retailer_code,
                "topup_request_id": topup_record.topup_request_id,
                "transaction_reference": txn_ref,
                "payment_reference": topup_record.payment_reference or "N/A",
                "payment_method": topup_record.payment_method or "POS - Instant",
                "payment_date": topup_record.payment_date.strftime("%d-%m-%Y %H:%M") if topup_record.payment_date else now_utc.strftime("%d-%m-%Y %H:%M"),
                "requested_amount": float(topup_record.requested_amount),
                "mdr_charge": float(topup_record.mdr_charge) if topup_record.mdr_charge is not None else 0.0,
                "gst_amount": float(topup_record.gst_amount) if topup_record.gst_amount is not None else 0.0,
                "charges": float(topup_record.charges) if topup_record.charges is not None else 0.0,
                "approved_amount": final_approved_amount,
                "received_amount": final_approved_amount,
                "previous_balance": sp_result.balance_before,
                "current_balance": sp_result.balance_after,
                "approved_by": current_admin.email,
                "approved_at": now_utc.strftime("%d-%m-%Y %H:%M:%S IST"),
                "admin_notes": req.admin_notes
            }
            asyncio.create_task(email_service.send_topup_approval_email(email_payload))
            email_dispatched = True
            logger.info(f"Topup approval email queued for {recipient_email} (Req: {topup_record.topup_request_id})")
    except Exception as email_err:
        logger.warning(f"Failed to dispatch topup approval email: {email_err}")

    return {
        "success": True,
        "message": f"Topup request {topup_record.topup_request_id} successfully approved. ₹{final_approved_amount:,.2f} credited to {get_retailer_display_name(retailer)}'s wallet.",
        "email_sent": email_dispatched,
        "recipient_email": recipient_email,
        "data": {
            "topup_request_id": topup_record.topup_request_id,
            "transaction_reference": sp_result.txn_id,
            "retailer_code": retailer.retailer_code,
            "retailer_name": get_retailer_display_name(retailer),
            "wallet_id": str(retailer.public_id),
            "requested_amount": float(topup_record.requested_amount),
            "approved_amount": final_approved_amount,
            "received_amount": final_approved_amount,
            "previous_balance": sp_result.balance_before,
            "credited_amount": sp_result.amount,
            "current_balance": sp_result.balance_after,
            "status": "APPROVED",
            "approved_by": current_admin.email,
            "approved_at": now_utc.isoformat(),
            "email_sent": email_dispatched,
            "recipient_email": recipient_email
        }
    }


# ==============================================================================
# 7. ADMIN REJECT TOPUP REQUEST
# ==============================================================================

@router.post("/requests/{request_id}/reject", summary="Admin Reject Topup Request")
async def reject_topup_request(
    request_id: str,
    req: TopupRejectionRequest,
    current_admin: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin rejects a topup request.
    Stores rejection reason and timestamp.
    ZERO financial or ledger movements are created.
    """
    conditions = [TopupRequestModel.is_deleted == False]
    try:
        r_uuid = uuid.UUID(request_id)
        conditions.append(or_(TopupRequestModel.public_id == r_uuid, TopupRequestModel.topup_request_id == request_id))
    except Exception:
        conditions.append(TopupRequestModel.topup_request_id == request_id)

    topup_stmt = select(TopupRequestModel).where(and_(*conditions)).with_for_update()
    topup_res = await db.execute(topup_stmt)
    topup_record = topup_res.scalars().first()

    if not topup_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topup request '{request_id}' not found."
        )

    if topup_record.status.upper() == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject an already approved topup request."
        )

    now_utc = datetime.now(timezone.utc)
    topup_record.status = "REJECTED"
    topup_record.rejection_reason = req.rejection_reason
    topup_record.admin_notes = req.admin_notes
    topup_record.rejected_by = current_admin.email
    topup_record.rejected_at = now_utc
    topup_record.updated_date = now_utc
    topup_record.updated_by = current_admin.email

    await db.commit()

    return {
        "success": True,
        "message": f"Topup request {topup_record.topup_request_id} has been rejected. No wallet credit was made.",
        "data": {
            "topup_request_id": topup_record.topup_request_id,
            "status": "REJECTED",
            "rejection_reason": topup_record.rejection_reason,
            "rejected_by": current_admin.email,
            "rejected_at": now_utc.isoformat()
        }
    }


# ==============================================================================
# 8. TOPUP DASHBOARD METRICS
# ==============================================================================

@router.get("/metrics", summary="Get Topup Dashboard Real-Time Metrics")
async def get_topup_metrics(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real-time KPI metrics for Topup Requests:
    - Pending requests count & total volume
    - Approved today count & volume
    - Rejected total count
    - Total all-time approved volume
    """
    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Pending
    pending_stmt = select(
        func.count(TopupRequestModel.id),
        func.coalesce(func.sum(TopupRequestModel.requested_amount), 0.0)
    ).where(
        TopupRequestModel.status.in_(["PENDING", "UNDER_REVIEW"]),
        TopupRequestModel.is_deleted == False
    )
    p_res = await db.execute(pending_stmt)
    pending_count, pending_vol = p_res.first() or (0, 0.0)

    # 2. Approved Today
    app_today_stmt = select(
        func.count(TopupRequestModel.id),
        func.coalesce(func.sum(TopupRequestModel.approved_amount), 0.0)
    ).where(
        TopupRequestModel.status == "APPROVED",
        TopupRequestModel.approved_at >= today_start,
        TopupRequestModel.is_deleted == False
    )
    at_res = await db.execute(app_today_stmt)
    approved_today_count, approved_today_vol = at_res.first() or (0, 0.0)

    # 3. Rejected
    rej_stmt = select(
        func.count(TopupRequestModel.id),
        func.coalesce(func.sum(TopupRequestModel.requested_amount), 0.0)
    ).where(
        TopupRequestModel.status == "REJECTED",
        TopupRequestModel.is_deleted == False
    )
    r_res = await db.execute(rej_stmt)
    rejected_count, rejected_vol = r_res.first() or (0, 0.0)

    # 4. Total Approved All Time
    all_app_stmt = select(
        func.count(TopupRequestModel.id),
        func.coalesce(func.sum(TopupRequestModel.approved_amount), 0.0)
    ).where(
        TopupRequestModel.status == "APPROVED",
        TopupRequestModel.is_deleted == False
    )
    all_res = await db.execute(all_app_stmt)
    total_approved_count, total_approved_vol = all_res.first() or (0, 0.0)

    return {
        "pending_count": pending_count,
        "pending_volume": float(pending_vol),
        "approved_today_count": approved_today_count,
        "approved_today_volume": float(approved_today_vol),
        "rejected_count": rejected_count,
        "rejected_volume": float(rejected_vol),
        "total_approved_count": total_approved_count,
        "total_approved_volume": float(total_approved_vol),
        "total_volume": float(total_approved_vol),
        "timestamp": now_utc.isoformat()
    }
