import sys, os
sys.path.insert(0, os.path.abspath("."))
import asyncio
import uuid
from app.core.database import engine, Base
from app.core.security import hash_password
from app.infrastructure.db.sales_models import (
    SalesUserModel, SalesHierarchyMappingModel, SalesAuditLogModel, SalesActivityLogModel
)
from sqlalchemy import text, select

async def init_sales_tables():
    print("Creating Sales Portal tables...")
    async with engine.begin() as conn:
        # Create tables using Base metadata
        await conn.run_sync(Base.metadata.create_all)
        print("Base metadata tables created successfully.")
        
    # Check if sales_user table has an initial demo user
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM sales_user;"))
        count = res.scalar()
        print(f"Current sales_user count: {count}")
        
        if count == 0:
            print("Seeding initial Sales Users...")
            # Fetch active tenant and company
            t_res = await conn.execute(text("SELECT public_id, tenant_ref_id FROM tenant LIMIT 1;"))
            t_row = t_res.fetchone()
            tenant_uuid = t_row[0] if t_row else uuid.UUID("fa480c2d-2725-43bd-a7ba-6fc60a89a1cb")
            tenant_ref = t_row[1] if t_row else 39
            
            c_res = await conn.execute(text("SELECT public_id, company_ref_id FROM company WHERE tenant_id = :tid LIMIT 1;"), {"tid": tenant_uuid})
            c_row = c_res.fetchone()
            comp_uuid = c_row[0] if c_row else None
            comp_ref = c_row[1] if c_row else None
            
            # Fetch SD and Distributor
            sd_res = await conn.execute(text("SELECT public_id, super_distributor_ref_id FROM super_distributor WHERE tenant_id = :tid LIMIT 1;"), {"tid": tenant_uuid})
            sd_row = sd_res.fetchone()
            sd_uuid = sd_row[0] if sd_row else None
            sd_ref = sd_row[1] if sd_row else None
            
            dist_res = await conn.execute(text("SELECT public_id, distributor_ref_id FROM distributor WHERE tenant_id = :tid LIMIT 1;"), {"tid": tenant_uuid})
            dist_row = dist_res.fetchone()
            dist_uuid = dist_row[0] if dist_row else None
            dist_ref = dist_row[1] if dist_row else None
            
            # Create Sales User 1: All Scope (Tenant Wide)
            hashed_pw = hash_password("Sales@12345")
            user1_uuid = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO sales_user (
                    public_id, tenant_id, company_id, tenant_ref_id, company_ref_id,
                    employee_code, username, full_name, email, mobile, password_hash,
                    territory, department, designation, status, is_active, is_deleted,
                    created_at, updated_at, created_by
                ) VALUES (
                    :uid, :tid, :cid, :tref, :cref,
                    'SALES001', 'sales.lead', 'Vikram Rathore (Area Head)', 'sales@pay2pay.in', '9876543210', :pwd,
                    'All Zones - Central & South', 'Direct Sales & Enterprise', 'Area Sales Manager', 'ACTIVE', true, false,
                    NOW(), NOW(), 'system_init'
                );
            """), {
                "uid": user1_uuid, "tid": tenant_uuid, "cid": comp_uuid, "tref": tenant_ref, "cref": comp_ref,
                "pwd": hashed_pw
            })
            
            # Add ALL mapping for User 1
            await conn.execute(text("""
                INSERT INTO sales_hierarchy_mapping (
                    public_id, tenant_id, company_id, sales_user_id, sales_user_ref_id,
                    mapping_type, notes, status, is_active, is_deleted,
                    effective_from, created_at, updated_at, created_by
                ) VALUES (
                    :mid, :tid, :cid, :uid, 1,
                    'ALL', 'Full tenant network access', 'ACTIVE', true, false,
                    NOW(), NOW(), NOW(), 'system_init'
                );
            """), {
                "mid": uuid.uuid4(), "tid": tenant_uuid, "cid": comp_uuid, "uid": user1_uuid
            })
            
            # Create Sales User 2: Hierarchy Mapped to specific SD/Distributor
            user2_uuid = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO sales_user (
                    public_id, tenant_id, company_id, tenant_ref_id, company_ref_id,
                    employee_code, username, full_name, email, mobile, password_hash,
                    territory, department, designation, status, is_active, is_deleted,
                    created_at, updated_at, created_by
                ) VALUES (
                    :uid, :tid, :cid, :tref, :cref,
                    'SALES002', 'sales.officer', 'Rajesh Sharma (Field Executive)', 'rajesh.sales@pay2pay.in', '9876543211', :pwd,
                    'South Region - Retail Cluster', 'Field Operations', 'Field Sales Officer', 'ACTIVE', true, false,
                    NOW(), NOW(), 'system_init'
                );
            """), {
                "uid": user2_uuid, "tid": tenant_uuid, "cid": comp_uuid, "tref": tenant_ref, "cref": comp_ref,
                "pwd": hashed_pw
            })
            
            # Map User 2 to specific SD & Distributor
            if sd_uuid:
                await conn.execute(text("""
                    INSERT INTO sales_hierarchy_mapping (
                        public_id, tenant_id, company_id, sales_user_id, sales_user_ref_id,
                        mapping_type, super_distributor_id, super_distributor_ref_id,
                        notes, status, is_active, is_deleted,
                        effective_from, created_at, updated_at, created_by
                    ) VALUES (
                        :mid, :tid, :cid, :uid, 2,
                        'SUPER_DISTRIBUTOR', :sd_id, :sd_ref,
                        'Assigned to primary Super Distributor cluster', 'ACTIVE', true, false,
                        NOW(), NOW(), NOW(), 'system_init'
                    );
                """), {
                    "mid": uuid.uuid4(), "tid": tenant_uuid, "cid": comp_uuid, "uid": user2_uuid,
                    "sd_id": sd_uuid, "sd_ref": sd_ref
                })
            
            await conn.commit()
            print("Successfully seeded demo sales users and hierarchy mappings.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_sales_tables())
