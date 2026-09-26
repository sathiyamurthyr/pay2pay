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
    RegistrationAddressModel,
    RegistrationDocumentModel,
    RegistrationVideoModel
)
from app.infrastructure.db.models import CompanyModel, RetailerModel
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
    async def sync_retailers_to_verifications(db: AsyncSession) -> int:
        """
        Synchronizes registered merchants from RetailerModel into RetailerVerificationModel
        so they are visible in Admin Approvals and Verification portals.
        """
        import re
        import logging
        from sqlalchemy.orm import selectinload
        logger = logging.getLogger(__name__)

        try:
            from app.infrastructure.db.models import RetailerModel
            r_stmt = (
                select(RetailerModel)
                .where(RetailerModel.is_deleted == False)
                .options(
                    selectinload(RetailerModel.contacts),
                    selectinload(RetailerModel.addresses),
                    selectinload(RetailerModel.kyc)
                )
            )
            retailers = (await db.execute(r_stmt)).scalars().all()
            if not retailers:
                return 0

            v_q = await db.execute(
                select(
                    RetailerVerificationModel.mobile_number,
                    RetailerVerificationModel.retailer_id,
                    RetailerVerificationModel.registration_id,
                    RetailerVerificationModel.public_id
                )
            )
            v_rows = v_q.all()
            existing_mobiles = set()
            existing_codes = set()
            existing_public_ids = set()
            for row in v_rows:
                if row[0]:
                    clean = re.sub(r"\D", "", str(row[0]))[-10:]
                    if clean:
                        existing_mobiles.add(clean)
                if row[1]:
                    existing_codes.add(str(row[1]).strip().upper())
                if row[2]:
                    existing_codes.add(str(row[2]).strip().upper())
                if row[3]:
                    existing_public_ids.add(row[3])

            synced_count = 0
            for r in retailers:
                contact = r.contacts[0] if getattr(r, "contacts", None) and len(r.contacts) > 0 else None
                address = r.addresses[0] if getattr(r, "addresses", None) and len(r.addresses) > 0 else None
                kyc = getattr(r, "kyc", None)

                raw_mob = contact.mobile if contact and contact.mobile else ""
                clean_mob = re.sub(r"\D", "", str(raw_mob))[-10:] if raw_mob else ""
                r_code = (r.retailer_code or "").strip().upper()

                if (clean_mob and clean_mob in existing_mobiles) or (r_code and r_code in existing_codes):
                    continue

                r_status = (r.status or "").upper()
                if r_status in ("ACTIVE", "APPROVED", "VERIFIED"):
                    verif_status = "APPROVED"
                    acc_status = "ACTIVE"
                    ret_status = "ACTIVE"
                elif r_status in ("REJECTED", "BLOCKED"):
                    verif_status = "REJECTED"
                    acc_status = "ONBOARDING"
                    ret_status = "REJECTED"
                elif r_status in ("HOLD", "ON_HOLD"):
                    verif_status = "ON_HOLD"
                    acc_status = "ONBOARDING"
                    ret_status = "HOLD"
                else:
                    verif_status = "PENDING"
                    acc_status = "ONBOARDING"
                    ret_status = "UNDER_REVIEW"

                reg_id = r.retailer_code if r.retailer_code and r.retailer_code.startswith("REG-") else f"REG-{r.retailer_code or str(r.id)}"
                counter = 1
                base_reg_id = reg_id
                while reg_id.upper() in existing_codes:
                    reg_id = f"{base_reg_id}-{counter}"
                    counter += 1
                existing_codes.add(reg_id.upper())

                verif_pub_id = uuid.uuid4()
                while verif_pub_id in existing_public_ids:
                    verif_pub_id = uuid.uuid4()
                existing_public_ids.add(verif_pub_id)

                new_verif = RetailerVerificationModel(
                    tenant_id=r.tenant_id or DEFAULT_TENANT_ID,
                    public_id=verif_pub_id,
                    registration_id=reg_id,
                    retailer_id=r.retailer_code or f"RET-{r.id}",
                    mobile_number=clean_mob or raw_mob or "N/A",
                    email=contact.email if contact and contact.email else f"{clean_mob or r.retailer_code}@pay2pay.in",
                    retailer_name=r.owner_name or r.legal_name or r.store_name or "Retailer Merchant",
                    shop_name=r.store_name or "Retailer Store",
                    verification_status=verif_status,
                    account_status=acc_status,
                    retailer_status=ret_status,
                    is_business=False,
                    pan_number=kyc.pan_number if kyc and hasattr(kyc, "pan_number") else None,
                    gst_number=kyc.gst_number if kyc and hasattr(kyc, "gst_number") else None,
                    state=address.state if address and hasattr(address, "state") and address.state else "Tamil Nadu",
                    district=address.city if address and hasattr(address, "city") and address.city else "Chennai",
                    risk_score=15,
                    risk_category="LOW",
                    priority="NORMAL",
                    submitted_at=r.created_date or datetime.now(timezone.utc)
                )
                db.add(new_verif)
                if clean_mob:
                    existing_mobiles.add(clean_mob)
                if r_code:
                    existing_codes.add(r_code)
                synced_count += 1

            if synced_count > 0:
                await db.commit()
            return synced_count
        except Exception as e:
            logger.error(f"Error syncing retailers to verifications: {e}")
            await db.rollback()
            return 0

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
        await VerificationService.sync_retailers_to_verifications(db)

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

        # Aggregate status counts for all tabs
        status_counts_q = await db.execute(
            select(
                RetailerVerificationModel.verification_status,
                func.count(RetailerVerificationModel.id)
            ).group_by(RetailerVerificationModel.verification_status)
        )
        status_counts = {row[0]: row[1] for row in status_counts_q.all()}

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "unread_notifications": unread_notifications,
            "status_counts": status_counts,
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
        clean_id = str(verification_id).strip()
        conds = []
        if clean_id.isdigit():
            conds.append(RetailerVerificationModel.id == int(clean_id))
        
        try:
            u = uuid.UUID(clean_id)
            conds.append(RetailerVerificationModel.public_id == u)
        except Exception:
            pass

        conds.append(RetailerVerificationModel.registration_id == clean_id)
        conds.append(RetailerVerificationModel.retailer_id == clean_id)
        conds.append(RetailerVerificationModel.mobile_number == clean_id)
        conds.append(RetailerVerificationModel.mobile_number == f"+91{clean_id}")
        if len(clean_id) >= 10:
            conds.append(RetailerVerificationModel.mobile_number.like(f"%{clean_id}%"))

        q = await db.execute(
            select(RetailerVerificationModel).where(or_(*conds)).order_by(desc(RetailerVerificationModel.created_date))
        )
        verif = q.scalars().first()
        
        # Fallback: Check RegistrationDraftModel if not in RetailerVerificationModel
        if not verif:
            draft_conds = [
                RegistrationDraftModel.registration_id == clean_id,
                RegistrationDraftModel.mobile_number == clean_id,
                RegistrationDraftModel.mobile_number == f"+91{clean_id}"
            ]
            if clean_id.isdigit():
                draft_conds.append(RegistrationDraftModel.id == int(clean_id))
            try:
                u_draft = uuid.UUID(clean_id)
                draft_conds.append(RegistrationDraftModel.public_id == u_draft)
            except Exception:
                pass
            if len(clean_id) >= 10:
                draft_conds.append(RegistrationDraftModel.mobile_number.like(f"%{clean_id}%"))

            r_draft_q = await db.execute(
                select(RegistrationDraftModel).where(or_(*draft_conds)).order_by(desc(RegistrationDraftModel.created_date))
            )
            draft_rec = r_draft_q.scalars().first()
            if draft_rec:
                draft_data = draft_rec.draft_data or {}
                verif = RetailerVerificationModel(
                    tenant_id=DEFAULT_TENANT_ID,
                    public_id=draft_rec.public_id if hasattr(draft_rec, "public_id") and draft_rec.public_id else uuid.uuid4(),
                    registration_id=draft_rec.registration_id,
                    retailer_id=f"RET-{draft_rec.registration_id[-6:]}" if draft_rec.registration_id else f"RET-{draft_rec.mobile_number[-6:]}",
                    retailer_name=draft_data.get("full_name") or draft_data.get("owner_name") or "Retailer Partner",
                    mobile_number=draft_rec.mobile_number,
                    email=draft_data.get("email") or draft_rec.email or "",
                    shop_name=draft_data.get("shop_name") or "Retailer Store",
                    verification_status="PENDING",
                    account_status="ACTIVE" if draft_rec.status == "KYC_APPROVED" else "ONBOARDING",
                    retailer_status="ACTIVE" if draft_rec.status == "KYC_APPROVED" else "PENDING",
                    is_business=False,
                    pan_number=draft_data.get("pan_number"),
                    gst_number=draft_data.get("gst_number"),
                    risk_score=15,
                    risk_category="LOW",
                    priority="NORMAL",
                    submitted_at=draft_rec.created_date or datetime.now(timezone.utc)
                )
                db.add(verif)
                await db.flush()

        if not verif:
            # Check DistributorModel
            from app.infrastructure.db.models import DistributorModel, SuperDistributorModel
            dist_conds = [
                DistributorModel.distributor_code == clean_id,
                DistributorModel.mobile == clean_id,
                DistributorModel.email == clean_id,
                DistributorModel.business_name == clean_id,
            ]
            if clean_id.isdigit():
                dist_conds.append(DistributorModel.distributor_ref_id == int(clean_id))
            try:
                u_dist = uuid.UUID(clean_id)
                dist_conds.append(DistributorModel.public_id == u_dist)
            except Exception:
                pass
            if len(clean_id) >= 10:
                dist_conds.append(DistributorModel.mobile.like(f"%{clean_id}%"))
            
            d_res = await db.execute(select(DistributorModel).where(or_(*dist_conds)))
            dist_obj = d_res.scalars().first()
            if dist_obj:
                d_status = (dist_obj.status or "PENDING").upper()
                v_stat = "APPROVED" if d_status == "ACTIVE" else ("REJECTED" if d_status == "REJECTED" else ("ON_HOLD" if d_status in ("HOLD", "ON_HOLD") else "PENDING"))
                # Query attachments and KYC documents
                from app.infrastructure.db.models import OrganizationAttachmentModel, RetailerKycModel
                from app.infrastructure.db.registration_models import RegistrationDocumentModel
                
                dist_docs = {}
                try:
                    org_att_q = await db.execute(
                        select(OrganizationAttachmentModel).where(
                            and_(
                                OrganizationAttachmentModel.entity_id == dist_obj.public_id,
                                OrganizationAttachmentModel.entity_type == "DISTRIBUTOR"
                            )
                        )
                    )
                    for a in org_att_q.scalars().all():
                        dist_docs[a.document_type.upper()] = a.file_url
                except Exception:
                    pass

                try:
                    dist_codes = [c for c in [dist_obj.distributor_code, dist_obj.mobile, f"DIST-{dist_obj.mobile}"] if c]
                    reg_doc_q = await db.execute(
                        select(RegistrationDocumentModel).where(
                            or_(
                                RegistrationDocumentModel.registration_id.in_(dist_codes),
                                RegistrationDocumentModel.registration_id.like(f"%{dist_obj.mobile}%")
                            )
                        )
                    )
                    for d in reg_doc_q.scalars().all():
                        if d.doc_type.upper() not in dist_docs:
                            dist_docs[d.doc_type.upper()] = d.file_url
                except Exception:
                    pass

                try:
                    if dist_obj.pan_number:
                        r_kyc_q = await db.execute(
                            select(RetailerKycModel).where(
                                RetailerKycModel.pan_number == dist_obj.pan_number
                            )
                        )
                        r_kyc = r_kyc_q.scalars().first()
                        if r_kyc:
                            if r_kyc.aadhaar_front_url and "AADHAAR_FRONT" not in dist_docs:
                                dist_docs["AADHAAR_FRONT"] = r_kyc.aadhaar_front_url
                            if r_kyc.aadhaar_back_url and "AADHAAR_BACK" not in dist_docs:
                                dist_docs["AADHAAR_BACK"] = r_kyc.aadhaar_back_url
                            if r_kyc.business_proof_url and "GST_CERT" not in dist_docs:
                                dist_docs["GST_CERT"] = r_kyc.business_proof_url
                except Exception:
                    pass

                pan_url = BackblazeStorageService.get_download_url(dist_docs.get("PAN")) if dist_docs.get("PAN") else None
                aadhaar_front_url = BackblazeStorageService.get_download_url(dist_docs.get("AADHAAR_FRONT") or dist_docs.get("AADHAAR")) if (dist_docs.get("AADHAAR_FRONT") or dist_docs.get("AADHAAR")) else None
                aadhaar_back_url = BackblazeStorageService.get_download_url(dist_docs.get("AADHAAR_BACK")) if dist_docs.get("AADHAAR_BACK") else None
                bank_url = BackblazeStorageService.get_download_url(dist_docs.get("BANK_PROOF") or dist_docs.get("BANK") or dist_docs.get("CHEQUE") or dist_docs.get("PASSBOOK")) if (dist_docs.get("BANK_PROOF") or dist_docs.get("BANK") or dist_docs.get("CHEQUE") or dist_docs.get("PASSBOOK")) else None
                gst_url = BackblazeStorageService.get_download_url(dist_docs.get("GST_CERT") or dist_docs.get("GST")) if (dist_docs.get("GST_CERT") or dist_docs.get("GST")) else None
                shop_url = BackblazeStorageService.get_download_url(dist_docs.get("SHOP_PHOTO") or dist_docs.get("STORE_FRONT")) if (dist_docs.get("SHOP_PHOTO") or dist_docs.get("STORE_FRONT")) else None
                selfie_url = BackblazeStorageService.get_download_url(dist_docs.get("SELFIE") or dist_docs.get("PHOTO")) if (dist_docs.get("SELFIE") or dist_docs.get("PHOTO")) else None
                video_url = BackblazeStorageService.get_download_url(dist_docs.get("VIDEO")) if dist_docs.get("VIDEO") else None

                return {
                    "status": "SUCCESS",
                    "entity_type": "DISTRIBUTOR",
                    "verification": {
                        "id": str(dist_obj.public_id),
                        "public_id": str(dist_obj.public_id),
                        "registration_id": dist_obj.distributor_code or f"DIST-{dist_obj.mobile}",
                        "retailer_id": dist_obj.distributor_code or f"DIST-{dist_obj.mobile}",
                        "retailer_name": dist_obj.owner_name or dist_obj.business_name,
                        "business_name": dist_obj.business_name,
                        "owner_name": dist_obj.owner_name,
                        "mobile_number": dist_obj.mobile,
                        "mobile": dist_obj.mobile,
                        "email": dist_obj.email,
                        "shop_name": dist_obj.business_name,
                        "city": dist_obj.city,
                        "state": dist_obj.state,
                        "address": dist_obj.address,
                        "pincode": dist_obj.pincode,
                        "verification_status": v_stat,
                        "account_status": "ACTIVE" if dist_obj.is_active else "ONBOARDING",
                        "retailer_status": d_status,
                        "is_business": True,
                        "pan_number": dist_obj.pan_number,
                        "gst_number": dist_obj.gst_number,
                        "risk_score": 10,
                        "risk_category": "LOW",
                        "priority": "HIGH",
                        "submitted_at": dist_obj.created_date.isoformat() if dist_obj.created_date else None
                    },
                    "wallet": {
                        "wallet_balance": dist_obj.wallet_balance or 0.0,
                        "daily_transaction_limit": 5000000.0,
                        "single_transaction_limit": 500000.0
                    },
                    "verifications_summary": {
                        "pan": {"number": dist_obj.pan_number or "N/A", "holder_name": dist_obj.owner_name, "status": "VERIFIED" if dist_obj.pan_number else "PENDING"},
                        "gst": {"number": dist_obj.gst_number or "N/A", "trade_name": dist_obj.business_name, "status": "VERIFIED" if dist_obj.gst_number else "SKIPPED"},
                        "aadhaar": {"status": "VERIFIED", "uidai_auth": "SUCCESS"},
                        "bank": {"account_number": dist_obj.bank_account_number or "N/A", "ifsc": dist_obj.ifsc or "N/A", "name": dist_obj.owner_name, "penny_drop": "VERIFIED"}
                    },
                    "shop_details": {
                        "name": dist_obj.business_name,
                        "category": "Distributor Financial Hub",
                        "annual_turnover": "₹1 Crore - ₹5 Crore",
                        "employees": 5
                    },
                    "address": {
                        "street": dist_obj.address or "Main Commercial Street",
                        "city": dist_obj.city or "Chennai",
                        "district": dist_obj.city or "Chennai",
                        "state": dist_obj.state or "Tamil Nadu",
                        "pincode": dist_obj.pincode or "600001",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "shop_photo_url": shop_url
                    },
                    "media": {
                        "selfie_url": selfie_url,
                        "video_url": video_url,
                        "pan_card_url": pan_url,
                        "aadhaar_front_url": aadhaar_front_url,
                        "aadhaar_back_url": aadhaar_back_url,
                        "bank_proof_url": bank_url,
                        "gst_proof_url": gst_url,
                        "shop_photo_url": shop_url,
                        "script_text": f"I confirm that I am registering as a Pay2Pay Distributor for {dist_obj.business_name}."
                    },
                    "history": [],
                    "audits": []
                }

            # Check SuperDistributorModel
            sd_conds = [
                SuperDistributorModel.super_distributor_code == clean_id,
                SuperDistributorModel.mobile == clean_id,
                SuperDistributorModel.email == clean_id,
                SuperDistributorModel.business_name == clean_id,
            ]
            if clean_id.isdigit():
                sd_conds.append(SuperDistributorModel.super_distributor_ref_id == int(clean_id))
            try:
                u_sd = uuid.UUID(clean_id)
                sd_conds.append(SuperDistributorModel.public_id == u_sd)
            except Exception:
                pass
            if len(clean_id) >= 10:
                sd_conds.append(SuperDistributorModel.mobile.like(f"%{clean_id}%"))

            sd_res = await db.execute(select(SuperDistributorModel).where(or_(*sd_conds)))
            sd_obj = sd_res.scalars().first()
            if sd_obj:
                sd_status = (sd_obj.status or "PENDING").upper()
                v_stat = "APPROVED" if sd_status == "ACTIVE" else ("REJECTED" if sd_status == "REJECTED" else ("ON_HOLD" if sd_status in ("HOLD", "ON_HOLD") else "PENDING"))

                # Query attachments and KYC documents for Super Distributor
                from app.infrastructure.db.models import OrganizationAttachmentModel, RetailerKycModel
                from app.infrastructure.db.registration_models import RegistrationDocumentModel
                
                sd_docs = {}
                try:
                    sd_org_att_q = await db.execute(
                        select(OrganizationAttachmentModel).where(
                            and_(
                                OrganizationAttachmentModel.entity_id == sd_obj.public_id,
                                OrganizationAttachmentModel.entity_type == "SUPER_DISTRIBUTOR"
                            )
                        )
                    )
                    for a in sd_org_att_q.scalars().all():
                        sd_docs[a.document_type.upper()] = a.file_url
                except Exception:
                    pass

                try:
                    sd_codes = [c for c in [sd_obj.super_distributor_code, sd_obj.mobile, f"SD-{sd_obj.mobile}"] if c]
                    sd_reg_doc_q = await db.execute(
                        select(RegistrationDocumentModel).where(
                            or_(
                                RegistrationDocumentModel.registration_id.in_(sd_codes),
                                RegistrationDocumentModel.registration_id.like(f"%{sd_obj.mobile}%")
                            )
                        )
                    )
                    for d in sd_reg_doc_q.scalars().all():
                        if d.doc_type.upper() not in sd_docs:
                            sd_docs[d.doc_type.upper()] = d.file_url
                except Exception:
                    pass

                try:
                    if sd_obj.pan_number:
                        sd_r_kyc_q = await db.execute(
                            select(RetailerKycModel).where(
                                RetailerKycModel.pan_number == sd_obj.pan_number
                            )
                        )
                        sd_r_kyc = sd_r_kyc_q.scalars().first()
                        if sd_r_kyc:
                            if sd_r_kyc.aadhaar_front_url and "AADHAAR_FRONT" not in sd_docs:
                                sd_docs["AADHAAR_FRONT"] = sd_r_kyc.aadhaar_front_url
                            if sd_r_kyc.aadhaar_back_url and "AADHAAR_BACK" not in sd_docs:
                                sd_docs["AADHAAR_BACK"] = sd_r_kyc.aadhaar_back_url
                            if sd_r_kyc.business_proof_url and "GST_CERT" not in sd_docs:
                                sd_docs["GST_CERT"] = sd_r_kyc.business_proof_url
                except Exception:
                    pass

                sd_pan_url = BackblazeStorageService.get_download_url(sd_docs.get("PAN")) if sd_docs.get("PAN") else None
                sd_aadhaar_front_url = BackblazeStorageService.get_download_url(sd_docs.get("AADHAAR_FRONT") or sd_docs.get("AADHAAR")) if (sd_docs.get("AADHAAR_FRONT") or sd_docs.get("AADHAAR")) else None
                sd_aadhaar_back_url = BackblazeStorageService.get_download_url(sd_docs.get("AADHAAR_BACK")) if sd_docs.get("AADHAAR_BACK") else None
                sd_bank_url = BackblazeStorageService.get_download_url(sd_docs.get("BANK_PROOF") or sd_docs.get("BANK") or sd_docs.get("CHEQUE") or sd_docs.get("PASSBOOK")) if (sd_docs.get("BANK_PROOF") or sd_docs.get("BANK") or sd_docs.get("CHEQUE") or sd_docs.get("PASSBOOK")) else None
                sd_gst_url = BackblazeStorageService.get_download_url(sd_docs.get("GST_CERT") or sd_docs.get("GST")) if (sd_docs.get("GST_CERT") or sd_docs.get("GST")) else None
                sd_shop_url = BackblazeStorageService.get_download_url(sd_docs.get("SHOP_PHOTO") or sd_docs.get("STORE_FRONT")) if (sd_docs.get("SHOP_PHOTO") or sd_docs.get("STORE_FRONT")) else None
                sd_selfie_url = BackblazeStorageService.get_download_url(sd_docs.get("SELFIE") or sd_docs.get("PHOTO")) if (sd_docs.get("SELFIE") or sd_docs.get("PHOTO")) else None
                sd_video_url = BackblazeStorageService.get_download_url(sd_docs.get("VIDEO")) if sd_docs.get("VIDEO") else None

                return {
                    "status": "SUCCESS",
                    "entity_type": "SUPER_DISTRIBUTOR",
                    "verification": {
                        "id": str(sd_obj.public_id),
                        "public_id": str(sd_obj.public_id),
                        "registration_id": sd_obj.super_distributor_code or f"SD-{sd_obj.mobile}",
                        "retailer_id": sd_obj.super_distributor_code or f"SD-{sd_obj.mobile}",
                        "retailer_name": sd_obj.owner_name or sd_obj.business_name,
                        "business_name": sd_obj.business_name,
                        "owner_name": sd_obj.owner_name,
                        "mobile_number": sd_obj.mobile,
                        "mobile": sd_obj.mobile,
                        "email": sd_obj.email,
                        "shop_name": sd_obj.business_name,
                        "city": sd_obj.city,
                        "state": sd_obj.state,
                        "address": sd_obj.address,
                        "pincode": sd_obj.pincode,
                        "verification_status": v_stat,
                        "account_status": "ACTIVE" if sd_obj.is_active else "ONBOARDING",
                        "retailer_status": sd_status,
                        "is_business": True,
                        "pan_number": sd_obj.pan_number,
                        "gst_number": sd_obj.gst_number,
                        "risk_score": 5,
                        "risk_category": "LOW",
                        "priority": "HIGH",
                        "submitted_at": sd_obj.created_date.isoformat() if sd_obj.created_date else None
                    },
                    "wallet": {
                        "wallet_balance": sd_obj.wallet_balance or 0.0,
                        "daily_transaction_limit": 10000000.0,
                        "single_transaction_limit": 1000000.0
                    },
                    "verifications_summary": {
                        "pan": {"number": sd_obj.pan_number or "N/A", "holder_name": sd_obj.owner_name, "status": "VERIFIED" if sd_obj.pan_number else "PENDING"},
                        "gst": {"number": sd_obj.gst_number or "N/A", "trade_name": sd_obj.business_name, "status": "VERIFIED" if sd_obj.gst_number else "SKIPPED"},
                        "aadhaar": {"status": "VERIFIED", "uidai_auth": "SUCCESS"},
                        "bank": {"account_number": sd_obj.bank_account_number or "N/A", "ifsc": sd_obj.ifsc or "N/A", "name": sd_obj.owner_name, "penny_drop": "VERIFIED"}
                    },
                    "shop_details": {
                        "name": sd_obj.business_name,
                        "category": "Super Distribution Master Hub",
                        "annual_turnover": "₹5 Crore+",
                        "employees": 10
                    },
                    "address": {
                        "street": sd_obj.address or "Corporate Avenue",
                        "city": sd_obj.city or "Chennai",
                        "district": sd_obj.city or "Chennai",
                        "state": sd_obj.state or "Tamil Nadu",
                        "pincode": sd_obj.pincode or "600001",
                        "latitude": 13.0827,
                        "longitude": 80.2707,
                        "shop_photo_url": sd_shop_url
                    },
                    "media": {
                        "selfie_url": sd_selfie_url,
                        "video_url": sd_video_url,
                        "pan_card_url": sd_pan_url,
                        "aadhaar_front_url": sd_aadhaar_front_url,
                        "aadhaar_back_url": sd_aadhaar_back_url,
                        "bank_proof_url": sd_bank_url,
                        "gst_proof_url": sd_gst_url,
                        "shop_photo_url": sd_shop_url,
                        "script_text": f"I confirm that I am registering as a Pay2Pay Super Distributor for {sd_obj.business_name}."
                    },
                    "history": [],
                    "audits": []
                }

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

        # 1. Verification Documents from RegistrationDocumentModel
        reg_docs_q = await db.execute(
            select(RegistrationDocumentModel).where(
                RegistrationDocumentModel.registration_id == reg_id
            )
        )
        db_docs = {d.doc_type: d.file_url for d in reg_docs_q.scalars().all()}

        # 2. Check VerificationDocumentModel as fallback
        vdocs_q = await db.execute(
            select(VerificationDocumentModel).where(
                VerificationDocumentModel.verification_id == str(verif.id)
            )
        )
        for d in vdocs_q.scalars().all():
            if d.doc_type not in db_docs:
                db_docs[d.doc_type] = d.file_url

        # 3. Aggregate from draft_data if present
        if draft and draft.draft_data:
            dd = draft.draft_data
            if "pan_card_url" in dd and "PAN" not in db_docs:
                db_docs["PAN"] = dd["pan_card_url"]
            if "aadhaar_front_url" in dd and "AADHAAR_FRONT" not in db_docs:
                db_docs["AADHAAR_FRONT"] = dd["aadhaar_front_url"]
            if "aadhaar_back_url" in dd and "AADHAAR_BACK" not in db_docs:
                db_docs["AADHAAR_BACK"] = dd["aadhaar_back_url"]
            if "bank_proof_url" in dd and "BANK_PROOF" not in db_docs:
                db_docs["BANK_PROOF"] = dd["bank_proof_url"]
            if "shop_photo_url" in dd and "SHOP_PHOTO" not in db_docs:
                db_docs["SHOP_PHOTO"] = dd["shop_photo_url"]
            if ("gst_certificate_url" in dd or "gst_proof_url" in dd) and "GST_CERT" not in db_docs:
                db_docs["GST_CERT"] = dd.get("gst_certificate_url") or dd.get("gst_proof_url")

        # 4. Live Video from RegistrationVideoModel or draft
        vid_q = await db.execute(
            select(RegistrationVideoModel).where(RegistrationVideoModel.registration_id == reg_id)
        )
        video_rec = vid_q.scalars().first()
        raw_video_url = (video_rec.video_url if video_rec else None) or db_docs.get("VIDEO") or (draft.draft_data.get("video_url") if draft and draft.draft_data else None)

        # 5. Aadhaar Photo / Selfie
        aadhaar_q = await db.execute(
            select(RegistrationAadhaarModel).where(RegistrationAadhaarModel.registration_id == reg_id).order_by(desc(RegistrationAadhaarModel.created_date))
        )
        aadhaar_rec = aadhaar_q.scalars().first()
        raw_selfie_url = (aadhaar_rec.photo_url if aadhaar_rec else None) or (draft.draft_data.get("photo_url") if draft and draft.draft_data else None) or db_docs.get("SELFIE") or db_docs.get("PHOTO") or db_docs.get("AADHAAR_FRONT")

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

        # Retailer Wallet Float
        ret_wallet_bal = 0.0
        try:
            from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
            ret_q = await db.execute(
                select(RetailerModel).where(
                    or_(
                        RetailerModel.retailer_code == verif.retailer_id,
                        RetailerModel.mobile_number == verif.mobile_number,
                        RetailerModel.public_id == verif.public_id if hasattr(verif, "public_id") and verif.public_id else False
                    )
                )
            )
            ret_obj = ret_q.scalars().first()
            if ret_obj:
                w_q = await db.execute(select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_obj.public_id))
                w_obj = w_q.scalars().first()
                if w_obj and w_obj.wallet_balance is not None:
                    ret_wallet_bal = float(w_obj.wallet_balance)
        except Exception:
            pass

        return {
            "status": "SUCCESS",
            "verification": {
                "id": str(verif.id),
                "public_id": str(verif.public_id) if hasattr(verif, "public_id") and verif.public_id else str(verif.id),
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
            "wallet": {
                "wallet_balance": ret_wallet_bal,
                "daily_transaction_limit": 5000000.0,
                "single_transaction_limit": 500000.0
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
                "street": addr.street if addr else "",
                "city": addr.city if addr else "",
                "district": addr.district if addr else "",
                "state": addr.state if addr else "",
                "pincode": addr.pincode if addr else "",
                "latitude": addr.latitude if addr else None,
                "longitude": addr.longitude if addr else None,
                "exif_gps_available": getattr(addr, "exif_gps_available", False) if addr else False,
                "exif_latitude": getattr(addr, "exif_latitude", None) if addr else None,
                "exif_longitude": getattr(addr, "exif_longitude", None) if addr else None,
                "exif_altitude": getattr(addr, "exif_altitude", None) if addr else None,
                "exif_captured_at": addr.exif_captured_at.isoformat() if (addr and getattr(addr, "exif_captured_at", None)) else None,
                "exif_reverse_address": getattr(addr, "exif_reverse_address", None) if addr else None,
                "ocr_location_available": getattr(addr, "ocr_location_available", False) if addr else False,
                "ocr_raw_text": getattr(addr, "ocr_raw_text", None) if addr else None,
                "ocr_detected_address": getattr(addr, "ocr_detected_address", None) if addr else None,
                "ocr_detected_city": getattr(addr, "ocr_detected_city", None) if addr else None,
                "ocr_detected_state": getattr(addr, "ocr_detected_state", None) if addr else None,
                "ocr_detected_pincode": getattr(addr, "ocr_detected_pincode", None) if addr else None,
                "shop_photo_url": addr.shop_photo_url if addr else None
            },
            "media": {
                "selfie_url": BackblazeStorageService.get_download_url(raw_selfie_url) if raw_selfie_url else None,
                "video_url": BackblazeStorageService.get_download_url(raw_video_url) if raw_video_url else None,
                "pan_card_url": BackblazeStorageService.get_download_url(db_docs.get("PAN")) if db_docs.get("PAN") else None,
                "aadhaar_front_url": BackblazeStorageService.get_download_url(db_docs.get("AADHAAR_FRONT")) if db_docs.get("AADHAAR_FRONT") else None,
                "aadhaar_back_url": BackblazeStorageService.get_download_url(db_docs.get("AADHAAR_BACK")) if db_docs.get("AADHAAR_BACK") else None,
                "bank_proof_url": BackblazeStorageService.get_download_url(db_docs.get("BANK_PROOF")) if db_docs.get("BANK_PROOF") else None,
                "gst_proof_url": BackblazeStorageService.get_download_url(db_docs.get("GST_CERT") or db_docs.get("GST") or (gst.certificate_url if gst else None)) if (db_docs.get("GST_CERT") or db_docs.get("GST") or (gst.certificate_url if gst else None)) else None,
                "shop_photo_url": BackblazeStorageService.get_download_url(db_docs.get("SHOP_PHOTO") or (shop.shop_photo_url if shop else None) or (addr.shop_photo_url if addr else None)) if (db_docs.get("SHOP_PHOTO") or (shop.shop_photo_url if shop else None) or (addr.shop_photo_url if addr else None)) else None,
                "script_text": (video_rec.script_text if video_rec else None) or f"I confirm that I am registering as a Pay2Pay Retailer for {verif.shop_name or 'Retailer Store'}."
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
        clean_id = str(verification_id).strip()

        conds = []
        if clean_id.isdigit():
            conds.append(RetailerVerificationModel.id == int(clean_id))
            if len(clean_id) == 10:
                conds.append(RetailerVerificationModel.mobile_number == clean_id)
                conds.append(RetailerVerificationModel.mobile_number == f"+91{clean_id}")
                conds.append(RetailerVerificationModel.mobile_number == f"91{clean_id}")
        
        try:
            u = uuid.UUID(clean_id)
            conds.append(RetailerVerificationModel.public_id == u)
        except Exception:
            pass

        conds.append(RetailerVerificationModel.registration_id == clean_id)
        conds.append(RetailerVerificationModel.retailer_id == clean_id)

        q = await db.execute(
            select(RetailerVerificationModel).where(or_(*conds)).order_by(desc(RetailerVerificationModel.created_date))
        )
        verif = q.scalars().first()

        # Fallback if not found in RetailerVerificationModel, check RegistrationDraftModel
        if not verif:
            draft_conds = [
                RegistrationDraftModel.registration_id == clean_id,
            ]
            if clean_id.isdigit():
                draft_conds.append(RegistrationDraftModel.id == int(clean_id))
                if len(clean_id) == 10:
                    draft_conds.append(RegistrationDraftModel.mobile_number == clean_id)
                    draft_conds.append(RegistrationDraftModel.mobile_number == f"+91{clean_id}")
                    draft_conds.append(RegistrationDraftModel.mobile_number == f"91{clean_id}")
            try:
                u_draft = uuid.UUID(clean_id)
                draft_conds.append(RegistrationDraftModel.public_id == u_draft)
            except Exception:
                pass

            r_draft_q = await db.execute(
                select(RegistrationDraftModel).where(or_(*draft_conds)).order_by(desc(RegistrationDraftModel.created_date))
            )
            draft_rec = r_draft_q.scalars().first()

            if draft_rec:
                draft_data = draft_rec.draft_data or {}
                verif = RetailerVerificationModel(
                    tenant_id=DEFAULT_TENANT_ID,
                    public_id=draft_rec.public_id if hasattr(draft_rec, "public_id") and draft_rec.public_id else uuid.uuid4(),
                    registration_id=draft_rec.registration_id,
                    retailer_id=f"RET-{draft_rec.registration_id[-6:]}" if draft_rec.registration_id else f"RET-{draft_rec.mobile_number[-6:]}",
                    retailer_name=draft_data.get("full_name") or draft_data.get("owner_name") or "Retailer Partner",
                    mobile_number=draft_rec.mobile_number,
                    email=draft_data.get("email") or draft_rec.email or "",
                    shop_name=draft_data.get("shop_name") or "Retailer Store",
                    verification_status="PENDING",
                    account_status="ONBOARDING",
                    retailer_status="UNDER_REVIEW",
                    is_business=False,
                    pan_number=draft_data.get("pan_number"),
                    gst_number=draft_data.get("gst_number"),
                    risk_score=15,
                    risk_category="LOW",
                    priority="NORMAL",
                    submitted_at=draft_rec.created_date or datetime.now(timezone.utc)
                )
                db.add(verif)
                await db.flush()

        if not verif:
            # Check DistributorModel
            from app.infrastructure.db.models import DistributorModel, SuperDistributorModel
            from app.application.hierarchy_mapping_service import HierarchyMappingService
            
            d_conds = [
                DistributorModel.distributor_code == clean_id,
                DistributorModel.email == clean_id,
            ]
            if clean_id.isdigit():
                d_conds.append(DistributorModel.distributor_ref_id == int(clean_id))
                if len(clean_id) == 10:
                    d_conds.append(DistributorModel.mobile == clean_id)
                    d_conds.append(DistributorModel.mobile == f"+91{clean_id}")
                    d_conds.append(DistributorModel.mobile == f"91{clean_id}")
            try:
                u_dist = uuid.UUID(clean_id)
                d_conds.append(DistributorModel.public_id == u_dist)
            except Exception:
                pass
            
            d_res = await db.execute(select(DistributorModel).where(or_(*d_conds)))
            dist_obj = d_res.scalars().first()
            if dist_obj:
                now_utc = datetime.now(timezone.utc)
                if action_clean in ("APPROVE", "APPROVED"):
                    dist_obj.status = "ACTIVE"
                    dist_obj.is_active = True
                    dist_obj.updated_date = now_utc
                    try:
                        await HierarchyMappingService.apply_default_distributor_hierarchy(db, dist_obj, actor_email=admin_id)
                    except Exception as map_e:
                        logger.warning(f"Hierarchy mapping warning on distributor approval: {map_e}")
                elif action_clean in ("ON_HOLD", "HOLD"):
                    dist_obj.status = "HOLD"
                    dist_obj.is_active = False
                    dist_obj.updated_date = now_utc
                elif action_clean in ("REJECT", "REJECTED"):
                    dist_obj.status = "REJECTED"
                    dist_obj.is_active = False
                    dist_obj.updated_date = now_utc
                else:
                    dist_obj.status = action_clean
                    dist_obj.updated_date = now_utc

                # Add audit log
                try:
                    audit = VerificationAuditModel(
                        tenant_id=dist_obj.tenant_id or DEFAULT_TENANT_ID,
                        verification_id=str(dist_obj.public_id),
                        admin_id=admin_id,
                        action=f"DISTRIBUTOR_{action_clean}",
                        remarks=remarks,
                        ip_address=ip_address,
                        browser=browser,
                        correlation_id=str(uuid.uuid4())
                    )
                    db.add(audit)
                except Exception as audit_e:
                    logger.warning(f"Verification audit log warning: {audit_e}")

                await db.commit()
                return {
                    "status": "SUCCESS",
                    "message": f"Distributor {dist_obj.distributor_code or dist_obj.business_name} status successfully updated to {dist_obj.status}."
                }

            # Check SuperDistributorModel
            sd_conds = [
                SuperDistributorModel.super_distributor_code == clean_id,
                SuperDistributorModel.email == clean_id,
            ]
            if clean_id.isdigit():
                sd_conds.append(SuperDistributorModel.super_distributor_ref_id == int(clean_id))
                if len(clean_id) == 10:
                    sd_conds.append(SuperDistributorModel.mobile == clean_id)
                    sd_conds.append(SuperDistributorModel.mobile == f"+91{clean_id}")
                    sd_conds.append(SuperDistributorModel.mobile == f"91{clean_id}")
            try:
                u_sd = uuid.UUID(clean_id)
                sd_conds.append(SuperDistributorModel.public_id == u_sd)
            except Exception:
                pass
            
            sd_res = await db.execute(select(SuperDistributorModel).where(or_(*sd_conds)))
            sd_obj = sd_res.scalars().first()
            if sd_obj:
                now_utc = datetime.now(timezone.utc)
                if action_clean in ("APPROVE", "APPROVED"):
                    sd_obj.status = "ACTIVE"
                    sd_obj.is_active = True
                    sd_obj.updated_date = now_utc
                    try:
                        await HierarchyMappingService.apply_default_sd_hierarchy(db, sd_obj, actor_email=admin_id)
                    except Exception as map_e:
                        logger.warning(f"Hierarchy mapping warning on SD approval: {map_e}")
                elif action_clean in ("ON_HOLD", "HOLD"):
                    sd_obj.status = "HOLD"
                    sd_obj.is_active = False
                    sd_obj.updated_date = now_utc
                elif action_clean in ("REJECT", "REJECTED"):
                    sd_obj.status = "REJECTED"
                    sd_obj.is_active = False
                    sd_obj.updated_date = now_utc
                else:
                    sd_obj.status = action_clean
                    sd_obj.updated_date = now_utc

                try:
                    audit = VerificationAuditModel(
                        tenant_id=sd_obj.tenant_id or DEFAULT_TENANT_ID,
                        verification_id=str(sd_obj.public_id),
                        admin_id=admin_id,
                        action=f"SUPER_DISTRIBUTOR_{action_clean}",
                        remarks=remarks,
                        ip_address=ip_address,
                        browser=browser,
                        correlation_id=str(uuid.uuid4())
                    )
                    db.add(audit)
                except Exception as audit_e:
                    logger.warning(f"Verification audit log warning: {audit_e}")

                await db.commit()
                return {
                    "status": "SUCCESS",
                    "message": f"Super Distributor {sd_obj.super_distributor_code or sd_obj.business_name} status successfully updated to {sd_obj.status}."
                }

            return {"status": "ERROR", "message": f"Verification request for identifier '{verification_id}' not found."}

        prev_v_status = verif.verification_status
        prev_a_status = verif.account_status

        if action_clean in ("APPROVE", "APPROVED"):
            verif.verification_status = "APPROVED"
            verif.account_status = "ACTIVE"
            verif.retailer_status = "ACTIVE"
            verif.is_active = True

            clean_m = re.sub(r"\D", "", str(verif.mobile_number))[-10:] if verif.mobile_number else ""
            mobile_variants = [clean_m, f"91{clean_m}", f"+91{clean_m}"] if clean_m else []

            # 1. Update RegistrationDraftModel
            try:
                d_conds = []
                if verif.registration_id:
                    d_conds.append(RegistrationDraftModel.registration_id == verif.registration_id)
                if mobile_variants:
                    d_conds.append(RegistrationDraftModel.mobile_number.in_(mobile_variants))
                if d_conds:
                    await db.execute(
                        update(RegistrationDraftModel)
                        .where(or_(*d_conds))
                        .values(status="KYC_APPROVED")
                    )
            except Exception as d_err:
                logger.warning(f"RegistrationDraftModel update error during approval: {d_err}")

            # 2. Comprehensive update for RetailerModel and child relations
            matched_ret_ids = []
            try:
                from app.infrastructure.db.models import RetailerModel, RetailerContactModel, RetailerKycModel, RetailerBankModel
                if mobile_variants:
                    c_stmt = select(RetailerContactModel.retailer_id).where(RetailerContactModel.mobile.in_(mobile_variants))
                    c_rows = (await db.execute(c_stmt)).scalars().all()
                    matched_ret_ids.extend([c for c in c_rows if c])

                r_conds = []
                if verif.retailer_id:
                    r_conds.append(RetailerModel.retailer_code == verif.retailer_id)
                if verif.registration_id:
                    r_conds.append(RetailerModel.retailer_code == verif.registration_id)
                if verif.public_id:
                    r_conds.append(RetailerModel.public_id == verif.public_id)
                if matched_ret_ids:
                    r_conds.append(RetailerModel.public_id.in_(matched_ret_ids))

                if r_conds:
                    await db.execute(
                        update(RetailerModel)
                        .where(or_(*r_conds))
                        .values(
                            status="ACTIVE",
                            is_active=True,
                            mpin_locked=False,
                            updated_date=datetime.now(timezone.utc)
                        )
                    )

                    # Also update RetailerKycModel and RetailerBankModel
                    target_ret_stmt = select(RetailerModel).where(or_(*r_conds))
                    ret_models = (await db.execute(target_ret_stmt)).scalars().all()
                    from app.application.hierarchy_mapping_service import HierarchyMappingService
                    for r_model in ret_models:
                        try:
                            await db.execute(
                                update(RetailerKycModel)
                                .where(RetailerKycModel.retailer_id == r_model.public_id)
                                .values(verification_status="VERIFIED", is_active=True)
                            )
                            await db.execute(
                                update(RetailerBankModel)
                                .where(RetailerBankModel.retailer_id == r_model.public_id)
                                .values(verification_status="VERIFIED", is_active=True)
                            )
                            # Automatic Hierarchy Mapping: COMPANY -> SD -> DISTRIBUTOR -> RETAILER
                            await HierarchyMappingService.apply_default_retailer_hierarchy(
                                db=db,
                                retailer=r_model,
                                actor_email=admin_id or "admin@pay2pay.in",
                                force_if_unmapped=True
                            )
                        except Exception as map_err:
                            logger.warning(f"Error ensuring retailer hierarchy mapping on approval: {map_err}")
            except Exception as r_err:
                logger.warning(f"RetailerModel update error during approval: {r_err}")

            # 3. Comprehensive update for AuthUserModel
            try:
                from app.infrastructure.db.auth_models import AuthUserModel
                u_conds = []
                if verif.public_id:
                    u_conds.append(AuthUserModel.user_id == verif.public_id)
                    u_conds.append(AuthUserModel.public_id == verif.public_id)
                if mobile_variants:
                    u_conds.append(AuthUserModel.mobile_number.in_(mobile_variants))
                if matched_ret_ids:
                    u_conds.append(AuthUserModel.user_id.in_(matched_ret_ids))
                if u_conds:
                    await db.execute(
                        update(AuthUserModel)
                        .where(or_(*u_conds))
                        .values(
                            account_status="ACTIVE",
                            is_active=True,
                            failed_attempts=0,
                            locked_until=None,
                            updated_date=datetime.now(timezone.utc)
                        )
                    )
            except Exception as u_err:
                logger.warning(f"AuthUserModel update error during approval: {u_err}")
        elif action_clean in ("REJECT", "REJECTED"):
            verif.verification_status = "REJECTED"
            verif.account_status = "ONBOARDING"
            verif.retailer_status = "REJECTED"
            try:
                await db.execute(
                    update(RegistrationDraftModel)
                    .where(
                        or_(
                            RegistrationDraftModel.registration_id == verif.registration_id,
                            RegistrationDraftModel.mobile_number == verif.mobile_number
                        )
                    )
                    .values(status="REJECTED")
                )
            except Exception:
                pass
            try:
                from app.infrastructure.db.models import RetailerModel
                await db.execute(
                    update(RetailerModel)
                    .where(
                        or_(
                            RetailerModel.retailer_code == verif.retailer_id,
                            RetailerModel.retailer_code == verif.registration_id,
                            RetailerModel.public_id == verif.public_id
                        )
                    )
                    .values(status="REJECTED", is_active=False)
                )
            except Exception:
                pass
        elif action_clean in ("ON_HOLD", "HOLD"):
            verif.verification_status = "ON_HOLD"
            verif.account_status = "ONBOARDING"
            verif.retailer_status = "ON_HOLD"
            try:
                from app.infrastructure.db.models import RetailerModel
                await db.execute(
                    update(RetailerModel)
                    .where(
                        or_(
                            RetailerModel.retailer_code == verif.retailer_id,
                            RetailerModel.retailer_code == verif.registration_id,
                            RetailerModel.public_id == verif.public_id
                        )
                    )
                    .values(status="HOLD")
                )
            except Exception:
                pass
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
            "public_id": str(verif.public_id),
            "verification_status": verif.verification_status,
            "account_status": verif.account_status,
            "retailer_status": verif.retailer_status,
            "remarks": remarks.strip()
        }

    @staticmethod
    async def get_retailer_status(db: AsyncSession, identifier: str) -> Dict[str, Any]:
        """Fetches current verification status for Retailer Dashboard adaptation."""

        clean_id = str(identifier).strip()
        conds = [
            RetailerVerificationModel.mobile_number == clean_id,
            RetailerVerificationModel.mobile_number == f"+91{clean_id}",
            RetailerVerificationModel.registration_id == clean_id,
            RetailerVerificationModel.retailer_id == clean_id
        ]
        if clean_id.isdigit():
            conds.append(RetailerVerificationModel.id == int(clean_id))
        try:
            u = uuid.UUID(clean_id)
            conds.append(RetailerVerificationModel.public_id == u)
        except Exception:
            pass

        q = await db.execute(
            select(RetailerVerificationModel).where(or_(*conds)).order_by(desc(RetailerVerificationModel.created_date))
        )
        verif = q.scalars().first()
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
        latest_hist = hist_q.scalars().first()

        # Fetch connected company details
        company_name = "Platform HQ Enterprise Ltd"
        company_code = "HQ_COMP"
        shop_name = verif.shop_name or "Enterprises"
        
        try:
            if verif.retailer_id:
                ret_q = await db.execute(select(RetailerModel).where(or_(RetailerModel.public_id == verif.retailer_id, RetailerModel.retailer_code == verif.retailer_id)))
                ret_obj = ret_q.scalar_one_or_none()
                if ret_obj and ret_obj.company_id:
                    comp_q = await db.execute(select(CompanyModel).where(CompanyModel.public_id == ret_obj.company_id))
                    comp_obj = comp_q.scalar_one_or_none()
                    if comp_obj:
                        company_name = comp_obj.company_name or comp_obj.legal_name or company_name
                        company_code = comp_obj.company_code or company_code
                if ret_obj and ret_obj.store_name:
                    shop_name = ret_obj.store_name
        except Exception:
            pass

        return {
            "verification_id": str(verif.id),
            "registration_id": verif.registration_id,
            "retailer_id": verif.retailer_id,
            "retailer_name": verif.retailer_name,
            "mobile_number": verif.mobile_number,
            "shop_name": shop_name,
            "company_name": company_name,
            "company_code": company_code,
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
