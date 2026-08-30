"""
Pay2Pay General Financial Transaction Report REST API
Authoritative, Role-Based, Append-Only Ledger Reporting Engine

Endpoints:
- GET /api/v1/transactions/report (Main Transaction Report API)
- GET /transactions/report
- GET /api/transactions/report

Features:
- Live database queries directly against normalized `transactions` ledger table
- 16-Column strict report contract (Txn ID, Ref ID, Service, Wallet, Entry, Amount, Opening Bal, Closing Bal, Description, Date & Time, Status, Company, Retailer, Distributor, SD, RM)
- Role-based scoping: ADMIN (All), RETAILER (Own), RM (Mapped Retailers), CRM (Scoped Companies), DISTRIBUTOR, SD
- Component ledger rows preservation (Atomic lines: Payout Amount, Payout Charge, GST)
- Server-side date filtering (Default: TODAY in IST), status, service, wallet, entry_type, search, sorting & pagination
- Complete error validation (400 for INVALID_USER_TYPE, INVALID_DATE, INVALID_STATUS, etc., 401 for UNAUTHORIZED)
"""

import re
import json
import math
import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any, Union, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.application.user_type_service import UserTypeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["Transaction Report"])

IST = timezone(timedelta(hours=5, minutes=30))


def round_curr(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0


# ==============================================================================
# AUTHENTICATION & ROLE CONTEXT RESOLUTION
# ==============================================================================

class AuthContext(BaseModel):
    user_id: Optional[str] = None
    user_type: str = "GUEST"           # ADMIN, RETAILER, RM, CRM, DISTRIBUTOR, SD
    user_type_ref_id: Optional[int] = None
    roles: List[str] = []
    tenant_ref_id: Optional[int] = None
    company_ref_id: Optional[int] = None
    retailer_ref_id: Optional[int] = None
    regional_manager_ref_id: Optional[int] = None
    distributor_ref_id: Optional[int] = None
    super_distributor_ref_id: Optional[int] = None
    tenant_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    retailer_id: Optional[uuid.UUID] = None
    rm_id: Optional[uuid.UUID] = None
    crm_scope_companies: List[int] = []


async def resolve_auth_context(request: Request, db: AsyncSession) -> AuthContext:
    """
    Authoritatively extracts user identity and role scope from JWT credentials.
    Strictly verifies permissions and scopes on the backend.
    Never trusts user_type_ref_id supplied by frontend for authorization.
    """
    token = None
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = (
            request.cookies.get("p2p_access_token") or
            request.cookies.get("pay2pay_access_token") or
            request.cookies.get("pay2pay_auth_token") or
            request.cookies.get("access_token")
        )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error_code": "UNAUTHORIZED", "message": "Authentication token required"}
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error_code": "UNAUTHORIZED", "message": "Invalid or expired authentication token"}
        )

    sub_str = str(payload.get("sub") or "")
    roles = payload.get("roles") or []
    if isinstance(roles, str):
        roles = [roles]
    role_claim = str(payload.get("role") or "").upper()
    all_roles = [str(r).upper() for r in roles]
    if role_claim and role_claim not in all_roles:
        all_roles.append(role_claim)

    ctx = AuthContext(
        user_id=sub_str,
        roles=all_roles
    )

    # 1. Check ADMIN Roles
    admin_keywords = {"SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "COMPANY_ADMIN", "SUPERADMIN"}
    if any(r in admin_keywords for r in all_roles):
        ctx.user_type = "ADMIN"
        ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "ADMIN")
        if payload.get("company_ref_id"):
            ctx.company_ref_id = int(payload.get("company_ref_id"))
        return ctx

    # 2. Check RM (Regional Manager) Roles
    rm_keywords = {"RM", "REGIONAL_MANAGER", "REGIONAL_DIRECTOR", "RM_USER"}
    if any(r in rm_keywords for r in all_roles):
        ctx.user_type = "RM"
        ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "RM")
        try:
            rm_q = await db.execute(text("""
                SELECT regional_manager_ref_id, public_id 
                FROM public.regional_manager 
                WHERE public_id::text = :sub OR mobile = :sub OR email = :sub
                LIMIT 1;
            """), {"sub": sub_str})
            rm_row = rm_q.fetchone()
            if rm_row:
                ctx.regional_manager_ref_id = rm_row[0]
                ctx.rm_id = rm_row[1]
        except Exception:
            pass
        return ctx

    # 3. Check SD (Super Distributor) Roles
    sd_keywords = {"SD", "SUPER_DISTRIBUTOR", "SUPERDISTRIBUTOR"}
    if any(r in sd_keywords for r in all_roles):
        ctx.user_type = "SD"
        ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "SD")
        return ctx

    # 4. Check DISTRIBUTOR Roles
    dist_keywords = {"DISTRIBUTOR", "DIST"}
    if any(r in dist_keywords for r in all_roles):
        ctx.user_type = "DISTRIBUTOR"
        ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "DISTRIBUTOR")
        return ctx

    # 5. Check CRM Roles
    crm_keywords = {"CRM", "CRM_USER", "SUPPORT", "SUPPORT_ADMIN", "OPS_ADMIN", "HELPDESK"}
    if any(r in crm_keywords for r in all_roles):
        ctx.user_type = "CRM"
        ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "CRM")
        return ctx

    # 6. Check RETAILER Role (or fallback from Retailer database lookup)
    is_retailer = any(r in {"RETAILER", "RETAILER_USER", "STORE_OWNER", "AGENT", "PARTNER"} for r in all_roles)

    if payload.get("retailer_ref_id"):
        try:
            ctx.retailer_ref_id = int(payload.get("retailer_ref_id"))
        except (ValueError, TypeError):
            pass
    if payload.get("company_ref_id"):
        try:
            ctx.company_ref_id = int(payload.get("company_ref_id"))
        except (ValueError, TypeError):
            pass
    if payload.get("tenant_ref_id"):
        try:
            ctx.tenant_ref_id = int(payload.get("tenant_ref_id"))
        except (ValueError, TypeError):
            pass

    ret_code_claim = payload.get("retailer_code")
    ret_id_claim = payload.get("retailer_id") or sub_str
    mobile_claim = payload.get("mobile")

    try:
        ret_q = await db.execute(text("""
            SELECT r.retailer_ref_id, r.public_id, r.tenant_ref_id, r.company_ref_id, r.regional_manager_ref_id 
            FROM public.retailer r
            LEFT JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id
            WHERE r.public_id::text = CAST(:sub AS VARCHAR) 
               OR r.retailer_code = CAST(:sub AS VARCHAR)
               OR (CAST(:ret_code AS VARCHAR) IS NOT NULL AND r.retailer_code = CAST(:ret_code AS VARCHAR))
               OR (CAST(:ret_id AS VARCHAR) IS NOT NULL AND r.public_id::text = CAST(:ret_id AS VARCHAR))
               OR (CAST(:mobile AS VARCHAR) IS NOT NULL AND (rc.mobile = CAST(:mobile AS VARCHAR) OR rc.mobile = '91' || CAST(:mobile AS VARCHAR) OR rc.mobile = '+91' || CAST(:mobile AS VARCHAR)))
            ORDER BY (CASE WHEN r.status = 'ACTIVE' THEN 1 ELSE 2 END), r.is_active DESC
            LIMIT 1;
        """), {
            "sub": str(sub_str) if sub_str else "",
            "ret_code": str(ret_code_claim) if ret_code_claim else None,
            "ret_id": str(ret_id_claim) if ret_id_claim else None,
            "mobile": str(mobile_claim) if mobile_claim else None
        })
        ret_row = ret_q.fetchone()
        if ret_row:
            ctx.user_type = "RETAILER"
            ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "RETAILER")
            if not ctx.retailer_ref_id:
                ctx.retailer_ref_id = ret_row[0]
            ctx.retailer_id = ret_row[1]
            if not ctx.tenant_ref_id:
                ctx.tenant_ref_id = ret_row[2]
            if not ctx.company_ref_id:
                ctx.company_ref_id = ret_row[3]
            ctx.regional_manager_ref_id = ret_row[4]
            return ctx
    except Exception as e:
        logger.warning(f"Error resolving retailer context: {e}")

    ctx.user_type = "RETAILER"
    ctx.user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, "RETAILER")
    return ctx


