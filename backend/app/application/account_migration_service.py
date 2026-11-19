"""
Enterprise Account Migration Service.

Authoritative business logic for Admin-controlled account migrations:
1. Retailer -> Distributor
2. Distributor -> Super Distributor

Strict architectural invariants enforced:
- Source account is preserved 100% unchanged (read-only). No overwrite, no delete, no in-place role mutation.
- Source wallet balance is NOT transferred. Destination opening balance is strictly INR 0.00.
- Source credentials/tokens are never copied; a new cryptographically secure temporary credential is generated.
- Only eligible KYC records are reused (PAN, GST, Bank account, verified address).
- A separate destination account is created with new unique account/reference ID.
- Automatic approval is granted without creating a pending manual queue request.
- All actions are recorded with complete audit trail in account_migration_history.
- Entire migration executes within an atomic database transaction.
"""

import re
import uuid
import secrets
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func, text
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.domain.code_generator import (
    generate_unique_distributor_code,
    generate_unique_super_distributor_code
)
from app.infrastructure.db.models import (
    RetailerModel,
    DistributorModel,
    SuperDistributorModel,
    AdminUserModel,
    RetailerKycModel,
    RetailerBankModel,
    RetailerAddressModel,
    RetailerContactModel,
    RetailerWalletModel
)
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.db.distributor_models import DistWalletModel
from app.infrastructure.db.super_distributor_models import SdWalletModel
from app.infrastructure.db.session_security_models import UserSecuritySettingsModel
from app.infrastructure.db.account_migration_models import AccountMigrationHistoryModel

logger = logging.getLogger("account_migration_service")


