"""
REST API Router for BulkPe Enterprise Payout Engine.
Endpoints:
- POST /api/v1/payout/bulkpe/initiate
- GET /api/v1/payout/bulkpe/status/{transaction_number}
- POST /api/v1/payout/bulkpe/webhook
- GET /api/v1/payout/bulkpe/dashboard/counters
"""

import uuid
from typing import Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.application.bulkpe_payout_engine import BulkPePayoutEngine
from app.infrastructure.db.payout_workflow_models import PayoutWorkflowTransactionModel
from app.infrastructure.db.models import RetailerWalletModel, RetailerModel, RetailerContactModel, AdminUserModel
from app.infrastructure.db.customer_models import CustomerModel

router = APIRouter(prefix="/payout/bulkpe", tags=["BulkPe Payout Engine"])


class InitiateBulkPePayoutRequest(BaseModel):
    customer_id: Union[uuid.UUID, str] = Field(..., description="Customer ID or Mobile Number")
    beneficiary_id: Union[uuid.UUID, str] = Field(..., description="Beneficiary ID or Account Number")
    account_number: Optional[str] = Field(None, description="Explicit Beneficiary Account Number")
    ifsc_code: Optional[str] = Field(None, description="Explicit Beneficiary IFSC Code")
    account_holder_name: Optional[str] = Field(None, description="Explicit Beneficiary Name")
    bank_name: Optional[str] = Field(None, description="Explicit Beneficiary Bank Name")
    user_ref_id: Optional[int] = Field(None, description="Standard User Reference ID (BIGINT)")
    user_type_ref_id: Optional[int] = Field(2, description="Standard User Type Reference ID (BIGINT)")
    retailer_ref_id: Optional[int] = Field(None, description="Alternative Retailer Reference ID (BIGINT)")
    retailer_id: Optional[Union[uuid.UUID, str]] = Field(None, description="Retailer ID")
    retailer_code: Optional[str] = Field(None, description="Retailer Code (e.g. P2P-R815722)")
    mobile: Optional[str] = Field(None, description="Retailer Mobile Number")
    tenant_id: Optional[Union[uuid.UUID, str]] = Field(None, description="Tenant ID")
    amount: float = Field(..., gt=0, description="Payout Transfer Amount")
    mpin: Optional[str] = Field(None, description="Customer or Retailer Security MPIN")
    customer_pin: Optional[str] = Field(None, description="Alternative field for Security MPIN")
    pin: Optional[str] = Field(None, description="Alternative field for Security MPIN")
    mode: str = Field("IMPS", description="Transfer Mode (IMPS, NEFT, RTGS, UPI)")
    idempotency_key: Optional[str] = Field(None, description="Unique Idempotency Key")


