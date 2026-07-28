import asyncio
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.infrastructure.db.models import (
    TenantModel, CompanyModel, AdminUserModel, RoleModel, PermissionModel,
    RolePermissionModel, UserRoleModel, SystemConfigurationModel
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
    {"code": "manage:company", "name": "Manage Company", "module": "COMPANY", "action": "MANAGE"},

    # User Permissions
    {"code": "create:user", "name": "Create User", "module": "USER", "action": "CREATE"},
    {"code": "read:user", "name": "Read User", "module": "USER", "action": "READ"},
    {"code": "update:user", "name": "Update User", "module": "USER", "action": "UPDATE"},
    {"code": "delete:user", "name": "Delete User", "module": "USER", "action": "DELETE"},
    {"code": "manage:user", "name": "Manage User", "module": "USER", "action": "MANAGE"},

    # Role Permissions
    {"code": "create:role", "name": "Create Role", "module": "ROLE", "action": "CREATE"},
    {"code": "read:role", "name": "Read Role", "module": "ROLE", "action": "READ"},
    {"code": "update:role", "name": "Update Role", "module": "ROLE", "action": "UPDATE"},
    {"code": "delete:role", "name": "Delete Role", "module": "ROLE", "action": "DELETE"},
    {"code": "manage:role", "name": "Manage Role", "module": "ROLE", "action": "MANAGE"},

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
    {"code": "PLATFORM_ADMIN", "name": "Platform Admin", "description": "Full access to all platform resources"},
    {"code": "COMPANY_ADMIN", "name": "Company Admin", "description": "Manage company level users and settings"},
    {"code": "FINANCE_ADMIN", "name": "Finance Admin", "description": "Financial operations, settlement approvals & reports"},
    {"code": "OPERATIONS_ADMIN", "name": "Operations Admin", "description": "Day to day platform operation management"},
    {"code": "AUDITOR", "name": "Auditor", "description": "Read only compliance & audit trail access"},
    {"code": "READ_ONLY", "name": "Read Only", "description": "Basic read only access across platform"},
]


async def seed_database():
    async with AsyncSessionLocal() as db:
        print("--- SEEDING FOUNDATIONAL DATA ---")

        # 1. Seed Permissions
        perm_map = {}
        for pdata in PERMISSIONS_DATA:
            stmt = select(PermissionModel).where(PermissionModel.code == pdata["code"])
            perm = (await db.execute(stmt)).scalar_one_or_none()
            if not perm:
                perm = PermissionModel(
                    public_id=uuid.uuid4(),
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
            tenant = TenantModel(
                public_id=uuid.uuid4(),
                name="Platform Root Tenant",
                code="PLATFORM",
                description="Root tenant for platform administration",
                status="ACTIVE"
            )
            db.add(tenant)
            await db.flush()
        print(f"Platform Tenant UUID: {tenant.public_id}")

        # 3. Seed Default Company
        comp_stmt = select(CompanyModel).where(CompanyModel.tenant_id == tenant.public_id, CompanyModel.code == "HQ_COMP")
        company = (await db.execute(comp_stmt)).scalar_one_or_none()
        if not company:
            company = CompanyModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                name="Platform HQ Enterprise",
                code="HQ_COMP",
                tax_id="TAX-ENTERPRISE-001",
                status="ACTIVE"
            )
            db.add(company)
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

                # Assign permissions to role
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
                    elif rdata["code"] == "READ_ONLY" and p_code.startswith("read:"):
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

            # Assign Platform Admin role to Root Super Admin
            platform_role = role_map["PLATFORM_ADMIN"]
            ur = UserRoleModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                user_id=user.id,
                role_id=platform_role.id
            )
            db.add(ur)
            print("Seeded Root Super Admin: admin@pay2pay.com")

        # 6. Seed System Configurations
        config_stmt = select(SystemConfigurationModel).where(
            SystemConfigurationModel.tenant_id == tenant.public_id,
            SystemConfigurationModel.key == "SESSION_TIMEOUT_MINUTES"
        )
        conf = (await db.execute(config_stmt)).scalar_one_or_none()
        if not conf:
            conf = SystemConfigurationModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant.public_id,
                key="SESSION_TIMEOUT_MINUTES",
                value="30",
                category="SECURITY",
                description="Session inactivity timeout duration in minutes"
            )
            db.add(conf)

        await db.commit()
        print("--- SEEDING COMPLETED SUCCESSFULLY ---")


if __name__ == "__main__":
    asyncio.run(seed_database())
