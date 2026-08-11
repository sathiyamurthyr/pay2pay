#!/usr/bin/env python3
"""
Seed admin user for pay2pay enterprise auth.
Creates default admin user if not exists.
"""
import asyncio
import uuid
import sys
import os
sys.path.insert(0, '/home/ubuntu/pay2pay/backend')
os.chdir('/home/ubuntu/pay2pay/backend')

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.infrastructure.db.auth_models import AuthUserModel


ADMIN_USERS = [
    {
        "mobile_number": "9999999999",
        "full_name": "Platform Admin",
        "email": "admin@pay2pay.in",
        "password": "Admin@123",
        "role": "ADMIN"
    },
    {
        "mobile_number": "8888888888", 
        "full_name": "Test Retailer",
        "email": "retailer@pay2pay.in",
        "password": "Retailer@123",
        "role": "RETAILER"
    }
]

async def seed_admin():
    async with AsyncSessionLocal() as db:
        for user_data in ADMIN_USERS:
            stmt = select(AuthUserModel).where(AuthUserModel.mobile_number == user_data["mobile_number"])
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                print(f"User {user_data['mobile_number']} already exists")
                continue
            
            # Get a valid tenant_id from existing tenants
            from app.infrastructure.db.models import TenantModel
            tenant_stmt = select(TenantModel).limit(1)
            tenant = (await db.execute(tenant_stmt)).scalar_one_or_none()
            tenant_id = tenant.public_id if tenant else uuid.UUID("00000000-0000-0000-0000-000000000001")
            
            user = AuthUserModel(
                id=uuid.uuid4(),
                public_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                tenant_id=tenant_id,
                mobile_number=user_data["mobile_number"],
                full_name=user_data["full_name"],
                email=user_data["email"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
                account_status="ACTIVE",
                is_active=True,
                mfa_enabled=False,
                failed_attempts=0
            )
            db.add(user)
            print(f"Created user: {user_data['mobile_number']} ({user_data['role']})")
        
        await db.commit()
        print("Done!")
        
        # Verify
        count_stmt = select(AuthUserModel)
        users = (await db.execute(count_stmt)).scalars().all()
        print(f"Total auth_users in DB: {len(users)}")
        for u in users:
            print(f"  - {u.mobile_number} | {u.role} | {u.account_status} | active={u.is_active}")


asyncio.run(seed_admin())
