"""
Wallet Ledger & Financial Reconciliation Audit Service
Authoritative, Read-Only Financial Ledger & Audit Engine for Pay2Pay Platform

Capabilities:
1. Reconciles business transactions against double-entry wallet ledgers and gateway reconciliation tables.
2. Identifies:
   - Amount discrepancies (Transaction Amount != Ledger Posted Amount)
   - Missing wallet ledger entries (Successful transaction without wallet ledger record)
   - Duplicate wallet ledger entries
   - Balance progression mismatches (Opening Balance + CR - DR != Closing Balance)
   - Entry type mismatches (Txn is Credit but Ledger is Debit, or vice-versa)
   - Gateway/Vendor reconciliation exceptions (from txn_reconciliation_result)
3. Dynamic hierarchy resolution: Company -> Super Distributor -> Distributor -> Retailer
4. Dynamic UserType and cascading user entity lists
5. P&L separation: Ledger Movement (CR, DR, Net Movement) vs Earnings (MDR Income, Commission Expense)
6. Server-side pagination, sorting, search, filtering, and streaming CSV export
"""

import math
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))


def round_curr(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0


class WalletLedgerAuditService:

    @staticmethod
    async def get_user_types(db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Dynamically loads user types from public.user_type table without hardcoded IDs.
        """
        sql = """
        SELECT 
            user_type_ref_id,
            user_type_code,
            user_type_name,
            code,
            name,
            description
        FROM public.user_type
        WHERE is_deleted IS NOT TRUE AND is_active IS NOT FALSE
        ORDER BY user_type_ref_id ASC;
        """
        res = await db.execute(text(sql))
        rows = res.fetchall()
        return [
            {
                "user_type_ref_id": r[0],
                "user_type_code": r[1] or r[3] or "",
                "user_type_name": r[2] or r[4] or "",
                "code": r[3] or r[1] or "",
                "name": r[4] or r[2] or "",
                "description": r[5] or ""
            }
            for r in rows
        ]

    @staticmethod
    async def get_entities_by_user_type(
        db: AsyncSession,
        user_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Dynamically returns list of entities (SDs, Distributors, Retailers)
        filtered by user type for cascading dropdowns.
        """
        ut = (user_type or "ALL").upper().strip()
        entities: List[Dict[str, Any]] = []

        if ut in ("ALL", "SD", "SUPER_DISTRIBUTOR", "SUPER DISTRIBUTOR"):
            sql_sd = """
            WITH ranked_sd AS (
                SELECT 
                    sd.super_distributor_ref_id AS id,
                    sd.super_distributor_code AS code,
                    COALESCE(sd.business_name, sd.owner_name, 'Super Distributor') AS name,
                    sd.owner_name,
                    sd.mobile,
                    'SUPER_DISTRIBUTOR' AS user_type,
                    4 AS user_type_ref_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY LOWER(TRIM(COALESCE(sd.business_name, sd.owner_name, 'Super Distributor')))
                        ORDER BY sd.created_date DESC
                    ) as rn
                FROM public.super_distributor sd
                WHERE sd.is_deleted IS NOT TRUE AND (sd.is_active IS NULL OR sd.is_active IS TRUE)
            )
            SELECT id, code, name, owner_name, mobile, user_type, user_type_ref_id
            FROM ranked_sd
            WHERE rn = 1
            ORDER BY name ASC;
            """
            res = await db.execute(text(sql_sd))
            for r in res.fetchall():
                entities.append({
                    "id": r[0],
                    "code": r[1] or f"SD-{r[0]}",
                    "name": r[2] or r[3] or "Super Distributor",
                    "owner_name": r[3] or "",
                    "mobile": r[4] or "",
                    "user_type": "SUPER_DISTRIBUTOR",
                    "user_type_name": "Super Distributor",
                    "user_type_ref_id": 4
                })

        if ut in ("ALL", "DISTRIBUTOR", "DIST"):
            sql_dist = """
            SELECT 
                distributor_ref_id AS id,
                distributor_code AS code,
                business_name AS name,
                owner_name,
                mobile,
                'DISTRIBUTOR' AS user_type,
                3 AS user_type_ref_id
            FROM public.distributor
            WHERE is_deleted IS NOT TRUE AND (is_active IS NULL OR is_active IS TRUE)
            ORDER BY business_name ASC;
            """
            res = await db.execute(text(sql_dist))
            for r in res.fetchall():
                entities.append({
                    "id": r[0],
                    "code": r[1] or f"DIST-{r[0]}",
                    "name": r[2] or r[3] or "Distributor",
                    "owner_name": r[3] or "",
                    "mobile": r[4] or "",
                    "user_type": "DISTRIBUTOR",
                    "user_type_name": "Distributor",
                    "user_type_ref_id": 3
                })

        if ut in ("ALL", "RETAILER", "RET"):
            sql_ret = """
            WITH ranked_ret AS (
                SELECT 
                    r.retailer_ref_id AS id,
                    r.retailer_code AS code,
                    COALESCE(r.store_name, r.legal_name, r.owner_name, 'Retailer') AS name,
                    r.owner_name,
                    rc.mobile,
                    'RETAILER' AS user_type,
                    2 AS user_type_ref_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY LOWER(TRIM(COALESCE(r.store_name, r.legal_name, r.owner_name, 'Retailer')))
                        ORDER BY 
                            CASE WHEN r.status = 'ACTIVE' THEN 1 ELSE 2 END,
                            COALESCE(tx.tx_count, 0) DESC,
                            r.created_date DESC
                    ) as rn
                FROM public.retailer r
                LEFT JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id
                LEFT JOIN (
                    SELECT user_ref_id, count(*) as tx_count 
                    FROM public.transactions 
                    WHERE user_type_ref_id = 2 
                    GROUP BY user_ref_id
                ) tx ON tx.user_ref_id = r.retailer_ref_id
                WHERE r.is_deleted IS NOT TRUE 
                  AND (r.is_active IS NULL OR r.is_active IS TRUE)
                  AND (r.status IS NULL OR r.status != 'REJECTED')
            )
            SELECT id, code, name, owner_name, mobile, user_type, user_type_ref_id
            FROM ranked_ret
            WHERE rn = 1
            ORDER BY name ASC;
            """
            res = await db.execute(text(sql_ret))
            for r in res.fetchall():
                entities.append({
                    "id": r[0],
                    "code": r[1] or f"RET-{r[0]}",
                    "name": r[2] or "Retailer",
                    "owner_name": r[3] or "",
                    "mobile": r[4] or "",
                    "user_type": "RETAILER",
                    "user_type_name": "Retailer",
                    "user_type_ref_id": 2
                })

        return entities

    @staticmethod
    def _build_audit_where_clause(
        from_date: Optional[str],
        to_date: Optional[str],
        user_type: Optional[str],
        user_ref_id: Optional[int],
        service: Optional[str],
        entry_type: Optional[str],
        status: Optional[str],
        search: Optional[str],
        tenant_ref_id: int = 1,
        company_ref_id: Optional[int] = None
    ) -> Tuple[List[str], Dict[str, Any]]:
        where_clauses = [
            "COALESCE(t.tenant_ref_id, r.tenant_ref_id, 1) = :tenant_ref_id",
            "(t.is_deleted IS NULL OR t.is_deleted = FALSE)",
            "(t.is_active IS NULL OR t.is_active = TRUE)"
        ]
        params: Dict[str, Any] = {"tenant_ref_id": tenant_ref_id}

        if company_ref_id is not None:
            where_clauses.append("COALESCE(t.company_ref_id, r.company_ref_id, 1) = :company_ref_id")
            params["company_ref_id"] = company_ref_id

        # Date Filtering (IST bounds)
        if from_date and from_date.strip().upper() not in ("ALL", "NONE", "NULL", "UNDEFINED"):
            try:
                start_dt = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(
                    hour=0, minute=0, second=0, microsecond=0, tzinfo=IST
                ).astimezone(timezone.utc)
                where_clauses.append("t.created_at >= :start_dt")
                params["start_dt"] = start_dt
            except ValueError:
                pass

        if to_date and to_date.strip().upper() not in ("ALL", "NONE", "NULL", "UNDEFINED"):
            try:
                end_dt = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST
                ).astimezone(timezone.utc)
                where_clauses.append("t.created_at <= :end_dt")
                params["end_dt"] = end_dt
            except ValueError:
                pass

        # User Type Filtering
        if user_type and user_type.strip().upper() not in ("ALL", "NONE", ""):
            ut_clean = user_type.strip().upper()
            if ut_clean in ("SUPER_DISTRIBUTOR", "SUPER DISTRIBUTOR", "SD"):
                where_clauses.append("(t.user_type_ref_id = 4 OR UPPER(COALESCE(t.user_type, '')) IN ('SD', 'SUPER_DISTRIBUTOR'))")
            elif ut_clean in ("DISTRIBUTOR", "DIST"):
                where_clauses.append("(t.user_type_ref_id = 3 OR UPPER(COALESCE(t.user_type, '')) IN ('DISTRIBUTOR', 'DIST'))")
            elif ut_clean in ("RETAILER", "RET"):
                where_clauses.append("(t.user_type_ref_id = 2 OR UPPER(COALESCE(t.user_type, '')) IN ('RETAILER', 'RET'))")
            elif ut_clean in ("ADMIN", "SUPER_ADMIN"):
                where_clauses.append("(t.user_type_ref_id = 1 OR UPPER(COALESCE(t.user_type, '')) IN ('ADMIN', 'SUPER_ADMIN'))")

        # Specific User Scoping
        if user_ref_id is not None and user_ref_id > 0:
            ut_clean = (user_type or "").strip().upper()
            if ut_clean in ("SUPER_DISTRIBUTOR", "SUPER DISTRIBUTOR", "SD"):
                where_clauses.append("""(
                    (t.user_type_ref_id = 4 AND (t.user_ref_id = :user_ref_id OR sd.super_distributor_ref_id = :user_ref_id OR sd.id = :user_ref_id))
                    OR sd.super_distributor_ref_id = :user_ref_id
                    OR sd.id = :user_ref_id
                    OR r.super_distributor_ref_id = :user_ref_id
                )""")
            elif ut_clean in ("DISTRIBUTOR", "DIST"):
                where_clauses.append("""(
                    (t.user_type_ref_id = 3 AND (t.user_ref_id = :user_ref_id OR d.distributor_ref_id = :user_ref_id OR d.id = :user_ref_id))
                    OR d.distributor_ref_id = :user_ref_id
                    OR d.id = :user_ref_id
                    OR r.distributor_ref_id = :user_ref_id
                )""")
            elif ut_clean in ("RETAILER", "RET"):
                where_clauses.append("""(
                    (t.user_type_ref_id = 2 AND (t.user_ref_id = :user_ref_id OR r.retailer_ref_id = :user_ref_id OR r.id = :user_ref_id))
                    OR r.retailer_ref_id = :user_ref_id
                    OR r.id = :user_ref_id
                )""")
            else:
                where_clauses.append("""(
                    (t.user_type_ref_id = 2 AND (t.user_ref_id = :user_ref_id OR r.retailer_ref_id = :user_ref_id OR r.id = :user_ref_id))
                    OR (t.user_type_ref_id = 3 AND (t.user_ref_id = :user_ref_id OR d.distributor_ref_id = :user_ref_id OR d.id = :user_ref_id))
                    OR (t.user_type_ref_id = 4 AND (t.user_ref_id = :user_ref_id OR sd.super_distributor_ref_id = :user_ref_id OR sd.id = :user_ref_id))
                    OR t.user_ref_id = :user_ref_id
                    OR r.retailer_ref_id = :user_ref_id
                    OR d.distributor_ref_id = :user_ref_id
                    OR d.id = :user_ref_id
                    OR sd.super_distributor_ref_id = :user_ref_id
                    OR sd.id = :user_ref_id
                )""")
            params["user_ref_id"] = user_ref_id

        # Service Filter
        if service and service.strip().upper() not in ("ALL", "NONE", ""):
            where_clauses.append("UPPER(t.service_name) = :service_val")
            params["service_val"] = service.strip().upper()

        # Entry Type Filter (Credit / Debit)
        if entry_type and entry_type.strip().upper() not in ("ALL", "NONE", ""):
            et_clean = entry_type.strip().upper()
            if et_clean in ("CR", "CREDIT"):
                where_clauses.append("UPPER(t.entry_type) IN ('CREDIT', 'CR')")
            elif et_clean in ("DR", "DEBIT"):
                where_clauses.append("UPPER(t.entry_type) IN ('DEBIT', 'DR')")

        # Transaction Status Filter
        if status and status.strip().upper() not in ("ALL", "NONE", ""):
            where_clauses.append("UPPER(t.status) = :status_val")
            params["status_val"] = status.strip().upper()

        # Global Search
        if search and search.strip():
            s_val = f"%{search.strip()}%"
            where_clauses.append("""(
                t.txn_id ILIKE :s_val OR
                t.ref_id ILIKE :s_val OR
                t.service_name ILIKE :s_val OR
                t.narration ILIKE :s_val OR
                t.retailer_name ILIKE :s_val OR
                r.store_name ILIKE :s_val OR
                r.retailer_code ILIKE :s_val OR
                d.business_name ILIKE :s_val OR
                d.distributor_code ILIKE :s_val OR
                sd.business_name ILIKE :s_val OR
                sd.super_distributor_code ILIKE :s_val OR
                c.company_name ILIKE :s_val OR
                wl.all_ledger_ids ILIKE :s_val
            )""")
            params["s_val"] = s_val

        return where_clauses, params

    @classmethod
    async def get_audit_report(
        cls,
        db: AsyncSession,
        page: int = 1,
        limit: int = 25,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        user_type: Optional[str] = None,
        user_ref_id: Optional[int] = None,
        service: Optional[str] = None,
        entry_type: Optional[str] = None,
        status: Optional[str] = None,
        reconciliation: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "DESC",
        tenant_ref_id: int = 1,
        company_ref_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes unified audit query joining business transactions with wallet ledgers,
        evaluates reconciliation state, calculates summary metrics and returns paginated rows.
        """
        page = max(1, page)
        limit = min(max(1, limit), 10000)
        offset = (page - 1) * limit

        where_clauses, params = cls._build_audit_where_clause(
            from_date=from_date,
            to_date=to_date,
            user_type=user_type,
            user_ref_id=user_ref_id,
            service=service,
            entry_type=entry_type,
            status=status,
            search=search,
            tenant_ref_id=tenant_ref_id,
            company_ref_id=company_ref_id
        )

        # Base CTEs
        ctes_sql = """
        WITH wl_agg AS (
            SELECT 
                reference_id,
                MIN(id) AS ledger_id,
                COUNT(id) AS ledger_entries_count,
                SUM(COALESCE(credit_amount, 0.0)) AS total_ledger_credit,
                SUM(COALESCE(debit_amount, 0.0)) AS total_ledger_debit,
                MIN(balance_before) AS ledger_opening_bal,
                MAX(balance_after) AS ledger_closing_bal,
                STRING_AGG(id::text, ', ') AS all_ledger_ids
            FROM public.wallet_ledger
            WHERE reference_id IS NOT NULL AND (is_deleted IS NOT TRUE)
            GROUP BY reference_id
        ),
        txn_components AS (
            SELECT 
                txn_id,
                SUM(CASE WHEN UPPER(entry_type) IN ('CREDIT', 'CR') THEN amount ELSE 0.0 END) AS total_txn_credit,
                SUM(CASE WHEN UPPER(entry_type) IN ('DEBIT', 'DR') THEN amount ELSE 0.0 END) AS total_txn_debit,
                SUM(CASE WHEN narration ILIKE '%charge%' OR narration ILIKE '%mdr%' THEN amount ELSE 0.0 END) AS mdr_amount,
                SUM(CASE WHEN narration ILIKE '%commission%' OR service_name ILIKE '%commission%' THEN amount ELSE 0.0 END) AS comm_amount
            FROM public.transactions
            GROUP BY txn_id
        ),
        trr_agg AS (
            SELECT DISTINCT ON (COALESCE(transaction_id, internal_ref_id))
                COALESCE(transaction_id, internal_ref_id) AS tx_ref,
                recon_status,
                amount_difference
            FROM public.txn_reconciliation_result
            ORDER BY COALESCE(transaction_id, internal_ref_id), id DESC
        ),
        raw_audit AS (
            SELECT 
                t.id AS primary_id,
                t.txn_id,
                COALESCE(t.ref_id, t.txn_id, '') AS ref_id,
                COALESCE(t.service_name, 'PAYOUT') AS service,
                COALESCE(t.wallet_type, 'MAIN') AS wallet,
                UPPER(COALESCE(t.entry_type, 'DEBIT')) AS entry_type,
                COALESCE(t.amount, 0.0) AS amount,
                COALESCE(t.balance_before, 0.0) AS balance_before,
                COALESCE(t.balance_after, 0.0) AS balance_after,
                COALESCE(t.narration, '') AS narration,
                t.created_at,
                COALESCE(t.status, 'SUCCESS') AS status,
                t.created_by,
                t.user_type,
                t.user_ref_id,
                t.user_type_ref_id,
                COALESCE(c.company_name, c.display_name, c.legal_name, 'Pay2Pay') AS company_name,
                t.retailer_name AS t_retailer_name,
                COALESCE(r.store_name, r.legal_name, t.retailer_name, r.owner_name, 'N/A') AS retailer_name,
                r.retailer_code,
                COALESCE(d.business_name, t.dist_name, d.owner_name, 'N/A') AS dist_name,
                d.distributor_code,
                COALESCE(sd.business_name, t.sd_name, sd.owner_name, 'N/A') AS sd_name,
                sd.super_distributor_code,
                wl.ledger_id,
                wl.ledger_entries_count,
                wl.total_ledger_credit,
                wl.total_ledger_debit,
                wl.all_ledger_ids,
                tc.mdr_amount,
                tc.comm_amount,
                tc.total_txn_credit,
                tc.total_txn_debit,
                trr.recon_status AS vendor_recon_status,
                trr.amount_difference AS vendor_amt_diff,
                CASE
                    -- 1. Balance progression check:
                    WHEN ABS((CASE WHEN UPPER(COALESCE(t.entry_type, 'DEBIT')) IN ('CREDIT', 'CR') 
                                   THEN COALESCE(t.balance_before, 0.0) + COALESCE(t.amount, 0.0)
                                   ELSE COALESCE(t.balance_before, 0.0) - COALESCE(t.amount, 0.0) END) 
                             - COALESCE(t.balance_after, 0.0)) > 0.02
                        THEN 'MISMATCH'
                    -- 2. Missing ledger entry for successful transactions:
                    WHEN UPPER(COALESCE(t.status, 'SUCCESS')) = 'SUCCESS' 
                         AND UPPER(COALESCE(t.service_name, 'PAYOUT')) IN ('PAYOUT', 'TOPUP', 'AEPS', 'DMT', 'BBPS', 'RECHARGE') 
                         AND wl.ledger_id IS NULL
                        THEN 'MISMATCH'
                    -- 3. Duplicate ledger entry without matching refund:
                    WHEN COALESCE(wl.ledger_entries_count, 0) > 1 
                         AND NOT (COALESCE(wl.total_ledger_credit, 0) > 0 AND COALESCE(wl.total_ledger_debit, 0) > 0 
                                  AND ABS(COALESCE(wl.total_ledger_credit, 0) - COALESCE(wl.total_ledger_debit, 0)) < 0.02)
                        THEN 'MISMATCH'
                    -- 4. Amount mismatch:
                    WHEN wl.ledger_id IS NOT NULL 
                         AND UPPER(COALESCE(t.entry_type, 'DEBIT')) NOT IN ('CREDIT', 'CR') 
                         AND COALESCE(wl.total_ledger_debit, 0) > 0 
                         AND ABS(COALESCE(t.amount, 0.0) - COALESCE(wl.total_ledger_debit, 0)) > 0.02 
                         AND ABS(COALESCE(tc.total_txn_debit, 0.0) - COALESCE(wl.total_ledger_debit, 0)) > 0.02
                        THEN 'MISMATCH'
                    WHEN wl.ledger_id IS NOT NULL 
                         AND UPPER(COALESCE(t.entry_type, 'DEBIT')) IN ('CREDIT', 'CR') 
                         AND COALESCE(wl.total_ledger_credit, 0) > 0 
                         AND ABS(COALESCE(t.amount, 0.0) - COALESCE(wl.total_ledger_credit, 0)) > 0.02 
                         AND ABS(COALESCE(tc.total_txn_credit, 0.0) - COALESCE(wl.total_ledger_credit, 0)) > 0.02
                        THEN 'MISMATCH'
                    -- 5. Entry type mismatch:
                    WHEN wl.ledger_id IS NOT NULL 
                         AND UPPER(COALESCE(t.entry_type, 'DEBIT')) IN ('CREDIT', 'CR') 
                         AND COALESCE(wl.total_ledger_credit, 0) = 0 AND COALESCE(wl.total_ledger_debit, 0) > 0
                        THEN 'MISMATCH'
                    WHEN wl.ledger_id IS NOT NULL 
                         AND UPPER(COALESCE(t.entry_type, 'DEBIT')) NOT IN ('CREDIT', 'CR') 
                         AND COALESCE(wl.total_ledger_debit, 0) = 0 AND COALESCE(wl.total_ledger_credit, 0) > 0
                        THEN 'MISMATCH'
                    -- 6. Gateway discrepancy:
                    WHEN trr.recon_status IN ('MISSING_IN_VENDOR', 'MISSING_IN_INTERNAL', 'AMOUNT_MISMATCH', 'INVALID_VENDOR_TRANSACTION')
                        THEN 'MISMATCH'
                    -- 7. Failed with debited ledger:
                    WHEN UPPER(COALESCE(t.status, 'SUCCESS')) = 'FAILED' AND wl.ledger_id IS NOT NULL AND COALESCE(wl.total_ledger_credit, 0) = 0
                        THEN 'MISMATCH'
                    -- Pending:
                    WHEN UPPER(COALESCE(t.status, 'SUCCESS')) IN ('PENDING', 'PROCESSING', 'INITIATED')
                        THEN 'PENDING'
                    ELSE 'MATCHED'
                END AS recon_status
            FROM public.transactions t
            LEFT JOIN wl_agg wl ON (wl.reference_id = t.txn_id OR wl.reference_id = t.ref_id)
            LEFT JOIN txn_components tc ON tc.txn_id = t.txn_id
            LEFT JOIN trr_agg trr ON (trr.tx_ref = t.txn_id OR trr.tx_ref = t.ref_id)
            LEFT JOIN public.retailer r ON (
                r.retailer_ref_id = t.user_ref_id 
                AND (t.user_type_ref_id = 2 OR UPPER(t.user_type) = 'RETAILER')
            )
            LEFT JOIN public.distributor d ON (
                d.id = r.distributor_ref_id 
                OR d.distributor_ref_id = r.distributor_ref_id
                OR ((d.distributor_ref_id = t.user_ref_id OR d.id = t.user_ref_id) AND (t.user_type_ref_id = 3 OR UPPER(t.user_type) IN ('DISTRIBUTOR', 'DIST')))
            )
            LEFT JOIN public.super_distributor sd ON (
                sd.id = COALESCE(r.super_distributor_ref_id, d.super_distributor_ref_id)
                OR sd.super_distributor_ref_id = COALESCE(r.super_distributor_ref_id, d.super_distributor_ref_id)
                OR ((sd.super_distributor_ref_id = t.user_ref_id OR sd.id = t.user_ref_id) AND (t.user_type_ref_id = 4 OR UPPER(t.user_type) IN ('SD', 'SUPER_DISTRIBUTOR')))
            )
            LEFT JOIN public.company c ON c.company_ref_id = COALESCE(t.company_ref_id, r.company_ref_id, d.company_ref_id, sd.company_ref_id, 1)
            WHERE {where_filter}
        )
        """

        formatted_ctes = ctes_sql.format(where_filter=" AND ".join(where_clauses))

        # Overall summary SQL with exact reconciliation counts
        summary_query = formatted_ctes + """
        SELECT 
            COUNT(*) AS total_transactions,
            COALESCE(SUM(CASE WHEN entry_type IN ('CREDIT', 'CR') THEN amount ELSE 0.0 END), 0.0) AS total_credit,
            COALESCE(SUM(CASE WHEN entry_type IN ('DEBIT', 'DR') THEN amount ELSE 0.0 END), 0.0) AS total_debit,
            COALESCE(SUM(CASE WHEN narration ILIKE '%charge%' OR narration ILIKE '%mdr%' THEN amount ELSE 0.0 END), 0.0) AS total_mdr,
            COALESCE(SUM(CASE WHEN narration ILIKE '%commission%' OR service ILIKE '%commission%' THEN amount ELSE 0.0 END), 0.0) AS total_commission,
            COUNT(CASE WHEN recon_status = 'MATCHED' THEN 1 END) AS matched_count,
            COUNT(CASE WHEN recon_status = 'MISMATCH' THEN 1 END) AS mismatch_count,
            COUNT(CASE WHEN recon_status = 'PENDING' THEN 1 END) AS pending_count
        FROM raw_audit;
        """

        sum_res = await db.execute(text(summary_query), params)
        sum_row = sum_res.fetchone()

        total_txns = int(sum_row[0] if sum_row else 0)
        tot_credit = round_curr(sum_row[1] if sum_row else 0.0)
        tot_debit = round_curr(sum_row[2] if sum_row else 0.0)
        net_movement = round_curr(tot_credit - tot_debit)
        tot_mdr = round_curr(sum_row[3] if sum_row else 0.0)
        tot_comm = round_curr(sum_row[4] if sum_row else 0.0)
        matched_total = int(sum_row[5] if sum_row else 0)
        mismatch_total = int(sum_row[6] if sum_row else 0)
        pending_total = int(sum_row[7] if sum_row else 0)

        # Service-wise breakdown
        svc_query = formatted_ctes + """
        SELECT 
            service,
            COUNT(*) AS tx_count,
            COALESCE(SUM(CASE WHEN entry_type IN ('CREDIT', 'CR') THEN amount ELSE 0.0 END), 0.0) AS cr_amt,
            COALESCE(SUM(CASE WHEN entry_type IN ('DEBIT', 'DR') THEN amount ELSE 0.0 END), 0.0) AS dr_amt,
            COALESCE(SUM(CASE WHEN narration ILIKE '%charge%' OR narration ILIKE '%mdr%' THEN amount ELSE 0.0 END), 0.0) AS mdr_amt,
            COALESCE(SUM(CASE WHEN narration ILIKE '%commission%' OR service ILIKE '%commission%' THEN amount ELSE 0.0 END), 0.0) AS comm_amt
        FROM raw_audit
        GROUP BY service
        ORDER BY tx_count DESC;
        """
        svc_res = await db.execute(text(svc_query), params)
        services_summary = []
        for sr in svc_res.fetchall():
            cr_a = round_curr(sr[2])
            dr_a = round_curr(sr[3])
            services_summary.append({
                "service": sr[0],
                "transactions": int(sr[1]),
                "total_cr": cr_a,
                "total_dr": dr_a,
                "net_movement": round_curr(cr_a - dr_a),
                "mdr": round_curr(sr[4]),
                "commission": round_curr(sr[5])
            })

        # Sorting whitelist
        sort_map = {
            "created_at": "created_at",
            "date_time": "created_at",
            "date": "created_at",
            "amount": "amount",
            "balance_before": "balance_before",
            "balance_after": "balance_after",
            "status": "status",
            "service": "service",
            "txn_id": "txn_id",
            "ref_id": "ref_id",
            "retailer": "retailer_name",
            "reconciliation": "recon_status"
        }
        order_col = sort_map.get((sort_by or "").lower().strip(), "created_at")
        order_dir = "ASC" if (sort_order or "").upper().strip() == "ASC" else "DESC"

        # Reconciliation filter handling at SQL level
        data_where = ""
        fetch_params = {**params, "limit": limit, "offset": offset}
        recon_clean = (reconciliation or "").strip().upper()
        if recon_clean in ("MATCHED", "MISMATCH", "PENDING"):
            data_where = "WHERE recon_status = :recon_val"
            fetch_params["recon_val"] = recon_clean

        # Paginated fetch query
        fetch_query = formatted_ctes + f"""
        SELECT *
        FROM raw_audit
        {data_where}
        ORDER BY {order_col} {order_dir}
        LIMIT :limit OFFSET :offset;
        """
        data_res = await db.execute(text(fetch_query), fetch_params)
        raw_rows = data_res.fetchall()

        # Reconciliation Evaluation Engine (Authoritative Server-side)
        items: List[Dict[str, Any]] = []
        matched_count_page = 0
        mismatch_count_page = 0
        pending_count_page = 0

        for r in raw_rows:
            m = dict(r._mapping)
            entry = (m.get("entry_type") or "DEBIT").upper()
            is_credit = entry in ("CREDIT", "CR")
            amt = round_curr(m.get("amount"))
            op_bal = round_curr(m.get("balance_before"))
            cl_bal = round_curr(m.get("balance_after"))
            status_val = (m.get("status") or "SUCCESS").upper()
            srv = m.get("service") or "PAYOUT"
            lid = m.get("ledger_id")
            l_cnt = m.get("ledger_entries_count") or 0
            l_cr = round_curr(m.get("total_ledger_credit"))
            l_dr = round_curr(m.get("total_ledger_debit"))
            tot_tx_cr = round_curr(m.get("total_txn_credit"))
            tot_tx_dr = round_curr(m.get("total_txn_debit"))
            all_lids = m.get("all_ledger_ids") or ""
            v_recon = m.get("vendor_recon_status")

            reasons: List[str] = []

            # 1. Wallet Balance Progression Check
            if is_credit:
                expected_closing = op_bal + amt
            else:
                expected_closing = op_bal - amt
            if abs(expected_closing - cl_bal) > 0.02:
                reasons.append(f"Wallet balance mismatch: Opening ₹{op_bal:,.2f} {'+' if is_credit else '-'} ₹{amt:,.2f} ≠ Closing ₹{cl_bal:,.2f}")

            # 2. Missing Wallet Ledger Entry
            if status_val == "SUCCESS" and srv in ("PAYOUT", "TOPUP", "AEPS", "DMT", "BBPS", "RECHARGE") and not lid:
                reasons.append("Missing wallet ledger entry for successful transaction")

            # 3. Duplicate Wallet Ledger Entry
            if l_cnt > 1:
                # If there's an exact credit reversal paired with debit, it's a refund; else duplicate
                if not (l_cr > 0 and l_dr > 0 and abs(l_cr - l_dr) < 0.02):
                    reasons.append(f"Duplicate ledger entry detected ({l_cnt} entries found: {all_lids})")

            # 4. Amount Discrepancy between Transaction and Ledger
            if lid:
                if not is_credit and l_dr > 0:
                    if abs(amt - l_dr) > 0.02 and abs(tot_tx_dr - l_dr) > 0.02:
                        reasons.append(f"Amount mismatch: Business ₹{amt:,.2f} vs Ledger Debit ₹{l_dr:,.2f}")
                elif is_credit and l_cr > 0:
                    if abs(amt - l_cr) > 0.02 and abs(tot_tx_cr - l_cr) > 0.02:
                        reasons.append(f"Amount mismatch: Business ₹{amt:,.2f} vs Ledger Credit ₹{l_cr:,.2f}")

            # 5. Entry Type Mismatch
            if lid:
                if is_credit and l_cr == 0 and l_dr > 0:
                    reasons.append(f"Entry type mismatch: Transaction is CREDIT but Ledger posted DEBIT ₹{l_dr:,.2f}")
                elif not is_credit and l_dr == 0 and l_cr > 0:
                    reasons.append(f"Entry type mismatch: Transaction is DEBIT but Ledger posted CREDIT ₹{l_cr:,.2f}")

            # 6. External Vendor / Gateway Reconciliation Discrepancy
            if v_recon and v_recon in ("MISSING_IN_VENDOR", "MISSING_IN_INTERNAL", "AMOUNT_MISMATCH", "INVALID_VENDOR_TRANSACTION"):
                reasons.append(f"Gateway discrepancy: {v_recon}")

            # 7. Status Mismatch
            if status_val == "FAILED" and lid and l_cr == 0:
                reasons.append("Ledger entry debited for FAILED transaction without reversal")

            # 8. User / Hierarchy Mismatch
            t_ret_name = (m.get("t_retailer_name") or "").strip()
            mapped_ret_name = (m.get("retailer_name") or "").strip()
            if t_ret_name and mapped_ret_name and mapped_ret_name != "N/A" and t_ret_name.lower() != mapped_ret_name.lower():
                reasons.append(f"User mismatch: Transaction record specifies '{t_ret_name}' but posted to User ID {m.get('user_ref_id')} ('{mapped_ret_name}')")

            # Final Reconciliation Status
            if reasons:
                recon_status = "MISMATCH"
                mismatch_count_page += 1
            elif status_val in ("PENDING", "PROCESSING", "INITIATED"):
                recon_status = "PENDING"
                pending_count_page += 1
            else:
                recon_status = "MATCHED"
                matched_count_page += 1

            # Determine MDR and Commission for row
            mdr_amt = round_curr(m.get("mdr_amount"))
            comm_amt = round_curr(m.get("comm_amount"))
            mdr_pct = round((mdr_amt / amt * 100), 2) if (amt > 0 and mdr_amt > 0) else 0.0
            comm_pct = round((comm_amt / amt * 100), 2) if (amt > 0 and comm_amt > 0) else 0.0

            dt_val = m.get("created_at")
            if isinstance(dt_val, datetime):
                formatted_dt = dt_val.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")
            else:
                formatted_dt = str(dt_val or "")

            # Ledger posted amount
            ledger_amt = l_cr if is_credit else l_dr
            if ledger_amt == 0.0 and lid:
                ledger_amt = l_dr if is_credit else l_cr
            if ledger_amt == 0.0:
                ledger_amt = amt

            u_type = (m.get("user_type") or "RETAILER").upper()
            ut_ref = m.get("user_type_ref_id")
            if u_type in ("SUPER_DISTRIBUTOR", "SUPER DISTRIBUTOR", "SD") or ut_ref == 4:
                resolved_user_name = m.get("sd_name") if m.get("sd_name") != "N/A" else (m.get("dist_name") or m.get("retailer_name") or "Super Distributor")
            elif u_type in ("DISTRIBUTOR", "DIST") or ut_ref == 3:
                resolved_user_name = m.get("dist_name") if m.get("dist_name") != "N/A" else (m.get("retailer_name") or "Distributor")
            elif u_type in ("RETAILER", "RET") or ut_ref == 2:
                resolved_user_name = m.get("retailer_name") if m.get("retailer_name") != "N/A" else (m.get("t_retailer_name") or "Retailer")
            else:
                resolved_user_name = m.get("retailer_name") or m.get("dist_name") or m.get("sd_name") or "User"

            item = {
                "id": m.get("primary_id"),
                "date_time": formatted_dt,
                "created_at": formatted_dt,
                "txn_id": m.get("txn_id") or "",
                "ref_id": m.get("ref_id") or "",
                "ledger_id": str(lid) if lid else "N/A",
                "all_ledger_ids": all_lids,
                "user_type": u_type,
                "user_name": resolved_user_name,
                "company": m.get("company_name") or "Pay2Pay",
                "super_distributor": m.get("sd_name") or "N/A",
                "super_distributor_code": m.get("super_distributor_code") or "N/A",
                "distributor": m.get("dist_name") or "N/A",
                "distributor_code": m.get("distributor_code") or "N/A",
                "retailer": m.get("retailer_name") or "N/A",
                "retailer_code": m.get("retailer_code") or "N/A",
                "service": srv,
                "transaction_type": m.get("narration") or srv,
                "entry_type": entry,
                "cr_dr": "CR" if is_credit else "DR",
                "amount": amt,
                "ledger_amount": round_curr(ledger_amt),
                "mdr_percent": mdr_pct,
                "mdr_amount": mdr_amt,
                "commission_percent": comm_pct,
                "commission_amount": comm_amt,
                "opening_balance": op_bal,
                "closing_balance": cl_bal,
                "wallet": m.get("wallet") or "MAIN",
                "status": status_val,
                "reconciliation": recon_status,
                "mismatch_reasons": reasons,
                "created_by": str(m.get("created_by") or "System"),
                "user_ref_id": m.get("user_ref_id"),
                "user_type_ref_id": m.get("user_type_ref_id")
            }

            items.append(item)

        # Dataset reconciliation counts from database execution
        summary_payload = {
            "total_transactions": total_txns,
            "total_credit": tot_credit,
            "total_debit": tot_debit,
            "net_movement": net_movement,
            "matched_count": matched_total,
            "mismatch_count": mismatch_total,
            "pending_count": pending_total,
            "total_mdr": tot_mdr,
            "total_commission": tot_comm,
            "services_summary": services_summary
        }

        # Determine effective total records for active view
        if recon_clean == "MATCHED":
            effective_total = matched_total
        elif recon_clean == "MISMATCH":
            effective_total = mismatch_total
        elif recon_clean == "PENDING":
            effective_total = pending_total
        else:
            effective_total = total_txns

        total_pages = math.ceil(effective_total / limit) if effective_total > 0 else 0

        return {
            "success": True,
            "message": "Wallet ledger audit report retrieved successfully",
            "summary": summary_payload,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_records": effective_total,
                "total_pages": total_pages
            },
            "data": items
        }

    @classmethod
    async def get_transaction_detail(
        cls,
        db: AsyncSession,
        txn_id: str,
        primary_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Deep transaction trace & audit detail drawer endpoint.
        Returns originating transaction rows, wallet ledger entries,
        reconciliation status, and hierarchy.
        """
        # Fetch transaction component rows
        sql_txns = """
        SELECT 
            t.id, t.txn_id, t.ref_id, t.service_name, t.entry_type, t.amount,
            t.balance_before, t.balance_after, t.narration, t.status, t.created_at,
            t.user_type, t.user_ref_id, t.user_type_ref_id, t.wallet_type,
            COALESCE(c.company_name, c.display_name, 'Pay2Pay') AS company,
            COALESCE(r.store_name, r.legal_name, t.retailer_name, 'N/A') AS retailer,
            r.retailer_code,
            COALESCE(d.business_name, t.dist_name, 'N/A') AS distributor,
            d.distributor_code,
            COALESCE(sd.business_name, t.sd_name, 'N/A') AS super_distributor,
            sd.super_distributor_code
        FROM public.transactions t
        LEFT JOIN public.retailer r ON (
            r.retailer_ref_id = t.user_ref_id 
            AND (t.user_type_ref_id = 2 OR UPPER(t.user_type) = 'RETAILER')
        )
        LEFT JOIN public.distributor d ON (
            d.id = r.distributor_ref_id 
            OR d.distributor_ref_id = r.distributor_ref_id
            OR ((d.distributor_ref_id = t.user_ref_id OR d.id = t.user_ref_id) AND (t.user_type_ref_id = 3 OR UPPER(t.user_type) IN ('DISTRIBUTOR', 'DIST')))
        )
        LEFT JOIN public.super_distributor sd ON (
            sd.id = COALESCE(r.super_distributor_ref_id, d.super_distributor_ref_id)
            OR sd.super_distributor_ref_id = COALESCE(r.super_distributor_ref_id, d.super_distributor_ref_id)
            OR ((sd.super_distributor_ref_id = t.user_ref_id OR sd.id = t.user_ref_id) AND (t.user_type_ref_id = 4 OR UPPER(t.user_type) IN ('SD', 'SUPER_DISTRIBUTOR')))
        )
        LEFT JOIN public.company c ON c.company_ref_id = COALESCE(t.company_ref_id, r.company_ref_id, d.company_ref_id, sd.company_ref_id, 1)
        WHERE t.txn_id = :txn_id OR t.ref_id = :txn_id
        ORDER BY t.id ASC;
        """
        res_txns = await db.execute(text(sql_txns), {"txn_id": txn_id.strip()})
        rows_txns = res_txns.fetchall()
        if not rows_txns:
            return None

        # Fetch wallet ledger postings
        sql_wl = """
        SELECT 
            id, reference_id, transaction_type, credit_amount, debit_amount,
            balance_before, balance_after, created_date, created_by
        FROM public.wallet_ledger
        WHERE reference_id = :txn_id OR reference_id = :ref_id
        ORDER BY id ASC;
        """
        ref_id_cand = rows_txns[0]._mapping.get("ref_id") or txn_id
        res_wl = await db.execute(text(sql_wl), {"txn_id": txn_id.strip(), "ref_id": ref_id_cand.strip()})
        rows_wl = res_wl.fetchall()

        # Fetch gateway reconciliation result
        sql_trr = """
        SELECT 
            recon_status, vendor_amount, vendor_status, vendor_utr,
            internal_amount, internal_status, amount_difference,
            mismatch_details, recommended_action
        FROM public.txn_reconciliation_result
        WHERE transaction_id = :txn_id OR internal_ref_id = :txn_id
        LIMIT 1;
        """
        res_trr = await db.execute(text(sql_trr), {"txn_id": txn_id.strip()})
        row_trr = res_trr.fetchone()

        primary = None
        if primary_id:
            for tx in rows_txns:
                if tx._mapping.get("id") == primary_id:
                    primary = dict(tx._mapping)
                    break
        if not primary:
            primary = dict(rows_txns[0]._mapping)

        # Format component transactions
        components = []
        tot_amt = 0.0
        for tx in rows_txns:
            m = dict(tx._mapping)
            amt = round_curr(m.get("amount"))
            tot_amt += amt
            components.append({
                "id": m.get("id"),
                "narration": m.get("narration") or m.get("service_name"),
                "entry_type": m.get("entry_type"),
                "amount": amt,
                "balance_before": round_curr(m.get("balance_before")),
                "balance_after": round_curr(m.get("balance_after")),
                "retailer": m.get("retailer"),
                "user_ref_id": m.get("user_ref_id")
            })

        # Format ledger postings
        postings = []
        for wl in rows_wl:
            m = dict(wl._mapping)
            postings.append({
                "ledger_id": m.get("id"),
                "reference_id": m.get("reference_id"),
                "type": m.get("transaction_type"),
                "credit": round_curr(m.get("credit_amount")),
                "debit": round_curr(m.get("debit_amount")),
                "balance_before": round_curr(m.get("balance_before")),
                "balance_after": round_curr(m.get("balance_after")),
                "created_date": m.get("created_date").isoformat() if m.get("created_date") else "",
                "created_by": m.get("created_by") or "System"
            })

        dt_ist = primary.get("created_at")
        if isinstance(dt_ist, datetime):
            created_str = dt_ist.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")
        else:
            created_str = str(dt_ist or "")

        return {
            "success": True,
            "txn_id": primary.get("txn_id"),
            "ref_id": primary.get("ref_id"),
            "service": primary.get("service_name"),
            "status": primary.get("status"),
            "wallet": primary.get("wallet_type") or "MAIN",
            "created_at": created_str,
            "hierarchy": {
                "company": primary.get("company") or "Pay2Pay",
                "super_distributor": primary.get("super_distributor") or "N/A",
                "super_distributor_code": primary.get("super_distributor_code") or "N/A",
                "distributor": primary.get("distributor") or "N/A",
                "distributor_code": primary.get("distributor_code") or "N/A",
                "retailer": primary.get("retailer") or "N/A",
                "retailer_code": primary.get("retailer_code") or "N/A",
            },
            "user_type": primary.get("user_type") or "RETAILER",
            "components": components,
            "total_business_amount": round_curr(tot_amt),
            "ledger_postings": postings,
            "reconciliation": dict(row_trr._mapping) if row_trr else None
        }
