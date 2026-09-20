"""
Enterprise Super Distributor (Master Distributor) Application Service.

Authorization Model (STRICT):
  1. JWT decoded → extract super_distributor_ref_id (user_type_ref_id == 4)
  2. Resolve SuperDistributorModel from DB (never trust JWT payload for profile data)
  3. Fetch mapped distributor_ref_ids from super_distributor_distributor table
  4. All data access SCOPED to those mapped distributor_ref_ids only
  5. Any request referencing a distributor NOT in the mapped set → 403 Forbidden (IDOR protection)

Principles:
  - Never uses localStorage / request-supplied IDs for authorization
  - Zero hardcoded UUIDs, IDs, or MDR values
  - Reuses existing DistributorModel, PosMdrService, existing transactions ledger
  - Does NOT modify any existing service or API
"""

import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, text, and_, or_, desc

from app.core.security import hash_password
from app.infrastructure.db.models import (
    SuperDistributorModel,
    DistributorModel,
    AdminUserModel,
    CompanyModel,
    TenantModel,
    OrganizationHierarchyModel,
)
from app.infrastructure.db.auth_models import AuthUserModel
from app.infrastructure.db.super_distributor_models import (
    SuperDistributorDistributorMappingModel,
    SdWalletModel,
)
from app.infrastructure.db.distributor_models import DistributorRetailerMappingModel

logger = logging.getLogger("super_distributor_service")