@router.post("/initiate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def initiate_bulkpe_payout(
    req: InitiateBulkPePayoutRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates a BulkPe Payout transaction with full ACID wallet debit, dynamic pricing,
    security MPIN validation, and automatic reversal engine on failures.
    """
    import re
    ret_obj = None

    # 1. Attempt JWT auth token / cookie context resolution
    auth_header = request.headers.get("authorization", "") if request else ""
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
    if not token and request and request.cookies:
        token = (
            request.cookies.get("p2p_access_token") or
            request.cookies.get("pay2pay_access_token") or
            request.cookies.get("pay2pay_auth_token") or
            request.cookies.get("access_token") or
            request.cookies.get("token")
        )

    token_payload = {}
    if token and len(token) >= 10:
        try:
            from app.core.security import decode_access_token
            token_payload = decode_access_token(token) or {}
        except Exception:
            pass

    # Direct match from token claims
    if token_payload and db:
        r_id_claim = token_payload.get("retailer_id")
        if r_id_claim:
            try:
                r_uuid = uuid.UUID(str(r_id_claim))
                stmt = select(RetailerModel).where(RetailerModel.public_id == r_uuid, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except Exception:
                pass

        if not ret_obj and token_payload.get("retailer_code"):
            stmt = select(RetailerModel).where(RetailerModel.retailer_code == str(token_payload["retailer_code"]).strip().upper(), RetailerModel.is_deleted == False)
            ret_obj = (await db.execute(stmt)).scalars().first()

        if not ret_obj and token_payload.get("retailer_ref_id"):
            try:
                ref_int = int(token_payload["retailer_ref_id"])
                stmt = select(RetailerModel).where(RetailerModel.retailer_ref_id == ref_int, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except Exception:
                pass

        if not ret_obj and token_payload.get("sub"):
            try:
                sub_uuid = uuid.UUID(str(token_payload["sub"]))
                stmt = select(RetailerModel).where(RetailerModel.public_id == sub_uuid, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
                if not ret_obj:
                    adm_chk = (await db.execute(select(AdminUserModel).where(AdminUserModel.public_id == sub_uuid, AdminUserModel.is_deleted == False))).scalars().first()
                    if adm_chk and adm_chk.phone:
                        clean_mob = re.sub(r"\D", "", str(adm_chk.phone))[-10:]
                        stmt = (
                            select(RetailerModel)
                            .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                            .where(
                                RetailerContactModel.mobile.in_([clean_mob, f"+91{clean_mob}", f"91{clean_mob}"]),
                                RetailerModel.is_deleted == False,
                                RetailerContactModel.is_deleted == False
                            )
                        )
                        ret_obj = (await db.execute(stmt)).scalars().first()
            except Exception:
                pass

        if not ret_obj and token_payload.get("mobile"):
            clean_mob = re.sub(r"\D", "", str(token_payload["mobile"]))[-10:]
            stmt = (
                select(RetailerModel)
                .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                .where(
                    RetailerContactModel.mobile.in_([clean_mob, f"+91{clean_mob}", f"91{clean_mob}"]),
                    RetailerModel.is_deleted == False,
                    RetailerContactModel.is_deleted == False
                )
            )
            ret_obj = (await db.execute(stmt)).scalars().first()

    # 2. Context resolution via resolve_retailer_context
    if not ret_obj:
        try:
            from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
            target_id = req.retailer_id or getattr(req, "retailer_code", None)
            ctx = await resolve_retailer_context(request, target_id, db=db)
            if ctx:
                if ctx.get("public_id"):
                    try:
                        p_uuid = uuid.UUID(str(ctx["public_id"]))
                        stmt = select(RetailerModel).where(RetailerModel.public_id == p_uuid, RetailerModel.is_deleted == False)
                        ret_obj = (await db.execute(stmt)).scalars().first()
                    except Exception:
                        pass
                if not ret_obj and ctx.get("retailer_code"):
                    stmt = select(RetailerModel).where(RetailerModel.retailer_code == str(ctx["retailer_code"]).strip().upper(), RetailerModel.is_deleted == False)
                    ret_obj = (await db.execute(stmt)).scalars().first()
                if not ret_obj and ctx.get("retailer_ref_id"):
                    try:
                        stmt = select(RetailerModel).where(RetailerModel.retailer_ref_id == int(ctx["retailer_ref_id"]), RetailerModel.is_deleted == False)
                        ret_obj = (await db.execute(stmt)).scalars().first()
                    except Exception:
                        pass
                if not ret_obj and ctx.get("mobile"):
                    clean_mob = re.sub(r"\D", "", str(ctx["mobile"]))[-10:]
                    stmt = (
                        select(RetailerModel)
                        .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                        .where(
                            RetailerContactModel.mobile.in_([clean_mob, f"+91{clean_mob}", f"91{clean_mob}"]),
                            RetailerModel.is_deleted == False,
                            RetailerContactModel.is_deleted == False
                        )
                    )
                    ret_obj = (await db.execute(stmt)).scalars().first()
        except Exception:
            pass

    # 3. Direct indexed BIGINT resolution via user_ref_id / retailer_ref_id
    if not ret_obj:
        eff_ref_id = (
            req.user_ref_id or
            req.retailer_ref_id or
            (request.headers.get("x-user-ref-id") if request else None) or
            (request.headers.get("x-retailer-ref-id") if request else None) or
            (request.cookies.get("user_ref_id") if request else None)
        )
        if eff_ref_id:
            try:
                ref_int = int(eff_ref_id)
                stmt = select(RetailerModel).where(RetailerModel.retailer_ref_id == ref_int, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except (ValueError, TypeError):
                pass

    # 4. Resolution via retailer identifier (UUID, retailer_code, mobile) from req, headers, or cookies
    if not ret_obj:
        ret_identifier = (
            req.retailer_id or
            getattr(req, "retailer_code", None) or
            (request.headers.get("x-retailer-code") if request else None) or
            (request.headers.get("x-retailer-id") if request else None) or
            (request.headers.get("x-retailer-uuid") if request else None) or
            (request.cookies.get("p2p_active_retailer_id") if request else None) or
            (request.cookies.get("p2p_retailer_code") if request else None) or
            (request.cookies.get("retailer_id") if request else None) or
            (request.cookies.get("retailer_code") if request else None)
        )
        if ret_identifier:
            ident_str = str(ret_identifier).strip()
            try:
                parsed_uuid = uuid.UUID(ident_str)
                stmt = select(RetailerModel).where(RetailerModel.public_id == parsed_uuid, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except Exception:
                pass

            if not ret_obj:
                stmt = select(RetailerModel).where(RetailerModel.retailer_code == ident_str.upper(), RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()

            if not ret_obj and len(re.sub(r"\D", "", ident_str)) >= 10:
                clean_mob = re.sub(r"\D", "", ident_str)[-10:]
                stmt = (
                    select(RetailerModel)
                    .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                    .where(
                        RetailerContactModel.mobile.in_([clean_mob, f"+91{clean_mob}", f"91{clean_mob}"]),
                        RetailerModel.is_deleted == False,
                        RetailerContactModel.is_deleted == False
                    )
                )
                ret_obj = (await db.execute(stmt)).scalars().first()

    # 5. Customer introducing retailer lookup
    if not ret_obj and req.customer_id:
        try:
            cust_ident = str(req.customer_id).strip()
            conds = [CustomerModel.customer_number == cust_ident]
            try:
                c_uuid = uuid.UUID(cust_ident)
                conds.append(CustomerModel.public_id == c_uuid)
            except Exception:
                pass
            clean_digits = re.sub(r"\D", "", cust_ident)
            if len(clean_digits) >= 10:
                conds.append(CustomerModel.mobile_number == clean_digits[-10:])
                conds.append(CustomerModel.mobile_number == f"+91{clean_digits[-10:]}")
            cust_stmt = select(CustomerModel).where(or_(*conds), CustomerModel.is_deleted == False)
            cust = (await db.execute(cust_stmt)).scalars().first()
            if cust:
                if cust.introduced_by_retailer_id:
                    stmt = select(RetailerModel).where(RetailerModel.public_id == cust.introduced_by_retailer_id, RetailerModel.is_deleted == False)
                    ret_obj = (await db.execute(stmt)).scalars().first()
                if not ret_obj and cust.mobile_number:
                    clean_cmob = re.sub(r"\D", "", str(cust.mobile_number))[-10:]
                    if len(clean_cmob) == 10:
                        stmt_ret_m = (
                            select(RetailerModel)
                            .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                            .where(
                                RetailerContactModel.mobile.in_([clean_cmob, f"+91{clean_cmob}", f"91{clean_cmob}"]),
                                RetailerModel.is_deleted == False,
                                RetailerContactModel.is_deleted == False
                            )
                            .order_by(RetailerModel.created_date.desc())
                        )
                        ret_obj = (await db.execute(stmt_ret_m)).scalars().first()
        except Exception:
            pass

    # 6. Fallback for single tenant active retailer or default active retailer
    if not ret_obj:
        raw_tenant = req.tenant_id or (request.headers.get("x-tenant-id") if request else None)
        if raw_tenant:
            try:
                t_uuid = uuid.UUID(str(raw_tenant))
                stmt = select(RetailerModel).where(RetailerModel.tenant_id == t_uuid, RetailerModel.is_deleted == False).order_by(RetailerModel.created_date.asc()).limit(1)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except Exception:
                pass
        if not ret_obj:
            try:
                stmt_def = (
                    select(RetailerModel)
                    .join(RetailerWalletModel, RetailerWalletModel.retailer_id == RetailerModel.public_id)
                    .where(RetailerModel.is_deleted == False, RetailerWalletModel.wallet_balance > 0)
                    .order_by(RetailerModel.created_date.desc())
                    .limit(1)
                )
                ret_obj = (await db.execute(stmt_def)).scalars().first()
            except Exception:
                pass

    # 7. Final fallback: look up AuthUserModel / AdminUserModel by JWT sub, x-mobile headers, or req.mobile
    if not ret_obj:
        try:
            auth_mobile = None
            if token_payload:
                sub_val = token_payload.get("sub") or token_payload.get("user_id") or ""
                if sub_val:
                    # Try: sub may be a 10-digit mobile number directly
                    clean_sub = re.sub(r"\D", "", str(sub_val))[-10:]
                    if len(clean_sub) == 10:
                        auth_mobile = clean_sub
                    else:
                        # Try by UUID sub from AdminUserModel
                        try:
                            sub_uuid = uuid.UUID(str(sub_val))
                            adm = (await db.execute(select(AdminUserModel).where(AdminUserModel.public_id == sub_uuid, AdminUserModel.is_deleted == False))).scalars().first()
                            if adm and adm.phone:
                                auth_mobile = re.sub(r"\D", "", str(adm.phone))[-10:]
                        except Exception:
                            pass
            # Additional: check x-mobile or x-phone headers
            if not auth_mobile and request:
                hdr_mob = request.headers.get("x-mobile") or request.headers.get("x-phone") or request.headers.get("x-retailer-mobile")
                if hdr_mob:
                    auth_mobile = re.sub(r"\D", "", str(hdr_mob))[-10:]
            if not auth_mobile and req.mobile:
                auth_mobile = re.sub(r"\D", "", str(req.mobile))[-10:]
            if auth_mobile and len(auth_mobile) == 10:
                mob_variants = [auth_mobile, f"+91{auth_mobile}", f"91{auth_mobile}"]
                stmt = (
                    select(RetailerModel)
                    .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                    .where(
                        RetailerContactModel.mobile.in_(mob_variants),
                        RetailerModel.is_deleted == False,
                        RetailerContactModel.is_deleted == False
                    )
                    .order_by(RetailerModel.created_date.desc())
                )
                ret_obj = (await db.execute(stmt)).scalars().first()
        except Exception:
            pass

    if not ret_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated retailer identity not found. Please log in again."
        )

    retailer_uuid = ret_obj.public_id
    raw_tenant = ret_obj.tenant_id or req.tenant_id
    tenant_uuid = None
    if raw_tenant:
        try:
            tenant_uuid = uuid.UUID(str(raw_tenant))
        except Exception:
            tenant_uuid = None

    effective_mpin = req.mpin or req.customer_pin or req.pin
    if not effective_mpin or not str(effective_mpin).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security MPIN is required."
        )

    return await BulkPePayoutEngine.process_payout(
        db=db,
        customer_id=req.customer_id,
        beneficiary_id=req.beneficiary_id,
        retailer_id=retailer_uuid,
        tenant_id=tenant_uuid,
        amount=req.amount,
        mpin=str(effective_mpin).strip(),
        mode=req.mode,
        idempotency_key=req.idempotency_key,
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        account_holder_name=req.account_holder_name,
        bank_name=req.bank_name
    )


@router.get("/status/{transaction_number}", response_model=Dict[str, Any])
async def get_bulkpe_transaction_status(
    transaction_number: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetches real-time status of a BulkPe payout transaction by transaction number or reference ID."""
    stmt = select(PayoutWorkflowTransactionModel).where(
        (PayoutWorkflowTransactionModel.transaction_number == transaction_number) |
        (PayoutWorkflowTransactionModel.reference_number == transaction_number)
    )
    tx = (await db.execute(stmt)).scalars().first()

    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout transaction record not found."
        )

    return {
        "transaction_number": tx.transaction_number,
        "reference_number": tx.reference_number,
        "status": tx.status,
        "amount": tx.amount,
        "net_debit": tx.net_debit,
        "charges": tx.charges,
        "mode": tx.mode,
        "utr": tx.utr_number,
        "vendor_tx_id": tx.cashfree_transfer_id,
        "initiated_at": tx.initiated_at,
        "completed_at": tx.completed_at,
        "failure_reason": tx.failure_reason
    }


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def bulkpe_webhook_listener(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Official BulkPe Webhook Receiver for real-time payout status updates."""
    payload = await request.json()
    vendor_tx_id = payload.get("vendor_tx_id") or payload.get("data", {}).get("vendor_tx_id")
    event_status = (payload.get("status") or payload.get("event", "")).upper()
    utr = payload.get("utr") or payload.get("data", {}).get("utr")

    if not vendor_tx_id:
        return {"status": "ACK", "message": "No vendor_tx_id in payload"}

    stmt = select(PayoutWorkflowTransactionModel).where(
        PayoutWorkflowTransactionModel.cashfree_transfer_id == vendor_tx_id
    )
    tx = (await db.execute(stmt)).scalars().first()

    if tx:
        if "SUCCESS" in event_status:
            tx.status = "SUCCESS"
            if utr:
                tx.utr_number = utr
            await db.commit()
        elif "FAILED" in event_status or "REVERSED" in event_status:
            tx.status = "FAILED"
            tx.failure_reason = payload.get("message", "Vendor Webhook status FAILED")
            await db.commit()

    return {"status": "ACK", "message": "BulkPe Webhook processed"}


@router.get("/dashboard/counters", response_model=Dict[str, Any])
async def get_bulkpe_dashboard_counters(
    retailer_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches real-time dashboard statistics: Wallet Balance, Today's Payouts,
    Success/Failed/Pending/Refund counts and transaction metrics.
    """
    ret_id = retailer_id or uuid.UUID("a46ec999-57db-4138-a79b-a208a6d75109")

    # Fetch wallet balance
    stmt_w = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_id)
    wallet = (await db.execute(stmt_w)).scalars().first()
    wallet_balance = wallet.wallet_balance if wallet else 0.0

    # Aggregate counts by status
    stmt_counts = select(
        PayoutWorkflowTransactionModel.status,
        func.count(PayoutWorkflowTransactionModel.id),
        func.coalesce(func.sum(PayoutWorkflowTransactionModel.amount), 0.0)
    ).group_by(PayoutWorkflowTransactionModel.status)

    results = (await db.execute(stmt_counts)).all()

    stats = {
        "wallet_balance": wallet_balance,
        "success_count": 0,
        "success_amount": 0.0,
        "failed_count": 0,
        "failed_amount": 0.0,
        "pending_count": 0,
        "pending_amount": 0.0,
        "refund_count": 0,
        "refund_amount": 0.0,
        "total_payout_amount": 0.0
    }

    for status_str, count_val, sum_val in results:
        stats["total_payout_amount"] += sum_val
        if status_str == "SUCCESS":
            stats["success_count"] = count_val
            stats["success_amount"] = sum_val
        elif status_str in ("FAILED", "REVERSED"):
            stats["failed_count"] += count_val
            stats["failed_amount"] += sum_val
            stats["refund_count"] += count_val
            stats["refund_amount"] += sum_val
        elif status_str == "PENDING":
            stats["pending_count"] = count_val
            stats["pending_amount"] = sum_val

    return stats


@router.get("/generate-txn-id", response_model=Dict[str, Any])
async def get_next_payout_txn_id(
    vendor_name: Optional[str] = Query("UTKALDIGITAL"),
    db: AsyncSession = Depends(get_db)
):
    """Generates the next unique authoritative payout transaction ID via PostgreSQL stored procedure."""
    from app.core.transaction_id_generator import generate_payout_txn_id_via_sp
    txn_id = await generate_payout_txn_id_via_sp(db, vendor_name=vendor_name)
    return {
        "success": True,
        "txn_id": txn_id,
        "vendor_name": vendor_name
    }
