import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from scripts.insert_past_payout_logs_into_api_log import insert_logs

async def clean():
    print("=== CLEANING RECURSIVE POLLING LOGS FROM ENTERPRISE_API_LOG ===")
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("""
            DELETE FROM enterprise_api_log 
            WHERE endpoint ILIKE '%/api-logs%' 
               OR endpoint ILIKE '%/session/audit%' 
               OR endpoint ILIKE '%/bpm/approvals%'
        """))
        await session.commit()
        print(f"Deleted {res.rowcount} internal polling rows.")
        
    await insert_logs()
    
    # Verify count and latest rows
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT count(*) FROM enterprise_api_log"))
        print(f"Current clean log count in enterprise_api_log: {res.scalar()}")
        
        res = await session.execute(text("SELECT log_code, service_name, direction, endpoint, provider_name, response_status, duration_ms, request_id FROM enterprise_api_log ORDER BY id DESC LIMIT 10"))
        print("\nLatest 10 API Logs:")
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == '__main__':
    asyncio.run(clean())
