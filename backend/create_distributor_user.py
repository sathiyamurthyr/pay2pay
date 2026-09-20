"""
Script: create_distributor_user.py
Purpose: Create an active, fully-approved Distributor user account in Pay2Pay backend database.
Mobile: 9025381316
Password: sa
MPIN: 1212
Email: rsm.sathiyam@gmail.com
"""

import sys
import os
import asyncio
import uuid
import hmac
import hashlib
from datetime import datetime, timezone
from pathlib import Path

# Load backend root path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.db.models import TenantModel, CompanyModel, DistributorModel
from app.infrastructure.db.session_security_models import UserSecuritySettingsModel
from app.infrastructure.db.registration_models import RegistrationDraftModel

MPIN_SECRET_SALT = "PAY2PAY_ENTERPRISE_MPIN_SALT_KEY_v1_2026"

def generate_hmac_mpin(pin: str, user_id_str: str) -> str:
    salt = f"{MPIN_SECRET_SALT}:{user_id_str}".encode("utf-8")
    return hmac.new(salt, pin.encode("utf-8"), hashlib.sha256).hexdigest()

async def create_distributor():
    print("==========================================================")
    print(" Creating Active Distributor User Account")
    print("==========================================================")

    mobile = "9025381316"
    password_plain = "sa"
    mpin_plain = "1212"
    email = "rsm.sathiyam@gmail.com"
    full_name = "Sathiya Murthy RSM"
    business_name = "Pay2Pay Distribution Express"
    distributor_code = "DIST-9025381316"
    pan = "SATHI9025D"
    gst = "33SATHI9025D1Z5"
    bank_acc = "9025381316001"
    ifsc = "HDFC0001234"

    async with AsyncSessionLocal() as db:
        # 1. Fetch Tenant & Company IDs dynamically
        tenant_stmt = select(TenantModel).where(TenantModel.is_deleted == False)
        tenant = (await db.execute(tenant_stmt)).scalars().first()
        tenant_id = tenant.public_id if tenant else uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

        company_stmt = select(CompanyModel).where(CompanyModel.is_deleted == False)
        company = (await db.execute(company_stmt)).scalars().first()
        company_id = company.public_id if company else uuid.UUID("3778f4e4-bb6e-4eb1-8a12-762f24591ebc")

        # 2. Check or create AuthUserModel
        auth_stmt = select(AuthUserModel).where(
            AuthUserModel.mobile_number == mobile
        )
        auth_user = (await db.execute(auth_stmt)).scalars().first()

        pass_hash = hash_password(password_plain)

        if not auth_user:
            auth_user = AuthUserModel(
                public_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company_id,
                mobile_number=mobile,
                full_name=full_name,
                email=email,
                password_hash=pass_hash,
                role="DISTRIBUTOR",
                account_status="ACTIVE",
                mfa_enabled=False
            )
            db.add(auth_user)
            await db.flush()
            print(f"[OK] AuthUser Created (user_id={auth_user.user_id})")
        else:
            auth_user.full_name = full_name
            auth_user.email = email
            auth_user.password_hash = pass_hash
            auth_user.role = "DISTRIBUTOR"
            auth_user.account_status = "ACTIVE"
            auth_user.updated_date = datetime.now(timezone.utc)
            print(f"[OK] AuthUser Updated (user_id={auth_user.user_id})")

        user_id = auth_user.user_id

        # 3. Check or create DistributorModel
        dist_stmt = select(DistributorModel).where(
            DistributorModel.mobile == mobile
        )
        distributor = (await db.execute(dist_stmt)).scalars().first()

        if not distributor:
            distributor = DistributorModel(
                public_id=user_id,
                tenant_id=tenant_id,
                company_id=company_id,
                distributor_code=distributor_code,
                business_name=business_name,
                owner_name=full_name,
                mobile=mobile,
                email=email,
                gst_number=gst,
                pan_number=pan,
                bank_account_number=bank_acc,
                ifsc=ifsc,
                wallet_balance=100000.0,
                credit_limit=500000.0,
                state="Tamil Nadu",
                city="Chennai",
                address="77 Anna Salai, Mount Road, Chennai",
                pincode="600002",
                status="ACTIVE",
                created_by="system"
            )
            db.add(distributor)
            await db.flush()
            print(f"[OK] Distributor Record Created (distributor_code={distributor.distributor_code})")
        else:
            distributor.business_name = business_name
            distributor.owner_name = full_name
            distributor.email = email
            distributor.gst_number = gst
            distributor.pan_number = pan
            distributor.bank_account_number = bank_acc
            distributor.ifsc = ifsc
            distributor.status = "ACTIVE"
            distributor.updated_date = datetime.now(timezone.utc)
            print(f"[OK] Distributor Record Updated (distributor_code={distributor.distributor_code})")

        # 4. Set MPIN Hash in UserSecuritySettingsModel
        mpin_hash_argon = hash_password(mpin_plain)
        sec_stmt = select(UserSecuritySettingsModel).where(
            UserSecuritySettingsModel.user_id == user_id
        )
        user_sec = (await db.execute(sec_stmt)).scalars().first()

        if not user_sec:
            user_sec = UserSecuritySettingsModel(
                public_id=uuid.uuid4(),
                user_id=user_id,
                tenant_id=tenant_id,
                portal="DISTRIBUTOR",
                security_pin_hash=mpin_hash_argon,
                pin_enabled=True,
                failed_attempt_count=0
            )
            db.add(user_sec)
            print(f"[OK] UserSecuritySettings Created for MPIN: {mpin_plain}")
        else:
            user_sec.security_pin_hash = mpin_hash_argon
            user_sec.pin_enabled = True
            user_sec.failed_attempt_count = 0
            user_sec.locked_until = None
            print(f"[OK] UserSecuritySettings Updated for MPIN: {mpin_plain}")

        # 5. Create/Update RegistrationDraftModel for complete onboarding status
        draft_stmt = select(RegistrationDraftModel).where(
            RegistrationDraftModel.mobile_number == mobile
        )
        draft = (await db.execute(draft_stmt)).scalars().first()

        draft_data_dict = {
            "mobile_number": mobile,
            "email": email,
            "name": full_name,
            "registered_name": full_name,
            "business_name": business_name,
            "pan_number": pan,
            "gst_number": gst,
            "user_type": "DISTRIBUTOR",
            "portal_role": "DISTRIBUTOR",
            "password_hash": pass_hash,
            "onboarding_completed": True
        }

        if not draft:
            draft = RegistrationDraftModel(
                public_id=uuid.uuid4(),
                tenant_id=tenant_id,
                company_id=company_id,
                registration_id=f"REG-{mobile}",
                mobile_number=mobile,
                email=email,
                current_step=14,
                completed_steps=[1, 2, 3, 4, 5, 6, 66, 7, 8, 9, 10, 11, 12, 13, 14],
                status="KYC_APPROVED",
                is_business=True,
                draft_data=draft_data_dict
            )
            db.add(draft)
            print(f"[OK] RegistrationDraft Completed Record Created")
        else:
            draft.registration_id = f"REG-{mobile}"
            draft.current_step = 14
            draft.completed_steps = [1, 2, 3, 4, 5, 6, 66, 7, 8, 9, 10, 11, 12, 13, 14]
            draft.status = "KYC_APPROVED"
            draft.draft_data = draft_data_dict
            print(f"[OK] RegistrationDraft Record Updated to COMPLETED")

        # 6. Also update admin_user table if an entry exists for mobile
        try:
            await db.execute(
                text("""
                    UPDATE admin_user
                    SET hashed_password = :h, phone = :m, status = 'ACTIVE'
                    WHERE phone = :m OR email = :e
                """),
                {"h": pass_hash, "m": mobile, "e": email}
            )
        except Exception:
            pass

        await db.commit()

        print("\n==========================================================")
        print(" DISTRIBUTOR ACCOUNT CREATION & ACTIVATION SUCCESSFUL")
        print("==========================================================")
        print(f"  Mobile Number    : {mobile}")
        print(f"  Password         : {password_plain}")
        print(f"  MPIN (PIN)       : {mpin_plain}")
        print(f"  Email            : {email}")
        print(f"  Owner Name       : {full_name}")
        print(f"  Business Name    : {business_name}")
        print(f"  Distributor Code : {distributor_code}")
        print(f"  PAN Number       : {pan}")
        print(f"  GST Number       : {gst}")
        print(f"  Bank Account     : {bank_acc} ({ifsc})")
        print(f"  City & State     : Chennai, Tamil Nadu (600002)")
        print(f"  Wallet Balance   : INR 100,000.00")
        print(f"  Credit Limit     : INR 500,000.00")
        print(f"  Account Status   : ACTIVE & FULLY APPROVED")
        print("==========================================================")

if __name__ == "__main__":
    asyncio.run(create_distributor())
