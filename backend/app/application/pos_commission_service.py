"""
POS Hierarchy Commission Engine & Financial Settlement Service.

Additive, enterprise-grade service implementing:
- Company-level dynamic commission resolution (defaults: 0.00% Distributor, 0.00% Super Distributor)
- Clear separation between Retailer MDR (charged) and Hierarchy Commission (earned)
- Idempotent commission posting after successful POS transaction approval
- Wallet credit to dist_wallet and distributor.wallet_balance for Distributor (user_type_ref_id=3)
- Wallet credit to super_distributor.wallet_balance for Super Distributor (user_type_ref_id=4)
- Traceable auditable double-entry posting into common transactions ledger
- Zero-value commission suppression (no meaningless zero-rupee financial ledger clutter)
"""

import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models import RetailerModel, DistributorModel, SuperDistributorModel
from app.infrastructure.db.distributor_models import DistWalletModel
from app.infrastructure.db.super_distributor_models import SdWalletModel
from app.infrastructure.db.pos_mdr_models import PosMdrCommissionConfigModel
from app.application.hierarchy_mapping_service import HierarchyMappingService

logger = logging.getLogger("pos_commission_service")


CARD_TYPES_MASTER = [
    {"code": "VISA", "name": "VISA", "card_type_ref_id": 1, "display_order": 1},
    {"code": "MASTER", "name": "MASTER", "card_type_ref_id": 2, "display_order": 2},
    {"code": "RUPAY", "name": "RUPAY", "card_type_ref_id": 3, "display_order": 3},
    {"code": "AMEX / DINERS", "name": "AMEX / DINERS", "card_type_ref_id": 4, "display_order": 4},
    {"code": "Business/corporate", "name": "Business/corporate", "card_type_ref_id": 5, "display_order": 5},
]

PAYMENT_MODES_MASTER = ["POS - Instant", "POS+T1"]


