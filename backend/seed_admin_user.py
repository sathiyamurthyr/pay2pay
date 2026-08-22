import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password

async def update_admin():
    async with AsyncSessionLocal() as db:
        print("Checking admin users...")
        res = await db.execute(text("SELECT id, email, username, phone, user_type FROM admin_user WHERE email = 'admin@pay2pay.com' OR phone = '9176669426';"))
        rows = res.fetchall()
        print("Existing admin rows:", rows)

        if not rows:
            # Check any admin user
            res_any = await db.execute(text("SELECT id, email, username, phone, user_type FROM admin_user LIMIT 5;"))
            any_rows = res_any.fetchall()
            print("Other admin rows:", any_rows)

        # Update or Insert admin user with phone 9176669426
        new_hash = hash_password("Admin#2026")
        await db.execute(text("""
            UPDATE admin_user 
            SET phone = '9176669426', 
                hashed_password = :h,
                status = 'ACTIVE',
                user_type = 'PLATFORM_ADMIN'
            WHERE email = 'admin@pay2pay.com' OR username = 'admin_user' OR username = 'admin';
        """), {"h": new_hash})
        await db.commit()

        # If no rows updated, insert new admin user
        check_updated = await db.execute(text("SELECT id, email, username, phone, user_type FROM admin_user WHERE phone = '9176669426';"))
        if not check_updated.fetchall():
            print("Inserting master platform admin user...")
            t_res = await db.execute(text("SELECT public_id FROM tenant LIMIT 1;"))
            t_row = t_res.fetchone()
            tenant_id = t_row[0] if t_row else "547aa7bb-a790-4fe2-bd5b-27214ed176c8"

            c_res = await db.execute(text("SELECT public_id FROM company LIMIT 1;"))
            c_row = c_res.fetchone()
            company_id = c_row[0] if c_row else "3778f4e4-bb6e-4eb1-8a12-762f24591ebc"

            await db.execute(text("""
                INSERT INTO admin_user (
                    public_id, tenant_id, company_id, email, username, phone, full_name, hashed_password, status, user_type, is_active, is_deleted
                ) VALUES (
                    gen_random_uuid(), :tid, :cid, 'admin@pay2pay.com', 'admin', '9176669426', 'Sathiya Murthy', :h, 'ACTIVE', 'PLATFORM_ADMIN', true, false
                ) ON CONFLICT DO NOTHING;
            """), {"tid": tenant_id, "cid": company_id, "h": new_hash})
            await db.commit()

        # Verify
        res_final = await db.execute(text("SELECT id, email, username, phone, user_type, status FROM admin_user WHERE phone = '9176669426' OR email = 'admin@pay2pay.com';"))
        print("\nVerified Admin User in DB:", res_final.fetchall())

if __name__ == "__main__":
    asyncio.run(update_admin())
