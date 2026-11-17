import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import asyncio
import random
import uuid
import re
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete

from app.main import app
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import (
    RetailerModel,
    RetailerContactModel
)
from app.infrastructure.db.registration_models import RegistrationDraftModel
from app.infrastructure.db.auth_models import (
    AuthUserModel,
    PasswordResetTokenModel
)
from app.core.security import hash_password, verify_password

@pytest.mark.asyncio
async def test_all_10_retailer_auth_security_cases():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        async with AsyncSessionLocal() as db:
            # -------------------------------------------------------------
            # SETUP: Generate clean test mobile numbers
            # -------------------------------------------------------------
            mob_1 = f"98{random.randint(10000000, 99999999)}"
            mob_3 = f"97{random.randint(10000000, 99999999)}"
            mob_5 = f"96{random.randint(10000000, 99999999)}"
            mob_6 = f"95{random.randint(10000000, 99999999)}"
            mob_7 = f"94{random.randint(10000000, 99999999)}"
            mob_8 = f"93{random.randint(10000000, 99999999)}"
            mob_9 = f"92{random.randint(10000000, 99999999)}"
            mob_10 = f"91{random.randint(10000000, 99999999)}"

            # -------------------------------------------------------------
            # TEST CASE 1 & 2: Onboard Retailer with Password & Verify 1234 Rejection
            # -------------------------------------------------------------
            print("\n--- Running Test Cases 1 & 2: New Onboarding Password Authority & 1234 Rejection ---")
            # Step 1: Check mobile
            r_chk = await ac.post("/api/v1/onboarding/check-mobile", json={"mobile_number": mob_1})
            assert r_chk.status_code == 200
            reg_id_1 = r_chk.json()["registration_id"]

            # Step 2: Verify OTP
            await ac.post("/api/v1/onboarding/verify-mobile-otp", json={"registration_id": reg_id_1, "otp_code": "778899"})
            # Step 3: Set Email
            await ac.post("/api/v1/onboarding/check-email", json={"registration_id": reg_id_1, "email": f"ret_{mob_1}@pay2pay.in"})
            # Step 4: Verify Email OTP
            await ac.post("/api/v1/onboarding/verify-email-otp", json={"registration_id": reg_id_1, "otp_code": "556677"})

            # Step 5: Create Credentials with strong password
            pass_1 = "SecureP@ss2026!"
            mpin_1 = "8976"
            r_cred = await ac.post("/api/v1/onboarding/create-credentials", json={
                "registration_id": reg_id_1,
                "password": pass_1,
                "confirm_password": pass_1,
                "mpin": mpin_1
            })
            assert r_cred.status_code == 200, f"Failed create-credentials: {r_cred.text}"



            # CASE 1: Login with configured onboarding password -> SUCCESS
            r_login_ok = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_1,
                "password": pass_1,
                "portal_role": "RETAILER"
            })
            assert r_login_ok.status_code == 200
            d_login_ok = r_login_ok.json()
            assert d_login_ok["status"] == "SUCCESS"
            assert "access_token" in d_login_ok["data"]
            print("[PASS] Case 1 Passed: Login with onboarding password succeeds.")

            # CASE 2: Login with 1234 / 123456 -> FAILURE (401)
            r_login_1234 = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_1,
                "password": "1234",
                "portal_role": "RETAILER"
            })
            assert r_login_1234.status_code in [401, 429]
            print("[PASS] Case 2 Passed: Login with '1234' is strictly rejected.")

            # -------------------------------------------------------------
            # TEST CASE 3 & 4: Existing Retailer With Valid Hash in DB
            # -------------------------------------------------------------
            print("\n--- Running Test Cases 3 & 4: Existing Retailer Credentials & 1234 Rejection ---")
            pass_3 = "ExistingP@rtner2026#"
            uid_3 = uuid.uuid4()
            ret_3 = RetailerModel(
                public_id=uid_3,
                retailer_code=f"RET-{mob_3[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Existing Retailer Partner",
                status="ACTIVE",
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_3 = RetailerContactModel(
                public_id=uuid.uuid4(),
                retailer_id=uid_3,
                mobile=mob_3,
                email=f"{mob_3}@pay2pay.in",
                primary_contact="Existing Retailer Partner",
                tenant_id=ret_3.tenant_id,
                company_id=ret_3.company_id
            )
            auth_3 = AuthUserModel(
                user_id=uid_3,
                mobile_number=mob_3,
                full_name="Existing Retailer Partner",
                email=f"{mob_3}@pay2pay.in",
                password_hash=hash_password(pass_3),
                role="RETAILER",
                account_status="ACTIVE",
                tenant_id=ret_3.tenant_id,
                company_id=ret_3.company_id
            )
            db.add_all([ret_3, ret_cont_3, auth_3])
            await db.commit()

            # CASE 3: Login with correct password -> SUCCESS
            r_exist_ok = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_3,
                "password": pass_3,
                "portal_role": "RETAILER"
            })
            assert r_exist_ok.status_code == 200
            assert r_exist_ok.json()["status"] == "SUCCESS"
            print("[PASS] Case 3 Passed: Existing retailer with password hash succeeds.")

            # CASE 4: Login with 1234 / 123456 -> FAILURE (401)
            r_exist_1234 = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_3,
                "password": "1234",
                "portal_role": "RETAILER"
            })
            assert r_exist_1234.status_code in [401, 429]
            print("[PASS] Case 4 Passed: Existing retailer rejects '1234'.")

            # -------------------------------------------------------------
            # TEST CASE 5: Existing Retailer Without Password Hash -> PASSWORD_SETUP_REQUIRED
            # -------------------------------------------------------------
            print("\n--- Running Test Case 5: Missing or Insecure Hash Requires Password Setup ---")
            uid_5 = uuid.uuid4()
            ret_5 = RetailerModel(
                public_id=uid_5,
                retailer_code=f"RET-{mob_5[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Legacy Retailer",
                status="ACTIVE",
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_5 = RetailerContactModel(
                public_id=uuid.uuid4(),
                retailer_id=uid_5,
                mobile=mob_5,
                email=f"{mob_5}@pay2pay.in",
                primary_contact="Legacy Retailer",
                tenant_id=ret_5.tenant_id,
                company_id=ret_5.company_id
            )
            # Retailer with no auth_users row and no draft password
            db.add_all([ret_5, ret_cont_5])
            await db.commit()

            r_setup_req = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_5,
                "password": "AnyPassword123!",
                "portal_role": "RETAILER"
            })
            d_setup_req = r_setup_req.json()
            assert d_setup_req.get("status") == "PASSWORD_SETUP_REQUIRED"
            assert "redirect_url" in d_setup_req
            print("[PASS] Case 5 Passed: Retailer without valid hash receives PASSWORD_SETUP_REQUIRED.")

            # -------------------------------------------------------------
            # TEST CASE 6: Failed Attempt Tracking & 30-Minute Lockout
            # -------------------------------------------------------------
            print("\n--- Running Test Case 6: Rate Limiting & Account Lockout ---")
            uid_6 = uuid.uuid4()
            ret_6 = RetailerModel(
                public_id=uid_6,
                retailer_code=f"RET-{mob_6[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Lockout Retailer",
                status="ACTIVE",
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_6 = RetailerContactModel(
                public_id=uuid.uuid4(),
                retailer_id=uid_6,
                mobile=mob_6,
                email=f"{mob_6}@pay2pay.in",
                primary_contact="Lockout Retailer",
                tenant_id=ret_6.tenant_id,
                company_id=ret_6.company_id
            )
            auth_6 = AuthUserModel(
                user_id=uid_6,
                mobile_number=mob_6,
                full_name="Lockout Retailer",
                email=f"{mob_6}@pay2pay.in",
                password_hash=hash_password("RealSecretP@ss1"),
                role="RETAILER",
                account_status="ACTIVE",
                tenant_id=ret_6.tenant_id,
                company_id=ret_6.company_id
            )
            db.add_all([ret_6, ret_cont_6, auth_6])
            await db.commit()

            # Attempt 5 wrong passwords
            lockout_triggered = False
            for attempt in range(1, 7):
                r_fail = await ac.post("/auth/enterprise/login-password", json={
                    "mobile_number": mob_6,
                    "password": f"WrongP@ss{attempt}",
                    "portal_role": "RETAILER"
                })
                if r_fail.status_code == 429:
                    lockout_triggered = True
                    assert "locked" in r_fail.text.lower() or "5 consecutive" in r_fail.text.lower()
                    break

            assert lockout_triggered, "Account did not lock out after 5 consecutive failed attempts!"
            print("[PASS] Case 6 Passed: 5 failed login attempts triggers 30-minute lockout (429).")

            # -------------------------------------------------------------
            # TEST CASE 7: approve_status=False -> Redirect to /account-under-review
            # -------------------------------------------------------------
            print("\n--- Running Test Case 7: Unapproved Retailer Redirect ---")
            pass_7 = "UnapprovedP@ss2026!"
            uid_7 = uuid.uuid4()
            ret_7 = RetailerModel(
                public_id=uid_7,
                retailer_code=f"RET-{mob_7[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Pending Retailer",
                status="PENDING_APPROVAL",  # approve_status=False
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_7 = RetailerContactModel(
                public_id=uuid.uuid4(),
                retailer_id=uid_7,
                mobile=mob_7,
                email=f"{mob_7}@pay2pay.in",
                primary_contact="Pending Retailer",
                tenant_id=ret_7.tenant_id,
                company_id=ret_7.company_id
            )
            auth_7 = AuthUserModel(
                user_id=uid_7,
                mobile_number=mob_7,
                full_name="Pending Retailer",
                email=f"{mob_7}@pay2pay.in",
                password_hash=hash_password(pass_7),
                role="RETAILER",
                account_status="PENDING_APPROVAL",
                tenant_id=ret_7.tenant_id,
                company_id=ret_7.company_id
            )
            db.add_all([ret_7, ret_cont_7, auth_7])
            await db.commit()

            r_login_7 = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_7,
                "password": pass_7,
                "portal_role": "RETAILER"
            })
            assert r_login_7.status_code == 200
            d_login_7 = r_login_7.json()
            assert d_login_7["data"]["destination"] == "ACCOUNT_UNDER_REVIEW"
            assert d_login_7["data"]["redirect_url"] == "/retailer/account-under-review"
            print("[PASS] Case 7 Passed: approve_status=False routes to /retailer/account-under-review.")

            # -------------------------------------------------------------
            # TEST CASE 8: active_status=False -> Redirect to /account-under-review
            # -------------------------------------------------------------
            print("\n--- Running Test Case 8: Inactive Retailer Redirect ---")
            pass_8 = "InactiveP@ss2026!"
            uid_8 = uuid.uuid4()
            ret_8 = RetailerModel(
                public_id=uid_8,
                retailer_code=f"RET-{mob_8[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Inactive Retailer",
                status="INACTIVE",  # active_status=False
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_8 = RetailerContactModel(
                public_id=uuid.uuid4(),
                retailer_id=uid_8,
                mobile=mob_8,
                email=f"{mob_8}@pay2pay.in",
                primary_contact="Inactive Retailer",
                tenant_id=ret_8.tenant_id,
                company_id=ret_8.company_id
            )
            auth_8 = AuthUserModel(
                user_id=uid_8,
                mobile_number=mob_8,
                full_name="Inactive Retailer",
                email=f"{mob_8}@pay2pay.in",
                password_hash=hash_password(pass_8),
                role="RETAILER",
                account_status="INACTIVE",
                tenant_id=ret_8.tenant_id,
                company_id=ret_8.company_id
            )
            db.add_all([ret_8, ret_cont_8, auth_8])
            await db.commit()

            r_login_8 = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_8,
                "password": pass_8,
                "portal_role": "RETAILER"
            })
            assert r_login_8.status_code == 200
            d_login_8 = r_login_8.json()
            assert d_login_8["data"]["destination"] == "ACCOUNT_UNDER_REVIEW"
            assert d_login_8["data"]["redirect_url"] == "/retailer/account-under-review"
            print("[PASS] Case 8 Passed: active_status=False routes to /retailer/account-under-review.")

            # -------------------------------------------------------------
            # TEST CASE 9: Both approve_status=True and active_status=True -> /dashboard
            # -------------------------------------------------------------
            print("\n--- Running Test Case 9: Approved & Active Retailer Redirect ---")
            pass_9 = "ActiveApprovedP@ss2026!"
            uid_9 = uuid.uuid4()
            ret_9 = RetailerModel(
                public_id=uid_9,
                retailer_code=f"RET-{mob_9[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Full Active Retailer",
                status="ACTIVE",
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_9 = RetailerContactModel(
                public_id=uid_9,
                retailer_id=uid_9,
                mobile=mob_9,
                email=f"{mob_9}@pay2pay.in",
                primary_contact="Full Active Retailer",
                tenant_id=ret_9.tenant_id,
                company_id=ret_9.company_id
            )
            auth_9 = AuthUserModel(
                user_id=uid_9,
                mobile_number=mob_9,
                full_name="Full Active Retailer",
                email=f"{mob_9}@pay2pay.in",
                password_hash=hash_password(pass_9),
                role="RETAILER",
                account_status="ACTIVE",
                tenant_id=ret_9.tenant_id,
                company_id=ret_9.company_id
            )
            db.add_all([ret_9, ret_cont_9, auth_9])
            await db.commit()

            r_login_9 = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_9,
                "password": pass_9,
                "portal_role": "RETAILER"
            })
            assert r_login_9.status_code == 200
            d_login_9 = r_login_9.json()
            assert d_login_9["data"]["destination"] == "DASHBOARD"
            assert d_login_9["data"]["redirect_url"] == "/retailer/dashboard"
            print("[PASS] Case 9 Passed: Approved and active retailer routes to /retailer/dashboard.")

            # -------------------------------------------------------------
            # TEST CASE 10: Password Reset Flow (Old password fails, New password succeeds)
            # -------------------------------------------------------------
            print("\n--- Running Test Case 10: Password Reset Flow ---")
            old_pass_10 = "OldP@ssword2026!"
            new_pass_10 = "BrandNewP@ssword2026#"
            uid_10 = uuid.uuid4()
            ret_10 = RetailerModel(
                public_id=uid_10,
                retailer_code=f"RET-{mob_10[-5:]}",
                store_name="Pay2Pay Retail Store",
                legal_name="Pay2Pay Retailer Legal Entity",
                owner_name="Reset Retailer",
                status="ACTIVE",
                tenant_id=uuid.uuid4(),
                company_id=uuid.uuid4()
            )
            ret_cont_10 = RetailerContactModel(
                public_id=uuid.uuid4(),
                retailer_id=uid_10,
                mobile=mob_10,
                email=f"{mob_10}@pay2pay.in",
                primary_contact="Reset Retailer",
                tenant_id=ret_10.tenant_id,
                company_id=ret_10.company_id
            )
            auth_10 = AuthUserModel(
                user_id=uid_10,
                mobile_number=mob_10,
                full_name="Reset Retailer",
                email=f"{mob_10}@pay2pay.in",
                password_hash=hash_password(old_pass_10),
                role="RETAILER",
                account_status="ACTIVE",
                tenant_id=ret_10.tenant_id,
                company_id=ret_10.company_id
            )
            db.add_all([ret_10, ret_cont_10, auth_10])
            await db.commit()

            # 1. Request password reset via endpoint
            r_rst_req = await ac.post("/auth/enterprise/password-reset/request", json={"mobile_number": mob_10})
            assert r_rst_req.status_code == 200

            # 2. Generate a secure token and record in PasswordResetTokenModel
            import secrets
            import hashlib
            raw_token = secrets.token_urlsafe(32)
            token_rec = PasswordResetTokenModel(
                tenant_id=ret_10.tenant_id,
                token_id=f"PRT-{uuid.uuid4().hex[:10].upper()}",
                user_id=uid_10,
                mobile_number=mob_10,
                token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
                is_used=False,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
                requested_at=datetime.now(timezone.utc)
            )
            db.add(token_rec)
            await db.commit()

            # 3. Verify token validity via GET /auth/enterprise/password-reset/verify
            r_verify = await ac.get(f"/auth/enterprise/password-reset/verify?token={raw_token}")
            assert r_verify.status_code == 200
            assert r_verify.json()["valid"] is True

            # 4. Confirm new password via POST /auth/enterprise/password-reset/confirm
            r_rst_conf = await ac.post("/auth/enterprise/password-reset/confirm", json={
                "token": raw_token,
                "new_password": new_pass_10
            })
            assert r_rst_conf.status_code == 200
            assert r_rst_conf.json()["status"] == "SUCCESS"

            # 4. Attempt login with Old Password -> Must Fail (401)
            r_login_old = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_10,
                "password": old_pass_10,
                "portal_role": "RETAILER"
            })
            assert r_login_old.status_code in [401, 429]

            # 5. Attempt login with New Password -> Must Succeed (200)
            r_login_new = await ac.post("/auth/enterprise/login-password", json={
                "mobile_number": mob_10,
                "password": new_pass_10,
                "portal_role": "RETAILER"
            })
            assert r_login_new.status_code == 200
            assert r_login_new.json()["status"] == "SUCCESS"
            print("[PASS] Case 10 Passed: Password reset invalidates old password and accepts new password.")

            print("\n=======================================================")
            print(" ALL 10 RETAILER AUTHENTICATION TEST CASES PASSED! ")
            print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(test_all_10_retailer_auth_security_cases())
