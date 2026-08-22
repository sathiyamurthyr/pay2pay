import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def search():
    terms = ["1787388418343", "16578383", "TXN-1787388418343", "TXN16578383"]
    
    tables = [
        "enterprise_payout_transactions",
        "payout_workflow_transactions",
        "transactions",
        "transaction_ledger_entries",
        "enterprise_api_logs",
        "payout_beneficiaries",
        "retailer_wallet",
        "topup_requests"
    ]
    
    async with AsyncSessionLocal() as session:
        for t in tables:
            print(f"\n==================== TABLE: {t} ====================")
            try:
                # Get column names
                cols_res = await session.execute(text(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{t}'
                """))
                cols = [r[0] for r in cols_res.fetchall()]
                print(f"Columns in {t}: {cols}")
                
                # Check for matching records across all text columns
                where_clauses = []
                for c in cols:
                    where_clauses.append(f"{c}::text ILIKE :term")
                
                query_str = f"SELECT * FROM {t} WHERE " + " OR ".join(where_clauses) + " ORDER BY created_at DESC" if "created_at" in cols else f"SELECT * FROM {t} WHERE " + " OR ".join(where_clauses)
                
                for term in terms:
                    try:
                        res = await session.execute(text(query_str), {"term": f"%{term}%"})
                        rows = res.fetchall()
                        if rows:
                            print(f"  >>> MATCH FOUND for term '{term}' in {t} ({len(rows)} rows):")
                            for row in rows:
                                d = dict(row._mapping)
                                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
                    except Exception as e:
                        await session.rollback()
                        print(f"  Error searching term {term} in {t}: {e}")
                        
            except Exception as e:
                await session.rollback()
                print(f"Error inspecting table {t}: {e}")

        # Also print latest 10 rows in enterprise_payout_transactions
        print("\n==================== LATEST 10 ENTERPRISE PAYOUT TRANSACTIONS ====================")
        try:
            res = await session.execute(text("SELECT * FROM enterprise_payout_transactions ORDER BY created_at DESC LIMIT 10"))
            rows = res.fetchall()
            for r in rows:
                print(json.dumps({k: str(v) for k, v in dict(r._mapping).items()}, indent=2))
        except Exception as e:
            await session.rollback()
            print("Error:", e)

        # Also print latest 10 rows in enterprise_api_logs
        print("\n==================== LATEST 10 ENTERPRISE API LOGS ====================")
        try:
            res = await session.execute(text("SELECT * FROM enterprise_api_logs ORDER BY created_at DESC LIMIT 10"))
            rows = res.fetchall()
            for r in rows:
                print(json.dumps({k: str(v) for k, v in dict(r._mapping).items()}, indent=2))
        except Exception as e:
            await session.rollback()
            print("Error:", e)

        # Also print latest 10 rows in transactions
        print("\n==================== LATEST 10 TRANSACTIONS ====================")
        try:
            res = await session.execute(text("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10"))
            rows = res.fetchall()
            for r in rows:
                print(json.dumps({k: str(v) for k, v in dict(r._mapping).items()}, indent=2))
        except Exception as e:
            await session.rollback()
            print("Error:", e)

if __name__ == '__main__':
    asyncio.run(search())
