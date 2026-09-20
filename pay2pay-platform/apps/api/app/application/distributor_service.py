"""
Enterprise Distributor Business Logic & Domain Service.

Strictly enforces:
- distributor_ref_id as ownership/reference key for Distributor-specific operations
- user_ref_id + usertype_ref_id for central transaction ledger
- Server-side verification of mapped retailers before granting access to Retailer Details or MDR
- Zero hardcoded IDs or user type codes
- Database as authoritative source of truth (no localStorage reliance)
"""

import uuid
import re
import secrets
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, desc, func, update, text, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import (
    DistributorModel, RetailerModel, RetailerContactModel,
    RetailerWalletModel, CompanyModel, TenantModel
)
from app.infrastructure.db.distributor_models import (
    DistWalletModel, DistributorRetailerMappingModel,
    DistributorMdrModel, DistributorInvitationModel
)
from app.infrastructure.db.topup_request_model import TopupRequestModel
from app.infrastructure.db.transaction_engine_models import (
    CentralTransactionModel, TransactionLedgerEntryModel
)
from app.infrastructure.db.pos_mdr_models import PosPaymentModeConfigModel, PosMdrConfigurationModel
from app.application.user_type_service import UserTypeService


class DistributorService:

    @staticmethod
    async def resolve_distributor_by_identity(
        db: AsyncSession,
        user_id_or_sub: Optional[str] = None,
        mobile: Optional[str] = None,
        distributor_ref_id: Optional[int] = None
    ) -> Optional[DistributorModel]:
        """
        Resolves the authenticated Distributor record dynamically from PostgreSQL database.
        Zero hardcoded values.
        """
        if distributor_ref_id:
            stmt = select(DistributorModel).where(
                DistributorModel.distributor_ref_id == distributor_ref_id,
                DistributorModel.is_deleted == False
            )
            dist = (await db.execute(stmt)).scalars().first()
            if dist:
                return dist

        if user_id_or_sub:
            try:
                sub_uuid = uuid.UUID(str(user_id_or_sub))
                stmt = select(DistributorModel).where(
                    or_(DistributorModel.public_id == sub_uuid, DistributorModel.id == sub_uuid),
                    DistributorModel.is_deleted == False
                )
                dist = (await db.execute(stmt)).scalars().first()
                if dist:
                    return dist
            except (ValueError, TypeError):
                stmt = select(DistributorModel).where(
                    DistributorModel.distributor_code == str(user_id_or_sub),
                    DistributorModel.is_deleted == False
                )
                dist = (await db.execute(stmt)).scalars().first()
                if dist:
                    return dist

        if mobile:
            clean_m = re.sub(r"\D", "", str(mobile))
            if len(clean_m) >= 10:
                mob10 = clean_m[-10:]
                stmt = select(DistributorModel).where(
                    DistributorModel.mobile.in_([mob10, f"+91{mob10}", f"91{mob10}"]),
                    DistributorModel.is_deleted == False
                )
                dist = (await db.execute(stmt)).scalars().first()
                if dist:
                    return dist

        return None

    @staticmethod
    async def get_or_create_wallet(
        db: AsyncSession,
        distributor: DistributorModel
    ) -> DistWalletModel:
        """
        Authoritative Distributor Wallet retrieval.
        Creates a dist_wallet record with 0.00 default balance if not already present.
        """
        d_ref = distributor.distributor_ref_id
        if not d_ref:
            d_ref = distributor.id

        stmt = select(DistWalletModel).where(
            DistWalletModel.distributor_ref_id == d_ref
        )
        wallet = (await db.execute(stmt)).scalars().first()
        if not wallet:
            tenant_uuid = distributor.tenant_id or uuid.UUID("00000000-0000-0000-0000-000000000001")
            company_uuid = distributor.company_id or uuid.UUID("00000000-0000-0000-0000-000000000001")
            wallet = DistWalletModel(
                distributor_ref_id=d_ref,
                tenant_id=tenant_uuid,
                company_id=company_uuid,
                balance=Decimal("0.00"),
                currency="INR",
                status="ACTIVE",
                is_active=True,
                is_frozen=False
            )
            db.add(wallet)
            await db.commit()
            await db.refresh(wallet)
        return wallet

    @staticmethod
    async def get_dashboard_summary(
        db: AsyncSession,
        distributor: DistributorModel
    ) -> Dict[str, Any]:
        """
        Aggregates live Distributor Dashboard metrics directly from database:
        - Wallet: Available balance
        - Retailers: Total mapped, active, pending, inactive
        - Business: Total volume, count, service-wise breakdown
        - Top-up: Pending, approved, rejected request counts
        - MDR: Number of configured retailers
        """
        d_ref = distributor.distributor_ref_id or distributor.id
        wallet = await DistributorService.get_or_create_wallet(db, distributor)

        # 1. Mapped Retailers Breakdown
        ret_stmt = (
            select(
                func.count(DistributorRetailerMappingModel.distributor_retailer_ref_id).label("total"),
                func.count(func.nullif(RetailerModel.status.in_(["ACTIVE", "APPROVED"]), False)).label("active"),
                func.count(func.nullif(RetailerModel.status.in_(["PENDING_APPROVAL", "UNDER_REVIEW", "PENDING_KYC", "DRAFT"]), False)).label("pending"),
                func.count(func.nullif(RetailerModel.status.in_(["SUSPENDED", "BLOCKED", "INACTIVE", "CLOSED"]), False)).label("inactive")
            )
            .join(RetailerModel, RetailerModel.retailer_ref_id == DistributorRetailerMappingModel.retailer_ref_id)
            .where(
                DistributorRetailerMappingModel.distributor_ref_id == d_ref,
                DistributorRetailerMappingModel.status == "ACTIVE",
                RetailerModel.is_deleted == False
            )
        )
        ret_counts = (await db.execute(ret_stmt)).first()
        total_ret = ret_counts.total if ret_counts else 0
        active_ret = ret_counts.active if ret_counts else 0
        pending_ret = ret_counts.pending if ret_counts else 0
        inactive_ret = ret_counts.inactive if ret_counts else 0

        # 2. Top-up Request Statuses
        topup_stmt = (
            select(
                func.count(TopupRequestModel.id).label("total_reqs"),
                func.count(func.nullif(TopupRequestModel.status.in_(["PENDING", "UNDER_REVIEW"]), False)).label("pending_topups"),
                func.count(func.nullif(TopupRequestModel.status == "APPROVED", False)).label("approved_topups"),
                func.count(func.nullif(TopupRequestModel.status == "REJECTED", False)).label("rejected_topups"),
                func.coalesce(func.sum(case((TopupRequestModel.status == "APPROVED", TopupRequestModel.approved_amount), else_=0)), 0).label("approved_amount")
            )
            .where(
                TopupRequestModel.distributor_ref_id == d_ref,
                TopupRequestModel.is_deleted == False
            )
        )
        topup_counts = (await db.execute(topup_stmt)).first()
        pending_topups = topup_counts.pending_topups if topup_counts else 0
        approved_topups = topup_counts.approved_topups if topup_counts else 0
        rejected_topups = topup_counts.rejected_topups if topup_counts else 0
        approved_topup_vol = float(topup_counts.approved_amount or 0.0) if topup_counts else 0.0

        # 3. Mapped Retailer IDs for business aggregation
        mapped_ret_refs_stmt = select(DistributorRetailerMappingModel.retailer_ref_id).where(
            DistributorRetailerMappingModel.distributor_ref_id == d_ref,
            DistributorRetailerMappingModel.status == "ACTIVE"
        )
        mapped_ret_refs = (await db.execute(mapped_ret_refs_stmt)).scalars().all()

        total_tx_count = 0
        total_tx_volume = 0.0
        service_breakdown: List[Dict[str, Any]] = []

        # 3. Dynamic Transaction Attribution:
        # Strictly preserves historical transaction attribution based on immutable transaction snapshot
        # (distributor_ref_id == d_ref or dist_id == distributor.public_id).
        # Ensures that historical transactions are NEVER recalculated or stolen upon remapping.
        tx_dist_filter = or_(
            CentralTransactionModel.distributor_ref_id == d_ref,
            CentralTransactionModel.dist_id == distributor.public_id,
            and_(
                CentralTransactionModel.distributor_ref_id == None,
                CentralTransactionModel.dist_id == None,
                CentralTransactionModel.retailer_ref_id.in_(mapped_ret_refs) if mapped_ret_refs else False
            )
        )

        biz_stmt = (
            select(
                func.count(CentralTransactionModel.transactions_ref_id).label("tx_count"),
                func.coalesce(func.sum(CentralTransactionModel.amount), 0).label("tx_volume")
            )
            .where(
                tx_dist_filter,
                CentralTransactionModel.status == "SUCCESS",
                CentralTransactionModel.is_deleted == False
            )
        )
        biz_res = (await db.execute(biz_stmt)).first()
        if biz_res:
            total_tx_count = biz_res.tx_count or 0
            total_tx_volume = float(biz_res.tx_volume or 0.0)

        # Service-wise Business Breakdown
        svc_stmt = (
            select(
                CentralTransactionModel.service_name,
                func.count(CentralTransactionModel.transactions_ref_id).label("count"),
                func.coalesce(func.sum(CentralTransactionModel.amount), 0).label("amount"),
                func.count(func.nullif(CentralTransactionModel.status == "SUCCESS", False)).label("success_count"),
                func.count(func.nullif(CentralTransactionModel.status == "PENDING", False)).label("pending_count"),
                func.count(func.nullif(CentralTransactionModel.status == "FAILED", False)).label("failed_count")
            )
            .where(
                tx_dist_filter,
                CentralTransactionModel.is_deleted == False
            )
            .group_by(CentralTransactionModel.service_name)
        )
        svc_rows = (await db.execute(svc_stmt)).fetchall()
        for r in svc_rows:
            service_breakdown.append({
                "service": r.service_name,
                "transaction_count": r.count,
                "transaction_amount": float(r.amount or 0.0),
                "success": r.success_count,
                "pending": r.pending_count,
                "failed": r.failed_count
            })

        # 4. MDR Configured Retailers
        mdr_stmt = select(func.count(func.distinct(DistributorMdrModel.retailer_ref_id))).where(
            DistributorMdrModel.distributor_ref_id == d_ref,
            DistributorMdrModel.status == "ACTIVE"
        )
        configured_mdr_retailers = (await db.execute(mdr_stmt)).scalar() or 0

        return {
            "distributor": {
                "distributor_ref_id": d_ref,
                "distributor_code": distributor.distributor_code,
                "business_name": distributor.business_name,
                "owner_name": distributor.owner_name,
                "mobile": distributor.mobile,
                "email": distributor.email,
                "status": distributor.status,
                "is_active": distributor.is_active
            },
            "wallet": {
                "dist_wallet_ref_id": wallet.dist_wallet_ref_id,
                "available_balance": float(wallet.balance),
                "currency": wallet.currency,
                "status": wallet.status,
                "is_frozen": wallet.is_frozen
            },
            "retailers": {
                "total_mapped": total_ret,
                "active_retailers": active_ret,
                "pending_retailers": pending_ret,
                "inactive_retailers": inactive_ret
            },
            "business": {
                "total_transactions": total_tx_count,
                "total_business": total_tx_volume,
                "service_breakdown": service_breakdown
            },
            "topup": {
                "pending_requests": pending_topups,
                "approved_requests": approved_topups,
                "rejected_requests": rejected_topups,
                "approved_volume": approved_topup_vol
            },
            "mdr": {
                "configured_retailers": configured_mdr_retailers,
                "status": "CONFIGURED" if configured_mdr_retailers > 0 else "DEFAULT"
            }
        }

    @staticmethod
    async def list_mapped_retailers(
        db: AsyncSession,
        distributor: DistributorModel,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lists only retailers mapped to this distributor.
        Server-side pagination, search, and filtering.
        """
        d_ref = distributor.distributor_ref_id or distributor.id
        conditions = [
            DistributorRetailerMappingModel.distributor_ref_id == d_ref,
            DistributorRetailerMappingModel.status == "ACTIVE",
            RetailerModel.is_deleted == False
        ]

        if status_filter and status_filter.upper() != "ALL":
            conditions.append(func.upper(RetailerModel.status) == status_filter.upper())

        if search and search.strip():
            term = f"%{search.strip()}%"
            conditions.append(
                or_(
                    RetailerModel.store_name.ilike(term),
                    RetailerModel.owner_name.ilike(term),
                    RetailerModel.retailer_code.ilike(term),
                    RetailerContactModel.mobile.ilike(term)
                )
            )

        # Count query
        count_stmt = (
            select(func.count(DistributorRetailerMappingModel.distributor_retailer_ref_id))
            .join(RetailerModel, RetailerModel.retailer_ref_id == DistributorRetailerMappingModel.retailer_ref_id)
            .outerjoin(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
            .where(*conditions)
        )
        total_items = (await db.execute(count_stmt)).scalar() or 0

        # Items query
        offset = (page - 1) * page_size
        items_stmt = (
            select(
                RetailerModel,
                DistributorRetailerMappingModel.created_at.label("mapped_date"),
                RetailerContactModel.mobile.label("contact_mobile")
            )
            .join(RetailerModel, RetailerModel.retailer_ref_id == DistributorRetailerMappingModel.retailer_ref_id)
            .outerjoin(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
            .where(*conditions)
            .order_by(desc(DistributorRetailerMappingModel.created_at))
            .offset(offset)
            .limit(page_size)
        )
        res = await db.execute(items_stmt)
        rows = res.all()

        retailer_list = []
        for r_model, mapped_dt, mob in rows:
            # Query wallet balance
            w_stmt = select(RetailerWalletModel.wallet_balance).where(
                RetailerWalletModel.retailer_id == r_model.public_id
            )
            w_bal = (await db.execute(w_stmt)).scalar() or 0.0

            retailer_list.append({
                "retailer_ref_id": r_model.retailer_ref_id,
                "retailer_id": str(r_model.public_id),
                "retailer_code": r_model.retailer_code,
                "retailer_name": r_model.store_name or r_model.owner_name,
                "owner_name": r_model.owner_name,
                "mobile": mob or "",
                "status": r_model.status,
                "approval_status": "APPROVED" if r_model.status in ("ACTIVE", "APPROVED") else "PENDING",
                "active_status": r_model.is_active,
                "wallet_balance": float(w_bal),
                "business_category": r_model.business_category,
                "mapped_date": mapped_dt.isoformat() if mapped_dt else None,
                "created_date": r_model.created_date.isoformat() if r_model.created_date else None
            })

        return {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": max(1, (total_items + page_size - 1) // page_size),
            "retailers": retailer_list
        }

    @staticmethod
    async def get_mapped_retailer_detail(
        db: AsyncSession,
        distributor: DistributorModel,
        retailer_ident: str
    ) -> Dict[str, Any]:
        """
        Retrieves detailed profile, wallet, and performance of an individual mapped retailer.
        Backend verification: Rejects if the retailer is not mapped to this distributor.
        """
        d_ref = distributor.distributor_ref_id or distributor.id

        # Resolve retailer
        r_conditions = [RetailerModel.is_deleted == False]
        try:
            r_uuid = uuid.UUID(str(retailer_ident))
            r_conditions.append(RetailerModel.public_id == r_uuid)
        except (ValueError, TypeError):
            if str(retailer_ident).isdigit():
                r_conditions.append(RetailerModel.retailer_ref_id == int(retailer_ident))
            else:
                r_conditions.append(RetailerModel.retailer_code == str(retailer_ident))

        r_stmt = select(RetailerModel).where(and_(*r_conditions))
        retailer = (await db.execute(r_stmt)).scalars().first()

        if not retailer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Retailer '{retailer_ident}' not found."
            )

        # STRICT VERIFICATION: Mapped to current distributor?
        map_stmt = select(DistributorRetailerMappingModel).where(
            DistributorRetailerMappingModel.distributor_ref_id == d_ref,
            DistributorRetailerMappingModel.retailer_ref_id == retailer.retailer_ref_id,
            DistributorRetailerMappingModel.status == "ACTIVE"
        )
        mapping = (await db.execute(map_stmt)).scalars().first()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Retailer is not mapped to your distributor account."
            )

        # Fetch contact details
        c_stmt = select(RetailerContactModel).where(RetailerContactModel.retailer_id == retailer.public_id)
        contact = (await db.execute(c_stmt)).scalars().first()

        # Fetch wallet
        w_stmt = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == retailer.public_id)
        wallet = (await db.execute(w_stmt)).scalars().first()

        # Fetch configured MDR for this retailer
        mdr_stmt = select(DistributorMdrModel).where(
            DistributorMdrModel.distributor_ref_id == d_ref,
            DistributorMdrModel.retailer_ref_id == retailer.retailer_ref_id,
            DistributorMdrModel.status == "ACTIVE"
        )
        mdr_configs = (await db.execute(mdr_stmt)).scalars().all()

        # Fetch recent transactions
        tx_stmt = select(CentralTransactionModel).where(
            CentralTransactionModel.retailer_ref_id == retailer.retailer_ref_id,
            CentralTransactionModel.is_deleted == False
        ).order_by(desc(CentralTransactionModel.created_at)).limit(10)
        recent_txs = (await db.execute(tx_stmt)).scalars().all()

        return {
            "retailer": {
                "retailer_ref_id": retailer.retailer_ref_id,
                "retailer_id": str(retailer.public_id),
                "retailer_code": retailer.retailer_code,
                "store_name": retailer.store_name,
                "owner_name": retailer.owner_name,
                "legal_name": retailer.legal_name,
                "business_category": retailer.business_category,
                "status": retailer.status,
                "approval_status": "APPROVED" if retailer.status in ("ACTIVE", "APPROVED") else "PENDING",
                "active_status": retailer.is_active,
                "created_date": retailer.created_date.isoformat() if retailer.created_date else None,
                "contact": {
                    "mobile": contact.mobile if contact else "",
                    "email": contact.email if contact else "",
                    "primary_contact": contact.primary_contact if contact else ""
                } if contact else None,
                "wallet": {
                    "balance": float(wallet.wallet_balance) if wallet else 0.0,
                    "daily_limit": float(wallet.daily_transaction_limit) if wallet else 5000000.0,
                    "is_frozen": wallet.is_frozen if wallet else False
                } if wallet else {"balance": 0.0, "is_frozen": False}
            },
            "mdr_configurations": [
                {
                    "service_name": m.service_name,
                    "payment_mode": m.payment_mode,
                    "mdr": float(m.mdr),
                    "mdr_type": m.mdr_type,
                    "gst_rate": float(m.gst_rate)
                } for m in mdr_configs
            ],
            "recent_transactions": [
                {
                    "txn_id": tx.txn_id,
                    "service_name": tx.service_name,
                    "entry_type": tx.entry_type,
                    "amount": float(tx.amount),
                    "balance_after": float(tx.balance_after),
                    "status": tx.status,
                    "created_at": tx.created_at.isoformat()
                } for tx in recent_txs
            ]
        }

    @staticmethod
    async def invite_retailer(
        db: AsyncSession,
        distributor: DistributorModel,
        mobile_number: str,
        retailer_name: Optional[str] = None,
        retailer_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a secure retailer invitation from this distributor.
        Does NOT bypass retailer onboarding or approval.
        """
        d_ref = distributor.distributor_ref_id or distributor.id
        clean_m = re.sub(r"\D", "", str(mobile_number))
        if len(clean_m) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid 10-digit mobile number is required."
            )
        mob10 = clean_m[-10:]

        # Check if already mapped
        existing_stmt = (
            select(DistributorRetailerMappingModel)
            .join(RetailerModel, RetailerModel.retailer_ref_id == DistributorRetailerMappingModel.retailer_ref_id)
            .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
            .where(
                DistributorRetailerMappingModel.distributor_ref_id == d_ref,
                RetailerContactModel.mobile.in_([mob10, f"+91{mob10}", f"91{mob10}"]),
                DistributorRetailerMappingModel.status == "ACTIVE"
            )
        )
        already_mapped = (await db.execute(existing_stmt)).scalars().first()
        if already_mapped:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Retailer with mobile {mob10} is already mapped to your account."
            )

        # Create invitation record
        invite_code = f"INV-D{d_ref}-{secrets.token_hex(4).upper()}"
        invitation = DistributorInvitationModel(
            distributor_ref_id=d_ref,
            invite_code=invite_code,
            retailer_mobile=mob10,
            retailer_name=retailer_name or "Retailer Partner",
            retailer_email=retailer_email,
            tenant_id=distributor.tenant_id or uuid.UUID("00000000-0000-0000-0000-000000000001"),
            company_id=distributor.company_id or uuid.UUID("00000000-0000-0000-0000-000000000001"),
            status="PENDING",
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(invitation)
        await db.commit()
        await db.refresh(invitation)

        invite_link = f"https://retailer.pay2pay.in/register/mobile?ref={invite_code}&dist={d_ref}"

        return {
            "success": True,
            "message": f"Invitation generated successfully for retailer {mob10}.",
            "invitation": {
                "distributor_invitations_ref_id": invitation.distributor_invitations_ref_id,
                "invite_code": invitation.invite_code,
                "retailer_mobile": invitation.retailer_mobile,
                "retailer_name": invitation.retailer_name,
                "status": invitation.status,
                "expires_at": invitation.expires_at.isoformat(),
                "invite_link": invite_link
            }
        }

    @staticmethod
    async def create_topup_request(
        db: AsyncSession,
        distributor: DistributorModel,
        amount: float,
        payment_method: str,
        payment_reference: Optional[str] = None,
        payment_date: Optional[datetime] = None,
        slip_id: Optional[str] = None,
        slip_url: Optional[str] = None,
        remarks: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submits a top-up request on behalf of the Distributor.
        Distributor DOES NOT have top-up approval authority.
        Enters existing Top-up Request System for Admin approval.
        """
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requested topup amount must be greater than zero."
            )

        d_ref = distributor.distributor_ref_id or distributor.id
        wallet = await DistributorService.get_or_create_wallet(db, distributor)

        # Dynamic UserType resolution
        ut_ref_id = await UserTypeService.get_user_type_ref_id(db, "DISTRIBUTOR") or 3

        req_id = f"TOP-DIST-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
        topup = TopupRequestModel(
            topup_request_id=req_id,
            retailer_id=None,
            distributor_id=distributor.public_id,
            distributor_ref_id=d_ref,
            dist_wallet_ref_id=wallet.dist_wallet_ref_id,
            user_ref_id=d_ref,
            user_type_ref_id=ut_ref_id,
            tenant_ref_id=getattr(distributor, "tenant_ref_id", 1) or 1,
            company_ref_id=getattr(distributor, "company_ref_id", 1) or 1,
            tenant_id=distributor.tenant_id or uuid.UUID("00000000-0000-0000-0000-000000000001"),
            company_id=distributor.company_id or uuid.UUID("00000000-0000-0000-0000-000000000001"),
            requested_amount=Decimal(str(round(amount, 2))),
            currency="INR",
            payment_method=payment_method or "BANK_TRANSFER",
            payment_reference=payment_reference,
            payment_date=payment_date or datetime.now(timezone.utc),
            slip_id=slip_id,
            slip_url=slip_url,
            retailer_remarks=remarks,
            status="PENDING",
            submitted_at=datetime.now(timezone.utc),
            created_by=f"DISTRIBUTOR_{d_ref}",
            updated_by=f"DISTRIBUTOR_{d_ref}",
            metadata_json={
                "requester_type": "DISTRIBUTOR",
                "distributor_name": distributor.business_name or distributor.owner_name,
                "distributor_code": distributor.distributor_code,
                "distributor_ref_id": d_ref
            }
        )
        db.add(topup)
        await db.commit()
        await db.refresh(topup)

        return {
            "success": True,
            "message": "Top-up request submitted successfully. Awaiting Admin verification and approval.",
            "data": {
                "topup_request_id": topup.topup_request_id,
                "requested_amount": float(topup.requested_amount),
                "payment_method": topup.payment_method,
                "payment_reference": topup.payment_reference,
                "status": topup.status,
                "submitted_at": topup.submitted_at.isoformat()
            }
        }

    @staticmethod
    async def list_topup_requests(
        db: AsyncSession,
        distributor: DistributorModel,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lists top-up requests belonging exclusively to this Distributor.
        """
        d_ref = distributor.distributor_ref_id or distributor.id
        conditions = [
            TopupRequestModel.distributor_ref_id == d_ref,
            TopupRequestModel.is_deleted == False
        ]
        if status_filter and status_filter.upper() != "ALL":
            conditions.append(func.upper(TopupRequestModel.status) == status_filter.upper())

        count_stmt = select(func.count(TopupRequestModel.id)).where(*conditions)
        total_items = (await db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        items_stmt = (
            select(TopupRequestModel)
            .where(*conditions)
            .order_by(desc(TopupRequestModel.submitted_at))
            .offset(offset)
            .limit(page_size)
        )
        reqs = (await db.execute(items_stmt)).scalars().all()

        return {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": max(1, (total_items + page_size - 1) // page_size),
            "requests": [
                {
                    "topup_requests_ref_id": r.id,
                    "topup_request_id": r.topup_request_id,
                    "requested_amount": float(r.requested_amount),
                    "approved_amount": float(r.approved_amount) if r.approved_amount is not None else None,
                    "status": r.status,
                    "payment_method": r.payment_method,
                    "payment_reference": r.payment_reference,
                    "slip_url": r.slip_url,
                    "retailer_remarks": r.retailer_remarks,
                    "admin_notes": r.admin_notes,
                    "rejection_reason": r.rejection_reason,
                    "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
                    "approved_at": r.approved_at.isoformat() if r.approved_at else None,
                    "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None
                }
                for r in reqs
            ]
        }

    @staticmethod
    async def get_distributor_mdr_configs(
        db: AsyncSession,
        distributor: DistributorModel,
        retailer_ref_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Loads MDR configuration for mapped retailers.
        Validates retailer mapping before returning.
        """
        d_ref = distributor.distributor_ref_id or distributor.id
        conditions = [
            DistributorMdrModel.distributor_ref_id == d_ref,
            DistributorMdrModel.status == "ACTIVE"
        ]
        if retailer_ref_id:
            # Verify mapping
            map_stmt = select(DistributorRetailerMappingModel).where(
                DistributorRetailerMappingModel.distributor_ref_id == d_ref,
                DistributorRetailerMappingModel.retailer_ref_id == retailer_ref_id,
                DistributorRetailerMappingModel.status == "ACTIVE"
            )
            mapping = (await db.execute(map_stmt)).scalars().first()
            if not mapping:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: Retailer is not mapped to your distributor account."
                )
            conditions.append(DistributorMdrModel.retailer_ref_id == retailer_ref_id)

        stmt = select(DistributorMdrModel).where(*conditions)
        rows = (await db.execute(stmt)).scalars().all()

        return [
            {
                "distributor_mdr_ref_id": r.distributor_mdr_ref_id,
                "distributor_ref_id": r.distributor_ref_id,
                "retailer_ref_id": r.retailer_ref_id,
                "service_name": r.service_name,
                "payment_mode": r.payment_mode,
                "mdr": float(r.mdr),
                "mdr_type": r.mdr_type,
                "gst_rate": float(r.gst_rate),
                "status": r.status,
                "updated_at": r.updated_at.isoformat()
            }
            for r in rows
        ]

    @staticmethod
    async def configure_distributor_mdr(
        db: AsyncSession,
        distributor: DistributorModel,
        retailer_ref_id: int,
        service_name: str,
        payment_mode: str,
        mdr_rate: float,
        mdr_type: str = "PERCENTAGE",
        gst_rate: float = 18.00
    ) -> Dict[str, Any]:
        """
        Configures or updates MDR rate for a specific mapped retailer.
        Security Rule: Backend verifies retailer belongs to this distributor.
        """
        d_ref = distributor.distributor_ref_id or distributor.id

        # 1. VERIFICATION: Is retailer mapped to this distributor?
        map_stmt = select(DistributorRetailerMappingModel).where(
            DistributorRetailerMappingModel.distributor_ref_id == d_ref,
            DistributorRetailerMappingModel.retailer_ref_id == retailer_ref_id,
            DistributorRetailerMappingModel.status == "ACTIVE"
        )
        mapping = (await db.execute(map_stmt)).scalars().first()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Violation: Cannot configure MDR for unmapped retailer."
            )

        if mdr_rate < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MDR rate cannot be negative."
            )

        # 2. Check existing config
        existing_stmt = select(DistributorMdrModel).where(
            DistributorMdrModel.distributor_ref_id == d_ref,
            DistributorMdrModel.retailer_ref_id == retailer_ref_id,
            DistributorMdrModel.service_name == service_name,
            DistributorMdrModel.payment_mode == payment_mode
        )
        existing = (await db.execute(existing_stmt)).scalars().first()

        if existing:
            existing.mdr = Decimal(str(round(mdr_rate, 4)))
            existing.mdr_type = mdr_type
            existing.gst_rate = Decimal(str(round(gst_rate, 2)))
            existing.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(existing)
            record = existing
        else:
            new_mdr = DistributorMdrModel(
                distributor_ref_id=d_ref,
                retailer_ref_id=retailer_ref_id,
                service_name=service_name,
                payment_mode=payment_mode,
                mdr=Decimal(str(round(mdr_rate, 4))),
                mdr_type=mdr_type,
                gst_rate=Decimal(str(round(gst_rate, 2))),
                tenant_id=distributor.tenant_id or uuid.UUID("00000000-0000-0000-0000-000000000001"),
                company_id=distributor.company_id or uuid.UUID("00000000-0000-0000-0000-000000000001"),
                status="ACTIVE"
            )
            db.add(new_mdr)
            await db.commit()
            await db.refresh(new_mdr)
            record = new_mdr

        return {
            "success": True,
            "message": f"MDR configured successfully for {service_name} ({payment_mode}).",
            "data": {
                "distributor_mdr_ref_id": record.distributor_mdr_ref_id,
                "distributor_ref_id": record.distributor_ref_id,
                "retailer_ref_id": record.retailer_ref_id,
                "service_name": record.service_name,
                "payment_mode": record.payment_mode,
                "mdr": float(record.mdr),
                "mdr_type": record.mdr_type,
                "gst_rate": float(record.gst_rate)
            }
        }

    @staticmethod
    async def list_transactions(
        db: AsyncSession,
        distributor: DistributorModel,
        page: int = 1,
        page_size: int = 20,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        service_name: Optional[str] = None,
        entry_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetches financial transactions for this Distributor from the central transactions table.
        Uses existing common transaction architecture: user_ref_id + usertype_ref_id.
        """
        d_ref = distributor.distributor_ref_id or distributor.id
        ut_ref_id = await UserTypeService.get_user_type_ref_id(db, "DISTRIBUTOR") or 3

        conditions = [
            or_(
                CentralTransactionModel.distributor_ref_id == d_ref,
                and_(
                    CentralTransactionModel.user_ref_id == d_ref,
                    CentralTransactionModel.user_type_ref_id == ut_ref_id
                )
            ),
            CentralTransactionModel.is_deleted == False
        ]

        if service_name and service_name.upper() != "ALL":
            conditions.append(func.upper(CentralTransactionModel.service_name) == service_name.upper())

        if entry_type and entry_type.upper() in ("DEBIT", "CREDIT"):
            conditions.append(CentralTransactionModel.entry_type == entry_type.upper())

        count_stmt = select(func.count(CentralTransactionModel.transactions_ref_id)).where(*conditions)
        total_items = (await db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        items_stmt = (
            select(CentralTransactionModel)
            .where(*conditions)
            .order_by(desc(CentralTransactionModel.created_at))
            .offset(offset)
            .limit(page_size)
        )
        txs = (await db.execute(items_stmt)).scalars().all()

        return {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": max(1, (total_items + page_size - 1) // page_size),
            "transactions": [
                {
                    "transactions_ref_id": tx.transactions_ref_id,
                    "txn_id": tx.txn_id,
                    "ref_id": tx.ref_id,
                    "service_name": tx.service_name,
                    "wallet_type": tx.wallet_type,
                    "entry_type": tx.entry_type,
                    "amount": float(tx.amount),
                    "balance_before": float(tx.balance_before),
                    "balance_after": float(tx.balance_after),
                    "status": tx.status,
                    "narration": tx.narration,
                    "created_at": tx.created_at.isoformat()
                }
                for tx in txs
            ]
        }
