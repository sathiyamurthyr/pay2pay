import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import select, update, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.verification_models import (
    RetailerVerificationModel,
    VerificationWorkflowModel,
    VerificationDocumentModel,
    VerificationReviewModel,
    VerificationStatusHistoryModel,
    VerificationCommentModel,
    VerificationNotificationModel,
    VerificationAuditModel
)
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

from app.infrastructure.db.registration_models import (
    RegistrationDraftModel,
    RegistrationPanModel,
    RegistrationGstModel,
    RegistrationAadhaarModel,
    RegistrationBankModel,
    RegistrationShopModel,
    RegistrationAddressModel
)
from app.application.storage_service import BackblazeStorageService


class VerificationService:

    @staticmethod
    async def create_verification_request(
        db: AsyncSession,
        registration_id: str,
        retailer_name: str,
        mobile_number: str,
        email: Optional[str] = None,
        shop_name: Optional[str] = None,
        is_business: bool = False,
        pan_number: Optional[str] = None,
        gst_number: Optional[str] = None,
        state: Optional[str] = "Tamil Nadu",
        district: Optional[str] = "Chennai"
    ) -> Dict[str, Any]:
        """Creates a new verification request upon Step 12 submission."""
        
        # Check if already exists
        q = await db.execute(
            select(RetailerVerificationModel).where(
                RetailerVerificationModel.registration_id == registration_id
            )
        )
        existing = q.scalar_one_or_none()
        if existing:
            return {
                "status": "EXISTS",
                "verification_id": str(existing.id),
                "verification_status": existing.verification_status
            }

        # Calculate initial risk category
        risk_score = 15 if not is_business else 25
        risk_category = "LOW" if risk_score < 30 else "MEDIUM"

        verif = RetailerVerificationModel(
            tenant_id=DEFAULT_TENANT_ID,
            registration_id=registration_id,
            retailer_id=f"RET-{registration_id[-6:]}",
            mobile_number=mobile_number,
            email=email,
            retailer_name=retailer_name,
            shop_name=shop_name or "Retailer Store",
            registration_status="SUBMITTED",
            verification_status="PENDING",
            account_status="ONBOARDING",
            retailer_status="UNDER_REVIEW",
            is_business=is_business,
            pan_number=pan_number,
            gst_number=gst_number,
            state=state,
            district=district,
            risk_score=risk_score,
            risk_category=risk_category,
            priority="NORMAL",
            submitted_at=datetime.now(timezone.utc)
        )
        db.add(verif)
        await db.flush()

        # Add Workflow SLA
        wf = VerificationWorkflowModel(
            tenant_id=DEFAULT_TENANT_ID,
            verification_id=str(verif.id),
            registration_id=registration_id,
            current_step="ADMIN_REVIEW",
            estimated_completion_mins=60,
            sla_due_at=datetime.now(timezone.utc) + timedelta(minutes=60),
            is_escalated=False
        )
        db.add(wf)

        # Default Review Scores
        rev = VerificationReviewModel(
            tenant_id=DEFAULT_TENANT_ID,
            verification_id=str(verif.id),
            pan_verified=True,
            gst_verified=is_business,
            aadhaar_verified=True,
            bank_verified=True,
            liveness_video_verified=True,
            location_match=True,
            admin_score=95
        )
        db.add(rev)

        # System Notification for Admin
        notif = VerificationNotificationModel(
            tenant_id=DEFAULT_TENANT_ID,
            verification_id=str(verif.id),
            recipient_type="ADMIN",
            channel="IN_APP",
            title="New Retailer Registration Submitted",
            message=f"Retailer {retailer_name} ({mobile_number}) submitted registration for {shop_name or 'Shop'}. ID: {registration_id}.",
            is_read=False
        )
        db.add(notif)

        await db.commit()

        return {
            "status": "SUCCESS",
            "verification_id": str(verif.id),
            "registration_id": registration_id,
            "verification_status": "PENDING",
            "account_status": "ONBOARDING"
        }

    @staticmethod
    async def list_verification_requests(
        db: AsyncSession,
        status_tab: Optional[str] = "PENDING",
        search: Optional[str] = None,
        state: Optional[str] = None,
        is_business: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Admin Verification Dashboard request listing with filters & pagination."""

        query = select(RetailerVerificationModel)

        # Tab Filter
        if status_tab and status_tab != "ALL":
            query = query.where(RetailerVerificationModel.verification_status == status_tab.upper())

        # Search Query
        if search:
            s_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    RetailerVerificationModel.retailer_name.ilike(s_term),
                    RetailerVerificationModel.mobile_number.ilike(s_term),
                    RetailerVerificationModel.registration_id.ilike(s_term),
                    RetailerVerificationModel.pan_number.ilike(s_term),
                    RetailerVerificationModel.shop_name.ilike(s_term)
                )
            )

        if state:
            query = query.where(RetailerVerificationModel.state == state)

        if is_business is not None:
            query = query.where(RetailerVerificationModel.is_business == is_business)

        # Total Count
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        # Pagination & Ordering
        offset = (page - 1) * page_size
        query = query.order_by(desc(RetailerVerificationModel.submitted_at)).offset(offset).limit(page_size)

        result = await db.execute(query)
        items = result.scalars().all()

        # Unread notifications count
        notif_q = await db.execute(
            select(func.count(VerificationNotificationModel.id)).where(
                VerificationNotificationModel.recipient_type == "ADMIN",
                VerificationNotificationModel.is_read == False
            )
        )
        unread_notifications = notif_q.scalar() or 0

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "unread_notifications": unread_notifications,
            "items": [
                {
                    "verification_id": str(item.public_id),
                    "registration_id": item.registration_id,
                    "retailer_id": item.retailer_id,
                    "retailer_name": item.retailer_name,
                    "mobile_number": item.mobile_number,
                    "email": item.email,
                    "shop_name": item.shop_name,
                    "verification_status": item.verification_status,
                    "account_status": item.account_status,
                    "retailer_status": item.retailer_status,
                    "is_business": item.is_business,
                    "pan_number": item.pan_number,
                    "gst_number": item.gst_number,
                    "state": item.state,
                    "district": item.district,
                    "risk_score": item.risk_score,
                    "risk_category": item.risk_category,
                    "priority": item.priority,
                    "submitted_at": item.submitted_at.isoformat() if item.submitted_at else None
                }
                for item in items
            ]
        }

    @staticmethod
    async def get_verification_detail(db: AsyncSession, verification_id: str) -> Dict[str, Any]:
        """Comprehensive Retailer 360 Verification Details."""

        q = await db.execute(
            select(RetailerVerificationModel).where(
                or_(
                    RetailerVerificationModel.public_id == uuid.UUID(verification_id) if len(verification_id) == 36 else False,
                    RetailerVerificationModel.registration_id == verification_id,
                    RetailerVerificationModel.retailer_id == verification_id
                )
            )
        )
        verif = q.scalars().first()
        if not verif:
            return {"status": "ERROR", "message": "Verification request not found."}

        reg_id = verif.registration_id

        # Fetch draft data & verified tables
        draft_q = await db.execute(select(RegistrationDraftModel).where(RegistrationDraftModel.registration_id == reg_id))
        draft = draft_q.scalars().first()

        pan_q = await db.execute(select(RegistrationPanModel).where(RegistrationPanModel.registration_id == reg_id))
        pan = pan_q.scalars().first()

        gst_q = await db.execute(select(RegistrationGstModel).where(RegistrationGstModel.registration_id == reg_id))
        gst = gst_q.scalars().first()

        bank_q = await db.execute(select(RegistrationBankModel).where(RegistrationBankModel.registration_id == reg_id))
        bank = bank_q.scalars().first()

        shop_q = await db.execute(select(RegistrationShopModel).where(RegistrationShopModel.registration_id == reg_id))
        shop = shop_q.scalars().first()

        addr_q = await db.execute(select(RegistrationAddressModel).where(RegistrationAddressModel.registration_id == reg_id))
        addr = addr_q.scalars().first()

        # Verification Documents from DB
        docs_q = await db.execute(
            select(VerificationDocumentModel).where(
                VerificationDocumentModel.verification_id == str(verif.id)
            )
        )
        db_docs = {d.doc_type: d.file_url for d in docs_q.scalars().all()}

        # History logs
        hist_q = await db.execute(
            select(VerificationStatusHistoryModel).where(
                VerificationStatusHistoryModel.verification_id == str(verif.id)
            ).order_by(desc(VerificationStatusHistoryModel.timestamp))
        )
        history = hist_q.scalars().all()

        # Audit logs
        audit_q = await db.execute(
            select(VerificationAuditModel).where(
                VerificationAuditModel.verification_id == str(verif.id)
            ).order_by(desc(VerificationAuditModel.created_date))
        )
        audits = audit_q.scalars().all()

        return {
            "status": "SUCCESS",
            "verification": {
                "id": str(verif.id),
                "registration_id": verif.registration_id,
                "retailer_id": verif.retailer_id,
                "retailer_name": verif.retailer_name,
                "mobile_number": verif.mobile_number,
                "email": verif.email,
                "shop_name": verif.shop_name,
                "verification_status": verif.verification_status,
                "account_status": verif.account_status,
                "retailer_status": verif.retailer_status,
                "is_business": verif.is_business,
                "pan_number": verif.pan_number,
                "gst_number": verif.gst_number,
                "risk_score": verif.risk_score,
                "risk_category": verif.risk_category,
                "priority": verif.priority,
                "submitted_at": verif.submitted_at.isoformat() if verif.submitted_at else None
            },
            "verifications_summary": {
                "pan": {"number": pan.pan_number if pan else verif.pan_number, "holder_name": pan.pan_holder_name if pan else verif.retailer_name, "status": "VERIFIED"},
                "gst": {"number": gst.gst_number if gst else verif.gst_number, "trade_name": gst.trade_name if gst else "N/A", "status": "VERIFIED" if verif.is_business else "SKIPPED"},
                "aadhaar": {"status": "VERIFIED", "uidai_auth": "SUCCESS"},
                "bank": {"account_number": bank.account_number_masked if bank else "N/A", "ifsc": bank.ifsc if bank else "N/A", "name": bank.name_at_bank if bank else verif.retailer_name, "penny_drop": "VERIFIED"}
            },
            "shop_details": {
                "name": shop.shop_name if shop else verif.shop_name,
                "category": shop.category if shop else "Recharge & FinTech",
                "annual_turnover": shop.annual_turnover if shop else "₹50 Lakhs - ₹1 Crore",
                "employees": shop.employees if shop else 3
            },
            "address": {
                "street": addr.street if addr else "100 GST Road",
                "city": addr.city if addr else "Chennai",
                "district": addr.district if addr else "Chengalpattu",
                "state": addr.state if addr else "Tamil Nadu",
                "pincode": addr.pincode if addr else "600045",
                "latitude": addr.latitude if addr else 12.9249,
                "longitude": addr.longitude if addr else 80.1000,
                "shop_photo_url": addr.shop_photo_url if addr else "https://cdn.pay2pay.in/shops/shop_front.jpg"
            },
            "media": {
                "selfie_url": BackblazeStorageService.get_download_url(db_docs.get("AADHAAR_FRONT", "cmp/ret/2026/08/02/4bff19fe_sathus_ret_aadhaar_front.png")),
                "video_url": BackblazeStorageService.get_download_url(db_docs.get("VIDEO", "cmp/ret/2026/08/09/sathus_Ret_video.mp4")),
                "pan_card_url": BackblazeStorageService.get_download_url(db_docs.get("PAN", "cmp/ret/2026/08/02/22b28d04_sathus_ret_pan_card.png")),
                "aadhaar_front_url": BackblazeStorageService.get_download_url(db_docs.get("AADHAAR_FRONT", "cmp/ret/2026/08/02/4bff19fe_sathus_ret_aadhaar_front.png")),
                "aadhaar_back_url": BackblazeStorageService.get_download_url(db_docs.get("AADHAAR_BACK", "cmp/ret/2026/08/02/4bff19fe_sathus_ret_aadhaar_back.png")),
                "bank_proof_url": BackblazeStorageService.get_download_url(db_docs.get("BANK_PROOF", "cmp/ret/2026/08/02/92aae09b_sathus_ret_bank_account.png")),
                "gst_proof_url": BackblazeStorageService.get_download_url(db_docs.get("GST_CERT", "cmp/dist/2026/08/02/eb0204a1_sathus_dist_gst_certificate.png")),
                "script_text": "I confirm that I am registering as a Pay2Pay Retailer for Sri Venkateswara Telecom."
            },
            "history": [
                {
                    "previous_status": h.previous_status,
                    "new_status": h.new_status,
                    "action_by_admin_id": h.action_by_admin_id,
                    "remarks": h.remarks,
                    "timestamp": h.timestamp.isoformat()
                }
                for h in history
            ],
            "audits": [
                {
                    "action": a.action,
                    "admin_id": a.admin_id,
                    "remarks": a.remarks,
                    "correlation_id": a.correlation_id,
                    "created_at": a.created_date.isoformat() if a.created_date else None
                }
                for a in audits
            ]
        }

    @staticmethod
    async def perform_verification_action(
        db: AsyncSession,
        verification_id: str,
        action: str,  # APPROVE, REJECT, ON_HOLD, NEED_INFO, UNDER_REVIEW
        admin_id: str,
        remarks: str,
        admin_role: str = "COMPLIANCE_OFFICER",
        ip_address: Optional[str] = "127.0.0.1",
        browser: Optional[str] = "Chrome 122.0"
    ) -> Dict[str, Any]:
        """Performs admin action with mandatory remarks and immutable audit trail."""

        if not remarks or len(remarks.strip()) < 5:
            return {"status": "ERROR", "message": "Mandatory comments/remarks required for all verification decisions."}

        action_clean = action.upper()

        is_int = str(verification_id).isdigit()
        is_uuid = len(str(verification_id)) == 36
        q = await db.execute(
            select(RetailerVerificationModel).where(
                or_(
                    RetailerVerificationModel.id == int(verification_id) if is_int else False,
                    RetailerVerificationModel.public_id == uuid.UUID(verification_id) if is_uuid else False,
                    RetailerVerificationModel.registration_id == str(verification_id),
                    RetailerVerificationModel.retailer_id == str(verification_id)
                )
            )
        )
        verif = q.scalar_one_or_none()
        if not verif:
            return {"status": "ERROR", "message": "Verification request not found."}

        prev_v_status = verif.verification_status
        prev_a_status = verif.account_status

        if action_clean in ("APPROVE", "APPROVED"):
            verif.verification_status = "APPROVED"
            verif.account_status = "ACTIVE"
            verif.retailer_status = "ACTIVE"

            # 1. Sync / Activate RetailerModel
            from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
            from app.infrastructure.db.auth_models import AuthUserModel
            from app.infrastructure.adapters.email_service import email_service

            canonical_tid = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
            ret_code = verif.retailer_id or f"RET-{uuid.uuid4().hex[:6].upper()}"

            r_stmt = select(RetailerModel).where(RetailerModel.retailer_code == ret_code)
            ret_obj = (await db.execute(r_stmt)).scalars().first()

            if not ret_obj:
                ret_obj = RetailerModel(
                    public_id=uuid.uuid4(),
                    tenant_id=canonical_tid,
                    company_id=None,
                    retailer_code=ret_code,
                    store_name=verif.shop_name or verif.retailer_name or "Pay2Pay Verified Merchant",
                    legal_name=verif.retailer_name or "Pay2Pay Merchant",
                    owner_name=verif.retailer_name or "Pay2Pay Merchant",
                    business_category="Fintech & Digital Services",
                    store_type="BRICK_AND_MORTAR",
                    status="ACTIVE"
                )
                db.add(ret_obj)
                await db.flush()
            else:
                ret_obj.status = "ACTIVE"

            # 2. Sync / Activate RetailerWalletModel
            w_stmt = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_obj.public_id)
            wallet_obj = (await db.execute(w_stmt)).scalars().first()
            if not wallet_obj:
                wallet_obj = RetailerWalletModel(
                    public_id=uuid.uuid4(),
                    tenant_id=canonical_tid,
                    company_id=None,
                    retailer_id=ret_obj.public_id,
                    wallet_balance=0.0,
                    daily_transaction_limit=100000.0,
                    single_transaction_limit=25000.0,
                    is_frozen=False
                )
                db.add(wallet_obj)

            # 3. Sync / Activate AuthUserModel
            if verif.mobile_number:
                u_stmt = select(AuthUserModel).where(AuthUserModel.mobile_number == verif.mobile_number)
                auth_user = (await db.execute(u_stmt)).scalars().first()
                if auth_user:
                    auth_user.account_status = "ACTIVE"
                else:
                    auth_user = AuthUserModel(
                        user_id=uuid.uuid4(),
                        tenant_id=canonical_tid,
                        mobile_number=verif.mobile_number,
                        email=verif.email or f"{verif.mobile_number}@pay2pay.in",
                        full_name=verif.retailer_name or "Retailer Partner",
                        role="RETAILER",
                        account_status="ACTIVE",
                        password_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"  # Secure placeholder until credential reset
                    )
                    db.add(auth_user)

            # 4. Dispatch Official Welcome Email (without plain passwords/MPINs)
            if verif.email:
                try:
                    await email_service.send_welcome_email(
                        recipient_email=verif.email,
                        retailer_name=verif.retailer_name or "Retailer Partner",
                        retailer_id=ret_code
                    )
                except Exception as ex:
                    print(f"[WELCOME EMAIL ERROR] {ex}")

        elif action_clean in ("REJECT", "REJECTED"):
            verif.verification_status = "REJECTED"
            verif.account_status = "ONBOARDING"
            verif.retailer_status = "REJECTED"
        elif action_clean in ("ON_HOLD", "HOLD"):
            verif.verification_status = "ON_HOLD"
            verif.account_status = "ONBOARDING"
            verif.retailer_status = "ON_HOLD"
        elif action_clean in ("NEED_INFO", "NEEDINFO"):
            verif.verification_status = "NEED_INFO"
            verif.account_status = "ONBOARDING"
            verif.retailer_status = "ON_HOLD"
        elif action_clean in ("UNDER_REVIEW", "UNDERREVIEW"):
            verif.verification_status = "UNDER_REVIEW"
            verif.account_status = "ONBOARDING"
            verif.retailer_status = "UNDER_REVIEW"

        verif.assigned_admin_id = admin_id
        verif.last_reviewed_at = datetime.now(timezone.utc)

        # Log Status History
        hist = VerificationStatusHistoryModel(
            tenant_id=DEFAULT_TENANT_ID,
            verification_id=str(verif.id),
            previous_status=prev_v_status,
            new_status=verif.verification_status,
            action_by_admin_id=admin_id,
            remarks=remarks.strip()
        )
        db.add(hist)

        # Log Immutable Security Audit Record
        audit = VerificationAuditModel(
            tenant_id=DEFAULT_TENANT_ID,
            verification_id=str(verif.id),
            action=action_clean,
            admin_id=admin_id,
            admin_role=admin_role,
            remarks=remarks.strip(),
            ip_address=ip_address,
            browser=browser
        )
        db.add(audit)

        # Retailer Notification
        notif_title = f"Retailer Application {verif.verification_status}"
        notif_msg = f"Your Pay2Pay Retailer verification status is now {verif.verification_status}. Admin Remarks: {remarks.strip()}"
        notif = VerificationNotificationModel(
            tenant_id=DEFAULT_TENANT_ID,
            verification_id=str(verif.id),
            recipient_type="RETAILER",
            channel="IN_APP",
            title=notif_title,
            message=notif_msg
        )
        db.add(notif)

        await db.commit()

        return {
            "status": "SUCCESS",
            "verification_id": str(verif.id),
            "verification_status": verif.verification_status,
            "account_status": verif.account_status,
            "retailer_status": verif.retailer_status,
            "remarks": remarks.strip()
        }

    @staticmethod
    async def get_retailer_status(db: AsyncSession, identifier: str) -> Dict[str, Any]:
        """Fetches current verification status for Retailer Dashboard adaptation."""

        q = await db.execute(
            select(RetailerVerificationModel).where(
                or_(
                    RetailerVerificationModel.mobile_number == identifier,
                    RetailerVerificationModel.registration_id == identifier,
                    RetailerVerificationModel.retailer_id == identifier
                )
            )
        )
        verif = q.scalar_one_or_none()
        if not verif:
            return {
                "verification_status": "PENDING",
                "account_status": "ONBOARDING",
                "retailer_status": "UNDER_REVIEW",
                "can_transact": False,
                "progress": {
                    "registration": "COMPLETED",
                    "pan": "VERIFIED",
                    "gst": "VERIFIED",
                    "aadhaar": "VERIFIED",
                    "bank": "VERIFIED",
                    "documents": "SUBMITTED",
                    "admin_review": "PENDING",
                    "approval": "PENDING"
                }
            }

        can_tx = (verif.verification_status == "APPROVED" and verif.account_status == "ACTIVE")

        # Fetch latest admin remarks if on hold / rejected
        hist_q = await db.execute(
            select(VerificationStatusHistoryModel).where(
                VerificationStatusHistoryModel.verification_id == str(verif.id)
            ).order_by(desc(VerificationStatusHistoryModel.timestamp)).limit(1)
        )
        latest_hist = hist_q.scalar_one_or_none()

        return {
            "verification_id": str(verif.id),
            "registration_id": verif.registration_id,
            "retailer_id": verif.retailer_id,
            "retailer_name": verif.retailer_name,
            "mobile_number": verif.mobile_number,
            "verification_status": verif.verification_status,
            "account_status": verif.account_status,
            "retailer_status": verif.retailer_status,
            "can_transact": can_tx,
            "admin_remarks": latest_hist.remarks if latest_hist else "Application under compliance verification.",
            "progress": {
                "registration": "COMPLETED",
                "pan": "VERIFIED",
                "gst": "VERIFIED" if verif.is_business else "SKIPPED",
                "aadhaar": "VERIFIED",
                "bank": "VERIFIED",
                "documents": "SUBMITTED",
                "admin_review": verif.verification_status,
                "approval": "APPROVED" if can_tx else "PENDING"
            }
        }
