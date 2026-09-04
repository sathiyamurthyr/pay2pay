import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text
from app.application.payout_workflow_service import PayoutWorkflowService
import uuid

async def main():
    async with AsyncSessionLocal() as s:
        res = await s.execute(text('SELECT id, tenant_id, mobile_number, otp_code, channel, is_verified, attempts, expires_at FROM public.customer_otp WHERE id = 24'))
        row = dict(res.mappings().first())
        print("Record 24:", row)
        tid = row['tenant_id']
        
        # Test verifying with the actual service!
        try:
            v_res = await PayoutWorkflowService.verify_mobile_otp(s, tid, "9884465374", "257067")
            print("Verification test result:", v_res)
        except Exception as e:
            print("Verification raised exception:", type(e), e)

if __name__ == "__main__":
    asyncio.run(main())
