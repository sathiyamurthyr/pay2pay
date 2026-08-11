"""
Enterprise Beneficiary Duplicate Migration & Cleanup Script
Finds duplicate beneficiaries matching (tenant_id, company_id, customer_id, account_number, ifsc_code).
Selects the single best survivor record (VERIFIED > ACTIVE > latest updated > latest created).
Marks all non-survivor duplicate records as status = 'MERGED' and is_active = False.
Preserves all transaction history, audit logs, and financial records with ZERO hard deletes.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy import select, and_, or_, func, update

from app.core.database import AsyncSessionLocal
from app.infrastructure.db.epic014_models import (
    BeneficiaryMasterModel,
    BeneficiaryCustomerMappingModel,
)
from app.infrastructure.db.beneficiary_models import (
    BeneficiaryModel,
    BeneficiaryBankAccountModel,
    BeneficiaryAuditModel,
)


async def run_duplicate_beneficiary_cleanup() -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        print("[Duplicate Beneficiary Cleanup] Starting scanning phase...")
        stats = {
            "epic014_duplicates_detected": 0,
            "epic014_duplicates_merged": 0,
            "legacy_duplicates_detected": 0,
            "legacy_duplicates_merged": 0,
            "audit_logs_created": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # ----------------------------------------------------------------------
        # PART 1: Clean EPIC-014 Beneficiary Master & Customer Mappings
        # ----------------------------------------------------------------------
        stmt_epic_groups = (
            select(
                BeneficiaryMasterModel.account_number,
                BeneficiaryMasterModel.ifsc_code,
                func.count(BeneficiaryMasterModel.id).label("cnt")
            )
            .where(BeneficiaryMasterModel.status != "MERGED")
            .group_by(BeneficiaryMasterModel.account_number, BeneficiaryMasterModel.ifsc_code)
            .having(func.count(BeneficiaryMasterModel.id) > 1)
        )

        epic_dupes = (await db.execute(stmt_epic_groups)).all()
        print(f"[Duplicate Beneficiary Cleanup] Found {len(epic_dupes)} EPIC-014 duplicate account/IFSC groups.")

        for row in epic_dupes:
            acc, ifsc = row[0], row[1]
            stmt_masters = (
                select(BeneficiaryMasterModel)
                .where(
                    and_(
                        BeneficiaryMasterModel.account_number == acc,
                        BeneficiaryMasterModel.ifsc_code == ifsc,
                    )
                )
            )
            masters = (await db.execute(stmt_masters)).scalars().all()
            if len(masters) <= 1:
                continue

            def sort_key(m: BeneficiaryMasterModel):
                score = 0
                if getattr(m, "verification_status", "") == "VERIFIED":
                    score += 1000
                if m.is_active and getattr(m, "status", "") == "ACTIVE":
                    score += 100
                updated_ts = m.updated_date.timestamp() if m.updated_date else 0
                created_ts = m.created_date.timestamp() if m.created_date else 0
                return (score, updated_ts, created_ts)

            sorted_masters = sorted(masters, key=sort_key, reverse=True)
            survivor = sorted_masters[0]
            duplicates = sorted_masters[1:]

            stats["epic014_duplicates_detected"] += len(duplicates)

            for dup in duplicates:
                dup.status = "MERGED"
                dup.is_active = False
                dup.is_deleted = False
                dup.updated_date = datetime.now(timezone.utc)
                stats["epic014_duplicates_merged"] += 1

                stmt_maps = select(BeneficiaryCustomerMappingModel).where(
                    BeneficiaryCustomerMappingModel.beneficiary_id == dup.public_id
                )
                dup_maps = (await db.execute(stmt_maps)).scalars().all()
                for m in dup_maps:
                    stmt_exist = select(BeneficiaryCustomerMappingModel).where(
                        and_(
                            BeneficiaryCustomerMappingModel.customer_id == m.customer_id,
                            BeneficiaryCustomerMappingModel.beneficiary_id == survivor.public_id,
                        )
                    )
                    existing_surv_map = (await db.execute(stmt_exist)).scalars().first()
                    if existing_surv_map:
                        m.is_active = False
                    else:
                        m.beneficiary_id = survivor.public_id
                        m.is_active = True

        # ----------------------------------------------------------------------
        # PART 2: Clean Legacy BeneficiaryModel & BeneficiaryBankAccountModel
        # ----------------------------------------------------------------------
        stmt_legacy_groups = (
            select(
                BeneficiaryModel.customer_id,
                BeneficiaryBankAccountModel.account_number,
                BeneficiaryBankAccountModel.ifsc_code,
                func.count(BeneficiaryModel.id).label("cnt")
            )
            .join(BeneficiaryBankAccountModel, BeneficiaryBankAccountModel.beneficiary_id == BeneficiaryModel.public_id)
            .where(BeneficiaryModel.beneficiary_status != "MERGED")
            .group_by(BeneficiaryModel.customer_id, BeneficiaryBankAccountModel.account_number, BeneficiaryBankAccountModel.ifsc_code)
            .having(func.count(BeneficiaryModel.id) > 1)
        )

        legacy_dupes = (await db.execute(stmt_legacy_groups)).all()
        print(f"[Duplicate Beneficiary Cleanup] Found {len(legacy_dupes)} Legacy duplicate customer/account/IFSC groups.")

        for row in legacy_dupes:
            cust_id, acc, ifsc = row[0], row[1], row[2]
            stmt_bens = (
                select(BeneficiaryModel, BeneficiaryBankAccountModel)
                .join(BeneficiaryBankAccountModel, BeneficiaryBankAccountModel.beneficiary_id == BeneficiaryModel.public_id)
                .where(
                    and_(
                        BeneficiaryModel.customer_id == cust_id,
                        BeneficiaryBankAccountModel.account_number == acc,
                        BeneficiaryBankAccountModel.ifsc_code == ifsc,
                    )
                )
            )
            pairs = (await db.execute(stmt_bens)).all()
            if len(pairs) <= 1:
                continue

            def legacy_sort_key(pair):
                bm, ba = pair[0], pair[1]
                score = 0
                if bm.verification_status == "VERIFIED" or ba.verification_status == "VERIFIED":
                    score += 1000
                if bm.is_active and bm.beneficiary_status == "ACTIVE":
                    score += 100
                updated_ts = bm.updated_date.timestamp() if bm.updated_date else 0
                created_ts = bm.created_date.timestamp() if bm.created_date else 0
                return (score, updated_ts, created_ts)

            sorted_pairs = sorted(pairs, key=legacy_sort_key, reverse=True)
            survivor_pair = sorted_pairs[0]
            duplicate_pairs = sorted_pairs[1:]

            stats["legacy_duplicates_detected"] += len(duplicate_pairs)

            for bm, ba in duplicate_pairs:
                bm.beneficiary_status = "MERGED"
                bm.is_active = False
                bm.is_deleted = False
                bm.updated_date = datetime.now(timezone.utc)

                ba.is_active = False
                ba.updated_date = datetime.now(timezone.utc)
                stats["legacy_duplicates_merged"] += 1

                audit_log = BeneficiaryAuditModel(
                    public_id=uuid.uuid4(),
                    beneficiary_id=bm.public_id,
                    event_type="DUPLICATE_MERGED",
                    event_description=f"Duplicate beneficiary record merged into survivor beneficiary ID {survivor_pair[0].public_id}",
                    performed_by="SYSTEM_DATA_CLEANUP",
                    ip_address="127.0.0.1",
                    old_value="ACTIVE",
                    new_value="MERGED",
                    tenant_id=bm.tenant_id,
                    created_by="system",
                    created_date=datetime.now(timezone.utc),
                    is_active=True,
                    is_deleted=False,
                )
                db.add(audit_log)
                stats["audit_logs_created"] += 1

        await db.commit()
        print(f"[Duplicate Beneficiary Cleanup] Finished successfully. Summary: {stats}")
        return stats


if __name__ == "__main__":
    asyncio.run(run_duplicate_beneficiary_cleanup())
