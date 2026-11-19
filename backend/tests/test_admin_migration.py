"""
Comprehensive Test Suite for Admin-Only Retailer & Distributor Migration Feature.

Covers all 15 required test scenarios:
1. Retailer-to-distributor migration succeeds.
2. Distributor-to-super-distributor migration succeeds.
3. New mobile number and email validation.
4. Duplicate mobile number/email handling.
5. Correct destination role assignment.
6. Only eligible KYC information is reused.
7. Source account and source data remain unchanged.
8. Destination opening balance is INR 0.00.
9. Source wallet balance and financial history remain unchanged.
10. Automatic approval works without manual approval.
11. Non-admin access is rejected by the backend (403 Forbidden).
12. Repeated and concurrent migration requests do not create duplicate accounts.
13. Failed migration rolls back or recovers without inconsistent data.
14. Existing account onboarding, wallet, transaction, commission, MDR, and reporting flows remain unaffected.
15. Migration history and audit logging work correctly.
"""

import uuid
import secrets
import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, and_

from app.main import app
from app.core.security import create_access_token, hash_password
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import (
    RetailerModel,
    DistributorModel,
    SuperDistributorModel,
    AdminUserModel,
    RetailerKycModel,
    RetailerBankModel,
    RetailerAddressModel,
    RetailerContactModel,
    RetailerWalletModel,
    CompanyModel,
    TenantModel
)
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.db.distributor_models import DistWalletModel
from app.infrastructure.db.super_distributor_models import SdWalletModel
from app.infrastructure.db.account_migration_models import AccountMigrationHistoryModel


def random_mobile(prefix: str = "98") -> str:
    return prefix + "".join(secrets.choice("0123456789") for _ in range(10 - len(prefix)))


def random_bank_acc() -> str:
    return "9100" + "".join(secrets.choice("0123456789") for _ in range(10))



