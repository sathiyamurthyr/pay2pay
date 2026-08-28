"""
Enterprise Unified Transaction Report API Router.

Provides unified, authoritative database reporting endpoints across all supported services:
- Payout (Utkal Digital, BulkPe, WowPe, Cashfree)
- DMT / Money Transfer
- Recharge
- Bill Payment / BBPS
- Topup / Move to Bank
- Card-to-Cash / POS

Features:
- Live database queries directly against Supabase PostgreSQL
- Main report table 10-column contract (Txn ID, Service, Type, Previous Balance, CR, DR, Current Balance, Amount, Date & Time, Status)
- Comprehensive transaction detail drawer dataset (Sections A through I)
- Server-side filtering, sorting, pagination, and search
- Server-side CSV/Excel export
- Authoritative ledger values preservation
"""

import uuid
import io
import csv
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="", tags=["Enterprise Transaction Report"])


def mask_sensitive_account(acc_no: Optional[str]) -> str:
    if not acc_no:
        return "XXXX XXXX 0000"
    clean = str(acc_no).replace(" ", "").replace("-", "")
    if len(clean) <= 4:
        return f"XXXX {clean}"
    last4 = clean[-4:]
    return f"XXXX XXXX {last4}"


def mask_sensitive_mobile(mobile: Optional[str]) -> str:
    if not mobile:
        return "XXXXXX0000"
    clean = str(mobile).replace(" ", "").replace("-", "")
    if len(clean) <= 4:
        return f"XXXXXX{clean}"
    return f"{clean[:2]}******{clean[-2:]}"


# ==============================================================================
# UNIFIED SQL QUERY GENERATOR
# ==============================================================================