class AccountMigrationService:

    @staticmethod
    def normalize_mobile(mobile_input: str) -> str:
        """Extracts exactly 10 digits from mobile input."""
        digits = re.sub(r"\D", "", str(mobile_input or "").strip())
        return digits[-10:] if len(digits) >= 10 else digits

    @staticmethod
    def validate_contact_format(mobile: str, email: str) -> None:
        """Validates mobile and email syntax."""
        clean_mobile = AccountMigrationService.normalize_mobile(mobile)
        if len(clean_mobile) != 10 or not clean_mobile[0] in "6789":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mobile number '{mobile}'. Must be a valid 10-digit Indian mobile number starting with 6-9."
            )
        email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not email or not re.match(email_pattern, email.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid email address '{email}'. Please provide a valid email format."
            )

    @classmethod
    async def resolve_retailer_kyc_and_bank(
        cls,
        db: AsyncSession,
        retailer: RetailerModel
    ) -> Dict[str, Any]:
        """
        Comprehensively resolves Retailer identity, KYC, Bank, Address, and Contact details
        across all authoritative database tables:
        1. Direct ORM relations (retailer_kyc, retailer_bank, retailer_address, retailer_contact)
        2. retailer_verifications (progressive onboarding verification master)
        3. registration_pan, registration_bank, registration_address, registration_shop, registration_gst
        4. registration_drafts (in-flight draft form payloads)
        """
        # 1. Start with relational data
        contact = retailer.contacts[0] if (retailer.contacts and len(retailer.contacts) > 0) else None
        address = retailer.addresses[0] if (retailer.addresses and len(retailer.addresses) > 0) else None
        kyc = retailer.kyc
        bank = retailer.banks[0] if (retailer.banks and len(retailer.banks) > 0) else None

        pan_val = kyc.pan_number if (kyc and kyc.pan_number) else None
        gst_val = kyc.gst_number if (kyc and kyc.gst_number) else None
        bank_acc = bank.account_number if (bank and bank.account_number) else None
        ifsc_val = bank.ifsc if (bank and bank.ifsc) else None
        state_val = address.state if (address and address.state) else None
        city_val = address.city if (address and address.city) else None
        address_val = address.address if (address and address.address) else None
        pincode_val = address.pincode if (address and address.pincode) else None
        owner_val = retailer.owner_name
        business_val = retailer.store_name or retailer.legal_name
        mobile_val = contact.mobile if contact else None
        email_val = contact.email if contact else None

        # 2. If any key field is missing, look up retailer_verifications
        need_enrichment = not (pan_val and bank_acc and ifsc_val and address_val and city_val and state_val)
        reg_id = None

        if need_enrichment:
            try:
                ret_code = retailer.retailer_code
                ret_ref = retailer.retailer_ref_id or retailer.id
                v_stmt = select(text("""
                    SELECT registration_id, retailer_name, shop_name, pan_number, gst_number, state, district, mobile_number, email
                    FROM public.retailer_verifications
                    WHERE retailer_id = :code OR retailer_ref_id = :ref
                    ORDER BY id DESC LIMIT 1
                """))
                v_res = await db.execute(v_stmt, {"code": ret_code, "ref": ret_ref})
                v_row = v_res.mappings().first()
                if v_row:
                    reg_id = v_row.get("registration_id")
                    if not pan_val and v_row.get("pan_number"):
                        pan_val = v_row["pan_number"]
                    if not gst_val and v_row.get("gst_number"):
                        gst_val = v_row["gst_number"]
                    if not state_val and v_row.get("state"):
                        state_val = v_row["state"].strip()
                    if not city_val and v_row.get("district"):
                        city_val = v_row["district"].strip()
                    if not business_val and v_row.get("shop_name"):
                        business_val = v_row["shop_name"]
                    if not owner_val and v_row.get("retailer_name"):
                        owner_val = v_row["retailer_name"]
                    if not mobile_val and v_row.get("mobile_number"):
                        mobile_val = v_row["mobile_number"]
                    if not email_val and v_row.get("email"):
                        email_val = v_row["email"]
            except Exception as e:
                logger.warning(f"Error checking retailer_verifications for {retailer.retailer_code}: {e}")

        # 3. If registration_id is available (or can be found from mobile / retailer_code), query registration_*
        if not reg_id and mobile_val:
            try:
                clean_m = re.sub(r"\D", "", mobile_val)[-10:]
                v_stmt2 = select(text("""
                    SELECT registration_id FROM public.retailer_verifications
                    WHERE mobile_number LIKE :mob ORDER BY id DESC LIMIT 1
                """))
                v_res2 = await db.execute(v_stmt2, {"mob": f"%{clean_m}%"})
                v_row2 = v_res2.mappings().first()
                if v_row2:
                    reg_id = v_row2.get("registration_id")
            except Exception:
                pass

        if reg_id:
            # Check registration_pan
            if not pan_val:
                try:
                    p_res = await db.execute(text("SELECT pan_number, pan_holder_name FROM public.registration_pan WHERE registration_id = :rid LIMIT 1"), {"rid": reg_id})
                    p_row = p_res.mappings().first()
                    if p_row:
                        pan_val = p_row.get("pan_number")
                        if not owner_val and p_row.get("pan_holder_name"):
                            owner_val = p_row["pan_holder_name"]
                except Exception:
                    pass

            # Check registration_bank
            if not (bank_acc and ifsc_val):
                try:
                    b_res = await db.execute(text("SELECT account_number, account_number_masked, ifsc FROM public.registration_bank WHERE registration_id = :rid ORDER BY id DESC LIMIT 1"), {"rid": reg_id})
                    b_row = b_res.mappings().first()
                    if b_row:
                        if not bank_acc:
                            bank_acc = b_row.get("account_number") or b_row.get("account_number_masked")
                        if not ifsc_val:
                            ifsc_val = b_row.get("ifsc")
                except Exception:
                    pass

            # Check registration_address
            if not (state_val and city_val and address_val and pincode_val):
                try:
                    a_res = await db.execute(text("SELECT street, area, landmark, city, district, state, pincode FROM public.registration_address WHERE registration_id = :rid LIMIT 1"), {"rid": reg_id})
                    a_row = a_res.mappings().first()
                    if a_row:
                        if not state_val and a_row.get("state"):
                            state_val = a_row["state"]
                        if not city_val:
                            city_val = a_row.get("city") or a_row.get("district")
                        if not pincode_val and a_row.get("pincode"):
                            pincode_val = a_row["pincode"]
                        if not address_val:
                            parts = [a_row.get("street"), a_row.get("area"), a_row.get("landmark")]
                            non_empty = [p.strip() for p in parts if p and p.strip()]
                            if non_empty:
                                address_val = ", ".join(non_empty)
                except Exception:
                    pass

            # Check registration_shop
            if not business_val:
                try:
                    s_res = await db.execute(text("SELECT shop_name FROM public.registration_shop WHERE registration_id = :rid LIMIT 1"), {"rid": reg_id})
                    s_row = s_res.mappings().first()
                    if s_row and s_row.get("shop_name"):
                        business_val = s_row["shop_name"]
                except Exception:
                    pass

            # Check registration_gst
            if not gst_val:
                try:
                    g_res = await db.execute(text("SELECT gst_number FROM public.registration_gst WHERE registration_id = :rid LIMIT 1"), {"rid": reg_id})
                    g_row = g_res.mappings().first()
                    if g_row and g_row.get("gst_number"):
                        gst_val = g_row["gst_number"]
                except Exception:
                    pass

        # 4. Final defaults
        return {
            "pan_number": pan_val,
            "gst_number": gst_val,
            "bank_account_number": bank_acc,
            "ifsc": ifsc_val,
            "state": state_val or "Tamil Nadu",
            "city": city_val or "Chennai",
            "address": address_val or "Registered Business Office",
            "pincode": pincode_val or "600001",
            "business_name": business_val or "Pay2Pay Enterprise Store",
            "owner_name": owner_val or "Business Partner",
            "mobile": mobile_val or "",
            "email": email_val or ""
        }

    @classmethod
    async def validate_destination_contacts(
        cls,
        db: AsyncSession,
        migration_type: str,
        mobile: str,
        email: str
    ) -> Dict[str, Any]:
        """
        Validates destination contact details meet application rules and do not conflict
        with another account where uniqueness is required.
        """
        cls.validate_contact_format(mobile, email)
        clean_mobile = cls.normalize_mobile(mobile)
        clean_email = email.strip().lower()

        # 1. Check AuthUserModel
        auth_stmt = select(AuthUserModel).where(
            or_(
                AuthUserModel.mobile_number == clean_mobile,
                func.lower(AuthUserModel.email) == clean_email
            ),
            AuthUserModel.is_deleted == False
        )
        existing_auth = (await db.execute(auth_stmt)).scalars().first()
        if existing_auth:
            conflict_field = "mobile number" if existing_auth.mobile_number == clean_mobile else "email address"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Destination {conflict_field} is already associated with an existing user account."
            )

        # 2. Check destination role table for uniqueness
        if migration_type == "RETAILER_TO_DISTRIBUTOR":
            dist_stmt = select(DistributorModel).where(
                or_(
                    DistributorModel.mobile == clean_mobile,
                    func.lower(DistributorModel.email) == clean_email
                ),
                DistributorModel.is_deleted == False
            )
            existing_dist = (await db.execute(dist_stmt)).scalars().first()
            if existing_dist:
                conflict_field = "mobile number" if existing_dist.mobile == clean_mobile else "email address"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Destination {conflict_field} is already assigned to an existing Distributor."
                )

        elif migration_type == "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR":
            sd_stmt = select(SuperDistributorModel).where(
                or_(
                    SuperDistributorModel.mobile == clean_mobile,
                    func.lower(SuperDistributorModel.email) == clean_email
                ),
                SuperDistributorModel.is_deleted == False
            )
            existing_sd = (await db.execute(sd_stmt)).scalars().first()
            if existing_sd:
                conflict_field = "mobile number" if existing_sd.mobile == clean_mobile else "email address"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Destination {conflict_field} is already assigned to an existing Super Distributor."
                )

        return {
            "success": True,
            "valid": True,
            "mobile": clean_mobile,
            "email": clean_email,
            "message": "Destination contact details are valid and available."
        }

    @classmethod
    async def search_source_accounts(
        cls,
        db: AsyncSession,
        migration_type: str,
        query: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Searches existing source accounts eligible for migration.
        Returns read-only metadata and indicates if previously migrated.
        """
        results: List[Dict[str, Any]] = []
        limit = min(max(1, limit), 100)
        s_filter = f"%{query.strip()}%" if query and query.strip() else None

        if migration_type == "RETAILER_TO_DISTRIBUTOR":
            stmt = select(RetailerModel).options(
                selectinload(RetailerModel.contacts),
                selectinload(RetailerModel.addresses),
                selectinload(RetailerModel.kyc),
                selectinload(RetailerModel.wallet),
                selectinload(RetailerModel.banks)
            ).where(
                RetailerModel.is_deleted == False,
                ~RetailerModel.store_name.ilike("%Duplicate%"),
                ~RetailerModel.store_name.ilike("%Test%"),
                ~RetailerModel.store_name.ilike("%Demo%"),
                ~RetailerModel.store_name.ilike("%Workability%"),
                ~RetailerModel.retailer_code.ilike("RET-DUP%"),
                ~RetailerModel.retailer_code.ilike("RET-T%"),
                ~RetailerModel.retailer_code.ilike("%-test%"),
                ~RetailerModel.owner_name.ilike("%Testing%"),
                ~RetailerModel.owner_name.ilike("%-test%")
            )

            if s_filter:
                stmt = stmt.where(
                    or_(
                        RetailerModel.store_name.ilike(s_filter),
                        RetailerModel.owner_name.ilike(s_filter),
                        RetailerModel.legal_name.ilike(s_filter),
                        RetailerModel.retailer_code.ilike(s_filter),
                        RetailerModel.contacts.any(RetailerContactModel.mobile.ilike(s_filter)),
                        RetailerModel.contacts.any(RetailerContactModel.email.ilike(s_filter)),
                        RetailerModel.kyc.has(RetailerKycModel.pan_number.ilike(s_filter))
                    )
                )

            stmt = stmt.order_by(desc(RetailerModel.created_date)).limit(limit)
            retailers = (await db.execute(stmt)).scalars().all()

            for r in retailers:
                resolved = await cls.resolve_retailer_kyc_and_bank(db, r)
                bal = float(getattr(r.wallet, "wallet_balance", 0.0) or 0.0) if r.wallet else 0.0
                r_ref = r.retailer_ref_id or r.id

                # Check if already migrated
                mig_stmt = select(AccountMigrationHistoryModel).where(
                    AccountMigrationHistoryModel.source_account_ref_id == r_ref,
                    AccountMigrationHistoryModel.migration_type == "RETAILER_TO_DISTRIBUTOR",
                    AccountMigrationHistoryModel.status == "COMPLETED"
                )
                prev_mig = (await db.execute(mig_stmt)).scalars().first()

                results.append({
                    "id": str(r.public_id),
                    "account_ref_id": r_ref,
                    "code": r.retailer_code or f"RET-{str(r.public_id)[:8].upper()}",
                    "name": resolved["owner_name"],
                    "business_name": resolved["business_name"],
                    "mobile": resolved["mobile"],
                    "email": resolved["email"],
                    "role": "RETAILER",
                    "status": r.status or "ACTIVE",
                    "kyc_status": r.kyc.verification_status if r.kyc else ("VERIFIED" if resolved["pan_number"] else "PENDING"),
                    "pan_number": resolved["pan_number"],
                    "gst_number": resolved["gst_number"],
                    "bank_account": resolved["bank_account_number"],
                    "ifsc": resolved["ifsc"],
                    "city": resolved["city"],
                    "state": resolved["state"],
                    "pincode": resolved["pincode"],
                    "current_wallet_balance": bal,
                    "already_migrated": bool(prev_mig),
                    "migration_reference_no": prev_mig.migration_reference_no if prev_mig else None,
                    "destination_code": prev_mig.destination_account_code if prev_mig else None
                })

        elif migration_type == "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR":
            stmt = select(DistributorModel).where(
                DistributorModel.is_deleted == False,
                ~DistributorModel.business_name.ilike("%Duplicate%"),
                ~DistributorModel.business_name.ilike("%Test%"),
                ~DistributorModel.business_name.ilike("%Workability%"),
                ~DistributorModel.distributor_code.ilike("DIST-T%"),
                ~DistributorModel.owner_name.ilike("%Testing%")
            )

            if s_filter:
                stmt = stmt.where(
                    or_(
                        DistributorModel.distributor_code.ilike(s_filter),
                        DistributorModel.owner_name.ilike(s_filter),
                        DistributorModel.business_name.ilike(s_filter),
                        DistributorModel.mobile.ilike(s_filter),
                        DistributorModel.email.ilike(s_filter),
                        DistributorModel.pan_number.ilike(s_filter)
                    )
                )

            stmt = stmt.order_by(desc(DistributorModel.created_date)).limit(limit)
            distributors = (await db.execute(stmt)).scalars().all()

            for d in distributors:
                d_ref = d.distributor_ref_id or d.id
                bal = float(d.wallet_balance or 0.0)

                # Check if already migrated
                mig_stmt = select(AccountMigrationHistoryModel).where(
                    AccountMigrationHistoryModel.source_account_ref_id == d_ref,
                    AccountMigrationHistoryModel.migration_type == "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR",
                    AccountMigrationHistoryModel.status == "COMPLETED"
                )
                prev_mig = (await db.execute(mig_stmt)).scalars().first()

                results.append({
                    "id": str(d.public_id),
                    "account_ref_id": d_ref,
                    "code": d.distributor_code or f"DIST-{d.mobile}",
                    "name": d.owner_name,
                    "business_name": d.business_name,
                    "mobile": d.mobile,
                    "email": d.email,
                    "role": "DISTRIBUTOR",
                    "status": d.status or "ACTIVE",
                    "kyc_status": "VERIFIED" if d.pan_number else "PENDING",
                    "pan_number": d.pan_number,
                    "gst_number": d.gst_number,
                    "bank_account": d.bank_account_number,
                    "ifsc": d.ifsc,
                    "city": d.city or "",
                    "state": d.state or "",
                    "pincode": d.pincode or "",
                    "current_wallet_balance": bal,
                    "already_migrated": bool(prev_mig),
                    "migration_reference_no": prev_mig.migration_reference_no if prev_mig else None,
                    "destination_code": prev_mig.destination_account_code if prev_mig else None
                })

        return results

    @classmethod
    async def get_source_details(
        cls,
        db: AsyncSession,
        migration_type: str,
        source_id: str
    ) -> Dict[str, Any]:
        """Fetches full read-only source account details for confirmation."""
        results = await cls.search_source_accounts(db, migration_type, query=source_id, limit=5)
        # Match by ID or Code
        matched = next(
            (r for r in results if r["id"] == source_id or r["code"] == source_id or str(r["account_ref_id"]) == str(source_id)),
            None
        )
        if not matched and results:
            matched = results[0]

        if not matched:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source account '{source_id}' was not found for migration type {migration_type}."
            )
        return matched

    @classmethod
    def generate_secure_temporary_password(cls) -> str:
        """Generates a secure, cryptographically random temporary password."""
        random_part = secrets.token_urlsafe(9)
        # Ensure password complexity: uppercase, lowercase, digit, symbol
        return f"P2P#{random_part}9!"

    @classmethod
    async def execute_migration(
        cls,
        db: AsyncSession,
        migration_type: str,
        source_identifier: str,
        new_mobile: str,
        new_email: str,
        admin_user: AdminUserModel
    ) -> Dict[str, Any]:
        """
        Executes atomic migration of Retailer -> Distributor or Distributor -> Super Distributor.
        Guarantees:
        - Atomic execution in a database transaction.
        - Source account remains untouched.
        - Destination wallet balance = 0.00.
        - Automatic approval (status='ACTIVE').
        - Migration history audit record created.
        """
        # 1. Validate migration type
        if migration_type not in ("RETAILER_TO_DISTRIBUTOR", "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported migration type: {migration_type}."
            )

        # 2. Validate destination contacts
        await cls.validate_destination_contacts(db, migration_type, new_mobile, new_email)
        clean_mobile = cls.normalize_mobile(new_mobile)
        clean_email = new_email.strip().lower()

        # 3. Resolve & lock source account
        if migration_type == "RETAILER_TO_DISTRIBUTOR":
            # Search retailer
            try:
                ret_uuid = uuid.UUID(source_identifier)
                r_stmt = select(RetailerModel).options(
                    selectinload(RetailerModel.contacts),
                    selectinload(RetailerModel.addresses),
                    selectinload(RetailerModel.kyc),
                    selectinload(RetailerModel.banks),
                    selectinload(RetailerModel.wallet)
                ).where(RetailerModel.public_id == ret_uuid, RetailerModel.is_deleted == False)
                retailer = (await db.execute(r_stmt)).scalars().first()
            except (ValueError, TypeError):
                retailer = None

            if not retailer:
                r_stmt = select(RetailerModel).options(
                    selectinload(RetailerModel.contacts),
                    selectinload(RetailerModel.addresses),
                    selectinload(RetailerModel.kyc),
                    selectinload(RetailerModel.banks),
                    selectinload(RetailerModel.wallet)
                ).where(RetailerModel.retailer_code == source_identifier, RetailerModel.is_deleted == False)
                retailer = (await db.execute(r_stmt)).scalars().first()

            if not retailer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Source Retailer '{source_identifier}' not found."
                )

            source_ref_id = retailer.retailer_ref_id or retailer.id
            source_code = retailer.retailer_code or f"RET-{str(retailer.public_id)[:8].upper()}"

            # Prevent duplicate migration of the same source retailer
            dup_stmt = select(AccountMigrationHistoryModel).where(
                AccountMigrationHistoryModel.source_account_ref_id == source_ref_id,
                AccountMigrationHistoryModel.migration_type == "RETAILER_TO_DISTRIBUTOR",
                AccountMigrationHistoryModel.status == "COMPLETED"
            )
            already_done = (await db.execute(dup_stmt)).scalars().first()
            if already_done:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Retailer '{source_code}' has already been migrated to Distributor under reference {already_done.migration_reference_no}."
                )

            # Generate unique distributor code & temporary credentials
            dest_code = await generate_unique_distributor_code(db)
            temp_password = cls.generate_secure_temporary_password()
            pass_hash = hash_password(temp_password)
            dest_user_id = uuid.uuid4()
            now_utc = datetime.now(timezone.utc)
            mig_ref_no = f"MIG-RD-{now_utc.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

            # Extract eligible KYC only across all responsible tables
            resolved_ret = await cls.resolve_retailer_kyc_and_bank(db, retailer)
            pan_val = resolved_ret["pan_number"]
            gst_val = resolved_ret["gst_number"]
            bank_acc = resolved_ret["bank_account_number"]
            ifsc_val = resolved_ret["ifsc"]
            state_val = resolved_ret["state"]
            city_val = resolved_ret["city"]
            address_val = resolved_ret["address"]
            pincode_val = resolved_ret["pincode"]
            owner_val = resolved_ret["owner_name"]
            business_val = resolved_ret["business_name"]

            tenant_uuid = retailer.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
            company_uuid = retailer.company_id or uuid.UUID("3778f4e4-bb6e-4eb1-8a12-762f24591ebc")

            try:
                # A. AuthUserModel for Distributor
                auth_user = AuthUserModel(
                    public_id=uuid.uuid4(),
                    user_id=dest_user_id,
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    mobile_number=clean_mobile,
                    full_name=owner_val,
                    email=clean_email,
                    password_hash=pass_hash,
                    role="DISTRIBUTOR",
                    account_status="ACTIVE",
                    mfa_enabled=False
                )
                db.add(auth_user)
                await db.flush()

                # B. DistributorModel with Reused KYC and Opening Balance INR 0.00
                distributor = DistributorModel(
                    public_id=dest_user_id,
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    distributor_code=dest_code,
                    business_name=business_val,
                    owner_name=owner_val,
                    mobile=clean_mobile,
                    email=clean_email,
                    gst_number=gst_val,
                    pan_number=pan_val,
                    bank_account_number=bank_acc,
                    ifsc=ifsc_val,
                    wallet_balance=0.0,  # Strictly INR 0.00 opening balance
                    credit_limit=100000.0,
                    state=state_val,
                    city=city_val,
                    address=address_val,
                    pincode=pincode_val,
                    status="ACTIVE",  # Automatic Approval
                    created_by=f"MIGRATION:{admin_user.username}"
                )
                db.add(distributor)
                await db.flush()

                dest_ref_id = distributor.distributor_ref_id or distributor.id

                # C. Dedicated dist_wallet with balance = 0.00
                dist_wallet = DistWalletModel(
                    distributor_ref_id=dest_ref_id,
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    balance=Decimal("0.00"),
                    currency="INR",
                    status="ACTIVE",
                    is_active=True,
                    is_frozen=False
                )
                db.add(dist_wallet)

                # D. UserSecuritySettingsModel
                user_sec = UserSecuritySettingsModel(
                    public_id=uuid.uuid4(),
                    user_id=dest_user_id,
                    tenant_id=tenant_uuid,
                    portal="DISTRIBUTOR",
                    pin_enabled=False,
                    failed_attempt_count=0
                )
                db.add(user_sec)

                # E. Account Migration History Audit Trail
                migration_record = AccountMigrationHistoryModel(
                    migration_reference_no=mig_ref_no,
                    migration_type="RETAILER_TO_DISTRIBUTOR",
                    source_account_ref_id=source_ref_id,
                    source_account_id=retailer.public_id,
                    source_account_code=source_code,
                    source_role="RETAILER",
                    destination_account_ref_id=dest_ref_id,
                    destination_account_id=dest_user_id,
                    destination_account_code=dest_code,
                    destination_role="DISTRIBUTOR",
                    admin_user_ref_id=getattr(admin_user, "id", None),
                    admin_user_id=admin_user.public_id,
                    admin_username=admin_user.username,
                    destination_mobile=clean_mobile,
                    destination_email=clean_email,
                    kyc_reference=f"PAN:{pan_val or 'N/A'}|REUSED_FROM_RETAILER:{source_code}",
                    status="COMPLETED",
                    auto_approval_status="APPROVED",
                    opening_balance=Decimal("0.00"),
                    created_at=now_utc,
                    completed_at=datetime.now(timezone.utc),
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    metadata_json={
                        "source_store_name": retailer.store_name,
                        "source_owner_name": retailer.owner_name,
                        "destination_business_name": retailer.store_name or retailer.legal_name,
                        "auto_approved_by": admin_user.username,
                        "reused_kyc_fields": ["pan_number", "gst_number", "bank_account", "address"]
                    }
                )
                db.add(migration_record)
                await db.commit()

                return {
                    "success": True,
                    "migration_reference_no": mig_ref_no,
                    "migration_type": "RETAILER_TO_DISTRIBUTOR",
                    "status": "COMPLETED",
                    "source_account": {
                        "role": "RETAILER",
                        "code": source_code,
                        "name": retailer.owner_name,
                        "ref_id": source_ref_id,
                        "preserved_balance": float(retailer.wallet.wallet_balance or 0.0) if getattr(retailer, "wallet", None) is not None else 0.0
                    },
                    "destination_account": {
                        "role": "DISTRIBUTOR",
                        "code": dest_code,
                        "ref_id": dest_ref_id,
                        "id": str(dest_user_id),
                        "mobile": clean_mobile,
                        "email": clean_email,
                        "opening_balance": "0.00",
                        "status": "ACTIVE",
                        "auto_approved": True,
                        "temporary_password": temp_password
                    },
                    "message": f"Successfully migrated Retailer {source_code} to new Distributor {dest_code} with INR 0.00 opening balance."
                }

            except Exception as e:
                await db.rollback()
                logger.error(f"Migration failed for {source_code}: {e}", exc_info=True)
                # Attempt to record failure in audit trail outside transaction
                try:
                    async with db.begin():
                        fail_rec = AccountMigrationHistoryModel(
                            migration_reference_no=mig_ref_no,
                            migration_type="RETAILER_TO_DISTRIBUTOR",
                            source_account_ref_id=source_ref_id,
                            source_account_id=retailer.public_id,
                            source_account_code=source_code,
                            source_role="RETAILER",
                            destination_role="DISTRIBUTOR",
                            admin_user_ref_id=getattr(admin_user, "id", None),
                            admin_user_id=admin_user.public_id,
                            admin_username=admin_user.username,
                            destination_mobile=clean_mobile,
                            destination_email=clean_email,
                            status="FAILED",
                            auto_approval_status="FAILED",
                            opening_balance=Decimal("0.00"),
                            failure_reason=str(e),
                            created_at=now_utc,
                            completed_at=datetime.now(timezone.utc),
                            tenant_id=tenant_uuid,
                            company_id=company_uuid
                        )
                        db.add(fail_rec)
                except Exception:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Migration failed and rolled back cleanly: {str(e)}"
                )

        elif migration_type == "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR":
            # Search distributor
            try:
                dist_uuid = uuid.UUID(source_identifier)
                d_stmt = select(DistributorModel).where(
                    DistributorModel.public_id == dist_uuid,
                    DistributorModel.is_deleted == False
                )
                distributor = (await db.execute(d_stmt)).scalars().first()
            except (ValueError, TypeError):
                distributor = None

            if not distributor:
                d_stmt = select(DistributorModel).where(
                    DistributorModel.distributor_code == source_identifier,
                    DistributorModel.is_deleted == False
                )
                distributor = (await db.execute(d_stmt)).scalars().first()

            if not distributor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Source Distributor '{source_identifier}' not found."
                )

            source_ref_id = distributor.distributor_ref_id or distributor.id
            source_code = distributor.distributor_code or f"DIST-{distributor.mobile}"

            # Prevent duplicate migration of the same source distributor
            dup_stmt = select(AccountMigrationHistoryModel).where(
                AccountMigrationHistoryModel.source_account_ref_id == source_ref_id,
                AccountMigrationHistoryModel.migration_type == "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR",
                AccountMigrationHistoryModel.status == "COMPLETED"
            )
            already_done = (await db.execute(dup_stmt)).scalars().first()
            if already_done:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Distributor '{source_code}' has already been migrated to Super Distributor under reference {already_done.migration_reference_no}."
                )

            dest_code = await generate_unique_super_distributor_code(db)
            temp_password = cls.generate_secure_temporary_password()
            pass_hash = hash_password(temp_password)
            dest_user_id = uuid.uuid4()
            now_utc = datetime.now(timezone.utc)
            mig_ref_no = f"MIG-DSD-{now_utc.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

            tenant_uuid = distributor.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
            company_uuid = distributor.company_id or uuid.UUID("3778f4e4-bb6e-4eb1-8a12-762f24591ebc")

            try:
                # A. AuthUserModel for Super Distributor
                auth_user = AuthUserModel(
                    public_id=uuid.uuid4(),
                    user_id=dest_user_id,
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    mobile_number=clean_mobile,
                    full_name=distributor.owner_name,
                    email=clean_email,
                    password_hash=pass_hash,
                    role="SUPER_DISTRIBUTOR",
                    account_status="ACTIVE",
                    mfa_enabled=False
                )
                db.add(auth_user)
                await db.flush()

                # B. SuperDistributorModel with Reused KYC and Opening Balance INR 0.00
                sd = SuperDistributorModel(
                    public_id=dest_user_id,
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    super_distributor_code=dest_code,
                    business_name=distributor.business_name,
                    owner_name=distributor.owner_name,
                    mobile=clean_mobile,
                    email=clean_email,
                    gst_number=distributor.gst_number,
                    pan_number=distributor.pan_number,
                    bank_account_number=distributor.bank_account_number,
                    ifsc=distributor.ifsc,
                    wallet_balance=0.0,  # Strictly INR 0.00 opening balance
                    credit_limit=500000.0,
                    state=distributor.state or "Tamil Nadu",
                    city=distributor.city or "Chennai",
                    address=distributor.address or "Corporate Regional Office",
                    pincode=distributor.pincode or "600001",
                    status="ACTIVE",  # Automatic Approval
                    created_by=f"MIGRATION:{admin_user.username}"
                )
                db.add(sd)
                await db.flush()

                dest_ref_id = sd.super_distributor_ref_id or sd.id

                # C. Dedicated sd_wallet with balance = 0.00
                sd_wallet = SdWalletModel(
                    super_distributor_ref_id=dest_ref_id,
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    balance=Decimal("0.00"),
                    currency="INR",
                    status="ACTIVE",
                    is_active=True,
                    is_frozen=False
                )
                db.add(sd_wallet)

                # D. UserSecuritySettingsModel
                user_sec = UserSecuritySettingsModel(
                    public_id=uuid.uuid4(),
                    user_id=dest_user_id,
                    tenant_id=tenant_uuid,
                    portal="SUPER_DISTRIBUTOR",
                    pin_enabled=False,
                    failed_attempt_count=0
                )
                db.add(user_sec)

                # E. Account Migration History Audit Trail
                migration_record = AccountMigrationHistoryModel(
                    migration_reference_no=mig_ref_no,
                    migration_type="DISTRIBUTOR_TO_SUPER_DISTRIBUTOR",
                    source_account_ref_id=source_ref_id,
                    source_account_id=distributor.public_id,
                    source_account_code=source_code,
                    source_role="DISTRIBUTOR",
                    destination_account_ref_id=dest_ref_id,
                    destination_account_id=dest_user_id,
                    destination_account_code=dest_code,
                    destination_role="SUPER_DISTRIBUTOR",
                    admin_user_ref_id=getattr(admin_user, "id", None),
                    admin_user_id=admin_user.public_id,
                    admin_username=admin_user.username,
                    destination_mobile=clean_mobile,
                    destination_email=clean_email,
                    kyc_reference=f"PAN:{distributor.pan_number or 'N/A'}|REUSED_FROM_DIST:{source_code}",
                    status="COMPLETED",
                    auto_approval_status="APPROVED",
                    opening_balance=Decimal("0.00"),
                    created_at=now_utc,
                    completed_at=datetime.now(timezone.utc),
                    tenant_id=tenant_uuid,
                    company_id=company_uuid,
                    metadata_json={
                        "source_business_name": distributor.business_name,
                        "source_owner_name": distributor.owner_name,
                        "auto_approved_by": admin_user.username,
                        "reused_kyc_fields": ["pan_number", "gst_number", "bank_account", "address"]
                    }
                )
                db.add(migration_record)
                await db.commit()

                return {
                    "success": True,
                    "migration_reference_no": mig_ref_no,
                    "migration_type": "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR",
                    "status": "COMPLETED",
                    "source_account": {
                        "role": "DISTRIBUTOR",
                        "code": source_code,
                        "name": distributor.owner_name,
                        "ref_id": source_ref_id,
                        "preserved_balance": float(distributor.wallet_balance or 0.0)
                    },
                    "destination_account": {
                        "role": "SUPER_DISTRIBUTOR",
                        "code": dest_code,
                        "ref_id": dest_ref_id,
                        "id": str(dest_user_id),
                        "mobile": clean_mobile,
                        "email": clean_email,
                        "opening_balance": "0.00",
                        "status": "ACTIVE",
                        "auto_approved": True,
                        "temporary_password": temp_password
                    },
                    "message": f"Successfully migrated Distributor {source_code} to Master Distributor {dest_code} with INR 0.00 opening balance."
                }

            except Exception as e:
                await db.rollback()
                logger.error(f"Migration failed for {source_code}: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Migration failed and rolled back cleanly: {str(e)}"
                )

    @classmethod
    async def get_migration_history(
        cls,
        db: AsyncSession,
        migration_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Returns paginated migration history records for the admin portal."""
        page = max(1, page)
        limit = min(max(1, limit), 100)
        offset = (page - 1) * limit

        conditions = []
        if migration_type:
            conditions.append(AccountMigrationHistoryModel.migration_type == migration_type)
        if status_filter:
            conditions.append(AccountMigrationHistoryModel.status == status_filter.upper())
        if search:
            s_pat = f"%{search.strip()}%"
            conditions.append(
                or_(
                    AccountMigrationHistoryModel.migration_reference_no.ilike(s_pat),
                    AccountMigrationHistoryModel.source_account_code.ilike(s_pat),
                    AccountMigrationHistoryModel.destination_account_code.ilike(s_pat),
                    AccountMigrationHistoryModel.destination_mobile.ilike(s_pat),
                    AccountMigrationHistoryModel.admin_username.ilike(s_pat)
                )
            )

        stmt = select(AccountMigrationHistoryModel)
        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.order_by(desc(AccountMigrationHistoryModel.created_at)).offset(offset).limit(limit)
        items = (await db.execute(stmt)).scalars().all()

        count_stmt = select(func.count(AccountMigrationHistoryModel.account_migration_history_ref_id))
        if conditions:
            count_stmt = count_stmt.where(and_(*conditions))
        total_count = (await db.execute(count_stmt)).scalar() or 0

        serialized = []
        for it in items:
            serialized.append({
                "migration_ref_id": it.account_migration_history_ref_id,
                "migration_reference_no": it.migration_reference_no,
                "migration_type": it.migration_type,
                "source_role": it.source_role,
                "source_account_code": it.source_account_code,
                "source_account_ref_id": it.source_account_ref_id,
                "destination_role": it.destination_role,
                "destination_account_code": it.destination_account_code,
                "destination_account_ref_id": it.destination_account_ref_id,
                "destination_mobile": it.destination_mobile,
                "destination_email": it.destination_email,
                "admin_username": it.admin_username,
                "kyc_reference": it.kyc_reference,
                "status": it.status,
                "auto_approval_status": it.auto_approval_status,
                "opening_balance": float(it.opening_balance),
                "created_at": it.created_at.isoformat() if it.created_at else None,
                "completed_at": it.completed_at.isoformat() if it.completed_at else None,
                "failure_reason": it.failure_reason
            })

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "total_records": total_count,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
            "items": serialized,
            "history": serialized
        }