class SuperDistributorService:
    """
    Application service for Super Distributor (Master Distributor) operations.
    All methods require an already-resolved SuperDistributorModel as the caller context.
    """

    # ── Context Resolution ──────────────────────────────────────────────────

    @staticmethod
    async def resolve_by_ref_id(
        db: AsyncSession,
        super_distributor_ref_id: int
    ) -> Optional[SuperDistributorModel]:
        """Resolve SuperDistributorModel from ref_id. Returns None if not found."""
        stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.super_distributor_ref_id == super_distributor_ref_id,
            SuperDistributorModel.is_deleted == False
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def resolve_by_public_id(
        db: AsyncSession,
        public_id: uuid.UUID
    ) -> Optional[SuperDistributorModel]:
        """Resolve SuperDistributorModel from public UUID."""
        stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.public_id == public_id,
            SuperDistributorModel.is_deleted == False
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def resolve_by_mobile(
        db: AsyncSession,
        mobile: str
    ) -> Optional[SuperDistributorModel]:
        """Resolve SuperDistributorModel from mobile number."""
        stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.mobile == mobile,
            SuperDistributorModel.is_deleted == False
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    # ── Mapped Distributor Retrieval ─────────────────────────────────────────

    @staticmethod
    async def get_mapped_distributor_ref_ids(
        db: AsyncSession,
        super_distributor_ref_id: int
    ) -> List[int]:
        """
        Returns the list of distributor_ref_ids explicitly mapped to this SD.
        Only returns ACTIVE mappings. Never returns all-tenant distributors.
        """
        stmt = select(
            SuperDistributorDistributorMappingModel.distributor_ref_id
        ).where(
            SuperDistributorDistributorMappingModel.super_distributor_ref_id == super_distributor_ref_id,
            SuperDistributorDistributorMappingModel.status == "ACTIVE"
        )
        result = await db.execute(stmt)
        return [row[0] for row in result.all()]

    @staticmethod
    async def verify_distributor_ownership(
        db: AsyncSession,
        super_distributor_ref_id: int,
        distributor_ref_id: int
    ) -> None:
        """
        IDOR Protection: Verify that distributor_ref_id is mapped to this SD.
        Raises HTTP 403 if not mapped. Never trusts caller-supplied IDs.
        """
        stmt = select(func.count()).where(
            SuperDistributorDistributorMappingModel.super_distributor_ref_id == super_distributor_ref_id,
            SuperDistributorDistributorMappingModel.distributor_ref_id == distributor_ref_id,
            SuperDistributorDistributorMappingModel.status == "ACTIVE"
        )
        count = (await db.execute(stmt)).scalar() or 0
        if count == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. The requested Distributor is not mapped to your Master Distributor account."
            )

    # ── Dashboard ────────────────────────────────────────────────────────────

    @staticmethod
    async def get_dashboard_stats(
        db: AsyncSession,
        sd: SuperDistributorModel
    ) -> Dict[str, Any]:
        """
        Returns aggregated KPIs for the Super Distributor dashboard.
        All values strictly scoped to mapped distributors only.
        """
        sd_ref_id = sd.super_distributor_ref_id or sd.id
        mapped_dist_ids = await SuperDistributorService.get_mapped_distributor_ref_ids(db, sd_ref_id)

        total_mapped = len(mapped_dist_ids)
        active_dist = 0
        pending_dist = 0

        if mapped_dist_ids:
            # Count active distributors
            active_stmt = select(func.count()).where(
                DistributorModel.distributor_ref_id.in_(mapped_dist_ids),
                DistributorModel.status == "ACTIVE",
                DistributorModel.is_active == True,
                DistributorModel.is_deleted == False
            )
            active_dist = (await db.execute(active_stmt)).scalar() or 0

            # Count pending (PENDING_APPROVAL / PENDING) distributors
            pending_stmt = select(func.count()).where(
                DistributorModel.distributor_ref_id.in_(mapped_dist_ids),
                DistributorModel.status.in_(["PENDING", "PENDING_APPROVAL", "ONBOARDING"]),
                DistributorModel.is_deleted == False
            )
            pending_dist = (await db.execute(pending_stmt)).scalar() or 0

        # Today's transaction metrics from common transactions ledger
        today = datetime.now(timezone.utc).date()
        today_txn_count = 0
        today_txn_amount = 0.0
        monthly_txn_amount = 0.0

        if mapped_dist_ids:
            # Today
            today_res = await db.execute(text("""
                SELECT
                    COUNT(*)::bigint AS txn_count,
                    COALESCE(SUM(amount), 0.00)::numeric AS txn_amount
                FROM public.transactions
                WHERE distributor_ref_id = ANY(:dist_ids)
                  AND entry_type = 'DR'
                  AND status = 'SUCCESS'
                  AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
                  AND is_deleted = FALSE
            """), {"dist_ids": mapped_dist_ids})
            today_row = today_res.mappings().first()
            if today_row:
                today_txn_count = int(today_row["txn_count"] or 0)
                today_txn_amount = float(today_row["txn_amount"] or 0.0)

            # Monthly
            monthly_res = await db.execute(text("""
                SELECT COALESCE(SUM(amount), 0.00)::numeric AS monthly_amount
                FROM public.transactions
                WHERE distributor_ref_id = ANY(:dist_ids)
                  AND entry_type = 'DR'
                  AND status = 'SUCCESS'
                  AND DATE_TRUNC('month', created_at AT TIME ZONE 'Asia/Kolkata') = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')
                  AND is_deleted = FALSE
            """), {"dist_ids": mapped_dist_ids})
            monthly_row = monthly_res.mappings().first()
            if monthly_row:
                monthly_txn_amount = float(monthly_row["monthly_amount"] or 0.0)

        # SD Wallet Balance
        wallet_balance = 0.0
        wallet_stmt = select(SdWalletModel).where(
            SdWalletModel.super_distributor_ref_id == sd_ref_id
        )
        wallet = (await db.execute(wallet_stmt)).scalars().first()
        if wallet:
            wallet_balance = float(wallet.balance)
        else:
            wallet_balance = float(sd.wallet_balance or 0.0)

        return {
            "super_distributor": {
                "ref_id": sd_ref_id,
                "business_name": sd.business_name,
                "owner_name": sd.owner_name,
                "status": sd.status,
                "is_active": sd.is_active,
                "code": sd.super_distributor_code,
            },
            "wallet": {
                "balance": wallet_balance,
                "currency": "INR",
            },
            "distributors": {
                "total_mapped": total_mapped,
                "active": active_dist,
                "pending_approval": pending_dist,
                "inactive": max(0, total_mapped - active_dist - pending_dist),
            },
            "transactions": {
                "today_count": today_txn_count,
                "today_amount": today_txn_amount,
                "monthly_amount": monthly_txn_amount,
            }
        }

    # ── Distributor List ─────────────────────────────────────────────────────

    @staticmethod
    async def list_mapped_distributors(
        db: AsyncSession,
        sd: SuperDistributorModel,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Returns paginated list of distributors mapped to this SD.
        Never returns distributors from another SD.
        """
        sd_ref_id = sd.super_distributor_ref_id or sd.id
        mapped_ids = await SuperDistributorService.get_mapped_distributor_ref_ids(db, sd_ref_id)

        if not mapped_ids:
            return {"items": [], "total": 0, "page": page, "page_size": page_size, "pages": 0}

        conditions = [
            DistributorModel.distributor_ref_id.in_(mapped_ids),
            DistributorModel.is_deleted == False
        ]

        if search:
            s = f"%{search}%"
            conditions.append(or_(
                DistributorModel.business_name.ilike(s),
                DistributorModel.owner_name.ilike(s),
                DistributorModel.mobile.ilike(s),
                DistributorModel.email.ilike(s),
                DistributorModel.distributor_code.ilike(s),
            ))

        if status_filter:
            st = status_filter.upper()
            if st in ("PENDING", "PENDING_APPROVAL"):
                conditions.append(DistributorModel.status.in_(["PENDING", "PENDING_APPROVAL", "ONBOARDING"]))
            else:
                conditions.append(DistributorModel.status == st)

        count_stmt = select(func.count()).select_from(DistributorModel).where(and_(*conditions))
        total = (await db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        list_stmt = (
            select(DistributorModel)
            .where(and_(*conditions))
            .order_by(desc(DistributorModel.created_date))
            .offset(offset)
            .limit(page_size)
        )
        rows = (await db.execute(list_stmt)).scalars().all()

        items = []
        for d in rows:
            # Count mapped retailers
            ret_count_res = await db.execute(
                select(func.count()).where(
                    DistributorRetailerMappingModel.distributor_ref_id == d.distributor_ref_id,
                    DistributorRetailerMappingModel.status == "ACTIVE"
                )
            )
            retailer_count = ret_count_res.scalar() or 0

            items.append({
                "distributor_ref_id": d.distributor_ref_id,
                "distributor_code": d.distributor_code,
                "business_name": d.business_name,
                "owner_name": d.owner_name,
                "mobile": d.mobile,
                "email": d.email,
                "status": d.status,
                "is_active": d.is_active,
                "wallet_balance": float(d.wallet_balance or 0.0),
                "state": d.state,
                "city": d.city,
                "retailer_count": retailer_count,
                "created_at": d.created_date.isoformat() if d.created_date else None,
                "public_id": str(d.public_id),
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size
        }

    @staticmethod
    async def get_distributor_detail(
        db: AsyncSession,
        sd: SuperDistributorModel,
        distributor_ref_id: int
    ) -> Dict[str, Any]:
        """
        Returns full distributor detail. IDOR protected.
        Raises 403 if distributor not mapped to this SD.
        """
        sd_ref_id = sd.super_distributor_ref_id or sd.id
        await SuperDistributorService.verify_distributor_ownership(db, sd_ref_id, distributor_ref_id)

        stmt = select(DistributorModel).where(
            DistributorModel.distributor_ref_id == distributor_ref_id,
            DistributorModel.is_deleted == False
        )
        dist = (await db.execute(stmt)).scalars().first()
        if not dist:
            raise HTTPException(status_code=404, detail="Distributor not found.")

        # Retailer count
        ret_count = (await db.execute(
            select(func.count()).where(
                DistributorRetailerMappingModel.distributor_ref_id == distributor_ref_id,
                DistributorRetailerMappingModel.status == "ACTIVE"
            )
        )).scalar() or 0

        return {
            "distributor_ref_id": dist.distributor_ref_id,
            "public_id": str(dist.public_id),
            "distributor_code": dist.distributor_code,
            "business_name": dist.business_name,
            "owner_name": dist.owner_name,
            "mobile": dist.mobile,
            "email": dist.email,
            "gst_number": dist.gst_number,
            "pan_number": dist.pan_number,
            "bank_account_number": dist.bank_account_number,
            "ifsc": dist.ifsc,
            "state": dist.state,
            "city": dist.city,
            "address": dist.address,
            "pincode": dist.pincode,
            "status": dist.status,
            "is_active": dist.is_active,
            "wallet_balance": float(dist.wallet_balance or 0.0),
            "credit_limit": float(dist.credit_limit or 0.0),
            "retailer_count": ret_count,
            "created_at": dist.created_date.isoformat() if dist.created_date else None,
        }

    # ── Distributor Onboarding ────────────────────────────────────────────────

    @staticmethod
    async def onboard_distributor(
        db: AsyncSession,
        sd: SuperDistributorModel,
        business_name: str,
        owner_name: str,
        mobile: str,
        email: str,
        password: str,
        state: str,
        city: str,
        address: str,
        pincode: str,
        gst_number: Optional[str] = None,
        pan_number: Optional[str] = None,
        bank_account_number: Optional[str] = None,
        ifsc: Optional[str] = None,
        credit_limit: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Creates a new Distributor and automatically maps it to the authenticated SD.
        The backend ALWAYS derives the SD relationship from the authenticated user.
        Never trusts caller-submitted SD ID.

        Sets initial status = PENDING (requires Admin approval before ACTIVE).
        Password is hashed with bcrypt and stored in auth_users.
        """
        sd_ref_id = sd.super_distributor_ref_id or sd.id

        # Duplicate check
        dup_stmt = select(DistributorModel).where(
            DistributorModel.tenant_id == sd.tenant_id,
            or_(
                DistributorModel.email == email.lower().strip(),
                DistributorModel.mobile == mobile.strip()
            ),
            DistributorModel.is_deleted == False
        )
        dup = (await db.execute(dup_stmt)).scalars().first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A Distributor with this email or mobile already exists."
            )

        # Validate password
        if not password or len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters."
            )

        d_public_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        # Create Distributor record with PENDING status
        distributor = DistributorModel(
            public_id=d_public_id,
            tenant_id=sd.tenant_id,
            company_id=sd.company_id,
            company_ref_id=sd.company_ref_id,
            tenant_ref_id=sd.tenant_ref_id,
            business_name=business_name.strip(),
            owner_name=owner_name.strip(),
            mobile=mobile.strip(),
            email=email.lower().strip(),
            gst_number=gst_number.upper().strip() if gst_number else None,
            pan_number=pan_number.upper().strip() if pan_number else None,
            bank_account_number=bank_account_number,
            ifsc=ifsc.upper().strip() if ifsc else None,
            credit_limit=credit_limit,
            state=state.strip(),
            city=city.strip(),
            address=address.strip(),
            pincode=pincode.strip(),
            mapped_super_distributor_id=sd.public_id,
            status="PENDING",
            is_active=False,
            created_by=sd.email,
        )
        db.add(distributor)
        await db.flush()  # Get auto-generated distributor_ref_id

        # Refresh to get the generated ref_id
        await db.refresh(distributor)
        dist_ref_id = distributor.distributor_ref_id or distributor.id

        # Create auth_users record for Distributor
        password_hash = hash_password(password)
        auth_user = AuthUserModel(
            public_id=uuid.uuid4(),
            tenant_id=sd.tenant_id,
            company_id=sd.company_id,
            user_id=d_public_id,
            mobile_number=mobile.strip(),
            full_name=owner_name.strip(),
            email=email.lower().strip(),
            password_hash=password_hash,
            role="DISTRIBUTOR",
            account_status="PENDING",
        )
        db.add(auth_user)

        # Create explicit SD->Distributor mapping
        mapping = SuperDistributorDistributorMappingModel(
            super_distributor_ref_id=sd_ref_id,
            distributor_ref_id=dist_ref_id,
            tenant_id=sd.tenant_id,
            company_id=sd.company_id,
            status="PENDING",  # ACTIVE only after Admin approval
            created_by=sd.email,
        )
        db.add(mapping)

        # Create organization hierarchy edge: SD -> Distributor
        hierarchy = OrganizationHierarchyModel(
            public_id=uuid.uuid4(),
            tenant_id=sd.tenant_id,
            company_id=sd.company_id,
            parent_entity_type="SUPER_DISTRIBUTOR",
            parent_entity_id=sd.public_id,
            child_entity_type="DISTRIBUTOR",
            child_entity_id=d_public_id,
            status="PENDING",
            created_by=sd.email,
        )
        db.add(hierarchy)

        await db.commit()
        await db.refresh(distributor)

        logger.info(
            f"SD {sd_ref_id} onboarded new Distributor ref_id={dist_ref_id} "
            f"mobile={mobile} → PENDING Admin approval"
        )

        return {
            "distributor_ref_id": dist_ref_id,
            "public_id": str(d_public_id),
            "business_name": distributor.business_name,
            "owner_name": distributor.owner_name,
            "mobile": distributor.mobile,
            "email": distributor.email,
            "status": distributor.status,
            "message": (
                "Distributor created successfully. "
                "Pending Admin approval before activation."
            )
        }

    # ── MDR Configuration ────────────────────────────────────────────────────

    @staticmethod
    async def get_mdr_configurations(
        db: AsyncSession,
        sd: SuperDistributorModel,
        distributor_ref_id: Optional[int] = None,
        payment_mode: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Returns MDR configurations set by this SD for its mapped distributors.
        Uses existing super_distributor_mdr table.
        """
        from app.infrastructure.db.distributor_models import SuperDistributorMdrModel

        sd_ref_id = sd.super_distributor_ref_id or sd.id
        mapped_ids = await SuperDistributorService.get_mapped_distributor_ref_ids(db, sd_ref_id)

        if not mapped_ids:
            return {"items": [], "total": 0, "page": page, "page_size": page_size, "pages": 0}

        conditions = [
            SuperDistributorMdrModel.super_distributor_ref_id == sd_ref_id,
            SuperDistributorMdrModel.status == "ACTIVE"
        ]

        if distributor_ref_id:
            await SuperDistributorService.verify_distributor_ownership(db, sd_ref_id, distributor_ref_id)
            conditions.append(SuperDistributorMdrModel.retailer_ref_id == distributor_ref_id)

        if payment_mode:
            conditions.append(SuperDistributorMdrModel.payment_mode == payment_mode.upper())

        count = (await db.execute(
            select(func.count()).select_from(SuperDistributorMdrModel).where(and_(*conditions))
        )).scalar() or 0

        offset = (page - 1) * page_size
        rows = (await db.execute(
            select(SuperDistributorMdrModel)
            .where(and_(*conditions))
            .offset(offset)
            .limit(page_size)
            .order_by(desc(SuperDistributorMdrModel.updated_at))
        )).scalars().all()

        items = []
        for r in rows:
            # Fetch distributor name
            dist_stmt = select(DistributorModel.business_name, DistributorModel.distributor_code).where(
                DistributorModel.distributor_ref_id == r.retailer_ref_id
            )
            dist_info = (await db.execute(dist_stmt)).first()
            items.append({
                "super_distributor_mdr_ref_id": r.super_distributor_mdr_ref_id,
                "distributor_ref_id": r.retailer_ref_id,
                "distributor_name": dist_info[0] if dist_info else "Unknown",
                "distributor_code": dist_info[1] if dist_info else "",
                "service_name": r.service_name,
                "payment_mode": r.payment_mode,
                "mdr": float(r.mdr),
                "mdr_type": r.mdr_type,
                "gst_rate": float(r.gst_rate),
                "status": r.status,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            })

        return {
            "items": items,
            "total": count,
            "page": page,
            "page_size": page_size,
            "pages": (count + page_size - 1) // page_size
        }

    @staticmethod
    async def set_mdr_configuration(
        db: AsyncSession,
        sd: SuperDistributorModel,
        distributor_ref_id: int,
        payment_mode: str,
        mdr: float,
        mdr_type: str = "PERCENTAGE",
        gst_rate: float = 18.0,
        service_name: str = "POS_TOPUP"
    ) -> Dict[str, Any]:
        """
        Creates or updates MDR configuration for a mapped distributor.
        SD can ONLY configure MDR for explicitly mapped distributors.
        Uses existing super_distributor_mdr table.
        """
        from app.infrastructure.db.distributor_models import SuperDistributorMdrModel

        sd_ref_id = sd.super_distributor_ref_id or sd.id

        # IDOR guard
        await SuperDistributorService.verify_distributor_ownership(db, sd_ref_id, distributor_ref_id)

        # Validate MDR
        mdr_dec = Decimal(str(mdr)).quantize(Decimal("0.0001"))
        if mdr_dec < Decimal("0") or mdr_dec > Decimal("10"):
            raise HTTPException(
                status_code=422,
                detail="MDR must be between 0.00 and 10.00 percent."
            )

        now = datetime.now(timezone.utc)

        # Upsert
        existing_stmt = select(SuperDistributorMdrModel).where(
            SuperDistributorMdrModel.super_distributor_ref_id == sd_ref_id,
            SuperDistributorMdrModel.retailer_ref_id == distributor_ref_id,
            SuperDistributorMdrModel.service_name == service_name,
            SuperDistributorMdrModel.payment_mode == payment_mode.upper(),
            SuperDistributorMdrModel.status == "ACTIVE"
        )
        existing = (await db.execute(existing_stmt)).scalars().first()

        if existing:
            existing.mdr = float(mdr_dec)
            existing.mdr_type = mdr_type.upper()
            existing.gst_rate = Decimal(str(gst_rate))
            existing.updated_at = now
            await db.commit()
            await db.refresh(existing)
            target = existing
        else:
            new_mdr = SuperDistributorMdrModel(
                super_distributor_ref_id=sd_ref_id,
                retailer_ref_id=distributor_ref_id,
                service_name=service_name,
                payment_mode=payment_mode.upper(),
                mdr=float(mdr_dec),
                mdr_type=mdr_type.upper(),
                gst_rate=Decimal(str(gst_rate)),
                tenant_id=sd.tenant_id,
                company_id=sd.company_id,
                tenant_ref_id=sd.tenant_ref_id,
                company_ref_id=sd.company_ref_id,
                status="ACTIVE",
                created_at=now,
                updated_at=now
            )
            db.add(new_mdr)
            await db.commit()
            await db.refresh(new_mdr)
            target = new_mdr

        return {
            "super_distributor_mdr_ref_id": target.super_distributor_mdr_ref_id,
            "distributor_ref_id": target.retailer_ref_id,
            "service_name": target.service_name,
            "payment_mode": target.payment_mode,
            "mdr": float(target.mdr),
            "mdr_type": target.mdr_type,
            "gst_rate": float(target.gst_rate),
            "status": target.status,
        }

    # ── Transaction Report ────────────────────────────────────────────────────

    @staticmethod
    async def get_transactions(
        db: AsyncSession,
        sd: SuperDistributorModel,
        page: int = 1,
        page_size: int = 20,
        distributor_ref_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        txn_id: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        service_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Returns paginated transaction report scoped to mapped distributors.
        Filtering happens at the DB level — never returns tenant-wide data.
        """
        sd_ref_id = sd.super_distributor_ref_id or sd.id
        mapped_ids = await SuperDistributorService.get_mapped_distributor_ref_ids(db, sd_ref_id)

        if not mapped_ids:
            return {
                "items": [], "total": 0, "page": page, "page_size": page_size,
                "pages": 0, "summary": {"total_amount": 0.0, "success_count": 0}
            }

        effective_dist_ids = mapped_ids
        if distributor_ref_id:
            # IDOR guard for specific distributor filter
            await SuperDistributorService.verify_distributor_ownership(db, sd_ref_id, distributor_ref_id)
            effective_dist_ids = [distributor_ref_id]

        where_parts = [f"distributor_ref_id = ANY(:dist_ids)"]
        params: Dict[str, Any] = {"dist_ids": effective_dist_ids}

        if status_filter:
            st = status_filter.upper()
            if st in ("PENDING",):
                where_parts.append("UPPER(status) IN ('PENDING', 'INITIATED', 'PROCESSING')")
            else:
                where_parts.append("UPPER(status) = :status_filter")
                params["status_filter"] = st

        if date_from:
            where_parts.append("DATE(created_at AT TIME ZONE 'Asia/Kolkata') >= :date_from")
            params["date_from"] = date_from

        if date_to:
            where_parts.append("DATE(created_at AT TIME ZONE 'Asia/Kolkata') <= :date_to")
            params["date_to"] = date_to

        if txn_id:
            where_parts.append("(txn_id ILIKE :txn_id OR ref_id ILIKE :txn_id)")
            params["txn_id"] = f"%{txn_id}%"

        if min_amount is not None:
            where_parts.append("amount >= :min_amount")
            params["min_amount"] = min_amount

        if max_amount is not None:
            where_parts.append("amount <= :max_amount")
            params["max_amount"] = max_amount

        if service_name:
            where_parts.append("UPPER(service_name) = :service_name")
            params["service_name"] = service_name.upper()

        where_clause = " AND ".join(where_parts)

        count_res = await db.execute(
            text(f"SELECT COUNT(*) FROM public.transactions WHERE {where_clause} AND is_deleted = FALSE"),
            params
        )
        total = count_res.scalar() or 0

        summary_res = await db.execute(text(f"""
            SELECT
                COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN amount ELSE 0 END), 0.00) AS total_amount,
                COUNT(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 END)::bigint AS success_count
            FROM public.transactions
            WHERE {where_clause} AND is_deleted = FALSE
        """), params)
        summary_row = summary_res.mappings().first()
        summary = {
            "total_amount": float(summary_row["total_amount"] or 0.0) if summary_row else 0.0,
            "success_count": int(summary_row["success_count"] or 0) if summary_row else 0,
        }

        offset = (page - 1) * page_size
        params["limit"] = page_size
        params["offset"] = offset

        rows_res = await db.execute(text(f"""
            SELECT
                id AS transaction_id_pk,
                txn_id,
                ref_id,
                service_name,
                entry_type,
                amount,
                balance_before,
                balance_after,
                status,
                narration,
                retailer_ref_id,
                retailer_name,
                distributor_ref_id,
                dist_name,
                created_at
            FROM public.transactions
            WHERE {where_clause} AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """), params)

        items = []
        for row in rows_res.mappings().all():
            items.append({
                "txn_id": row["txn_id"],
                "ref_id": row["ref_id"],
                "service_name": row["service_name"],
                "entry_type": row["entry_type"],
                "amount": float(row["amount"] or 0),
                "balance_before": float(row["balance_before"] or 0),
                "balance_after": float(row["balance_after"] or 0),
                "status": row["status"],
                "narration": row["narration"],
                "retailer_ref_id": row["retailer_ref_id"],
                "retailer_name": row["retailer_name"],
                "distributor_ref_id": row["distributor_ref_id"],
                "distributor_name": row["dist_name"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
            "summary": summary,
        }

    # ── Profile ──────────────────────────────────────────────────────────────

    @staticmethod
    async def get_profile(db: AsyncSession, sd: SuperDistributorModel) -> Dict[str, Any]:
        """Returns the SD's own profile data."""
        sd_ref_id = sd.super_distributor_ref_id or sd.id

        wallet_stmt = select(SdWalletModel).where(
            SdWalletModel.super_distributor_ref_id == sd_ref_id
        )
        wallet = (await db.execute(wallet_stmt)).scalars().first()
        wallet_balance = float(wallet.balance) if wallet else float(sd.wallet_balance or 0.0)

        return {
            "super_distributor_ref_id": sd_ref_id,
            "public_id": str(sd.public_id),
            "super_distributor_code": sd.super_distributor_code,
            "business_name": sd.business_name,
            "owner_name": sd.owner_name,
            "mobile": sd.mobile,
            "email": sd.email,
            "gst_number": sd.gst_number,
            "pan_number": sd.pan_number,
            "bank_account_number": sd.bank_account_number,
            "ifsc": sd.ifsc,
            "state": sd.state,
            "city": sd.city,
            "address": sd.address,
            "pincode": sd.pincode,
            "status": sd.status,
            "is_active": sd.is_active,
            "wallet_balance": wallet_balance,
            "credit_limit": float(sd.credit_limit or 0.0),
        }