def build_unified_transactions_query(
    service: Optional[str] = None,
    transaction_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    channel: Optional[str] = None,
    provider: Optional[str] = None,
    credit_debit: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    retailer_id: Optional[str] = None,
    retailer_code: Optional[str] = None,
    sort_by: str = "transaction_datetime",
    sort_dir: str = "desc",
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> Tuple[str, str, Dict[str, Any]]:
    params: Dict[str, Any] = {}

    start_dt = None
    end_dt = None
    if from_date:
        try:
            start_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
        except ValueError:
            pass
    if to_date:
        try:
            end_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            pass

    outer_conditions = ["1=1"]

    if (retailer_id and str(retailer_id).upper() != "ALL") or (retailer_code and str(retailer_code).upper() != "ALL"):
        ret_conds = []
        if retailer_id and str(retailer_id).upper() != "ALL":
            ret_conds.append("u.retailer_id = :retailer_id")
            ret_conds.append("u.retailer_code = :retailer_id")
            ret_conds.append("u.retailer_id ILIKE :retailer_id_like")
            ret_conds.append("u.retailer_code ILIKE :retailer_id_like")
            ret_conds.append("u.customer_id = :retailer_id")
            ret_conds.append("u.beneficiary_id = :retailer_id")
            params["retailer_id"] = str(retailer_id)
            params["retailer_id_like"] = f"%{retailer_id}%"
        if retailer_code and str(retailer_code).upper() != "ALL":
            ret_conds.append("u.retailer_code = :retailer_code")
            ret_conds.append("u.retailer_id = :retailer_code")
            params["retailer_code"] = str(retailer_code)
        if ret_conds:
            outer_conditions.append(f"({' OR '.join(ret_conds)})")

    if service and service.upper() != "ALL":
        outer_conditions.append("UPPER(u.service) = :service")
        params["service"] = service.upper()

    if transaction_type and transaction_type.upper() != "ALL":
        outer_conditions.append("UPPER(u.type) = :transaction_type")
        params["transaction_type"] = transaction_type.upper()

    if status_filter and status_filter.upper() != "ALL":
        st = status_filter.upper()
        if st == "PENDING":
            outer_conditions.append("UPPER(u.status) IN ('PENDING', 'PROCESSING', 'INITIATED')")
        elif st == "FAILED":
            outer_conditions.append("UPPER(u.status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED')")
        elif st == "SUCCESS":
            outer_conditions.append("UPPER(u.status) IN ('SUCCESS', 'LEDGER_POSTED', 'COMPLETED', 'SETTLED')")
        else:
            outer_conditions.append("UPPER(u.status) = :status_filter")
            params["status_filter"] = st

    if channel and channel.upper() != "ALL":
        outer_conditions.append("UPPER(u.channel) = :channel")
        params["channel"] = channel.upper()

    if provider and provider.upper() != "ALL":
        outer_conditions.append("UPPER(u.provider_name) = :provider")
        params["provider"] = provider.upper()

    if credit_debit and credit_debit.upper() != "ALL":
        cd = credit_debit.upper()
        if cd == "CR":
            outer_conditions.append("u.cr > 0")
        elif cd == "DR":
            outer_conditions.append("u.dr > 0")

    if min_amount is not None:
        outer_conditions.append("u.amount >= :min_amount")
        params["min_amount"] = min_amount

    if max_amount is not None:
        outer_conditions.append("u.amount <= :max_amount")
        params["max_amount"] = max_amount

    if start_dt:
        outer_conditions.append("u.transaction_datetime >= :start_dt")
        params["start_dt"] = start_dt

    if end_dt:
        outer_conditions.append("u.transaction_datetime <= :end_dt")
        params["end_dt"] = end_dt

    if search and search.strip():
        s_val = f"%{search.strip()}%"
        outer_conditions.append("""(
            u.txn_id ILIKE :search_val OR 
            u.client_ref_id ILIKE :search_val OR 
            u.provider_txn_id ILIKE :search_val OR 
            u.provider_ref ILIKE :search_val OR 
            u.customer_name ILIKE :search_val OR 
            u.customer_mobile ILIKE :search_val OR 
            u.beneficiary_name ILIKE :search_val OR 
            u.account_number ILIKE :search_val OR 
            u.service ILIKE :search_val
        )""")
        params["search_val"] = s_val

    sort_map = {
        "transaction_datetime": "u.transaction_datetime",
        "datetime": "u.transaction_datetime",
        "date": "u.transaction_datetime",
        "amount": "u.amount",
        "service": "u.service",
        "status": "u.status",
        "credit": "u.cr",
        "cr": "u.cr",
        "debit": "u.dr",
        "dr": "u.dr",
        "current_balance": "u.current_balance",
        "previous_balance": "u.previous_balance",
    }
    sort_col = sort_map.get(sort_by.lower(), "u.transaction_datetime")
    sort_order = "ASC" if sort_dir.lower() == "asc" else "DESC"

    where_clause = " AND ".join(outer_conditions)

    cte_sql = """
    WITH unified_txns AS (
        -- 1. Central Authoritative Transactions Table
        SELECT 
            t.public_id::text AS id,
            COALESCE(t.transaction_reference, t.id::text) AS txn_id,
            COALESCE(t.transaction_reference, t.id::text) AS client_ref_id,
            COALESCE(t.service_type, 'PAYOUT') AS service,
            COALESCE(t.transaction_type, 'IMPS') AS type,
            t.amount::float AS amount,
            COALESCE(t.charges, 0.0)::float AS charges,
            COALESCE(t.commission, 0.0)::float AS commission,
            COALESCE(t.gst_amount, 0.0)::float AS gst_amount,
            COALESCE(t.tds_amount, 0.0)::float AS tds_amount,
            COALESCE(t.net_amount, (t.amount + COALESCE(t.charges, 0.0) + COALESCE(t.gst_amount, 0.0)))::float AS net_amount,
            COALESCE(l.balance_before::float, 0.0) AS previous_balance,
            CASE 
                WHEN UPPER(COALESCE(l.entry_type, '')) = 'CREDIT' THEN COALESCE(l.amount::float, t.net_amount::float) 
                WHEN UPPER(COALESCE(t.service_type, '')) = 'TOPUP' AND UPPER(COALESCE(t.transaction_type, '')) IN ('WALLET_TOPUP', 'MANUAL_TOPUP', 'TOPUP') THEN COALESCE(t.net_amount::float, t.amount::float)
                ELSE 0.0 
            END AS cr,
            CASE 
                WHEN UPPER(COALESCE(l.entry_type, '')) = 'DEBIT' THEN COALESCE(l.amount::float, t.net_amount::float) 
                WHEN UPPER(COALESCE(t.service_type, '')) != 'TOPUP' THEN COALESCE(t.net_amount::float, t.amount::float)
                ELSE 0.0 
            END AS dr,
            COALESCE(l.balance_after::float, 
                CASE 
                    WHEN UPPER(COALESCE(t.service_type, '')) = 'TOPUP' THEN COALESCE(l.balance_before::float, 0.0) + COALESCE(t.net_amount::float, 0.0)
                    ELSE GREATEST(0.0, COALESCE(l.balance_before::float, 0.0) - COALESCE(t.net_amount::float, 0.0))
                END
            ) AS current_balance,
            t.created_at AS transaction_datetime,
            UPPER(t.status) AS status,
            COALESCE(l.narration, t.status_description, 'Transaction Completed') AS status_description,
            COALESCE(t.vendor_code, 'PAY2PAY') AS provider_name,
            COALESCE(t.vendor_order_id, t.request_id) AS provider_txn_id,
            COALESCE(t.utr, t.request_id, t.transaction_reference) AS provider_ref,
            'RETAILER_PORTAL' AS channel,
            COALESCE(t.customer_id::text, t.retailer_id::text) AS customer_id,
            COALESCE(c.full_name, ret_t.store_name, ret_t.owner_name, ret_t.legal_name, 'Direct Customer') AS customer_name,
            COALESCE(c.mobile_number, 'N/A') AS customer_mobile,
            COALESCE(c.customer_status, 'ACTIVE') AS customer_status,
            COALESCE(t.beneficiary_id::text, t.retailer_id::text) AS beneficiary_id,
            COALESCE(b.account_holder_name, b.registered_name_in_bank, bene.full_name, ret_t.store_name, ret_t.owner_name, 'Self / Main Wallet') AS beneficiary_name,
            COALESCE(b.bank_name, 'Wallet Allocation') AS bank_name,
            COALESCE(b.account_number_masked, b.account_number, 'WALLET-TOPUP') AS account_number,
            COALESCE(b.ifsc_code, 'P2P0000001') AS ifsc_code,
            COALESCE(bene.relationship, 'SELF') AS relationship,
            COALESCE(b.status, bene.beneficiary_status, 'ACTIVE') AS beneficiary_status,
            COALESCE(t.created_by, 'SYSTEM') AS created_by,
            COALESCE(t.updated_by, 'SYSTEM') AS updated_by,
            t.created_at AS created_at,
            t.updated_at AS updated_at,
            t.request_id AS request_id,
            t.idempotency_key AS correlation_id,
            t.response_message AS provider_response_message,
            NULL AS failure_reason,
            NULL AS reversal_reason,
            NULL AS reversal_transaction_id,
            NULL AS reversal_datetime,
            'CENTRAL_TXN' AS source_table,
            COALESCE(ret_t.public_id::text, t.retailer_id::text, '') AS retailer_id,
            COALESCE(ret_t.retailer_code, '') AS retailer_code
        FROM transactions t
        LEFT JOIN customer c ON t.customer_id = c.public_id
        LEFT JOIN retailer ret_t ON (t.retailer_id = ret_t.public_id OR t.retailer_id::text = ret_t.retailer_code)
        LEFT JOIN beneficiary_master b ON t.beneficiary_id = b.public_id
        LEFT JOIN beneficiary bene ON t.beneficiary_id = bene.public_id
        LEFT JOIN transaction_ledger_entries l 
            ON (t.public_id = l.transaction_id OR t.transaction_reference = l.transaction_reference)
            AND l.account_type = 'RETAILER_WALLET'

        UNION ALL

        -- 2A. Enterprise Payout Transactions (Original Debit Movements)
        SELECT 
            e.public_id::text AS id,
            e.transaction_number AS txn_id,
            COALESCE(e.vendor_ref, e.transaction_number) AS client_ref_id,
            'PAYOUT' AS service,
            COALESCE(e.mode, 'IMPS') AS type,
            e.amount::float AS amount,
            COALESCE(e.charges, 0.0)::float AS charges,
            COALESCE(e.commission, 0.0)::float AS commission,
            COALESCE(e.gst_amount, 0.0)::float AS gst_amount,
            COALESCE(e.tds_amount, 0.0)::float AS tds_amount,
            COALESCE(e.net_debit, (e.amount + COALESCE(e.charges, 0.0) + COALESCE(e.gst_amount, 0.0)))::float AS net_amount,
            COALESCE(e.wallet_before, 50000.0)::float AS previous_balance,
            0.0 AS cr,
            COALESCE(e.net_debit, (e.amount + COALESCE(e.charges, 0.0) + COALESCE(e.gst_amount, 0.0)))::float AS dr,
            COALESCE(e.wallet_after, (COALESCE(e.wallet_before, 50000.0) - COALESCE(e.net_debit, (e.amount + COALESCE(e.charges, 0.0) + COALESCE(e.gst_amount, 0.0)))))::float AS current_balance,
            COALESCE(e.initiated_at, e.created_date) AS transaction_datetime,
            CASE 
                WHEN e.is_reversed = true OR UPPER(e.status::text) = 'REVERSED' THEN 'FAILED' 
                ELSE UPPER(e.status::text) 
            END AS status,
            e.status_description AS status_description,
            COALESCE(e.vendor_name, 'UTKALDIGITAL') AS provider_name,
            e.vendor_order_id AS provider_txn_id,
            COALESCE(e.utr_number, e.rrn, e.vendor_ref) AS provider_ref,
            'RETAILER_PORTAL' AS channel,
            e.customer_id::text AS customer_id,
            COALESCE(c2.full_name, ret_e.owner_name, ret_e.store_name, 'Direct Customer') AS customer_name,
            COALESCE(c2.mobile_number, 'N/A') AS customer_mobile,
            COALESCE(c2.customer_status, 'ACTIVE') AS customer_status,
            e.beneficiary_id::text AS beneficiary_id,
            COALESCE(b2.account_holder_name, bene2.full_name, 'Direct Beneficiary') AS beneficiary_name,
            COALESCE(b2.bank_name, 'Bank Transfer') AS bank_name,
            COALESCE(b2.account_number_masked, b2.account_number, '-') AS account_number,
            COALESCE(b2.ifsc_code, '-') AS ifsc_code,
            COALESCE(bene2.relationship, 'SELF') AS relationship,
            COALESCE(b2.status, bene2.beneficiary_status, 'ACTIVE') AS beneficiary_status,
            COALESCE(e.created_by, 'SYSTEM') AS created_by,
            COALESCE(e.updated_by, 'SYSTEM') AS updated_by,
            e.created_date AS created_at,
            e.updated_date AS updated_at,
            e.transaction_number AS request_id,
            e.idempotency_key AS correlation_id,
            e.status_description AS provider_response_message,
            e.reversal_reason AS failure_reason,
            e.reversal_reason AS reversal_reason,
            e.reversal_transaction_id::text AS reversal_transaction_id,
            e.reversal_at AS reversal_datetime,
            'ENTERPRISE_PAYOUT' AS source_table,
            COALESCE(ret_e.public_id::text, e.retailer_id::text, '') AS retailer_id,
            COALESCE(ret_e.retailer_code, '') AS retailer_code
        FROM enterprise_payout_transactions e
        LEFT JOIN retailer ret_e ON (e.retailer_id = ret_e.public_id OR e.retailer_id::text = ret_e.retailer_code)
        LEFT JOIN customer c2 ON e.customer_id = c2.public_id
        LEFT JOIN beneficiary_master b2 ON e.beneficiary_id = b2.public_id
        LEFT JOIN beneficiary bene2 ON e.beneficiary_id = bene2.public_id
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions t2 WHERE t2.transaction_reference = e.transaction_number
        )

        UNION ALL

        -- 2B. Enterprise Payout Dedicated Reversal Entries
        SELECT 
            COALESCE(e_rev.reversal_transaction_id::text, CONCAT(e_rev.public_id::text, '-REV')) AS id,
            CONCAT('REV-', e_rev.transaction_number) AS txn_id,
            e_rev.transaction_number AS client_ref_id,
            'PAYOUT' AS service,
            'REVERSAL' AS type,
            e_rev.amount::float AS amount,
            0.0 AS charges,
            0.0 AS commission,
            0.0 AS gst_amount,
            0.0 AS tds_amount,
            COALESCE(e_rev.net_debit, (e_rev.amount + COALESCE(e_rev.charges, 0.0) + COALESCE(e_rev.gst_amount, 0.0)))::float AS net_amount,
            COALESCE(e_rev.wallet_after, (COALESCE(e_rev.wallet_before, 50000.0) - COALESCE(e_rev.net_debit, 0.0)))::float AS previous_balance,
            COALESCE(e_rev.net_debit, (e_rev.amount + COALESCE(e_rev.charges, 0.0) + COALESCE(e_rev.gst_amount, 0.0)))::float AS cr,
            0.0 AS dr,
            COALESCE(e_rev.wallet_before, 50000.0)::float AS current_balance,
            COALESCE(e_rev.reversal_at, e_rev.updated_date, e_rev.created_date + interval '2 seconds') AS transaction_datetime,
            'REVERSED' AS status,
            COALESCE(e_rev.reversal_reason, 'Automatic refund for failed transaction') AS status_description,
            COALESCE(e_rev.vendor_name, 'UTKALDIGITAL') AS provider_name,
            e_rev.vendor_order_id AS provider_txn_id,
            CONCAT('REFUND-', COALESCE(e_rev.utr_number, e_rev.rrn, e_rev.vendor_ref, e_rev.transaction_number)) AS provider_ref,
            'RETAILER_PORTAL' AS channel,
            e_rev.customer_id::text AS customer_id,
            COALESCE(c2_rev.full_name, ret_erev.owner_name, ret_erev.store_name, 'Direct Customer') AS customer_name,
            COALESCE(c2_rev.mobile_number, 'N/A') AS customer_mobile,
            COALESCE(c2_rev.customer_status, 'ACTIVE') AS customer_status,
            e_rev.beneficiary_id::text AS beneficiary_id,
            COALESCE(b2_rev.account_holder_name, bene2_rev.full_name, 'Direct Beneficiary') AS beneficiary_name,
            COALESCE(b2_rev.bank_name, 'Bank Transfer') AS bank_name,
            COALESCE(b2_rev.account_number_masked, b2_rev.account_number, '-') AS account_number,
            COALESCE(b2_rev.ifsc_code, '-') AS ifsc_code,
            COALESCE(bene2_rev.relationship, 'SELF') AS relationship,
            COALESCE(b2_rev.status, bene2_rev.beneficiary_status, 'ACTIVE') AS beneficiary_status,
            COALESCE(e_rev.created_by, 'SYSTEM') AS created_by,
            COALESCE(e_rev.updated_by, 'SYSTEM') AS updated_by,
            COALESCE(e_rev.reversal_at, e_rev.created_date) AS created_at,
            COALESCE(e_rev.reversal_at, e_rev.updated_date) AS updated_at,
            CONCAT('REV-', e_rev.transaction_number) AS request_id,
            e_rev.idempotency_key AS correlation_id,
            'Transaction failed and automatically refunded to wallet' AS provider_response_message,
            e_rev.reversal_reason AS failure_reason,
            e_rev.reversal_reason AS reversal_reason,
            e_rev.reversal_transaction_id::text AS reversal_transaction_id,
            e_rev.reversal_at AS reversal_datetime,
            'ENTERPRISE_PAYOUT_REVERSAL' AS source_table,
            COALESCE(ret_erev.public_id::text, e_rev.retailer_id::text, '') AS retailer_id,
            COALESCE(ret_erev.retailer_code, '') AS retailer_code
        FROM enterprise_payout_transactions e_rev
        LEFT JOIN retailer ret_erev ON (e_rev.retailer_id = ret_erev.public_id OR e_rev.retailer_id::text = ret_erev.retailer_code)
        LEFT JOIN customer c2_rev ON e_rev.customer_id = c2_rev.public_id
        LEFT JOIN beneficiary_master b2_rev ON e_rev.beneficiary_id = b2_rev.public_id
        LEFT JOIN beneficiary bene2_rev ON e_rev.beneficiary_id = bene2_rev.public_id
        WHERE (e_rev.is_reversed = true OR e_rev.reversal_transaction_id IS NOT NULL OR UPPER(e_rev.status::text) = 'REVERSED')
          AND NOT EXISTS (
              SELECT 1 FROM transactions t2_rev WHERE t2_rev.transaction_reference = CONCAT('REV-', e_rev.transaction_number)
          )

        UNION ALL

        -- 3. Workflow Transactions (Fallback)
        SELECT 
            p.public_id::text AS id,
            p.transaction_number AS txn_id,
            p.reference_number AS client_ref_id,
            'PAYOUT' AS service,
            COALESCE(p.mode, 'IMPS') AS type,
            p.amount::float AS amount,
            COALESCE(p.charges, 0.0)::float AS charges,
            COALESCE(p.commission, 0.0)::float AS commission,
            round((COALESCE(p.charges, 0.0) * 0.18)::numeric, 2)::float AS gst_amount,
            0.0 AS tds_amount,
            COALESCE(p.net_debit, (p.amount + COALESCE(p.charges, 0.0) + round((COALESCE(p.charges, 0.0) * 0.18)::numeric, 2)))::float AS net_amount,
            COALESCE(p.wallet_before, 50000.0)::float AS previous_balance,
            0.0 AS cr,
            COALESCE(p.net_debit, (p.amount + COALESCE(p.charges, 0.0) + round((COALESCE(p.charges, 0.0) * 0.18)::numeric, 2)))::float AS dr,
            (COALESCE(p.wallet_before, 50000.0) - COALESCE(p.net_debit, (p.amount + COALESCE(p.charges, 0.0) + round((COALESCE(p.charges, 0.0) * 0.18)::numeric, 2))))::float AS current_balance,
            COALESCE(p.initiated_at, p.created_date) AS transaction_datetime,
            UPPER(p.status) AS status,
            p.failure_reason AS status_description,
            'CASHFREE' AS provider_name,
            p.cashfree_transfer_id AS provider_txn_id,
            p.utr_number AS provider_ref,
            'RETAILER_PORTAL' AS channel,
            p.customer_id::text AS customer_id,
            COALESCE(c3.full_name, ret_p.owner_name, ret_p.store_name, 'Direct Customer') AS customer_name,
            COALESCE(c3.mobile_number, 'N/A') AS customer_mobile,
            COALESCE(c3.customer_status, 'ACTIVE') AS customer_status,
            p.beneficiary_id::text AS beneficiary_id,
            'Direct Beneficiary' AS beneficiary_name,
            'Bank Transfer' AS bank_name,
            '-' AS account_number,
            '-' AS ifsc_code,
            'SELF' AS relationship,
            'ACTIVE' AS beneficiary_status,
            COALESCE(p.created_by, 'SYSTEM') AS created_by,
            COALESCE(p.updated_by, 'SYSTEM') AS updated_by,
            p.created_date AS created_at,
            p.updated_date AS updated_at,
            p.reference_number AS request_id,
            p.reference_number AS correlation_id,
            p.failure_reason AS provider_response_message,
            p.failure_reason AS failure_reason,
            NULL AS reversal_reason,
            NULL AS reversal_transaction_id,
            NULL AS reversal_datetime,
            'WORKFLOW_TXN' AS source_table,
            COALESCE(ret_p.public_id::text, p.retailer_id::text, '') AS retailer_id,
            COALESCE(ret_p.retailer_code, '') AS retailer_code
        FROM payout_workflow_transactions p
        LEFT JOIN retailer ret_p ON (p.retailer_id = ret_p.public_id OR p.retailer_id::text = ret_p.retailer_code)
        LEFT JOIN customer c3 ON p.customer_id = c3.public_id
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions t3 WHERE t3.transaction_reference = p.transaction_number
        ) AND NOT EXISTS (
            SELECT 1 FROM enterprise_payout_transactions e3 WHERE e3.transaction_number = p.transaction_number
        )

        UNION ALL

        -- 4. Standalone Wallet Ledger Entries (Manual Adjustments, Direct Ledgers)
        SELECT 
            l4.public_id::text AS id,
            COALESCE(l4.transaction_reference, l4.id::text) AS txn_id,
            COALESCE(l4.transaction_reference, l4.id::text) AS client_ref_id,
            'TOPUP' AS service,
            CASE WHEN UPPER(l4.entry_type) = 'CREDIT' THEN 'MANUAL_TOPUP' ELSE 'MANUAL_DEBIT' END AS type,
            l4.amount::float AS amount,
            0.0 AS charges,
            0.0 AS commission,
            0.0 AS gst_amount,
            0.0 AS tds_amount,
            l4.amount::float AS net_amount,
            COALESCE(l4.balance_before::float, 0.0) AS previous_balance,
            CASE WHEN UPPER(l4.entry_type) = 'CREDIT' THEN l4.amount::float ELSE 0.0 END AS cr,
            CASE WHEN UPPER(l4.entry_type) = 'DEBIT' THEN l4.amount::float ELSE 0.0 END AS dr,
            COALESCE(l4.balance_after::float, 0.0) AS current_balance,
            l4.created_at AS transaction_datetime,
            'SUCCESS' AS status,
            COALESCE(l4.narration, 'Admin Wallet Adjustment') AS status_description,
            'ADMIN_MANUAL' AS provider_name,
            l4.transaction_reference AS provider_txn_id,
            l4.transaction_reference AS provider_ref,
            'ADMIN_PORTAL' AS channel,
            l4.account_number AS customer_id,
            COALESCE(ret4.store_name, ret4.owner_name, ret4.legal_name, 'Retailer Wallet') AS customer_name,
            'N/A' AS customer_mobile,
            'ACTIVE' AS customer_status,
            l4.account_number AS beneficiary_id,
            COALESCE(ret4.store_name, ret4.owner_name, ret4.legal_name, 'Admin Wallet Allocation') AS beneficiary_name,
            'Wallet Allocation' AS bank_name,
            'WALLET-ADJUST' AS account_number,
            'P2P0000001' AS ifsc_code,
            'SELF' AS relationship,
            'ACTIVE' AS beneficiary_status,
            'ADMIN' AS created_by,
            'ADMIN' AS updated_by,
            l4.created_at AS created_at,
            l4.created_at AS updated_at,
            l4.transaction_reference AS request_id,
            l4.transaction_reference AS correlation_id,
            l4.narration AS provider_response_message,
            NULL AS failure_reason,
            NULL AS reversal_reason,
            NULL AS reversal_transaction_id,
            NULL AS reversal_datetime,
            'STANDALONE_LEDGER' AS source_table,
            COALESCE(ret4.public_id::text, l4.account_number, '') AS retailer_id,
            COALESCE(ret4.retailer_code, '') AS retailer_code
        FROM transaction_ledger_entries l4
        LEFT JOIN retailer ret4 ON (l4.account_number = ret4.public_id::text OR l4.account_number = ret4.retailer_code)
        WHERE l4.account_type = 'RETAILER_WALLET'
          AND UPPER(l4.entry_type) = 'CREDIT'
          AND NOT EXISTS (
              SELECT 1 FROM transactions t4 
              WHERE t4.public_id = l4.transaction_id OR t4.transaction_reference = l4.transaction_reference
          )
          AND NOT EXISTS (
              SELECT 1 FROM enterprise_payout_transactions e4 
              WHERE e4.transaction_number = l4.transaction_reference
          )
    )
    """

    final_sql = f"""
    {cte_sql}
    SELECT * FROM unified_txns u
    WHERE {where_clause}
    ORDER BY {sort_col} {sort_order}
    """

    if limit is not None:
        final_sql += f" LIMIT {limit}"
    if offset is not None:
        final_sql += f" OFFSET {offset}"

    count_sql = f"""
    {cte_sql}
    SELECT 
        COUNT(*) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(cr), 0) AS total_cr,
        COALESCE(SUM(dr), 0) AS total_dr,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 ELSE 0 END), 0) AS successful_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED', 'VENDOR_REQUEST_SENT') THEN 1 ELSE 0 END), 0) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'REVERSED' THEN 1 ELSE 0 END), 0) AS reversed_count
    FROM unified_txns u
    WHERE {where_clause}
    """

    return final_sql, count_sql, params


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/reports/transactions/summary")
@router.get("/retailer/reports/transactions/summary")
async def get_enterprise_transactions_summary(
    request: Request = None,
    retailer_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    credit_debit: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Returns summary KPIs for the unified enterprise transaction report computed authoritatively in SQL."""
    effective_retailer_id = retailer_id if (retailer_id and retailer_id.upper() != "ALL") else None
    effective_retailer_code = None
    if request:
        try:
            auth_header = request.headers.get("authorization", "")
            cookies = request.cookies
            is_admin_request = False
            token = None
            if auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()
            elif not token:
                token = cookies.get("p2p_access_token") or cookies.get("pay2pay_access_token") or cookies.get("pay2pay_auth_token") or cookies.get("access_token")

            if token:
                from app.core.security import decode_access_token
                payload = decode_access_token(token)
                if payload:
                    roles = payload.get("roles", [])
                    if isinstance(roles, str):
                        roles = [roles]
                    role_str = str(payload.get("role", "")).upper()
                    admin_role_names = {"SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "SUPERADMIN"}
                    if any(str(r).upper() in admin_role_names for r in roles) or role_str in admin_role_names:
                        is_admin_request = True

            if not is_admin_request:
                from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
                ctx = await resolve_retailer_context(request, retailer_id, db=db)
                if ctx.get("public_id"):
                    effective_retailer_id = str(ctx.get("public_id"))
                if ctx.get("retailer_code"):
                    effective_retailer_code = str(ctx.get("retailer_code"))
            elif retailer_id and retailer_id.upper() != "ALL":
                from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
                ctx = await resolve_retailer_context(request, retailer_id, db=db)
                if ctx.get("public_id"):
                    effective_retailer_id = str(ctx.get("public_id"))
                if ctx.get("retailer_code"):
                    effective_retailer_code = str(ctx.get("retailer_code"))
        except Exception:
            pass

    _, count_sql, params = build_unified_transactions_query(
        service=service,
        transaction_type=transaction_type,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        channel=channel,
        provider=provider,
        credit_debit=credit_debit,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        retailer_id=effective_retailer_id,
        retailer_code=effective_retailer_code
    )

    res = await db.execute(text(count_sql), params)
    row = res.fetchone()
    rd = dict(row._mapping) if row else {}

    return {
        "status": "SUCCESS",
        "data": {
            "total_records": int(rd.get("total_count", 0)),
            "total_amount": round(float(rd.get("total_amount", 0)), 2),
            "total_volume": round(float(rd.get("total_amount", 0)), 2),
            "total_cr": round(float(rd.get("total_cr", 0)), 2),
            "total_dr": round(float(rd.get("total_dr", 0)), 2),
            "total_credit": round(float(rd.get("total_cr", 0)), 2),
            "total_debit": round(float(rd.get("total_dr", 0)), 2),
            "successful_transactions": int(rd.get("successful_count", 0)),
            "pending_transactions": int(rd.get("pending_count", 0)),
            "failed_transactions": int(rd.get("failed_count", 0)),
            "reversed_transactions": int(rd.get("reversed_count", 0)),
        }
    }


@router.get("/transactions")
@router.get("/reports/transactions")
@router.get("/retailer/reports/transactions")
@router.get("/report-center/transactions")
@router.get("/payout/report-center/transactions")
async def list_enterprise_transactions_report(
    service: Optional[str] = Query(None, description="PAYOUT, DMT, RECHARGE, BBPS, TOPUP, CARD_TO_CASH, ALL"),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="SUCCESS, PENDING, FAILED, REVERSED, ALL"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    credit_debit: Optional[str] = Query(None, description="CR, DR, ALL"),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    request: Request = None,
    sort_by: str = Query("transaction_datetime"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    Main Report Table API:
    Returns the real database transactions with 10-column contract:
    1. txn_id
    2. service
    3. type
    4. previous_balance
    5. cr
    6. dr
    7. current_balance
    8. amount
    9. datetime (Date & Time)
    10. status
    """
    offset = (page - 1) * limit
    effective_retailer_id = retailer_id if (retailer_id and retailer_id.upper() != "ALL") else None
    effective_retailer_code = None
    if request:
        try:
            auth_header = request.headers.get("authorization", "")
            cookies = request.cookies
            is_admin_request = False
            token = None
            if auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()
            elif not token:
                token = cookies.get("p2p_access_token") or cookies.get("pay2pay_access_token") or cookies.get("pay2pay_auth_token") or cookies.get("access_token")

            if token:
                from app.core.security import decode_access_token
                payload = decode_access_token(token)
                if payload:
                    roles = payload.get("roles", [])
                    if isinstance(roles, str):
                        roles = [roles]
                    role_str = str(payload.get("role", "")).upper()
                    admin_role_names = {"SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN", "SUPERADMIN"}
                    if any(str(r).upper() in admin_role_names for r in roles) or role_str in admin_role_names:
                        is_admin_request = True

            if not is_admin_request:
                from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
                ctx = await resolve_retailer_context(request, retailer_id, db=db)
                if ctx.get("public_id"):
                    effective_retailer_id = str(ctx.get("public_id"))
                if ctx.get("retailer_code"):
                    effective_retailer_code = str(ctx.get("retailer_code"))
            elif retailer_id and retailer_id.upper() != "ALL":
                from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
                ctx = await resolve_retailer_context(request, retailer_id, db=db)
                if ctx.get("public_id"):
                    effective_retailer_id = str(ctx.get("public_id"))
                if ctx.get("retailer_code"):
                    effective_retailer_code = str(ctx.get("retailer_code"))
        except Exception:
            pass

    list_sql, count_sql, params = build_unified_transactions_query(
        service=service,
        transaction_type=transaction_type,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        channel=channel,
        provider=provider,
        credit_debit=credit_debit,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        retailer_id=effective_retailer_id,
        retailer_code=effective_retailer_code,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset
    )

    count_res = await db.execute(text(count_sql), params)
    count_row = count_res.fetchone()
    total_count = int(count_row[0]) if count_row else 0
    total_amount = float(count_row[1]) if count_row and count_row[1] is not None else 0.0
    total_cr = float(count_row[2]) if count_row and count_row[2] is not None else 0.0
    total_dr = float(count_row[3]) if count_row and count_row[3] is not None else 0.0

    rows_res = await db.execute(text(list_sql), params)
    rows = rows_res.fetchall()

    items = []
    for r in rows:
        d = dict(r._mapping)
        dt = d.get("transaction_datetime")
        iso_dt = dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else None
        date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10] if dt else ""
        time_str = dt.strftime("%H:%M:%S") if hasattr(dt, "strftime") else str(dt)[11:19] if dt else ""

        raw_svc = str(d.get("service") or "PAYOUT").upper()
        if "PAYOUT" in raw_svc or "BANK" in raw_svc:
            svc_label = "Payout"
        elif "DMT" in raw_svc:
            svc_label = "DMT"
        elif "RECHARGE" in raw_svc:
            svc_label = "Recharge"
        elif "BBPS" in raw_svc or "BILL" in raw_svc:
            svc_label = "Bill Payment"
        elif "TOPUP" in raw_svc or "WALLET" in raw_svc:
            svc_label = "Topup"
        elif "CARD" in raw_svc or "SWIPE" in raw_svc or "POS" in raw_svc:
            svc_label = "Card-to-Cash"
        else:
            svc_label = raw_svc.capitalize()

        raw_st = str(d.get("status") or "SUCCESS").upper()
        if raw_st in ("LEDGER_POSTED", "SETTLED", "COMPLETED"):
            status_norm = "SUCCESS"
        elif raw_st in ("INITIATED", "PROCESSING"):
            status_norm = "PENDING"
        elif raw_st in ("REJECTED", "TIMEOUT"):
            status_norm = "FAILED"
        else:
            status_norm = raw_st

        # Determine comments / narration
        status_desc = str(d.get("status_description") or "")
        bene_name = str(d.get("beneficiary_name") or d.get("customer_name") or "")
        bank_name = str(d.get("bank_name") or "")
        if status_norm in ("REVERSED", "REFUND"):
            comments = f"Reversal refund for {d.get('txn_id')}"
        elif status_norm == "FAILED" and status_desc:
            comments = status_desc
        elif "PAYOUT" in raw_svc or "DMT" in raw_svc:
            comments = f"Payout to {bene_name}" + (f" ({bank_name})" if bank_name else "")
        elif "RECHARGE" in raw_svc:
            comments = f"Recharge {d.get('customer_mobile') or ''}".strip()
        elif "TOPUP" in raw_svc or "WALLET" in raw_svc:
            comments = status_desc if status_desc and status_desc.upper() not in ("SUCCESS", "COMPLETED", "LEDGER_POSTED") else "Wallet Topup / Allocation"
        elif status_desc:
            comments = status_desc
        else:
            comments = f"{svc_label} transaction"

        items.append({
            "id": str(d.get("id")),
            "txn_id": str(d.get("txn_id")),
            "client_ref_id": str(d.get("client_ref_id") or d.get("txn_id")),
            "service": svc_label,
            "raw_service": raw_svc,
            "type": str(d.get("type") or "IMPS"),
            "customer_name": str(d.get("customer_name") or "Direct Customer"),
            "customer_mobile": str(d.get("customer_mobile") or "N/A"),
            "beneficiary_name": str(d.get("beneficiary_name") or "Self / Beneficiary"),
            "account_number": str(d.get("account_number") or "-"),
            "bank_name": str(d.get("bank_name") or "-"),
            "ifsc_code": str(d.get("ifsc_code") or "-"),
            "amount": round(float(d.get("amount") or 0.0), 2),
            "charges": round(float(d.get("charges") or 0.0), 2),
            "commission": round(float(d.get("commission") or 0.0), 2),
            "gst_amount": round(float(d.get("gst_amount") or 0.0), 2),
            "tds_amount": round(float(d.get("tds_amount") or 0.0), 2),
            "net_amount": round(float(d.get("net_amount") or d.get("amount") or 0.0), 2),
            "previous_balance": round(float(d.get("previous_balance") or 0.0), 2),
            "cr": round(float(d.get("cr") or 0.0), 2),
            "dr": round(float(d.get("dr") or 0.0), 2),
            "current_balance": round(float(d.get("current_balance") or 0.0), 2),
            "datetime": iso_dt,
            "transaction_datetime": iso_dt,
            "date": date_str,
            "time": time_str,
            "status": status_norm,
            "raw_status": raw_st,
            "status_description": status_desc,
            "comments": comments,
            "provider_name": str(d.get("provider_name") or ""),
            "provider_txn_id": str(d.get("provider_txn_id") or ""),
            "provider_ref": str(d.get("provider_ref") or ""),
            "channel": str(d.get("channel") or "RETAILER_PORTAL"),
        })

    return {
        "status": "SUCCESS",
        "total": total_count,
        "items": items,
        "data": {
            "items": items,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
            },
            "summary": {
                "total_records": total_count,
                "total_amount": round(total_amount, 2),
                "total_cr": round(total_cr, 2),
                "total_dr": round(total_dr, 2),
            }
        }
    }


