import asyncio
import hashlib
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        print("--- AUTH_USER ---")
        try:
            res = await db.execute(text("SELECT id, mobile_number, email, role, is_active, password_hash FROM auth_user;"))
            for r in res.fetchall():
                print(f"ID: {r[0]} | Mobile: {r[1]} | Email: {r[2]} | Role: {r[3]} | Active: {r[4]} | Hash: {r[5]}")
        except Exception as e:
            print("auth_user error:", e)

        print("\n--- ADMIN_USER ---")
        try:
            res2 = await db.execute(text("SELECT id, email, username, mobile_number, status, hashed_password, role, user_type FROM admin_user;"))
            for r in res2.fetchall():
                print(f"ID: {r[0]} | Email: {r[1]} | User: {r[2]} | Mobile: {r[3]} | Status: {r[4]} | Role: {r[6]} | UserType: {r[7]} | Hash: {r[5]}")
        except Exception as e:
            print("admin_user error:", e)

        print("\n--- RETAILER ---")
        try:
            res3 = await db.execute(text("SELECT id, retailer_code, mobile_number, name, status FROM retailer;"))
            for r in res3.fetchall():
                print(f"ID: {r[0]} | Code: {r[1]} | Mobile: {r[2]} | Name: {r[3]} | Status: {r[4]}")
        except Exception as e:
            print("retailer error:", e)

if __name__ == "__main__":
    asyncio.run(check())
