import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check_logs():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text('SELECT * FROM enterprise_api_log ORDER BY id DESC LIMIT 5'))
        for row in res.fetchall():
            print('--- LOG ENTRY ---')
            d = dict(row._mapping)
            for k, v in d.items():
                print(f"  {k}: {v}")

if __name__ == '__main__':
    asyncio.run(check_logs())
