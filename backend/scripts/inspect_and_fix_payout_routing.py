import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    print("=== INSPECTING PAYOUT ROUTING CONFIGURATION IN DB ===")
    async with AsyncSessionLocal() as session:
        # Check policy
        res = await session.execute(text("SELECT id, public_id, routing_mode, active_primary_provider, auto_failover_enabled FROM payout_routing_policy WHERE is_deleted = false"))
        policies = res.fetchall()
        print("Policies in DB:")
        for p in policies:
            print(dict(p._mapping))
            
        # Check Gateways
        res = await session.execute(text("SELECT id, public_id, provider_code, provider_name, status, priority, is_default, last_balance FROM payout_gateway_configs WHERE is_deleted = false ORDER BY priority ASC"))
        gws = res.fetchall()
        print("\nGateway Configs in DB:")
        for g in gws:
            print(dict(g._mapping))

if __name__ == '__main__':
    asyncio.run(check())
