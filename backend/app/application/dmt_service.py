"""EPIC-024 — Domestic Money Transfer (DMT) Transaction Engine — Service Layer"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta, date
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_

from app.infrastructure.db.dmt_models import (
    DmtTransactionModel, DmtTransactionStatusModel, DmtTransactionChargeModel,
    DmtTransactionCommissionModel, DmtBankRequestModel, DmtBankResponseModel,
    DmtSwitchLogModel, DmtRetryModel, DmtReversalModel, DmtRefundModel,
    DmtDisputeModel, DmtStatusHistoryModel, DmtAuditModel, DmtNotificationModel,
    DmtSettlementModel
)
from app.application.dmt_dtos import (
    DmtChargeCalculateRequest, DmtChargeCalculateResponse,
    DmtTransferCreateRequest, DmtTransactionResponse,
    DmtReversalRequest, DmtReversalResponse,
    DmtDashboardMetricsResponse, DmtSearchRequest
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_txn_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"DMT{suffix}"


def _generate_utr() -> str:
    return f"UTR2026{random.randint(100000000, 999999999)}"


def _generate_rrn() -> str:
    return f"RRN2026{random.randint(10000000, 99999999)}"


def _to_txn_response(t: DmtTransactionModel) -> DmtTransactionResponse:
    return DmtTransactionResponse(
        public_id=t.public_id,
        transaction_number=t.transaction_number,
        rrn=t.rrn,
        utr=t.utr,
        customer_id=t.customer_id,
        beneficiary_id=t.beneficiary_id,
        retailer_id=t.retailer_id,
        transaction_mode=t.transaction_mode,
        transfer_amount=t.transfer_amount,
        service_charge=t.service_charge,
        gst_amount=t.gst_amount,
        total_debit_amount=t.total_debit_amount,
        bank_account_number=t.bank_account_number,
        bank_ifsc=t.bank_ifsc,
        bank_name=t.bank_name,
        beneficiary_name=t.beneficiary_name,
        transaction_status=t.transaction_status,
        initiated_at=t.initiated_at,
        completed_at=t.completed_at,
    )


class DmtService:

    # ── Dashboard ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> DmtDashboardMetricsResponse:
        total = await db.scalar(select(func.count()).select_from(DmtTransactionModel).where(DmtTransactionModel.is_active == True))
        success = await db.scalar(select(func.count()).select_from(DmtTransactionModel).where(
            and_(DmtTransactionModel.is_active == True, DmtTransactionModel.transaction_status == "SUCCESS")))
        failed = await db.scalar(select(func.count()).select_from(DmtTransactionModel).where(
            and_(DmtTransactionModel.is_active == True, DmtTransactionModel.transaction_status == "FAILED")))
        pending = await db.scalar(select(func.count()).select_from(DmtTransactionModel).where(
            and_(DmtTransactionModel.is_active == True, DmtTransactionModel.transaction_status == "PROCESSING")))
        reversals = await db.scalar(select(func.count()).select_from(DmtReversalModel).where(
            DmtReversalModel.is_active == True))

        sum_vol = await db.scalar(select(func.sum(DmtTransactionModel.transfer_amount)).where(
            and_(DmtTransactionModel.is_active == True, DmtTransactionModel.transaction_status == "SUCCESS")))

        total_cnt = total or 1
        success_pct = round(((success or 0) / total_cnt) * 100.0, 2)
        failure_pct = round(((failed or 0) / total_cnt) * 100.0, 2)

        return DmtDashboardMetricsResponse(
            today_transfers_count=total or 0,
            today_volume_amount=sum_vol or 0.0,
            success_rate_pct=success_pct,
            failure_rate_pct=failure_pct,
            pending_transfers_count=pending or 0,
            reversals_count=reversals or 0,
            mode_breakdown={"IMPS": success or 0, "NEFT": 0, "RTGS": 0},
            status_breakdown={"SUCCESS": success or 0, "FAILED": failed or 0},
        )

    # ── Charge & Commission Calculation Engine ────────────────────────────────

    @staticmethod
    def calculate_charges(req: DmtChargeCalculateRequest) -> DmtChargeCalculateResponse:
        # Standard DMT Charge: 1% of transfer amount, minimum ₹10, maximum ₹50
        raw_charge = req.transfer_amount * 0.01
        charge = max(10.0, min(50.0, raw_charge))
        gst = round(charge * 0.18, 2)
        total_debit = req.transfer_amount + charge + gst
        net_credit = req.transfer_amount

        # Commission distribution
        retailer_comm = round(charge * 0.40, 2)
        distributor_comm = round(charge * 0.15, 2)

        return DmtChargeCalculateResponse(
            transfer_amount=req.transfer_amount,
            transaction_mode=req.transaction_mode,
            service_charge=charge,
            gst_amount=gst,
            total_debit_amount=total_debit,
            net_beneficiary_credit=net_credit,
            retailer_commission=retailer_comm,
            distributor_commission=distributor_comm,
        )

    # ── Transfer Initiation ───────────────────────────────────────────────────

    @staticmethod
    async def create_transfer(db: AsyncSession, req: DmtTransferCreateRequest) -> DmtTransactionResponse:
        # Calculate charges
        calc = DmtService.calculate_charges(
            DmtChargeCalculateRequest(
                transfer_amount=req.transfer_amount,
                transaction_mode=req.transaction_mode,
                customer_id=req.customer_id,
                beneficiary_id=req.beneficiary_id,
            )
        )

        txn_num = _generate_txn_number()
        utr = _generate_utr()
        rrn = _generate_rrn()

        txn = DmtTransactionModel(
            public_id=uuid.uuid4(),
            transaction_number=txn_num,
            rrn=rrn,
            utr=utr,
            reference_number=f"REF{int(_now().timestamp())}",
            customer_id=req.customer_id,
            beneficiary_id=req.beneficiary_id,
            retailer_id=req.retailer_id,
            service_type="DMT",
            transaction_mode=req.transaction_mode,
            transfer_amount=req.transfer_amount,
            service_charge=calc.service_charge,
            gst_amount=calc.gst_amount,
            total_debit_amount=calc.total_debit_amount,
            net_beneficiary_credit=calc.net_beneficiary_credit,
            currency="INR",
            bank_account_number="987654321012",
            bank_ifsc="HDFC0001234",
            bank_name="HDFC Bank",
            beneficiary_name="Verified Beneficiary",
            transaction_status="SUCCESS",
            purpose=req.purpose or "Money Transfer",
            remarks=req.remarks,
            initiated_at=_now(),
            completed_at=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=uuid.uuid4(),
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(txn)
        await db.flush()

        # Charge record
        chg = DmtTransactionChargeModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            service_charge=calc.service_charge,
            bank_charge=2.0,
            switch_charge=1.0,
            gst_rate_pct=18.0,
            gst_amount=calc.gst_amount,
            net_charge=calc.service_charge + calc.gst_amount,
            is_active=True,
            is_deleted=False,
            tenant_id=txn.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(chg)

        # Commission record
        comm = DmtTransactionCommissionModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            retailer_commission=calc.retailer_commission,
            distributor_commission=calc.distributor_commission,
            super_distributor_commission=1.0,
            rm_commission=0.5,
            platform_commission=2.0,
            is_active=True,
            is_deleted=False,
            tenant_id=txn.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(comm)

        # Bank Response Simulation
        bresp = DmtBankResponseModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            response_code="00",
            response_message="Transaction Successful",
            bank_rrn=rrn,
            bank_utr=utr,
            received_at=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=txn.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(bresp)

        # Notification
        notif = DmtNotificationModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            recipient_mobile="9876543210",
            notification_type="SMS",
            message_content=f"DMT Transfer of Rs.{req.transfer_amount} to HDFC Bank A/c 9876... is SUCCESSFUL. UTR: {utr}",
            delivery_status="DELIVERED",
            is_active=True,
            is_deleted=False,
            tenant_id=txn.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(notif)

        await db.commit()
        await db.refresh(txn)
        return _to_txn_response(txn)

    @staticmethod
    async def list_transfers(db: AsyncSession, req: DmtSearchRequest) -> List[DmtTransactionResponse]:
        stmt = select(DmtTransactionModel).where(DmtTransactionModel.is_active == True)
        if req.customer_id:
            stmt = stmt.where(DmtTransactionModel.customer_id == req.customer_id)
        if req.beneficiary_id:
            stmt = stmt.where(DmtTransactionModel.beneficiary_id == req.beneficiary_id)
        if req.retailer_id:
            stmt = stmt.where(DmtTransactionModel.retailer_id == req.retailer_id)
        if req.transaction_status:
            stmt = stmt.where(DmtTransactionModel.transaction_status == req.transaction_status)
        if req.query:
            stmt = stmt.where(
                or_(
                    DmtTransactionModel.transaction_number.ilike(f"%{req.query}%"),
                    DmtTransactionModel.utr.ilike(f"%{req.query}%"),
                    DmtTransactionModel.beneficiary_name.ilike(f"%{req.query}%"),
                )
            )
        stmt = stmt.order_by(DmtTransactionModel.initiated_at.desc())
        offset = (req.page - 1) * req.page_size
        stmt = stmt.offset(offset).limit(req.page_size)
        result = await db.execute(stmt)
        return [_to_txn_response(t) for t in result.scalars().all()]

    @staticmethod
    async def get_transfer(db: AsyncSession, txn_id: uuid.UUID) -> Optional[DmtTransactionResponse]:
        result = await db.execute(select(DmtTransactionModel).where(
            and_(DmtTransactionModel.public_id == txn_id, DmtTransactionModel.is_active == True)))
        t = result.scalar_one_or_none()
        return _to_txn_response(t) if t else None

    # ── Reversal Handler ──────────────────────────────────────────────────────

    @staticmethod
    async def reverse_transfer(db: AsyncSession, txn_id: uuid.UUID, req: DmtReversalRequest) -> DmtReversalResponse:
        result = await db.execute(select(DmtTransactionModel).where(
            and_(DmtTransactionModel.public_id == txn_id, DmtTransactionModel.is_active == True)))
        t = result.scalar_one_or_none()
        if not t:
            raise ValueError("Transaction not found")

        t.transaction_status = "REVERSED"
        t.updated_date = _now()

        rev_num = f"REV{int(_now().timestamp())}"
        rev = DmtReversalModel(
            public_id=uuid.uuid4(),
            transaction_id=txn_id,
            reversal_number=rev_num,
            reversal_reason=req.reason,
            reversal_amount=t.total_debit_amount,
            reversal_status="COMPLETED",
            reversed_at=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=t.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(rev)

        await db.commit()
        await db.refresh(rev)

        return DmtReversalResponse(
            reversal_id=rev.public_id,
            reversal_number=rev.reversal_number,
            transaction_number=t.transaction_number,
            reversal_amount=rev.reversal_amount,
            reversal_status=rev.reversal_status,
            reversed_at=rev.reversed_at,
        )
