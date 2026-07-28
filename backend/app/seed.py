import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.infrastructure.db.models import (
    TenantModel, CompanyModel, AdminUserModel, RoleModel, PermissionModel,
    RolePermissionModel, UserRoleModel, SystemConfigurationModel,
    CompanyContactModel, CompanyAddressModel, CompanyBankModel,
    CompanyBrandingModel, CompanySettingModel, CompanySubscriptionModel, CompanyConfigurationModel
)


PERMISSIONS_DATA = [
    # Tenant Permissions
    {"code": "create:tenant", "name": "Create Tenant", "module": "TENANT", "action": "CREATE"},
    {"code": "read:tenant", "name": "Read Tenant", "module": "TENANT", "action": "READ"},
    {"code": "update:tenant", "name": "Update Tenant", "module": "TENANT", "action": "UPDATE"},
    {"code": "delete:tenant", "name": "Delete Tenant", "module": "TENANT", "action": "DELETE"},
    {"code": "manage:tenant", "name": "Manage Tenant", "module": "TENANT", "action": "MANAGE"},

    # Company Permissions
    {"code": "create:company", "name": "Create Company", "module": "COMPANY", "action": "CREATE"},
    {"code": "read:company", "name": "Read Company", "module": "COMPANY", "action": "READ"},
    {"code": "update:company", "name": "Update Company", "module": "COMPANY", "action": "UPDATE"},
    {"code": "delete:company", "name": "Delete Company", "module": "COMPANY", "action": "DELETE"},
    {"code": "approve:company", "name": "Approve Company Onboarding", "module": "COMPANY", "action": "APPROVE"},
    {"code": "suspend:company", "name": "Suspend Company", "module": "COMPANY", "action": "UPDATE"},
    {"code": "manage:company", "name": "Manage Company", "module": "COMPANY", "action": "MANAGE"},

    # User Permissions
    {"code": "create:user", "name": "Create User", "module": "USER", "action": "CREATE"},
    {"code": "read:user", "name": "Read User", "module": "USER", "action": "READ"},
    {"code": "update:user", "name": "Update User", "module": "USER", "action": "UPDATE"},
    {"code": "delete:user", "name": "Delete User", "module": "USER", "action": "DELETE"},

    # Role & RBAC Permissions
    {"code": "create:role", "name": "Create Role", "module": "ROLE", "action": "CREATE"},
    {"code": "read:role", "name": "Read Role", "module": "ROLE", "action": "READ"},
    {"code": "update:role", "name": "Update Role", "module": "ROLE", "action": "UPDATE"},
    {"code": "delete:role", "name": "Delete Role", "module": "ROLE", "action": "DELETE"},

    # Audit Log Permissions
    {"code": "read:audit_log", "name": "Read Audit Logs", "module": "AUDIT_LOG", "action": "READ"},
    {"code": "export:audit_log", "name": "Export Audit Logs", "module": "AUDIT_LOG", "action": "EXPORT"},

    # Settings Permissions
    {"code": "read:setting", "name": "Read Settings", "module": "SETTING", "action": "READ"},
    {"code": "update:setting", "name": "Update Settings", "module": "SETTING", "action": "UPDATE"},

    # Dashboard Permissions
    {"code": "read:dashboard", "name": "Read Dashboard", "module": "DASHBOARD", "action": "READ"},
]


ROLES_DATA = [
    {"code": "PLATFORM_ADMIN", "name": "Platform Admin", "description": "Full access to all platform resources and tenant onboarding"},
    {"code": "COMPANY_ADMIN", "name": "Company Admin", "description": "Manage company level users, settings, and operations"},
    {"code": "FINANCE_ADMIN", "name": "Finance Admin", "description": "Financial operations, settlement approvals & reports"},
    {"code": "OPERATIONS_ADMIN", "name": "Operations Admin", "description": "Day-to-day platform operation management"},
    {"code": "AUDITOR", "name": "Auditor", "description": "Read-only compliance & audit trail access"},
    {"code": "SUPPORT", "name": "Support", "description": "Customer support and operational helpdesk role"},
]


