import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.exceptions import DomainException
from app.application.enterprise_payout_execution_service import EnterprisePayoutExecutionService
from app.infrastructure.db.enterprise_payout_models import EnterprisePayoutTransactionModel

router = APIRouter(prefix="/payout/execution", tags=["Enterprise Payout Execution"])

class PayoutExecutionRequest(BaseModel):
    customer_id: uuid.UUID = Field(..., description="Customer Public UUID")
    beneficiary_id: uuid.UUID = Field(..., description="Beneficiary Public UUID")
    retailer_id: uuid.UUID = Field(..., description="Retailer Public UUID")
    tenant_id: Optional[uuid.UUID] = Field(
        default=uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68"), description="Tenant ID"
    )
    amount: float = Field(..., gt=0.0, description="Payout Transfer Amount")
    mpin: str = Field(..., min_length=4, max_length=6, description="Retailer / Customer 4-6 digit MPIN")
    idempotency_key: Optional[str] = Field(None, description="Unique client idempotency key")
    mode: str = Field("IMPS", description="Transfer Mode: IMPS, NEFT, RTGS, UPI")

class ManualReversalRequest(BaseModel):
    reason: str = Field(..., description="Reason for triggering reversal")

@router.post("/initiate", summary="Execute Banking-Grade Step 1-8 Payout Flow")
async def initiate_payout(
    req: PayoutExecutionRequest,
    x_user_role: Optional[str] = Header("RETAILER", alias="X-User-Role"),
    db: AsyncSession = Depends(get_db)
):
    try:
        idem_key = req.idempotency_key or f"IDEM-{uuid.uuid4().hex[:16].upper()}"
        res = await EnterprisePayoutExecutionService.initiate_payout_execution(
            db=db,
            customer_id=req.customer_id,
            beneficiary_id=req.beneficiary_id,
            retailer_id=req.retailer_id,
            tenant_id=req.tenant_id,
            amount=req.amount,
            mpin=req.mpin,
            idempotency_key=idem_key,
            mode=req.mode,
            user_role=x_user_role
        )
        if not res.get("success") and not res.get("is_duplicate"):
            raise HTTPException(status_code=400, detail=res)
        return res
    except DomainException as de:
        raise HTTPException(status_code=400, detail=str(de))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Payout Execution Error: {str(e)}")

from sqlalchemy.orm import selectinload

@router.get("/{transaction_id}/status", summary="Get Payout Transaction Details & Audit Trail")
async def get_payout_status(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EnterprisePayoutTransactionModel).options(
        selectinload(EnterprisePayoutTransactionModel.ledger_entries),
        selectinload(EnterprisePayoutTransactionModel.audit_logs)
    ).where(
        EnterprisePayoutTransactionModel.public_id == transaction_id
    )
    res = await db.execute(stmt)
    tx = res.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    ledger_list = []
    for l in tx.ledger_entries:
        ledger_list.append({
            "entry_number": l.entry_number,
            "entry_type": l.entry_type,
            "account_type": l.account_type,
            "amount": l.amount,
            "balance_after": l.balance_after,
            "description": l.description,
            "is_reversal": l.is_reversal_entry
        })

    audit_list = []
    for a in tx.audit_logs:
        audit_list.append({
            "action": a.action,
            "previous_status": a.previous_status,
            "new_status": a.new_status,
            "actor_type": a.actor_type,
            "actor_id": a.actor_id,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "details": a.details
        })

    return {
        "transaction_id": str(tx.public_id),
        "transaction_number": tx.transaction_number,
        "idempotency_key": tx.idempotency_key,
        "status": tx.status.value if hasattr(tx.status, "value") else str(tx.status),
        "status_description": tx.status_description,
        "amount": tx.amount,
        "charges": tx.charges,
        "commission": tx.commission,
        "net_debit": tx.net_debit,
        "wallet_before": tx.wallet_before,
        "wallet_after": tx.wallet_after,
        "vendor_name": tx.vendor_name,
        "vendor_ref": tx.vendor_ref,
        "rrn": tx.rrn,
        "utr_number": tx.utr_number,
        "is_reversed": tx.is_reversed,
        "reversal_transaction_id": str(tx.reversal_transaction_id) if tx.reversal_transaction_id else None,
        "reversal_reason": tx.reversal_reason,
        "reversal_at": tx.reversal_at.isoformat() if tx.reversal_at else None,
        "retry_count": tx.retry_count,
        "initiated_at": tx.initiated_at.isoformat() if tx.initiated_at else None,
        "completed_at": tx.completed_at.isoformat() if tx.completed_at else None,
        "ledger_entries": ledger_list,
        "audit_logs": audit_list
    }

@router.post("/{transaction_id}/reverse", summary="Trigger Auto Reversal with Double-Reversal Guard")
async def reverse_payout(
    transaction_id: uuid.UUID,
    req: ManualReversalRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        res = await EnterprisePayoutExecutionService.execute_auto_reversal(
            db=db,
            transaction_id=transaction_id,
            reversal_reason=req.reason,
            actor_id="ADMIN"
        )
        await db.commit()
        return res
    except DomainException as de:
        raise HTTPException(status_code=400, detail=str(de))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reversal failed: {str(e)}")

@router.post("/reconcile-pending", summary="Run Background Pending Poller Job")
async def reconcile_pending(db: AsyncSession = Depends(get_db)):
    res = await EnterprisePayoutExecutionService.reconcile_pending_transactions(db)
    return res
