"""
Script: apply_distributor_sp_and_view.py
Applies public.view_distributor_auth_profile and public.sp_distributor_login_lookup to PostgreSQL database.
"""

import sys
import asyncio
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

VIEW_SQL_PATH = backend_dir / "app" / "infrastructure" / "db" / "views" / "view_distributor_auth_profile.sql"
SP_SQL_PATH = backend_dir / "app" / "infrastructure" / "db" / "sp" / "sp_distributor_login_lookup.sql"

async def apply_sql():
    print("==========================================================")
    print(" Applying Distributor View and Stored Procedure")
    print("==========================================================")

    view_sql = VIEW_SQL_PATH.read_text(encoding="utf-8")
    sp_sql = SP_SQL_PATH.read_text(encoding="utf-8")

    async with AsyncSessionLocal() as db:
        print("1. Creating view_distributor_auth_profile...")
        await db.execute(text(view_sql))
        print("   [OK] View created successfully.")

        print("2. Creating sp_distributor_login_lookup...")
        await db.execute(text(sp_sql))
        print("   [OK] Stored procedure created successfully.")

        await db.commit()

        print("3. Testing sp_distributor_login_lookup for 9025381316...")
        test_res = await db.execute(
            text("SELECT * FROM public.sp_distributor_login_lookup(:m)"),
            {"m": "9025381316"}
        )
        row = test_res.mappings().first()
        if row:
            print("   [OK] Found distributor:")
            print(f"        Distributor ID: {row['distributor_id']}")
            print(f"        Code: {row['distributor_code']}")
            print(f"        Name: {row['full_name']}")
            print(f"        Mobile: {row['mobile']}")
            print(f"        Status: {row['status']}")
            print(f"        Approve Status: {row['approve_status']}")
            print(f"        Active Status: {row['active_status']}")
            print(f"        Wallet Balance: {row['wallet_balance']}")
            print(f"        Password Hash: {row['password_hash'][:20]}...")
        else:
            print("   [WARN] No row returned for 9025381316")

    print("==========================================================")
    print(" COMPLETED SUCCESSFULLY")
    print("==========================================================")

if __name__ == "__main__":
    asyncio.run(apply_sql())