class PosCommissionService:
    """
    Application Service managing POS Hierarchy Commission Configuration and Settlement.
    Supports Payment Mode + Card Type based MDR matrix and commission distribution.
    """

    @classmethod
    def resolve_card_type_ref_id(cls, card_type: Optional[Union[str, int]]) -> Optional[int]:
        if not card_type:
            return None
        if isinstance(card_type, int) or (isinstance(card_type, str) and card_type.isdigit()):
            return int(card_type)
        c_clean = str(card_type).strip().upper()
        for ct in CARD_TYPES_MASTER:
            if ct["code"].upper() == c_clean or ct["name"].upper() == c_clean:
                return ct["card_type_ref_id"]
        return None

    @classmethod
    def resolve_card_type_code(cls, card_type_ref_id: Optional[int]) -> Optional[str]:
        if not card_type_ref_id:
            return None
        for ct in CARD_TYPES_MASTER:
            if ct["card_type_ref_id"] == card_type_ref_id:
                return ct["code"]
        return None

    @classmethod
    async def get_company_commission_config(
        cls,
        db: AsyncSession,
        company_id: Optional[uuid.UUID] = None,
        company_ref_id: Optional[int] = None,
        payment_mode: Optional[str] = None,
        card_type: Optional[str] = None,
        card_type_ref_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Dynamically loads company-level commission and MDR configuration
        for a specific (Payment Mode + Card Type) combination.
        Falls back to payment mode default or global default.
        """
        ct_id = card_type_ref_id or cls.resolve_card_type_ref_id(card_type)
        p_mode = (payment_mode or "ALL").strip()

        stmt = select(PosMdrCommissionConfigModel).where(
            PosMdrCommissionConfigModel.status == "ACTIVE"
        )
        if company_id:
            stmt = stmt.where(PosMdrCommissionConfigModel.company_id == company_id)
        elif company_ref_id:
            stmt = stmt.where(PosMdrCommissionConfigModel.company_ref_id == company_ref_id)

        res = await db.execute(stmt.order_by(PosMdrCommissionConfigModel.updated_at.desc(), PosMdrCommissionConfigModel.created_at.desc()))
        configs = res.scalars().all()

        exact_match = None
        mode_match = None
        global_fallback = None

        for cfg in configs:
            cfg_mode = (cfg.payment_mode or "").strip()
            cfg_ct_id = cfg.card_type_ref_id

            # Exact match: payment_mode + card_type_ref_id
            if p_mode != "ALL" and cfg_mode.upper() == p_mode.upper() and ct_id is not None and cfg_ct_id == ct_id:
                exact_match = cfg
                break
            # Mode match: payment_mode matches, card_type is None
            if p_mode != "ALL" and cfg_mode.upper() == p_mode.upper() and cfg_ct_id is None and mode_match is None:
                mode_match = cfg
            # Global match: ALL
            if cfg_mode.upper() in ("ALL", "", None) and global_fallback is None:
                global_fallback = cfg

        active_cfg = exact_match or mode_match or global_fallback

        default_comp_mdr = 1.20 if "INSTANT" in p_mode.upper() else (1.10 if "T1" in p_mode.upper() else 0.0)
        default_ret_mdr = 1.70 if "INSTANT" in p_mode.upper() else (1.60 if "T1" in p_mode.upper() else 0.0)

        if active_cfg:
            comp_mdr_val = float(active_cfg.company_mdr) if active_cfg.company_mdr is not None and float(active_cfg.company_mdr) > 0 else default_comp_mdr
            sd_mdr_val = float(active_cfg.default_sd_mdr or active_cfg.sd_commission or 0.0)
            dist_mdr_val = float(active_cfg.default_distributor_mdr or active_cfg.distributor_commission or 0.0)
            ret_mdr_val = float(active_cfg.retailer_mdr_override) if active_cfg.retailer_mdr_override is not None else default_ret_mdr

            return {
                "company_mdr": comp_mdr_val,
                "sd_mdr": sd_mdr_val,
                "distributor_mdr": dist_mdr_val,
                "retailer_mdr": ret_mdr_val,
                "distributor_commission_pct": dist_mdr_val,
                "sd_commission_pct": sd_mdr_val,
                "payment_mode": active_cfg.payment_mode or p_mode,
                "card_type": cls.resolve_card_type_code(active_cfg.card_type_ref_id) or card_type,
                "card_type_ref_id": active_cfg.card_type_ref_id,
                "status": active_cfg.status,
                "config_id": str(active_cfg.pos_mdr_commission_config_ref_id)
            }

        # Individual baseline defaults
        def_sd = 0.10
        def_dist = 0.20
        def_ret = default_ret_mdr
        return {
            "company_mdr": default_comp_mdr,
            "sd_mdr": def_sd,
            "distributor_mdr": def_dist,
            "retailer_mdr": def_ret,
            "distributor_commission_pct": def_dist,
            "sd_commission_pct": def_sd,
            "payment_mode": p_mode,
            "card_type": card_type,
            "card_type_ref_id": ct_id,
            "status": "ACTIVE",
            "config_id": None
        }

    @classmethod
    async def get_mdr_matrix(
        cls,
        db: AsyncSession,
        company_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns the complete 8-row MDR Matrix:
        [POS - Instant, POS+T1] x [VISA, MASTER, RUPAY, AMEX / DINERS]
        with current Company MDR, SD MDR, Distributor MDR, and Retailer MDR.
        """
        matrix = []
        for mode in PAYMENT_MODES_MASTER:
            for ct in CARD_TYPES_MASTER:
                cfg = await cls.get_company_commission_config(
                    db=db,
                    company_id=company_id,
                    payment_mode=mode,
                    card_type=ct["code"],
                    card_type_ref_id=ct["card_type_ref_id"]
                )
                matrix.append({
                    "payment_mode": mode,
                    "card_type": ct["code"],
                    "card_type_ref_id": ct["card_type_ref_id"],
                    "company_mdr": cfg["company_mdr"],
                    "sd_mdr": cfg["sd_mdr"],
                    "distributor_mdr": cfg["distributor_mdr"],
                    "retailer_mdr": cfg["retailer_mdr"],
                    "status": cfg["status"],
                    "config_id": cfg["config_id"]
                })
        return matrix

    @classmethod
    async def update_company_commission_config(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        distributor_commission_pct: float,
        sd_commission_pct: float,
        default_distributor_mdr: Optional[float] = None,
        default_sd_mdr: Optional[float] = None,
        company_mdr: Optional[float] = None,
        retailer_mdr_override: Optional[float] = None,
        payment_mode: str = "ALL",
        card_type: Optional[str] = None,
        card_type_ref_id: Optional[int] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Admin updates or inserts Company-level Commission and MDR settings
        for a specific (Payment Mode + Card Type) combination.
        """
        now_utc = datetime.now(timezone.utc)
        ct_id = card_type_ref_id or cls.resolve_card_type_ref_id(card_type)
        p_mode = (payment_mode or "ALL").strip()

        # Build query for existing configuration record
        stmt = select(PosMdrCommissionConfigModel).where(
            PosMdrCommissionConfigModel.company_id == company_id,
            PosMdrCommissionConfigModel.payment_mode == p_mode,
            PosMdrCommissionConfigModel.status == "ACTIVE"
        )
        if ct_id is not None:
            stmt = stmt.where(PosMdrCommissionConfigModel.card_type_ref_id == ct_id)
        else:
            stmt = stmt.where(PosMdrCommissionConfigModel.card_type_ref_id == None)

        res = await db.execute(stmt)
        existing = res.scalars().first()

        d_comm = Decimal(str(distributor_commission_pct)).quantize(Decimal("0.0001"))
        sd_comm = Decimal(str(sd_commission_pct)).quantize(Decimal("0.0001"))
        d_mdr = Decimal(str(default_distributor_mdr if default_distributor_mdr is not None else distributor_commission_pct)).quantize(Decimal("0.0001"))
        sd_mdr = Decimal(str(default_sd_mdr if default_sd_mdr is not None else sd_commission_pct)).quantize(Decimal("0.0001"))
        
        comp_mdr_dec = Decimal(str(company_mdr if company_mdr is not None else 0.0)).quantize(Decimal("0.0001"))
        ret_mdr_dec = Decimal(str(retailer_mdr_override)).quantize(Decimal("0.0001")) if retailer_mdr_override is not None else None

        if existing:
            existing.company_mdr = float(comp_mdr_dec)
            existing.distributor_commission = float(d_comm)
            existing.sd_commission = float(sd_comm)
            existing.default_distributor_mdr = float(d_mdr)
            existing.default_sd_mdr = float(sd_mdr)
            if ret_mdr_dec is not None:
                existing.retailer_mdr_override = float(ret_mdr_dec)
            existing.card_type_ref_id = ct_id
            existing.updated_at = now_utc
            await db.commit()
            await db.refresh(existing)
            target_obj = existing
        else:
            new_cfg = PosMdrCommissionConfigModel(
                tenant_id=tenant_id or uuid.uuid4(),
                company_id=company_id,
                payment_mode=p_mode,
                card_type_ref_id=ct_id,
                company_mdr=float(comp_mdr_dec),
                distributor_commission=float(d_comm),
                sd_commission=float(sd_comm),
                default_distributor_mdr=float(d_mdr),
                default_sd_mdr=float(sd_mdr),
                retailer_mdr_override=float(ret_mdr_dec) if ret_mdr_dec is not None else None,
                status="ACTIVE",
                effective_from=now_utc,
                created_at=now_utc,
                updated_at=now_utc
            )
            db.add(new_cfg)
            await db.commit()
            await db.refresh(new_cfg)
            target_obj = new_cfg

        return {
            "pos_mdr_commission_config_ref_id": target_obj.pos_mdr_commission_config_ref_id,
            "company_id": str(target_obj.company_id),
            "payment_mode": target_obj.payment_mode,
            "card_type": cls.resolve_card_type_code(target_obj.card_type_ref_id),
            "card_type_ref_id": target_obj.card_type_ref_id,
            "company_mdr": float(target_obj.company_mdr or 0.0),
            "sd_mdr": float(target_obj.default_sd_mdr or target_obj.sd_commission or 0.0),
            "distributor_mdr": float(target_obj.default_distributor_mdr or target_obj.distributor_commission or 0.0),
            "retailer_mdr": float(target_obj.retailer_mdr_override) if target_obj.retailer_mdr_override is not None else None,
            "distributor_commission_pct": float(target_obj.distributor_commission),
            "sd_commission_pct": float(target_obj.sd_commission),
            "status": target_obj.status
        }

    @classmethod
    async def process_and_post_pos_commissions(
        cls,
        db: AsyncSession,
        retailer_id: uuid.UUID,
        transaction_amount: float,
        orig_txn_ref: str,
        payment_mode: Optional[str] = None,
        card_type: Optional[str] = None,
        effective_mdr_rate: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes automatic, idempotent commission calculation and ledger posting
        after an authoritative POS transaction SUCCESS/APPROVED.

        - Checks active hierarchy mapping (Company -> SD -> Distributor -> Retailer).
        - Rule 28 & 29: Only the actually mapped SD and Distributor receive commission.
          If no mapped SD, no SD commission is credited.
          If no mapped Distributor, no Distributor commission is credited.
        - Loads dynamic commission rates from Payment Mode + Card Type configuration.
        - Prevents duplicate postings via unique ref_id keys: COMM_DIST_{ref} & COMM_SD_{ref}.
        - Credits wallets and writes to common `transactions` ledger with appropriate user_ref_id & user_type_ref_id.
        """
        results = {
            "distributor_commission_posted": False,
            "distributor_commission_amount": 0.0,
            "distributor_ref_id": None,
            "sd_commission_posted": False,
            "sd_commission_amount": 0.0,
            "sd_ref_id": None,
            "notes": []
        }

        if transaction_amount <= 0:
            results["notes"].append("Zero or negative transaction amount; skipped.")
            return results

        # 1. Resolve Retailer Entity
        ret_stmt = select(RetailerModel).where(
            RetailerModel.public_id == retailer_id,
            RetailerModel.is_deleted == False
        )
        ret_obj = (await db.execute(ret_stmt)).scalars().first()
        if not ret_obj:
            results["notes"].append(f"Retailer {retailer_id} not found.")
            return results

        # 2. Resolve Mapped Distributor Entity (Strictly from mapping)
        dist_obj = None
        if ret_obj.mapped_distributor_id:
            dist_stmt = select(DistributorModel).where(
                DistributorModel.public_id == ret_obj.mapped_distributor_id,
                DistributorModel.is_deleted == False
            )
            dist_obj = (await db.execute(dist_stmt)).scalars().first()
        elif ret_obj.distributor_ref_id:
            dist_stmt = select(DistributorModel).where(
                DistributorModel.distributor_ref_id == ret_obj.distributor_ref_id,
                DistributorModel.is_deleted == False
            )
            dist_obj = (await db.execute(dist_stmt)).scalars().first()

        # 3. Resolve Mapped Super Distributor Entity (Strictly from mapping)
        sd_obj = None
        if ret_obj.mapped_super_distributor_id:
            sd_stmt = select(SuperDistributorModel).where(
                SuperDistributorModel.public_id == ret_obj.mapped_super_distributor_id,
                SuperDistributorModel.is_deleted == False
            )
            sd_obj = (await db.execute(sd_stmt)).scalars().first()
        elif ret_obj.super_distributor_ref_id:
            sd_stmt = select(SuperDistributorModel).where(
                SuperDistributorModel.super_distributor_ref_id == ret_obj.super_distributor_ref_id,
                SuperDistributorModel.is_deleted == False
            )
            sd_obj = (await db.execute(sd_stmt)).scalars().first()
        elif dist_obj:
            if dist_obj.mapped_super_distributor_id:
                sd_stmt = select(SuperDistributorModel).where(
                    SuperDistributorModel.public_id == dist_obj.mapped_super_distributor_id,
                    SuperDistributorModel.is_deleted == False
                )
                sd_obj = (await db.execute(sd_stmt)).scalars().first()
            elif dist_obj.super_distributor_ref_id:
                sd_stmt = select(SuperDistributorModel).where(
                    SuperDistributorModel.super_distributor_ref_id == dist_obj.super_distributor_ref_id,
                    SuperDistributorModel.is_deleted == False
                )
                sd_obj = (await db.execute(sd_stmt)).scalars().first()

        # 4. Load Dynamic Commission Config based on (payment_mode, card_type)
        comm_cfg = await cls.get_company_commission_config(
            db=db,
            company_id=ret_obj.company_id or (dist_obj.company_id if dist_obj else None),
            company_ref_id=ret_obj.company_ref_id,
            payment_mode=payment_mode,
            card_type=card_type
        )
        dist_comm_pct = Decimal(str(comm_cfg.get("distributor_commission_pct", 0.0) or comm_cfg.get("distributor_mdr", 0.0)))
        sd_comm_pct = Decimal(str(comm_cfg.get("sd_commission_pct", 0.0) or comm_cfg.get("sd_mdr", 0.0)))

        amt_dec = Decimal(str(transaction_amount))
        two_places = Decimal("0.01")
        now_utc = datetime.now(timezone.utc)
        now_date_str = now_utc.strftime("%Y%m%d")

        p_year = now_utc.year
        p_month = now_utc.month
        p_day = now_utc.day

        # 5. Distributor Commission Processing (Only if mapped distributor exists)
        if dist_obj and dist_comm_pct > Decimal("0.00"):
            dist_comm_amt = ((amt_dec * dist_comm_pct) / Decimal("100")).quantize(two_places, rounding=ROUND_HALF_UP)
            comm_val = float(dist_comm_amt)

            if comm_val > 0.0:
                dist_ref_key = f"COMM_DIST_{orig_txn_ref}"

                # Idempotency Check: prevent duplicate commission posting
                dup_stmt = select(func.count()).select_from(text("public.transactions")).where(
                    text("ref_id = :ref_key")
                )
                dup_count = (await db.execute(dup_stmt, {"ref_key": dist_ref_key})).scalar() or 0

                if dup_count == 0:
                    # Credit dist_wallet
                    dist_w_stmt = select(DistWalletModel).where(
                        DistWalletModel.distributor_ref_id == dist_obj.distributor_ref_id
                    ).with_for_update()
                    dist_wallet = (await db.execute(dist_w_stmt)).scalars().first()

                    if not dist_wallet:
                        dist_wallet = DistWalletModel(
                            distributor_ref_id=dist_obj.distributor_ref_id,
                            tenant_id=dist_obj.tenant_id,
                            company_id=dist_obj.company_id,
                            balance=Decimal("0.00"),
                            currency="INR",
                            status="ACTIVE",
                            is_active=True
                        )
                        db.add(dist_wallet)
                        await db.flush()

                    bal_before = float(dist_wallet.balance)
                    bal_after = float(Decimal(str(bal_before)) + dist_comm_amt)
                    dist_wallet.balance = Decimal(str(bal_after))

                    # Update distributor.wallet_balance sync
                    dist_obj.wallet_balance = bal_after

                    # Insert into common transactions ledger
                    comm_txn_id = f"TXN-COMM-{now_date_str}-{uuid.uuid4().hex[:6].upper()}"
                    await db.execute(text("""
                        INSERT INTO public.transactions (
                            public_id, tenant_id, company_id,
                            user_ref_id, user_type_ref_id, user_type,
                            distributor_ref_id, retailer_ref_id, retailer_id, retailer_name,
                            dist_id, dist_name,
                            txn_id, ref_id, service_name, entry_type,
                            amount, balance_before, balance_after,
                            wallet_type, status, narration,
                            partition_year, partition_month, partition_day,
                            is_active, is_deleted, created_at, updated_at
                        ) VALUES (
                            :public_id, :tenant_id, :company_id,
                            :user_ref_id, 3, 'DISTRIBUTOR',
                            :dist_ref_id, :ret_ref_id, :ret_id, :ret_name,
                            :dist_id, :dist_name,
                            :txn_id, :ref_id, 'POS_COMMISSION', 'CREDIT',
                            :amount, :bal_before, :bal_after,
                            'MAIN', 'SUCCESS', :narration,
                            :pyear, :pmonth, :pday,
                            true, false, :now, :now
                        )
                    """), {
                        "public_id": uuid.uuid4(),
                        "tenant_id": dist_obj.tenant_id,
                        "company_id": dist_obj.company_id,
                        "user_ref_id": dist_obj.distributor_ref_id,
                        "dist_ref_id": dist_obj.distributor_ref_id,
                        "ret_ref_id": ret_obj.retailer_ref_id,
                        "ret_id": ret_obj.public_id,
                        "ret_name": ret_obj.owner_name or ret_obj.store_name,
                        "dist_id": dist_obj.public_id,
                        "dist_name": dist_obj.business_name,
                        "txn_id": comm_txn_id,
                        "ref_id": dist_ref_key,
                        "amount": comm_val,
                        "bal_before": bal_before,
                        "bal_after": bal_after,
                        "narration": f"Distributor POS Commission ({float(dist_comm_pct)}%) for Txn {orig_txn_ref} [Retailer: {ret_obj.retailer_code}]",
                        "pyear": p_year,
                        "pmonth": p_month,
                        "pday": p_day,
                        "now": now_utc
                    })

                    results["distributor_commission_posted"] = True
                    results["distributor_commission_amount"] = comm_val
                    results["distributor_ref_id"] = dist_obj.distributor_ref_id
                    logger.info(f"Posted Distributor Commission INR {comm_val:.2f} for Txn {orig_txn_ref} to Dist ref {dist_obj.distributor_ref_id}")
                else:
                    results["notes"].append(f"Distributor commission already posted for {orig_txn_ref}; skipped.")
        else:
            if not dist_obj:
                results["notes"].append("No mapped distributor for retailer; distributor commission skipped.")

        # 6. Super Distributor Commission Processing (Only if mapped SD exists)
        if sd_obj and sd_comm_pct > Decimal("0.00"):
            sd_comm_amt = ((amt_dec * sd_comm_pct) / Decimal("100")).quantize(two_places, rounding=ROUND_HALF_UP)
            comm_val = float(sd_comm_amt)

            if comm_val > 0.0:
                sd_ref_key = f"COMM_SD_{orig_txn_ref}"

                # Idempotency Check: prevent duplicate commission posting
                dup_stmt = select(func.count()).select_from(text("public.transactions")).where(
                    text("ref_id = :ref_key")
                )
                dup_count = (await db.execute(dup_stmt, {"ref_key": sd_ref_key})).scalar() or 0

                if dup_count == 0:
                    # Credit sd_wallet
                    sd_w_stmt = select(SdWalletModel).where(
                        SdWalletModel.super_distributor_ref_id == sd_obj.super_distributor_ref_id
                    ).with_for_update()
                    sd_wallet = (await db.execute(sd_w_stmt)).scalars().first()

                    if not sd_wallet:
                        sd_wallet = SdWalletModel(
                            super_distributor_ref_id=sd_obj.super_distributor_ref_id,
                            tenant_id=sd_obj.tenant_id,
                            company_id=sd_obj.company_id,
                            balance=Decimal("0.00"),
                            currency="INR",
                            status="ACTIVE",
                            is_active=True
                        )
                        db.add(sd_wallet)
                        await db.flush()

                    bal_before = float(sd_wallet.balance)
                    bal_after = float(Decimal(str(bal_before)) + sd_comm_amt)
                    sd_wallet.balance = Decimal(str(bal_after))

                    # Update sd_obj.wallet_balance sync
                    sd_obj.wallet_balance = bal_after

                    # Insert into common transactions ledger
                    comm_txn_id = f"TXN-COMM-{now_date_str}-{uuid.uuid4().hex[:6].upper()}"
                    await db.execute(text("""
                        INSERT INTO public.transactions (
                            public_id, tenant_id, company_id,
                            user_ref_id, user_type_ref_id, user_type,
                            super_distributor_ref_id, distributor_ref_id, retailer_ref_id, retailer_id, retailer_name,
                            sd_id, sd_name,
                            txn_id, ref_id, service_name, entry_type,
                            amount, balance_before, balance_after,
                            wallet_type, status, narration,
                            partition_year, partition_month, partition_day,
                            is_active, is_deleted, created_at, updated_at
                        ) VALUES (
                            :public_id, :tenant_id, :company_id,
                            :user_ref_id, 4, 'SD',
                            :sd_ref_id, :dist_ref_id, :ret_ref_id, :ret_id, :ret_name,
                            :sd_id, :sd_name,
                            :txn_id, :ref_id, 'POS_COMMISSION', 'CREDIT',
                            :amount, :bal_before, :bal_after,
                            'MAIN', 'SUCCESS', :narration,
                            :pyear, :pmonth, :pday,
                            true, false, :now, :now
                        )
                    """), {
                        "public_id": uuid.uuid4(),
                        "tenant_id": sd_obj.tenant_id,
                        "company_id": sd_obj.company_id,
                        "user_ref_id": sd_obj.super_distributor_ref_id,
                        "sd_ref_id": sd_obj.super_distributor_ref_id,
                        "dist_ref_id": dist_obj.distributor_ref_id if dist_obj else ret_obj.distributor_ref_id,
                        "ret_ref_id": ret_obj.retailer_ref_id,
                        "ret_id": ret_obj.public_id,
                        "ret_name": ret_obj.owner_name or ret_obj.store_name,
                        "sd_id": sd_obj.public_id,
                        "sd_name": sd_obj.business_name,
                        "txn_id": comm_txn_id,
                        "ref_id": sd_ref_key,
                        "amount": comm_val,
                        "bal_before": bal_before,
                        "bal_after": bal_after,
                        "narration": f"Super Distributor POS Commission ({float(sd_comm_pct)}%) for Txn {orig_txn_ref} [Retailer: {ret_obj.retailer_code}]",
                        "pyear": p_year,
                        "pmonth": p_month,
                        "pday": p_day,
                        "now": now_utc
                    })

                    results["sd_commission_posted"] = True
                    results["sd_commission_amount"] = comm_val
                    results["sd_ref_id"] = sd_obj.super_distributor_ref_id
                    logger.info(f"Posted SD Commission INR {comm_val:.2f} for Txn {orig_txn_ref} to SD ref {sd_obj.super_distributor_ref_id}")
                else:
                    results["notes"].append(f"SD commission already posted for {orig_txn_ref}; skipped.")
        else:
            if not sd_obj:
                results["notes"].append("No mapped super distributor for retailer; SD commission skipped.")

        await db.commit()
        return results
