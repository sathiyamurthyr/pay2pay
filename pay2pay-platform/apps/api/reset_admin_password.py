"""
Fix DB schema and reset admin password in Supabase DB.
"""
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password, verify_password

async def main():
    async with AsyncSessionLocal() as db:
        print("1. Adding missing columns and tables to Supabase DB...")
        await db.execute(text("ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'PLATFORM_ADMIN';"))
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_type (
                id BIGSERIAL PRIMARY KEY,
                public_id UUID NOT NULL UNIQUE,
                tenant_id UUID NOT NULL,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                is_system BOOLEAN DEFAULT TRUE NOT NULL,
                created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(255),
                updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_by VARCHAR(255),
                version_no INT DEFAULT 1,
                record_status VARCHAR(20) DEFAULT 'ACTIVE',
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP WITH TIME ZONE
            );
        """))
        await db.commit()
        print("Schema Migration Executed!")

        print("\n2. Checking admin_user account...")
        res = await db.execute(text("SELECT email, username, status, hashed_password FROM admin_user WHERE email = 'admin@pay2pay.com';"))
        row = res.fetchone()
        
        if not row:
            print("User admin@pay2pay.com NOT found! Checking all users...")
            res_all = await db.execute(text("SELECT email, username, status FROM admin_user;"))
            for r in res_all.fetchall():
                print(f"  User: email={r[0]}, username={r[1]}, status={r[2]}")
            return

        email, username, status, hashed_pw = row
        print(f"Found admin user: email={email}, username={username}, status={status}")

        test_pw = "AivioSathus!321"
        is_valid = verify_password(test_pw, hashed_pw)
        print(f"Password '{test_pw}' matches current hash: {is_valid}")

        if not is_valid:
            print(f"Updating password for {email} to '{test_pw}'...")
            new_hash = hash_password(test_pw)
            await db.execute(text("UPDATE admin_user SET hashed_password = :h WHERE email = :e"), {"h": new_hash, "e": email})
            await db.commit()
            print("Password updated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
