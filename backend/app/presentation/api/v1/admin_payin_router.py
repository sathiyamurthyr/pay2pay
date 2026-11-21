"""
Enterprise Admin PayIn Management Router.
Provides administrative endpoints for managing companies, vendors, mappings,
service catalogs, payment modes, card types, dynamic MDR, transactions,
callbacks, and audit trails.
"""

import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text, select, func, and_, desc, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from datetime import datetime, timezone
from app.core.database import get_db
from app.application.dependencies import get_current_token_payload, get_current_user, CompanyContext, get_company_context, AdminUserModel
from app.infrastructure.db.models import CompanyModel
from app.infrastructure.db.payin_models import (
    PayinCompanyCfgModel, PayinVendorModel, PayinCompanyVendorModel,
    PayinServiceTypeModel, PayinPaymentModeModel, PayinCardTypeModel,
    PayinMdrCfgModel, PayinTransactionModel, PayinCallbackLogModel,
    PayinAuditLogModel
)
from app.application.payin_dtos import (
    PayinPolicyResponse, PayinPolicyOptionItem, UpdatePayinPolicyRequest,
    GatewayConfigItemResponse, UpdateGatewayConfigRequest, CreateGatewayConfigRequest
)
from app.application.payin_config_service import PayInConfigService

logger = logging.getLogger("admin_payin_router")

router = APIRouter(prefix="/admin/payin", tags=["Admin PayIn Management Suite"])


# --- DTOs for Admin operations ---
class ToggleStatusRequest(BaseModel):
    is_enabled: bool


class CreateMdrRuleRequest(BaseModel):
    company_ref_id: int
    payin_vendor_ref_id: int
    payin_service_type_ref_id: Optional[int] = None
    payin_payment_mode_ref_id: Optional[int] = None
    payin_card_type_ref_id: Optional[int] = None
    card_network: Optional[str] = None
    mdr_pct: float = Field(..., ge=0, le=1)  # e.g. 0.018 for 1.8%
    mdr_fixed: float = Field(0.0, ge=0)
    tax_pct: float = Field(0.18, ge=0)
    min_mdr: float = Field(0.0, ge=0)
    max_mdr: float = Field(5000.0, ge=0)
    mdr_treatment: str = Field("DEDUCT_FROM_TOPUP")
    priority: int = Field(100, ge=1)


class UpdateCompanyCardMdrRequest(BaseModel):
    company_ref_id: int
    payin_vendor_ref_id: Optional[int] = None
    gateway_code: Optional[str] = None
    card_network: str
    mdr_percent: float = Field(..., ge=0, le=50.0, description="MDR percentage, e.g. 2.62 for 2.62%")
    is_enabled: bool = True
    mdr_treatment: Optional[str] = "COLLECT_ADDITIONALLY"


class BatchCardMdrItem(BaseModel):
    card_network: str
    mdr_percent: float = Field(..., ge=0, le=50.0)
    is_enabled: bool = True
    mdr_treatment: Optional[str] = "COLLECT_ADDITIONALLY"


class BatchUpdateCompanyCardMdrRequest(BaseModel):
    company_ref_id: int
    payin_vendor_ref_id: Optional[int] = None
    gateway_code: Optional[str] = None
    items: List[BatchCardMdrItem]


class UpdateCompanyLimitsRequest(BaseModel):
    payin_enabled: Optional[bool] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    daily_txn_limit: Optional[int] = None
    daily_amt_limit: Optional[float] = None


@router.get("/dashboard")
async def get_payin_dashboard_metrics(
    company_ref_id: Optional[int] = None,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Calculates high-level metrics for the Admin PayIn Dashboard strictly isolated by company."""
    effective_comp = ctx.company_ref_id if not ctx.is_super_admin else company_ref_id
    filter_clause = "WHERE 1=1"
    params = {}
    if effective_comp:
        filter_clause += " AND company_ref_id = :comp_ref"
        params["comp_ref"] = effective_comp

    stmt = text(f"""
        SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN txn_status = 'SUCCESS' THEN txn_amount ELSE 0 END), 0) as total_volume,
            COALESCE(SUM(CASE WHEN txn_status = 'SUCCESS' THEN total_charges ELSE 0 END), 0) as total_mdr,
            COALESCE(SUM(CASE WHEN txn_status = 'SUCCESS' THEN company_mdr_liability ELSE 0 END), 0) as total_company_liability,
            COUNT(CASE WHEN txn_status = 'SUCCESS' THEN 1 END) as success_count,
            COUNT(CASE WHEN txn_status = 'PENDING' THEN 1 END) as pending_count,
            COUNT(CASE WHEN txn_status = 'FAILED' THEN 1 END) as failed_count
        FROM public.payin_transactions
        {filter_clause};
    """)
    res = await db.execute(stmt, params)
    row = res.mappings().first()

    return {
        "success": True,
        "metrics": {
            "total_transactions": int(row["total_count"] or 0),
            "total_volume": float(row["total_volume"] or 0.0),
            "total_mdr_collected": float(row["total_mdr"] or 0.0),
            "company_mdr_liability": float(row["total_company_liability"] or 0.0),
            "successful_transactions": int(row["success_count"] or 0),
            "pending_transactions": int(row["pending_count"] or 0),
            "failed_transactions": int(row["failed_count"] or 0)
        }
    }


AVAILABLE_POLICIES = [
    PayinPolicyOptionItem(
        policy="WITH_MDR",
        display_name="Customer Pays MDR Charges",
        option="OPTION A: WITH MDR",
        description="Customer pays top-up amount plus applicable MDR and GST. Full eligible top-up amount is credited to the retailer wallet.",
        mdr_treatment="COLLECT_ADDITIONALLY"
    ),
    PayinPolicyOptionItem(
        policy="WITHOUT_MDR",
        display_name="Retailer Bears MDR Charges",
        option="OPTION B: WITHOUT MDR",
        description="Customer pays only the top-up amount. Applicable MDR and GST are borne by the retailer and deducted from wallet credit.",
        mdr_treatment="DEDUCT_FROM_TOPUP"
    )
]


@router.get("/companies")
async def list_company_configurations(
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists company PayIn configurations strictly filtered by company for Company Admins."""
    where_clause = ""
    params = {}
    if not ctx.is_super_admin:
        where_clause = "WHERE cfg.company_ref_id = :comp_ref"
        params["comp_ref"] = ctx.company_ref_id

    stmt = text(f"""
        SELECT 
            cfg.payin_company_cfg_ref_id,
            cfg.company_ref_id,
            c.company_name,
            c.company_code,
            cfg.payin_enabled,
            cfg.min_amount,
            cfg.max_amount,
            cfg.daily_txn_limit,
            cfg.daily_amt_limit,
            COALESCE(cfg.customer_payable_policy, 'WITH_MDR') AS customer_payable_policy,
            cfg.updated_by,
            cfg.updated_at
        FROM public.payin_company_cfg cfg
        JOIN public.company c ON cfg.company_ref_id = c.company_ref_id
        {where_clause}
        ORDER BY cfg.company_ref_id ASC;
    """)
    res = await db.execute(stmt, params)
    rows = []
    for r in res.mappings().all():
        d = dict(r)
        d["customer_payable_policy_name"] = "Customer Pays MDR Charges" if d.get("customer_payable_policy") == "WITH_MDR" else "Retailer Bears MDR Charges"
        rows.append(d)
    return {"success": True, "companies": rows, "data": rows}