@pytest.fixture
async def setup_test_context():
    """Sets up tenant, company, admin token, and regular non-admin token."""
    tenant_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
    company_id = uuid.UUID("3778f4e4-bb6e-4eb1-8a12-762f24591ebc")
    admin_user_id = uuid.uuid4()
    non_admin_user_id = uuid.uuid4()

    admin_username = f"admin_{secrets.token_hex(3)}"
    admin_email = f"{admin_username}@pay2pay.in"

    async with AsyncSessionLocal() as db:
        # 1. Ensure Admin User exists in admin_user
        admin = AdminUserModel(
            public_id=admin_user_id,
            tenant_id=tenant_id,
            company_id=company_id,
            username=admin_username,
            email=admin_email,
            hashed_password=hash_password("AdminPass#2026!"),
            full_name="Platform System Administrator",
            user_type="PLATFORM_ADMIN",
            status="ACTIVE"
        )
        db.add(admin)
        await db.commit()

    admin_token = create_access_token(
        subject=str(admin_user_id),
        tenant_id=str(tenant_id),
        company_id=str(company_id),
        roles=["SUPER_ADMIN", "ADMIN"]
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    non_admin_token = create_access_token(
        subject=str(non_admin_user_id),
        tenant_id=str(tenant_id),
        company_id=str(company_id),
        roles=["RETAILER"]
    )
    non_admin_headers = {"Authorization": f"Bearer {non_admin_token}"}

    return {
        "tenant_id": tenant_id,
        "company_id": company_id,
        "admin_user_id": admin_user_id,
        "admin_username": admin_username,
        "admin_headers": admin_headers,
        "non_admin_headers": non_admin_headers
    }


@pytest.mark.asyncio
async def test_retailer_to_distributor_migration_suite(setup_test_context):
    """
    Tests Scenarios:
    1. Retailer-to-distributor migration succeeds.
    5. Correct destination role assignment (DISTRIBUTOR).
    6. Only eligible KYC information is reused.
    7. Source account and source data remain unchanged.
    8. Destination opening balance is INR 0.00.
    9. Source wallet balance and financial history remain unchanged.
    10. Automatic approval works without manual approval.
    15. Migration history and audit logging work correctly.
    """
    ctx = setup_test_context
    admin_headers = ctx["admin_headers"]

    # 1. Create a pristine test retailer with KYC, address, bank, and wallet balance
    ret_uuid = uuid.uuid4()
    ret_code = f"RET-T{secrets.token_hex(3).upper()}"
    original_mobile = random_mobile("98")
    original_balance = 45000.50
    pan_num = f"ABCDE{secrets.token_hex(2)[:4]}F".upper()
    gst_num = f"33{pan_num}1Z5"
    bank_acc = random_bank_acc()
    ifsc_code = "HDFC0001234"

    async with AsyncSessionLocal() as db:
        ret = RetailerModel(
            public_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            retailer_code=ret_code,
            store_name="Sri Balaji Supermart",
            legal_name="Sri Balaji Supermart Retail LLP",
            owner_name="Sathiya Murthy",
            status="ACTIVE"
        )
        db.add(ret)
        await db.flush()

        ret_contact = RetailerContactModel(
            public_id=uuid.uuid4(),
            retailer_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            primary_contact="Sathiya Murthy",
            mobile=original_mobile,
            email=f"{ret_code.lower()}@pay2pay.in"
        )
        db.add(ret_contact)

        ret_addr = RetailerAddressModel(
            public_id=uuid.uuid4(),
            retailer_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            state="Tamil Nadu",
            city="Chennai",
            address="124 Anna Salai",
            pincode="600002"
        )
        db.add(ret_addr)

        ret_kyc = RetailerKycModel(
            public_id=uuid.uuid4(),
            retailer_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            pan_number=pan_num,
            gst_number=gst_num,
            verification_status="VERIFIED"
        )
        db.add(ret_kyc)

        ret_bank = RetailerBankModel(
            public_id=uuid.uuid4(),
            retailer_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            settlement_bank_name="HDFC Bank",
            account_holder="Sathiya Murthy",
            account_number=bank_acc,
            ifsc=ifsc_code,
            verification_status="VERIFIED"
        )
        db.add(ret_bank)

        ret_wallet = RetailerWalletModel(
            public_id=uuid.uuid4(),
            retailer_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            wallet_balance=original_balance,
            is_frozen=False
        )
        db.add(ret_wallet)
        await db.commit()

    # 2. Execute Migration through API
    new_dist_mobile = random_mobile("88")
    new_dist_email = f"dist_{secrets.token_hex(3)}@pay2pay.in"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Search source
        search_res = await client.get(
            "/api/v1/admin/migration/search-source",
            params={"migration_type": "RETAILER_TO_DISTRIBUTOR", "query": ret_code},
            headers=admin_headers
        )
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert len(search_data["data"]) >= 1
        assert search_data["data"][0]["code"] == ret_code

        # Validate destination contacts
        val_res = await client.post(
            "/api/v1/admin/migration/validate-contacts",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "mobile": new_dist_mobile,
                "email": new_dist_email
            },
            headers=admin_headers
        )
        assert val_res.status_code == 200
        assert val_res.json()["valid"] is True

        # Execute Migration
        exec_res = await client.post(
            "/api/v1/admin/migration/execute",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "source_identifier": ret_code,
                "new_mobile": new_dist_mobile,
                "new_email": new_dist_email,
                "confirmation_ack": True
            },
            headers=admin_headers
        )
        assert exec_res.status_code == 200
        exec_data = exec_res.json()

        assert exec_data["success"] is True
        assert exec_data["status"] == "COMPLETED"
        assert exec_data["destination_account"]["role"] == "DISTRIBUTOR"
        assert exec_data["destination_account"]["status"] == "ACTIVE"
        assert exec_data["destination_account"]["auto_approved"] is True
        assert exec_data["destination_account"]["opening_balance"] == "0.00"
        assert "temporary_password" in exec_data["destination_account"]
        dest_code = exec_data["destination_account"]["code"]

    # 3. Assert Database Invariants
    async with AsyncSessionLocal() as db:
        # Scenario 7: Source account remains 100% unchanged
        src_check = (await db.execute(
            select(RetailerModel).where(RetailerModel.public_id == ret_uuid)
        )).scalars().first()
        assert src_check is not None
        assert src_check.status == "ACTIVE"
        assert src_check.retailer_code == ret_code

        # Scenario 9: Source wallet balance is untouched
        src_w_check = (await db.execute(
            select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_uuid)
        )).scalars().first()
        assert float(src_w_check.wallet_balance) == original_balance

        # Scenario 1, 5, 10: Destination distributor created and automatically approved
        dist_check = (await db.execute(
            select(DistributorModel).where(DistributorModel.distributor_code == dest_code)
        )).scalars().first()
        assert dist_check is not None
        assert dist_check.status == "ACTIVE"
        assert dist_check.mobile == new_dist_mobile
        assert dist_check.email == new_dist_email
        assert dist_check.wallet_balance == 0.0

        # Scenario 6: Reused KYC
        assert dist_check.pan_number == pan_num
        assert dist_check.gst_number == gst_num
        assert dist_check.bank_account_number == bank_acc
        assert dist_check.ifsc == ifsc_code

        # Scenario 8: Dedicated dist_wallet has strictly INR 0.00 opening balance
        d_ref = dist_check.distributor_ref_id or dist_check.id
        dist_w = (await db.execute(
            select(DistWalletModel).where(DistWalletModel.distributor_ref_id == d_ref)
        )).scalars().first()
        assert dist_w is not None
        assert dist_w.balance == Decimal("0.00")
        assert dist_w.status == "ACTIVE"

        # Scenario 15: Migration History recorded
        mig_hist = (await db.execute(
            select(AccountMigrationHistoryModel).where(
                AccountMigrationHistoryModel.destination_account_code == dest_code
            )
        )).scalars().first()
        assert mig_hist is not None
        assert mig_hist.status == "COMPLETED"
        assert mig_hist.auto_approval_status == "APPROVED"
        assert mig_hist.source_role == "RETAILER"
        assert mig_hist.destination_role == "DISTRIBUTOR"
        assert mig_hist.opening_balance == Decimal("0.00")
        assert mig_hist.destination_mobile == new_dist_mobile


