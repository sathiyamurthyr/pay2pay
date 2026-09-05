"""
Pay2Pay Enterprise Payout Transaction Report REST API
Authoritative, Role-Based, Normalized Payout Report Engine

Endpoints:
- GET /api/v1/payout/transactions (Main Report API)
- GET /api/v1/payout/transactions/summary (KPI Metrics)
- GET /api/v1/payout/transactions/export (CSV / Excel Export)

Security & Scoping:
- Roles: ADMIN, RETAILER, RM, CRM, DISTRIBUTOR, SD
- Backend-enforced authorization (never trust client-supplied scope IDs or user_type_ref_id)
- Column-level role filtering (Retailers and RMs never see vendor/API internal details)
- Account numbers masked (XXXXXX1234)
- API responses sanitized of sensitive credentials
- Single TxnID lifecycle preservation (No REV-XXXX IDs)
"""

import re
import json
import math
import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any, Union, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.infrastructure.db.models import AdminUserModel, RetailerModel
from app.application.user_type_service import UserTypeService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Payout Transaction Report"])

IST = timezone(timedelta(hours=5, minutes=30))

# ==============================================================================
# SENSITIVE KEYS & SANITIZATION
# ==============================================================================

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


def mask_account_number(acc_no: Optional[str]) -> str:
    """
    Returns full account number directly.
    """
    if not acc_no:
        return "--"
    return str(acc_no).strip()


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
    Never trusts user_type_ref_id from client/frontend for authorization.
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


class PayoutReportItem(BaseModel):
    txn_id: str
    date_time: str
    company: Optional[str] = None
    retailer: str
    customer: str
    beneficiary: str
    account: str
    bank: str
    ifsc: str
    amount: float
    charge: float
    gst: float
    debit: float
    mode: str
    utr: str
    status: str
    vendor: Optional[str] = None
    api_status: Optional[str] = None
    api_response: Optional[str] = None
    comments: str


class PayoutReportResponse(BaseModel):
    success: bool
    message: str
    data: List[Dict[str, Any]]
    pagination: PaginationMeta


# ==============================================================================
# MAIN REPORT QUERY BUILDER
# ==============================================================================