# ==============================================================================
# PYDANTIC RESPONSE SCHEMAS
# ==============================================================================

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_records: int
    total_pages: int


class TransactionReportItem(BaseModel):
    txn_id: str
    ref_id: str
    service: str
    wallet: str
    entry: str
    amount: float
    opening_bal: float
    closing_bal: float
    description: str
    date_time: str
    status: str
    company: str
    retailer: str
    distributor: str
    sd: str
    rm: str


class TransactionReportResponse(BaseModel):
    success: bool
    message: str
    data: List[TransactionReportItem]
    pagination: PaginationMeta


# ==============================================================================
# PARAMETER VALIDATION
# ==============================================================================

def validate_transaction_report_params(
    page: int,
    limit: int,
    from_date: Optional[str],
    to_date: Optional[str],
    service_filter: Optional[str],
    entry_filter: Optional[str],
    status_filter: Optional[str],
    wallet_filter: Optional[str],
    sort_by: Optional[str],
    sort_order: Optional[str]
) -> Tuple[datetime, datetime, str, str]:
    """
    Validates query parameters for Transaction Report API.
    Raises 400 Bad Request on invalid values.
    """
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_PAGE", "message": "Page parameter must be greater than or equal to 1"}
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_LIMIT", "message": "Limit parameter must be between 1 and 100"}
        )

    now_ist = datetime.now(IST)

    # Date validation: default TODAY
    if from_date and from_date.strip():
        try:
            start_dt = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "error_code": "INVALID_DATE", "message": "Invalid from_date. Expected format: YYYY-MM-DD"}
            )
    else:
        start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)

    if to_date and to_date.strip():
        try:
            end_dt = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "error_code": "INVALID_DATE", "message": "Invalid to_date. Expected format: YYYY-MM-DD"}
            )
    else:
        end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)

    if start_dt > end_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_DATE", "message": "from_date cannot be later than to_date"}
        )

    # Entry Type Validation
    if entry_filter and entry_filter.strip().upper() not in ("ALL", "CREDIT", "DEBIT", "CR", "DR"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_ENTRY_TYPE", "message": f"Invalid entry_type: '{entry_filter}'. Allowed values: CREDIT, DEBIT, ALL"}
        )

    # Status Validation
    if status_filter and status_filter.strip().upper() not in ("ALL", "SUCCESS", "PENDING", "FAILED", "REVERSED", "SETTLED", "COMPLETED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_STATUS", "message": f"Invalid status: '{status_filter}'. Allowed values: SUCCESS, PENDING, FAILED, REVERSED, ALL"}
        )

    # Sort validation whitelist
    sort_map = {
        "date_time": "t.created_at",
        "date": "t.created_at",
        "time": "t.created_at",
        "datetime": "t.created_at",
        "created_at": "t.created_at",
        "amount": "t.amount",
        "opening_bal": "t.balance_before",
        "closing_bal": "t.balance_after",
        "status": "t.status",
        "txn_id": "t.txn_id",
        "ref_id": "t.ref_id",
        "service": "t.service_name",
        "entry": "t.entry_type",
        "retailer": "COALESCE(t.retailer_name, ret.legal_name, ret.owner_name)",
        "company": "COALESCE(comp.company_name, comp.legal_name)"
    }
    validated_sort = sort_map.get((sort_by or "").lower().strip(), "t.created_at")
    validated_order = "ASC" if (sort_order or "").lower().strip() == "asc" else "DESC"

    return start_dt, end_dt, validated_sort, validated_order


# ==============================================================================
# TRANSACTION REPORT ENDPOINTS
# ==============================================================================

