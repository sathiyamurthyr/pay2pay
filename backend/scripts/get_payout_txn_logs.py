import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def search_logs():
    txn_query = "TXN-1787388418343"
    ref_query = "TXN16578383"
    
    print(f"=== SEARCHING DATABASE FOR TXN: {txn_query} AND REF: {ref_query} ===\n")
    
    async with AsyncSessionLocal() as session:
        # 1. Check transactions table
        print("--- 1. TRANSACTIONS TABLE ---")
        try:
            res = await session.execute(
                text("""
                    SELECT * FROM transactions 
                    WHERE transaction_reference ILIKE :q1 OR transaction_reference ILIKE :q2
                       OR request_id ILIKE :q1 OR request_id ILIKE :q2
                       OR utr ILIKE :q1 OR utr ILIKE :q2
                       OR public_id::text ILIKE :q1 OR public_id::text ILIKE :q2
                       OR metadata_json::text ILIKE :q1 OR metadata_json::text ILIKE :q2
                """),
                {"q1": f"%{txn_query}%", "q2": f"%{ref_query}%"}
            )
            txns = res.fetchall()
            print(f"Found {len(txns)} matches in transactions table.")
            for t in txns:
                d = dict(t._mapping)
                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
        except Exception as e:
            print("Error in transactions table:", e)

        # 2. Check enterprise_payout_transactions table
        print("\n--- 2. ENTERPRISE_PAYOUT_TRANSACTIONS TABLE ---")
        try:
            res = await session.execute(
                text("""
                    SELECT * FROM enterprise_payout_transactions
                    WHERE transaction_reference ILIKE :q1 OR transaction_reference ILIKE :q2
                       OR client_reference_id ILIKE :q1 OR client_reference_id ILIKE :q2
                       OR bank_reference_number ILIKE :q1 OR bank_reference_number ILIKE :q2
                       OR payout_reference_id ILIKE :q1 OR payout_reference_id ILIKE :q2
                       OR id::text ILIKE :q1 OR id::text ILIKE :q2
                       OR metadata_json::text ILIKE :q1 OR metadata_json::text ILIKE :q2
                """),
                {"q1": f"%{txn_query}%", "q2": f"%{ref_query}%"}
            )
            p_txns = res.fetchall()
            print(f"Found {len(p_txns)} matches in enterprise_payout_transactions table.")
            for pt in p_txns:
                d = dict(pt._mapping)
                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
        except Exception as e:
            print("Error querying enterprise_payout_transactions:", e)

        # 3. Check payout_workflow_transactions table
        print("\n--- 3. PAYOUT_WORKFLOW_TRANSACTIONS TABLE ---")
        try:
            res = await session.execute(
                text("""
                    SELECT * FROM payout_workflow_transactions
                    WHERE transaction_reference ILIKE :q1 OR transaction_reference ILIKE :q2
                       OR client_ref_id ILIKE :q1 OR client_ref_id ILIKE :q2
                       OR utr ILIKE :q1 OR utr ILIKE :q2
                       OR operator_ref ILIKE :q1 OR operator_ref ILIKE :q2
                       OR id::text ILIKE :q1 OR id::text ILIKE :q2
                       OR raw_response::text ILIKE :q1 OR raw_response::text ILIKE :q2
                       OR payload::text ILIKE :q1 OR payload::text ILIKE :q2
                """),
                {"q1": f"%{txn_query}%", "q2": f"%{ref_query}%"}
            )
            pw_txns = res.fetchall()
            print(f"Found {len(pw_txns)} matches in payout_workflow_transactions table.")
            for pwt in pw_txns:
                d = dict(pwt._mapping)
                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
        except Exception as e:
            print("Error querying payout_workflow_transactions:", e)

        # 4. Check transaction_ledger_entries table
        print("\n--- 4. TRANSACTION_LEDGER_ENTRIES TABLE ---")
        try:
            res = await session.execute(
                text("""
                    SELECT * FROM transaction_ledger_entries
                    WHERE transaction_reference ILIKE :q1 OR transaction_reference ILIKE :q2
                       OR narration ILIKE :q1 OR narration ILIKE :q2
                """),
                {"q1": f"%{txn_query}%", "q2": f"%{ref_query}%"}
            )
            ledgers = res.fetchall()
            print(f"Found {len(ledgers)} matches in transaction_ledger_entries table.")
            for l in ledgers:
                d = dict(l._mapping)
                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
        except Exception as e:
            print("Error querying transaction_ledger_entries:", e)

        # 5. Check enterprise_api_logs table
        print("\n--- 5. ENTERPRISE_API_LOGS TABLE ---")
        try:
            res = await session.execute(
                text("""
                    SELECT * FROM enterprise_api_logs
                    WHERE endpoint ILIKE :q1 OR endpoint ILIKE :q2
                       OR request_payload::text ILIKE :q1 OR request_payload::text ILIKE :q2
                       OR response_payload::text ILIKE :q1 OR response_payload::text ILIKE :q2
                       OR correlation_id ILIKE :q1 OR correlation_id ILIKE :q2
                       OR query_params::text ILIKE :q1 OR query_params::text ILIKE :q2
                    ORDER BY created_at DESC
                """),
                {"q1": f"%{txn_query}%", "q2": f"%{ref_query}%"}
            )
            logs = res.fetchall()
            print(f"Found {len(logs)} matches in enterprise_api_logs table.")
            for log in logs:
                d = dict(log._mapping)
                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
        except Exception as e:
            print("Error querying enterprise_api_logs:", e)

        # 6. Check generic search across all tables if not found
        print("\n--- 6. SEARCHING RECENT PAYOUTS ---")
        try:
            res = await session.execute(
                text("""
                    SELECT id, transaction_reference, client_reference_id, bank_reference_number, payout_reference_id, amount, status, status_description, created_at, metadata_json
                    FROM enterprise_payout_transactions
                    ORDER BY created_at DESC LIMIT 5
                """)
            )
            recent_p = res.fetchall()
            print(f"Most recent 5 enterprise payouts:")
            for rp in recent_p:
                print(dict(rp._mapping))
        except Exception as e:
            print("Error querying recent payouts:", e)

if __name__ == '__main__':
    asyncio.run(search_logs())
