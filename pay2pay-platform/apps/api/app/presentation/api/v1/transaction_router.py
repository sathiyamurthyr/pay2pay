"""
Central Transaction & Dynamic Reference Engine REST API Router.
"""

import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.application.dependencies import get_current_tenant_id, get_current_user
from app.application.central_transaction_service import CentralTransactionService
from app.application.transaction_reference_service import TransactionReferenceService
from app.infrastructure.db.transaction_engine_models import TransactionConfigurationModel

router = APIRouter(prefix="/transactions", tags=["Central Transaction Engine"])

DEFAULT_TENANT_ID = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateTransactionRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Financial transaction amount in INR")
    transaction_type: str = Field("PAYOUT", description="PAYOUT, DMT, AEPS, SWIPE, etc.")
    service_type: str = Field("MOVE_TO_BANK", description="MOVE_TO_BANK, PENNY_DROP, ACCOUNT_VALIDATE, etc.")
    vendor_code: Optional[str] = Field("WOWPE", description="Vendor routing code: WOWPE, BULKPE, etc.")
    customer_id: Optional[str] = None
    retailer_id: Optional[str] = None
    beneficiary_id: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, description="Unique client key preventing duplicate debits")
    request_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    auto_execute: bool = Field(False, description="Whether to dispatch immediately to vendor gateway API")
    recipient_account: Optional[str] = None
    recipient_ifsc: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_mobile: Optional[str] = None
    transfer_mode: str = Field("IMPS", description="IMPS, NEFT, RTGS, UPI")
    wallet_type: Optional[str] = Field("MAIN", description="MAIN, COMMISSION, SETTLEMENT, etc.")


class UpdateConfigReq(BaseModel):
    vendor_code: str
    prefix_source: Optional[str] = "VENDOR_FIRST_CHAR"
    custom_prefix: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"
    random_length: Optional[int] = 5


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    req: CreateTransactionRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: Optional[str] = Query(None)
):
    """
    Creates and initiates an authoritative transaction with:
    - Authoritative server-generated reference (<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>)
    - Double-entry ledger holding
    - Idempotency deduplication
    - Status audit trail
    """
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else DEFAULT_TENANT_ID
    cust_uuid = uuid.UUID(req.customer_id) if req.customer_id and len(req.customer_id) == 36 else None
    ret_uuid = uuid.UUID(req.retailer_id) if req.retailer_id and len(req.retailer_id) == 36 else None
    bene_uuid = uuid.UUID(req.beneficiary_id) if req.beneficiary_id and len(req.beneficiary_id) == 36 else None

    result = await CentralTransactionService.create_and_initiate_transaction(
        db=db,
        amount=req.amount,
        transaction_type=req.transaction_type,
        service_type=req.service_type,
        tenant_id=tid,
        customer_id=cust_uuid,
        retailer_id=ret_uuid,
        beneficiary_id=bene_uuid,
        vendor_code=req.vendor_code,
        idempotency_key=req.idempotency_key,
        request_id=req.request_id,
        metadata_json=req.metadata,
        auto_execute=req.auto_execute,
        recipient_account=req.recipient_account,
        recipient_ifsc=req.recipient_ifsc,
        recipient_name=req.recipient_name,
        recipient_mobile=req.recipient_mobile,
        transfer_mode=req.transfer_mode,
        wallet_type=req.wallet_type or "MAIN"
    )

    return {
        "status": "SUCCESS",
        "data": result
    }


@router.get("")
async def list_transactions(
    vendor_code: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    service_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Lists transactions with filters and pagination."""
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else DEFAULT_TENANT_ID
    res = await CentralTransactionService.list_transactions(
        db=db,
        tenant_id=tid,
        vendor_code=vendor_code,
        status=status,
        service_type=service_type,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "status": "SUCCESS",
        "data": res
    }


@router.get("/{transaction_reference}")
async def get_transaction(
    transaction_reference: str,
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves complete transaction details including ledger entries and audit trail."""
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else DEFAULT_TENANT_ID
    tx = await CentralTransactionService.get_transaction(
        db=db,
        transaction_reference=transaction_reference,
        tenant_id=tid
    )
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with reference '{transaction_reference}' not found."
        )
    return {
        "status": "SUCCESS",
        "data": tx
    }


@router.get("/config/rules")
async def get_transaction_configuration(
    vendor_code: Optional[str] = Query("WOWPE"),
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Fetches transaction reference generation format rules."""
    tid = uuid.UUID(tenant_id) if tenant_id and len(tenant_id) == 36 else DEFAULT_TENANT_ID
    cfg = await TransactionReferenceService.get_or_create_config(
        db=db,
        tenant_id=tid,
        vendor_code=vendor_code or "DEFAULT"
    )
    return {
        "status": "SUCCESS",
        "data": {
            "tenant_id": str(cfg.tenant_id),
            "vendor_code": cfg.vendor_code,
            "prefix_source": cfg.prefix_source,
            "custom_prefix": cfg.custom_prefix,
            "date_format": cfg.date_format,
            "timezone": cfg.timezone,
            "random_length": cfg.random_length,
            "transaction_format": cfg.transaction_format,
            "sample_reference": TransactionReferenceService.generate_candidate_reference(
                vendor_first_char=TransactionReferenceService.resolve_vendor_first_char(cfg.vendor_code),
                tz_name=cfg.timezone,
                random_length=cfg.random_length
            )
        }
    }
