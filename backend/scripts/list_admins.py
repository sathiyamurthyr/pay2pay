import asyncio
from app.core.database import AsyncSessionLocal
from app.core.security import verify_password
from sqlalchemy import text

CANDIDATE_PASSWORDS = [
    "Admin#2026",
    "Admin@123",
    "admin123",
    "admin",
    "Admin#123",
    "Admin123!",
    "pay2pay@123",
    "smspay@123",
    "near4you@123",
    "password",
    "sa",
    "123456"
]

async def main():
    async with AsyncSessionLocal() as session:
        print("\n=== Table: admin_user ===")
        res = await session.execute(text("SELECT id, public_id, username, email, phone, full_name, user_type, status, is_active, hashed_password FROM admin_user"))
        for r in res.mappings().all():
            row_dict = dict(r)
            hp = row_dict.get("hashed_password") or ""
            matched_pw = None
            for cp in CANDIDATE_PASSWORDS:
                try:
                    if verify_password(cp, hp):
                        matched_pw = cp
                        break
                except Exception:
                    pass
            row_dict["matched_password"] = matched_pw
            row_dict.pop("hashed_password", None)
            print(row_dict)

        print("\n=== Table: role ===")
        res_r = await session.execute(text("SELECT id, public_id, code, name FROM role"))
        for r in res_r.mappings().all():
            print(dict(r))

        print("\n=== Table: user_role ===")
        res_ur = await session.execute(text("SELECT * FROM user_role"))
        for r in res_ur.mappings().all():
            print(dict(r))

if __name__ == "__main__":
    asyncio.run(main())