async def seed_database():
    async with AsyncSessionLocal() as db:
        print("--- SEEDING FOUNDATIONAL & EPIC-002 DATA ---")

        # 1. Seed Permissions
        perm_map = {}
        for pdata in PERMISSIONS_DATA:
            stmt = select(PermissionModel).where(PermissionModel.code == pdata["code"])
            perm = (await db.execute(stmt)).scalar_one_or_none()
            if not perm:
                perm = PermissionModel(
                    public_id=uuid.uuid4(),
                    tenant_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                    code=pdata["code"],
                    name=pdata["name"],
                    module=pdata["module"],
                    action=pdata["action"]
                )
                db.add(perm)
                await db.flush()
            perm_map[pdata["code"]] = perm
        print(f"Seeded {len(perm_map)} system permissions.")

        # 2. Seed Platform Root Tenant
        tenant_stmt = select(TenantModel).where(TenantModel.code == "PLATFORM")
        tenant = (await db.execute(tenant_stmt)).scalar_one_or_none()
        if not tenant:
            tenant_uuid = uuid.uuid4()
            tenant = TenantModel(
                public_id=tenant_uuid,
                tenant_id=tenant_uuid,
                name="Platform Root Tenant",
                code="PLATFORM",
                description="Root tenant for platform administration",
                status="ACTIVE"
            )
            db.add(tenant)
            await db.flush()
        print(f"Platform Tenant UUID: {tenant.public_id}")

        # 3. Seed Default Company
        comp_stmt = select(CompanyModel).where(CompanyModel.tenant_id == tenant.public_id, CompanyModel.company_code == "HQ_COMP")
        company = (await db.execute(comp_stmt)).scalar_one_or_none()
        if not company:
            comp_uuid = uuid.uuid4()
            company = CompanyModel(
                public_id=comp_uuid,
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                company_code="HQ_COMP",
                company_name="Platform HQ Enterprise Ltd",
                legal_name="Platform HQ Enterprise Private Limited",
                display_name="Pay2Pay Enterprise HQ",
                tenant_code="PLATFORM",
                company_type="PRIVATE_LIMITED",
                industry="Retail Technology",
                business_category="Payment Aggregation",
                gst_number="22AAAAA0000A1Z5",
                pan_number="AAAAA0000A",
                cin_number="U72900MH2026PTC123456",
                status="ACTIVE"
            )
            db.add(company)
            await db.flush()

            # Add Contact & Address & Bank
            contact = CompanyContactModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                primary_contact="Platform Super Admin",
                designation="Managing Director",
                mobile="9876543210",
                email="admin@pay2pay.com"
            )
            address = CompanyAddressModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                address_type="REGISTERED",
                country="India",
                state="Maharashtra",
                city="Mumbai",
                address="Enterprise Tech Park, Bandra Kurla Complex",
                pincode="400051"
            )
            bank = CompanyBankModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                settlement_bank_name="HDFC Bank Ltd",
                account_holder="Platform HQ Enterprise Private Limited",
                account_number="50200012345678",
                ifsc="HDFC0000060",
                verification_status="VERIFIED"
            )
            branding = CompanyBrandingModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                primary_colour="#3b82f6",
                secondary_colour="#1e293b"
            )
            setting = CompanySettingModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                currency="INR",
                timezone="Asia/Kolkata"
            )
            subscription = CompanySubscriptionModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=comp_uuid,
                plan_name="ENTERPRISE",
                maximum_retailers=10000,
                maximum_machines=50000,
                status="ACTIVE"
            )
            db.add_all([contact, address, bank, branding, setting, subscription])
            await db.flush()

        # 4. Seed Roles & Role-Permissions
        role_map = {}
        for rdata in ROLES_DATA:
            stmt = select(RoleModel).where(RoleModel.tenant_id == tenant.public_id, RoleModel.code == rdata["code"])
            role = (await db.execute(stmt)).scalar_one_or_none()
            if not role:
                role = RoleModel(
                    public_id=uuid.uuid4(),
                    tenant_id=tenant.public_id,
                    name=rdata["name"],
                    code=rdata["code"],
                    description=rdata["description"],
                    is_system=True
                )
                db.add(role)
                await db.flush()

                for p_code, p_obj in perm_map.items():
                    if rdata["code"] == "PLATFORM_ADMIN":
                        rp = RolePermissionModel(
                            public_id=uuid.uuid4(),
                            tenant_id=tenant.public_id,
                            role_id=role.id,
                            permission_id=p_obj.id
                        )
                        db.add(rp)
                    elif rdata["code"] in ("COMPANY_ADMIN", "OPERATIONS_ADMIN") and not p_code.startswith("manage:tenant"):
                        rp = RolePermissionModel(
                            public_id=uuid.uuid4(),
                            tenant_id=tenant.public_id,
                            role_id=role.id,
                            permission_id=p_obj.id
                        )
                        db.add(rp)

            role_map[rdata["code"]] = role
        print(f"Seeded {len(role_map)} enterprise roles.")

        # 5. Seed Platform Root Super Admin User
        user_stmt = select(AdminUserModel).where(AdminUserModel.tenant_id == tenant.public_id, AdminUserModel.email == "admin@pay2pay.com")
        user = (await db.execute(user_stmt)).scalar_one_or_none()
        if not user:
            user = AdminUserModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                company_id=company.public_id,
                email="admin@pay2pay.com",
                username="admin",
                hashed_password=hash_password("AivioSathus!321"),
                full_name="Platform Super Admin",
                status="ACTIVE",
                mfa_enabled=False
            )
            db.add(user)
            await db.flush()

            platform_role = role_map["PLATFORM_ADMIN"]
            ur = UserRoleModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                user_id=user.id,
                role_id=platform_role.id
            )
            db.add(ur)
            print("Seeded Root Super Admin: admin@pay2pay.com")

        await db.commit()
        print("--- SEEDING COMPLETED SUCCESSFULLY ---")


if __name__ == "__main__":
    asyncio.run(seed_database())