@router.get("/policy", response_model=PayinPolicyResponse)
async def get_payin_policy(
    company_ref_id: Optional[int] = Query(None),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the effective Customer Payable Amount Policy for the requested or authenticated company.
    Strictly isolated by company scope.
    """
    target_comp = company_ref_id or ctx.company_ref_id or 2
    if not ctx.is_super_admin:
        ctx.validate_access(target_comp)
        target_comp = ctx.company_ref_id or 2

    comp_stmt = text("""
        SELECT c.company_ref_id, c.company_name, c.company_code,
               COALESCE(cfg.customer_payable_policy, 'WITH_MDR') AS policy,
               cfg.updated_by, cfg.updated_at
        FROM public.company c
        LEFT JOIN public.payin_company_cfg cfg ON c.company_ref_id = cfg.company_ref_id
        WHERE c.company_ref_id = :comp_ref
        LIMIT 1;
    """)
    res = await db.execute(comp_stmt, {"comp_ref": target_comp})
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Company with Ref ID {target_comp} not found.")

    policy_code = row["policy"] or "WITH_MDR"
    meta = next((p for p in AVAILABLE_POLICIES if p.policy == policy_code), AVAILABLE_POLICIES[0])

    return PayinPolicyResponse(
        success=True,
        company_ref_id=row["company_ref_id"],
        company_name=row["company_name"],
        company_code=row["company_code"],
        policy=meta.policy,
        display_name=meta.display_name,
        option=meta.option,
        description=meta.description,
        mdr_treatment=meta.mdr_treatment,
        updated_by=row["updated_by"],
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
        available_policies=AVAILABLE_POLICIES
    )


@router.post("/policy", response_model=PayinPolicyResponse)
async def update_payin_policy(
    req: UpdatePayinPolicyRequest,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the Customer Payable Amount Policy for the specified company.
    Requires Admin authorization and updates both company config and MDR matrix treatments.
    """
    target_comp = req.company_ref_id or ctx.company_ref_id or 2
    if not ctx.is_super_admin:
        ctx.validate_access(target_comp)
        target_comp = ctx.company_ref_id or 2

    policy_norm = (req.policy or "").strip().upper()
    if policy_norm not in ("WITH_MDR", "WITHOUT_MDR"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid policy '{req.policy}'. Exactly two options supported: 'WITH_MDR' or 'WITHOUT_MDR'."
        )

    # Fetch or create payin_company_cfg
    stmt = select(PayinCompanyCfgModel).where(PayinCompanyCfgModel.company_ref_id == target_comp)
    cfg = (await db.execute(stmt)).scalars().first()
    now_utc = datetime.now(timezone.utc)
    user_identifier = ctx.user.email if (ctx.user and getattr(ctx.user, "email", None)) else (getattr(ctx.user, "username", None) or "ADMIN")

    old_policy = cfg.customer_payable_policy if cfg else "WITH_MDR"

    if not cfg:
        cfg = PayinCompanyCfgModel(
            company_ref_id=target_comp,
            payin_enabled=True,
            customer_payable_policy=policy_norm,
            created_by=user_identifier,
            updated_by=user_identifier,
            created_at=now_utc,
            updated_at=now_utc
        )
        db.add(cfg)
        await db.flush()
    else:
        cfg.customer_payable_policy = policy_norm
        cfg.updated_by = user_identifier
        cfg.updated_at = now_utc

    # Sync corresponding mdr_treatment across active payin_mdr_cfg rules for this company
    target_treatment = "COLLECT_ADDITIONALLY" if policy_norm == "WITH_MDR" else "DEDUCT_FROM_TOPUP"
    sync_mdr_stmt = text("""
        UPDATE public.payin_mdr_cfg
        SET mdr_treatment = :t_treat,
            updated_by = :u_by,
            updated_at = :u_at
        WHERE company_ref_id = :comp_ref;
    """)
    await db.execute(sync_mdr_stmt, {
        "t_treat": target_treatment,
        "u_by": user_identifier,
        "u_at": now_utc,
        "comp_ref": target_comp
    })

    # Record Audit Log
    meta = next((p for p in AVAILABLE_POLICIES if p.policy == policy_norm), AVAILABLE_POLICIES[0])
    audit = PayinAuditLogModel(
        action_type="UPDATE_CUSTOMER_PAYABLE_POLICY",
        entity_type="payin_company_cfg",
        entity_ref_id=cfg.payin_company_cfg_ref_id,
        old_value={"policy": old_policy},
        new_value={"policy": policy_norm, "display_name": meta.display_name, "mdr_treatment": target_treatment},
        company_ref_id=target_comp,
        created_at=now_utc
    )
    db.add(audit)
    await db.commit()

    # Query Company Name and Code
    name_stmt = text("SELECT company_name, company_code FROM public.company WHERE company_ref_id = :comp_ref LIMIT 1;")
    c_res = await db.execute(name_stmt, {"comp_ref": target_comp})
    c_row = c_res.mappings().first()
    comp_name = c_row["company_name"] if c_row else "Company"
    comp_code = c_row["company_code"] if c_row else "CODE"

    return PayinPolicyResponse(
        success=True,
        company_ref_id=target_comp,
        company_name=comp_name,
        company_code=comp_code,
        policy=meta.policy,
        display_name=meta.display_name,
        option=meta.option,
        description=meta.description,
        mdr_treatment=meta.mdr_treatment,
        updated_by=user_identifier,
        updated_at=now_utc.isoformat(),
        available_policies=AVAILABLE_POLICIES
    )


@router.post("/companies/{company_ref_id}/policy", response_model=PayinPolicyResponse)
async def update_company_policy_alias(
    company_ref_id: int,
    req: UpdatePayinPolicyRequest,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Company-scoped policy update alias."""
    req.company_ref_id = company_ref_id
    return await update_payin_policy(req=req, ctx=ctx, db=db)


@router.post("/companies/{company_ref_id}/toggle")
async def toggle_company_payin(
    company_ref_id: int,
    req: ToggleStatusRequest,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Enables or disables PayIn for a company. Validates cross-tenant boundaries."""
    ctx.validate_access(company_ref_id)
    stmt = select(PayinCompanyCfgModel).where(PayinCompanyCfgModel.company_ref_id == company_ref_id)
    res = await db.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Company configuration not found")

    cfg.payin_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "company_ref_id": company_ref_id, "payin_enabled": cfg.payin_enabled}


# ── ADMIN ACCESS GUARD ──

def require_admin_guard(
    payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(get_current_user)
) -> AdminUserModel:
    token_roles = [str(r).upper() for r in (payload.get("roles") or [])]
    user_type = str(getattr(current_user, "user_type", "") or "").upper()
    admin_roles = {"SUPER_ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "ROOT_ADMIN", "ADMIN", "COMPANY_ADMIN"}
    
    is_admin = bool(
        any(r in admin_roles for r in token_roles)
        or user_type in admin_roles
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative privileges required to manage payment settings."
        )
    return current_user


# ── PAYMENT VENDOR MANAGEMENT DTOs ──

class CreatePayinVendorRequest(BaseModel):
    vendor_code: str = Field(..., min_length=2, max_length=50, description="Unique vendor identifier, e.g. PHONEPE")
    vendor_name: str = Field(..., min_length=2, max_length=150, description="Full descriptive vendor name")
    provider_name: str = Field(..., min_length=2, max_length=100, description="Provider entity name")
    provider_type: str = Field("PAYMENT_GATEWAY", min_length=2, max_length=50, description="PAYMENT_GATEWAY, BANK, AGGREGATOR")
    api_base_url: str = Field(..., min_length=5, max_length=255, description="Provider API base endpoint URL")
    auth_type: str = Field("API_KEY", min_length=2, max_length=50, description="API_KEY, BEARER, BASIC, HMAC")
    cred_ref: str = Field(..., min_length=2, max_length=255, description="Vault or environment credential key reference")
    callback_url: Optional[str] = Field(None, max_length=255, description="Webhook/Callback URL")
    timeout_sec: int = Field(30, ge=1, le=300, description="Timeout in seconds")
    retry_policy: str = Field("EXPONENTIAL_BACKOFF", min_length=2, max_length=100)
    vendor_status: str = Field("ACTIVE", description="Initial status: ACTIVE or INACTIVE")


class UpdatePayinVendorRequest(BaseModel):
    vendor_code: Optional[str] = Field(None, min_length=2, max_length=50)
    vendor_name: Optional[str] = Field(None, min_length=2, max_length=150)
    provider_name: Optional[str] = Field(None, min_length=2, max_length=100)
    provider_type: Optional[str] = Field(None, min_length=2, max_length=50)
    api_base_url: Optional[str] = Field(None, min_length=5, max_length=255)
    auth_type: Optional[str] = Field(None, min_length=2, max_length=50)
    cred_ref: Optional[str] = Field(None, min_length=2, max_length=255)
    callback_url: Optional[str] = Field(None, max_length=255)
    timeout_sec: Optional[int] = Field(None, ge=1, le=300)
    retry_policy: Optional[str] = Field(None, min_length=2, max_length=100)
    vendor_status: Optional[str] = Field(None, description="ACTIVE or INACTIVE")


class ToggleVendorStatusRequest(BaseModel):
    vendor_status: Optional[str] = Field(None, description="Target status: ACTIVE or INACTIVE")


# ── PAYMENT VENDOR MASTER ENDPOINTS ──

@router.get("/vendors")
async def list_vendors(
    _admin: AdminUserModel = Depends(require_admin_guard),
    db: AsyncSession = Depends(get_db)
):
    """Lists all configured payment vendors with runtime metadata and transaction counts."""
    subq = select(
        PayinTransactionModel.payin_vendor_ref_id,
        func.count(PayinTransactionModel.payin_txn_ref_id).label("txn_count")
    ).group_by(PayinTransactionModel.payin_vendor_ref_id).subquery()

    stmt = select(
        PayinVendorModel,
        func.coalesce(subq.c.txn_count, 0).label("txn_count")
    ).outerjoin(
        subq,
        PayinVendorModel.payin_vendor_ref_id == subq.c.payin_vendor_ref_id
    ).order_by(
        PayinVendorModel.payin_vendor_ref_id.asc()
    )
    res = await db.execute(stmt)
    rows = res.all()

    vendor_list = []
    for v, txn_cnt in rows:
        vendor_list.append({
            "payin_vendor_ref_id": v.payin_vendor_ref_id,
            "vendor_code": v.vendor_code,
            "vendor_name": v.vendor_name,
            "provider_name": v.provider_name,
            "provider_type": v.provider_type,
            "api_base_url": v.api_base_url,
            "auth_type": v.auth_type,
            "cred_ref": v.cred_ref,
            "callback_url": v.callback_url,
            "timeout_sec": v.timeout_sec,
            "retry_policy": v.retry_policy,
            "vendor_status": v.vendor_status,
            "created_by": v.created_by,
            "updated_by": v.updated_by,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "updated_at": v.updated_at.isoformat() if v.updated_at else None,
            "txn_count": int(txn_cnt or 0)
        })

    return {
        "success": True,
        "vendors": vendor_list,
        "data": vendor_list,
        "total": len(vendor_list)
    }


@router.get("/vendors/{vendor_ref_id}")
async def get_vendor_detail(
    vendor_ref_id: int,
    _admin: AdminUserModel = Depends(require_admin_guard),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full details for a single payment vendor."""
    stmt = select(PayinVendorModel).where(PayinVendorModel.payin_vendor_ref_id == vendor_ref_id)
    vendor = (await db.execute(stmt)).scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail=f"Payment vendor Ref #{vendor_ref_id} not found.")

    txn_count = (await db.execute(
        select(func.count(PayinTransactionModel.payin_txn_ref_id)).where(
            PayinTransactionModel.payin_vendor_ref_id == vendor_ref_id
        )
    )).scalar() or 0

    return {
        "success": True,
        "vendor": {
            "payin_vendor_ref_id": vendor.payin_vendor_ref_id,
            "vendor_code": vendor.vendor_code,
            "vendor_name": vendor.vendor_name,
            "provider_name": vendor.provider_name,
            "provider_type": vendor.provider_type,
            "api_base_url": vendor.api_base_url,
            "auth_type": vendor.auth_type,
            "cred_ref": vendor.cred_ref,
            "callback_url": vendor.callback_url,
            "timeout_sec": vendor.timeout_sec,
            "retry_policy": vendor.retry_policy,
            "vendor_status": vendor.vendor_status,
            "created_by": vendor.created_by,
            "updated_by": vendor.updated_by,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None,
            "txn_count": int(txn_count)
        }
    }


@router.post("/vendors", status_code=status.HTTP_201_CREATED)
async def create_vendor(
    req: CreatePayinVendorRequest,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new Payment Vendor in payin_vendors, prevents duplicate codes,
    and maps default company gateway configs with full audit logging.
    """
    code_clean = req.vendor_code.strip().upper()
    if not code_clean:
        raise HTTPException(status_code=400, detail="Vendor code cannot be empty.")

    # Check duplicate vendor code
    dup_stmt = select(PayinVendorModel).where(func.upper(PayinVendorModel.vendor_code) == code_clean)
    dup = (await db.execute(dup_stmt)).scalars().first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Vendor code '{code_clean}' already exists (#{dup.payin_vendor_ref_id} - {dup.vendor_name})."
        )

    status_clean = (req.vendor_status or "ACTIVE").strip().upper()
    if status_clean not in ("ACTIVE", "INACTIVE"):
        raise HTTPException(status_code=400, detail="Invalid vendor status. Must be ACTIVE or INACTIVE.")

    new_vendor = PayinVendorModel(
        vendor_code=code_clean,
        vendor_name=req.vendor_name.strip(),
        provider_name=req.provider_name.strip(),
        provider_type=req.provider_type.strip().upper(),
        api_base_url=req.api_base_url.strip(),
        auth_type=req.auth_type.strip().upper(),
        cred_ref=req.cred_ref.strip(),
        callback_url=req.callback_url.strip() if req.callback_url else None,
        timeout_sec=req.timeout_sec or 30,
        retry_policy=req.retry_policy.strip(),
        vendor_status=status_clean,
        created_by=ctx.user_email,
        updated_by=ctx.user_email
    )
    db.add(new_vendor)
    await db.flush()

    # Map to active companies in payin_company_vendors
    comp_stmt = select(CompanyModel.company_ref_id).where(CompanyModel.status == "ACTIVE")
    active_companies = (await db.execute(comp_stmt)).scalars().all()
    if not active_companies:
        active_companies = [1, 2]

    for c_id in active_companies:
        existing_cvs = (await db.execute(
            select(PayinCompanyVendorModel).where(PayinCompanyVendorModel.company_ref_id == c_id)
        )).scalars().all()
        next_order = len(existing_cvs) + 1
        gw_code = f"G-{next_order}"

        cv_mapping = PayinCompanyVendorModel(
            company_ref_id=c_id,
            payin_vendor_ref_id=new_vendor.payin_vendor_ref_id,
            gateway_code=gw_code,
            retailer_display_name=f"Gateway {gw_code}",
            description=f"Payment processing via {new_vendor.vendor_name}.",
            display_order=next_order,
            status=status_clean,
            is_enabled=(status_clean == "ACTIVE"),
            vendor_priority=next_order,
            is_default=False,
            updated_by=ctx.user_email
        )
        db.add(cv_mapping)

    # Record Audit Log
    db.add(PayinAuditLogModel(
        company_ref_id=ctx.company_ref_id or 1,
        actor_ref_id=getattr(ctx.user, "admin_user_ref_id", None) or getattr(ctx.user, "id", None),
        action_type="CREATE_PAYIN_VENDOR",
        entity_type="payin_vendors",
        entity_ref_id=new_vendor.payin_vendor_ref_id,
        old_value=None,
        new_value={
            "vendor_code": new_vendor.vendor_code,
            "vendor_name": new_vendor.vendor_name,
            "provider_name": new_vendor.provider_name,
            "provider_type": new_vendor.provider_type,
            "api_base_url": new_vendor.api_base_url,
            "vendor_status": new_vendor.vendor_status
        },
        created_at=datetime.now(timezone.utc)
    ))
    await db.commit()

    return {
        "success": True,
        "message": f"Payment vendor '{new_vendor.vendor_name}' ({new_vendor.vendor_code}) created successfully.",
        "vendor": {
            "payin_vendor_ref_id": new_vendor.payin_vendor_ref_id,
            "vendor_code": new_vendor.vendor_code,
            "vendor_name": new_vendor.vendor_name,
            "provider_name": new_vendor.provider_name,
            "provider_type": new_vendor.provider_type,
            "api_base_url": new_vendor.api_base_url,
            "auth_type": new_vendor.auth_type,
            "cred_ref": new_vendor.cred_ref,
            "callback_url": new_vendor.callback_url,
            "timeout_sec": new_vendor.timeout_sec,
            "retry_policy": new_vendor.retry_policy,
            "vendor_status": new_vendor.vendor_status,
            "created_by": new_vendor.created_by,
            "updated_by": new_vendor.updated_by,
            "created_at": new_vendor.created_at.isoformat() if new_vendor.created_at else None,
            "updated_at": new_vendor.updated_at.isoformat() if new_vendor.updated_at else None,
            "txn_count": 0
        }
    }


@router.put("/vendors/{vendor_ref_id}")
@router.post("/vendors/{vendor_ref_id}")
async def update_vendor(
    vendor_ref_id: int,
    req: UpdatePayinVendorRequest,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates an existing vendor's configuration.
    Preserves relational integrity by locking vendor_code if transactions exist.
    Cascades status changes to company-level mappings.
    """
    stmt = select(PayinVendorModel).where(PayinVendorModel.payin_vendor_ref_id == vendor_ref_id)
    vendor = (await db.execute(stmt)).scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail=f"Payment vendor Ref #{vendor_ref_id} not found.")

    old_val = {
        "vendor_code": vendor.vendor_code,
        "vendor_name": vendor.vendor_name,
        "provider_name": vendor.provider_name,
        "provider_type": vendor.provider_type,
        "api_base_url": vendor.api_base_url,
        "auth_type": vendor.auth_type,
        "cred_ref": vendor.cred_ref,
        "callback_url": vendor.callback_url,
        "timeout_sec": vendor.timeout_sec,
        "retry_policy": vendor.retry_policy,
        "vendor_status": vendor.vendor_status
    }

    # Validate vendor_code modification
    if req.vendor_code is not None and req.vendor_code.strip():
        new_code = req.vendor_code.strip().upper()
        if new_code != vendor.vendor_code:
            txn_count = (await db.execute(
                select(func.count(PayinTransactionModel.payin_txn_ref_id)).where(
                    PayinTransactionModel.payin_vendor_ref_id == vendor_ref_id
                )
            )).scalar() or 0
            if txn_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vendor code cannot be modified because {txn_count} transaction(s) are associated with this vendor. Primary identifier modification is prohibited to maintain relational and financial integrity."
                )
            dup = (await db.execute(
                select(PayinVendorModel).where(
                    func.upper(PayinVendorModel.vendor_code) == new_code,
                    PayinVendorModel.payin_vendor_ref_id != vendor_ref_id
                )
            )).scalars().first()
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Vendor code '{new_code}' is already assigned to vendor #{dup.payin_vendor_ref_id} ({dup.vendor_name})."
                )
            vendor.vendor_code = new_code

    if req.vendor_name is not None and req.vendor_name.strip():
        vendor.vendor_name = req.vendor_name.strip()
    if req.provider_name is not None and req.provider_name.strip():
        vendor.provider_name = req.provider_name.strip()
    if req.provider_type is not None and req.provider_type.strip():
        vendor.provider_type = req.provider_type.strip().upper()
    if req.api_base_url is not None and req.api_base_url.strip():
        vendor.api_base_url = req.api_base_url.strip()
    if req.auth_type is not None and req.auth_type.strip():
        vendor.auth_type = req.auth_type.strip().upper()
    if req.cred_ref is not None and req.cred_ref.strip():
        vendor.cred_ref = req.cred_ref.strip()
    if req.callback_url is not None:
        vendor.callback_url = req.callback_url.strip() if req.callback_url.strip() else None
    if req.timeout_sec is not None:
        vendor.timeout_sec = req.timeout_sec
    if req.retry_policy is not None and req.retry_policy.strip():
        vendor.retry_policy = req.retry_policy.strip()

    if req.vendor_status is not None and req.vendor_status.strip():
        target_status = req.vendor_status.strip().upper()
        if target_status not in ("ACTIVE", "INACTIVE"):
            raise HTTPException(status_code=400, detail="Invalid status. Must be ACTIVE or INACTIVE.")
        if target_status != vendor.vendor_status:
            vendor.vendor_status = target_status
            is_en = (target_status == "ACTIVE")
            await db.execute(
                update(PayinCompanyVendorModel).where(
                    PayinCompanyVendorModel.payin_vendor_ref_id == vendor_ref_id
                ).values(
                    status=target_status,
                    is_enabled=is_en,
                    updated_by=ctx.user_email,
                    updated_at=func.now()
                )
            )

    vendor.updated_by = ctx.user_email
    vendor.updated_at = datetime.now(timezone.utc)

    new_val = {
        "vendor_code": vendor.vendor_code,
        "vendor_name": vendor.vendor_name,
        "provider_name": vendor.provider_name,
        "provider_type": vendor.provider_type,
        "api_base_url": vendor.api_base_url,
        "auth_type": vendor.auth_type,
        "cred_ref": vendor.cred_ref,
        "callback_url": vendor.callback_url,
        "timeout_sec": vendor.timeout_sec,
        "retry_policy": vendor.retry_policy,
        "vendor_status": vendor.vendor_status
    }

    db.add(PayinAuditLogModel(
        company_ref_id=ctx.company_ref_id or 1,
        actor_ref_id=getattr(ctx.user, "admin_user_ref_id", None) or getattr(ctx.user, "id", None),
        action_type="UPDATE_PAYIN_VENDOR",
        entity_type="payin_vendors",
        entity_ref_id=vendor_ref_id,
        old_value=old_val,
        new_value=new_val,
        created_at=datetime.now(timezone.utc)
    ))
    await db.commit()

    return {
        "success": True,
        "message": f"Payment vendor '{vendor.vendor_name}' ({vendor.vendor_code}) updated successfully.",
        "vendor": {
            "payin_vendor_ref_id": vendor.payin_vendor_ref_id,
            "vendor_code": vendor.vendor_code,
            "vendor_name": vendor.vendor_name,
            "provider_name": vendor.provider_name,
            "provider_type": vendor.provider_type,
            "api_base_url": vendor.api_base_url,
            "auth_type": vendor.auth_type,
            "cred_ref": vendor.cred_ref,
            "callback_url": vendor.callback_url,
            "timeout_sec": vendor.timeout_sec,
            "retry_policy": vendor.retry_policy,
            "vendor_status": vendor.vendor_status,
            "created_by": vendor.created_by,
            "updated_by": vendor.updated_by,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None
        }
    }


@router.post("/vendors/{vendor_ref_id}/toggle-status")
async def toggle_vendor_status(
    vendor_ref_id: int,
    req: Optional[ToggleVendorStatusRequest] = None,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Explicitly activates or deactivates a payment vendor.
    Deactivation immediately blocks retailer checkout and fails closed on new collections.
    Cascades status update to all company vendor mappings.
    Historical transactions, logs, and settlements remain fully preserved.
    """
    stmt = select(PayinVendorModel).where(PayinVendorModel.payin_vendor_ref_id == vendor_ref_id)
    vendor = (await db.execute(stmt)).scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail=f"Payment vendor Ref #{vendor_ref_id} not found.")

    old_status = vendor.vendor_status
    if req and req.vendor_status:
        target_status = req.vendor_status.strip().upper()
    else:
        target_status = "INACTIVE" if old_status == "ACTIVE" else "ACTIVE"

    if target_status not in ("ACTIVE", "INACTIVE"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be ACTIVE or INACTIVE.")

    vendor.vendor_status = target_status
    vendor.updated_by = ctx.user_email
    vendor.updated_at = datetime.now(timezone.utc)

    # Cascade to payin_company_vendors
    is_en = (target_status == "ACTIVE")
    await db.execute(
        update(PayinCompanyVendorModel).where(
            PayinCompanyVendorModel.payin_vendor_ref_id == vendor_ref_id
        ).values(
            status=target_status,
            is_enabled=is_en,
            updated_by=ctx.user_email,
            updated_at=func.now()
        )
    )

    action_label = "DEACTIVATE_PAYIN_VENDOR" if target_status == "INACTIVE" else "ACTIVATE_PAYIN_VENDOR"
    user_msg = (
        f"Vendor '{vendor.vendor_name}' ({vendor.vendor_code}) deactivated successfully. Retailer checkout and new PayIn collections are now blocked for this vendor."
        if target_status == "INACTIVE" else
        f"Vendor '{vendor.vendor_name}' ({vendor.vendor_code}) activated successfully. Vendor is now available for retailer checkout."
    )

    db.add(PayinAuditLogModel(
        company_ref_id=ctx.company_ref_id or 1,
        actor_ref_id=getattr(ctx.user, "admin_user_ref_id", None) or getattr(ctx.user, "id", None),
        action_type=action_label,
        entity_type="payin_vendors",
        entity_ref_id=vendor_ref_id,
        old_value={"vendor_status": old_status},
        new_value={"vendor_status": target_status},
        created_at=datetime.now(timezone.utc)
    ))
    await db.commit()

    return {
        "success": True,
        "vendor_status": target_status,
        "message": user_msg,
        "vendor": {
            "payin_vendor_ref_id": vendor.payin_vendor_ref_id,
            "vendor_code": vendor.vendor_code,
            "vendor_name": vendor.vendor_name,
            "vendor_status": vendor.vendor_status,
            "updated_by": vendor.updated_by,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None
        }
    }


@router.get("/company-vendors")
async def list_company_vendors(
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists company to vendor mapping strictly filtered by company for Company Admins."""
    where_clause = ""
    params = {}
    if not ctx.is_super_admin:
        where_clause = "WHERE cv.company_ref_id = :comp_ref"
        params["comp_ref"] = ctx.company_ref_id

    stmt = text(f"""
        SELECT 
            cv.payin_company_vendor_ref_id,
            cv.company_ref_id,
            c.company_name,
            v.vendor_code,
            v.vendor_name,
            cv.merchant_id,
            cv.vendor_priority,
            cv.is_default,
            cv.is_enabled
        FROM public.payin_company_vendors cv
        JOIN public.company c ON cv.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
        {where_clause}
        ORDER BY cv.company_ref_id ASC, cv.vendor_priority ASC;
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r) for r in res.mappings().all()]
    return {"success": True, "mappings": rows, "data": rows}


# ── PAYMENT GATEWAY DYNAMIC MANAGEMENT ──


@router.get("/gateways")
async def list_payment_gateways(
    company_ref_id: Optional[int] = Query(None, description="Optional company ID override for Super Admin"),
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists Payment Gateway configurations for Admin management.
    Includes Reference ID, Internal Provider Name, Retailer Display Name,
    Description, Display Order, Status, and Enabled switch state.
    Strictly enforces company tenant isolation for Company Admins.
    """
    effective_company_ref_id = ctx.company_ref_id
    if ctx.is_super_admin and company_ref_id is not None:
        effective_company_ref_id = company_ref_id

    # Resolve company name
    c_stmt = text("SELECT company_name FROM public.company WHERE company_ref_id = :cid")
    c_res = await db.execute(c_stmt, {"cid": effective_company_ref_id})
    c_row = c_res.fetchone()
    company_name = c_row[0] if c_row else f"Company {effective_company_ref_id}"

    stmt = text("""
        SELECT 
            cv.payin_company_vendor_ref_id,
            cv.company_ref_id,
            c.company_name,
            cv.payin_vendor_ref_id,
            v.vendor_code,
            v.vendor_name,
            v.provider_name,
            cv.gateway_code,
            cv.retailer_display_name,
            cv.description,
            cv.display_order,
            cv.status,
            cv.is_enabled,
            cv.is_default,
            cv.updated_by,
            cv.updated_at
        FROM public.payin_company_vendors cv
        JOIN public.company c ON cv.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
        WHERE cv.company_ref_id = :cid
        ORDER BY cv.display_order ASC, cv.vendor_priority ASC;
    """)
    res = await db.execute(stmt, {"cid": effective_company_ref_id})
    rows = []
    for r in res.mappings().all():
        rows.append({
            "payin_company_vendor_ref_id": r["payin_company_vendor_ref_id"],
            "company_ref_id": r["company_ref_id"],
            "company_name": r["company_name"],
            "payin_vendor_ref_id": r["payin_vendor_ref_id"],
            "vendor_code": r["vendor_code"],
            "internal_provider_name": r["vendor_name"] or r["provider_name"],
            "gateway_code": r["gateway_code"],
            "retailer_display_name": r["retailer_display_name"],
            "description": r["description"],
            "display_order": r["display_order"],
            "status": r["status"],
            "is_enabled": r["is_enabled"],
            "is_default": r["is_default"],
            "updated_by": r["updated_by"],
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None
        })

    return {
        "success": True,
        "company_ref_id": effective_company_ref_id,
        "company_name": company_name,
        "gateways": rows
    }


@router.post("/gateways/{ref_id}")
async def update_payment_gateway(
    ref_id: int,
    req: UpdateGatewayConfigRequest,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates Payment Gateway configuration for an authorized Admin.
    Allows updating retailer display name, description, display order,
    status (ACTIVE / INACTIVE), and enabled state while strictly preserving
    the internal payment provider integration and tenant isolation.
    """
    stmt = select(PayinCompanyVendorModel, PayinVendorModel).join(
        PayinVendorModel,
        PayinCompanyVendorModel.payin_vendor_ref_id == PayinVendorModel.payin_vendor_ref_id
    ).where(PayinCompanyVendorModel.payin_company_vendor_ref_id == ref_id)

    if not ctx.is_super_admin:
        stmt = stmt.where(PayinCompanyVendorModel.company_ref_id == ctx.company_ref_id)

    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment gateway configuration #{ref_id} not found or unauthorized for your company scope."
        )

    cv, v = row

    # Capture old values for audit logging
    old_val = {
        "retailer_display_name": cv.retailer_display_name,
        "description": cv.description,
        "display_order": cv.display_order,
        "status": cv.status,
        "is_enabled": cv.is_enabled,
        "internal_vendor_code": v.vendor_code
    }

    # Apply updates with validation
    if req.retailer_display_name is not None and req.retailer_display_name.strip():
        cv.retailer_display_name = req.retailer_display_name.strip()
    if req.description is not None:
        cv.description = req.description.strip()
    if req.display_order is not None:
        cv.display_order = req.display_order
    if req.status is not None:
        cv.status = req.status.strip().upper()
        if cv.status == "INACTIVE":
            cv.is_enabled = False
        elif cv.status == "ACTIVE" and req.is_enabled is None:
            cv.is_enabled = True
    if req.is_enabled is not None:
        cv.is_enabled = req.is_enabled
        if not cv.is_enabled and cv.status == "ACTIVE":
            cv.status = "INACTIVE"
        elif cv.is_enabled and cv.status == "INACTIVE":
            cv.status = "ACTIVE"

    cv.updated_by = ctx.user_email
    cv.updated_at = datetime.now(timezone.utc)

    new_val = {
        "retailer_display_name": cv.retailer_display_name,
        "description": cv.description,
        "display_order": cv.display_order,
        "status": cv.status,
        "is_enabled": cv.is_enabled,
        "internal_vendor_code": v.vendor_code
    }

    # Record audit log
    audit_entry = PayinAuditLogModel(
        company_ref_id=cv.company_ref_id,
        action_type="UPDATE_GATEWAY_CONFIG",
        entity_type="payin_company_vendors",
        entity_ref_id=ref_id,
        old_value=old_val,
        new_value=new_val,
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "success": True,
        "message": f"Payment gateway '{cv.retailer_display_name}' updated successfully.",
        "gateway": {
            "payin_company_vendor_ref_id": cv.payin_company_vendor_ref_id,
            "company_ref_id": cv.company_ref_id,
            "internal_provider_name": v.vendor_name,
            "vendor_code": v.vendor_code,
            "gateway_code": cv.gateway_code,
            "retailer_display_name": cv.retailer_display_name,
            "description": cv.description,
            "display_order": cv.display_order,
            "status": cv.status,
            "is_enabled": cv.is_enabled,
            "updated_by": cv.updated_by,
            "updated_at": cv.updated_at.isoformat() if cv.updated_at else None
        }
    }


@router.post("/gateways/{ref_id}/toggle-status")
async def toggle_gateway_status(
    ref_id: int,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles the ACTIVE / INACTIVE and enabled status of a Payment Gateway.
    Prevents complete deactivation if it is the sole active gateway for the company.
    """
    stmt = select(PayinCompanyVendorModel, PayinVendorModel).join(
        PayinVendorModel,
        PayinCompanyVendorModel.payin_vendor_ref_id == PayinVendorModel.payin_vendor_ref_id
    ).where(PayinCompanyVendorModel.payin_company_vendor_ref_id == ref_id)

    if not ctx.is_super_admin:
        stmt = stmt.where(PayinCompanyVendorModel.company_ref_id == ctx.company_ref_id)

    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment gateway configuration #{ref_id} not found."
        )

    cv, v = row
    current_active = (cv.status == "ACTIVE" and cv.is_enabled)
    target_active = not current_active

    # Check sole active gateway guard
    if not target_active:
        active_count_stmt = select(func.count()).select_from(PayinCompanyVendorModel).where(
            PayinCompanyVendorModel.company_ref_id == cv.company_ref_id,
            PayinCompanyVendorModel.payin_company_vendor_ref_id != ref_id,
            PayinCompanyVendorModel.status == "ACTIVE",
            PayinCompanyVendorModel.is_enabled == True
        )
        active_remaining = (await db.execute(active_count_stmt)).scalar() or 0
        if active_remaining == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deactivate '{cv.retailer_display_name}'. At least one payment gateway must remain active for company checkout."
            )

    old_status = cv.status
    cv.status = "ACTIVE" if target_active else "INACTIVE"
    cv.is_enabled = target_active
    cv.updated_by = ctx.user_email
    cv.updated_at = datetime.now(timezone.utc)

    # Record audit log
    audit_entry = PayinAuditLogModel(
        company_ref_id=cv.company_ref_id,
        action_type="TOGGLE_GATEWAY_STATUS",
        entity_type="payin_company_vendors",
        entity_ref_id=ref_id,
        old_value={"status": old_status, "is_enabled": not target_active},
        new_value={"status": cv.status, "is_enabled": target_active},
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "success": True,
        "payin_company_vendor_ref_id": cv.payin_company_vendor_ref_id,
        "retailer_display_name": cv.retailer_display_name,
        "status": cv.status,
        "is_enabled": cv.is_enabled,
        "message": f"Gateway '{cv.retailer_display_name}' is now {cv.status}."
    }


@router.post("/gateways")
async def create_payment_gateway(
    req: CreateGatewayConfigRequest,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new payment gateway mapping for an authorized company.
    """
    effective_company_ref_id = ctx.company_ref_id
    if ctx.is_super_admin and req.company_ref_id:
        effective_company_ref_id = req.company_ref_id

    # Verify vendor exists
    v_stmt = select(PayinVendorModel).where(PayinVendorModel.payin_vendor_ref_id == req.payin_vendor_ref_id)
    v_res = await db.execute(v_stmt)
    vendor = v_res.scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail=f"Vendor #{req.payin_vendor_ref_id} does not exist.")

    # Check if mapping already exists
    dup_stmt = select(PayinCompanyVendorModel).where(
        PayinCompanyVendorModel.company_ref_id == effective_company_ref_id,
        PayinCompanyVendorModel.payin_vendor_ref_id == req.payin_vendor_ref_id
    )
    dup = (await db.execute(dup_stmt)).scalars().first()
    if dup:
        raise HTTPException(
            status_code=400,
            detail=f"Vendor '{vendor.vendor_name}' is already registered for this company (Ref #{dup.payin_company_vendor_ref_id}). Please edit the existing entry."
        )

    new_cv = PayinCompanyVendorModel(
        company_ref_id=effective_company_ref_id,
        payin_vendor_ref_id=req.payin_vendor_ref_id,
        gateway_code=req.gateway_code.strip().upper(),
        retailer_display_name=req.retailer_display_name.strip(),
        description=req.description.strip() if req.description else "Fast and secure payment processing.",
        display_order=req.display_order or 1,
        status=req.status.strip().upper() if req.status else "ACTIVE",
        is_enabled=req.is_enabled if req.is_enabled is not None else True,
        is_default=False,
        vendor_priority=req.display_order or 1,
        updated_by=ctx.user_email
    )
    db.add(new_cv)
    await db.flush()

    # Record audit log
    db.add(PayinAuditLogModel(
        company_ref_id=effective_company_ref_id,
        action_type="CREATE_GATEWAY_CONFIG",
        entity_type="payin_company_vendors",
        entity_ref_id=new_cv.payin_company_vendor_ref_id,
        old_value=None,
        new_value={
            "gateway_code": new_cv.gateway_code,
            "retailer_display_name": new_cv.retailer_display_name,
            "provider_name": vendor.vendor_name,
            "status": new_cv.status
        },
        created_at=datetime.now(timezone.utc)
    ))
    await db.commit()

    return {
        "success": True,
        "message": f"Payment gateway '{new_cv.retailer_display_name}' registered successfully.",
        "gateway": {
            "payin_company_vendor_ref_id": new_cv.payin_company_vendor_ref_id,
            "company_ref_id": new_cv.company_ref_id,
            "internal_provider_name": vendor.vendor_name,
            "vendor_code": vendor.vendor_code,
            "gateway_code": new_cv.gateway_code,
            "retailer_display_name": new_cv.retailer_display_name,
            "description": new_cv.description,
            "display_order": new_cv.display_order,
            "status": new_cv.status,
            "is_enabled": new_cv.is_enabled
        }
    }


@router.get("/services")
async def list_service_types(db: AsyncSession = Depends(get_db)):
    """Lists all service types."""
    stmt = select(PayinServiceTypeModel).order_by(PayinServiceTypeModel.display_order.asc())
    res = await db.execute(stmt)
    services = res.scalars().all()
    return {
        "success": True,
        "services": [
            {
                "payin_service_type_ref_id": s.payin_service_type_ref_id,
                "svc_code": s.svc_code,
                "svc_name": s.svc_name,
                "svc_desc": s.svc_desc,
                "svc_icon": s.svc_icon,
                "display_order": s.display_order,
                "is_enabled": s.is_enabled
            } for s in services
        ]
    }


@router.post("/services/{svc_ref_id}/toggle")
async def toggle_service(svc_ref_id: int, req: ToggleStatusRequest, db: AsyncSession = Depends(get_db)):
    """Enables or disables a service type."""
    stmt = select(PayinServiceTypeModel).where(PayinServiceTypeModel.payin_service_type_ref_id == svc_ref_id)
    svc = (await db.execute(stmt)).scalars().first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service type not found")
    svc.is_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "payin_service_type_ref_id": svc_ref_id, "is_enabled": svc.is_enabled}


@router.get("/payment-modes")
async def list_payment_modes(db: AsyncSession = Depends(get_db)):
    """Lists all payment modes."""
    stmt = select(PayinPaymentModeModel).order_by(PayinPaymentModeModel.display_order.asc())
    modes = (await db.execute(stmt)).scalars().all()
    return {
        "success": True,
        "payment_modes": [
            {
                "payin_payment_mode_ref_id": m.payin_payment_mode_ref_id,
                "pay_mode_code": m.pay_mode_code,
                "pay_mode_name": m.pay_mode_name,
                "pay_mode_desc": m.pay_mode_desc,
                "pay_icon": m.pay_icon,
                "display_order": m.display_order,
                "is_enabled": m.is_enabled
            } for m in modes
        ]
    }


@router.post("/payment-modes/{mode_ref_id}/toggle")
async def toggle_payment_mode(mode_ref_id: int, req: ToggleStatusRequest, db: AsyncSession = Depends(get_db)):
    """Enables or disables a payment mode."""
    stmt = select(PayinPaymentModeModel).where(PayinPaymentModeModel.payin_payment_mode_ref_id == mode_ref_id)
    mode = (await db.execute(stmt)).scalars().first()
    if not mode:
        raise HTTPException(status_code=404, detail="Payment mode not found")
    mode.is_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "payin_payment_mode_ref_id": mode_ref_id, "is_enabled": mode.is_enabled}


@router.get("/card-types")
async def list_card_types(
    search: Optional[str] = None,
    network: Optional[str] = None,
    status: Optional[str] = None,
    company_ref_id: Optional[int] = None,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists card classification & network catalog directly from the database.
    Supports optional search, network filter, status filter, and returns authoritative DB counts.
    """
    stmt = select(PayinCardTypeModel).order_by(PayinCardTypeModel.card_type_code.asc())
    cards_all = (await db.execute(stmt)).scalars().all()
    
    total_count = len(cards_all)
    active_count = sum(1 for c in cards_all if c.is_enabled)
    inactive_count = total_count - active_count
    
    # Extract networks dynamically from authoritative DB records
    networks = sorted(list({c.card_network for c in cards_all if c.card_network}))
    
    filtered_cards = cards_all
    if network and network.strip() and network.upper() != "ALL":
        filtered_cards = [c for c in filtered_cards if c.card_network.upper() == network.strip().upper()]

    if status and status.strip() and status.upper() != "ALL":
        if status.upper() in ("ACTIVE", "ENABLED", "TRUE"):
            filtered_cards = [c for c in filtered_cards if c.is_enabled]
        elif status.upper() in ("INACTIVE", "DISABLED", "FALSE"):
            filtered_cards = [c for c in filtered_cards if not c.is_enabled]

    if search and search.strip():
        q = search.strip().lower()
        filtered_cards = [
            c for c in filtered_cards
            if q in c.card_type_code.lower() 
            or q in c.card_type_name.lower()
            or q in c.card_network.lower()
            or (c.card_desc and q in c.card_desc.lower())
        ]

    effective_comp = ctx.company_ref_id if not ctx.is_super_admin else (company_ref_id or ctx.company_ref_id or 2)

    return {
        "success": True,
        "company_ref_id": effective_comp,
        "total": total_count,
        "active_count": active_count,
        "inactive_count": inactive_count,
        "networks": networks,
        "filtered_total": len(filtered_cards),
        "card_types": [
            {
                "payin_card_type_ref_id": c.payin_card_type_ref_id,
                "card_type_code": c.card_type_code,
                "card_type_name": c.card_type_name,
                "card_network": c.card_network,
                "card_desc": c.card_desc,
                "status": "ACTIVE" if c.is_enabled else "DISABLED",
                "is_enabled": c.is_enabled,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None
            } for c in filtered_cards
        ]
    }


@router.post("/card-types/{card_ref_id}/toggle")
async def toggle_card_type(card_ref_id: int, req: ToggleStatusRequest, db: AsyncSession = Depends(get_db)):
    """Enables or disables a card type."""
    stmt = select(PayinCardTypeModel).where(PayinCardTypeModel.payin_card_type_ref_id == card_ref_id)
    card = (await db.execute(stmt)).scalars().first()
    if not card:
        raise HTTPException(status_code=404, detail="Card type not found")
    card.is_enabled = req.is_enabled
    await db.commit()
    return {"success": True, "payin_card_type_ref_id": card_ref_id, "is_enabled": card.is_enabled}


@router.get("/mdr")
async def list_mdr_rules(
    company_ref_id: Optional[int] = None,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists dynamic MDR rules strictly isolated by company for Company Admins."""
    effective_comp = ctx.company_ref_id if not ctx.is_super_admin else company_ref_id
    where_clause = ""
    params = {}
    if effective_comp:
        where_clause = "WHERE m.company_ref_id = :comp_ref"
        params["comp_ref"] = effective_comp

    stmt = text(f"""
        SELECT 
            m.payin_mdr_cfg_ref_id,
            m.company_ref_id,
            c.company_name,
            v.vendor_name,
            s.svc_name,
            p.pay_mode_name,
            ct.card_type_name,
            m.card_network,
            m.mdr_pct,
            m.mdr_fixed,
            m.tax_pct,
            m.min_mdr,
            m.max_mdr,
            m.mdr_treatment,
            m.priority,
            m.is_enabled
        FROM public.payin_mdr_cfg m
        JOIN public.company c ON m.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON m.payin_vendor_ref_id = v.payin_vendor_ref_id
        LEFT JOIN public.payin_service_types s ON m.payin_service_type_ref_id = s.payin_service_type_ref_id
        LEFT JOIN public.payin_payment_modes p ON m.payin_payment_mode_ref_id = p.payin_payment_mode_ref_id
        LEFT JOIN public.payin_card_types ct ON m.payin_card_type_ref_id = ct.payin_card_type_ref_id
        {where_clause}
        ORDER BY m.company_ref_id ASC, m.priority DESC;
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r) for r in res.mappings().all()]
    return {"success": True, "rules": rows, "data": rows}


@router.post("/mdr")
async def create_mdr_rule(
    req: CreateMdrRuleRequest,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new dynamic MDR rule. Validates company boundary."""
    ctx.validate_access(req.company_ref_id)
    rule = PayinMdrCfgModel(
        company_ref_id=req.company_ref_id,
        payin_vendor_ref_id=req.payin_vendor_ref_id,
        payin_service_type_ref_id=req.payin_service_type_ref_id,
        payin_payment_mode_ref_id=req.payin_payment_mode_ref_id,
        payin_card_type_ref_id=req.payin_card_type_ref_id,
        card_network=req.card_network,
        mdr_pct=req.mdr_pct,
        mdr_fixed=req.mdr_fixed,
        tax_pct=req.tax_pct,
        min_mdr=req.min_mdr,
        max_mdr=req.max_mdr,
        mdr_treatment=req.mdr_treatment,
        priority=req.priority,
        is_enabled=True
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"success": True, "payin_mdr_cfg_ref_id": rule.payin_mdr_cfg_ref_id}


@router.get("/company-card-mdr")
async def get_company_card_mdr(
    company_ref_id: Optional[int] = Query(None),
    payin_vendor_ref_id: Optional[int] = Query(None),
    gateway_code: Optional[str] = Query(None),
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the 5 standard card schemes and their Admin-configured MDR rates
    for the selected company and vendor/gateway.
    Enforces strict company-level tenant isolation.
    """
    target_comp = company_ref_id or ctx.company_ref_id or 2
    if not ctx.is_super_admin:
        ctx.validate_access(target_comp)
        target_comp = ctx.company_ref_id or 2

    # Resolve company name
    c_stmt = text("SELECT company_name, company_code FROM public.company WHERE company_ref_id = :cid")
    c_res = await db.execute(c_stmt, {"cid": target_comp})
    c_row = c_res.fetchone()
    company_name = c_row[0] if c_row else f"Company {target_comp}"

    # Resolve vendor / gateway
    effective_vendor_ref_id = payin_vendor_ref_id
    effective_gateway_code = gateway_code

    if not effective_vendor_ref_id and effective_gateway_code:
        gw_stmt = text("""
            SELECT cv.payin_vendor_ref_id, cv.gateway_code, cv.retailer_display_name, v.vendor_name, v.vendor_code
            FROM public.payin_company_vendors cv
            JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
            WHERE cv.company_ref_id = :cid AND cv.gateway_code = :gcode
            LIMIT 1;
        """)
        gw_res = await db.execute(gw_stmt, {"cid": target_comp, "gcode": effective_gateway_code.strip().upper()})
        gw_row = gw_res.mappings().first()
        if gw_row:
            effective_vendor_ref_id = gw_row["payin_vendor_ref_id"]

    if not effective_vendor_ref_id:
        def_stmt = text("""
            SELECT cv.payin_vendor_ref_id, cv.gateway_code, cv.retailer_display_name, v.vendor_name, v.vendor_code
            FROM public.payin_company_vendors cv
            JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
            WHERE cv.company_ref_id = :cid AND cv.is_enabled = TRUE
            ORDER BY cv.is_default DESC, cv.display_order ASC
            LIMIT 1;
        """)
        def_res = await db.execute(def_stmt, {"cid": target_comp})
        def_row = def_res.mappings().first()
        if def_row:
            effective_vendor_ref_id = def_row["payin_vendor_ref_id"]
            effective_gateway_code = def_row["gateway_code"]
        else:
            effective_vendor_ref_id = 1
            effective_gateway_code = "G-1"

    # Fetch gateway details
    gw_info_stmt = text("""
        SELECT cv.gateway_code, cv.retailer_display_name, v.vendor_name, v.vendor_code, cv.is_enabled, cv.status
        FROM public.payin_company_vendors cv
        JOIN public.payin_vendors v ON cv.payin_vendor_ref_id = v.payin_vendor_ref_id
        WHERE cv.company_ref_id = :cid AND cv.payin_vendor_ref_id = :vid
        LIMIT 1;
    """)
    gw_info_res = await db.execute(gw_info_stmt, {"cid": target_comp, "vid": effective_vendor_ref_id})
    gw_info = gw_info_res.mappings().first()
    g_code = gw_info["gateway_code"] if gw_info else (effective_gateway_code or "G-1")
    g_name = gw_info["retailer_display_name"] if gw_info else f"Gateway {g_code}"
    v_name = gw_info["vendor_name"] if gw_info else "Provider"
    v_code = gw_info["vendor_code"] if gw_info else "PROVIDER"

    # Standard schemes definition (Cards + UPI)
    standard_schemes = [
        {"id": "upi", "name": "UPI", "category": "Unified Payments Interface", "card_network": "UPI", "brand_color": "#059669", "icon_text": "UPI"},
        {"id": "visa", "name": "Visa", "category": "Consumer Debit / Credit", "card_network": "VISA", "brand_color": "#1A1F71", "icon_text": "VISA"},
        {"id": "mastercard", "name": "MasterCard", "category": "Consumer Debit / Credit", "card_network": "MASTERCARD", "brand_color": "#EB001B", "icon_text": "MC"},
        {"id": "rupay", "name": "RuPay", "category": "Domestic NPCI Network", "card_network": "RUPAY", "brand_color": "#097939", "icon_text": "RUPAY"},
        {"id": "amex_diners", "name": "AMEX / Diners", "category": "Premium Card Schemes", "card_network": "AMEX", "brand_color": "#006FCF", "icon_text": "AMEX"},
        {"id": "business_corporate", "name": "Business / Corporate", "category": "Commercial & Purchasing", "card_network": "CORP", "brand_color": "#475569", "icon_text": "CORP"}
    ]

    # Query existing rules from payin_mdr_cfg
    rules_stmt = text("""
        SELECT 
            payin_mdr_cfg_ref_id,
            payin_card_type_ref_id,
            card_network,
            mdr_pct,
            mdr_fixed,
            tax_pct,
            min_mdr,
            max_mdr,
            mdr_treatment,
            is_enabled,
            updated_by,
            updated_at
        FROM public.payin_mdr_cfg
        WHERE company_ref_id = :cid
          AND payin_vendor_ref_id = :vid;
    """)
    rules_res = await db.execute(rules_stmt, {"cid": target_comp, "vid": effective_vendor_ref_id})
    existing_rules_map = {r["card_network"].upper(): dict(r) for r in rules_res.mappings().all() if r["card_network"]}

    items = []
    for s in standard_schemes:
        net = s["card_network"]
        rule = existing_rules_map.get(net)
        if rule:
            pct = float(rule["mdr_pct"]) * 100.0
            items.append({
                "id": s["id"],
                "name": s["name"],
                "category": s["category"],
                "card_network": net,
                "mdr_percent": round(pct, 2),
                "mdr_display": f"{pct:.2f}%",
                "is_enabled": bool(rule["is_enabled"]),
                "is_configured": True,
                "mdr_treatment": rule.get("mdr_treatment") or "COLLECT_ADDITIONALLY",
                "brand_color": s["brand_color"],
                "icon_text": s["icon_text"],
                "rule_ref_id": rule.get("payin_mdr_cfg_ref_id"),
                "updated_by": rule.get("updated_by"),
                "updated_at": rule.get("updated_at").isoformat() if rule.get("updated_at") else None
            })
        else:
            items.append({
                "id": s["id"],
                "name": s["name"],
                "category": s["category"],
                "card_network": net,
                "mdr_percent": None,
                "mdr_display": "Not Configured",
                "is_enabled": False,
                "is_configured": False,
                "mdr_treatment": "COLLECT_ADDITIONALLY",
                "brand_color": s["brand_color"],
                "icon_text": s["icon_text"],
                "rule_ref_id": None,
                "updated_by": None,
                "updated_at": None
            })

    return {
        "success": True,
        "company_ref_id": target_comp,
        "company_name": company_name,
        "payin_vendor_ref_id": effective_vendor_ref_id,
        "gateway_code": g_code,
        "gateway_name": g_name,
        "internal_vendor_name": v_name,
        "internal_vendor_code": v_code,
        "card_schemes": items
    }


@router.post("/company-card-mdr")
async def update_company_card_mdr(
    req: UpdateCompanyCardMdrRequest,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates or inserts MDR percentage and active status for a specific
    company, payment vendor/gateway, and card scheme.
    Strictly isolated by Company Ref ID and records full audit log.
    """
    target_comp = req.company_ref_id
    if not ctx.is_super_admin:
        ctx.validate_access(target_comp)
        target_comp = ctx.company_ref_id

    vendor_ref_id = req.payin_vendor_ref_id
    if not vendor_ref_id and req.gateway_code:
        gw_stmt = text("""
            SELECT payin_vendor_ref_id FROM public.payin_company_vendors
            WHERE company_ref_id = :cid AND gateway_code = :gcode
            LIMIT 1;
        """)
        gw_res = await db.execute(gw_stmt, {"cid": target_comp, "gcode": req.gateway_code.strip().upper()})
        vendor_ref_id = gw_res.scalar()

    if not vendor_ref_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid payin_vendor_ref_id or gateway_code is required."
        )

    net = req.card_network.strip().upper()
    valid_networks = {"VISA", "MASTERCARD", "RUPAY", "AMEX", "CORP", "UPI"}
    if net not in valid_networks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment method / card network '{req.card_network}'. Supported: {', '.join(sorted(valid_networks))}."
        )

    if req.mdr_percent < 0 or req.mdr_percent > 50.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MDR percentage {req.mdr_percent}. Must be between 0.00% and 50.00%."
        )

    card_type_ref_id = None
    payment_mode_ref_id = None
    if net == "UPI":
        payment_mode_ref_id = 1
    else:
        ct_stmt = text("SELECT payin_card_type_ref_id FROM public.payin_card_types WHERE card_network = :net LIMIT 1;")
        ct_res = await db.execute(ct_stmt, {"net": net})
        card_type_ref_id = ct_res.scalar()

    now_utc = datetime.now(timezone.utc)
    user_email = ctx.user_email or "ADMIN"

    find_stmt = text("""
        SELECT payin_mdr_cfg_ref_id, mdr_pct, is_enabled, mdr_treatment
        FROM public.payin_mdr_cfg
        WHERE company_ref_id = :cid
          AND payin_vendor_ref_id = :vid
          AND card_network = :net
        ORDER BY priority DESC, payin_mdr_cfg_ref_id DESC
        LIMIT 1;
    """)
    find_res = await db.execute(find_stmt, {"cid": target_comp, "vid": vendor_ref_id, "net": net})
    existing = find_res.mappings().first()

    new_pct_decimal = round(float(req.mdr_percent) / 100.0, 6)

    if existing:
        rule_id = existing["payin_mdr_cfg_ref_id"]
        old_val = {
            "mdr_percent": float(existing["mdr_pct"]) * 100.0,
            "is_enabled": existing["is_enabled"],
            "card_network": net
        }
        update_stmt = text("""
            UPDATE public.payin_mdr_cfg
            SET mdr_pct = :pct,
                is_enabled = :en,
                updated_by = :uby,
                updated_at = :uat
            WHERE payin_mdr_cfg_ref_id = :rid;
        """)
        await db.execute(update_stmt, {
            "pct": new_pct_decimal,
            "en": req.is_enabled,
            "uby": user_email,
            "uat": now_utc,
            "rid": rule_id
        })
    else:
        old_val = None
        ins_stmt = text("""
            INSERT INTO public.payin_mdr_cfg (
                company_ref_id, payin_vendor_ref_id, payin_payment_mode_ref_id, payin_card_type_ref_id, card_network,
                mdr_pct, mdr_fixed, tax_pct, min_mdr, max_mdr, mdr_treatment,
                priority, is_enabled, effective_from, created_by, updated_by, created_at, updated_at
            ) VALUES (
                :cid, :vid, :pmid, :ctid, :net,
                :pct, 0.0, 0.18, 0.0, 5000.0, :treat,
                100, :en, :now, :uby, :uby, :now, :now
            ) RETURNING payin_mdr_cfg_ref_id;
        """)
        ins_res = await db.execute(ins_stmt, {
            "cid": target_comp,
            "vid": vendor_ref_id,
            "pmid": payment_mode_ref_id,
            "ctid": card_type_ref_id,
            "net": net,
            "pct": new_pct_decimal,
            "treat": req.mdr_treatment or "COLLECT_ADDITIONALLY",
            "en": req.is_enabled,
            "now": now_utc,
            "uby": user_email
        })
        rule_id = ins_res.scalar()

    new_val = {
        "mdr_percent": req.mdr_percent,
        "is_enabled": req.is_enabled,
        "card_network": net
    }

    # Ensure/sync base wildcard rule (card_network IS NULL) for this company & vendor
    base_find = await db.execute(text("""
        SELECT payin_mdr_cfg_ref_id FROM public.payin_mdr_cfg
        WHERE company_ref_id = :cid AND payin_vendor_ref_id = :vid AND card_network IS NULL
        LIMIT 1;
    """), {"cid": target_comp, "vid": vendor_ref_id})
    base_id = base_find.scalar()

    if net == "VISA" or not base_id:
        if base_id:
            await db.execute(text("""
                UPDATE public.payin_mdr_cfg
                SET mdr_pct = :pct, is_enabled = :en, updated_by = :uby, updated_at = :uat
                WHERE payin_mdr_cfg_ref_id = :rid;
            """), {"pct": new_pct_decimal, "en": req.is_enabled, "uby": user_email, "uat": now_utc, "rid": base_id})
        else:
            await db.execute(text("""
                INSERT INTO public.payin_mdr_cfg (
                    company_ref_id, payin_vendor_ref_id, card_network,
                    mdr_pct, mdr_fixed, tax_pct, min_mdr, max_mdr, mdr_treatment,
                    priority, is_enabled, effective_from, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :cid, :vid, NULL,
                    :pct, 0.0, 0.18, 0.0, 5000.0, :treat,
                    100, :en, :now, :uby, :uby, :now, :now
                );
            """), {
                "cid": target_comp, "vid": vendor_ref_id, "pct": new_pct_decimal,
                "treat": req.mdr_treatment or "COLLECT_ADDITIONALLY", "en": req.is_enabled,
                "now": now_utc, "uby": user_email
            })

    db.add(PayinAuditLogModel(
        company_ref_id=target_comp,
        action_type="UPDATE_COMPANY_CARD_MDR",
        entity_type="payin_mdr_cfg",
        entity_ref_id=rule_id,
        old_value=old_val,
        new_value=new_val,
        created_at=now_utc
    ))

    await db.commit()

    return {
        "success": True,
        "message": f"MDR for {net} updated to {req.mdr_percent:.2f}% ({'Active' if req.is_enabled else 'Disabled'}).",
        "rule": {
            "rule_ref_id": rule_id,
            "company_ref_id": target_comp,
            "payin_vendor_ref_id": vendor_ref_id,
            "card_network": net,
            "mdr_percent": req.mdr_percent,
            "mdr_display": f"{req.mdr_percent:.2f}%",
            "is_enabled": req.is_enabled
        }
    }


@router.post("/company-card-mdr/batch")
async def batch_update_company_card_mdr(
    req: BatchUpdateCompanyCardMdrRequest,
    _admin: AdminUserModel = Depends(require_admin_guard),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Batch updates multiple card schemes MDR rates and enabled status
    for the selected company and vendor/gateway.
    """
    target_comp = req.company_ref_id
    if not ctx.is_super_admin:
        ctx.validate_access(target_comp)
        target_comp = ctx.company_ref_id

    vendor_ref_id = req.payin_vendor_ref_id
    if not vendor_ref_id and req.gateway_code:
        gw_stmt = text("""
            SELECT payin_vendor_ref_id FROM public.payin_company_vendors
            WHERE company_ref_id = :cid AND gateway_code = :gcode
            LIMIT 1;
        """)
        gw_res = await db.execute(gw_stmt, {"cid": target_comp, "gcode": req.gateway_code.strip().upper()})
        vendor_ref_id = gw_res.scalar()

    if not vendor_ref_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid payin_vendor_ref_id or gateway_code is required."
        )

    now_utc = datetime.now(timezone.utc)
    user_email = ctx.user_email or "ADMIN"
    results = []

    for item in req.items:
        net = item.card_network.strip().upper()
        if item.mdr_percent < 0 or item.mdr_percent > 50.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid MDR percentage {item.mdr_percent} for {net}."
            )

        card_type_ref_id = None
        payment_mode_ref_id = None
        if net == "UPI":
            payment_mode_ref_id = 1
        else:
            ct_stmt = text("SELECT payin_card_type_ref_id FROM public.payin_card_types WHERE card_network = :net LIMIT 1;")
            ct_res = await db.execute(ct_stmt, {"net": net})
            card_type_ref_id = ct_res.scalar()

        find_stmt = text("""
            SELECT payin_mdr_cfg_ref_id, mdr_pct, is_enabled
            FROM public.payin_mdr_cfg
            WHERE company_ref_id = :cid
              AND payin_vendor_ref_id = :vid
              AND card_network = :net
            ORDER BY priority DESC, payin_mdr_cfg_ref_id DESC
            LIMIT 1;
        """)
        find_res = await db.execute(find_stmt, {"cid": target_comp, "vid": vendor_ref_id, "net": net})
        existing = find_res.mappings().first()

        new_pct_decimal = round(float(item.mdr_percent) / 100.0, 6)

        if existing:
            rule_id = existing["payin_mdr_cfg_ref_id"]
            old_val = {
                "mdr_percent": float(existing["mdr_pct"]) * 100.0,
                "is_enabled": existing["is_enabled"],
                "card_network": net
            }
            update_stmt = text("""
                UPDATE public.payin_mdr_cfg
                SET mdr_pct = :pct,
                    is_enabled = :en,
                    updated_by = :uby,
                    updated_at = :uat
                WHERE payin_mdr_cfg_ref_id = :rid;
            """)
            await db.execute(update_stmt, {
                "pct": new_pct_decimal,
                "en": item.is_enabled,
                "uby": user_email,
                "uat": now_utc,
                "rid": rule_id
            })
        else:
            old_val = None
            ins_stmt = text("""
                INSERT INTO public.payin_mdr_cfg (
                    company_ref_id, payin_vendor_ref_id, payin_payment_mode_ref_id, payin_card_type_ref_id, card_network,
                    mdr_pct, mdr_fixed, tax_pct, min_mdr, max_mdr, mdr_treatment,
                    priority, is_enabled, effective_from, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :cid, :vid, :pmid, :ctid, :net,
                    :pct, 0.0, 0.18, 0.0, 5000.0, :treat,
                    100, :en, :now, :uby, :uby, :now, :now
                ) RETURNING payin_mdr_cfg_ref_id;
            """)
            ins_res = await db.execute(ins_stmt, {
                "cid": target_comp,
                "vid": vendor_ref_id,
                "pmid": payment_mode_ref_id,
                "ctid": card_type_ref_id,
                "net": net,
                "pct": new_pct_decimal,
                "treat": item.mdr_treatment or "COLLECT_ADDITIONALLY",
                "en": item.is_enabled,
                "now": now_utc,
                "uby": user_email
            })
            rule_id = ins_res.scalar()

        new_val = {
            "mdr_percent": item.mdr_percent,
            "is_enabled": item.is_enabled,
            "card_network": net
        }

        db.add(PayinAuditLogModel(
            company_ref_id=target_comp,
            action_type="UPDATE_COMPANY_CARD_MDR_BATCH",
            entity_type="payin_mdr_cfg",
            entity_ref_id=rule_id,
            old_value=old_val,
            new_value=new_val,
            created_at=now_utc
        ))

        results.append({
            "card_network": net,
            "mdr_percent": item.mdr_percent,
            "is_enabled": item.is_enabled,
            "rule_ref_id": rule_id
        })

    # Ensure/sync base wildcard rule (card_network IS NULL) using primary scheme (VISA) or first active scheme
    primary_item = next((it for it in req.items if it.card_network.upper() == "VISA" and it.is_enabled), None)
    if not primary_item:
        primary_item = next((it for it in req.items if it.is_enabled), req.items[0] if req.items else None)

    if primary_item:
        base_pct_decimal = round(float(primary_item.mdr_percent) / 100.0, 6)
        base_find = await db.execute(text("""
            SELECT payin_mdr_cfg_ref_id FROM public.payin_mdr_cfg
            WHERE company_ref_id = :cid AND payin_vendor_ref_id = :vid AND card_network IS NULL
            LIMIT 1;
        """), {"cid": target_comp, "vid": vendor_ref_id})
        b_id = base_find.scalar()
        if b_id:
            await db.execute(text("""
                UPDATE public.payin_mdr_cfg
                SET mdr_pct = :pct, is_enabled = :en, updated_by = :uby, updated_at = :uat
                WHERE payin_mdr_cfg_ref_id = :rid;
            """), {"pct": base_pct_decimal, "en": primary_item.is_enabled, "uby": user_email, "uat": now_utc, "rid": b_id})
        else:
            await db.execute(text("""
                INSERT INTO public.payin_mdr_cfg (
                    company_ref_id, payin_vendor_ref_id, card_network,
                    mdr_pct, mdr_fixed, tax_pct, min_mdr, max_mdr, mdr_treatment,
                    priority, is_enabled, effective_from, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :cid, :vid, NULL,
                    :pct, 0.0, 0.18, 0.0, 5000.0, :treat,
                    100, :en, :now, :uby, :uby, :now, :now
                );
            """), {
                "cid": target_comp, "vid": vendor_ref_id, "pct": base_pct_decimal,
                "treat": primary_item.mdr_treatment or "COLLECT_ADDITIONALLY", "en": primary_item.is_enabled,
                "now": now_utc, "uby": user_email
            })

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully updated {len(results)} card schemes for Company #{target_comp}.",
        "updated_schemes": results
    }


@router.get("/transactions")
async def list_transactions(
    company_ref_id: Optional[int] = None,
    txn_status: Optional[str] = None,
    tid: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists PayIn transactions strictly isolated by company for Company Admins."""
    effective_comp = ctx.company_ref_id if not ctx.is_super_admin else company_ref_id
    stmt = text("""
        SELECT 
            t.payin_transactions_ref_id,
            t.tid,
            t.company_ref_id,
            c.company_name,
            v.vendor_name,
            t.merchant_ref_id,
            t.provider_ref_id,
            s.svc_name,
            p.pay_mode_name,
            t.cust_name,
            t.cust_mobile,
            t.txn_amount,
            t.total_charges,
            t.customer_payable,
            t.retailer_credit,
            t.company_mdr_liability,
            t.mdr_treatment,
            t.txn_status,
            t.provider_status,
            t.ledger_txn_id,
            t.created_at
        FROM public.payin_transactions t
        JOIN public.company c ON t.company_ref_id = c.company_ref_id
        JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
        LEFT JOIN public.payin_service_types s ON t.svc_type_ref_id = s.payin_service_type_ref_id
        LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
        WHERE (:comp_ref IS NULL OR t.company_ref_id = :comp_ref)
          AND (:status IS NULL OR t.txn_status = :status)
          AND (:tid_query IS NULL OR t.tid ILIKE :tid_query)
        ORDER BY t.created_at DESC
        LIMIT :limit OFFSET :offset;
    """)
    res = await db.execute(stmt, {
        "comp_ref": effective_comp,
        "status": txn_status.upper() if txn_status else None,
        "tid_query": f"%{tid}%" if tid else None,
        "limit": limit,
        "offset": offset
    })
    return {"success": True, "transactions": [dict(r) for r in res.mappings().all()]}


@router.get("/callbacks")
async def list_callback_logs(
    tid: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists incoming webhook callback logs strictly isolated by company."""
    stmt = select(PayinCallbackLogModel)
    if not ctx.is_super_admin:
        stmt = stmt.where(PayinCallbackLogModel.company_ref_id == ctx.company_ref_id)
    if tid:
        stmt = stmt.where(PayinCallbackLogModel.tid == tid)
    stmt = stmt.order_by(PayinCallbackLogModel.received_at.desc()).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return {
        "success": True,
        "callback_logs": [
            {
                "payin_callback_log_ref_id": l.payin_callback_log_ref_id,
                "tid": l.tid,
                "company_ref_id": l.company_ref_id,
                "provider_ref_id": l.provider_ref_id,
                "callback_status": l.callback_status,
                "signature_valid": l.signature_valid,
                "process_status": l.process_status,
                "error_msg": l.error_msg,
                "received_at": l.received_at.isoformat() if l.received_at else None
            } for l in logs
        ]
    }
    return {
        "success": True,
        "callback_logs": [
            {
                "payin_callback_log_ref_id": l.payin_callback_log_ref_id,
                "tid": l.tid,
                "company_ref_id": l.company_ref_id,
                "provider_ref_id": l.provider_ref_id,
                "callback_status": l.callback_status,
                "signature_valid": l.signature_valid,
                "process_status": l.process_status,
                "error_msg": l.error_msg,
                "received_at": l.received_at.isoformat() if l.received_at else None
            } for l in logs
        ]
    }

