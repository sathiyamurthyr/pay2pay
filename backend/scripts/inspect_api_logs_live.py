import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def inspect():
    async with AsyncSessionLocal() as session:
        # Check enterprise_api_log
        res = await session.execute(text("SELECT count(*) FROM enterprise_api_log"))
        total = res.scalar()
        print(f"Total rows in enterprise_api_log: {total}")
        
        # Get latest 10 rows
        res = await session.execute(text("SELECT id, log_code, service_name, api_name, direction, http_method, endpoint, provider_name, http_status_code, response_status, duration_ms, request_timestamp, created_date FROM enterprise_api_log ORDER BY id DESC LIMIT 10"))
        rows = res.fetchall()
        print(f"\nLatest 10 rows in enterprise_api_log:")
        for r in rows:
            print(dict(r._mapping))

if __name__ == '__main__':
    asyncio.run(inspect())