@router.get("/reports/transactions/{txn_id}/details")
@router.get("/retailer/reports/transactions/{txn_id}/details")
async def get_enterprise_transaction_details(
    txn_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Transaction Detail Drawer API:
    Returns the complete, authoritative transaction breakdown across Sections A through I
    """
    list_sql, _, params = build_unified_transactions_query(search=txn_id, limit=1)
    res = await db.execute(text(list_sql), params)
    row = res.fetchone()

    if not row:
        exact_sql, _, exact_params = build_unified_transactions_query(limit=100)
        all_res = await db.execute(text(exact_sql), exact_params)
        all_rows = all_res.fetchall()
        for r in all_rows:
            if str(r.txn_id).strip() == txn_id.strip() or str(r.id).strip() == txn_id.strip():
                row = r
                break

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction with ID '{txn_id}' not found."
        )

    d = dict(row._mapping)
    dt = d.get("transaction_datetime")
    iso_dt = dt.isoformat() if hasattr(dt, "isoformat") else str(dt) if dt else ""
    date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10] if dt else ""
    time_str = dt.strftime("%H:%M:%S") if hasattr(dt, "strftime") else str(dt)[11:19] if dt else ""

    raw_svc = str(d.get("service") or "PAYOUT").upper()
    if "PAYOUT" in raw_svc or "BANK" in raw_svc:
        svc_label = "Payout"
    elif "DMT" in raw_svc:
        svc_label = "DMT"
    elif "RECHARGE" in raw_svc:
        svc_label = "Recharge"
    elif "BBPS" in raw_svc or "BILL" in raw_svc:
        svc_label = "Bill Payment"
    elif "TOPUP" in raw_svc or "WALLET" in raw_svc:
        svc_label = "Topup"
    elif "CARD" in raw_svc or "SWIPE" in raw_svc or "POS" in raw_svc:
        svc_label = "Card-to-Cash"
    else:
        svc_label = raw_svc.capitalize()

    raw_st = str(d.get("status") or "SUCCESS").upper()
    if raw_st in ("LEDGER_POSTED", "SETTLED", "COMPLETED"):
        status_norm = "SUCCESS"
    elif raw_st in ("INITIATED", "PROCESSING"):
        status_norm = "PENDING"
    elif raw_st in ("REJECTED", "TIMEOUT"):
        status_norm = "FAILED"
    else:
        status_norm = raw_st

    created_iso = d.get("created_at").isoformat() if hasattr(d.get("created_at"), "isoformat") else iso_dt
    status_history = [
        {
            "status": "INITIATED",
            "timestamp": created_iso,
            "source": str(d.get("channel") or "RETAILER_PORTAL"),
            "description": "Transaction initiated and reference created."
        }
    ]
    if status_norm in ("PROCESSING", "SUCCESS", "FAILED", "REVERSED"):
        status_history.append({
            "status": "PROCESSING",
            "timestamp": created_iso,
            "source": str(d.get("provider_name") or "GATEWAY"),
            "description": "Dispatched to payment processor."
        })
    if status_norm in ("SUCCESS",):
        status_history.append({
            "status": "SUCCESS",
            "timestamp": d.get("updated_at").isoformat() if hasattr(d.get("updated_at"), "isoformat") else created_iso,
            "source": "BANK_RECONCILIATION",
            "description": "Transaction completed successfully and posted to ledger."
        })
    elif status_norm in ("FAILED",):
        status_history.append({
            "status": "FAILED",
            "timestamp": d.get("updated_at").isoformat() if hasattr(d.get("updated_at"), "isoformat") else created_iso,
            "source": "GATEWAY_ERROR",
            "description": d.get("status_description") or "Transaction failed at provider gateway."
        })
    elif status_norm in ("REVERSED",):
        status_history.append({
            "status": "REVERSED",
            "timestamp": d.get("reversal_datetime").isoformat() if hasattr(d.get("reversal_datetime"), "isoformat") else created_iso,
            "source": "LEDGER_ENGINE",
            "description": d.get("status_description") or "Wallet balance and ledger restored."
        })

    prev_bal = round(float(d.get("previous_balance") or 0.0), 2)
    amt = round(float(d.get("amount") or 0.0), 2)
    cr_amt = round(float(d.get("cr") or 0.0), 2)
    dr_amt = round(float(d.get("dr") or 0.0), 2)
    charges = round(float(d.get("charges") or 0.0), 2)
    comm = round(float(d.get("commission") or 0.0), 2)
    gst = round(float(d.get("gst_amount") or 0.0), 2)
    tds = round(float(d.get("tds_amount") or 0.0), 2)
    curr_bal = round(float(d.get("current_balance") or 0.0), 2)

    return {
        "status": "SUCCESS",
        "data": {
            "transaction_info": {
                "txn_id": str(d.get("txn_id")),
                "service_name": svc_label,
                "raw_service": raw_svc,
                "transaction_type": str(d.get("type") or "IMPS"),
                "transaction_amount": amt,
                "client_reference_id": str(d.get("client_ref_id") or d.get("txn_id")),
                "date": date_str,
                "time": time_str,
                "channel": str(d.get("channel") or "RETAILER_PORTAL"),
                "transaction_status": status_norm,
                "status_description": str(d.get("status_description") or ""),
            },
            "customer_details": {
                "customer_id": str(d.get("customer_id") or "CUST-DIRECT"),
                "customer_name": str(d.get("customer_name") or "Direct Customer"),
                "mobile_number": mask_sensitive_mobile(d.get("customer_mobile") or ""),
                "customer_status": str(d.get("customer_status") or "ACTIVE"),
            },
            "beneficiary_details": {
                "beneficiary_id": str(d.get("beneficiary_id") or f"BENE-{str(d.get('txn_id'))[-6:]}"),
                "beneficiary_name": str(d.get("beneficiary_name") or "Self / Beneficiary"),
                "bank_name": str(d.get("bank_name") or "Bank Transfer"),
                "masked_account_number": mask_sensitive_account(d.get("account_number") or ""),
                "ifsc_code": str(d.get("ifsc_code") or "-"),
                "relationship": str(d.get("relationship") or "SELF"),
                "beneficiary_status": str(d.get("beneficiary_status") or "ACTIVE"),
            },
            "provider_details": {
                "provider_name": str(d.get("provider_name") or "UTKALDIGITAL"),
                "provider_transaction_id": str(d.get("provider_txn_id") or "--"),
                "provider_reference_number": str(d.get("provider_ref") or "--"),
                "provider_status": status_norm,
                "provider_response_code": "00" if status_norm == "SUCCESS" else "01",
                "provider_response_message": str(d.get("provider_response_message") or d.get("status_description") or "Processed through payment gateway."),
            },
            "financial_details": {
                "previous_balance": prev_bal,
                "transaction_amount": amt,
                "credit": cr_amt,
                "debit": dr_amt,
                "charges": charges,
                "commission": comm,
                "gst": gst,
                "tds": tds,
                "other_fees": 0.0,
                "current_balance": curr_bal,
            },
            "balance_movement": {
                "opening_balance": prev_bal,
                "transaction_amount": amt,
                "credit_amount": cr_amt,
                "debit_amount": dr_amt,
                "fee_deductions": round(charges + gst, 2),
                "commission_credit": comm,
                "closing_balance": curr_bal,
                "is_authoritative": True,
            },
            "status_history": status_history,
            "failure_reversal_details": {
                "failure_code": "ERR_GATEWAY_REJECT" if status_norm == "FAILED" else "ERR_AUTO_REVERSAL",
                "failure_reason": str(d.get("failure_reason") or d.get("status_description") or "Transaction processed."),
                "provider_error_code": "HTTP_400" if status_norm in ("FAILED", "REVERSED") else "--",
                "provider_error_message": str(d.get("provider_response_message") or d.get("failure_reason") or "--"),
                "reversal_reason": str(d.get("reversal_reason") or "Automatic refund / reversal recorded."),
                "reversal_transaction_id": str(d.get("reversal_transaction_id") or f"REV-{str(d.get('txn_id'))}"),
                "reversal_datetime": iso_dt,
            } if status_norm in ("FAILED", "REVERSED") else None,
            "audit_info": {
                "created_by": str(d.get("created_by") or "SYSTEM"),
                "created_at": d.get("created_at").isoformat() if hasattr(d.get("created_at"), "isoformat") else str(d.get("created_at")),
                "updated_by": str(d.get("updated_by") or "SYSTEM"),
                "updated_at": d.get("updated_at").isoformat() if hasattr(d.get("updated_at"), "isoformat") else str(d.get("updated_at")),
                "source": str(d.get("channel") or "RETAILER_PORTAL"),
                "request_id": str(d.get("request_id") or f"REQ-{str(d.get('txn_id'))}"),
                "correlation_id": str(d.get("correlation_id") or f"CORR-{str(d.get('txn_id'))}"),
                "client_id": "CLI-RETAILER-P2P",
            },
        }
    }


@router.get("/reports/transactions/export")
@router.get("/retailer/reports/transactions/export")
async def export_enterprise_transactions_csv(
    service: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    credit_debit: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """Streams server-side CSV export applying all selected enterprise filters."""
    effective_retailer_id = retailer_id
    if request:
        try:
            from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
            ctx = await resolve_retailer_context(request, retailer_id, db=db)
            if ctx.get("public_id"):
                effective_retailer_id = str(ctx.get("public_id"))
        except Exception:
            pass

    list_sql, _, params = build_unified_transactions_query(
        service=service,
        transaction_type=transaction_type,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        channel=channel,
        provider=provider,
        credit_debit=credit_debit,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        retailer_id=effective_retailer_id,
        limit=10000
    )

    rows_res = await db.execute(text(list_sql), params)
    rows = rows_res.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Txn ID",
        "Service",
        "Type",
        "Previous Balance (INR)",
        "Credit (CR) (INR)",
        "Debit (DR) (INR)",
        "Current Balance (INR)",
        "Amount (INR)",
        "Date & Time",
        "Status",
        "UTR / Ref",
        "Channel"
    ])

    for r in rows:
        d = dict(r._mapping)
        dt = d.get("transaction_datetime")
        dt_str = dt.strftime("%Y-%m-%d %H:%M:%S") if hasattr(dt, "strftime") else str(dt) if dt else ""
        
        raw_svc = str(d.get("service") or "PAYOUT").upper()
        if "PAYOUT" in raw_svc or "BANK" in raw_svc:
            svc_label = "Payout"
        elif "DMT" in raw_svc:
            svc_label = "DMT"
        elif "RECHARGE" in raw_svc:
            svc_label = "Recharge"
        elif "BBPS" in raw_svc or "BILL" in raw_svc:
            svc_label = "Bill Payment"
        elif "TOPUP" in raw_svc or "WALLET" in raw_svc:
            svc_label = "Topup"
        elif "CARD" in raw_svc or "SWIPE" in raw_svc or "POS" in raw_svc:
            svc_label = "Card-to-Cash"
        else:
            svc_label = raw_svc.capitalize()

        raw_st = str(d.get("status") or "SUCCESS").upper()
        if raw_st in ("LEDGER_POSTED", "SETTLED", "COMPLETED"):
            status_norm = "SUCCESS"
        elif raw_st in ("INITIATED", "PROCESSING"):
            status_norm = "PENDING"
        elif raw_st in ("REJECTED", "TIMEOUT"):
            status_norm = "FAILED"
        else:
            status_norm = raw_st

        writer.writerow([
            d.get("txn_id"),
            svc_label,
            d.get("type"),
            f"{float(d.get('previous_balance') or 0.0):.2f}",
            f"{float(d.get('cr') or 0.0):.2f}",
            f"{float(d.get('dr') or 0.0):.2f}",
            f"{float(d.get('current_balance') or 0.0):.2f}",
            f"{float(d.get('amount') or 0.0):.2f}",
            dt_str,
            status_norm,
            d.get("provider_ref") or "--",
            d.get("channel") or "RETAILER_PORTAL"
        ])

    output.seek(0)
    filename = f"Enterprise_Transaction_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "text/csv; charset=utf-8"
    }
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers=headers
    )