@router.get(
    "/report",
    summary="Get Pay2Pay Transaction Report",
    description="Authoritative, 16-column General Financial Transaction Report API supporting ADMIN, RETAILER, RM, CRM, DISTRIBUTOR, SD."
)
@router.get("/transactions/report", include_in_schema=False)
async def get_transaction_report(
    request: Request,
    page: int = Query(1, description="Page number (default: 1)"),
    limit: int = Query(25, description="Page size limit (default: 25, max: 100)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD), default: TODAY"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD), default: TODAY"),
    service: Optional[str] = Query(None, description="Service filter (PAYOUT, DMT, AEPS, RECHARGE, ALL)"),
    entry_type: Optional[str] = Query(None, description="Entry type filter (CREDIT, DEBIT, ALL)"),
    status: Optional[str] = Query(None, description="Status filter (SUCCESS, PENDING, FAILED, REVERSED, ALL)"),
    wallet: Optional[str] = Query(None, description="Wallet filter (MAIN, COMMISSION, SETTLEMENT, ALL)"),
    user_type: Optional[str] = Query(None, description="User type filter (ADMIN, RETAILER, DISTRIBUTOR, SD, CRM, RM, ALL)"),
    search: Optional[str] = Query(None, description="Search term for Txn ID, Ref ID, Service, Retailer, Description"),
    sort_by: Optional[str] = Query("date_time", description="Sort by field (default: date_time)"),
    sort_order: Optional[str] = Query("DESC", description="Sort direction (ASC, DESC)"),
    db: AsyncSession = Depends(get_db)
):
    # 1. Resolve Auth & Scopes (Never trust client-supplied IDs for authorization)
    auth_ctx = await resolve_auth_context(request, db)

    # 2. Validate Inputs
    start_dt, end_dt, sort_col, sort_dir = validate_transaction_report_params(
        page=page,
        limit=limit,
        from_date=from_date,
        to_date=to_date,
        service_filter=service,
        entry_filter=entry_type,
        status_filter=status,
        wallet_filter=wallet,
        sort_by=sort_by,
        sort_order=sort_order
    )

    # 3. Validate user_type query parameter if provided
    query_user_type_ref_id: Optional[int] = None
    query_user_type_code: Optional[str] = None
    if user_type is not None and str(user_type).strip() != "":
        validated_ut = UserTypeService.validate_user_type(user_type, allow_all=True)
        if validated_ut != "ALL":
            query_user_type_code = validated_ut
            query_user_type_ref_id = await UserTypeService.get_user_type_ref_id(db, validated_ut)

    # For non-admin users, restrict to their authorized user_type_ref_id
    effective_user_type_ref_id = query_user_type_ref_id
    effective_user_type_code = query_user_type_code

    if auth_ctx.user_type == "RETAILER":
        effective_user_type_ref_id = auth_ctx.user_type_ref_id
        effective_user_type_code = "RETAILER"
    elif auth_ctx.user_type == "RM":
        # RM sees mapped retailers' transactions
        pass

    # 4. Execute Authoritative PostgreSQL Stored Function
    tenant_ref_id = auth_ctx.tenant_ref_id or 1
    company_ref_id = auth_ctx.company_ref_id
    retailer_ref_id = auth_ctx.retailer_ref_id
    rm_ref_id = auth_ctx.regional_manager_ref_id

    # Format from_date and to_date as YYYY-MM-DD
    from_d_str = start_dt.strftime("%Y-%m-%d")
    to_d_str = end_dt.strftime("%Y-%m-%d")

    # Dynamic Count Query
    where_clauses = [
        "COALESCE(t.tenant_ref_id, ret.tenant_ref_id, 1) = :tenant_ref_id",
        "(t.is_deleted IS NULL OR t.is_deleted = FALSE)",
        "(t.is_active IS NULL OR t.is_active = TRUE)",
        "t.created_at >= :start_dt",
        "t.created_at <= :end_dt"
    ]
    count_params: Dict[str, Any] = {
        "tenant_ref_id": tenant_ref_id,
        "start_dt": start_dt,
        "end_dt": end_dt
    }

    if company_ref_id is not None:
        where_clauses.append("COALESCE(t.company_ref_id, ret.company_ref_id, 1) = :company_ref_id")
        count_params["company_ref_id"] = company_ref_id

    if retailer_ref_id is not None:
        where_clauses.append("t.retailer_ref_id = :retailer_ref_id")
        count_params["retailer_ref_id"] = retailer_ref_id

    if rm_ref_id is not None:
        where_clauses.append("COALESCE(t.regional_manager_ref_id, ret.regional_manager_ref_id) = :rm_ref_id")
        count_params["rm_ref_id"] = rm_ref_id

    if effective_user_type_ref_id is not None:
        where_clauses.append("t.user_type_ref_id = :user_type_ref_id")
        count_params["user_type_ref_id"] = effective_user_type_ref_id
    elif effective_user_type_code is not None:
        where_clauses.append("UPPER(COALESCE(t.user_type, 'RETAILER')) = :user_type_val")
        count_params["user_type_val"] = effective_user_type_code.upper()

    if service and service.strip().upper() != "ALL":
        where_clauses.append("UPPER(t.service_name) = :service_val")
        count_params["service_val"] = service.strip().upper()

    if wallet and wallet.strip().upper() != "ALL":
        where_clauses.append("UPPER(COALESCE(t.wallet_type, 'MAIN')) = :wallet_val")
        count_params["wallet_val"] = wallet.strip().upper()

    if entry_type and entry_type.strip().upper() != "ALL":
        entry_val = entry_type.strip().upper()
        if entry_val in ("CR", "CREDIT"):
            where_clauses.append("UPPER(t.entry_type) IN ('CREDIT', 'CR')")
        elif entry_val in ("DR", "DEBIT"):
            where_clauses.append("UPPER(t.entry_type) IN ('DEBIT', 'DR')")
        else:
            where_clauses.append("UPPER(t.entry_type) = :entry_val")
            count_params["entry_val"] = entry_val

    if status and status.strip().upper() != "ALL":
        where_clauses.append("UPPER(t.status) = :status_val")
        count_params["status_val"] = status.strip().upper()

    if search and search.strip():
        where_clauses.append("""(
            t.txn_id ILIKE :search_val OR
            t.ref_id ILIKE :search_val OR
            t.service_name ILIKE :search_val OR
            t.narration ILIKE :search_val OR
            t.retailer_name ILIKE :search_val OR
            ret.store_name ILIKE :search_val OR
            ret.legal_name ILIKE :search_val OR
            c.company_name ILIKE :search_val
        )""")
        count_params["search_val"] = f"%{search.strip()}%"

    count_sql = f"""
    SELECT COUNT(*) 
    FROM public.transactions t
    LEFT JOIN public.retailer ret ON ret.retailer_ref_id = t.retailer_ref_id
    LEFT JOIN public.company c ON c.company_ref_id = COALESCE(t.company_ref_id, ret.company_ref_id)
    WHERE {" AND ".join(where_clauses)};
    """

    count_res = await db.execute(text(count_sql), count_params)
    total_records = int(count_res.scalar() or 0)
    total_pages = math.ceil(total_records / limit) if total_records > 0 else 0

    if total_records == 0:
        return {
            "success": True,
            "message": "No transactions found",
            "data": [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total_records": 0,
                "total_pages": 0
            }
        }

    sp_params = {
        "tenant_ref_id": tenant_ref_id,
        "company_ref_id": company_ref_id,
        "retailer_ref_id": retailer_ref_id,
        "rm_ref_id": rm_ref_id,
        "user_type_ref_id": effective_user_type_ref_id,
        "user_type": effective_user_type_code,
        "from_date": start_dt.date(),
        "to_date": end_dt.date(),
        "service": service.strip().upper() if service and service.strip().upper() != "ALL" else None,
        "wallet": wallet.strip().upper() if wallet and wallet.strip().upper() != "ALL" else None,
        "entry": entry_type.strip().upper() if entry_type and entry_type.strip().upper() != "ALL" else None,
        "status": status.strip().upper() if status and status.strip().upper() != "ALL" else None,
        "search": search.strip() if search and search.strip() else None,
        "page": page,
        "limit": limit
    }

    select_sp_sql = """
    SELECT * FROM public.get_transactions_report(
        p_tenant_ref_id := CAST(:tenant_ref_id AS BIGINT),
        p_company_ref_id := CAST(:company_ref_id AS BIGINT),
        p_user_ref_id := CAST(:retailer_ref_id AS BIGINT),
        p_rm_ref_id := CAST(:rm_ref_id AS BIGINT),
        p_user_type_ref_id := CAST(:user_type_ref_id AS BIGINT),
        p_user_type := CAST(:user_type AS VARCHAR),
        p_from_date := CAST(:from_date AS DATE),
        p_to_date := CAST(:to_date AS DATE),
        p_service := CAST(:service AS VARCHAR),
        p_wallet := CAST(:wallet AS VARCHAR),
        p_entry := CAST(:entry AS VARCHAR),
        p_status := CAST(:status AS VARCHAR),
        p_search := CAST(:search AS VARCHAR),
        p_page := CAST(:page AS INTEGER),
        p_limit := CAST(:limit AS INTEGER)
    );
    """

    rows_res = await db.execute(text(select_sp_sql), sp_params)
    rows = rows_res.fetchall()

    # 5. Format Output (16 Columns in strict order)
    output_items: List[Dict[str, Any]] = []
    for r in rows:
        m = dict(r._mapping)
        dt = m.get("date_time")
        if isinstance(dt, datetime):
            dt_ist = dt.astimezone(IST)
            formatted_dt = dt_ist.isoformat()
        else:
            formatted_dt = str(dt) if dt else ""

        item = {
            "txn_id": m.get("txn_id") or "",
            "ref_id": m.get("ref_id") or "",
            "service": m.get("service") or "PAYOUT",
            "wallet": m.get("wallet") or "MAIN",
            "entry": (m.get("entry") or "DEBIT").upper(),
            "amount": round_curr(m.get("amount")),
            "opening_bal": round_curr(m.get("opening_bal")),
            "closing_bal": round_curr(m.get("closing_bal")),
            "description": m.get("description") or "",
            "date_time": formatted_dt,
            "status": (m.get("status") or "SUCCESS").upper(),
            "company": m.get("company") or "Pay2Pay",
            "retailer": m.get("retailer") or "Retailer",
            "distributor": m.get("distributor") or "",
            "sd": m.get("sd") or "",
            "rm": m.get("rm") or ""
        }
        output_items.append(item)

    return {
        "success": True,
        "message": "Transaction report retrieved successfully",
        "data": output_items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages
        }
    }


# ==============================================================================
# DYNAMIC TRANSACTION DETAILS / VIEW REPORT API
# GET /api/v1/transactions/{txn_id}
# ==============================================================================

# SENSITIVE KEYS & SANITIZATION
SENSITIVE_KEYS = {
    "password", "secret", "token", "access_token", "refresh_token",
    "api_key", "apikey", "key", "authorization", "auth", "client_secret",
    "private_key", "mpin", "mpin_hash", "otp", "salt", "signature"
}

def sanitize_api_response(raw_val: Any) -> Optional[str]:
    """
    Sanitizes vendor/API response payload by removing any sensitive keys,
    passwords, tokens, authorization headers, or internal stack traces.
    """
    if raw_val is None:
        return ""
    val_str = str(raw_val).strip()
    if not val_str:
        return ""
    
    # Try parsing as JSON to sanitize structure
    try:
        data = json.loads(val_str)
        if isinstance(data, dict):
            def _clean_dict(d: dict) -> dict:
                cleaned = {}
                for k, v in d.items():
                    if any(s_key in k.lower() for s_key in SENSITIVE_KEYS):
                        continue
                    if isinstance(v, dict):
                        cleaned[k] = _clean_dict(v)
                    elif isinstance(v, list):
                        cleaned[k] = [_clean_dict(item) if isinstance(item, dict) else item for item in v]
                    else:
                        cleaned[k] = v
                return cleaned
            return json.dumps(_clean_dict(data))
    except Exception:
        pass

    # Regex string sanitization fallback for Bearer tokens / auth headers
    sanitized = re.sub(r'Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*', '[FILTERED_TOKEN]', val_str, flags=re.IGNORECASE)
    sanitized = re.sub(r'"(token|password|secret|api_key|key)":\s*"[^"]*"', r'"\1":"[REDACTED]"', sanitized, flags=re.IGNORECASE)
    return sanitized[:1000]


def format_masked_acc(acc_val: Any) -> str:
    if not acc_val:
        return "Not Available"
    s = str(acc_val).strip()
    if len(s) <= 4:
        return "XXXXXX" + s
    return "XXXXXX" + s[-4:]


