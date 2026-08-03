"""EPIC-021 — Customer Lifecycle, KYC & Service Eligibility — Service Layer"""
import uuid
import random
import string
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_

from app.infrastructure.db.customer_models import (
    CustomerModel, CustomerProfileModel, CustomerAddressModel,
    CustomerIdentityModel, CustomerKycModel, CustomerDocumentModel,
    CustomerServiceModel, CustomerServiceConfigurationModel,
    CustomerLimitConfigurationModel, CustomerLimitOverrideModel,
    CustomerRiskProfileModel, CustomerStatusHistoryModel,
    CustomerRelationshipModel, CustomerTimelineModel,
    CustomerBlacklistModel, CustomerWhitelistModel,
)
from app.application.customer_dtos import (
    CustomerRegisterRequest, CustomerUpdateRequest, CustomerStatusChangeRequest,
    CustomerResponse, CustomerAddressRequest, CustomerAddressResponse,
    CustomerIdentityRequest, CustomerIdentityResponse,
    CustomerKycSubmitRequest, CustomerKycReviewRequest, CustomerKycResponse,
    CustomerDocumentUploadRequest, CustomerDocumentResponse,
    CustomerServiceResponse, ServiceToggleRequest,
    ServiceConfigRequest, ServiceConfigResponse,
    CustomerLimitConfigRequest, CustomerLimitConfigResponse,
    CustomerLimitOverrideRequest, CustomerRiskProfileResponse,
    CustomerRiskUpdateRequest, CustomerRelationshipRequest, CustomerRelationshipResponse,
    CustomerTimelineResponse, CustomerBlacklistRequest, CustomerBlacklistResponse,
    CustomerWhitelistRequest, CustomerDashboardMetricsResponse,
    CustomerSearchRequest, Customer360Response,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_customer_number() -> str:
    """Generate unique customer number: CUS + 8 random alphanumeric chars."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"CUS{suffix}"


def _to_customer_response(c: CustomerModel) -> CustomerResponse:
    return CustomerResponse(
        public_id=c.public_id,
        customer_number=c.customer_number,
        customer_category=c.customer_category,
        customer_type=c.customer_type,
        full_name=c.full_name,
        mobile_number=c.mobile_number,
        email=c.email,
        dob=c.dob,
        gender=c.gender,
        nationality=c.nationality,
        kyc_level=c.kyc_level,
        kyc_status=c.kyc_status,
        risk_category=c.risk_category,
        customer_status=c.customer_status,
        registration_date=c.registration_date,
        activation_date=c.activation_date,
        created_date=c.created_date,
    )


class CustomerService:

    # ── Dashboard ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> CustomerDashboardMetricsResponse:
        total = await db.scalar(select(func.count()).select_from(CustomerModel).where(CustomerModel.is_active == True))
        active = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.customer_status == "ACTIVE")))
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
        today_regs = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.registration_date >= today_start)))
        pending_kyc = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.kyc_status == "PENDING_KYC")))
        rejected_kyc = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.kyc_status == "REJECTED")))
        blocked = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.customer_status == "BLOCKED")))
        high_risk = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.risk_category == "HIGH")))
        inactive = await db.scalar(select(func.count()).select_from(CustomerModel).where(
            and_(CustomerModel.is_active == True, CustomerModel.customer_status == "INACTIVE")))

        return CustomerDashboardMetricsResponse(
            total_customers=total or 0,
            active_customers=active or 0,
            today_registrations=today_regs or 0,
            pending_kyc=pending_kyc or 0,
            rejected_kyc=rejected_kyc or 0,
            blocked_customers=blocked or 0,
            high_risk_customers=high_risk or 0,
            inactive_customers=inactive or 0,
            monthly_growth_pct=0.0,
            category_breakdown={"REGULAR": active or 0},
            status_breakdown={"ACTIVE": active or 0, "BLOCKED": blocked or 0},
            kyc_level_breakdown={"MINIMUM_KYC": pending_kyc or 0},
        )

    # ── Customer Registration ─────────────────────────────────────────────────

    @staticmethod
    async def register_customer(db: AsyncSession, req: CustomerRegisterRequest) -> CustomerResponse:
        full_name = f"{req.first_name} {req.middle_name + ' ' if req.middle_name else ''}{req.last_name}".strip()
        customer = CustomerModel(
            public_id=uuid.uuid4(),
            customer_number=_generate_customer_number(),
            customer_category=req.customer_category,
            customer_type=req.customer_type,
            first_name=req.first_name,
            middle_name=req.middle_name,
            last_name=req.last_name,
            full_name=full_name,
            mobile_number=req.mobile_number,
            email=req.email,
            dob=req.dob,
            gender=req.gender,
            nationality=req.nationality,
            occupation=req.occupation,
            preferred_language=req.preferred_language or "en",
            preferred_channel=req.preferred_channel or "SMS",
            referral_code=req.referral_code,
            introduced_by_retailer_id=req.introduced_by_retailer_id,
            kyc_level="MINIMUM_KYC",
            kyc_status="PENDING_KYC",
            risk_category="LOW",
            customer_status="DRAFT",
            registration_date=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=uuid.uuid4(),  # placeholder — use auth context in production
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        return _to_customer_response(customer)

    @staticmethod
    async def list_customers(db: AsyncSession, req: CustomerSearchRequest) -> List[CustomerResponse]:
        stmt = select(CustomerModel).where(CustomerModel.is_active == True)
        if req.mobile_number:
            stmt = stmt.where(CustomerModel.mobile_number == req.mobile_number)
        if req.customer_status:
            stmt = stmt.where(CustomerModel.customer_status == req.customer_status)
        if req.customer_category:
            stmt = stmt.where(CustomerModel.customer_category == req.customer_category)
        if req.kyc_status:
            stmt = stmt.where(CustomerModel.kyc_status == req.kyc_status)
        if req.kyc_level:
            stmt = stmt.where(CustomerModel.kyc_level == req.kyc_level)
        if req.risk_category:
            stmt = stmt.where(CustomerModel.risk_category == req.risk_category)
        if req.query:
            stmt = stmt.where(
                or_(
                    CustomerModel.full_name.ilike(f"%{req.query}%"),
                    CustomerModel.customer_number.ilike(f"%{req.query}%"),
                    CustomerModel.mobile_number.ilike(f"%{req.query}%"),
                )
            )
        stmt = stmt.order_by(CustomerModel.created_date.desc())
        offset = (req.page - 1) * req.page_size
        stmt = stmt.offset(offset).limit(req.page_size)
        result = await db.execute(stmt)
        return [_to_customer_response(c) for c in result.scalars().all()]

    @staticmethod
    async def get_customer(db: AsyncSession, customer_id: uuid.UUID) -> Optional[CustomerResponse]:
        result = await db.execute(select(CustomerModel).where(
            and_(CustomerModel.public_id == customer_id, CustomerModel.is_active == True)))
        c = result.scalar_one_or_none()
        return _to_customer_response(c) if c else None

    @staticmethod
    async def get_customer_360(db: AsyncSession, customer_id: uuid.UUID) -> Optional[Customer360Response]:
        result = await db.execute(select(CustomerModel).where(
            and_(CustomerModel.public_id == customer_id, CustomerModel.is_active == True)))
        c = result.scalar_one_or_none()
        if not c:
            return None

        addr_result = await db.execute(select(CustomerAddressModel).where(CustomerAddressModel.customer_id == customer_id))
        addresses = [CustomerAddressResponse(
            public_id=a.public_id, address_type=a.address_type, address_line1=a.address_line1,
            address_line2=a.address_line2, city=a.city, district=a.district,
            state=a.state, pin_code=a.pin_code, country=a.country,
            is_primary=a.is_primary, is_verified=a.is_verified
        ) for a in addr_result.scalars().all()]

        id_result = await db.execute(select(CustomerIdentityModel).where(CustomerIdentityModel.customer_id == customer_id))
        identities = [CustomerIdentityResponse(
            public_id=i.public_id, identity_type=i.identity_type,
            identity_number_masked=i.identity_number_masked,
            verification_status=i.verification_status, verified_at=i.verified_at,
            is_primary=i.is_primary, expiry_date=i.expiry_date
        ) for i in id_result.scalars().all()]

        kyc_result = await db.execute(select(CustomerKycModel).where(
            CustomerKycModel.customer_id == customer_id).order_by(CustomerKycModel.created_date.desc()).limit(1))
        kyc_obj = kyc_result.scalar_one_or_none()
        kyc = CustomerKycResponse(
            public_id=kyc_obj.public_id, customer_id=kyc_obj.customer_id,
            kyc_level=kyc_obj.kyc_level, kyc_type=kyc_obj.kyc_type, kyc_status=kyc_obj.kyc_status,
            submission_date=kyc_obj.submission_date, completed_at=kyc_obj.completed_at,
            reviewed_by=kyc_obj.reviewed_by, rejection_reason=kyc_obj.rejection_reason,
            face_match_score=kyc_obj.face_match_score, liveness_score=kyc_obj.liveness_score,
            aadhaar_verified=kyc_obj.aadhaar_verified, pan_verified=kyc_obj.pan_verified,
            bank_verified=kyc_obj.bank_verified, ckyc_verified=kyc_obj.ckyc_verified,
            kyc_expiry_date=kyc_obj.kyc_expiry_date,
        ) if kyc_obj else None

        doc_result = await db.execute(select(CustomerDocumentModel).where(
            and_(CustomerDocumentModel.customer_id == customer_id, CustomerDocumentModel.is_current == True)))
        documents = [CustomerDocumentResponse(
            public_id=d.public_id, document_type=d.document_type, document_name=d.document_name,
            file_url=d.file_url, document_number=d.document_number, expiry_date=d.expiry_date,
            verification_status=d.verification_status, is_current=d.is_current, version_number=d.version_number
        ) for d in doc_result.scalars().all()]

        svc_result = await db.execute(select(CustomerServiceModel).where(CustomerServiceModel.customer_id == customer_id))
        services = [CustomerServiceResponse(
            public_id=s.public_id, service_code=s.service_code, service_name=s.service_name,
            is_enabled=s.is_enabled, eligibility_status=s.eligibility_status,
            eligibility_reason=s.eligibility_reason, enabled_at=s.enabled_at, last_used_at=s.last_used_at
        ) for s in svc_result.scalars().all()]

        risk_result = await db.execute(select(CustomerRiskProfileModel).where(CustomerRiskProfileModel.customer_id == customer_id))
        risk_obj = risk_result.scalar_one_or_none()
        risk = CustomerRiskProfileResponse(
            public_id=risk_obj.public_id, customer_id=risk_obj.customer_id,
            risk_score=risk_obj.risk_score, risk_category=risk_obj.risk_category,
            aml_level=risk_obj.aml_level, is_pep=risk_obj.is_pep,
            sanction_check_result=risk_obj.sanction_check_result,
            watch_list_match=risk_obj.watch_list_match,
            geo_risk_score=risk_obj.geo_risk_score,
            behaviour_risk_score=risk_obj.behaviour_risk_score,
            velocity_risk_score=risk_obj.velocity_risk_score,
            last_reviewed_at=risk_obj.last_reviewed_at,
            next_review_date=risk_obj.next_review_date,
        ) if risk_obj else None

        rel_result = await db.execute(select(CustomerRelationshipModel).where(
            and_(CustomerRelationshipModel.customer_id == customer_id, CustomerRelationshipModel.is_active_rel == True)))
        relationships = [CustomerRelationshipResponse(
            public_id=r.public_id, relation_type=r.relation_type, related_name=r.related_name,
            related_mobile=r.related_mobile, is_primary=r.is_primary, is_active_rel=r.is_active_rel
        ) for r in rel_result.scalars().all()]

        tl_result = await db.execute(select(CustomerTimelineModel).where(
            CustomerTimelineModel.customer_id == customer_id).order_by(CustomerTimelineModel.event_timestamp.desc()).limit(50))
        timeline = [CustomerTimelineResponse(
            public_id=t.public_id, event_type=t.event_type, event_code=t.event_code,
            event_title=t.event_title, event_description=t.event_description,
            performed_by=t.performed_by, event_timestamp=t.event_timestamp
        ) for t in tl_result.scalars().all()]

        return Customer360Response(
            customer=_to_customer_response(c),
            addresses=addresses,
            identities=identities,
            kyc=kyc,
            documents=documents,
            services=services,
            risk_profile=risk,
            relationships=relationships,
            timeline=timeline,
        )

    @staticmethod
    async def update_customer_status(db: AsyncSession, customer_id: uuid.UUID, req: CustomerStatusChangeRequest) -> CustomerResponse:
        result = await db.execute(select(CustomerModel).where(
            and_(CustomerModel.public_id == customer_id, CustomerModel.is_active == True)))
        c = result.scalar_one_or_none()
        if not c:
            raise ValueError("Customer not found")
        old_status = c.customer_status
        c.customer_status = req.to_status
        c.updated_date = _now()
        c.updated_by = "system"
        history = CustomerStatusHistoryModel(
            public_id=uuid.uuid4(),
            customer_id=customer_id,
            from_status=old_status,
            to_status=req.to_status,
            reason=req.reason,
            reason_code=req.reason_code,
            remarks=req.remarks,
            effective_date=_now(),
            is_active=True,
            is_deleted=False,
            tenant_id=c.tenant_id,
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
        await db.refresh(c)
        return _to_customer_response(c)

    # ── KYC ───────────────────────────────────────────────────────────────────

    @staticmethod
    async def submit_kyc(db: AsyncSession, customer_id: uuid.UUID, req: CustomerKycSubmitRequest) -> CustomerKycResponse:
        result = await db.execute(select(CustomerModel).where(
            and_(CustomerModel.public_id == customer_id, CustomerModel.is_active == True)))
        c = result.scalar_one_or_none()
        if not c:
            raise ValueError("Customer not found")
        kyc = CustomerKycModel(
            public_id=uuid.uuid4(),
            customer_id=customer_id,
            kyc_level=req.kyc_level,
            kyc_type=req.kyc_type,
            kyc_status="SUBMITTED",
            submission_date=_now(),
            remarks=req.remarks,
            aadhaar_verified=False,
            pan_verified=False,
            bank_verified=False,
            ckyc_verified=False,
            is_active=True,
            is_deleted=False,
            tenant_id=c.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        c.kyc_status = "UNDER_REVIEW"
        c.updated_date = _now()
        db.add(kyc)
        await db.commit()
        await db.refresh(kyc)
        return CustomerKycResponse(
            public_id=kyc.public_id, customer_id=kyc.customer_id,
            kyc_level=kyc.kyc_level, kyc_type=kyc.kyc_type, kyc_status=kyc.kyc_status,
            submission_date=kyc.submission_date, completed_at=kyc.completed_at,
            reviewed_by=kyc.reviewed_by, rejection_reason=kyc.rejection_reason,
            face_match_score=kyc.face_match_score, liveness_score=kyc.liveness_score,
            aadhaar_verified=kyc.aadhaar_verified, pan_verified=kyc.pan_verified,
            bank_verified=kyc.bank_verified, ckyc_verified=kyc.ckyc_verified,
            kyc_expiry_date=kyc.kyc_expiry_date,
        )

    @staticmethod
    async def list_kyc_queue(db: AsyncSession, kyc_status: Optional[str] = None) -> List[CustomerKycResponse]:
        stmt = select(CustomerKycModel).where(CustomerKycModel.is_active == True)
        if kyc_status:
            stmt = stmt.where(CustomerKycModel.kyc_status == kyc_status)
        stmt = stmt.order_by(CustomerKycModel.submission_date.asc())
        result = await db.execute(stmt)
        return [CustomerKycResponse(
            public_id=k.public_id, customer_id=k.customer_id,
            kyc_level=k.kyc_level, kyc_type=k.kyc_type, kyc_status=k.kyc_status,
            submission_date=k.submission_date, completed_at=k.completed_at,
            reviewed_by=k.reviewed_by, rejection_reason=k.rejection_reason,
            face_match_score=k.face_match_score, liveness_score=k.liveness_score,
            aadhaar_verified=k.aadhaar_verified, pan_verified=k.pan_verified,
            bank_verified=k.bank_verified, ckyc_verified=k.ckyc_verified,
            kyc_expiry_date=k.kyc_expiry_date,
        ) for k in result.scalars().all()]

    # ── Document ──────────────────────────────────────────────────────────────

    @staticmethod
    async def upload_document(db: AsyncSession, customer_id: uuid.UUID, req: CustomerDocumentUploadRequest) -> CustomerDocumentResponse:
        result = await db.execute(select(CustomerModel).where(
            and_(CustomerModel.public_id == customer_id, CustomerModel.is_active == True)))
        c = result.scalar_one_or_none()
        if not c:
            raise ValueError("Customer not found")
        doc = CustomerDocumentModel(
            public_id=uuid.uuid4(),
            customer_id=customer_id,
            document_type=req.document_type,
            document_name=req.document_name,
            file_url=req.file_url,
            document_number=req.document_number,
            issue_date=req.issue_date,
            expiry_date=req.expiry_date,
            is_encrypted=False,
            version_number=1,
            verification_status="PENDING",
            is_current=True,
            is_active=True,
            is_deleted=False,
            tenant_id=c.tenant_id,
            date_key=int(datetime.now().strftime("%Y%m%d")),
            created_by="system",
            created_date=_now(),
            updated_by="system",
            updated_date=_now(),
            version_no=1,
            record_status="ACTIVE",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return CustomerDocumentResponse(
            public_id=doc.public_id, document_type=doc.document_type, document_name=doc.document_name,
            file_url=doc.file_url, document_number=doc.document_number, expiry_date=doc.expiry_date,
            verification_status=doc.verification_status, is_current=doc.is_current,
            version_number=doc.version_number,
        )

    @staticmethod
    async def list_documents(db: AsyncSession, customer_id: uuid.UUID) -> List[CustomerDocumentResponse]:
        result = await db.execute(select(CustomerDocumentModel).where(
            and_(CustomerDocumentModel.customer_id == customer_id, CustomerDocumentModel.is_active == True)))
        return [CustomerDocumentResponse(
            public_id=d.public_id, document_type=d.document_type, document_name=d.document_name,
            file_url=d.file_url, document_number=d.document_number, expiry_date=d.expiry_date,
            verification_status=d.verification_status, is_current=d.is_current, version_number=d.version_number
        ) for d in result.scalars().all()]

    # ── Service Eligibility ───────────────────────────────────────────────────

    @staticmethod
    async def list_customer_services(db: AsyncSession, customer_id: uuid.UUID) -> List[CustomerServiceResponse]:
        result = await db.execute(select(CustomerServiceModel).where(
            CustomerServiceModel.customer_id == customer_id))
        return [CustomerServiceResponse(
            public_id=s.public_id, service_code=s.service_code, service_name=s.service_name,
            is_enabled=s.is_enabled, eligibility_status=s.eligibility_status,
            eligibility_reason=s.eligibility_reason, enabled_at=s.enabled_at, last_used_at=s.last_used_at
        ) for s in result.scalars().all()]

    @staticmethod
    async def list_service_configs(db: AsyncSession) -> List[ServiceConfigResponse]:
        result = await db.execute(select(CustomerServiceConfigurationModel).where(
            CustomerServiceConfigurationModel.is_active == True))
        return [ServiceConfigResponse(
            public_id=s.public_id, service_code=s.service_code, service_name=s.service_name,
            is_enabled=s.is_enabled, requires_full_kyc=s.requires_full_kyc,
            minimum_kyc_level=s.minimum_kyc_level, minimum_age=s.minimum_age,
            maximum_age=s.maximum_age, cooling_period_days=s.cooling_period_days,
            max_beneficiaries=s.max_beneficiaries, config_status=s.config_status
        ) for s in result.scalars().all()]

    @staticmethod
    async def create_service_config(db: AsyncSession, req: ServiceConfigRequest) -> ServiceConfigResponse:
        config = CustomerServiceConfigurationModel(
            public_id=uuid.uuid4(),
            service_code=req.service_code,
            service_name=req.service_name,
            is_enabled=req.is_enabled,
            requires_full_kyc=req.requires_full_kyc,
            minimum_kyc_level=req.minimum_kyc_level,
            minimum_age=req.minimum_age,
            maximum_age=req.maximum_age,
            cooling_period_days=req.cooling_period_days,
            max_beneficiaries=req.max_beneficiaries,
            requires_approval=req.requires_approval,
            risk_validation_enabled=req.risk_validation_enabled,
            config_status="ACTIVE",
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
        db.add(config)
        await db.commit()
        await db.refresh(config)
        return ServiceConfigResponse(
            public_id=config.public_id, service_code=config.service_code, service_name=config.service_name,
            is_enabled=config.is_enabled, requires_full_kyc=config.requires_full_kyc,
            minimum_kyc_level=config.minimum_kyc_level, minimum_age=config.minimum_age,
            maximum_age=config.maximum_age, cooling_period_days=config.cooling_period_days,
            max_beneficiaries=config.max_beneficiaries, config_status=config.config_status
        )

    # ── Limits ────────────────────────────────────────────────────────────────

    @staticmethod
    async def list_limit_configs(db: AsyncSession, service_code: Optional[str] = None) -> List[CustomerLimitConfigResponse]:
        stmt = select(CustomerLimitConfigurationModel).where(CustomerLimitConfigurationModel.is_active == True)
        if service_code:
            stmt = stmt.where(CustomerLimitConfigurationModel.service_code == service_code)
        result = await db.execute(stmt)
        return [CustomerLimitConfigResponse(
            public_id=l.public_id, service_code=l.service_code, hierarchy_level=l.hierarchy_level,
            customer_category=l.customer_category, kyc_level=l.kyc_level,
            single_txn_max=l.single_txn_max, daily_amount=l.daily_amount,
            monthly_amount=l.monthly_amount, yearly_amount=l.yearly_amount,
            override_allowed=l.override_allowed, effective_from=l.effective_from,
            effective_to=l.effective_to, limit_status=l.limit_status
        ) for l in result.scalars().all()]

    @staticmethod
    async def create_limit_config(db: AsyncSession, req: CustomerLimitConfigRequest) -> CustomerLimitConfigResponse:
        config = CustomerLimitConfigurationModel(
            public_id=uuid.uuid4(),
            service_code=req.service_code,
            hierarchy_level=req.hierarchy_level,
            customer_category=req.customer_category,
            kyc_level=req.kyc_level,
            single_txn_min=req.single_txn_min,
            single_txn_max=req.single_txn_max,
            daily_txn_count=req.daily_txn_count,
            daily_amount=req.daily_amount,
            weekly_amount=req.weekly_amount,
            monthly_txn_count=req.monthly_txn_count,
            monthly_amount=req.monthly_amount,
            quarterly_amount=req.quarterly_amount,
            yearly_amount=req.yearly_amount,
            max_outstanding=req.max_outstanding,
            max_failed_attempts=req.max_failed_attempts,
            max_beneficiaries=req.max_beneficiaries,
            cooling_period_hours=req.cooling_period_hours,
            override_allowed=req.override_allowed,
            effective_from=req.effective_from,
            effective_to=req.effective_to,
            limit_status="ACTIVE",
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
        db.add(config)
        await db.commit()
        await db.refresh(config)
        return CustomerLimitConfigResponse(
            public_id=config.public_id, service_code=config.service_code,
            hierarchy_level=config.hierarchy_level, customer_category=config.customer_category,
            kyc_level=config.kyc_level, single_txn_max=config.single_txn_max,
            daily_amount=config.daily_amount, monthly_amount=config.monthly_amount,
            yearly_amount=config.yearly_amount, override_allowed=config.override_allowed,
            effective_from=config.effective_from, effective_to=config.effective_to,
            limit_status=config.limit_status
        )

    # ── Risk ──────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_risk_profile(db: AsyncSession, customer_id: uuid.UUID) -> Optional[CustomerRiskProfileResponse]:
        result = await db.execute(select(CustomerRiskProfileModel).where(
            CustomerRiskProfileModel.customer_id == customer_id))
        r = result.scalar_one_or_none()
        if not r:
            return None
        return CustomerRiskProfileResponse(
            public_id=r.public_id, customer_id=r.customer_id,
            risk_score=r.risk_score, risk_category=r.risk_category,
            aml_level=r.aml_level, is_pep=r.is_pep,
            sanction_check_result=r.sanction_check_result,
            watch_list_match=r.watch_list_match,
            geo_risk_score=r.geo_risk_score,
            behaviour_risk_score=r.behaviour_risk_score,
            velocity_risk_score=r.velocity_risk_score,
            last_reviewed_at=r.last_reviewed_at,
            next_review_date=r.next_review_date,
        )

    # ── Blacklist ─────────────────────────────────────────────────────────────

    @staticmethod
    async def list_blacklist(db: AsyncSession, status: Optional[str] = None) -> List[CustomerBlacklistResponse]:
        stmt = select(CustomerBlacklistModel).where(CustomerBlacklistModel.is_active == True)
        if status:
            stmt = stmt.where(CustomerBlacklistModel.blacklist_status == status)
        result = await db.execute(stmt)
        return [CustomerBlacklistResponse(
            public_id=b.public_id, blacklist_type=b.blacklist_type,
            mobile_number=b.mobile_number, identity_type=b.identity_type,
            reason=b.reason, is_permanent=b.is_permanent,
            blacklist_date=b.blacklist_date, blacklist_status=b.blacklist_status
        ) for b in result.scalars().all()]

    @staticmethod
    async def add_to_blacklist(db: AsyncSession, req: CustomerBlacklistRequest) -> CustomerBlacklistResponse:
        entry = CustomerBlacklistModel(
            public_id=uuid.uuid4(),
            blacklist_type=req.blacklist_type,
            identity_type=req.identity_type,
            identity_value=req.identity_value,
            mobile_number=req.mobile_number,
            reason=req.reason,
            reason_code=req.reason_code,
            blacklist_date=_now(),
            expiry_date=req.expiry_date,
            is_permanent=req.is_permanent,
            source_system=req.source_system,
            blacklist_status="ACTIVE",
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
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return CustomerBlacklistResponse(
            public_id=entry.public_id, blacklist_type=entry.blacklist_type,
            mobile_number=entry.mobile_number, identity_type=entry.identity_type,
            reason=entry.reason, is_permanent=entry.is_permanent,
            blacklist_date=entry.blacklist_date, blacklist_status=entry.blacklist_status
        )

    # ── Timeline ──────────────────────────────────────────────────────────────

    @staticmethod
    async def get_timeline(db: AsyncSession, customer_id: uuid.UUID) -> List[CustomerTimelineResponse]:
        result = await db.execute(select(CustomerTimelineModel).where(
            CustomerTimelineModel.customer_id == customer_id
        ).order_by(CustomerTimelineModel.event_timestamp.desc()).limit(100))
        return [CustomerTimelineResponse(
            public_id=t.public_id, event_type=t.event_type, event_code=t.event_code,
            event_title=t.event_title, event_description=t.event_description,
            performed_by=t.performed_by, event_timestamp=t.event_timestamp
        ) for t in result.scalars().all()]
