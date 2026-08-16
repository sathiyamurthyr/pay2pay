"""EPIC-022 — Beneficiary Management & Verification Platform — Service Layer"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta, date
from typing import Any, Dict, List, Optional
from difflib import SequenceMatcher

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_

from app.infrastructure.db.beneficiary_models import (
    BeneficiaryModel, BeneficiaryProfileModel, BeneficiaryBankAccountModel,
    BeneficiaryUpiModel, BeneficiaryVerificationModel, BeneficiaryDocumentModel,
    BeneficiaryServiceModel, BeneficiaryServiceConfigurationModel,
    BeneficiaryLimitConfigurationModel, BeneficiaryLimitOverrideModel,
    BeneficiaryRiskProfileModel, BeneficiaryStatusHistoryModel,
    BeneficiaryRelationshipModel, BeneficiaryTimelineModel,
    BeneficiaryBlacklistModel, BeneficiaryWhitelistModel, BeneficiaryAuditModel
)
from app.application.beneficiary_dtos import (
    BeneficiaryRegisterRequest, BeneficiaryUpdateRequest, BeneficiaryStatusChangeRequest,
    BeneficiaryResponse, BankVerificationRequest, BankVerificationResponse,
    UpiVerificationRequest, UpiVerificationResponse,
    BeneficiaryBankAccountResponse, BeneficiaryUpiResponse,
    BeneficiaryServiceConfigResponse, BeneficiaryLimitConfigResponse,
    BeneficiaryRiskProfileResponse, BeneficiaryTimelineResponse,
    Beneficiary360Response, BeneficiaryDashboardMetricsResponse,
    BeneficiarySearchRequest
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_beneficiary_number() -> str:
    """Generate unique beneficiary number: BEN + 8 random alphanumeric chars."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"BEN{suffix}"


def _mask_account_number(acc_num: str) -> str:
    if len(acc_num) <= 4:
        return acc_num
    return "X" * (len(acc_num) - 4) + acc_num[-4:]


def _calculate_name_match_score(name1: str, name2: str) -> float:
    """Calculate SequenceMatcher similarity score between 0.0 and 100.0."""
    if not name1 or not name2:
        return 0.0
    ratio = SequenceMatcher(None, name1.strip().upper(), name2.strip().upper()).ratio()
    return round(ratio * 100.0, 2)


def _to_beneficiary_response(b: BeneficiaryModel) -> BeneficiaryResponse:
    return BeneficiaryResponse(
        public_id=b.public_id,
        beneficiary_number=b.beneficiary_number,
        customer_id=b.customer_id,
        full_name=b.full_name,
        nickname=b.nickname,
        relationship=b.relationship,
        mobile_number=b.mobile_number,
        email=b.email,
        beneficiary_category=b.beneficiary_category,
        beneficiary_type=b.beneficiary_type,
        verification_status=b.verification_status,
        risk_category=b.risk_category,
        beneficiary_status=b.beneficiary_status,
        cooling_period_ends_at=b.cooling_period_ends_at,
        is_favourite=b.is_favourite if b.is_favourite is not None else False,
        registration_date=b.registration_date,
        activation_date=b.activation_date,
    )


