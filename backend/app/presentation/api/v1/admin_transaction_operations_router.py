"""
Admin Transaction Operations Router.
Dedicated endpoint suite for manual resolution of PENDING transactions across
all services and vendors (Payout, Recharge, DMT, AEPS, etc.).

Endpoints:
- GET  /api/v1/admin/transactions/pending/summary          : Dynamic Top KPI Metrics
- GET  /api/v1/admin/transactions/pending                  : Paginated, Filterable & Searchable Pending List
- GET  /api/v1/admin/transactions/pending/failure-reasons  : Dynamic Standard Failure Reasons
- GET  /api/v1/admin/transactions/pending/{transaction_id} : Complete Details Drawer Payload
- POST /api/v1/admin/transactions/pending/{transaction_id}/update-status : Atomic Status Update & CR/DR Reversal
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload

logger = logging.getLogger("admin_transaction_operations_router")

router = APIRouter(prefix="/admin/transactions", tags=["Admin Transaction Operations"])

STANDARD_FAILURE_REASONS = [
    "Vendor Failed",
    "Provider Timeout",
    "Provider Rejected",
    "Technical Failure",
    "Transaction Not Processed",
    "Bank Network Unavailable / Downtime",
    "Beneficiary Account Invalid / Frozen",
    "Insufficient Vendor Balance",
    "Other"
]


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: SUCCESS or FAILED")
    failure_reason: Optional[str] = Field(None, description="Required when status is FAILED")
    remarks: Optional[str] = Field(None, description="Optional admin remarks")
    utr_number: Optional[str] = Field(None, description="Optional updated UTR number")


def safe_float(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(val)
    except Exception:
        return 0.0


def safe_iso(dt_val: Any) -> Optional[str]:
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        return dt_val.isoformat()
    return str(dt_val)


# ─── 1. DYNAMIC KPI SUMMARY ───
@router.get("/pending/summary", summary="Dynamic Top KPI Summary for Pending Transactions")
async def get_pending_summary(
    db: AsyncSession = Depends(get_db),
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload)
):
    """
    Returns real-time aggregated metrics across all pending transactions:
    - Pending Transactions Count
    - Total Pending Amount (₹)
    - Pending Vendors Count
    - Pending Retailers Count
    - Today's Pending Count
    - Oldest Pending Transaction Datetime
    """
    query = text("""
        SELECT 
            COUNT(*) AS pending_count,
            COALESCE(SUM(transaction_amount), 0.00) AS total_pending_amount,
            COUNT(DISTINCT vendor) AS pending_vendors_count,
            COUNT(DISTINCT retailer_id) AS pending_retailers_count,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS todays_pending_count,
            MIN(created_at) AS oldest_pending_created_at
        FROM public.view_all_pending_transactions;
    """)

    result = await db.execute(query)
    row = result.mappings().first()

    if not row:
        return {
            "success": True,
            "data": {
                "pending_transactions": 0,
                "total_pending_amount": 0.00,
                "pending_vendors": 0,
                "pending_retailers": 0,
                "todays_pending": 0,
                "oldest_pending_transaction": None
            }
        }

    return {
        "success": True,
        "data": {
            "pending_transactions": int(row["pending_count"] or 0),
            "total_pending_amount": safe_float(row["total_pending_amount"]),
            "pending_vendors": int(row["pending_vendors_count"] or 0),
            "pending_retailers": int(row["pending_retailers_count"] or 0),
            "todays_pending": int(row["todays_pending_count"] or 0),
            "oldest_pending_transaction": safe_iso(row["oldest_pending_created_at"])
        }
    }


# ─── 2. DYNAMIC STANDARD FAILURE REASONS ───
@router.get("/pending/failure-reasons", summary="Dynamic List of Available Failure Reasons")
async def get_failure_reasons():
    return {
        "success": True,
        "data": STANDARD_FAILURE_REASONS
    }


# ─── 3. PAGINATED PENDING TRANSACTIONS LIST ───
@router.get("/pending", summary="Paginated Pending Transactions Across All Services & Vendors")
async def list_pending_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=200),
    search: Optional[str] = Query(None, description="Search Txn ID, Ext ID, Retailer, Vendor, UTR"),
    service: Optional[str] = Query(None, description="Filter by Service (PAYOUT, RECHARGE, DMT, etc.)"),
    vendor: Optional[str] = Query(None, description="Filter by Vendor"),
    retailer: Optional[str] = Query(None, description="Filter by Retailer Code or Name"),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload)
):
    """
    Retrieves currently pending transactions from public.view_all_pending_transactions.
    Supports multi-filtering, sorting, searching, and pagination.
    """
    conditions = ["1=1"]
    params: Dict[str, Any] = {}

    if search and search.strip():
        term = f"%{search.strip()}%"
        params["search_term"] = term
        conditions.append("""
            (
                transaction_id ILIKE :search_term OR 
                external_txn_id ILIKE :search_term OR 
                retailer_code ILIKE :search_term OR 
                retailer_name ILIKE :search_term OR 
                vendor ILIKE :search_term OR 
                vendor_ref ILIKE :search_term OR 
                utr ILIKE :search_term
            )
        """)

    if service and service.strip():
        params["service"] = service.strip().upper()
        conditions.append("UPPER(service) = :service")

    if vendor and vendor.strip():
        v_clean = vendor.strip()
        params["vendor"] = v_clean
        params["vendor_no_space"] = v_clean.replace(" ", "")
        conditions.append("(vendor ILIKE :vendor OR REPLACE(vendor, ' ', '') ILIKE :vendor_no_space)")

    if retailer and retailer.strip():
        params["retailer"] = f"%{retailer.strip()}%"
        conditions.append("(retailer_code ILIKE :retailer OR retailer_name ILIKE :retailer)")

    if from_date and from_date.strip():
        params["from_date"] = f"{from_date.strip()} 00:00:00"
        conditions.append("created_at >= :from_date::timestamptz")

    if to_date and to_date.strip():
        params["to_date"] = f"{to_date.strip()} 23:59:59"
        conditions.append("created_at <= :to_date::timestamptz")

    if min_amount is not None:
        params["min_amount"] = min_amount
        conditions.append("transaction_amount >= :min_amount")

    if max_amount is not None:
        params["max_amount"] = max_amount
        conditions.append("transaction_amount <= :max_amount")

    where_clause = " AND ".join(conditions)

    # Sort column mapping (safeguard against SQL injection)
    allowed_sort_cols = {
        "transaction_id": "transaction_id",
        "service": "service",
        "vendor": "vendor",
        "retailer_name": "retailer_name",
        "transaction_amount": "transaction_amount",
        "created_at": "created_at",
        "current_status": "current_status",
    }
    sort_column = allowed_sort_cols.get(sort_by.lower(), "created_at")
    order_dir = "ASC" if sort_order.lower() == "asc" else "DESC"

    # Count total matching rows
    count_query = text(f"SELECT COUNT(*) FROM public.view_all_pending_transactions WHERE {where_clause};")
    total_res = await db.execute(count_query, params)
    total_count = total_res.scalar() or 0

    # Fetch paginated rows
    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    data_query = text(f"""
        SELECT 
            transaction_id,
            external_txn_id,
            service,
            vendor,
            retailer_id,
            retailer_code,
            retailer_name,
            retailer_mobile,
            company_id,
            tenant_id,
            transaction_amount,
            cr_amount,
            dr_amount,
            commission,
            gst,
            service_charge,
            net_wallet_debit,
            balance_before,
            balance_after,
            created_at,
            updated_at,
            current_status,
            vendor_ref,
            provider_status,
            provider_response,
            utr,
            rrn,
            is_reversed
        FROM public.view_all_pending_transactions
        WHERE {where_clause}
        ORDER BY {sort_column} {order_dir}
        LIMIT :limit OFFSET :offset;
    """)

    rows_res = await db.execute(data_query, params)
    rows = rows_res.mappings().all()

    items = []
    for r in rows:
        dr_val = safe_float(r["dr_amount"])
        cr_val = safe_float(r["cr_amount"])
        impact_str = f"-₹{dr_val:,.2f} (DR)" if dr_val > 0 else (f"+₹{cr_val:,.2f} (CR)" if cr_val > 0 else "₹0.00")

        items.append({
            "transaction_id": r["transaction_id"],
            "external_txn_id": r["external_txn_id"],
            "service": r["service"],
            "vendor": r["vendor"],
            "retailer_id": str(r["retailer_id"]) if r["retailer_id"] else "",
            "retailer_code": r["retailer_code"] or "--",
            "retailer_name": r["retailer_name"] or "--",
            "retailer_mobile": r["retailer_mobile"] or "--",
            "company_id": str(r["company_id"]) if r["company_id"] else "",
            "tenant_id": str(r["tenant_id"]) if r["tenant_id"] else "",
            "transaction_amount": safe_float(r["transaction_amount"]),
            "cr_amount": cr_val,
            "dr_amount": dr_val,
            "commission": safe_float(r["commission"]),
            "gst": safe_float(r["gst"]),
            "service_charge": safe_float(r["service_charge"]),
            "net_wallet_debit": safe_float(r["net_wallet_debit"]),
            "wallet_impact": impact_str,
            "balance_before": safe_float(r["balance_before"]),
            "balance_after": safe_float(r["balance_after"]),
            "created_at": safe_iso(r["created_at"]),
            "updated_at": safe_iso(r["updated_at"]),
            "current_status": r["current_status"],
            "vendor_ref": r["vendor_ref"] or "",
            "provider_status": r["provider_status"] or r["current_status"],
            "provider_response": r["provider_response"] or "",
            "utr": r["utr"] or "",
            "rrn": r["rrn"] or "",
            "is_reversed": bool(r["is_reversed"])
        })

    # Available distinct services and vendors for filter dropdowns (dynamically resolved from active configs and transactions)
    filter_meta_query = text("""
        WITH all_vnds AS (
            SELECT DISTINCT vendor FROM public.view_all_pending_transactions WHERE vendor IS NOT NULL AND vendor <> ''
            UNION
            SELECT DISTINCT REPLACE(TRIM(REGEXP_REPLACE(provider_name, '(?i)\\s*(payout|api|gateway).*$', '')), ' ', '')
            FROM payout_gateway_configs
            WHERE provider_name IS NOT NULL AND provider_name <> ''
            UNION
            SELECT DISTINCT provider_code
            FROM payout_gateway_configs
            WHERE provider_code IS NOT NULL AND provider_code <> ''
            UNION
            SELECT DISTINCT vendor_name
            FROM recharge_transactions
            WHERE vendor_name IS NOT NULL AND vendor_name <> ''
        ),
        all_svcs AS (
            SELECT DISTINCT service FROM public.view_all_pending_transactions WHERE service IS NOT NULL AND service <> ''
            UNION
            SELECT unnest(ARRAY['PAYOUT', 'RECHARGE', 'DMT', 'AEPS'])
        )
        SELECT 
            (SELECT ARRAY_AGG(DISTINCT service ORDER BY service) FROM all_svcs WHERE service IS NOT NULL AND service <> '') AS services,
            (SELECT ARRAY_AGG(DISTINCT vendor ORDER BY vendor) FROM all_vnds WHERE vendor IS NOT NULL AND vendor <> '') AS vendors;
    """)
    meta_res = await db.execute(filter_meta_query)
    meta_row = meta_res.mappings().first()
    raw_services = list(meta_row["services"]) if meta_row and meta_row["services"] else []
    raw_vendors = list(meta_row["vendors"]) if meta_row and meta_row["vendors"] else []

    # Case-insensitive deduplication for clean dropdown options, preferring mixed-case/CamelCase
    vendor_dict: Dict[str, str] = {}
    for v in raw_vendors:
        if not v or not v.strip():
            continue
        v_clean = v.strip()
        key = v_clean.lower().replace(" ", "")
        if key not in vendor_dict:
            vendor_dict[key] = v_clean
        elif not vendor_dict[key].islower() and not vendor_dict[key].isupper():
            pass  # Already a nice mixed-case format
        elif not v_clean.islower() and not v_clean.isupper():
            vendor_dict[key] = v_clean

    avail_vendors = sorted(list(vendor_dict.values()), key=lambda x: x.lower())
    avail_services = sorted(list(set(s.strip().upper() for s in raw_services if s and s.strip())))

    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return {
        "success": True,
        "data": {
            "items": items,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "available_services": sorted(avail_services),
            "available_vendors": sorted(avail_vendors)
        }
    }


# ─── 4. TRANSACTION DETAILS DRAWER PAYLOAD ───
@router.get("/pending/{transaction_id}", summary="Complete Transaction Details & Audit Trail")
async def get_pending_transaction_details(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload)
):
    """
    Returns full transaction object from view_all_pending_transactions,
    all accounting entries from public.transactions, and audit timeline logs.
    """
    clean_id = transaction_id.strip()

    # 1. Fetch from View
    view_query = text("""
        SELECT * 
        FROM public.view_all_pending_transactions
        WHERE transaction_id = :txn_id OR external_txn_id = :txn_id
        LIMIT 1;
    """)
    view_res = await db.execute(view_query, {"txn_id": clean_id})
    txn_row = view_res.mappings().first()

    if not txn_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pending transaction '{clean_id}' not found or has already been resolved."
        )

    # 2. Fetch Ledger Entries from public.transactions
    ledger_query = text("""
        SELECT 
            id,
            txn_id,
            ref_id,
            entry_type,
            amount,
            balance_before,
            balance_after,
            status,
            narration,
            service_name,
            wallet_type,
            created_at
        FROM public.transactions
        WHERE txn_id = :txn_id OR ref_id = :txn_id
        ORDER BY created_at ASC;
    """)
    ledger_res = await db.execute(ledger_query, {"txn_id": txn_row["transaction_id"]})
    ledger_rows = ledger_res.mappings().all()

    accounting_entries = []
    for row in ledger_rows:
        accounting_entries.append({
            "id": row["id"],
            "txn_id": row["txn_id"],
            "ref_id": row["ref_id"],
            "entry_type": row["entry_type"],
            "amount": safe_float(row["amount"]),
            "balance_before": safe_float(row["balance_before"]),
            "balance_after": safe_float(row["balance_after"]),
            "status": row["status"],
            "narration": row["narration"] or "",
            "service_name": row["service_name"] or "",
            "wallet_type": row["wallet_type"] or "MAIN",
            "created_at": safe_iso(row["created_at"])
        })

    # 3. Fetch Audit Logs from public.transaction_audit_logs
    audit_query = text("""
        SELECT 
            public_id,
            transaction_reference,
            action,
            previous_status,
            new_status,
            actor_type,
            actor_id,
            details,
            created_at
        FROM public.transaction_audit_logs
        WHERE transaction_reference = :txn_id
        ORDER BY created_at ASC;
    """)
    audit_res = await db.execute(audit_query, {"txn_id": txn_row["transaction_id"]})
    audit_rows = audit_res.mappings().all()

    audit_trail = []
    for a in audit_rows:
        details_val = a["details"]
        if isinstance(details_val, str):
            try:
                details_val = json.loads(details_val)
            except Exception:
                pass

        audit_trail.append({
            "public_id": str(a["public_id"]),
            "transaction_reference": a["transaction_reference"],
            "action": a["action"],
            "previous_status": a["previous_status"],
            "new_status": a["new_status"],
            "actor_type": a["actor_type"],
            "actor_id": a["actor_id"],
            "details": details_val,
            "created_at": safe_iso(a["created_at"])
        })

    # Parse Provider Response JSON if possible
    provider_raw = txn_row["provider_response"]
    provider_json = None
    if provider_raw:
        try:
            provider_json = json.loads(provider_raw)
        except Exception:
            provider_json = None

    dr_val = safe_float(txn_row["dr_amount"])
    cr_val = safe_float(txn_row["cr_amount"])
    impact_str = f"-₹{dr_val:,.2f} (DR)" if dr_val > 0 else (f"+₹{cr_val:,.2f} (CR)" if cr_val > 0 else "₹0.00")

    return {
        "success": True,
        "data": {
            "transaction": {
                "transaction_id": txn_row["transaction_id"],
                "external_txn_id": txn_row["external_txn_id"],
                "service": txn_row["service"],
                "vendor": txn_row["vendor"],
                "transaction_type": txn_row["service"],
                "current_status": txn_row["current_status"],
                "created_at": safe_iso(txn_row["created_at"]),
                "updated_at": safe_iso(txn_row["updated_at"]),
                "is_reversed": bool(txn_row["is_reversed"])
            },
            "retailer": {
                "retailer_id": str(txn_row["retailer_id"]) if txn_row["retailer_id"] else "",
                "retailer_code": txn_row["retailer_code"] or "--",
                "retailer_name": txn_row["retailer_name"] or "--",
                "company_id": str(txn_row["company_id"]) if txn_row["company_id"] else "",
                "mobile_number": txn_row["retailer_mobile"] or "--"
            },
            "financial_details": {
                "transaction_amount": safe_float(txn_row["transaction_amount"]),
                "debit_amount": dr_val,
                "credit_amount": cr_val,
                "commission": safe_float(txn_row["commission"]),
                "gst": safe_float(txn_row["gst"]),
                "service_charge": safe_float(txn_row["service_charge"]),
                "wallet_debit": safe_float(txn_row["net_wallet_debit"]),
                "wallet_credit": cr_val,
                "wallet_impact": impact_str,
                "balance_before": safe_float(txn_row["balance_before"]),
                "balance_after": safe_float(txn_row["balance_after"])
            },
            "provider_details": {
                "vendor": txn_row["vendor"],
                "vendor_reference": txn_row["vendor_ref"] or "",
                "provider_status": txn_row["provider_status"] or txn_row["current_status"],
                "provider_response_raw": provider_raw or "",
                "provider_response_json": provider_json,
                "utr": txn_row["utr"] or "",
                "rrn": txn_row["rrn"] or ""
            },
            "accounting_entries": accounting_entries,
            "audit_trail": audit_trail
        }
    }


# ─── 5. ATOMIC STATUS UPDATE & REVERSAL ───
@router.post("/pending/{transaction_id}/update-status", summary="Manual Admin Transaction Status Update (SUCCESS / FAILED)")
async def update_transaction_status(
    transaction_id: str,
    body: StatusUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload)
):
    """
    Executes manual transaction status resolution:
    - PENDING -> SUCCESS: Preserves original accounting, updates status across tables.
    - PENDING -> FAILED: Mandatory failure reason, triggers atomic reversal back to retailer wallet.
    - Terminal state protection: strictly blocks changing SUCCESS or FAILED transactions.
    - Strict idempotency: blocks double credit reversal.
    """
    clean_id = transaction_id.strip()
    target_status = body.status.strip().upper()

    if target_status not in ("SUCCESS", "FAILED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Target status must be strictly 'SUCCESS' or 'FAILED'."
        )

    if target_status == "FAILED" and (not body.failure_reason or not body.failure_reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failure reason is mandatory when marking a transaction as FAILED."
        )

    # Extract Admin Context
    admin_id = "ADMIN"
    admin_name = "System Administrator"

    if payload:
        admin_id = str(payload.get("sub") or payload.get("user_id") or payload.get("admin_id") or "ADMIN")
        admin_name = str(payload.get("name") or payload.get("full_name") or payload.get("username") or admin_id)

    client_ip = request.client.host if request.client else "127.0.0.1"

    # Execute Stored Procedure: public.sp_admin_manual_transaction_status_update
    sp_call = text("""
        SELECT 
            success,
            transaction_id,
            new_status,
            reversal_completed,
            reversal_reference,
            reversed_amount,
            new_wallet_balance,
            message
        FROM public.sp_admin_manual_transaction_status_update(
            p_transaction_id => :txn_id,
            p_new_status     => :new_status,
            p_admin_id       => :admin_id,
            p_admin_name     => :admin_name,
            p_failure_reason => :failure_reason,
            p_remarks        => :remarks,
            p_ip_address     => :ip_addr
        );
    """)

    try:
        res = await db.execute(
            sp_call,
            {
                "txn_id": clean_id,
                "new_status": target_status,
                "admin_id": admin_id,
                "admin_name": admin_name,
                "failure_reason": body.failure_reason.strip() if body.failure_reason else None,
                "remarks": body.remarks.strip() if body.remarks else None,
                "ip_addr": client_ip
            }
        )
        row = res.mappings().first()
        await db.commit()

        if not row or not row["success"]:
            err_msg = row["message"] if row else "Stored procedure returned no response"
            logger.warning(f"[ADMIN STATUS UPDATE ERROR] Txn: {clean_id} | Reason: {err_msg}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
            )

        logger.info(
            f"[ADMIN STATUS UPDATE SUCCESS] Txn: {clean_id} -> {row['new_status']} | Reversed: {row['reversal_completed']} | Ref: {row['reversal_reference']} | Amount: {row['reversed_amount']}"
        )

        return {
            "success": True,
            "status_updated": True,
            "transaction_id": row["transaction_id"],
            "new_status": row["new_status"],
            "reversal_completed": bool(row["reversal_completed"]),
            "reversal_reference": row["reversal_reference"] or "",
            "reversed_amount": safe_float(row["reversed_amount"]),
            "new_wallet_balance": safe_float(row["new_wallet_balance"]),
            "message": row["message"]
        }

    except HTTPException:
        await db.rollback()
        raise
    except Exception as ex:
        await db.rollback()
        logger.error(f"[ADMIN STATUS UPDATE EXCEPTION] Txn: {clean_id} | Exception: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status update failed: {str(ex)}"
        )