def mask_account(acc: Any) -> Optional[str]:
    if not acc:
        return None
    return str(acc).strip()


def mask_aadhaar(aadhaar: Any) -> Optional[str]:
    if not aadhaar:
        return None
    aad_str = str(aadhaar).strip().replace(" ", "").replace("-", "")
    if len(aad_str) <= 4:
        return aad_str
    return "XXXXXXXX" + aad_str[-4:]


@router.get("/{txn_id}")
@router.get("/{txn_id}/details", include_in_schema=False)
async def get_transaction_dynamic_details(
    txn_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Authoritative Dynamic Transaction Details / View Report API for ALL services.
    Reads central `transactions` financial ledger and resolves dynamic service tables.
    """
    # 1. Authenticate user & evaluate RBAC scope
    auth_ctx = await resolve_auth_context(request, db)

    # 2. Query all ledger lines for this transaction
    res = await db.execute(text("""
        SELECT 
            t.transactions_ref_id,
            t.txn_id,
            t.ref_id,
            t.service_name,
            t.wallet_type,
            t.entry_type,
            t.amount,
            t.balance_before,
            t.balance_after,
            t.status,
            t.narration,
            t.created_at,
            t.updated_at,
            t.company_ref_id,
            t.retailer_ref_id,
            t.distributor_ref_id,
            t.super_distributor_ref_id,
            t.regional_manager_ref_id,
            r.retailer_code,
            COALESCE(t.retailer_name, r.store_name, r.owner_name) AS resolved_retailer_name,
            COALESCE(c.display_name, c.company_name, c.legal_name, 'Pay2Pay') AS resolved_company_name,
            COALESCE(c.legal_name, c.company_name, 'Pay2Pay Technologies Private Limited') AS resolved_legal_name,
            COALESCE(c.company_code, 'P2P') AS resolved_company_code,
            COALESCE(cb.logo_url, '/branding/logo.png') AS resolved_logo_url,
            COALESCE(t.dist_name, d.business_name, d.owner_name) AS resolved_dist_name,
            COALESCE(t.sd_name, sd.business_name, sd.owner_name) AS resolved_sd_name,
            COALESCE(t.rm_name, rm.full_name) AS resolved_rm_name
        FROM public.transactions t
        LEFT JOIN public.retailer r ON r.retailer_ref_id = t.retailer_ref_id
        LEFT JOIN public.company c ON (c.company_ref_id = t.company_ref_id OR c.company_ref_id = r.company_ref_id)
        LEFT JOIN public.company_branding cb ON (cb.company_id = c.public_id OR cb.company_ref_id = c.company_ref_id)
        LEFT JOIN public.distributor d ON d.distributor_ref_id = t.distributor_ref_id
        LEFT JOIN public.super_distributor sd ON sd.super_distributor_ref_id = t.super_distributor_ref_id
        LEFT JOIN public.regional_manager rm ON rm.regional_manager_ref_id = t.regional_manager_ref_id
        WHERE t.txn_id = :txn_id OR t.ref_id = :txn_id
        ORDER BY t.created_at ASC, t.transactions_ref_id ASC;
    """), {"txn_id": txn_id.strip()})

    rows = [dict(r._mapping) for r in res.fetchall()]

    # Fallback Tier 1: Check enterprise_payout_transactions
    if not rows:
        ept_res = await db.execute(text("""
            SELECT 
                ept.transaction_number, ept.vendor_ref, ept.utr_number, ept.rrn,
                ept.mode, ept.status, ept.status_description as error_message, ept.vendor_name,
                ept.amount, ept.charges, ept.commission, ept.gst_amount, ept.tds_amount, ept.net_debit,
                ept.wallet_before, ept.wallet_after,
                ept.retailer_ref_id, ept.company_ref_id, ept.tenant_ref_id, ept.initiated_at, ept.completed_at, ept.created_date, ept.updated_date,
                r.retailer_code,
                COALESCE(r.store_name, r.owner_name) AS resolved_retailer_name,
                COALESCE(comp.display_name, comp.company_name, comp.legal_name, 'Pay2Pay') AS resolved_company_name,
                COALESCE(comp.legal_name, comp.company_name, 'Pay2Pay Technologies Private Limited') AS resolved_legal_name,
                COALESCE(comp.company_code, 'P2P') AS resolved_company_code,
                COALESCE(cb.logo_url, '/branding/logo.png') AS resolved_logo_url,
                COALESCE(b.full_name, bm.account_holder_name, bba.account_holder_name) as beneficiary_name,
                COALESCE(bba.account_number, bm.account_number) as account_number,
                COALESCE(bba.bank_name, bm.bank_name) as bank_name,
                COALESCE(bba.ifsc_code, bm.ifsc_code) as ifsc_code,
                COALESCE(c.full_name, c.first_name) as customer_name,
                c.mobile_number as customer_mobile
            FROM public.enterprise_payout_transactions ept
            LEFT JOIN public.retailer r ON (r.retailer_ref_id = ept.retailer_ref_id OR r.public_id = ept.retailer_id)
            LEFT JOIN public.company comp ON (comp.company_ref_id = ept.company_ref_id OR comp.public_id = ept.company_id)
            LEFT JOIN public.company_branding cb ON (cb.company_ref_id = ept.company_ref_id OR cb.company_id = comp.public_id)
            LEFT JOIN public.customer c ON (c.customer_ref_id = ept.customer_ref_id OR c.public_id = ept.customer_id)
            LEFT JOIN public.beneficiary b ON (b.public_id = ept.beneficiary_id)
            LEFT JOIN public.beneficiary_master bm ON (bm.beneficiary_master_ref_id = ept.beneficiary_master_ref_id OR bm.public_id = ept.beneficiary_id)
            LEFT JOIN public.beneficiary_bank_account bba ON (bba.beneficiary_id = ept.beneficiary_id OR bba.beneficiary_master_ref_id = ept.beneficiary_master_ref_id)
            WHERE ept.transaction_number = :txn_id OR ept.vendor_ref = :txn_id OR ept.utr_number = :txn_id
            ORDER BY ept.id DESC LIMIT 1;
        """), {"txn_id": txn_id.strip()})
        ept_row = ept_res.fetchone()
        if ept_row:
            p = dict(ept_row._mapping)
            p_amt = Decimal(str(p.get("amount") or 0))
            p_comm = Decimal(str(p.get("commission") or 0))
            p_charges = Decimal(str(p.get("charges") or 0))
            p_fee = p_comm if p_comm > 0 else (p_charges - Decimal(str(p.get("gst_amount") or 0)))
            if p_fee < 0:
                p_fee = Decimal("0.00")
            p_gst = Decimal(str(p.get("gst_amount") or 0))
            w_before = Decimal(str(p.get("wallet_before") or 0))
            w_after = Decimal(str(p.get("wallet_after") or (w_before - p_amt - p_fee - p_gst)))
            base_dt = p.get("initiated_at") or p.get("created_date") or datetime.now(timezone.utc)

            synth_rows = [
                {
                    "txn_id": p.get("transaction_number"),
                    "ref_id": p.get("vendor_ref") or p.get("transaction_number"),
                    "service_name": "PAYOUT",
                    "wallet_type": "MAIN",
                    "entry_type": "DEBIT",
                    "amount": p_amt,
                    "balance_before": w_before,
                    "balance_after": w_before - p_amt,
                    "status": p.get("status") or "SUCCESS",
                    "narration": "Payout Amount",
                    "created_at": base_dt,
                    "updated_at": p.get("completed_at") or p.get("updated_date"),
                    "retailer_ref_id": p.get("retailer_ref_id"),
                    "company_ref_id": p.get("company_ref_id"),
                    "resolved_retailer_name": p.get("resolved_retailer_name"),
                    "retailer_code": p.get("retailer_code"),
                    "resolved_company_name": p.get("resolved_company_name"),
                    "resolved_legal_name": p.get("resolved_legal_name"),
                    "resolved_company_code": p.get("resolved_company_code"),
                    "resolved_logo_url": p.get("resolved_logo_url"),
                }
            ]
            if p_fee > 0:
                synth_rows.append({
                    "txn_id": p.get("transaction_number"),
                    "ref_id": p.get("vendor_ref") or p.get("transaction_number"),
                    "service_name": "PAYOUT",
                    "wallet_type": "MAIN",
                    "entry_type": "DEBIT",
                    "amount": p_fee,
                    "balance_before": w_before - p_amt,
                    "balance_after": w_before - p_amt - p_fee,
                    "status": p.get("status") or "SUCCESS",
                    "narration": "Payout Charge",
                    "created_at": base_dt,
                    "updated_at": p.get("completed_at") or p.get("updated_date"),
                    "retailer_ref_id": p.get("retailer_ref_id"),
                    "company_ref_id": p.get("company_ref_id"),
                    "resolved_retailer_name": p.get("resolved_retailer_name"),
                    "retailer_code": p.get("retailer_code"),
                    "resolved_company_name": p.get("resolved_company_name"),
                    "resolved_legal_name": p.get("resolved_legal_name"),
                    "resolved_company_code": p.get("resolved_company_code"),
                    "resolved_logo_url": p.get("resolved_logo_url"),
                })
            if p_gst > 0:
                synth_rows.append({
                    "txn_id": p.get("transaction_number"),
                    "ref_id": p.get("vendor_ref") or p.get("transaction_number"),
                    "service_name": "PAYOUT",
                    "wallet_type": "MAIN",
                    "entry_type": "DEBIT",
                    "amount": p_gst,
                    "balance_before": w_before - p_amt - p_fee,
                    "balance_after": w_after,
                    "status": p.get("status") or "SUCCESS",
                    "narration": "GST",
                    "created_at": base_dt,
                    "updated_at": p.get("completed_at") or p.get("updated_date"),
                    "retailer_ref_id": p.get("retailer_ref_id"),
                    "company_ref_id": p.get("company_ref_id"),
                    "resolved_retailer_name": p.get("resolved_retailer_name"),
                    "retailer_code": p.get("retailer_code"),
                    "resolved_company_name": p.get("resolved_company_name"),
                    "resolved_legal_name": p.get("resolved_legal_name"),
                    "resolved_company_code": p.get("resolved_company_code"),
                    "resolved_logo_url": p.get("resolved_logo_url"),
                })
            rows = synth_rows

    # Fallback Tier 2: Check payout_transaction
    if not rows:
        pt_direct = await db.execute(text("""
            SELECT 
                pt.transaction_number, pt.gateway_reference, pt.bank_reference, pt.utr_number, pt.rrn,
                pt.mode, pt.status, pt.error_code, pt.error_message, pt.api_response_code, pt.vendor_name, pt.vendor_response,
                pt.retailer_ref_id, pt.company_ref_id, pt.tenant_ref_id, pt.created_date, pt.updated_date,
                r.retailer_code,
                COALESCE(r.store_name, r.owner_name) AS resolved_retailer_name,
                COALESCE(comp.display_name, comp.company_name, comp.legal_name, 'Pay2Pay') AS resolved_company_name,
                COALESCE(comp.legal_name, comp.company_name, 'Pay2Pay Technologies Private Limited') AS resolved_legal_name,
                COALESCE(comp.company_code, 'P2P') AS resolved_company_code,
                COALESCE(cb.logo_url, '/branding/logo.png') AS resolved_logo_url
            FROM public.payout_transaction pt
            LEFT JOIN public.retailer r ON (r.retailer_ref_id = pt.retailer_ref_id OR r.public_id = pt.retailer_id)
            LEFT JOIN public.company comp ON (comp.company_ref_id = pt.company_ref_id OR comp.public_id = pt.company_id)
            LEFT JOIN public.company_branding cb ON (cb.company_ref_id = pt.company_ref_id OR cb.company_id = comp.public_id)
            WHERE (pt.transaction_number = :txn_id OR pt.gateway_reference = :txn_id OR pt.bank_reference = :txn_id OR pt.utr_number = :txn_id)
            ORDER BY pt.id DESC LIMIT 1;
        """), {"txn_id": txn_id.strip()})
        pt_direct_row = pt_direct.fetchone()
        if pt_direct_row:
            p_map = dict(pt_direct_row._mapping)
            rows = [{
                "txn_id": p_map.get("transaction_number"),
                "ref_id": p_map.get("gateway_reference") or p_map.get("transaction_number"),
                "service_name": "PAYOUT",
                "wallet_type": "MAIN",
                "entry_type": "DEBIT",
                "amount": Decimal("0.00"),
                "balance_before": Decimal("0.00"),
                "balance_after": Decimal("0.00"),
                "status": p_map.get("status") or "SUCCESS",
                "narration": "Payout Transfer",
                "created_at": p_map.get("created_date"),
                "updated_at": p_map.get("updated_date"),
                "retailer_ref_id": p_map.get("retailer_ref_id"),
                "company_ref_id": p_map.get("company_ref_id"),
                "resolved_retailer_name": p_map.get("resolved_retailer_name"),
                "resolved_company_name": p_map.get("resolved_company_name"),
                "resolved_legal_name": p_map.get("resolved_legal_name"),
                "resolved_company_code": p_map.get("resolved_company_code"),
                "resolved_logo_url": p_map.get("resolved_logo_url"),
            }]

    # Fallback Tier 3: Check dmt_transaction
    if not rows:
        try:
            dmt_direct = await db.execute(text("""
                SELECT dt.transaction_number, dt.reference_number, dt.rrn,
                       dt.status, dt.created_date, dt.updated_date, dt.retailer_ref_id, dt.company_ref_id
                FROM public.dmt_transaction dt
                WHERE dt.transaction_number = :txn_id OR dt.reference_number = :txn_id OR dt.rrn = :txn_id
                LIMIT 1;
            """), {"txn_id": txn_id.strip()})
            dmt_direct_row = dmt_direct.fetchone()
            if dmt_direct_row:
                d_map = dict(dmt_direct_row._mapping)
                rows = [{
                    "txn_id": d_map.get("transaction_number"),
                    "ref_id": d_map.get("reference_number") or d_map.get("transaction_number"),
                    "service_name": "DMT",
                    "wallet_type": "MAIN",
                    "entry_type": "DEBIT",
                    "amount": Decimal("0.00"),
                    "balance_before": Decimal("0.00"),
                    "balance_after": Decimal("0.00"),
                    "status": d_map.get("status") or "SUCCESS",
                    "narration": "DMT Transfer",
                    "created_at": d_map.get("created_date"),
                    "updated_at": d_map.get("updated_date"),
                    "retailer_ref_id": d_map.get("retailer_ref_id"),
                    "company_ref_id": d_map.get("company_ref_id"),
                    "resolved_retailer_name": "Retailer",
                    "resolved_company_name": "Pay2Pay",
                    "resolved_legal_name": "Pay2Pay Technologies Private Limited",
                    "resolved_company_code": "P2P",
                    "resolved_logo_url": "/branding/logo.png",
                }]
        except Exception:
            pass

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "error_code": "TRANSACTION_NOT_FOUND", "message": f"Transaction '{txn_id}' not found"}
        )

    # 3. RBAC Scoping Validation & Filtering
    if auth_ctx.user_type == "RETAILER" and auth_ctx.retailer_ref_id:
        scoped_rows = [r for r in rows if r.get("retailer_ref_id") == auth_ctx.retailer_ref_id]
        if not scoped_rows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"success": False, "error_code": "FORBIDDEN", "message": "You are not authorized to view this transaction."}
            )
        rows = scoped_rows
    elif auth_ctx.user_type == "RM" and auth_ctx.regional_manager_ref_id:
        scoped_rows = [r for r in rows if r.get("regional_manager_ref_id") == auth_ctx.regional_manager_ref_id]
        if not scoped_rows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"success": False, "error_code": "FORBIDDEN", "message": "You are not authorized to view this transaction."}
            )
        rows = scoped_rows
    elif auth_ctx.user_type == "DISTRIBUTOR" and auth_ctx.distributor_ref_id:
        scoped_rows = [r for r in rows if r.get("distributor_ref_id") == auth_ctx.distributor_ref_id]
        if not scoped_rows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"success": False, "error_code": "FORBIDDEN", "message": "You are not authorized to view this transaction."}
            )
        rows = scoped_rows
    elif auth_ctx.user_type == "SD" and auth_ctx.super_distributor_ref_id:
        scoped_rows = [r for r in rows if r.get("super_distributor_ref_id") == auth_ctx.super_distributor_ref_id]
        if not scoped_rows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"success": False, "error_code": "FORBIDDEN", "message": "You are not authorized to view this transaction."}
            )
        rows = scoped_rows

    primary = rows[0]
    service_raw = (primary.get("service_name") or "GENERAL").strip().upper()
    service_code = service_raw.replace(" ", "_")

    # 4. Financial Ledger Movement Analysis
    ledger_entries = []
    tot_debit = Decimal("0.00")
    tot_credit = Decimal("0.00")
    base_amt = Decimal("0.00")
    charge_amt = Decimal("0.00")
    gst_amt = Decimal("0.00")
    comm_amt = Decimal("0.00")
    tds_amt = Decimal("0.00")

    opening_balance = rows[0].get("balance_before")
    closing_balance = rows[-1].get("balance_after")

    for r in rows:
        amt = Decimal(str(r.get("amount") or 0))
        entry_type = (r.get("entry_type") or "DEBIT").upper()
        narr = (r.get("narration") or "").strip()

        if entry_type == "DEBIT":
            tot_debit += amt
            narr_lower = narr.lower()
            if "gst" in narr_lower or "tax" in narr_lower:
                gst_amt += amt
            elif "charge" in narr_lower or "fee" in narr_lower:
                charge_amt += amt
            elif "commission" in narr_lower:
                comm_amt += amt
            elif "tds" in narr_lower:
                tds_amt += amt
            else:
                base_amt += amt
        else:
            tot_credit += amt

        dt_item = r.get("created_at")
        dt_ist_str = dt_item.astimezone(IST).strftime("%d-%b-%Y %I:%M:%S %p") if isinstance(dt_item, datetime) else str(dt_item or "")

        ledger_entries.append({
            "entry_type": entry_type,
            "amount": round_curr(amt),
            "balance_before": round_curr(r.get("balance_before")),
            "balance_after": round_curr(r.get("balance_after")),
            "narration": narr,
            "date_time": dt_ist_str,
            "created_at": dt_item.isoformat() if isinstance(dt_item, datetime) else str(dt_item or ""),
        })

    if base_amt == Decimal("0.00") and (tot_debit > 0 or tot_credit > 0):
        base_amt = tot_debit if tot_debit > 0 else tot_credit

    # 5. Dynamic Service Details Loading
    service_details = {}
    processing_info = {
        "status": (primary.get("status") or "SUCCESS").upper(),
        "api_status": "SUCCESS" if (primary.get("status") or "").upper() == "SUCCESS" else primary.get("status"),
        "api_response_code": "00" if (primary.get("status") or "").upper() == "SUCCESS" else "99",
        "channel": "SYSTEM",
        "gateway": "PAY2PAY SYSTEM",
        "utr": None,
        "rrn": None,
    }
    customer_info = {}
    payout_db_status = None
    vendor_name_val = None
    vendor_api_status_val = None
    vendor_api_response_val = None

    # Service Table: PAYOUT
    if "PAYOUT" in service_code:
        try:
            # Tier 1: Check public.payout_transaction with ordering and scoping
            pt_res = await db.execute(text("""
                SELECT pt.transaction_number, pt.gateway_reference, pt.bank_reference, pt.utr_number, pt.rrn,
                       pt.mode, pt.status, pt.error_code, pt.error_message, pt.api_response_code, pt.vendor_name, pt.vendor_response,
                       COALESCE(bm.account_holder_name, bba.account_holder_name) as beneficiary_name,
                       COALESCE(bm.account_number, bba.account_number) as account_number,
                       COALESCE(bm.bank_name, bba.bank_name) as bank_name,
                       COALESCE(bm.ifsc_code, bba.ifsc_code) as ifsc_code,
                       COALESCE(bm.branch_name, bba.branch_name) as branch_name,
                       COALESCE(c.full_name, c.first_name) as customer_name,
                       c.mobile_number as customer_mobile,
                       comp.display_name as company_name,
                       cb.logo_url as company_logo
                FROM public.payout_transaction pt
                LEFT JOIN public.beneficiary_master bm ON bm.beneficiary_master_ref_id = pt.beneficiary_master_ref_id
                LEFT JOIN public.beneficiary_bank_account bba ON bba.beneficiary_master_ref_id = pt.beneficiary_master_ref_id
                LEFT JOIN public.customer c ON c.customer_ref_id = pt.customer_ref_id
                LEFT JOIN public.company comp ON comp.company_ref_id = pt.company_ref_id
                LEFT JOIN public.company_branding cb ON (cb.company_ref_id = pt.company_ref_id OR cb.company_id = comp.public_id)
                WHERE (pt.transaction_number = :txn_id OR pt.gateway_reference = :txn_id OR pt.bank_reference = :txn_id OR pt.utr_number = :txn_id)
                  AND (CAST(:retailer_ref_id AS BIGINT) IS NULL OR pt.retailer_ref_id = CAST(:retailer_ref_id AS BIGINT))
                  AND (CAST(:company_ref_id AS BIGINT) IS NULL OR pt.company_ref_id = CAST(:company_ref_id AS BIGINT))
                ORDER BY (pt.beneficiary_master_ref_id IS NOT NULL) DESC, (c.customer_ref_id IS NOT NULL) DESC, pt.id DESC
                LIMIT 1;
            """), {
                "txn_id": txn_id.strip(),
                "retailer_ref_id": auth_ctx.retailer_ref_id if auth_ctx.user_type == "RETAILER" else None,
                "company_ref_id": auth_ctx.company_ref_id if auth_ctx.company_ref_id else None,
            })
            pt_row = pt_res.fetchone()

            # Tier 2: Check public.payout_workflow_transactions if Tier 1 returned nothing
            if not pt_row:
                pt_res = await db.execute(text("""
                    SELECT pwt.transaction_number, pwt.reference_number, pwt.utr_number, pwt.mode, pwt.status, pwt.failure_reason as error_message, NULL as vendor_name, NULL as vendor_response,
                           COALESCE(bm.account_holder_name, bba.account_holder_name) as beneficiary_name,
                           COALESCE(bm.account_number, bba.account_number) as account_number,
                           COALESCE(bm.bank_name, bba.bank_name) as bank_name,
                           COALESCE(bm.ifsc_code, bba.ifsc_code) as ifsc_code,
                           COALESCE(bm.branch_name, bba.branch_name) as branch_name,
                           COALESCE(c.full_name, c.first_name) as customer_name,
                           c.mobile_number as customer_mobile,
                           NULL as company_name, NULL as company_logo
                    FROM public.payout_workflow_transactions pwt
                    LEFT JOIN public.beneficiary_master bm ON bm.beneficiary_master_ref_id = pwt.beneficiary_master_ref_id
                    LEFT JOIN public.beneficiary_bank_account bba ON bba.beneficiary_master_ref_id = pwt.beneficiary_master_ref_id
                    LEFT JOIN public.customer c ON c.customer_ref_id = pwt.customer_ref_id
                    WHERE pwt.transaction_number = :txn_id OR pwt.reference_number = :txn_id OR pwt.utr_number = :txn_id
                    ORDER BY (bm.beneficiary_master_ref_id IS NOT NULL) DESC, pwt.id DESC
                    LIMIT 1;
                """), {"txn_id": txn_id.strip()})
                pt_row = pt_res.fetchone()

            # Tier 3: Check public.enterprise_payout_transactions
            if not pt_row:
                pt_res = await db.execute(text("""
                    SELECT ept.transaction_number, ept.vendor_ref, ept.utr_number, ept.rrn, ept.mode, ept.status, ept.status_description as error_message, ept.vendor_name, NULL as vendor_response,
                           COALESCE(b.full_name, bm.account_holder_name, bba.account_holder_name) as beneficiary_name,
                           COALESCE(bba.account_number, bm.account_number) as account_number,
                           COALESCE(bba.bank_name, bm.bank_name) as bank_name,
                           COALESCE(bba.ifsc_code, bm.ifsc_code) as ifsc_code,
                           COALESCE(bm.branch_name, bba.branch_name) as branch_name,
                           COALESCE(c.full_name, c.first_name) as customer_name,
                           c.mobile_number as customer_mobile,
                           comp.display_name as company_name, cb.logo_url as company_logo
                    FROM public.enterprise_payout_transactions ept
                    LEFT JOIN public.retailer r ON (r.retailer_ref_id = ept.retailer_ref_id OR r.public_id = ept.retailer_id)
                    LEFT JOIN public.company comp ON (comp.company_ref_id = ept.company_ref_id OR comp.public_id = ept.company_id)
                    LEFT JOIN public.company_branding cb ON (cb.company_ref_id = ept.company_ref_id OR cb.company_id = comp.public_id)
                    LEFT JOIN public.customer c ON (c.customer_ref_id = ept.customer_ref_id OR c.public_id = ept.customer_id)
                    LEFT JOIN public.beneficiary b ON (b.public_id = ept.beneficiary_id)
                    LEFT JOIN public.beneficiary_master bm ON (bm.beneficiary_master_ref_id = ept.beneficiary_master_ref_id OR bm.public_id = ept.beneficiary_id)
                    LEFT JOIN public.beneficiary_bank_account bba ON (bba.beneficiary_id = ept.beneficiary_id OR bba.beneficiary_master_ref_id = ept.beneficiary_master_ref_id)
                    WHERE ept.transaction_number = :txn_id OR ept.vendor_ref = :txn_id OR ept.utr_number = :txn_id
                    ORDER BY ept.id DESC
                    LIMIT 1;
                """), {"txn_id": txn_id.strip()})
                pt_row = pt_res.fetchone()

            # Tier 4: Check public.payout_instruction
            if not pt_row:
                pt_res = await db.execute(text("""
                    SELECT pi.payout_reference as transaction_number, pi.bank_account_number as account_number, pi.ifsc as ifsc_code, pi.payout_method as mode, pi.utr_number, pi.status, NULL as vendor_name, NULL as vendor_response, NULL as error_message,
                           NULL as beneficiary_name, NULL as bank_name, NULL as branch_name, NULL as customer_name, NULL as customer_mobile, NULL as company_name, NULL as company_logo
                    FROM public.payout_instruction pi
                    WHERE pi.payout_reference = :txn_id
                    LIMIT 1;
                """), {"txn_id": txn_id.strip()})
                pt_row = pt_res.fetchone()

            if pt_row:
                pt = dict(pt_row._mapping)
                acc = pt.get("account_number")
                payout_db_status = pt.get("status")
                vendor_name_val = pt.get("vendor_name")
                vendor_api_status_val = pt.get("status")
                vendor_api_response_val = pt.get("vendor_response") or pt.get("error_message")

                service_details = {
                    "beneficiary": pt.get("beneficiary_name") or primary.get("resolved_retailer_name"),
                    "bank": pt.get("bank_name"),
                    "account": str(acc).strip() if acc else None,
                    "ifsc": pt.get("ifsc_code"),
                    "branch": pt.get("branch_name"),
                    "utr": pt.get("utr_number") or pt.get("bank_reference") or pt.get("rrn") or None,
                    "mode": pt.get("mode") or "IMPS",
                    "rrn": pt.get("rrn") or None,
                    "company_name": pt.get("company_name"),
                    "company_logo": pt.get("company_logo"),
                }
                if pt.get("customer_name"):
                    customer_info["customer"] = pt.get("customer_name")
                if pt.get("customer_mobile"):
                    customer_info["customer_mobile"] = pt.get("customer_mobile")
                if pt.get("utr_number"):
                    processing_info["utr"] = pt.get("utr_number")
                if pt.get("rrn"):
                    processing_info["rrn"] = pt.get("rrn")
                if pt.get("mode"):
                    processing_info["channel"] = pt.get("mode")
                if pt.get("error_message"):
                    service_details["failure_reason"] = pt.get("error_message")
            else:
                service_details = {
                    "beneficiary": primary.get("resolved_retailer_name"),
                    "utr": primary.get("ref_id") or primary.get("txn_id"),
                    "mode": "IMPS"
                }
        except Exception as e:
            logger.warning(f"Error loading payout details for {txn_id}: {e}")

    # Service Table: DMT
    elif "DMT" in service_code:
        try:
            dmt_res = await db.execute(text("""
                SELECT dt.transaction_number, dt.reference_number, dt.rrn, dt.utr, dt.service_type, dt.transaction_mode,
                       dt.bank_account_number, dt.bank_ifsc, dt.bank_name, dt.beneficiary_name, dt.purpose,
                       c.full_name as sender_name, c.mobile_number as sender_mobile
                FROM public.dmt_transaction dt
                LEFT JOIN public.customer c ON c.customer_ref_id = dt.customer_ref_id
                WHERE dt.transaction_number = :txn_id OR dt.reference_number = :txn_id OR dt.rrn = :txn_id
                LIMIT 1;
            """), {"txn_id": txn_id.strip()})
            dmt_row = dmt_res.fetchone()
            if dmt_row:
                dt_dict = dict(dmt_row._mapping)
                acc = dt_dict.get("bank_account_number")
                service_details = {
                    "beneficiary": dt_dict.get("beneficiary_name"),
                    "bank": dt_dict.get("bank_name"),
                    "account": str(acc).strip() if acc else None,
                    "ifsc": dt_dict.get("bank_ifsc"),
                    "utr": dt_dict.get("utr") or dt_dict.get("rrn"),
                    "mode": dt_dict.get("transaction_mode") or "IMPS",
                    "purpose": dt_dict.get("purpose")
                }
                if dt_dict.get("sender_name"):
                    customer_info["customer"] = dt_dict.get("sender_name")
                if dt_dict.get("sender_mobile"):
                    customer_info["customer_mobile"] = dt_dict.get("sender_mobile")
                if dt_dict.get("utr"):
                    processing_info["utr"] = dt_dict.get("utr")
                if dt_dict.get("transaction_mode"):
                    processing_info["channel"] = dt_dict.get("transaction_mode")
        except Exception as e:
            logger.warning(f"Error loading DMT details for {txn_id}: {e}")

    # Service Table: AEPS
    elif "AEPS" in service_code:
        try:
            aeps_res = await db.execute(text("""
                SELECT at.transaction_number, at.rrn, at.stan, at.masked_aadhaar, at.bank_name, at.terminal_id, at.response_code, at.response_message,
                       c.full_name as customer_name, c.mobile_number as customer_mobile
                FROM public.aeps_transaction at
                LEFT JOIN public.customer c ON c.customer_ref_id = at.customer_ref_id
                WHERE at.transaction_number = :txn_id OR at.rrn = :txn_id
                LIMIT 1;
            """), {"txn_id": txn_id.strip()})
            aeps_row = aeps_res.fetchone()
            if aeps_row:
                at_dict = dict(aeps_row._mapping)
                service_details = {
                    "aadhaar_number": at_dict.get("masked_aadhaar"),
                    "bank": at_dict.get("bank_name"),
                    "stan": at_dict.get("stan"),
                    "terminal_id": at_dict.get("terminal_id"),
                    "rrn": at_dict.get("rrn"),
                    "response_message": at_dict.get("response_message")
                }
                if at_dict.get("customer_name"):
                    customer_info["customer"] = at_dict.get("customer_name")
                if at_dict.get("customer_mobile"):
                    customer_info["customer_mobile"] = at_dict.get("customer_mobile")
                if at_dict.get("rrn"):
                    processing_info["rrn"] = at_dict.get("rrn")
        except Exception as e:
            logger.warning(f"Error loading AEPS details for {txn_id}: {e}")

    # Service Table: TOPUP
    elif "TOPUP" in service_code:
        try:
            topup_res = await db.execute(text("""
                SELECT tr.topup_request_id, tr.requested_amount, tr.approved_amount, tr.payment_reference, tr.payment_method, tr.payment_date, tr.status, tr.retailer_remarks, tr.admin_notes
                FROM public.topup_requests tr
                WHERE tr.topup_request_id::text = :txn_id OR tr.payment_reference = :txn_id OR tr.transaction_reference = :txn_id
                LIMIT 1;
            """), {"txn_id": txn_id.strip()})
            topup_row = topup_res.fetchone()
            if topup_row:
                tr_dict = dict(topup_row._mapping)
                service_details = {
                    "topup_request_id": str(tr_dict.get("topup_request_id")),
                    "requested_amount": round_curr(tr_dict.get("requested_amount")),
                    "approved_amount": round_curr(tr_dict.get("approved_amount")),
                    "payment_reference": tr_dict.get("payment_reference"),
                    "payment_method": tr_dict.get("payment_method"),
                    "payment_date": str(tr_dict.get("payment_date")),
                    "remarks": tr_dict.get("retailer_remarks") or tr_dict.get("admin_notes")
                }
        except Exception as e:
            logger.warning(f"Error loading Topup details for {txn_id}: {e}")

    # Service Table: SETTLEMENT
    elif "SETTLEMENT" in service_code:
        try:
            st_res = await db.execute(text("""
                SELECT st.settlement_number, st.batch_number, st.reference_number, st.settlement_date, st.gross_amount, st.net_amount, st.status
                FROM public.settlement_transaction st
                WHERE st.settlement_number = :txn_id OR st.reference_number = :txn_id
                LIMIT 1;
            """), {"txn_id": txn_id.strip()})
            st_row = st_res.fetchone()
            if st_row:
                st_dict = dict(st_row._mapping)
                service_details = {
                    "settlement_batch": st_dict.get("batch_number"),
                    "settlement_date": str(st_dict.get("settlement_date")),
                    "gross_amount": round_curr(st_dict.get("gross_amount")),
                    "net_settlement": round_curr(st_dict.get("net_amount")),
                    "status": st_dict.get("status")
                }
        except Exception as e:
            logger.warning(f"Error loading Settlement details for {txn_id}: {e}")

    # Clean empty values from service_details
    service_details = {k: v for k, v in service_details.items() if v is not None and str(v).strip() != ""}

    # 6. Party details (Names only, no internal IDs)
    party = {}
    if primary.get("resolved_company_name"):
        party["company"] = primary.get("resolved_company_name")
    if primary.get("resolved_retailer_name"):
        ret_display = primary.get("resolved_retailer_name")
        if primary.get("retailer_code"):
            ret_display += f" ({primary.get('retailer_code')})"
        party["retailer"] = ret_display
    if primary.get("resolved_dist_name"):
        party["distributor"] = primary.get("resolved_dist_name")
    if primary.get("resolved_sd_name"):
        party["sd"] = primary.get("resolved_sd_name")
    if primary.get("resolved_rm_name"):
        party["rm"] = primary.get("resolved_rm_name")
    if customer_info.get("customer"):
        party["customer"] = customer_info.get("customer")
    if customer_info.get("customer_mobile"):
        party["customer_mobile"] = customer_info.get("customer_mobile")

    # 7. Formatted Dates
    created_dt = primary.get("created_at")
    if isinstance(created_dt, datetime):
        dt_ist = created_dt.astimezone(IST)
        formatted_dt = dt_ist.strftime("%d-%b-%Y %I:%M:%S %p")
        created_at_iso = dt_ist.isoformat()
    else:
        formatted_dt = str(created_dt or "Not Available")
        created_at_iso = str(created_dt or "")

    updated_dt = primary.get("updated_at") or primary.get("created_at")
    if isinstance(updated_dt, datetime):
        completed_dt_ist = updated_dt.astimezone(IST)
        formatted_completed_dt = completed_dt_ist.strftime("%d-%b-%Y %I:%M:%S %p")
    else:
        formatted_completed_dt = formatted_dt

    # 8. Status & Comments Resolution
    final_status = (payout_db_status or primary.get("status") or "SUCCESS").upper()
    if final_status in ["FAILED", "REJECTED"]:
        comments = "Payout failed - wallet reversed"
    elif final_status in ["PENDING", "PROCESSING", "INITIATED"]:
        comments = "Payout processing in progress"
    else:
        comments = "Payout successful"

    # 9. Beneficiary & Customer & Vendor Object Construction (Strict Section 18 Schema)
    raw_acc = service_details.get("account") or None
    if not raw_acc and "beneficiary" in party:
        raw_acc = None

    def format_masked_acc(acc_val: Any) -> str:
        if not acc_val:
            return "Not Available"
        s = str(acc_val).strip()
        if len(s) <= 4:
            return "XXXXXX" + s
        return "XXXXXX" + s[-4:]

    beneficiary_obj = {
        "name": service_details.get("beneficiary") or primary.get("resolved_retailer_name") or "Not Available",
        "account": format_masked_acc(raw_acc),
        "bank": service_details.get("bank") or "Not Available",
        "ifsc": service_details.get("ifsc") or "Not Available",
    }

    customer_obj = {
        "name": customer_info.get("customer") or party.get("customer") or "Not Available",
        "mobile": customer_info.get("customer_mobile") or party.get("customer_mobile") or "Not Available",
    }

    company_name_val = primary.get("resolved_company_name") or "Pay2Pay Fintech"
    company_logo_val = primary.get("resolved_logo_url") or "/branding/logo.png"

    company_obj = {
        "name": company_name_val,
        "logo": company_logo_val,
        "company_name": company_name_val,
        "logo_url": company_logo_val,
        "legal_name": primary.get("resolved_legal_name") or "Pay2Pay Technologies Private Limited",
        "company_code": primary.get("resolved_company_code") or "P2P",
    }

    # 10. Role-Based Vendor / API Section (ADMIN & CRM only)
    is_admin_or_crm = (
        auth_ctx.user_type in ["ADMIN", "SUPER_ADMIN", "CRM"] or
        any(r in ["ADMIN", "SUPER_ADMIN", "CRM"] for r in (auth_ctx.roles or []))
    )

    vendor_obj = None
    if is_admin_or_crm:
        vendor_obj = {
            "name": vendor_name_val or processing_info.get("gateway") or "Commercial Bank",
            "api_status": vendor_api_status_val or ("SUCCESS" if final_status == "SUCCESS" else final_status),
            "api_response": sanitize_api_response(vendor_api_response_val or service_details.get("failure_reason")) or ("Transaction Processed Successfully" if final_status == "SUCCESS" else "Processing via Banking Switch")
        }

    return {
        "success": True,
        "data": {
            "transaction": {
                "txn_id": primary.get("txn_id"),
                "reference_id": primary.get("ref_id") or primary.get("txn_id"),
                "amount": round_curr(base_amt),
                "mode": service_details.get("mode") or "IMPS",
                "status": final_status,
                "initiated_at": formatted_dt,
                "completed_at": formatted_completed_dt,
                "service": service_raw,
                "wallet": (primary.get("wallet_type") or "MAIN").upper(),
                "entry": (primary.get("entry_type") or "DEBIT").upper(),
                "date_time": formatted_dt,
                "created_at": created_at_iso,
            },
            "company": company_obj,
            "customer": customer_obj,
            "beneficiary": beneficiary_obj,
            "financial": {
                "amount": round_curr(base_amt),
                "charge": round_curr(charge_amt),
                "gst": round_curr(gst_amt),
                "commission": round_curr(comm_amt),
                "tds": round_curr(tds_amt),
                "total_debit": round_curr(tot_debit if tot_debit > 0 else (base_amt + charge_amt + gst_amt)),
                "total_credit": round_curr(tot_credit),
                "net_amount": round_curr(tot_debit if tot_debit > 0 else tot_credit),
            },
            "wallet": {
                "wallet": (primary.get("wallet_type") or "MAIN").upper(),
                "opening_balance": round_curr(opening_balance) if opening_balance is not None else 0.0,
                "credit": round_curr(tot_credit),
                "debit": round_curr(tot_debit),
                "closing_balance": round_curr(closing_balance) if closing_balance is not None else 0.0,
            },
            "vendor": vendor_obj,
            "comments": comments,
            "party": party,
            "ledger_entries": ledger_entries,
            "service": {
                "code": service_code,
                "name": service_raw.title(),
            },
            "service_details": service_details,
            "processing": processing_info,
            "audit": {
                "created_date": formatted_dt,
                "updated_date": formatted_completed_dt,
            }
        }
    }