class BeneficiaryService:

    # ── Dashboard ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> BeneficiaryDashboardMetricsResponse:
        total = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(BeneficiaryModel.is_active == True))
        active = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.beneficiary_status == "ACTIVE")))
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
        today_regs = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.registration_date >= today_start)))
        pending_ver = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.verification_status == "PENDING")))
        now = _now()
        cooling = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.cooling_period_ends_at > now)))
        blocked = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.beneficiary_status == "BLOCKED")))
        high_risk = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.risk_category == "HIGH")))
        faves = await db.scalar(select(func.count()).select_from(BeneficiaryModel).where(
            and_(BeneficiaryModel.is_active == True, BeneficiaryModel.is_favourite == True)))

        return BeneficiaryDashboardMetricsResponse(
            total_beneficiaries=total or 0,
            today_registrations=today_regs or 0,
            pending_verification=pending_ver or 0,
            cooling_period_active=cooling or 0,
            active_beneficiaries=active or 0,
            blocked_beneficiaries=blocked or 0,
            high_risk_beneficiaries=high_risk or 0,
            favourite_count=faves or 0,
            monthly_growth_pct=0.0,
            category_breakdown={"REGULAR": active or 0},
            status_breakdown={"ACTIVE": active or 0, "BLOCKED": blocked or 0},
        )

    # ── Registration & Management ─────────────────────────────────────────────

    @staticmethod
    async def register_beneficiary(db: AsyncSession, req: BeneficiaryRegisterRequest) -> BeneficiaryResponse:
        # Pre-check & row lock for active duplicate account number + IFSC code for customer
        if req.account_number and req.ifsc_code:
            clean_acc = req.account_number.strip().replace(" ", "")
            clean_ifsc = req.ifsc_code.strip().upper()
            
            stmt_dup = (
                select(BeneficiaryModel, BeneficiaryBankAccountModel)
                .join(BeneficiaryBankAccountModel, BeneficiaryBankAccountModel.beneficiary_id == BeneficiaryModel.public_id)
                .where(
                    and_(
                        BeneficiaryModel.customer_id == req.customer_id,
                        BeneficiaryModel.is_active == True,
                        BeneficiaryModel.beneficiary_status != "MERGED",
                        BeneficiaryBankAccountModel.account_number == clean_acc,
                        BeneficiaryBankAccountModel.ifsc_code == clean_ifsc,
                    )
                )
                .with_for_update()
            )
            existing_dup = (await db.execute(stmt_dup)).first()
            if existing_dup:
                bm, ba = existing_dup[0], existing_dup[1]
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "BENEFICIARY_ALREADY_EXISTS",
                        "message": "This beneficiary is already registered.",
                        "existing_beneficiary": {
                            "beneficiary_id": str(bm.public_id),
                            "account_holder_name": ba.account_holder_name or bm.full_name,
                            "account_number_masked": ba.account_number_masked or f"XXXX-{clean_acc[-4:]}",
                            "bank_name": ba.bank_name,
                            "ifsc_code": ba.ifsc_code,
                            "verification_status": ba.verification_status,
                            "status": bm.beneficiary_status or "ACTIVE"
                        }
                    }
                )

        # Default 24-hour cooling period for new beneficiaries
        cooling_end = _now() + timedelta(hours=24)

        beneficiary = BeneficiaryModel(
            public_id=uuid.uuid4(),
            beneficiary_number=_generate_beneficiary_number(),
            customer_id=req.customer_id,
            full_name=req.full_name,
            nickname=req.nickname,
            relationship=req.relationship,
            mobile_number=req.mobile_number,
            email=req.email,
            dob=req.dob,
            beneficiary_category=req.beneficiary_category,
            beneficiary_type=req.beneficiary_type,
            preferred_language=req.preferred_language or "en",
            remarks=req.remarks,
            verification_status="PENDING",
            risk_category="LOW",
            beneficiary_status="COOLING_PERIOD",
            cooling_period_ends_at=cooling_end,
            is_favourite=False,
            registration_date=_now(),
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
        db.add(beneficiary)
        await db.flush()

        # If Bank account details provided, create bank account record
        if req.account_number and req.ifsc_code:
            bank_acc = BeneficiaryBankAccountModel(
                public_id=uuid.uuid4(),
                beneficiary_id=beneficiary.public_id,
                account_holder_name=req.account_holder_name or req.full_name,
                account_number=req.account_number,
                account_number_masked=_mask_account_number(req.account_number),
                ifsc_code=req.ifsc_code,
                bank_name=req.bank_name or "Partner Bank",
                account_type=req.account_type or "SAVINGS",
                verification_status="UNVERIFIED",
                is_primary=True,
                is_active=True,
                is_deleted=False,
                tenant_id=beneficiary.tenant_id,
                date_key=int(datetime.now().strftime("%Y%m%d")),
                created_by="system",
                created_date=_now(),
                updated_by="system",
                updated_date=_now(),
                version_no=1,
                record_status="ACTIVE",
            )
            db.add(bank_acc)

        # If UPI ID provided, create UPI record
        if req.upi_id:
            upi_rec = BeneficiaryUpiModel(
                public_id=uuid.uuid4(),
                beneficiary_id=beneficiary.public_id,
                upi_id=req.upi_id,
                upi_handle=req.upi_id.split("@")[1] if "@" in req.upi_id else None,
                verification_status="UNVERIFIED",
                is_primary=True,
                is_active=True,
                is_deleted=False,
                tenant_id=beneficiary.tenant_id,
                date_key=int(datetime.now().strftime("%Y%m%d")),
                created_by="system",
                created_date=_now(),
                updated_by="system",
                updated_date=_now(),
                version_no=1,
                record_status="ACTIVE",
            )
            db.add(upi_rec)

        # Timeline event
        timeline = BeneficiaryTimelineModel(
            public_id=uuid.uuid4(),
            beneficiary_id=beneficiary.public_id,
            event_type="REGISTRATION",
            event_title="Beneficiary Registered",
            event_description=f"Beneficiary {beneficiary.beneficiary_number} registered under cooling period until {cooling_end.isoformat()}",
            performed_by="system",
            event_timestamp=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=beneficiary.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(timeline)

        await db.commit()
        await db.refresh(beneficiary)
        return _to_beneficiary_response(beneficiary)

    @staticmethod
    async def list_beneficiaries(db: AsyncSession, req: BeneficiarySearchRequest) -> List[BeneficiaryResponse]:
        # 1. Fetch legacy BeneficiaryModel records
        stmt = select(BeneficiaryModel).where(
            and_(
                BeneficiaryModel.is_active == True,
                BeneficiaryModel.beneficiary_status != "MERGED"
            )
        )
        if req.customer_id:
            stmt = stmt.where(BeneficiaryModel.customer_id == req.customer_id)
        if req.beneficiary_status:
            stmt = stmt.where(BeneficiaryModel.beneficiary_status == req.beneficiary_status)
        if req.beneficiary_category:
            stmt = stmt.where(BeneficiaryModel.beneficiary_category == req.beneficiary_category)
        if req.verification_status:
            stmt = stmt.where(BeneficiaryModel.verification_status == req.verification_status)
        if req.risk_category:
            stmt = stmt.where(BeneficiaryModel.risk_category == req.risk_category)
        if req.query:
            stmt = stmt.where(
                or_(
                    BeneficiaryModel.full_name.ilike(f"%{req.query}%"),
                    BeneficiaryModel.beneficiary_number.ilike(f"%{req.query}%"),
                    BeneficiaryModel.mobile_number.ilike(f"%{req.query}%"),
                )
            )
        stmt = stmt.order_by(BeneficiaryModel.created_date.desc())
        offset = (req.page - 1) * req.page_size
        stmt = stmt.offset(offset).limit(req.page_size)
        result = await db.execute(stmt)
        results = [_to_beneficiary_response(b) for b in result.scalars().all()]

        # 2. Also fetch EPIC-014 Beneficiary Customer Mappings & Master records
        from app.infrastructure.db.epic014_models import BeneficiaryMasterModel, BeneficiaryCustomerMappingModel

        stmt_map = select(BeneficiaryCustomerMappingModel).where(BeneficiaryCustomerMappingModel.is_active == True)
        if req.customer_id:
            stmt_map = stmt_map.where(BeneficiaryCustomerMappingModel.customer_id == req.customer_id)

        mappings = (await db.execute(stmt_map)).scalars().all()
        for mp in mappings:
            stmt_master = select(BeneficiaryMasterModel).where(BeneficiaryMasterModel.public_id == mp.beneficiary_id)
            master = (await db.execute(stmt_master)).scalars().first()
            if master:
                # Avoid duplicates
                if not any(getattr(r, "account_number", None) == master.account_number for r in results):
                    results.append(BeneficiaryResponse(
                        public_id=master.public_id,
                        beneficiary_number=f"BEN-{str(master.public_id)[:6].upper()}",
                        beneficiary_type="INDIVIDUAL",
                        beneficiary_category="RETAIL",
                        title=None,
                        first_name=master.account_holder_name.split()[0] if master.account_holder_name else "Beneficiary",
                        last_name=master.account_holder_name.split()[-1] if master.account_holder_name and len(master.account_holder_name.split()) > 1 else "",
                        full_name=master.registered_name_in_bank or master.account_holder_name,
                        nickname=mp.nickname or f"{master.bank_name} Account",
                        mobile_number="7013914767",
                        email=None,
                        relationship="FAMILY",
                        customer_id=mp.customer_id,
                        tenant_id=master.tenant_id,
                        company_id=master.company_id,
                        verification_status=master.verification_status or "VERIFIED",
                        beneficiary_status="ACTIVE",
                        risk_category="LOW",
                        registration_date=master.created_date or datetime.now(),
                        activation_date=master.created_date or datetime.now(),
                        account_number=master.account_number,
                        masked_account_number=master.account_number_masked,
                        ifsc=master.ifsc_code,
                        bank_name=master.bank_name,
                        branch_name="Main Branch",
                        cooling_period_ends_at=None,
                        is_favourite=False,
                    ))

        return results

    @staticmethod
    async def get_beneficiary(db: AsyncSession, beneficiary_id: uuid.UUID) -> Optional[BeneficiaryResponse]:
        result = await db.execute(select(BeneficiaryModel).where(
            and_(BeneficiaryModel.public_id == beneficiary_id, BeneficiaryModel.is_active == True)))
        b = result.scalar_one_or_none()
        return _to_beneficiary_response(b) if b else None

    @staticmethod
    async def get_beneficiary_360(db: AsyncSession, beneficiary_id: uuid.UUID) -> Optional[Beneficiary360Response]:
        result = await db.execute(select(BeneficiaryModel).where(
            and_(BeneficiaryModel.public_id == beneficiary_id, BeneficiaryModel.is_active == True)))
        b = result.scalar_one_or_none()
        if not b:
            return None

        banks_res = await db.execute(select(BeneficiaryBankAccountModel).where(
            BeneficiaryBankAccountModel.beneficiary_id == beneficiary_id))
        bank_accounts = [BeneficiaryBankAccountResponse(
            public_id=a.public_id, account_holder_name=a.account_holder_name,
            account_number_masked=a.account_number_masked, ifsc_code=a.ifsc_code,
            bank_name=a.bank_name, branch_name=a.branch_name, account_type=a.account_type,
            verification_status=a.verification_status, is_primary=a.is_primary
        ) for a in banks_res.scalars().all()]

        upis_res = await db.execute(select(BeneficiaryUpiModel).where(
            BeneficiaryUpiModel.beneficiary_id == beneficiary_id))
        upis = [BeneficiaryUpiResponse(
            public_id=u.public_id, upi_id=u.upi_id, provider_app=u.provider_app,
            registered_name=u.registered_name, verification_status=u.verification_status,
            is_primary=u.is_primary
        ) for u in upis_res.scalars().all()]

        verif_res = await db.execute(select(BeneficiaryVerificationModel).where(
            BeneficiaryVerificationModel.beneficiary_id == beneficiary_id))
        verifications = [BankVerificationResponse(
            verification_id=v.public_id, verification_status=v.verification_status,
            penny_drop_ref=v.penny_drop_ref, name_returned_by_bank=v.name_returned_by_bank,
            name_match_score=v.name_match_score or 0.0, is_name_matched=v.is_name_matched,
            failure_reason=v.failure_reason
        ) for v in verif_res.scalars().all()]

        risk_res = await db.execute(select(BeneficiaryRiskProfileModel).where(
            BeneficiaryRiskProfileModel.beneficiary_id == beneficiary_id))
        risk_obj = risk_res.scalar_one_or_none()
        risk_profile = BeneficiaryRiskProfileResponse(
            public_id=risk_obj.public_id, beneficiary_id=risk_obj.beneficiary_id,
            risk_score=risk_obj.risk_score, risk_category=risk_obj.risk_category,
            aml_screening=risk_obj.aml_screening, pep_screening=risk_obj.pep_screening,
            sanction_match=risk_obj.sanction_match, watch_list_match=risk_obj.watch_list_match,
        ) if risk_obj else None

        tl_res = await db.execute(select(BeneficiaryTimelineModel).where(
            BeneficiaryTimelineModel.beneficiary_id == beneficiary_id).order_by(BeneficiaryTimelineModel.event_timestamp.desc()).limit(50))
        timeline = [BeneficiaryTimelineResponse(
            public_id=t.public_id, event_type=t.event_type, event_title=t.event_title,
            event_description=t.event_description, performed_by=t.performed_by,
            event_timestamp=t.event_timestamp
        ) for t in tl_res.scalars().all()]

        return Beneficiary360Response(
            beneficiary=_to_beneficiary_response(b),
            bank_accounts=bank_accounts,
            upis=upis,
            verifications=verifications,
            risk_profile=risk_profile,
            timeline=timeline,
        )

    # ── Bank Verification / Penny Drop ────────────────────────────────────────

    @staticmethod
    async def verify_bank_account(db: AsyncSession, beneficiary_id: uuid.UUID, req: BankVerificationRequest) -> BankVerificationResponse:
        result = await db.execute(select(BeneficiaryModel).where(
            and_(BeneficiaryModel.public_id == beneficiary_id, BeneficiaryModel.is_active == True)))
        b = result.scalar_one_or_none()
        if not b:
            raise ValueError("Beneficiary not found")

        # Simulated Penny Drop API response from Acquire Bank Engine
        penny_ref = f"PD{int(_now().timestamp())}"
        returned_name = req.account_holder_name.upper()  # Bank returns name match
        match_score = _calculate_name_match_score(req.account_holder_name, b.full_name)
        is_matched = match_score >= 80.0

        verif_status = "VERIFIED" if is_matched else "NAME_MISMATCH"

        verif = BeneficiaryVerificationModel(
            public_id=uuid.uuid4(),
            beneficiary_id=beneficiary_id,
            verification_type="PENNY_DROP",
            verification_status=verif_status,
            penny_drop_ref=penny_ref,
            bank_response_code="00",
            name_returned_by_bank=returned_name,
            name_match_score=match_score,
            is_name_matched=is_matched,
            verified_by="system",
            verified_at=_now(),
            failure_reason=None if is_matched else f"Name match score {match_score}% is below threshold 80%",
            is_active=True,
            is_deleted=False,
            tenant_id=b.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(verif)

        # Update beneficiary verification status
        b.verification_status = verif_status
        if is_matched and b.beneficiary_status == "DRAFT":
            b.beneficiary_status = "ACTIVE"
            b.activation_date = _now()
        b.updated_date = _now()

        # Update or add Bank Account
        bank_res = await db.execute(select(BeneficiaryBankAccountModel).where(
            and_(BeneficiaryBankAccountModel.beneficiary_id == beneficiary_id, BeneficiaryBankAccountModel.account_number == req.account_number)))
        acc = bank_res.scalar_one_or_none()
        if acc:
            acc.verification_status = verif_status
            acc.verification_reference = penny_ref
            acc.verification_date = _now()
            acc.penny_drop_status = "SUCCESS"
            acc.name_match_score = match_score
            acc.registered_name_in_bank = returned_name

        await db.commit()
        await db.refresh(verif)

        return BankVerificationResponse(
            verification_id=verif.public_id,
            verification_status=verif_status,
            penny_drop_ref=penny_ref,
            name_returned_by_bank=returned_name,
            name_match_score=match_score,
            is_name_matched=is_matched,
            failure_reason=verif.failure_reason,
        )

    # ── UPI Verification ──────────────────────────────────────────────────────

    @staticmethod
    async def verify_upi_id(db: AsyncSession, beneficiary_id: uuid.UUID, req: UpiVerificationRequest) -> UpiVerificationResponse:
        result = await db.execute(select(BeneficiaryModel).where(
            and_(BeneficiaryModel.public_id == beneficiary_id, BeneficiaryModel.is_active == True)))
        b = result.scalar_one_or_none()
        if not b:
            raise ValueError("Beneficiary not found")

        upi_res = await db.execute(select(BeneficiaryUpiModel).where(
            and_(BeneficiaryUpiModel.beneficiary_id == beneficiary_id, BeneficiaryUpiModel.upi_id == req.upi_id)))
        upi = upi_res.scalar_one_or_none()
        if not upi:
            upi = BeneficiaryUpiModel(
                public_id=uuid.uuid4(),
                beneficiary_id=beneficiary_id,
                upi_id=req.upi_id,
                upi_handle=req.upi_id.split("@")[1] if "@" in req.upi_id else None,
                provider_app=req.provider_app,
                registered_name=b.full_name,
                verification_status="VERIFIED",
                verification_reference=f"UPI{int(_now().timestamp())}",
                is_primary=True,
                is_active=True,
                is_deleted=False,
                tenant_id=b.tenant_id,
                date_key=int(datetime.now().strftime("%Y%m%d")),
                created_by="system",
                created_date=_now(),
                updated_by="system",
                updated_date=_now(),
                version_no=1,
                record_status="ACTIVE",
            )
            db.add(upi)
        else:
            upi.verification_status = "VERIFIED"
            upi.registered_name = b.full_name

        await db.commit()
        await db.refresh(upi)

        return UpiVerificationResponse(
            verification_id=upi.public_id,
            upi_id=upi.upi_id,
            registered_name=upi.registered_name,
            verification_status="VERIFIED",
        )

    # ── Status Change ─────────────────────────────────────────────────────────

    @staticmethod
    async def update_status(db: AsyncSession, beneficiary_id: uuid.UUID, req: BeneficiaryStatusChangeRequest) -> BeneficiaryResponse:
        result = await db.execute(select(BeneficiaryModel).where(
            and_(BeneficiaryModel.public_id == beneficiary_id, BeneficiaryModel.is_active == True)))
        b = result.scalar_one_or_none()
        if not b:
            raise ValueError("Beneficiary not found")

        old_status = b.beneficiary_status
        b.beneficiary_status = req.to_status
        b.updated_date = _now()

        history = BeneficiaryStatusHistoryModel(
            public_id=uuid.uuid4(),
            beneficiary_id=beneficiary_id,
            from_status=old_status,
            to_status=req.to_status,
            reason=req.reason,
            changed_by="system",
            effective_date=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=b.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(history)

        await db.commit()
        await db.refresh(b)
        return _to_beneficiary_response(b)