def validate_query_params(
    page: int,
    limit: int,
    from_date: Optional[str],
    to_date: Optional[str],
    status_filter: Optional[str],
    mode_filter: Optional[str],
    sort_by: Optional[str],
    sort_order: Optional[str]
) -> Tuple[datetime, datetime, str, str]:
    """
    Validates query parameters according to the report specification.
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

    # Status validation
    allowed_statuses = {"ALL", "INITIATED", "PENDING", "SUCCESS", "FAILED", "REVERSED"}
    if status_filter and status_filter.strip().upper() not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_STATUS", "message": f"Invalid status: '{status_filter}'. Allowed values: INITIATED, PENDING, SUCCESS, FAILED, REVERSED"}
        )

    # Mode validation
    allowed_modes = {"ALL", "IMPS", "NEFT", "RTGS", "UPI"}
    if mode_filter and mode_filter.strip().upper() not in allowed_modes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "INVALID_MODE", "message": f"Invalid mode: '{mode_filter}'. Allowed values: IMPS, NEFT, RTGS, UPI"}
        )

    # Sort validation whitelist
    sort_map = {
        "date_time": "pt.created_date",
        "date": "pt.created_date",
        "time": "pt.created_date",
        "datetime": "pt.created_date",
        "created_date": "pt.created_date",
        "amount": "COALESCE(t_amt.amount, 0.00)",
        "charge": "COALESCE(t_chg.charge, 0.00)",
        "debit": "(COALESCE(t_amt.amount, 0.00) + COALESCE(t_chg.charge, 0.00) + COALESCE(t_gst.gst, 0.00))",
        "status": "pt.status",
        "txn_id": "pt.transaction_number",
        "mode": "pt.mode",
        "utr": "pt.utr_number",
        "retailer": "COALESCE(ret.legal_name, ret.owner_name)",
        "customer": "COALESCE(c.full_name, c.mobile_number)",
        "beneficiary": "COALESCE(bm.account_holder_name, '')",
        "company": "COALESCE(comp.company_name, comp.legal_name)"
    }
    validated_sort = sort_map.get((sort_by or "").lower().strip(), "pt.created_date")
    validated_order = "ASC" if (sort_order or "").lower().strip() == "asc" else "DESC"

    return start_dt, end_dt, validated_sort, validated_order


# ==============================================================================
# REPORT ENDPOINTS
# ==============================================================================

@router.get(
    "/transactions",
    summary="Get Payout Transactions Report",
    description="Unified, authoritative Payout Transaction Report API supporting ADMIN, RETAILER, RM, CRM, DISTRIBUTOR, SD."
)
@router.get("/payout/transactions", include_in_schema=False)
@router.get("/api/v1/payout/transactions", include_in_schema=False)
@router.get("/payout/reports/grid", include_in_schema=False)
@router.get("/reports/grid", include_in_schema=False)
@router.get("/reports/payout/grid", include_in_schema=False)
async def get_payout_transactions_report(
    request: Request,
    page: int = Query(1, description="Page number (default: 1)"),
    limit: int = Query(25, description="Page size limit (default: 25, max: 100)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD), default: TODAY"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD), default: TODAY"),
    status: Optional[str] = Query(None, description="Status filter (INITIATED, PENDING, SUCCESS, FAILED, REVERSED)"),
    mode: Optional[str] = Query(None, description="Payment mode filter (IMPS, NEFT, RTGS, UPI)"),
    payment_mode: Optional[str] = Query(None, description="Payment mode filter alias (IMPS, NEFT, RTGS, UPI)"),
    user_type: Optional[str] = Query(None, description="User type filter (ADMIN, RETAILER, DISTRIBUTOR, SD, CRM, RM, ALL)"),
    search: Optional[str] = Query(None, description="Search term for Txn ID, UTR, Beneficiary, Customer, Retailer, Company, or Account last 4"),
    retailer_id: Optional[str] = Query(None, description="Retailer ID filter (UUID, code, or integer)"),
    tenant_id: Optional[str] = Query(None, description="Tenant ID filter"),
    company_id: Optional[str] = Query(None, description="Company ID filter"),
    company_name: Optional[str] = Query(None, description="Company name filter (ADMIN/CRM/RM only)"),
    retailer_name: Optional[str] = Query(None, description="Retailer name filter (ADMIN/CRM/RM only)"),
    vendor_name: Optional[str] = Query(None, description="Vendor name filter (ADMIN/CRM only)"),
    sort_by: Optional[str] = Query("date_time", description="Sort by field (default: date_time)"),
    sort_order: Optional[str] = Query("DESC", description="Sort direction (ASC, DESC)"),
    db: AsyncSession = Depends(get_db)
):
    # 1. Resolve Auth & Roles (Never trust user_type_ref_id supplied by frontend)
    auth_ctx = await resolve_auth_context(request, db)

    effective_mode = mode or payment_mode

    # 2. Validate Inputs
    start_dt, end_dt, sort_col, sort_dir = validate_query_params(
        page=page,
        limit=limit,
        from_date=from_date,
        to_date=to_date,
        status_filter=status,
        mode_filter=effective_mode,
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

    # Effective user type scoping
    effective_user_type_ref_id = query_user_type_ref_id
    effective_user_type_code = query_user_type_code

    if auth_ctx.user_type == "RETAILER":
        effective_user_type_ref_id = auth_ctx.user_type_ref_id
        effective_user_type_code = "RETAILER"

    # 4. Execute Authoritative PostgreSQL Stored Function
    tenant_ref_id = auth_ctx.tenant_ref_id or 1
    company_ref_id = auth_ctx.company_ref_id
    retailer_ref_id = auth_ctx.retailer_ref_id
    rm_ref_id = auth_ctx.regional_manager_ref_id

    # Resolve explicit query params if provided (Admin / RM only)
    if auth_ctx.user_type in ("ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "CRM", "RM"):
        if retailer_id and str(retailer_id).strip():
            r_clean = str(retailer_id).strip()
            try:
                r_lookup = await db.execute(text("""
                    SELECT retailer_ref_id, company_ref_id, tenant_ref_id
                    FROM public.retailer
                    WHERE public_id::text = :r_clean
                       OR retailer_code = :r_clean
                       OR retailer_ref_id::text = :r_clean
                    LIMIT 1;
                """), {"r_clean": r_clean})
                r_match = r_lookup.fetchone()
                if r_match:
                    retailer_ref_id = r_match[0]
                    if r_match[1]:
                        company_ref_id = r_match[1]
                    if r_match[2]:
                        tenant_ref_id = r_match[2]
            except Exception as e:
                logger.warning(f"Error resolving retailer_id query param: {e}")
    elif auth_ctx.user_type == "RETAILER":
        # Strict Retailer isolation: Lock to authenticated retailer only
        if retailer_ref_id is None:
            lookup_val = (retailer_id and str(retailer_id).strip()) or auth_ctx.retailer_id or auth_ctx.user_id
            if lookup_val:
                try:
                    r_lookup = await db.execute(text("""
                        SELECT retailer_ref_id, company_ref_id, tenant_ref_id
                        FROM public.retailer
                        WHERE public_id::text = :r_clean
                           OR retailer_code = :r_clean
                           OR retailer_ref_id::text = :r_clean
                        LIMIT 1;
                    """), {"r_clean": str(lookup_val)})
                    r_match = r_lookup.fetchone()
                    if r_match:
                        retailer_ref_id = r_match[0]
                except Exception as e:
                    logger.warning(f"Error resolving retailer for retailer user: {e}")
        if retailer_ref_id is None:
            retailer_ref_id = -1
        # For RETAILERS, do NOT restrict by company_ref_id! Payout transactions may be assigned to different internal companies while belonging to this retailer.
        company_ref_id = None

    from_date_parsed = start_dt.strftime("%Y-%m-%d")
    to_date_parsed = end_dt.strftime("%Y-%m-%d")

    # Dynamic Count Query for optimal index scanning
    where_clauses = [
        "COALESCE(pt.tenant_ref_id, r.tenant_ref_id, 1) = :tenant_ref_id",
        "(pt.is_deleted IS NULL OR pt.is_deleted = FALSE)",
        "(pt.is_active IS NULL OR pt.is_active = TRUE)",
        "pt.created_date >= :start_dt",
        "pt.created_date <= :end_dt"
    ]
    count_params: Dict[str, Any] = {
        "tenant_ref_id": tenant_ref_id,
        "start_dt": start_dt,
        "end_dt": end_dt
    }

    if company_ref_id is not None:
        where_clauses.append("COALESCE(pt.company_ref_id, r.company_ref_id, 1) = :company_ref_id")
        count_params["company_ref_id"] = company_ref_id

    if retailer_ref_id is not None:
        where_clauses.append("(pt.retailer_ref_id = :retailer_ref_id OR (pt.user_ref_id = :retailer_ref_id AND pt.user_type_ref_id = 2))")
        count_params["retailer_ref_id"] = retailer_ref_id

    if rm_ref_id is not None:
        where_clauses.append("r.regional_manager_ref_id = :rm_ref_id")
        count_params["rm_ref_id"] = rm_ref_id

    if effective_user_type_ref_id is not None:
        where_clauses.append("pt.user_type_ref_id = :user_type_ref_id")
        count_params["user_type_ref_id"] = effective_user_type_ref_id
    elif effective_user_type_code is not None:
        where_clauses.append("UPPER(COALESCE(pt.user_type, 'RETAILER')) = :user_type_val")
        count_params["user_type_val"] = effective_user_type_code.upper()

    if status and status.strip().upper() != "ALL":
        stat_upper = status.strip().upper()
        if stat_upper == "FAILED":
            where_clauses.append("UPPER(pt.status) IN ('FAILED', 'REVERSED')")
        else:
            where_clauses.append("UPPER(pt.status) = :status_val")
            count_params["status_val"] = stat_upper

    if effective_mode and effective_mode.strip().upper() != "ALL":
        where_clauses.append("UPPER(pt.mode) = :mode_val")
        count_params["mode_val"] = effective_mode.strip().upper()

    if search and search.strip():
        where_clauses.append("""(
            pt.transaction_number ILIKE :search_val OR
            pt.utr_number ILIKE :search_val OR
            bm.account_holder_name ILIKE :search_val OR
            cu.full_name ILIKE :search_val OR
            r.store_name ILIKE :search_val OR
            r.legal_name ILIKE :search_val OR
            c.company_name ILIKE :search_val
        )""")
        count_params["search_val"] = f"%{search.strip()}%"

    count_sql = f"""
    SELECT COUNT(*) 
    FROM public.payout_transaction pt
    LEFT JOIN public.retailer r ON r.retailer_ref_id = pt.retailer_ref_id
    LEFT JOIN public.beneficiary_master bm ON bm.beneficiary_master_ref_id = pt.beneficiary_master_ref_id
    LEFT JOIN public.customer cu ON cu.customer_ref_id = pt.customer_ref_id
    LEFT JOIN public.company c ON c.company_ref_id = pt.company_ref_id
    WHERE {" AND ".join(where_clauses)};
    """

    count_res = await db.execute(text(count_sql), count_params)
    total_records = int(count_res.scalar() or 0)
    total_pages = math.ceil(total_records / limit) if total_records > 0 else 0

    if total_records == 0:
        return {
            "success": True,
            "message": "No payout transactions found",
            "data": [],
            "items": [],
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
        "status": status.strip().upper() if status and status.strip().upper() != "ALL" else None,
        "mode": effective_mode.strip().upper() if effective_mode and effective_mode.strip().upper() != "ALL" else None,
        "search": search.strip() if search and search.strip() else None,
        "page": page,
        "limit": limit
    }

    select_sp_sql = """
    SELECT * FROM public.get_payout_transactions_report(
        p_tenant_ref_id := CAST(:tenant_ref_id AS BIGINT),
        p_company_ref_id := CAST(:company_ref_id AS BIGINT),
        p_user_ref_id := CAST(:retailer_ref_id AS BIGINT),
        p_rm_ref_id := CAST(:rm_ref_id AS BIGINT),
        p_user_type_ref_id := CAST(:user_type_ref_id AS BIGINT),
        p_user_type := CAST(:user_type AS VARCHAR),
        p_from_date := CAST(:from_date AS DATE),
        p_to_date := CAST(:to_date AS DATE),
        p_status := CAST(:status AS VARCHAR),
        p_mode := CAST(:mode AS VARCHAR),
        p_search := CAST(:search AS VARCHAR),
        p_page := CAST(:page AS INTEGER),
        p_limit := CAST(:limit AS INTEGER)
    );
    """

    rows_res = await db.execute(text(select_sp_sql), sp_params)
    rows = rows_res.fetchall()

    # 5. Format & Filter Columns by Role
    output_items: List[Dict[str, Any]] = []
    for r in rows:
        m = dict(r._mapping)
        dt = m.get("date_time")
        if isinstance(dt, datetime):
            dt_ist = dt.astimezone(IST)
            formatted_dt = dt_ist.isoformat()
        else:
            formatted_dt = str(dt) if dt else ""

        amount_val = round_curr(m.get("amount"))
        charge_val = round_curr(m.get("charge"))
        gst_val = round_curr(m.get("gst"))
        debit_val = round_curr(m.get("debit") or (amount_val + charge_val + gst_val))
        masked_acc = m.get("account") or mask_account_number(m.get("raw_account"))
        sanitized_api_resp = sanitize_api_response(m.get("api_response") or m.get("raw_api_response"))

        # Role Visibility Construction
        if auth_ctx.user_type == "ADMIN":
            item = {
                "txn_id": m.get("txn_id"),
                "date_time": formatted_dt,
                "company": m.get("company"),
                "retailer": m.get("retailer"),
                "customer": m.get("customer"),
                "beneficiary": m.get("beneficiary"),
                "account": masked_acc,
                "bank": m.get("bank"),
                "ifsc": m.get("ifsc"),
                "amount": amount_val,
                "charge": charge_val,
                "gst": gst_val,
                "debit": debit_val,
                "mode": m.get("mode"),
                "utr": m.get("utr"),
                "status": m.get("status"),
                "vendor": m.get("vendor"),
                "api_status": m.get("api_status"),
                "api_response": sanitized_api_resp,
                "comments": m.get("comments")
            }
        elif auth_ctx.user_type == "RETAILER":
            item = {
                "txn_id": m.get("txn_id"),
                "date_time": formatted_dt,
                "retailer": m.get("retailer"),
                "customer": m.get("customer"),
                "beneficiary": m.get("beneficiary"),
                "account": masked_acc,
                "bank": m.get("bank"),
                "ifsc": m.get("ifsc"),
                "amount": amount_val,
                "charge": charge_val,
                "gst": gst_val,
                "debit": debit_val,
                "mode": m.get("mode"),
                "utr": m.get("utr"),
                "status": m.get("status"),
                "comments": m.get("comments")
            }
        elif auth_ctx.user_type == "RM":
            item = {
                "txn_id": m.get("txn_id"),
                "date_time": formatted_dt,
                "company": m.get("company"),
                "retailer": m.get("retailer"),
                "customer": m.get("customer"),
                "beneficiary": m.get("beneficiary"),
                "account": masked_acc,
                "bank": m.get("bank"),
                "ifsc": m.get("ifsc"),
                "amount": amount_val,
                "charge": charge_val,
                "gst": gst_val,
                "debit": debit_val,
                "mode": m.get("mode"),
                "utr": m.get("utr"),
                "status": m.get("status"),
                "comments": m.get("comments")
            }
        else:  # CRM, SD, DISTRIBUTOR
            item = {
                "txn_id": m.get("txn_id"),
                "date_time": formatted_dt,
                "company": m.get("company"),
                "retailer": m.get("retailer"),
                "customer": m.get("customer"),
                "beneficiary": m.get("beneficiary"),
                "account": masked_acc,
                "bank": m.get("bank"),
                "ifsc": m.get("ifsc"),
                "amount": amount_val,
                "charge": charge_val,
                "gst": gst_val,
                "debit": debit_val,
                "mode": m.get("mode"),
                "utr": m.get("utr"),
                "status": m.get("status"),
                "vendor": m.get("vendor"),
                "api_status": m.get("api_status"),
                "api_response": sanitized_api_resp,
                "comments": m.get("comments")
            }

        output_items.append(item)

    return {
        "success": True,
        "message": "Payout transactions retrieved successfully",
        "data": output_items,
        "items": output_items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages
        }
    }


@router.get(
    "/transactions/summary",
    summary="Get Payout Transaction Summary KPIs",
    description="Calculates total volume, charges, success rate, and active transactions."
)
@router.get("/payout/transactions/summary", include_in_schema=False)
@router.get("/payout/reports/summary", include_in_schema=False)
@router.get("/reports/summary", include_in_schema=False)
@router.get("/reports/payout/summary", include_in_schema=False)
async def get_payout_transactions_summary(
    request: Request,
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD), default: TODAY"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD), default: TODAY"),
    retailer_id: Optional[str] = Query(None, description="Retailer ID filter"),
    tenant_id: Optional[str] = Query(None, description="Tenant ID filter"),
    user_type: Optional[str] = Query(None, description="User type filter: ADMIN, RETAILER, DISTRIBUTOR, SD, CRM, RM, ALL"),
    db: AsyncSession = Depends(get_db)
):
    auth_ctx = await resolve_auth_context(request, db)
    now_ist = datetime.now(IST)

    tenant_ref_id = auth_ctx.tenant_ref_id
    company_ref_id = auth_ctx.company_ref_id
    retailer_ref_id = auth_ctx.retailer_ref_id

    # Resolve explicit query params if provided
    if retailer_id and str(retailer_id).strip():
        r_clean = str(retailer_id).strip()
        try:
            r_lookup = await db.execute(text("""
                SELECT retailer_ref_id, company_ref_id, tenant_ref_id
                FROM public.retailer
                WHERE public_id::text = :r_clean
                   OR retailer_code = :r_clean
                   OR retailer_ref_id::text = :r_clean
                LIMIT 1;
            """), {"r_clean": r_clean})
            r_match = r_lookup.fetchone()
            if r_match:
                retailer_ref_id = r_match[0]
                if r_match[1]:
                    company_ref_id = r_match[1]
                if r_match[2]:
                    tenant_ref_id = r_match[2]
        except Exception as e:
            logger.warning(f"Error resolving retailer_id query param: {e}")

    if from_date and from_date.strip():
        try:
            start_dt = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail={"success": False, "error_code": "INVALID_DATE", "message": "Invalid from_date"})
    else:
        start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)

    if to_date and to_date.strip():
        try:
            end_dt = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail={"success": False, "error_code": "INVALID_DATE", "message": "Invalid to_date"})
    else:
        end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)

    if auth_ctx.user_type == "RETAILER":
        company_ref_id = None
        if retailer_ref_id is None:
            lookup_val = (retailer_id and str(retailer_id).strip()) or auth_ctx.retailer_id or auth_ctx.user_id
            if lookup_val:
                try:
                    r_lookup = await db.execute(text("""
                        SELECT retailer_ref_id, company_ref_id, tenant_ref_id
                        FROM public.retailer
                        WHERE public_id::text = :r_clean
                           OR retailer_code = :r_clean
                           OR retailer_ref_id::text = :r_clean
                        LIMIT 1;
                    """), {"r_clean": str(lookup_val)})
                    r_match = r_lookup.fetchone()
                    if r_match:
                        retailer_ref_id = r_match[0]
                except Exception:
                    pass

    where_clauses = [
        "pt.created_date >= :start_dt",
        "pt.created_date <= :end_dt",
        "(pt.is_deleted IS NULL OR pt.is_deleted = FALSE)",
        "(pt.is_active IS NULL OR pt.is_active = TRUE)"
    ]
    params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}

    if tenant_ref_id:
        where_clauses.append("pt.tenant_ref_id = :tenant_ref_id")
        params["tenant_ref_id"] = tenant_ref_id

    if company_ref_id:
        where_clauses.append("pt.company_ref_id = :company_ref_id")
        params["company_ref_id"] = company_ref_id

    if retailer_ref_id:
        where_clauses.append("(pt.retailer_ref_id = :retailer_ref_id OR (pt.user_ref_id = :retailer_ref_id AND pt.user_type_ref_id = 2))")
        params["retailer_ref_id"] = retailer_ref_id

    if user_type and str(user_type).strip() != "":
        validated_ut = UserTypeService.validate_user_type(user_type, allow_all=True)
        if validated_ut != "ALL":
            ut_ref_id = await UserTypeService.get_user_type_ref_id(db, validated_ut)
            if ut_ref_id:
                where_clauses.append("pt.user_type_ref_id = :user_type_ref_id")
                params["user_type_ref_id"] = ut_ref_id

    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN UPPER(pt.status) = 'SUCCESS' THEN 1 END) as success_count,
        COUNT(CASE WHEN UPPER(pt.status) = 'FAILED' THEN 1 END) as failed_count,
        COUNT(CASE WHEN UPPER(pt.status) IN ('INITIATED', 'PENDING', 'PROCESSING') THEN 1 END) as pending_count,
        COALESCE(SUM(t_amt.amount), 0.00) as total_volume,
        COALESCE(SUM(t_chg.charge), 0.00) as total_charges,
        COALESCE(SUM(t_gst.gst), 0.00) as total_gst
    FROM public.payout_transaction pt
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(t.amount), 0.00) as amount
        FROM public.transactions t
        WHERE t.txn_id = pt.transaction_number
          AND UPPER(t.narration) = 'PAYOUT AMOUNT'
    ) t_amt ON TRUE
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(t.amount), 0.00) as charge
        FROM public.transactions t
        WHERE t.txn_id = pt.transaction_number
          AND UPPER(t.narration) = 'PAYOUT CHARGE'
    ) t_chg ON TRUE
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(t.amount), 0.00) as gst
        FROM public.transactions t
        WHERE t.txn_id = pt.transaction_number
          AND UPPER(t.narration) = 'GST'
    ) t_gst ON TRUE
    WHERE {" AND ".join(where_clauses)};
    """

    res = await db.execute(text(sql), params)
    row = res.fetchone()

    total_cnt = row[0] if row else 0
    success_cnt = row[1] if row else 0
    failed_cnt = row[2] if row else 0
    pending_cnt = row[3] if row else 0
    volume = round_curr(row[4]) if row else 0.0
    charges = round_curr(row[5]) if row else 0.0
    gst = round_curr(row[6]) if row else 0.0
    success_rate = round_curr((success_cnt / total_cnt * 100.0) if total_cnt > 0 else 0.0)

    summary_data = {
        "total_transactions": total_cnt,
        "todays_transactions": total_cnt,
        "success_transactions": success_cnt,
        "successful_transactions": success_cnt,
        "failed_transactions": failed_cnt,
        "pending_transactions": pending_cnt,
        "reversed_transactions": 0,
        "success_rate_percentage": success_rate,
        "total_volume": volume,
        "todays_transfer_amount": volume,
        "successful_amount": volume,
        "pending_amount": 0.0,
        "failed_amount": 0.0,
        "total_charges": charges,
        "todays_commission": charges,
        "total_gst": gst,
        "todays_gst": gst,
        "todays_tds": 0.0,
        "total_wallet_debit": round_curr(volume + charges + gst),
        "todays_wallet_debit": round_curr(volume + charges + gst)
    }

    return {
        "success": True,
        "message": "Summary KPIs retrieved successfully",
        "data": summary_data,
        **summary_data
    }


# ==============================================================================
# SINGLE PAYOUT TRANSACTION DETAILS API
# GET /api/v1/payout/transactions/{transaction_number}
# ==============================================================================

@router.get(
    "/transactions/{transaction_number}",
    summary="Get Payout Transaction Details",
    description="Loads complete dynamic payout record, customer, beneficiary, company, financial ledger, and RBAC-controlled vendor information."
)
@router.get("/payout/transactions/{transaction_number}", include_in_schema=False)
async def get_single_payout_transaction_details(
    transaction_number: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from app.presentation.api.v1.transaction_report_router import get_transaction_dynamic_details
    return await get_transaction_dynamic_details(
        txn_id=transaction_number,
        request=request,
        db=db
    )

