import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def run_sql():
    print("=== EXECUTING init_payout_routing.sql DIRECTLY VIA ASYNCPG ===")
    
    with open("scripts/init_payout_routing.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Split by semicolon statements
    statements = [s.strip() for s in sql_content.split(";") if s.strip()]
    
    async with AsyncSessionLocal() as session:
        for stmt in statements:
            print(f"Executing: {stmt[:60]}...")
            await session.execute(text(stmt))
        await session.commit()
    print("✅ All SQL statements executed and committed successfully!")

if __name__ == '__main__':
    asyncio.run(run_sql())
