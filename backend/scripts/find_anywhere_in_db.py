import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def find_all():
    terms = ["1787388418343", "16578383", "TXN16578383", "TXN-1787388418343"]
    
    async with AsyncSessionLocal() as session:
        # Get all tables in public schema
        t_res = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """))
        tables = [r[0] for r in t_res.fetchall()]
        print(f"Total tables to inspect in database: {len(tables)}")
        
        matches = []
        for t in tables:
            try:
                # get text columns
                c_res = await session.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{t}'
                """))
                cols = [r[0] for r in c_res.fetchall()]
                if not cols:
                    continue
                
                where_parts = [f"{c}::text ILIKE :term" for c in cols]
                sql = f"SELECT * FROM {t} WHERE " + " OR ".join(where_parts)
                
                for term in terms:
                    try:
                        res = await session.execute(text(sql), {"term": f"%{term}%"})
                        rows = res.fetchall()
                        if rows:
                            print(f"\n[FOUND MATCH in table `{t}` for term `{term}`] ({len(rows)} records):")
                            for row in rows:
                                d = dict(row._mapping)
                                print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
                                matches.append({"table": t, "term": term, "data": {k: str(v) for k, v in d.items()}})
                    except Exception as e:
                        await session.rollback()
            except Exception as e:
                await session.rollback()
                
        print(f"\nTotal matches across entire database: {len(matches)}")

if __name__ == '__main__':
    asyncio.run(find_all())