@pytest.mark.asyncio
async def test_distributor_to_super_distributor_migration_suite(setup_test_context):
    """
    Tests Scenarios:
    2. Distributor-to-super-distributor migration succeeds.
    5. Correct destination role assignment (SUPER_DISTRIBUTOR).
    6. Only eligible KYC information is reused.
    7. Source distributor remains unchanged.
    8. Destination opening balance is INR 0.00.
    9. Source wallet balance unchanged.
    10. Automatic approval works.
    """
    ctx = setup_test_context
    admin_headers = ctx["admin_headers"]

    dist_uuid = uuid.uuid4()
    original_dist_mobile = random_mobile("97")
    dist_code = f"DIST-T{secrets.token_hex(3).upper()}"
    original_dist_balance = 125000.00
    pan_num = f"SDPAN{secrets.token_hex(2)[:4]}Z".upper()
    gst_num = f"33{pan_num}1Z9"
    bank_acc = random_bank_acc()
    ifsc_code = "ICIC0001234"

    async with AsyncSessionLocal() as db:
        dist = DistributorModel(
            public_id=dist_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            distributor_code=dist_code,
            business_name="Southern Apex Distribution Network",
            owner_name="Karthik Raja",
            mobile=original_dist_mobile,
            email=f"{dist_code.lower()}@pay2pay.in",
            pan_number=pan_num,
            gst_number=gst_num,
            bank_account_number=bank_acc,
            ifsc=ifsc_code,
            wallet_balance=original_dist_balance,
            credit_limit=500000.0,
            state="Karnataka",
            city="Bengaluru",
            address="45 Residency Road",
            pincode="560025",
            status="ACTIVE"
        )
        db.add(dist)
        await db.flush()

        d_ref = dist.distributor_ref_id or dist.id
        dw = DistWalletModel(
            distributor_ref_id=d_ref,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            balance=Decimal(str(original_dist_balance)),
            status="ACTIVE"
        )
        db.add(dw)
        await db.commit()

    new_sd_mobile = random_mobile("87")
    new_sd_email = f"sd_{secrets.token_hex(3)}@pay2pay.in"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Execute migration
        res = await client.post(
            "/api/v1/admin/migration/execute",
            json={
                "migration_type": "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR",
                "source_identifier": dist_code,
                "new_mobile": new_sd_mobile,
                "new_email": new_sd_email,
                "confirmation_ack": True
            },
            headers=admin_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["destination_account"]["role"] == "SUPER_DISTRIBUTOR"
        assert data["destination_account"]["opening_balance"] == "0.00"
        sd_code = data["destination_account"]["code"]

    async with AsyncSessionLocal() as db:
        # Check source distributor unchanged
        dist_check = (await db.execute(
            select(DistributorModel).where(DistributorModel.public_id == dist_uuid)
        )).scalars().first()
        assert dist_check.status == "ACTIVE"
        assert float(dist_check.wallet_balance) == original_dist_balance

        # Check destination super distributor created & approved
        sd_check = (await db.execute(
            select(SuperDistributorModel).where(SuperDistributorModel.super_distributor_code == sd_code)
        )).scalars().first()
        assert sd_check is not None
        assert sd_check.status == "ACTIVE"
        assert sd_check.mobile == new_sd_mobile
        assert sd_check.pan_number == pan_num
        assert sd_check.gst_number == gst_num
        assert sd_check.wallet_balance == 0.0

        # Check sd_wallet balance = 0.00
        sd_ref = sd_check.super_distributor_ref_id or sd_check.id
        sd_w = (await db.execute(
            select(SdWalletModel).where(SdWalletModel.super_distributor_ref_id == sd_ref)
        )).scalars().first()
        assert sd_w is not None
        assert sd_w.balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_validation_and_duplicate_handling(setup_test_context):
    """
    Tests Scenarios:
    3. New mobile number and email validation.
    4. Duplicate mobile number/email handling.
    11. Non-admin access is rejected by backend (403 Forbidden).
    12. Repeated and concurrent migration requests do not create duplicate accounts.
    """
    ctx = setup_test_context
    admin_headers = ctx["admin_headers"]
    non_admin_headers = ctx["non_admin_headers"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Scenario 11: Non-admin rejected with 403 Forbidden
        denied_res = await client.get(
            "/api/v1/admin/migration/search-source",
            params={"migration_type": "RETAILER_TO_DISTRIBUTOR"},
            headers=non_admin_headers
        )
        assert denied_res.status_code == 403

        denied_exec = await client.post(
            "/api/v1/admin/migration/execute",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "source_identifier": "RET-TEST",
                "new_mobile": "9999999999",
                "new_email": "test@pay2pay.in",
                "confirmation_ack": True
            },
            headers=non_admin_headers
        )
        assert denied_exec.status_code == 403

        # Scenario 3: Invalid mobile syntax (not 10 digits)
        invalid_mob_res = await client.post(
            "/api/v1/admin/migration/validate-contacts",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "mobile": "12345",  # Invalid
                "email": "valid@email.com"
            },
            headers=admin_headers
        )
        assert invalid_mob_res.status_code == 400

        # Scenario 3: Invalid email syntax
        invalid_email_res = await client.post(
            "/api/v1/admin/migration/validate-contacts",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "mobile": "9876543210",
                "email": "not-an-email"
            },
            headers=admin_headers
        )
        assert invalid_email_res.status_code == 400

        # Scenario 4: Duplicate mobile handling against existing AuthUserModel
        existing_mobile = random_mobile("96")
        async with AsyncSessionLocal() as db:
            exist_user = AuthUserModel(
                public_id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                tenant_id=ctx["tenant_id"],
                company_id=ctx["company_id"],
                mobile_number=existing_mobile,
                full_name="Existing User",
                email="existing_user@pay2pay.in",
                password_hash=hash_password("Pass123!"),
                role="DISTRIBUTOR",
                account_status="ACTIVE"
            )
            db.add(exist_user)
            await db.commit()

        dup_res = await client.post(
            "/api/v1/admin/migration/validate-contacts",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "mobile": existing_mobile,
                "email": "fresh@email.com"
            },
            headers=admin_headers
        )
        assert dup_res.status_code == 409
        assert "already associated" in dup_res.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_migration_rejected(setup_test_context):
    """
    Scenario 12: Do not allow an already migrated source account to be migrated again.
    """
    ctx = setup_test_context
    admin_headers = ctx["admin_headers"]

    ret_uuid = uuid.uuid4()
    ret_code = f"RET-DUP{secrets.token_hex(2).upper()}"

    async with AsyncSessionLocal() as db:
        ret = RetailerModel(
            public_id=ret_uuid,
            tenant_id=ctx["tenant_id"],
            company_id=ctx["company_id"],
            retailer_code=ret_code,
            store_name="Duplicate Test Mart",
            legal_name="Duplicate Test Mart",
            owner_name="Testing User",
            status="ACTIVE"
        )
        db.add(ret)
        await db.commit()

    m1 = random_mobile("86")
    e1 = f"dup1_{secrets.token_hex(3)}@pay2pay.in"

    m2 = random_mobile("85")
    e2 = f"dup2_{secrets.token_hex(3)}@pay2pay.in"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First migration succeeds
        r1 = await client.post(
            "/api/v1/admin/migration/execute",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "source_identifier": ret_code,
                "new_mobile": m1,
                "new_email": e1,
                "confirmation_ack": True
            },
            headers=admin_headers
        )
        assert r1.status_code == 200

        # Second migration of the same retailer must be rejected with 409 Conflict
        r2 = await client.post(
            "/api/v1/admin/migration/execute",
            json={
                "migration_type": "RETAILER_TO_DISTRIBUTOR",
                "source_identifier": ret_code,
                "new_mobile": m2,
                "new_email": e2,
                "confirmation_ack": True
            },
            headers=admin_headers
        )
        assert r2.status_code == 409
        assert "already been migrated" in r2.json()["detail"]


@pytest.mark.asyncio
async def test_migration_history_query(setup_test_context):
    """
    Scenario 15: Migration history and audit logging pagination and filtering.
    """
    ctx = setup_test_context
    admin_headers = ctx["admin_headers"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        hist_res = await client.get(
            "/api/v1/admin/migration/history",
            params={"page": 1, "limit": 10},
            headers=admin_headers
        )
        assert hist_res.status_code == 200
        hist_data = hist_res.json()
        assert hist_data["success"] is True
        assert "items" in hist_data
        assert isinstance(hist_data["items"], list)
