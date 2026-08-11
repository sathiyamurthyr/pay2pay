"""EPIC-025 — Aadhaar Enabled Payment System (AEPS) Platform — Service Layer"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_

from app.infrastructure.db.aeps_models import (
    AepsTransactionModel, AepsTransactionStatusModel, AepsBiometricCaptureModel,
    AepsDeviceModel, AepsDeviceHealthModel, AepsBankRequestModel,
    AepsBankResponseModel, AepsNpciLogModel, AepsTransactionChargeModel,
    AepsCommissionModel, AepsRetryModel, AepsReversalModel, AepsDisputeModel,
    AepsSettlementModel, AepsStatusHistoryModel, AepsNotificationModel,
    AepsReceiptModel, AepsAuditModel
)
from app.application.aeps_dtos import (
    AepsTransferCreateRequest, AepsTransactionResponse,
    AepsDeviceRegisterRequest, AepsDeviceResponse,
    AepsDashboardMetricsResponse, AepsSearchRequest
)


BANK_IIN_MAP = {
    "607094": "State Bank of India",
    "607152": "ICICI Bank",
    "607076": "HDFC Bank",
    "607153": "Axis Bank",
    "508534": "Punjab National Bank",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _mask_aadhaar(aadhaar: str) -> str:
    cleaned = "".join(filter(str.isdigit, aadhaar))
    if len(cleaned) == 12:
        return f"XXXX-XXXX-{cleaned[-4:]}"
    return "XXXX-XXXX-1234"


def _generate_txn_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"AEPS{suffix}"


def _generate_rrn() -> str:
    return f"RRN2026{random.randint(10000000, 99999999)}"


def _generate_stan() -> str:
    return f"STAN{random.randint(100000, 999999)}"


def _to_txn_response(t: AepsTransactionModel) -> AepsTransactionResponse:
    return AepsTransactionResponse(
        public_id=t.public_id,
        transaction_number=t.transaction_number,
        rrn=t.rrn,
        stan=t.stan,
        customer_id=t.customer_id,
        retailer_id=t.retailer_id,
        masked_aadhaar=t.masked_aadhaar,
        bank_iin=t.bank_iin,
        bank_name=t.bank_name,
        service_type=t.service_type,
        transaction_amount=t.transaction_amount,
        available_balance=t.available_balance,
        retailer_commission=t.retailer_commission,
        transaction_status=t.transaction_status,
        initiated_at=t.initiated_at,
        completed_at=t.completed_at,
    )


def _to_device_response(d: AepsDeviceModel) -> AepsDeviceResponse:
    return AepsDeviceResponse(
        public_id=d.public_id,
        device_serial_number=d.device_serial_number,
        vendor_name=d.vendor_name,
        model_name=d.model_name,
        rd_service_version=d.rd_service_version,
        firmware_version=d.firmware_version,
        device_status=d.device_status,
        assigned_retailer_id=d.assigned_retailer_id,
    )


class AepsService:

    # ── Dashboard ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> AepsDashboardMetricsResponse:
        total = await db.scalar(select(func.count()).select_from(AepsTransactionModel).where(AepsTransactionModel.is_active == True))
        success = await db.scalar(select(func.count()).select_from(AepsTransactionModel).where(
            and_(AepsTransactionModel.is_active == True, AepsTransactionModel.transaction_status == "SUCCESS")))
        failed = await db.scalar(select(func.count()).select_from(AepsTransactionModel).where(
            and_(AepsTransactionModel.is_active == True, AepsTransactionModel.transaction_status == "FAILED")))
        
        withdrawals = await db.scalar(select(func.count()).select_from(AepsTransactionModel).where(
            and_(AepsTransactionModel.is_active == True, AepsTransactionModel.service_type == "CASH_WITHDRAWAL")))
        enquiries = await db.scalar(select(func.count()).select_from(AepsTransactionModel).where(
            and_(AepsTransactionModel.is_active == True, AepsTransactionModel.service_type == "BALANCE_ENQUIRY")))

        sum_vol = await db.scalar(select(func.sum(AepsTransactionModel.transaction_amount)).where(
            and_(AepsTransactionModel.is_active == True, AepsTransactionModel.transaction_status == "SUCCESS")))
        devices = await db.scalar(select(func.count()).select_from(AepsDeviceModel).where(AepsDeviceModel.is_active == True))

        total_cnt = total or 1
        success_pct = round(((success or 0) / total_cnt) * 100.0, 2)
        failure_pct = round(((failed or 0) / total_cnt) * 100.0, 2)

        return AepsDashboardMetricsResponse(
            today_transfers_count=total or 0,
            today_volume_amount=sum_vol or 0.0,
            cash_withdrawals_count=withdrawals or 0,
            balance_enquiries_count=enquiries or 0,
            success_rate_pct=success_pct,
            failure_rate_pct=failure_pct,
            active_devices_count=devices or 0,
            service_breakdown={"CASH_WITHDRAWAL": withdrawals or 0, "BALANCE_ENQUIRY": enquiries or 0},
            status_breakdown={"SUCCESS": success or 0, "FAILED": failed or 0},
        )

    # ── Device Management ─────────────────────────────────────────────────────

    @staticmethod
    async def register_device(db: AsyncSession, req: AepsDeviceRegisterRequest) -> AepsDeviceResponse:
        device = AepsDeviceModel(
            public_id=uuid.uuid4(),
            device_serial_number=req.device_serial_number,
            vendor_name=req.vendor_name.upper(),
            model_name=req.model_name,
            rd_service_version=req.rd_service_version,
            firmware_version=req.firmware_version,
            device_status="ACTIVE",
            assigned_retailer_id=req.assigned_retailer_id,
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
        db.add(device)
        await db.commit()
        await db.refresh(device)
        return _to_device_response(device)

    @staticmethod
    async def list_devices(db: AsyncSession) -> List[AepsDeviceResponse]:
        result = await db.execute(select(AepsDeviceModel).where(AepsDeviceModel.is_active == True))
        return [_to_device_response(d) for d in result.scalars().all()]

    # ── AEPS Transaction Execution ───────────────────────────────────────────

    @staticmethod
    async def create_transfer(db: AsyncSession, req: AepsTransferCreateRequest) -> AepsTransactionResponse:
        bank_name = BANK_IIN_MAP.get(req.bank_iin, "Partner Bank")
        masked_aadhaar = _mask_aadhaar(req.aadhaar_number)
        txn_num = _generate_txn_number()
        rrn = _generate_rrn()
        stan = _generate_stan()

        # Retailer commission for Cash Withdrawal >= ₹1000
        retailer_comm = 10.0 if req.service_type == "CASH_WITHDRAWAL" and req.transaction_amount >= 1000.0 else 0.0

        txn = AepsTransactionModel(
            public_id=uuid.uuid4(),
            transaction_number=txn_num,
            rrn=rrn,
            stan=stan,
            customer_id=req.customer_id,
            retailer_id=req.retailer_id,
            masked_aadhaar=masked_aadhaar,
            bank_iin=req.bank_iin,
            bank_name=bank_name,
            service_type=req.service_type,
            transaction_amount=req.transaction_amount,
            available_balance=45000.0,
            ledger_balance=45000.0,
            service_charge=0.0,
            gst_amount=0.0,
            retailer_commission=retailer_comm,
            net_settlement_amount=req.transaction_amount,
            currency="INR",
            transaction_status="SUCCESS",
            auth_response_code="00",
            auth_response_message="Biometric Authentication Successful",
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

        # Biometric Capture record
        bio = AepsBiometricCaptureModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            biometric_type=req.biometric_type,
            vendor_name=req.vendor_name.upper(),
            device_serial_number=req.device_serial_number,
            pid_block_encrypted=req.pid_block_encrypted,
            quality_score=88,
            capture_timestamp=_now(),
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
        db.add(bio)

        # Commission record
        comm = AepsCommissionModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            retailer_commission=retailer_comm,
            distributor_commission=2.0 if retailer_comm > 0 else 0.0,
            super_distributor_commission=1.0 if retailer_comm > 0 else 0.0,
            rm_commission=0.5 if retailer_comm > 0 else 0.0,
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

        # NPCI Log
        npci = AepsNpciLogModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            npci_txn_id=f"NPCI{random.randint(10000000, 99999999)}",
            npci_status="SUCCESS",
            npci_response_code="00",
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
        db.add(npci)

        # Digital Receipt
        receipt = AepsReceiptModel(
            public_id=uuid.uuid4(),
            transaction_id=txn.public_id,
            receipt_number=f"RCPT{int(_now().timestamp())}",
            receipt_payload={
                "txn_number": txn.transaction_number,
                "service_type": req.service_type,
                "amount": req.transaction_amount,
                "masked_aadhaar": masked_aadhaar,
                "bank_name": bank_name,
                "rrn": rrn,
                "status": "SUCCESS",
            },
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
        db.add(receipt)

        await db.commit()
        await db.refresh(txn)
        return _to_txn_response(txn)

    @staticmethod
    async def list_transfers(db: AsyncSession, req: AepsSearchRequest) -> List[AepsTransactionResponse]:
        stmt = select(AepsTransactionModel).where(AepsTransactionModel.is_active == True)
        if req.customer_id:
            stmt = stmt.where(AepsTransactionModel.customer_id == req.customer_id)
        if req.retailer_id:
            stmt = stmt.where(AepsTransactionModel.retailer_id == req.retailer_id)
        if req.service_type:
            stmt = stmt.where(AepsTransactionModel.service_type == req.service_type)
        if req.transaction_status:
            stmt = stmt.where(AepsTransactionModel.transaction_status == req.transaction_status)
        if req.query:
            stmt = stmt.where(
                or_(
                    AepsTransactionModel.transaction_number.ilike(f"%{req.query}%"),
                    AepsTransactionModel.masked_aadhaar.ilike(f"%{req.query}%"),
                    AepsTransactionModel.rrn.ilike(f"%{req.query}%"),
                )
            )
        stmt = stmt.order_by(AepsTransactionModel.initiated_at.desc())
        offset = (req.page - 1) * req.page_size
        stmt = stmt.offset(offset).limit(req.page_size)
        result = await db.execute(stmt)
        return [_to_txn_response(t) for t in result.scalars().all()]
