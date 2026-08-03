import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    PayoutCreateRequest, PayoutResponse, PayoutApprovalRequest,
    PayoutProcessRequest, BankGatewayResponse, BeneficiaryBankAccountResponse,
    PayoutDashboardMetricsResponse
)
from app.application.services import EnterprisePayoutService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/payouts", tags=["Enterprise Payout Engine (EPIC-010)"])


@router.post("/requests", response_model=PayoutResponse)
async def create_payout_request(
    req: PayoutCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payout = await EnterprisePayoutService.create_payout_request(db, tenant_id, req, current_user)
    return PayoutResponse(
        public_id=payout.public_id,
        payout_number=payout.payout_number,
        wallet_id=payout.wallet_id,
        retailer_id=payout.retailer_id,
        amount=payout.amount,
        charges=payout.charges,
        gst=payout.gst,
        net_amount=payout.net_amount,
        purpose=payout.purpose,
        priority=payout.priority,
        status=payout.status,
        requested_by=payout.requested_by,
        approved_by=payout.approved_by,
        utr_number=payout.transactions[0].utr_number if payout.transactions else None,
        created_date=payout.created_date
    )


@router.get("/requests", response_model=List[PayoutResponse])
async def list_payout_requests(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payouts = await EnterprisePayoutService.list_payouts(db, tenant_id)
    return [
        PayoutResponse(
            public_id=p.public_id,
            payout_number=p.payout_number,
            wallet_id=p.wallet_id,
            retailer_id=p.retailer_id,
            amount=p.amount,
            charges=p.charges,
            gst=p.gst,
            net_amount=p.net_amount,
            purpose=p.purpose,
            priority=p.priority,
            status=p.status,
            requested_by=p.requested_by,
            approved_by=p.approved_by,
            utr_number=p.transactions[0].utr_number if p.transactions else None,
            created_date=p.created_date
        )
        for p in payouts
    ]


@router.post("/requests/{id}/approve", response_model=PayoutResponse)
async def approve_payout_request(
    id: uuid.UUID,
    req: PayoutApprovalRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p = await EnterprisePayoutService.approve_payout(db, tenant_id, id, req, current_user)
    return PayoutResponse(
        public_id=p.public_id,
        payout_number=p.payout_number,
        wallet_id=p.wallet_id,
        retailer_id=p.retailer_id,
        amount=p.amount,
        charges=p.charges,
        gst=p.gst,
        net_amount=p.net_amount,
        purpose=p.purpose,
        priority=p.priority,
        status=p.status,
        requested_by=p.requested_by,
        approved_by=p.approved_by,
        utr_number=p.transactions[0].utr_number if p.transactions else None,
        created_date=p.created_date
    )


@router.post("/requests/{id}/process")
async def process_bank_payout(
    id: uuid.UUID,
    req: PayoutProcessRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ptxn = await EnterprisePayoutService.process_bank_payout(db, tenant_id, id, req, current_user)
    return {
        "message": "Outbound Bank Payout Dispatched Successfully",
        "utr_number": ptxn.utr_number,
        "rrn": ptxn.rrn,
        "gateway_reference": ptxn.gateway_reference,
        "status": ptxn.status
    }


@router.post("/requests/{id}/reverse")
async def reverse_payout(
    id: uuid.UUID,
    reason: str = Query("Bank return / Invalid beneficiary account"),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rev = await EnterprisePayoutService.reverse_payout(db, tenant_id, id, reason, current_user)
    return {"message": "Payout financial reversal completed", "reversal_number": rev.reversal_number, "status": rev.status}


@router.get("/gateways", response_model=List[BankGatewayResponse])
async def list_bank_gateways(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    gateways = await EnterprisePayoutService.list_gateways(db, tenant_id)
    return [
        BankGatewayResponse(
            gateway_code=g.gateway_code,
            gateway_name=g.gateway_name,
            api_endpoint=g.api_endpoint,
            auth_type=g.auth_type,
            status=g.status,
            priority=g.priority
        )
        for g in gateways
    ]


@router.get("/dashboard/metrics", response_model=PayoutDashboardMetricsResponse)
async def get_payout_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterprisePayoutService.get_dashboard_metrics(db, tenant_id)
