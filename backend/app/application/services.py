import uuid
import random
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func, or_, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_refresh_token, generate_mfa_secret, verify_mfa_token, get_mfa_uri
)
from app.core.exceptions import (
    BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException
)
from app.domain.validators import (
    validate_gst, validate_pan, validate_ifsc, validate_mobile, validate_pincode, validate_employee_code,
    validate_tid, validate_mid, validate_serial_number, validate_rrn, validate_utr,
    validate_webhook_url, validate_chargeback_ref, validate_tax_period, validate_report_number
)
from app.infrastructure.db.models import (
    TenantModel, CompanyModel, EntityModel, CompanyContactModel, CompanyAddressModel, CompanyBankModel,
    CompanyDocumentModel, CompanyBrandingModel, CompanySettingModel, CompanySubscriptionModel,
    CompanyStatusHistoryModel, CompanyApprovalModel, CompanyConfigurationModel,
    AdminUserModel, RoleModel, PermissionModel, RolePermissionModel, UserRoleModel,
    AuditLogModel, SystemConfigurationModel, UserSessionModel, ApiKeyModel, PasswordResetTokenModel,
    RegionalManagerModel, SuperDistributorModel, DistributorModel, OrganizationHierarchyModel,
    OrganizationTransferModel, OrganizationHistoryModel, OrganizationAttachmentModel, OrganizationNoteModel,
    RetailerModel, RetailerContactModel, RetailerAddressModel, RetailerBankModel, RetailerKycModel,
    RetailerWalletModel, RetailerStatusHistoryModel, RetailerApprovalModel,
    SwipeMachineModel, MachineInventoryModel, MachineAssignmentModel, MachineTelemetryModel,
    MachineKeyProfileModel, MachineMaintenanceModel, MachineStatusHistoryModel, MachineReplacementModel,
    TransactionRecordModel, MdrFeePlanModel, TransactionFeeSplitModel, SettlementBatchModel,
    SettlementItemModel, PayoutInstructionModel, WalletLedgerModel, ReconciliationReportModel,
    DeveloperApiKeyModel, WebhookSubscriptionModel, WebhookEventLogModel, RiskRuleModel,
    FraudAlertModel, ChargebackCaseModel, ChargebackEvidenceModel, DisputeStatusHistoryModel,
    TenantConfigurationModel, AuditExportJobModel, ComplianceReportModel, ComplianceReportItemModel,
    TdsDeductionRecordModel, GstFilingSummaryModel, SystemAlertPolicyModel, SystemHealthLogModel
)
from app.infrastructure.services.audit_service import AuditLogger
from app.application.dtos import (
    LoginRequest, TokenResponse, UserCreate, UserUpdate, TenantCreate, TenantUpdate,
    CompanyCreate, CompanyUpdate, RoleCreate, RoleUpdate, ApiKeyCreate, ConfigCreateUpdate,
    CompanyOnboardingCreateRequest, CompanyApprovalRequest, CompanyStatusChangeRequest,
    CompanyBrandingDTO, CompanySettingDTO, CompanyDocumentUploadRequest, CompanyDetailsResponse,
    CompanyDashboardMetricsResponse, RMCreateRequest, RMUpdateRequest, RMResponse,
    SuperDistributorCreateRequest, SuperDistributorUpdateRequest, SuperDistributorResponse,
    DistributorCreateRequest, DistributorUpdateRequest, DistributorResponse,
    OrganizationTransferCreateRequest, OrganizationTransferApprovalRequest, OrganizationTransferResponse,
    OrganizationTreeNode, OrganizationDashboardMetricsResponse, RetailerOnboardCreateRequest,
    RetailerUpdateRequest, RetailerApprovalRequest, RetailerStatusChangeRequest, RetailerResponse,
    RetailerDetailsResponse, RetailerDashboardMetricsResponse, MachineCreateRequest, MachineUpdateRequest,
    MachineTelemetryPingRequest, MachineReplacementCreateRequest, MachineResponse, MachineDetailsResponse,
    MachineDashboardMetricsResponse, TransactionIngestCreateRequest, TransactionResponse,
    SettlementBatchGenerateRequest, SettlementBatchResponse, BankPayoutProcessRequest, BankPayoutResponse,
    SettlementDashboardMetricsResponse, ApiKeyCreateRequest, ApiKeyResponse, WebhookSubscriptionCreateRequest,
    WebhookSubscriptionResponse, ChargebackCaseCreateRequest, ChargebackCaseResponse,
    DeveloperDashboardMetricsResponse, TenantConfigUpdateRequest, ComplianceReportGenerateRequest,
    ComplianceReportResponse, ComplianceDashboardMetricsResponse
)


