import asyncio
import traceback
from app.core.database import AsyncSessionLocal
from app.application.policy_service import PolicyService
from app.application.policy_dtos import PolicyCreateRequest

async def run():
    async with AsyncSessionLocal() as db:
        try:
            req = PolicyCreateRequest(
                policy_code='POL_TEST_001',
                policy_name='Test Policy',
                policy_category='LIMIT',
                scope_level='PLATFORM'
            )
            p = await PolicyService.create_policy(db, req)
            print("CREATED POLICY SUCCESS:", p)
        except Exception:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())