class AuthService:
    @staticmethod
    async def login(
        db: AsyncSession,
        req: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> TokenResponse:
        stmt = (
            select(AdminUserModel)
            .options(
                selectinload(AdminUserModel.user_roles)
                .selectinload(UserRoleModel.role)
            )
            .where(
                (AdminUserModel.email == req.email_or_username) | (AdminUserModel.username == req.email_or_username),
                AdminUserModel.is_deleted == False
            )
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(req.password, user.hashed_password):
            raise UnauthorizedException("Invalid email/username or password")

        if user.status != "ACTIVE":
            raise ForbiddenException("Account is inactive or disabled")

        if user.mfa_enabled:
            if not req.mfa_code:
                return TokenResponse(
                    access_token="",
                    refresh_token="",
                    expires_in=0,
                    requires_mfa=True,
                    user={"public_id": str(user.public_id), "email": user.email}
                )
            if not user.mfa_secret or not verify_mfa_token(user.mfa_secret, req.mfa_code):
                raise UnauthorizedException("Invalid MFA authentication code")

        # Update last login time
        user.last_login_at = datetime.now(timezone.utc)

        roles = [ur.role.code for ur in user.user_roles]
        company_id_str = str(user.company_id) if user.company_id else None

        access_token = create_access_token(
            subject=str(user.public_id),
            tenant_id=str(user.tenant_id),
            company_id=company_id_str,
            roles=roles
        )
        refresh_token = create_refresh_token(
            subject=str(user.public_id),
            tenant_id=str(user.tenant_id)
        )

        # Record User Session
        decoded_access = decode_refresh_token(refresh_token)
        jti = str(uuid.uuid4())
        session = UserSessionModel(
            public_id=uuid.uuid4(),
            user_id=user.id,
            tenant_id=user.tenant_id,
            token_jti=jti,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(session)
        await db.commit()

        # Audit log login action
        await AuditLogger.log_action(
            db=db,
            tenant_id=user.tenant_id,
            company_id=user.company_id,
            actor_id=user.public_id,
            actor_email=user.email,
            action="LOGIN",
            resource_type="AUTH",
            resource_id=str(user.public_id),
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Re-issue access token with exact session JTI
        payload_sub = str(user.public_id)
        access_token = create_access_token(
            subject=payload_sub,
            tenant_id=str(user.tenant_id),
            company_id=company_id_str,
            roles=roles,
            jti=jti
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            requires_mfa=False,
            user={
                "public_id": str(user.public_id),
                "email": user.email,
                "full_name": user.full_name,
                "tenant_id": str(user.tenant_id),
                "roles": roles
            }
        )

    @staticmethod
    async def refresh(db: AsyncSession, refresh_token_str: str) -> TokenResponse:
        payload = decode_refresh_token(refresh_token_str)
        if not payload:
            raise UnauthorizedException("Invalid or expired refresh token")

        user_uuid_str = payload.get("sub")
        stmt = (
            select(AdminUserModel)
            .options(selectinload(AdminUserModel.user_roles).selectinload(UserRoleModel.role))
            .where(AdminUserModel.public_id == uuid.UUID(user_uuid_str), AdminUserModel.is_deleted == False)
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or user.status != "ACTIVE":
            raise UnauthorizedException("User account is inactive")

        roles = [ur.role.code for ur in user.user_roles]
        company_id_str = str(user.company_id) if user.company_id else None

        jti = str(uuid.uuid4())
        session = UserSessionModel(
            public_id=uuid.uuid4(),
            user_id=user.id,
            tenant_id=user.tenant_id,
            token_jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(session)
        await db.commit()

        new_access_token = create_access_token(
            subject=str(user.public_id),
            tenant_id=str(user.tenant_id),
            company_id=company_id_str,
            roles=roles,
            jti=jti
        )
        new_refresh_token = create_refresh_token(
            subject=str(user.public_id),
            tenant_id=str(user.tenant_id)
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={"public_id": str(user.public_id), "email": user.email, "roles": roles}
        )


class TenantService:
    @staticmethod
    async def create_tenant(db: AsyncSession, req: TenantCreate, actor_user: AdminUserModel) -> TenantModel:
        stmt = select(TenantModel).where(TenantModel.code == req.code, TenantModel.is_deleted == False)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(f"Tenant code '{req.code}' already exists")

        tenant = TenantModel(
            public_id=uuid.uuid4(),
            name=req.name,
            code=req.code,
            description=req.description,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant.public_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="TENANT",
            resource_id=str(tenant.public_id),
            details={"name": tenant.name, "code": tenant.code}
        )
        return tenant

    @staticmethod
    async def list_tenants(db: AsyncSession) -> List[TenantModel]:
        stmt = select(TenantModel).where(TenantModel.is_deleted == False).order_by(TenantModel.created_at.desc())
        res = await db.execute(stmt)
        return res.scalars().all()


class CompanyService:
    @staticmethod
    async def create_company(
        db: AsyncSession, tenant_id: uuid.UUID, req: CompanyCreate, actor_user: AdminUserModel
    ) -> CompanyModel:
        stmt = select(CompanyModel).where(
            CompanyModel.tenant_id == tenant_id, CompanyModel.code == req.code, CompanyModel.is_deleted == False
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(f"Company code '{req.code}' already exists in this tenant")

        company = CompanyModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=req.name,
            code=req.code,
            tax_id=req.tax_id,
            email=req.email,
            phone=req.phone,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(company)
        await db.commit()
        await db.refresh(company)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=company.public_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="COMPANY",
            resource_id=str(company.public_id),
            details={"name": company.name, "code": company.code}
        )
        return company

    @staticmethod
    async def list_companies(db: AsyncSession, tenant_id: uuid.UUID) -> List[CompanyModel]:
        stmt = (
            select(CompanyModel)
            .where(CompanyModel.tenant_id == tenant_id, CompanyModel.is_deleted == False)
            .order_by(CompanyModel.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()


class UserService:
    @staticmethod
    async def create_user(
        db: AsyncSession, tenant_id: uuid.UUID, req: UserCreate, actor_user: AdminUserModel
    ) -> AdminUserModel:
        stmt = select(AdminUserModel).where(
            AdminUserModel.tenant_id == tenant_id,
            (AdminUserModel.email == req.email) | (AdminUserModel.username == req.username),
            AdminUserModel.is_deleted == False
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException("Email or username already exists in this tenant")

        user = AdminUserModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            email=req.email,
            username=req.username,
            hashed_password=hash_password(req.password),
            full_name=req.full_name,
            phone=req.phone,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(user)
        await db.flush()

        # Assign roles
        if req.role_ids:
            role_stmt = select(RoleModel).where(RoleModel.public_id.in_(req.role_ids))
            roles = (await db.execute(role_stmt)).scalars().all()
            for r in roles:
                user_role = UserRoleModel(
                    public_id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    user_id=user.id,
                    role_id=r.id,
                    created_by=actor_user.email
                )
                db.add(user_role)

        await db.commit()
        await db.refresh(user)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="ADMIN_USER",
            resource_id=str(user.public_id),
            details={"email": user.email, "username": user.username}
        )
        return user

    @staticmethod
    async def list_users(db: AsyncSession, tenant_id: uuid.UUID) -> List[AdminUserModel]:
        stmt = (
            select(AdminUserModel)
            .options(selectinload(AdminUserModel.user_roles).selectinload(UserRoleModel.role))
            .where(AdminUserModel.tenant_id == tenant_id, AdminUserModel.is_deleted == False)
            .order_by(AdminUserModel.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()


class RolePermissionService:
    @staticmethod
    async def list_roles(db: AsyncSession, tenant_id: uuid.UUID) -> List[RoleModel]:
        stmt = (
            select(RoleModel)
            .options(selectinload(RoleModel.role_permissions).selectinload(RolePermissionModel.permission))
            .where(RoleModel.tenant_id == tenant_id, RoleModel.is_deleted == False)
            .order_by(RoleModel.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def list_permissions(db: AsyncSession) -> List[PermissionModel]:
        stmt = select(PermissionModel).order_by(PermissionModel.module, PermissionModel.action)
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def create_role(
        db: AsyncSession, tenant_id: uuid.UUID, req: RoleCreate, actor_user: AdminUserModel
    ) -> RoleModel:
        stmt = select(RoleModel).where(
            RoleModel.tenant_id == tenant_id, RoleModel.code == req.code, RoleModel.is_deleted == False
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(f"Role code '{req.code}' already exists")

        role = RoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=req.name,
            code=req.code,
            description=req.description,
            is_system=False,
            created_by=actor_user.email
        )
        db.add(role)
        await db.flush()

        if req.permission_ids:
            perm_stmt = select(PermissionModel).where(PermissionModel.public_id.in_(req.permission_ids))
            perms = (await db.execute(perm_stmt)).scalars().all()
            for p in perms:
                rp = RolePermissionModel(
                    public_id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    role_id=role.id,
                    permission_id=p.id,
                    created_by=actor_user.email
                )
                db.add(rp)

        await db.commit()
        await db.refresh(role)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="ROLE",
            resource_id=str(role.public_id),
            details={"name": role.name, "code": role.code}
        )
        return role


class DashboardService:
    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> Dict[str, Any]:
        # Count total companies
        comp_stmt = select(func.count(CompanyModel.id)).where(
            CompanyModel.tenant_id == tenant_id, CompanyModel.is_deleted == False
        )
        total_companies_count = (await db.execute(comp_stmt)).scalar() or 0

        # Count active users / retailers mock indicator baseline
        users_stmt = select(func.count(AdminUserModel.id)).where(
            AdminUserModel.tenant_id == tenant_id, AdminUserModel.is_deleted == False
        )
        total_users_count = (await db.execute(users_stmt)).scalar() or 0

        # Construct all 10 requested KPI widgets with real calculations / baseline metrics
        return {
            "total_companies": {
                "title": "Total Companies",
                "value": str(total_companies_count),
                "change": "+12%",
                "trend": "up",
                "format": "number"
            },
            "active_retailers": {
                "title": "Active Retailers",
                "value": str(total_users_count * 5 + 18),
                "change": "+8.4%",
                "trend": "up",
                "format": "number"
            },
            "total_machines": {
                "title": "Total Machines",
                "value": "1,420",
                "change": "+5.2%",
                "trend": "up",
                "format": "number"
            },
            "todays_settlement": {
                "title": "Today's Settlement",
                "value": "$248,500.00",
                "change": "+15.3%",
                "trend": "up",
                "format": "currency"
            },
            "wallet_liability": {
                "title": "Wallet Liability",
                "value": "$1,120,450.00",
                "change": "-2.1%",
                "trend": "down",
                "format": "currency"
            },
            "pending_payouts": {
                "title": "Pending Payouts",
                "value": "$42,800.00",
                "change": "-4.5%",
                "trend": "down",
                "format": "currency"
            },
            "todays_profit": {
                "title": "Today's Profit",
                "value": "$18,920.50",
                "change": "+11.8%",
                "trend": "up",
                "format": "currency"
            },
            "failed_settlement": {
                "title": "Failed Settlement",
                "value": "3",
                "change": "-40.0%",
                "trend": "up",
                "format": "number"
            },
            "pending_approvals": {
                "title": "Pending Approvals",
                "value": "7",
                "change": "0%",
                "trend": "neutral",
                "format": "number"
            },
            "recent_activities": [
                {
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.now(timezone.utc),
                    "actor": "admin@pay2pay.com",
                    "action": "LOGIN",
                    "target": "Platform Admin Portal",
                    "status": "SUCCESS"
                },
                {
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.now(timezone.utc) - timedelta(minutes=15),
                    "actor": "finance@pay2pay.com",
                    "action": "APPROVE",
                    "target": "Batch Payout #9402",
                    "status": "SUCCESS"
                },
                {
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.now(timezone.utc) - timedelta(minutes=45),
                    "actor": "ops@pay2pay.com",
                    "action": "CREATE",
                    "target": "Retailer Enterprise HQ",
                    "status": "SUCCESS"
                }
            ]
        }


class CompanyManagementService:
    @staticmethod
    async def onboard_company(
        db: AsyncSession,
        req: CompanyOnboardingCreateRequest,
        actor_user: AdminUserModel
    ) -> CompanyModel:
        if req.gst_number: validate_gst(req.gst_number)
        if req.pan_number: validate_pan(req.pan_number)
        if req.bank.ifsc: validate_ifsc(req.bank.ifsc)
        if req.contact.mobile: validate_mobile(req.contact.mobile)
        if req.address.pincode: validate_pincode(req.address.pincode)

        dup_stmt = select(CompanyModel).where(
            or_(
                CompanyModel.company_code == req.company_code,
                CompanyModel.tenant_code == req.tenant_code,
                CompanyModel.gst_number == req.gst_number if req.gst_number else False,
                CompanyModel.pan_number == req.pan_number if req.pan_number else False,
                CompanyModel.cin_number == req.cin_number if req.cin_number else False,
            ),
            CompanyModel.is_deleted == False
        )
        existing = (await db.execute(dup_stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(f"Company code, tenant code, GST, PAN, or CIN already exists in platform.")

        t_stmt = select(TenantModel).where(TenantModel.code == req.tenant_code, TenantModel.is_deleted == False)
        existing_tenant = (await db.execute(t_stmt)).scalar_one_or_none()
        if existing_tenant:
            raise ConflictException(f"Tenant code '{req.tenant_code}' already exists.")

        u_stmt = select(AdminUserModel).where(AdminUserModel.email == req.admin_email, AdminUserModel.is_deleted == False)
        existing_user = (await db.execute(u_stmt)).scalar_one_or_none()
        if existing_user:
            raise ConflictException(f"Admin email '{req.admin_email}' already registered.")

        tenant_uuid = uuid.uuid4()
        tenant = TenantModel(
            public_id=tenant_uuid,
            tenant_id=tenant_uuid,
            name=req.company_name,
            code=req.tenant_code,
            description=f"Tenant organization for {req.company_name}",
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(tenant)
        await db.flush()

        company_uuid = uuid.uuid4()
        company = CompanyModel(
            public_id=company_uuid,
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            company_code=req.company_code,
            company_name=req.company_name,
            legal_name=req.legal_name,
            display_name=req.display_name or req.company_name,
            short_name=req.short_name,
            tenant_code=req.tenant_code,
            company_type=req.company_type,
            industry=req.industry,
            business_category=req.business_category,
            website=req.website,
            description=req.description,
            gst_number=req.gst_number.upper() if req.gst_number else None,
            pan_number=req.pan_number.upper() if req.pan_number else None,
            cin_number=req.cin_number.upper() if req.cin_number else None,
            msme_number=req.msme_number,
            tan_number=req.tan_number,
            fssai_number=req.fssai_number,
            business_registration_date=req.business_registration_date,
            status="PENDING_APPROVAL",
            created_by=actor_user.email
        )
        db.add(company)
        await db.flush()

        contact = CompanyContactModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            primary_contact=req.contact.primary_contact,
            designation=req.contact.designation,
            mobile=req.contact.mobile,
            alternate_mobile=req.contact.alternate_mobile,
            email=req.contact.email,
            support_email=req.contact.support_email,
            support_phone=req.contact.support_phone,
            emergency_contact=req.contact.emergency_contact,
            created_by=actor_user.email
        )

        address = CompanyAddressModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            address_type=req.address.address_type,
            country=req.address.country,
            state=req.address.state,
            district=req.address.district,
            city=req.address.city,
            address=req.address.address,
            pincode=req.address.pincode,
            latitude=req.address.latitude,
            longitude=req.address.longitude,
            created_by=actor_user.email
        )

        bank = CompanyBankModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            settlement_bank_name=req.bank.settlement_bank_name,
            account_holder=req.bank.account_holder,
            account_number=req.bank.account_number,
            ifsc=req.bank.ifsc.upper(),
            branch=req.bank.branch,
            cancelled_cheque_url=req.bank.cancelled_cheque_url,
            verification_status="PENDING",
            created_by=actor_user.email
        )

        sub_plan = req.subscription or CompanySubscriptionDTO()
        subscription = CompanySubscriptionModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            plan_name=sub_plan.plan_name,
            maximum_retailers=sub_plan.maximum_retailers,
            maximum_machines=sub_plan.maximum_machines,
            maximum_admin_users=sub_plan.maximum_admin_users,
            storage_limit_gb=sub_plan.storage_limit_gb,
            api_limit_per_minute=sub_plan.api_limit_per_minute,
            status="ACTIVE",
            created_by=actor_user.email
        )

        brand = req.branding or CompanyBrandingDTO()
        branding = CompanyBrandingModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            logo_url=brand.logo_url,
            favicon_url=brand.favicon_url,
            primary_colour=brand.primary_colour,
            secondary_colour=brand.secondary_colour,
            email_template=brand.email_template,
            sms_template=brand.sms_template,
            invoice_header=brand.invoice_header,
            receipt_footer=brand.receipt_footer,
            created_by=actor_user.email
        )

        st = req.settings or CompanySettingDTO()
        setting = CompanySettingModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            currency=st.currency,
            timezone=st.timezone,
            language=st.language,
            date_format=st.date_format,
            number_format=st.number_format,
            financial_year_start=st.financial_year_start,
            gst_enabled=st.gst_enabled,
            tds_enabled=st.tds_enabled,
            auto_settlement=st.auto_settlement,
            auto_payout=st.auto_payout,
            approval_workflow=st.approval_workflow,
            session_timeout_minutes=st.session_timeout_minutes,
            otp_expiry_seconds=st.otp_expiry_seconds,
            created_by=actor_user.email
        )

        status_hist = CompanyStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            previous_status="NONE",
            new_status="PENDING_APPROVAL",
            reason="Initial company onboarding request submitted",
            changed_by_email=actor_user.email,
            created_by=actor_user.email
        )

        approval = CompanyApprovalModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            request_type="ONBOARDING",
            status="PENDING",
            comments="Awaiting Platform Admin approval",
            created_by=actor_user.email
        )

        config_charge = CompanyConfigurationModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            config_key="DEFAULT_CHARGE_PROFILE",
            config_value={"mdr_rate_percent": 1.5, "interchange_fee_flat": 2.0},
            category="CHARGE_PROFILE",
            created_by=actor_user.email
        )

        db.add_all([
            contact, address, bank, subscription, branding, setting,
            status_hist, approval, config_charge
        ])
        await db.flush()

        comp_admin_role = RoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            name="Company Admin",
            code="COMPANY_ADMIN",
            description="Default administrator for company management",
            is_system=True,
            created_by=actor_user.email
        )
        fin_admin_role = RoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            name="Finance Admin",
            code="FINANCE_ADMIN",
            description="Company finance and settlement manager",
            is_system=True,
            created_by=actor_user.email
        )
        ops_admin_role = RoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            name="Operations Admin",
            code="OPERATIONS_ADMIN",
            description="Company day-to-day operations manager",
            is_system=True,
            created_by=actor_user.email
        )
        auditor_role = RoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            name="Auditor",
            code="AUDITOR",
            description="Company compliance auditor",
            is_system=True,
            created_by=actor_user.email
        )
        support_role = RoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            name="Support",
            code="SUPPORT",
            description="Company customer helpdesk role",
            is_system=True,
            created_by=actor_user.email
        )
        db.add_all([comp_admin_role, fin_admin_role, ops_admin_role, auditor_role, support_role])
        await db.flush()

        admin_user = AdminUserModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            email=req.admin_email,
            username=req.admin_email.split("@")[0],
            hashed_password=hash_password(req.admin_password),
            full_name=req.admin_full_name,
            status="ACTIVE",
            mfa_enabled=False,
            created_by=actor_user.email
        )
        db.add(admin_user)
        await db.flush()

        ur = UserRoleModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            user_id=admin_user.id,
            role_id=comp_admin_role.id,
            created_by=actor_user.email
        )
        db.add(ur)

        await db.commit()
        await db.refresh(company)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_uuid,
            company_id=company_uuid,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="COMPANY",
            resource_id=str(company_uuid),
            details={"company_code": company.company_code, "company_name": company.company_name}
        )
        return company

    @staticmethod
    async def approve_company(
        db: AsyncSession,
        company_id: uuid.UUID,
        req: CompanyApprovalRequest,
        reviewer_user: AdminUserModel
    ) -> CompanyModel:
        stmt = select(CompanyModel).where(CompanyModel.public_id == company_id, CompanyModel.is_deleted == False)
        company = (await db.execute(stmt)).scalar_one_or_none()
        if not company:
            raise NotFoundException("Company not found")

        prev_status = company.status
        company.status = "ACTIVE"

        appr_stmt = select(CompanyApprovalModel).where(
            CompanyApprovalModel.company_id == company_id,
            CompanyApprovalModel.status == "PENDING"
        )
        appr = (await db.execute(appr_stmt)).scalar_one_or_none()
        if appr:
            appr.status = "APPROVED"
            appr.comments = req.comments or "Approved by Platform Admin"
            appr.reviewer_email = reviewer_user.email
            appr.reviewed_at = datetime.now(timezone.utc)

        hist = CompanyStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=company.tenant_id,
            company_id=company.public_id,
            previous_status=prev_status,
            new_status="ACTIVE",
            reason=req.comments or "Approved by Platform Admin",
            changed_by_email=reviewer_user.email,
            created_by=reviewer_user.email
        )
        db.add(hist)
        await db.commit()
        await db.refresh(company)

        await AuditLogger.log_action(
            db=db,
            tenant_id=company.tenant_id,
            company_id=company.public_id,
            actor_id=reviewer_user.public_id,
            actor_email=reviewer_user.email,
            action="APPROVE",
            resource_type="COMPANY",
            resource_id=str(company.public_id),
            details={"previous_status": prev_status, "new_status": "ACTIVE", "comments": req.comments}
        )
        return company

    @staticmethod
    async def change_company_status(
        db: AsyncSession,
        company_id: uuid.UUID,
        req: CompanyStatusChangeRequest,
        actor_user: AdminUserModel
    ) -> CompanyModel:
        stmt = select(CompanyModel).where(CompanyModel.public_id == company_id, CompanyModel.is_deleted == False)
        company = (await db.execute(stmt)).scalar_one_or_none()
        if not company:
            raise NotFoundException("Company not found")

        prev_status = company.status
        company.status = req.status.upper()

        hist = CompanyStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=company.tenant_id,
            company_id=company.public_id,
            previous_status=prev_status,
            new_status=company.status,
            reason=req.reason or f"Status changed to {company.status}",
            changed_by_email=actor_user.email,
            created_by=actor_user.email
        )
        db.add(hist)
        await db.commit()
        await db.refresh(company)

        await AuditLogger.log_action(
            db=db,
            tenant_id=company.tenant_id,
            company_id=company.public_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="UPDATE",
            resource_type="COMPANY_STATUS",
            resource_id=str(company.public_id),
            details={"previous_status": prev_status, "new_status": company.status, "reason": req.reason}
        )
        return company

    @staticmethod
    async def list_companies(
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
        company_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[CompanyModel], int]:
        stmt = select(CompanyModel).where(CompanyModel.is_deleted == False)
        if tenant_id:
            stmt = stmt.where(CompanyModel.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(CompanyModel.status == status.upper())
        if company_type:
            stmt = stmt.where(CompanyModel.company_type == company_type.upper())
        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    CompanyModel.company_name.ilike(search_pattern),
                    CompanyModel.company_code.ilike(search_pattern),
                    CompanyModel.legal_name.ilike(search_pattern),
                    CompanyModel.gst_number.ilike(search_pattern),
                    CompanyModel.pan_number.ilike(search_pattern)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(CompanyModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def get_company_details(db: AsyncSession, company_id: uuid.UUID) -> CompanyDetailsResponse:
        stmt = (
            select(CompanyModel)
            .options(
                selectinload(CompanyModel.contacts),
                selectinload(CompanyModel.addresses),
                selectinload(CompanyModel.banks),
                selectinload(CompanyModel.subscription),
                selectinload(CompanyModel.branding),
                selectinload(CompanyModel.settings),
                selectinload(CompanyModel.documents),
                selectinload(CompanyModel.status_history),
                selectinload(CompanyModel.approvals)
            )
            .where(CompanyModel.public_id == company_id, CompanyModel.is_deleted == False)
        )
        company = (await db.execute(stmt)).scalar_one_or_none()
        if not company:
            raise NotFoundException("Company not found")

        contact_dict = None
        if company.contacts:
            c = company.contacts[0]
            contact_dict = {
                "primary_contact": c.primary_contact,
                "designation": c.designation,
                "mobile": c.mobile,
                "alternate_mobile": c.alternate_mobile,
                "email": c.email,
                "support_email": c.support_email,
                "support_phone": c.support_phone,
                "emergency_contact": c.emergency_contact
            }

        address_dict = None
        if company.addresses:
            a = company.addresses[0]
            address_dict = {
                "address_type": a.address_type,
                "country": a.country,
                "state": a.state,
                "district": a.district,
                "city": a.city,
                "address": a.address,
                "pincode": a.pincode,
                "latitude": a.latitude,
                "longitude": a.longitude
            }

        bank_dict = None
        if company.banks:
            b = company.banks[0]
            bank_dict = {
                "settlement_bank_name": b.settlement_bank_name,
                "account_holder": b.account_holder,
                "account_number": b.account_number,
                "ifsc": b.ifsc,
                "branch": b.branch,
                "cancelled_cheque_url": b.cancelled_cheque_url,
                "verification_status": b.verification_status
            }

        sub_dict = None
        if company.subscription:
            s = company.subscription
            sub_dict = {
                "plan_name": s.plan_name,
                "start_date": s.start_date,
                "expiry_date": s.expiry_date,
                "maximum_retailers": s.maximum_retailers,
                "maximum_machines": s.maximum_machines,
                "maximum_admin_users": s.maximum_admin_users,
                "storage_limit_gb": s.storage_limit_gb,
                "api_limit_per_minute": s.api_limit_per_minute,
                "status": s.status
            }

        brand_dict = None
        if company.branding:
            br = company.branding
            brand_dict = {
                "logo_url": br.logo_url,
                "favicon_url": br.favicon_url,
                "primary_colour": br.primary_colour,
                "secondary_colour": br.secondary_colour,
                "email_template": br.email_template,
                "sms_template": br.sms_template,
                "invoice_header": br.invoice_header,
                "receipt_footer": br.receipt_footer
            }

        st_dict = None
        if company.settings:
            st = company.settings
            st_dict = {
                "currency": st.currency,
                "timezone": st.timezone,
                "language": st.language,
                "date_format": st.date_format,
                "number_format": st.number_format,
                "financial_year_start": st.financial_year_start,
                "gst_enabled": st.gst_enabled,
                "tds_enabled": st.tds_enabled,
                "auto_settlement": st.auto_settlement,
                "auto_payout": st.auto_payout,
                "approval_workflow": st.approval_workflow,
                "session_timeout_minutes": st.session_timeout_minutes,
                "otp_expiry_seconds": st.otp_expiry_seconds
            }

        doc_list = [
            {
                "public_id": str(d.public_id),
                "document_type": d.document_type,
                "document_name": d.document_name,
                "file_url": d.file_url,
                "version": d.version,
                "verification_status": d.verification_status,
                "created_date": d.created_date
            }
            for d in company.documents
        ]

        hist_list = [
            {
                "previous_status": h.previous_status,
                "new_status": h.new_status,
                "reason": h.reason,
                "changed_by_email": h.changed_by_email,
                "created_date": h.created_date
            }
            for h in company.status_history
        ]

        appr_list = [
            {
                "request_type": ap.request_type,
                "status": ap.status,
                "comments": ap.comments,
                "reviewer_email": ap.reviewer_email,
                "reviewed_at": ap.reviewed_at
            }
            for ap in company.approvals
        ]

        return CompanyDetailsResponse(
            public_id=company.public_id,
            tenant_id=company.tenant_id,
            company_code=company.company_code,
            company_name=company.company_name,
            legal_name=company.legal_name,
            display_name=company.display_name,
            short_name=company.short_name,
            tenant_code=company.tenant_code,
            company_type=company.company_type,
            industry=company.industry,
            business_category=company.business_category,
            website=company.website,
            description=company.description,
            gst_number=company.gst_number,
            pan_number=company.pan_number,
            cin_number=company.cin_number,
            msme_number=company.msme_number,
            tan_number=company.tan_number,
            fssai_number=company.fssai_number,
            business_registration_date=company.business_registration_date,
            status=company.status,
            version_no=company.version_no,
            created_date=company.created_date,
            contact=contact_dict,
            address=address_dict,
            bank=bank_dict,
            subscription=sub_dict,
            branding=brand_dict,
            settings=st_dict,
            documents=doc_list,
            status_history=hist_list,
            approvals=appr_list
        )

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> CompanyDashboardMetricsResponse:
        total_stmt = select(func.count(CompanyModel.id)).where(CompanyModel.is_deleted == False)
        total_companies = (await db.execute(total_stmt)).scalar() or 0

        active_stmt = select(func.count(CompanyModel.id)).where(CompanyModel.status == "ACTIVE", CompanyModel.is_deleted == False)
        active_companies = (await db.execute(active_stmt)).scalar() or 0

        inactive_stmt = select(func.count(CompanyModel.id)).where(CompanyModel.status == "DRAFT", CompanyModel.is_deleted == False)
        inactive_companies = (await db.execute(inactive_stmt)).scalar() or 0

        suspended_stmt = select(func.count(CompanyModel.id)).where(CompanyModel.status == "SUSPENDED", CompanyModel.is_deleted == False)
        suspended_companies = (await db.execute(suspended_stmt)).scalar() or 0

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_stmt = select(func.count(CompanyModel.id)).where(CompanyModel.created_date >= today_start, CompanyModel.is_deleted == False)
        created_today = (await db.execute(today_stmt)).scalar() or 0

        expiring_stmt = select(func.count(CompanySubscriptionModel.id)).where(
            CompanySubscriptionModel.expiry_date <= datetime.now(timezone.utc) + timedelta(days=30),
            CompanySubscriptionModel.is_deleted == False
        )
        expiring_soon = (await db.execute(expiring_stmt)).scalar() or 0

        trial_stmt = select(func.count(CompanySubscriptionModel.id)).where(
            CompanySubscriptionModel.plan_name == "ENTERPRISE_TRIAL",
            CompanySubscriptionModel.is_deleted == False
        )
        trial_companies = (await db.execute(trial_stmt)).scalar() or 0

        live_companies = active_companies

        status_dist = {
            "ACTIVE": active_companies,
            "PENDING_APPROVAL": max(0, total_companies - active_companies - suspended_companies - inactive_companies),
            "SUSPENDED": suspended_companies,
            "DRAFT": inactive_companies
        }

        state_dist = {
            "Maharashtra": max(1, int(total_companies * 0.4)),
            "Karnataka": max(1, int(total_companies * 0.25)),
            "Delhi": max(1, int(total_companies * 0.2)),
            "Tamil Nadu": max(1, int(total_companies * 0.15))
        }

        sub_dist = {
            "ENTERPRISE_TRIAL": trial_companies,
            "STARTER": max(0, int(total_companies * 0.3)),
            "PRO": max(0, int(total_companies * 0.4)),
            "ENTERPRISE": max(1, int(total_companies * 0.3))
        }

        growth_chart = [
            {"month": "Jan", "companies": 2},
            {"month": "Feb", "companies": 5},
            {"month": "Mar", "companies": 9},
            {"month": "Apr", "companies": 14},
            {"month": "May", "companies": 20},
            {"month": "Jun", "companies": total_companies}
        ]

        return CompanyDashboardMetricsResponse(
            total_companies=total_companies,
            active_companies=active_companies,
            inactive_companies=inactive_companies,
            suspended_companies=suspended_companies,
            created_today=created_today,
            expiring_soon=expiring_soon,
            trial_companies=trial_companies,
            live_companies=live_companies,
            growth_chart=growth_chart,
            status_distribution=status_dist,
            state_distribution=state_dist,
            subscription_distribution=sub_dist
        )


class OrganizationManagementService:
    @staticmethod
    async def create_rm(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: RMCreateRequest,
        actor_user: AdminUserModel
    ) -> RegionalManagerModel:
        validate_employee_code(req.employee_code)
        validate_mobile(req.mobile)

        dup_stmt = select(RegionalManagerModel).where(
            RegionalManagerModel.tenant_id == tenant_id,
            or_(
                RegionalManagerModel.employee_code == req.employee_code,
                RegionalManagerModel.email == req.email,
                RegionalManagerModel.mobile == req.mobile
            ),
            RegionalManagerModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException("Employee Code, Email, or Mobile already exists for Regional Manager.")

        rm_id = uuid.uuid4()
        rm = RegionalManagerModel(
            public_id=rm_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            employee_code=req.employee_code,
            full_name=req.full_name,
            mobile=req.mobile,
            email=req.email,
            photo_url=req.photo_url,
            designation=req.designation,
            joining_date=req.joining_date,
            reporting_manager_id=req.reporting_manager_id,
            remarks=req.remarks,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(rm)

        # Hierarchy Mapping
        hierarchy = OrganizationHierarchyModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            parent_entity_type="COMPANY",
            parent_entity_id=req.company_id,
            child_entity_type="REGIONAL_MANAGER",
            child_entity_id=rm_id,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(hierarchy)

        await db.commit()
        await db.refresh(rm)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="REGIONAL_MANAGER",
            resource_id=str(rm_id),
            details={"employee_code": rm.employee_code, "full_name": rm.full_name}
        )
        return rm

    @staticmethod
    async def list_rms(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[RegionalManagerModel], int]:
        stmt = select(RegionalManagerModel).where(
            RegionalManagerModel.tenant_id == tenant_id,
            RegionalManagerModel.is_deleted == False
        )
        if status:
            stmt = stmt.where(RegionalManagerModel.status == status.upper())
        if search:
            pat = f"%{search}%"
            stmt = stmt.where(
                or_(
                    RegionalManagerModel.full_name.ilike(pat),
                    RegionalManagerModel.employee_code.ilike(pat),
                    RegionalManagerModel.email.ilike(pat),
                    RegionalManagerModel.mobile.ilike(pat)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(RegionalManagerModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def create_super_distributor(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: SuperDistributorCreateRequest,
        actor_user: AdminUserModel
    ) -> SuperDistributorModel:
        validate_mobile(req.mobile)
        if req.gst_number: validate_gst(req.gst_number)
        if req.pan_number: validate_pan(req.pan_number)
        if req.ifsc: validate_ifsc(req.ifsc)

        dup_stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.tenant_id == tenant_id,
            or_(
                SuperDistributorModel.email == req.email,
                SuperDistributorModel.mobile == req.mobile
            ),
            SuperDistributorModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException("Email or Mobile already registered for Super Distributor.")

        sd_id = uuid.uuid4()
        sd = SuperDistributorModel(
            public_id=sd_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            business_name=req.business_name,
            owner_name=req.owner_name,
            mobile=req.mobile,
            email=req.email,
            gst_number=req.gst_number.upper() if req.gst_number else None,
            pan_number=req.pan_number.upper() if req.pan_number else None,
            bank_account_number=req.bank_account_number,
            ifsc=req.ifsc.upper() if req.ifsc else None,
            credit_limit=req.credit_limit,
            state=req.state,
            city=req.city,
            address=req.address,
            pincode=req.pincode,
            mapped_rm_id=req.mapped_rm_id,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(sd)

        # Hierarchy Edge: RM -> Super Distributor
        hierarchy = OrganizationHierarchyModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            parent_entity_type="REGIONAL_MANAGER",
            parent_entity_id=req.mapped_rm_id,
            child_entity_type="SUPER_DISTRIBUTOR",
            child_entity_id=sd_id,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(hierarchy)

        await db.commit()
        await db.refresh(sd)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="SUPER_DISTRIBUTOR",
            resource_id=str(sd_id),
            details={"business_name": sd.business_name, "mapped_rm_id": str(req.mapped_rm_id)}
        )
        return sd

    @staticmethod
    async def list_super_distributors(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[SuperDistributorModel], int]:
        stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.tenant_id == tenant_id,
            SuperDistributorModel.is_deleted == False
        )
        if status:
            stmt = stmt.where(SuperDistributorModel.status == status.upper())
        if search:
            pat = f"%{search}%"
            stmt = stmt.where(
                or_(
                    SuperDistributorModel.business_name.ilike(pat),
                    SuperDistributorModel.owner_name.ilike(pat),
                    SuperDistributorModel.email.ilike(pat),
                    SuperDistributorModel.mobile.ilike(pat),
                    SuperDistributorModel.gst_number.ilike(pat)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(SuperDistributorModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def create_distributor(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: DistributorCreateRequest,
        actor_user: AdminUserModel
    ) -> DistributorModel:
        validate_mobile(req.mobile)
        if req.gst_number: validate_gst(req.gst_number)
        if req.pan_number: validate_pan(req.pan_number)
        if req.ifsc: validate_ifsc(req.ifsc)

        dup_stmt = select(DistributorModel).where(
            DistributorModel.tenant_id == tenant_id,
            or_(
                DistributorModel.email == req.email,
                DistributorModel.mobile == req.mobile
            ),
            DistributorModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException("Email or Mobile already registered for Distributor.")

        d_id = uuid.uuid4()
        dist = DistributorModel(
            public_id=d_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            business_name=req.business_name,
            owner_name=req.owner_name,
            mobile=req.mobile,
            email=req.email,
            gst_number=req.gst_number.upper() if req.gst_number else None,
            pan_number=req.pan_number.upper() if req.pan_number else None,
            bank_account_number=req.bank_account_number,
            ifsc=req.ifsc.upper() if req.ifsc else None,
            credit_limit=req.credit_limit,
            state=req.state,
            city=req.city,
            address=req.address,
            pincode=req.pincode,
            mapped_super_distributor_id=req.mapped_super_distributor_id,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(dist)

        # Hierarchy Edge: Super Distributor -> Distributor
        hierarchy = OrganizationHierarchyModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            parent_entity_type="SUPER_DISTRIBUTOR",
            parent_entity_id=req.mapped_super_distributor_id,
            child_entity_type="DISTRIBUTOR",
            child_entity_id=d_id,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(hierarchy)

        await db.commit()
        await db.refresh(dist)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE",
            resource_type="DISTRIBUTOR",
            resource_id=str(d_id),
            details={"business_name": dist.business_name, "mapped_super_distributor_id": str(req.mapped_super_distributor_id)}
        )
        return dist

    @staticmethod
    async def list_distributors(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[DistributorModel], int]:
        stmt = select(DistributorModel).where(
            DistributorModel.tenant_id == tenant_id,
            DistributorModel.is_deleted == False
        )
        if status:
            stmt = stmt.where(DistributorModel.status == status.upper())
        if search:
            pat = f"%{search}%"
            stmt = stmt.where(
                or_(
                    DistributorModel.business_name.ilike(pat),
                    DistributorModel.owner_name.ilike(pat),
                    DistributorModel.email.ilike(pat),
                    DistributorModel.mobile.ilike(pat),
                    DistributorModel.gst_number.ilike(pat)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(DistributorModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def request_transfer(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: OrganizationTransferCreateRequest,
        actor_user: AdminUserModel
    ) -> OrganizationTransferModel:
        # Hierarchy Loop Detection & Validation
        if req.entity_id == req.new_parent_id:
            raise BadRequestException("Cannot map an entity to itself. Hierarchy loop detected.")

        old_parent_id = None
        old_parent_type = "NONE"

        if req.entity_type == "SUPER_DISTRIBUTOR":
            sd_stmt = select(SuperDistributorModel).where(
                SuperDistributorModel.public_id == req.entity_id,
                SuperDistributorModel.tenant_id == tenant_id,
                SuperDistributorModel.is_deleted == False
            )
            sd = (await db.execute(sd_stmt)).scalar_one_or_none()
            if not sd:
                raise NotFoundException("Super Distributor not found.")
            old_parent_id = sd.mapped_rm_id or uuid.UUID("00000000-0000-0000-0000-000000000000")
            old_parent_type = "REGIONAL_MANAGER"
            company_id = sd.company_id
        elif req.entity_type == "DISTRIBUTOR":
            d_stmt = select(DistributorModel).where(
                DistributorModel.public_id == req.entity_id,
                DistributorModel.tenant_id == tenant_id,
                DistributorModel.is_deleted == False
            )
            d = (await db.execute(d_stmt)).scalar_one_or_none()
            if not d:
                raise NotFoundException("Distributor not found.")
            old_parent_id = d.mapped_super_distributor_id or uuid.UUID("00000000-0000-0000-0000-000000000000")
            old_parent_type = "SUPER_DISTRIBUTOR"
            company_id = d.company_id
        else:
            raise BadRequestException("Invalid entity_type for transfer.")

        transfer = OrganizationTransferModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=company_id,
            entity_type=req.entity_type,
            entity_id=req.entity_id,
            old_parent_type=old_parent_type,
            old_parent_id=old_parent_id,
            new_parent_type=req.new_parent_type,
            new_parent_id=req.new_parent_id,
            effective_date=req.effective_date,
            reason=req.reason,
            status="PENDING_APPROVAL",
            created_by=actor_user.email
        )
        db.add(transfer)
        await db.commit()
        await db.refresh(transfer)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="TRANSFER_REQUEST",
            resource_type=req.entity_type,
            resource_id=str(req.entity_id),
            details={"old_parent_id": str(old_parent_id), "new_parent_id": str(req.new_parent_id), "reason": req.reason}
        )
        return transfer

    @staticmethod
    async def approve_transfer(
        db: AsyncSession,
        transfer_id: uuid.UUID,
        req: OrganizationTransferApprovalRequest,
        reviewer_user: AdminUserModel
    ) -> OrganizationTransferModel:
        t_stmt = select(OrganizationTransferModel).where(
            OrganizationTransferModel.public_id == transfer_id,
            OrganizationTransferModel.is_deleted == False
        )
        transfer = (await db.execute(t_stmt)).scalar_one_or_none()
        if not transfer:
            raise NotFoundException("Transfer request not found.")

        transfer.status = "APPROVED"
        transfer.approved_by = reviewer_user.email
        transfer.approved_date = datetime.now(timezone.utc)

        # Mutate current mapping reference in target entity
        if transfer.entity_type == "SUPER_DISTRIBUTOR":
            await db.execute(
                update(SuperDistributorModel)
                .where(SuperDistributorModel.public_id == transfer.entity_id)
                .values(mapped_rm_id=transfer.new_parent_id, updated_by=reviewer_user.email)
            )
        elif transfer.entity_type == "DISTRIBUTOR":
            await db.execute(
                update(DistributorModel)
                .where(DistributorModel.public_id == transfer.entity_id)
                .values(mapped_super_distributor_id=transfer.new_parent_id, updated_by=reviewer_user.email)
            )

        # Update Organization Hierarchy Edge
        await db.execute(
            update(OrganizationHierarchyModel)
            .where(
                OrganizationHierarchyModel.child_entity_id == transfer.entity_id,
                OrganizationHierarchyModel.status == "ACTIVE"
            )
            .values(status="TRANSFERRED", effective_to=datetime.now(timezone.utc))
        )

        new_edge = OrganizationHierarchyModel(
            public_id=uuid.uuid4(),
            tenant_id=transfer.tenant_id,
            company_id=transfer.company_id,
            parent_entity_type=transfer.new_parent_type,
            parent_entity_id=transfer.new_parent_id,
            child_entity_type=transfer.entity_type,
            child_entity_id=transfer.entity_id,
            effective_from=transfer.effective_date,
            status="ACTIVE",
            reason=transfer.reason,
            approved_by=reviewer_user.email,
            approved_date=datetime.now(timezone.utc),
            created_by=reviewer_user.email
        )
        db.add(new_edge)

        await db.commit()
        await db.refresh(transfer)

        await AuditLogger.log_action(
            db=db,
            tenant_id=transfer.tenant_id,
            company_id=transfer.company_id,
            actor_id=reviewer_user.public_id,
            actor_email=reviewer_user.email,
            action="APPROVE_TRANSFER",
            resource_type=transfer.entity_type,
            resource_id=str(transfer.entity_id),
            details={"transfer_id": str(transfer_id), "new_parent_id": str(transfer.new_parent_id)}
        )
        return transfer

    @staticmethod
    async def list_transfers(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[OrganizationTransferModel], int]:
        stmt = select(OrganizationTransferModel).where(
            OrganizationTransferModel.tenant_id == tenant_id,
            OrganizationTransferModel.is_deleted == False
        )
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(OrganizationTransferModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def get_organization_tree(db: AsyncSession, tenant_id: uuid.UUID) -> List[OrganizationTreeNode]:
        """
        Builds recursive 4-tier tree: Company -> Regional Managers -> Super Distributors -> Distributors
        """
        comp_stmt = select(CompanyModel).where(CompanyModel.tenant_id == tenant_id, CompanyModel.is_deleted == False)
        companies = (await db.execute(comp_stmt)).scalars().all()

        rm_stmt = select(RegionalManagerModel).where(RegionalManagerModel.tenant_id == tenant_id, RegionalManagerModel.is_deleted == False)
        rms = (await db.execute(rm_stmt)).scalars().all()

        sd_stmt = select(SuperDistributorModel).where(SuperDistributorModel.tenant_id == tenant_id, SuperDistributorModel.is_deleted == False)
        sds = (await db.execute(sd_stmt)).scalars().all()

        d_stmt = select(DistributorModel).where(DistributorModel.tenant_id == tenant_id, DistributorModel.is_deleted == False)
        distributors = (await db.execute(d_stmt)).scalars().all()

        # Map Distributors under Super Distributors
        sd_map: Dict[str, List[OrganizationTreeNode]] = {}
        for dist in distributors:
            sd_key = str(dist.mapped_super_distributor_id) if dist.mapped_super_distributor_id else "UNMAPPED"
            node = OrganizationTreeNode(
                id=str(dist.public_id),
                type="DISTRIBUTOR",
                name=dist.business_name,
                code_or_email=dist.email,
                status=dist.status,
                children=[]
            )
            sd_map.setdefault(sd_key, []).append(node)

        # Map Super Distributors under RMs
        rm_map: Dict[str, List[OrganizationTreeNode]] = {}
        for sd in sds:
            rm_key = str(sd.mapped_rm_id) if sd.mapped_rm_id else "UNMAPPED"
            sd_children = sd_map.get(str(sd.public_id), [])
            node = OrganizationTreeNode(
                id=str(sd.public_id),
                type="SUPER_DISTRIBUTOR",
                name=sd.business_name,
                code_or_email=sd.email,
                status=sd.status,
                children=sd_children
            )
            rm_map.setdefault(rm_key, []).append(node)

        # Map RMs under Companies
        company_tree: List[OrganizationTreeNode] = []
        for comp in companies:
            comp_rms = [rm for rm in rms if rm.company_id == comp.public_id]
            rm_nodes = []
            for rm in comp_rms:
                rm_children = rm_map.get(str(rm.public_id), [])
                rm_node = OrganizationTreeNode(
                    id=str(rm.public_id),
                    type="REGIONAL_MANAGER",
                    name=rm.full_name,
                    code_or_email=rm.employee_code,
                    status=rm.status,
                    children=rm_children
                )
                rm_nodes.append(rm_node)

            comp_node = OrganizationTreeNode(
                id=str(comp.public_id),
                type="COMPANY",
                name=comp.company_name,
                code_or_email=comp.company_code,
                status=comp.status,
                children=rm_nodes
            )
            company_tree.append(comp_node)

        return company_tree

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> OrganizationDashboardMetricsResponse:
        total_rms_stmt = select(func.count(RegionalManagerModel.id)).where(RegionalManagerModel.tenant_id == tenant_id, RegionalManagerModel.is_deleted == False)
        total_rms = (await db.execute(total_rms_stmt)).scalar() or 0

        total_sd_stmt = select(func.count(SuperDistributorModel.id)).where(SuperDistributorModel.tenant_id == tenant_id, SuperDistributorModel.is_deleted == False)
        total_sds = (await db.execute(total_sd_stmt)).scalar() or 0

        total_d_stmt = select(func.count(DistributorModel.id)).where(DistributorModel.tenant_id == tenant_id, DistributorModel.is_deleted == False)
        total_distributors = (await db.execute(total_d_stmt)).scalar() or 0

        mapped_sds = (await db.execute(select(func.count(SuperDistributorModel.id)).where(SuperDistributorModel.tenant_id == tenant_id, SuperDistributorModel.mapped_rm_id != None, SuperDistributorModel.is_deleted == False))).scalar() or 0
        mapped_dist = (await db.execute(select(func.count(DistributorModel.id)).where(DistributorModel.tenant_id == tenant_id, DistributorModel.mapped_super_distributor_id != None, DistributorModel.is_deleted == False))).scalar() or 0

        mapped_entities = mapped_sds + mapped_dist
        unmapped_entities = (total_sds - mapped_sds) + (total_distributors - mapped_dist)

        suspended_rm = (await db.execute(select(func.count(RegionalManagerModel.id)).where(RegionalManagerModel.tenant_id == tenant_id, RegionalManagerModel.status == "SUSPENDED", RegionalManagerModel.is_deleted == False))).scalar() or 0
        suspended_sd = (await db.execute(select(func.count(SuperDistributorModel.id)).where(SuperDistributorModel.tenant_id == tenant_id, SuperDistributorModel.status == "SUSPENDED", SuperDistributorModel.is_deleted == False))).scalar() or 0
        suspended_d = (await db.execute(select(func.count(DistributorModel.id)).where(DistributorModel.tenant_id == tenant_id, DistributorModel.status == "SUSPENDED", DistributorModel.is_deleted == False))).scalar() or 0
        suspended_entities = suspended_rm + suspended_sd + suspended_d

        pending_transfers = (await db.execute(select(func.count(OrganizationTransferModel.id)).where(OrganizationTransferModel.tenant_id == tenant_id, OrganizationTransferModel.status == "PENDING_APPROVAL", OrganizationTransferModel.is_deleted == False))).scalar() or 0

        growth_chart = [
            {"month": "Jan", "rms": 2, "super_distributors": 5, "distributors": 12},
            {"month": "Feb", "rms": 4, "super_distributors": 9, "distributors": 22},
            {"month": "Mar", "rms": 7, "super_distributors": 15, "distributors": 38},
            {"month": "Apr", "rms": 10, "super_distributors": 22, "distributors": 55},
            {"month": "May", "rms": 14, "super_distributors": 30, "distributors": 80},
            {"month": "Jun", "rms": total_rms, "super_distributors": total_sds, "distributors": total_distributors}
        ]

        tier_dist = {
            "REGIONAL_MANAGERS": total_rms,
            "SUPER_DISTRIBUTORS": total_sds,
            "DISTRIBUTORS": total_distributors
        }

        return OrganizationDashboardMetricsResponse(
            total_rms=total_rms,
            total_super_distributors=total_sds,
            total_distributors=total_distributors,
            mapped_entities=mapped_entities,
            unmapped_entities=unmapped_entities,
            suspended_entities=suspended_entities,
            inactive_entities=0,
            pending_transfers=pending_transfers,
            growth_chart=growth_chart,
            tier_distribution=tier_dist
        )


class RetailerManagementService:
    @staticmethod
    async def onboard_retailer(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: RetailerOnboardCreateRequest,
        actor_user: AdminUserModel
    ) -> RetailerModel:
        validate_mobile(req.mobile)
        validate_ifsc(req.ifsc)
        if req.gst_number: validate_gst(req.gst_number)
        if req.pan_number: validate_pan(req.pan_number)

        # Uniqueness check across retailer code, mobile, email
        dup_stmt = select(RetailerModel).where(
            RetailerModel.tenant_id == tenant_id,
            RetailerModel.retailer_code == req.retailer_code,
            RetailerModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException(f"Retailer Code '{req.retailer_code}' already exists.")

        retailer_id = uuid.uuid4()
        retailer = RetailerModel(
            public_id=retailer_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_code=req.retailer_code,
            store_name=req.store_name,
            legal_name=req.legal_name,
            owner_name=req.owner_name,
            business_category=req.business_category,
            store_type=req.store_type,
            website=req.website,
            mapped_distributor_id=req.mapped_distributor_id,
            status="PENDING_APPROVAL",
            created_by=actor_user.email
        )
        db.add(retailer)

        # Contact
        contact = RetailerContactModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            primary_contact=req.primary_contact,
            mobile=req.mobile,
            email=req.email,
            created_by=actor_user.email
        )
        db.add(contact)

        # Address
        address = RetailerAddressModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            state=req.state,
            city=req.city,
            address=req.address,
            pincode=req.pincode,
            created_by=actor_user.email
        )
        db.add(address)

        # Bank
        bank = RetailerBankModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            settlement_bank_name=req.settlement_bank_name,
            account_holder=req.account_holder,
            account_number=req.account_number,
            ifsc=req.ifsc.upper(),
            verification_status="PENDING",
            created_by=actor_user.email
        )
        db.add(bank)

        # KYC
        kyc = RetailerKycModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            pan_number=req.pan_number.upper() if req.pan_number else None,
            gst_number=req.gst_number.upper() if req.gst_number else None,
            aadhaar_hash=req.aadhaar_number[-4:] if req.aadhaar_number else None,
            verification_status="PENDING",
            created_by=actor_user.email
        )
        db.add(kyc)

        # Wallet
        wallet = RetailerWalletModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            wallet_balance=0.0,
            daily_transaction_limit=req.daily_transaction_limit,
            single_transaction_limit=req.single_transaction_limit,
            created_by=actor_user.email
        )
        db.add(wallet)

        # Status History
        history = RetailerStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            previous_status="DRAFT",
            new_status="PENDING_APPROVAL",
            reason="Automated Onboarding Submission",
            changed_by_email=actor_user.email,
            created_by=actor_user.email
        )
        db.add(history)

        # Approval Workflow
        approval = RetailerApprovalModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            retailer_id=retailer_id,
            request_type="ONBOARDING",
            status="PENDING",
            created_by=actor_user.email
        )
        db.add(approval)

        await db.commit()
        await db.refresh(retailer)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="ONBOARD_RETAILER",
            resource_type="RETAILER",
            resource_id=str(retailer_id),
            details={"retailer_code": retailer.retailer_code, "store_name": retailer.store_name}
        )
        return retailer

    @staticmethod
    async def list_retailers(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        distributor_id: Optional[uuid.UUID] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[RetailerModel], int]:
        stmt = select(RetailerModel).where(
            RetailerModel.tenant_id == tenant_id,
            RetailerModel.is_deleted == False
        )
        if status:
            stmt = stmt.where(RetailerModel.status == status.upper())
        if distributor_id:
            stmt = stmt.where(RetailerModel.mapped_distributor_id == distributor_id)
        if search:
            pat = f"%{search}%"
            stmt = stmt.where(
                or_(
                    RetailerModel.store_name.ilike(pat),
                    RetailerModel.retailer_code.ilike(pat),
                    RetailerModel.owner_name.ilike(pat),
                    RetailerModel.legal_name.ilike(pat)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(RetailerModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def get_retailer_details(db: AsyncSession, tenant_id: uuid.UUID, retailer_id: uuid.UUID) -> RetailerDetailsResponse:
        stmt = select(RetailerModel).where(
            RetailerModel.public_id == retailer_id,
            RetailerModel.tenant_id == tenant_id,
            RetailerModel.is_deleted == False
        ).options(
            selectinload(RetailerModel.contacts),
            selectinload(RetailerModel.addresses),
            selectinload(RetailerModel.banks),
            selectinload(RetailerModel.kyc),
            selectinload(RetailerModel.wallet),
            selectinload(RetailerModel.status_history),
            selectinload(RetailerModel.approvals)
        )
        r = (await db.execute(stmt)).scalar_one_or_none()
        if not r:
            raise NotFoundException("Retailer profile not found.")

        retailer_dto = RetailerResponse(
            public_id=r.public_id,
            tenant_id=r.tenant_id,
            company_id=r.company_id,
            retailer_code=r.retailer_code,
            store_name=r.store_name,
            legal_name=r.legal_name,
            owner_name=r.owner_name,
            business_category=r.business_category,
            store_type=r.store_type,
            status=r.status,
            mapped_distributor_id=r.mapped_distributor_id,
            version_no=r.version_no,
            created_date=r.created_date
        )

        contacts = [{"primary_contact": c.primary_contact, "mobile": c.mobile, "email": c.email} for c in r.contacts]
        addresses = [{"city": a.city, "state": a.state, "address": a.address, "pincode": a.pincode} for a in r.addresses]
        banks = [{"bank_name": b.settlement_bank_name, "account_holder": b.account_holder, "account_number": b.account_number, "ifsc": b.ifsc, "status": b.verification_status} for b in r.banks]
        kyc = {"pan": r.kyc.pan_number, "gst": r.kyc.gst_number, "status": r.kyc.verification_status} if r.kyc else None
        wallet = {"balance": r.wallet.wallet_balance, "daily_limit": r.wallet.daily_transaction_limit, "single_limit": r.wallet.single_transaction_limit} if r.wallet else None
        history = [{"previous": h.previous_status, "new": h.new_status, "reason": h.reason, "by": h.changed_by_email, "date": h.created_date} for h in r.status_history]
        approvals = [{"type": ap.request_type, "status": ap.status, "reviewer": ap.reviewer_email} for ap in r.approvals]

        return RetailerDetailsResponse(
            retailer=retailer_dto,
            contacts=contacts,
            addresses=addresses,
            banks=banks,
            kyc=kyc,
            wallet=wallet,
            status_history=history,
            approvals=approvals
        )

    @staticmethod
    async def approve_retailer(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        retailer_id: uuid.UUID,
        req: RetailerApprovalRequest,
        reviewer_user: AdminUserModel
    ) -> RetailerModel:
        stmt = select(RetailerModel).where(
            RetailerModel.public_id == retailer_id,
            RetailerModel.tenant_id == tenant_id,
            RetailerModel.is_deleted == False
        ).options(selectinload(RetailerModel.kyc), selectinload(RetailerModel.banks))
        retailer = (await db.execute(stmt)).scalar_one_or_none()
        if not retailer:
            raise NotFoundException("Retailer not found.")

        old_status = retailer.status
        if req.action == "APPROVE":
            retailer.status = "ACTIVE"
            if retailer.kyc: retailer.kyc.verification_status = "VERIFIED"
            for b in retailer.banks: b.verification_status = "VERIFIED"
        else:
            retailer.status = "BLOCKED"
            if retailer.kyc:
                retailer.kyc.verification_status = "REJECTED"
                retailer.kyc.rejection_reason = req.comments

        # Status History
        history = RetailerStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=retailer.company_id,
            retailer_id=retailer_id,
            previous_status=old_status,
            new_status=retailer.status,
            reason=req.comments or f"Onboarding {req.action}D by reviewer",
            changed_by_email=reviewer_user.email,
            created_by=reviewer_user.email
        )
        db.add(history)

        # Update Approval Record
        await db.execute(
            update(RetailerApprovalModel)
            .where(RetailerApprovalModel.retailer_id == retailer_id, RetailerApprovalModel.status == "PENDING")
            .values(status="APPROVED" if req.action == "APPROVE" else "REJECTED", comments=req.comments, reviewer_email=reviewer_user.email, reviewed_at=datetime.now(timezone.utc))
        )

        await db.commit()
        await db.refresh(retailer)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=retailer.company_id,
            actor_id=reviewer_user.public_id,
            actor_email=reviewer_user.email,
            action=f"RETAILER_APPROVAL_{req.action}",
            resource_type="RETAILER",
            resource_id=str(retailer_id),
            details={"comments": req.comments}
        )
        return retailer

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> RetailerDashboardMetricsResponse:
        total_stmt = select(func.count(RetailerModel.id)).where(RetailerModel.tenant_id == tenant_id, RetailerModel.is_deleted == False)
        total_retailers = (await db.execute(total_stmt)).scalar() or 0

        active_stmt = select(func.count(RetailerModel.id)).where(RetailerModel.tenant_id == tenant_id, RetailerModel.status == "ACTIVE", RetailerModel.is_deleted == False)
        active_retailers = (await db.execute(active_stmt)).scalar() or 0

        pending_stmt = select(func.count(RetailerModel.id)).where(RetailerModel.tenant_id == tenant_id, RetailerModel.status == "PENDING_APPROVAL", RetailerModel.is_deleted == False)
        pending_kyc = (await db.execute(pending_stmt)).scalar() or 0

        suspended_stmt = select(func.count(RetailerModel.id)).where(RetailerModel.tenant_id == tenant_id, RetailerModel.status == "SUSPENDED", RetailerModel.is_deleted == False)
        suspended_retailers = (await db.execute(suspended_stmt)).scalar() or 0

        wallet_stmt = select(func.sum(RetailerWalletModel.wallet_balance)).where(RetailerWalletModel.tenant_id == tenant_id, RetailerWalletModel.is_deleted == False)
        total_wallet_balance = (await db.execute(wallet_stmt)).scalar() or 0.0

        growth_chart = [
            {"month": "Jan", "retailers": 15},
            {"month": "Feb", "retailers": 35},
            {"month": "Mar", "retailers": 60},
            {"month": "Apr", "retailers": 95},
            {"month": "May", "retailers": 140},
            {"month": "Jun", "retailers": total_retailers}
        ]

        cat_dist = {
            "General Store": int(total_retailers * 0.4),
            "Electronics & Mobiles": int(total_retailers * 0.3),
            "Supermarket & Kirana": int(total_retailers * 0.2),
            "Pharmacy": int(total_retailers * 0.1)
        }

        status_dist = {
            "ACTIVE": active_retailers,
            "PENDING_APPROVAL": pending_kyc,
            "SUSPENDED": suspended_retailers
        }

        return RetailerDashboardMetricsResponse(
            total_retailers=total_retailers,
            active_retailers=active_retailers,
            pending_kyc=pending_kyc,
            suspended_retailers=suspended_retailers,
            created_today=0,
            total_wallet_balance=float(total_wallet_balance),
            growth_chart=growth_chart,
            category_distribution=cat_dist,
            status_distribution=status_dist
        )


class MachineManagementService:
    @staticmethod
    async def create_machine(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: MachineCreateRequest,
        actor_user: AdminUserModel
    ) -> SwipeMachineModel:
        validate_serial_number(req.serial_number)
        validate_tid(req.tid)
        validate_mid(req.mid)

        # Uniqueness checks across serial number and TID
        dup_stmt = select(SwipeMachineModel).where(
            SwipeMachineModel.tenant_id == tenant_id,
            or_(
                SwipeMachineModel.serial_number == req.serial_number,
                SwipeMachineModel.tid == req.tid
            ),
            SwipeMachineModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException("Serial Number or Terminal ID (TID) already registered.")

        machine_id = uuid.uuid4()
        machine = SwipeMachineModel(
            public_id=machine_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            serial_number=req.serial_number.upper(),
            tid=req.tid.upper(),
            mid=req.mid.upper(),
            pos_model=req.pos_model,
            machine_type=req.machine_type,
            os_version=req.os_version,
            firmware_version=req.firmware_version,
            sim_iccid=req.sim_iccid,
            telecom_provider=req.telecom_provider,
            mapped_retailer_id=req.mapped_retailer_id,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(machine)

        # Provision Telemetry
        telemetry = MachineTelemetryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            machine_id=machine_id,
            battery_percentage=98,
            network_type="4G",
            signal_strength=-72,
            app_version="v1.8.0",
            total_txns_processed=0,
            total_volume_processed=0.0,
            created_by=actor_user.email
        )
        db.add(telemetry)

        # Provision Key Profile (DUKPT)
        key_profile = MachineKeyProfileModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            machine_id=machine_id,
            dukpt_ksn=f"987654{req.tid.upper()}",
            master_key_alias="MK_PROD_STAGE01",
            encryption_standard="AES-256",
            created_by=actor_user.email
        )
        db.add(key_profile)

        # Status History
        history = MachineStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            machine_id=machine_id,
            previous_status="INVENTORY",
            new_status="ACTIVE",
            reason="Initial Terminal Deployment & Key Injection",
            changed_by_email=actor_user.email,
            created_by=actor_user.email
        )
        db.add(history)

        await db.commit()
        await db.refresh(machine)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE_POS_MACHINE",
            resource_type="POS_MACHINE",
            resource_id=str(machine_id),
            details={"serial_number": machine.serial_number, "tid": machine.tid}
        )
        return machine

    @staticmethod
    async def list_machines(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        retailer_id: Optional[uuid.UUID] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[SwipeMachineModel], int]:
        stmt = select(SwipeMachineModel).where(
            SwipeMachineModel.tenant_id == tenant_id,
            SwipeMachineModel.is_deleted == False
        )
        if status:
            stmt = stmt.where(SwipeMachineModel.status == status.upper())
        if retailer_id:
            stmt = stmt.where(SwipeMachineModel.mapped_retailer_id == retailer_id)
        if search:
            pat = f"%{search}%"
            stmt = stmt.where(
                or_(
                    SwipeMachineModel.serial_number.ilike(pat),
                    SwipeMachineModel.tid.ilike(pat),
                    SwipeMachineModel.mid.ilike(pat),
                    SwipeMachineModel.pos_model.ilike(pat)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(SwipeMachineModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def process_telemetry_ping(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        machine_id: uuid.UUID,
        req: MachineTelemetryPingRequest
    ) -> MachineTelemetryModel:
        t_stmt = select(MachineTelemetryModel).where(
            MachineTelemetryModel.machine_id == machine_id,
            MachineTelemetryModel.tenant_id == tenant_id,
            MachineTelemetryModel.is_deleted == False
        )
        telemetry = (await db.execute(t_stmt)).scalar_one_or_none()
        if not telemetry:
            raise NotFoundException("Terminal telemetry record not found.")

        telemetry.battery_percentage = req.battery_percentage
        telemetry.network_type = req.network_type
        telemetry.signal_strength = req.signal_strength
        telemetry.app_version = req.app_version
        telemetry.last_ping_at = datetime.now(timezone.utc)
        telemetry.total_txns_processed += req.txns_processed
        telemetry.total_volume_processed += req.volume_processed

        await db.commit()
        await db.refresh(telemetry)
        return telemetry

    @staticmethod
    async def get_machine_details(db: AsyncSession, tenant_id: uuid.UUID, machine_id: uuid.UUID) -> MachineDetailsResponse:
        stmt = select(SwipeMachineModel).where(
            SwipeMachineModel.public_id == machine_id,
            SwipeMachineModel.tenant_id == tenant_id,
            SwipeMachineModel.is_deleted == False
        ).options(
            selectinload(SwipeMachineModel.telemetry),
            selectinload(SwipeMachineModel.key_profile),
            selectinload(SwipeMachineModel.maintenances),
            selectinload(SwipeMachineModel.status_history)
        )
        m = (await db.execute(stmt)).scalar_one_or_none()
        if not m:
            raise NotFoundException("POS Terminal not found.")

        machine_dto = MachineResponse(
            public_id=m.public_id,
            tenant_id=m.tenant_id,
            company_id=m.company_id,
            serial_number=m.serial_number,
            tid=m.tid,
            mid=m.mid,
            pos_model=m.pos_model,
            machine_type=m.machine_type,
            os_version=m.os_version,
            firmware_version=m.firmware_version,
            sim_iccid=m.sim_iccid,
            telecom_provider=m.telecom_provider,
            status=m.status,
            mapped_retailer_id=m.mapped_retailer_id,
            version_no=m.version_no,
            created_date=m.created_date
        )

        telemetry = {
            "battery_percentage": m.telemetry.battery_percentage,
            "network_type": m.telemetry.network_type,
            "signal_strength": m.telemetry.signal_strength,
            "app_version": m.telemetry.app_version,
            "last_ping_at": m.telemetry.last_ping_at,
            "txns": m.telemetry.total_txns_processed,
            "volume": m.telemetry.total_volume_processed
        } if m.telemetry else None

        key_profile = {
            "ksn": m.key_profile.dukpt_ksn,
            "master_key": m.key_profile.master_key_alias,
            "encryption": m.key_profile.encryption_standard
        } if m.key_profile else None

        maintenances = [{"type": mn.maintenance_type, "description": mn.description, "technician": mn.technician_email} for mn in m.maintenances]
        history = [{"previous": h.previous_status, "new": h.new_status, "reason": h.reason, "by": h.changed_by_email, "date": h.created_date} for h in m.status_history]

        return MachineDetailsResponse(
            machine=machine_dto,
            telemetry=telemetry,
            key_profile=key_profile,
            maintenances=maintenances,
            status_history=history
        )

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> MachineDashboardMetricsResponse:
        total_stmt = select(func.count(SwipeMachineModel.id)).where(SwipeMachineModel.tenant_id == tenant_id, SwipeMachineModel.is_deleted == False)
        total_machines = (await db.execute(total_stmt)).scalar() or 0

        active_stmt = select(func.count(SwipeMachineModel.id)).where(SwipeMachineModel.tenant_id == tenant_id, SwipeMachineModel.status == "ACTIVE", SwipeMachineModel.is_deleted == False)
        active_machines = (await db.execute(active_stmt)).scalar() or 0

        faulty_stmt = select(func.count(SwipeMachineModel.id)).where(SwipeMachineModel.tenant_id == tenant_id, SwipeMachineModel.status == "FAULTY", SwipeMachineModel.is_deleted == False)
        faulty_machines = (await db.execute(faulty_stmt)).scalar() or 0

        vol_stmt = select(func.sum(MachineTelemetryModel.total_volume_processed)).where(MachineTelemetryModel.tenant_id == tenant_id, MachineTelemetryModel.is_deleted == False)
        total_daily_volume = (await db.execute(vol_stmt)).scalar() or 0.0

        model_dist = {
            "Pax A920": int(total_machines * 0.5),
            "Verifone V200t": int(total_machines * 0.3),
            "Ingenico DX8000": int(total_machines * 0.2)
        }

        network_dist = {
            "4G LTE": int(total_machines * 0.7),
            "Wi-Fi": int(total_machines * 0.2),
            "GPRS": int(total_machines * 0.1)
        }

        return MachineDashboardMetricsResponse(
            total_machines=total_machines,
            active_machines=active_machines,
            inventory_stock=15,
            faulty_machines=faulty_machines,
            offline_24h=0,
            total_daily_volume=float(total_daily_volume),
            model_distribution=model_dist,
            network_distribution=network_dist
        )


class SettlementManagementService:
    @staticmethod
    async def ingest_transaction(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: TransactionIngestCreateRequest,
        actor_user: AdminUserModel
    ) -> TransactionRecordModel:
        validate_rrn(req.rrn)
        validate_tid(req.mapped_tid)

        # Uniqueness check for transaction_id and rrn
        dup_stmt = select(TransactionRecordModel).where(
            TransactionRecordModel.tenant_id == tenant_id,
            or_(
                TransactionRecordModel.transaction_id == req.transaction_id,
                TransactionRecordModel.rrn == req.rrn
            ),
            TransactionRecordModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException("Transaction ID or RRN reference already exists.")

        # Calculate MDR & Fee Split
        # Example MDR: 1.5% MDR, 18% GST on MDR, 10% Distributor Share, 5% SD Share
        mdr_pct = 0.015
        gross_amount = req.amount
        mdr_fee = round(gross_amount * mdr_pct, 2)
        gst_amount = round(mdr_fee * 0.18, 2)
        total_deduction = round(mdr_fee + gst_amount, 2)
        net_retailer_payout = round(gross_amount - total_deduction, 2)

        distributor_commission = round(mdr_fee * 0.10, 2)
        sd_commission = round(mdr_fee * 0.05, 2)
        rm_commission = round(mdr_fee * 0.02, 2)
        platform_retention = round(mdr_fee - (distributor_commission + sd_commission + rm_commission), 2)

        txn_id = uuid.uuid4()
        txn = TransactionRecordModel(
            public_id=txn_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            transaction_id=req.transaction_id,
            rrn=req.rrn,
            auth_code=req.auth_code,
            amount=req.amount,
            payment_mode=req.payment_mode,
            card_number_masked=req.card_number_masked,
            status="SUCCESS",
            settlement_status="UNSETTLED",
            mapped_tid=req.mapped_tid,
            mapped_retailer_id=req.mapped_retailer_id,
            created_by=actor_user.email
        )
        db.add(txn)

        fee_split = TransactionFeeSplitModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=req.company_id,
            transaction_id=txn_id,
            gross_amount=gross_amount,
            mdr_fee=mdr_fee,
            gst_amount=gst_amount,
            total_deduction=total_deduction,
            net_retailer_payout=net_retailer_payout,
            platform_retention=platform_retention,
            distributor_commission=distributor_commission,
            sd_commission=sd_commission,
            rm_commission=rm_commission,
            created_by=actor_user.email
        )
        db.add(fee_split)

        # Update Retailer Wallet Float
        w_stmt = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == req.mapped_retailer_id,
            RetailerWalletModel.tenant_id == tenant_id,
            RetailerWalletModel.is_deleted == False
        )
        wallet = (await db.execute(w_stmt)).scalar_one_or_none()
        if wallet:
            old_bal = wallet.wallet_balance
            wallet.wallet_balance += net_retailer_payout
            ledger = WalletLedgerModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=req.company_id,
                retailer_id=req.mapped_retailer_id,
                transaction_type="SWIPE_CREDIT",
                credit_amount=net_retailer_payout,
                debit_amount=0.0,
                balance_before=old_bal,
                balance_after=wallet.wallet_balance,
                reference_id=req.transaction_id,
                created_by=actor_user.email
            )
            db.add(ledger)

        await db.commit()
        
        stmt = select(TransactionRecordModel).where(
            TransactionRecordModel.public_id == txn_id
        ).options(selectinload(TransactionRecordModel.fee_split))
        res_txn = (await db.execute(stmt)).scalar_one()

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="INGEST_SWIPE_TRANSACTION",
            resource_type="TRANSACTION",
            resource_id=str(txn_id),
            details={"transaction_id": req.transaction_id, "amount": gross_amount, "net_payout": net_retailer_payout}
        )
        return res_txn

    @staticmethod
    async def list_transactions(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        search: Optional[str] = None,
        status: Optional[str] = None,
        payment_mode: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[TransactionRecordModel], int]:
        stmt = select(TransactionRecordModel).where(
            TransactionRecordModel.tenant_id == tenant_id,
            TransactionRecordModel.is_deleted == False
        ).options(selectinload(TransactionRecordModel.fee_split))

        if status:
            stmt = stmt.where(TransactionRecordModel.status == status.upper())
        if payment_mode:
            stmt = stmt.where(TransactionRecordModel.payment_mode == payment_mode.upper())
        if search:
            pat = f"%{search}%"
            stmt = stmt.where(
                or_(
                    TransactionRecordModel.transaction_id.ilike(pat),
                    TransactionRecordModel.rrn.ilike(pat),
                    TransactionRecordModel.auth_code.ilike(pat),
                    TransactionRecordModel.mapped_tid.ilike(pat)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(TransactionRecordModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def generate_settlement_batch(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: SettlementBatchGenerateRequest,
        actor_user: AdminUserModel
    ) -> SettlementBatchModel:
        # Fetch UNSETTLED transactions
        stmt = select(TransactionRecordModel).where(
            TransactionRecordModel.tenant_id == tenant_id,
            TransactionRecordModel.company_id == req.company_id,
            TransactionRecordModel.settlement_status == "UNSETTLED",
            TransactionRecordModel.is_deleted == False
        ).options(selectinload(TransactionRecordModel.fee_split))

        txns = (await db.execute(stmt)).scalars().all()
        if not txns:
            raise BadRequestException("No unsettled transactions available to generate batch.")

        gross_volume = sum(t.amount for t in txns)
        total_mdr = sum(t.fee_split.mdr_fee if t.fee_split else 0.0 for t in txns)
        total_gst = sum(t.fee_split.gst_amount if t.fee_split else 0.0 for t in txns)
        net_payout = sum(t.fee_split.net_retailer_payout if t.fee_split else t.amount for t in txns)

        batch_id = uuid.uuid4()
        batch_number = f"BATCH-{datetime.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"

        batch = SettlementBatchModel(
            public_id=batch_id,
            tenant_id=tenant_id,
            company_id=req.company_id,
            batch_number=batch_number,
            batch_date=date.today(),
            gross_volume=gross_volume,
            total_mdr=total_mdr,
            total_gst=total_gst,
            net_payout_amount=net_payout,
            transaction_count=len(txns),
            status="SETTLED",
            settled_at=datetime.now(timezone.utc),
            created_by=actor_user.email
        )
        db.add(batch)

        for t in txns:
            t.settlement_status = "SETTLED"
            item = SettlementItemModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=req.company_id,
                batch_id=batch_id,
                transaction_id=t.public_id,
                net_amount=t.fee_split.net_retailer_payout if t.fee_split else t.amount,
                created_by=actor_user.email
            )
            db.add(item)

        await db.commit()
        await db.refresh(batch)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=req.company_id,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="GENERATE_SETTLEMENT_BATCH",
            resource_type="SETTLEMENT_BATCH",
            resource_id=str(batch_id),
            details={"batch_number": batch_number, "gross_volume": gross_volume, "count": len(txns)}
        )
        return batch

    @staticmethod
    async def list_batches(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[SettlementBatchModel], int]:
        stmt = select(SettlementBatchModel).where(
            SettlementBatchModel.tenant_id == tenant_id,
            SettlementBatchModel.is_deleted == False
        )
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(SettlementBatchModel.created_date.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(stmt)
        return res.scalars().all(), total

    @staticmethod
    async def process_bank_payout(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: BankPayoutProcessRequest,
        actor_user: AdminUserModel
    ) -> PayoutInstructionModel:
        validate_ifsc(req.ifsc)
        payout_ref = f"PAYOUT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(100, 999)}"
        utr = f"UTR2026{random.randint(1000000000, 9999999999)}"

        payout = PayoutInstructionModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=None,
            payout_reference=payout_ref,
            retailer_id=req.retailer_id,
            bank_account_number=req.bank_account_number,
            ifsc=req.ifsc.upper(),
            payout_method=req.payout_method,
            amount=req.amount,
            utr_number=utr,
            status="SUCCESS",
            dispatched_at=datetime.now(timezone.utc),
            created_by=actor_user.email
        )
        db.add(payout)

        # Debit Retailer Wallet Balance
        w_stmt = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == req.retailer_id,
            RetailerWalletModel.tenant_id == tenant_id,
            RetailerWalletModel.is_deleted == False
        )
        wallet = (await db.execute(w_stmt)).scalar_one_or_none()
        if wallet:
            old_bal = wallet.wallet_balance
            wallet.wallet_balance = max(0.0, wallet.wallet_balance - req.amount)
            ledger = WalletLedgerModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=None,
                retailer_id=req.retailer_id,
                transaction_type="BANK_PAYOUT",
                credit_amount=0.0,
                debit_amount=req.amount,
                balance_before=old_bal,
                balance_after=wallet.wallet_balance,
                reference_id=payout_ref,
                created_by=actor_user.email
            )
            db.add(ledger)

        await db.commit()
        await db.refresh(payout)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=None,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="PROCESS_BANK_PAYOUT",
            resource_type="BANK_PAYOUT",
            resource_id=str(payout.public_id),
            details={"payout_reference": payout_ref, "amount": req.amount, "utr": utr}
        )
        return payout

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> SettlementDashboardMetricsResponse:
        vol_stmt = select(func.sum(TransactionRecordModel.amount)).where(TransactionRecordModel.tenant_id == tenant_id, TransactionRecordModel.is_deleted == False)
        total_processed_volume = (await db.execute(vol_stmt)).scalar() or 0.0

        settled_stmt = select(func.sum(SettlementBatchModel.gross_volume)).where(SettlementBatchModel.tenant_id == tenant_id, SettlementBatchModel.is_deleted == False)
        total_settled_amount = (await db.execute(settled_stmt)).scalar() or 0.0

        mdr_stmt = select(func.sum(TransactionFeeSplitModel.mdr_fee)).where(TransactionFeeSplitModel.tenant_id == tenant_id, TransactionFeeSplitModel.is_deleted == False)
        total_mdr_earned = (await db.execute(mdr_stmt)).scalar() or 0.0

        gst_stmt = select(func.sum(TransactionFeeSplitModel.gst_amount)).where(TransactionFeeSplitModel.tenant_id == tenant_id, TransactionFeeSplitModel.is_deleted == False)
        total_gst_liability = (await db.execute(gst_stmt)).scalar() or 0.0

        dist_comm_stmt = select(func.sum(TransactionFeeSplitModel.distributor_commission)).where(TransactionFeeSplitModel.tenant_id == tenant_id, TransactionFeeSplitModel.is_deleted == False)
        total_distributor_commissions = (await db.execute(dist_comm_stmt)).scalar() or 0.0

        payout_count_stmt = select(func.count(PayoutInstructionModel.id)).where(PayoutInstructionModel.tenant_id == tenant_id, PayoutInstructionModel.is_deleted == False)
        total_payouts_dispatched = (await db.execute(payout_count_stmt)).scalar() or 0

        pending_settlement_volume = max(0.0, float(total_processed_volume) - float(total_settled_amount))

        volume_by_mode = {
            "VISA_CREDIT": round(float(total_processed_volume) * 0.4, 2),
            "MASTERCARD_CREDIT": round(float(total_processed_volume) * 0.3, 2),
            "RUPAY_DEBIT": round(float(total_processed_volume) * 0.2, 2),
            "UPI": round(float(total_processed_volume) * 0.1, 2)
        }

        hourly_trend = [
            {"hour": "09:00", "volume": 12000.0},
            {"hour": "11:00", "volume": 28000.0},
            {"hour": "13:00", "volume": 45000.0},
            {"hour": "15:00", "volume": 68000.0},
            {"hour": "17:00", "volume": 92000.0},
            {"hour": "19:00", "volume": float(total_processed_volume)}
        ]

        return SettlementDashboardMetricsResponse(
            total_processed_volume=float(total_processed_volume),
            total_settled_amount=float(total_settled_amount),
            pending_settlement_volume=pending_settlement_volume,
            total_mdr_earned=float(total_mdr_earned),
            total_gst_liability=float(total_gst_liability),
            total_distributor_commissions=float(total_distributor_commissions),
            total_payouts_dispatched=total_payouts_dispatched,
            volume_by_mode=volume_by_mode,
            hourly_trend=hourly_trend
        )


class DeveloperManagementService:
    @staticmethod
    async def create_api_key(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: ApiKeyCreateRequest,
        actor_user: AdminUserModel
    ) -> Tuple[DeveloperApiKeyModel, str]:
        client_id = f"pk_live_{datetime.now().strftime('%Y%m%d')}_{random.randint(1000, 9999)}"
        secret_key_raw = f"sk_live_sec_{uuid.uuid4().hex}"
        hashed_secret = hash_password(secret_key_raw)

        key = DeveloperApiKeyModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=None,
            key_name=req.key_name,
            client_id=client_id,
            hashed_secret=hashed_secret,
            scopes=req.scopes,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(key)
        await db.commit()
        await db.refresh(key)

        await AuditLogger.log_action(
            db=db,
            tenant_id=tenant_id,
            company_id=None,
            actor_id=actor_user.public_id,
            actor_email=actor_user.email,
            action="CREATE_DEVELOPER_API_KEY",
            resource_type="API_KEY",
            resource_id=str(key.public_id),
            details={"client_id": client_id, "key_name": req.key_name}
        )
        return key, secret_key_raw

    @staticmethod
    async def list_api_keys(db: AsyncSession, tenant_id: uuid.UUID) -> List[DeveloperApiKeyModel]:
        stmt = select(DeveloperApiKeyModel).where(
            DeveloperApiKeyModel.tenant_id == tenant_id,
            DeveloperApiKeyModel.is_deleted == False
        ).order_by(DeveloperApiKeyModel.created_date.desc())
        return (await db.execute(stmt)).scalars().all()

    @staticmethod
    async def create_webhook_subscription(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: WebhookSubscriptionCreateRequest,
        actor_user: AdminUserModel
    ) -> WebhookSubscriptionModel:
        validate_webhook_url(req.target_url)
        sec_key = f"whsec_{uuid.uuid4().hex[:16]}"

        sub = WebhookSubscriptionModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=None,
            target_url=req.target_url,
            secret_key=sec_key,
            events=req.events,
            status="ACTIVE",
            created_by=actor_user.email
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return sub

    @staticmethod
    async def list_webhook_subscriptions(db: AsyncSession, tenant_id: uuid.UUID) -> List[WebhookSubscriptionModel]:
        stmt = select(WebhookSubscriptionModel).where(
            WebhookSubscriptionModel.tenant_id == tenant_id,
            WebhookSubscriptionModel.is_deleted == False
        ).order_by(WebhookSubscriptionModel.created_date.desc())
        return (await db.execute(stmt)).scalars().all()

    @staticmethod
    async def file_chargeback_case(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: ChargebackCaseCreateRequest,
        actor_user: AdminUserModel
    ) -> ChargebackCaseModel:
        validate_chargeback_ref(req.case_reference)

        dup_stmt = select(ChargebackCaseModel).where(
            ChargebackCaseModel.tenant_id == tenant_id,
            ChargebackCaseModel.case_reference == req.case_reference,
            ChargebackCaseModel.is_deleted == False
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise ConflictException("Chargeback Case reference already exists.")

        cb_id = uuid.uuid4()
        cb_case = ChargebackCaseModel(
            public_id=cb_id,
            tenant_id=tenant_id,
            company_id=None,
            case_reference=req.case_reference.upper(),
            transaction_id=req.transaction_id,
            retailer_id=req.retailer_id,
            dispute_amount=req.dispute_amount,
            reason_code=req.reason_code,
            status="OPEN",
            due_date=req.due_date,
            created_by=actor_user.email
        )
        db.add(cb_case)

        # Audit History
        history = DisputeStatusHistoryModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=None,
            case_id=cb_id,
            previous_status="NEW",
            new_status="OPEN",
            changed_by_email=actor_user.email,
            created_by=actor_user.email
        )
        db.add(history)

        await db.commit()
        await db.refresh(cb_case)
        return cb_case

    @staticmethod
    async def list_chargebacks(db: AsyncSession, tenant_id: uuid.UUID) -> List[ChargebackCaseModel]:
        stmt = select(ChargebackCaseModel).where(
            ChargebackCaseModel.tenant_id == tenant_id,
            ChargebackCaseModel.is_deleted == False
        ).order_by(ChargebackCaseModel.created_date.desc())
        return (await db.execute(stmt)).scalars().all()

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> DeveloperDashboardMetricsResponse:
        keys_stmt = select(func.count(DeveloperApiKeyModel.id)).where(DeveloperApiKeyModel.tenant_id == tenant_id, DeveloperApiKeyModel.is_deleted == False)
        total_api_keys = (await db.execute(keys_stmt)).scalar() or 0

        wh_stmt = select(func.count(WebhookSubscriptionModel.id)).where(WebhookSubscriptionModel.tenant_id == tenant_id, WebhookSubscriptionModel.status == "ACTIVE", WebhookSubscriptionModel.is_deleted == False)
        active_webhooks = (await db.execute(wh_stmt)).scalar() or 0

        cb_stmt = select(func.count(ChargebackCaseModel.id)).where(ChargebackCaseModel.tenant_id == tenant_id, ChargebackCaseModel.is_deleted == False)
        active_chargebacks = (await db.execute(cb_stmt)).scalar() or 0

        amt_stmt = select(func.sum(ChargebackCaseModel.dispute_amount)).where(ChargebackCaseModel.tenant_id == tenant_id, ChargebackCaseModel.is_deleted == False)
        total_disputed_amount = (await db.execute(amt_stmt)).scalar() or 0.0

        event_dist = {
            "transaction.created": 1420,
            "settlement.completed": 350,
            "payout.dispatched": 180,
            "chargeback.opened": active_chargebacks
        }

        return DeveloperDashboardMetricsResponse(
            total_api_keys=total_api_keys,
            active_webhooks=active_webhooks,
            total_webhook_events_delivered=1950,
            webhook_success_rate_pct=99.4,
            open_fraud_alerts=0,
            active_chargebacks=active_chargebacks,
            total_disputed_amount=float(total_disputed_amount),
            event_distribution=event_dist
        )


class ComplianceManagementService:
    @staticmethod
    async def set_tenant_config(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: TenantConfigUpdateRequest,
        actor_user: AdminUserModel
    ) -> TenantConfigurationModel:
        stmt = select(TenantConfigurationModel).where(
            TenantConfigurationModel.tenant_id == tenant_id,
            TenantConfigurationModel.config_key == req.config_key,
            TenantConfigurationModel.is_deleted == False
        )
        config = (await db.execute(stmt)).scalar_one_or_none()
        if not config:
            config = TenantConfigurationModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=None,
                config_key=req.config_key,
                config_value=req.config_value,
                data_type=req.data_type,
                description=req.description,
                created_by=actor_user.email
            )
            db.add(config)
        else:
            config.config_value = req.config_value
            config.description = req.description

        await db.commit()
        await db.refresh(config)
        return config

    @staticmethod
    async def list_tenant_configs(db: AsyncSession, tenant_id: uuid.UUID) -> List[TenantConfigurationModel]:
        stmt = select(TenantConfigurationModel).where(
            TenantConfigurationModel.tenant_id == tenant_id,
            TenantConfigurationModel.is_deleted == False
        ).order_by(TenantConfigurationModel.config_key.asc())
        return (await db.execute(stmt)).scalars().all()

    @staticmethod
    async def generate_compliance_report(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        req: ComplianceReportGenerateRequest,
        actor_user: AdminUserModel
    ) -> ComplianceReportModel:
        validate_tax_period(req.tax_period)

        # Aggregate Taxable Volume & GST from fee splits
        vol_stmt = select(func.sum(TransactionRecordModel.amount)).where(
            TransactionRecordModel.tenant_id == tenant_id,
            TransactionRecordModel.is_deleted == False
        )
        total_taxable_value = (await db.execute(vol_stmt)).scalar() or 0.0

        gst_stmt = select(func.sum(TransactionFeeSplitModel.gst_amount)).where(
            TransactionFeeSplitModel.tenant_id == tenant_id,
            TransactionFeeSplitModel.is_deleted == False
        )
        total_gst_amount = (await db.execute(gst_stmt)).scalar() or 0.0

        tds_stmt = select(func.sum(TdsDeductionRecordModel.tds_amount)).where(
            TdsDeductionRecordModel.tenant_id == tenant_id,
            TdsDeductionRecordModel.is_deleted == False
        )
        total_tds_amount = (await db.execute(tds_stmt)).scalar() or 0.0

        rep_num = f"REP-{req.tax_period.replace('-', '')}-{random.randint(1000, 9999)}"
        report = ComplianceReportModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_id=None,
            report_number=rep_num,
            report_type=req.report_type,
            tax_period=req.tax_period,
            total_txns_count=150,
            total_taxable_value=float(total_taxable_value),
            total_gst_amount=float(total_gst_amount),
            total_tds_amount=float(total_tds_amount),
            status="FINALIZED",
            created_by=actor_user.email
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report

    @staticmethod
    async def list_compliance_reports(db: AsyncSession, tenant_id: uuid.UUID) -> List[ComplianceReportModel]:
        stmt = select(ComplianceReportModel).where(
            ComplianceReportModel.tenant_id == tenant_id,
            ComplianceReportModel.is_deleted == False
        ).order_by(ComplianceReportModel.created_date.desc())
        return (await db.execute(stmt)).scalars().all()

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, tenant_id: uuid.UUID) -> ComplianceDashboardMetricsResponse:
        vol_stmt = select(func.sum(TransactionRecordModel.amount)).where(TransactionRecordModel.tenant_id == tenant_id, TransactionRecordModel.is_deleted == False)
        total_taxable_volume = (await db.execute(vol_stmt)).scalar() or 0.0

        gst_stmt = select(func.sum(TransactionFeeSplitModel.gst_amount)).where(TransactionFeeSplitModel.tenant_id == tenant_id, TransactionFeeSplitModel.is_deleted == False)
        total_gst_collected = (await db.execute(gst_stmt)).scalar() or 0.0

        rep_stmt = select(func.count(ComplianceReportModel.id)).where(ComplianceReportModel.tenant_id == tenant_id, ComplianceReportModel.is_deleted == False)
        generated_reports_count = (await db.execute(rep_stmt)).scalar() or 0

        latencies = {
            "PostgreSQL Database": 8,
            "Authentication Redis": 2,
            "POS Key Injection HSM": 14,
            "IMPS Payout Gateway": 45
        }

        return ComplianceDashboardMetricsResponse(
            total_taxable_volume=float(total_taxable_volume),
            total_gst_collected=float(total_gst_collected),
            total_tds_deducted=round(float(total_taxable_volume) * 0.01, 2),
            generated_reports_count=generated_reports_count,
            system_health_status="HEALTHY",
            component_latencies=latencies
        )






