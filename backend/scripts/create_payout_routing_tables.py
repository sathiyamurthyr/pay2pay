import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import text
from app.core.database import AsyncSessionLocal, engine, Base
from app.infrastructure.db.payout_routing_models import PayoutGatewayConfigModel, PayoutRoutingPolicyModel

async def init_routing_tables():
    print("=== INITIALIZING PAYOUT ROUTING TABLES ===")
    
    # 1. Create tables via metadata if not exists
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Base.metadata.create_all executed successfully.")

    # 2. Check and seed gateway configs & policy
    async with AsyncSessionLocal() as session:
        # Seed Policy
        res = await session.execute(text("SELECT count(*) FROM payout_routing_policies"))
        policy_count = res.scalar()
        if policy_count == 0:
            print("Seeding default Payout Routing Policy with UTKALDIGITAL as primary...")
            await session.execute(text("""
                INSERT INTO payout_routing_policies (
                    public_id, tenant_id, company_id, routing_mode,
                    active_primary_provider, auto_failover_enabled,
                    failover_threshold_failures, updated_by, updated_at,
                    is_active, is_deleted, created_date, updated_date
                ) VALUES (
                    :pid, '547aa7bb-a790-4fe2-bd5b-27214ed176c8', '18b39add-0860-4a2d-8289-bc698da8e966',
                    'PRIORITY', 'UTKALDIGITAL', true, 3, 'SYSTEM', NOW(), true, false, NOW(), NOW()
                )
            """), {"pid": str(uuid.uuid4())})
        else:
            # Update active primary provider to UTKALDIGITAL
            await session.execute(text("""
                UPDATE payout_routing_policies 
                SET active_primary_provider = 'UTKALDIGITAL'
                WHERE is_deleted = false
            """))

        # Seed Gateway Configs
        gateways = [
            {
                "code": "UTKALDIGITAL",
                "name": "Utkal Digital Payout API",
                "url": "https://singleptxn.utkaldigital.co.in",
                "cid": "a9f9d5c1752e49e08a",
                "sec": "995184",
                "priority": 1,
                "is_def": True,
                "bal": 80768.50
            },
            {
                "code": "WOWPE",
                "name": "WowPe Payout Gateway",
                "url": "https://api.wowpe.in",
                "cid": "40c86a1c-pay2pay-prod-client-id",
                "sec": "e91650d0-pay2pay-prod-secret-key",
                "priority": 2,
                "is_def": False,
                "bal": 85450.0
            },
            {
                "code": "BULKPE",
                "name": "BulkPe Payout Gateway",
                "url": "https://api.bulkpe.in/client",
                "cid": "bulkpe_client_id_live",
                "sec": "bulkpe_sec_key",
                "priority": 3,
                "is_def": False,
                "bal": 45200.0
            }
        ]

        for gw in gateways:
            chk = await session.execute(text("SELECT id FROM payout_gateway_configs WHERE provider_code = :code"), {"code": gw["code"]})
            if not chk.fetchone():
                print(f"Seeding gateway config: {gw['code']}")
                await session.execute(text("""
                    INSERT INTO payout_gateway_configs (
                        public_id, tenant_id, company_id, provider_code,
                        provider_name, base_url, client_id, secret_key,
                        status, priority, is_default, supports_imps,
                        supports_neft, supports_rtgs, supports_upi,
                        supports_account_validation, daily_limit,
                        current_day_volume, success_rate, last_balance,
                        last_balance_checked_at, last_health_check_at,
                        notes, is_active, is_deleted, created_date, updated_date
                    ) VALUES (
                        :pid, '547aa7bb-a790-4fe2-bd5b-27214ed176c8', '18b39add-0860-4a2d-8289-bc698da8e966',
                        :code, :name, :url, :cid, :sec, 'ACTIVE', :priority, :is_def,
                        true, true, true, true, true, 10000000.0, 0.0, 99.85, :bal,
                        NOW(), NOW(), 'Live gateway integration', true, false, NOW(), NOW()
                    )
                """), {
                    "pid": str(uuid.uuid4()),
                    "code": gw["code"],
                    "name": gw["name"],
                    "url": gw["url"],
                    "cid": gw["cid"],
                    "sec": gw["sec"],
                    "priority": gw["priority"],
                    "is_def": gw["is_def"],
                    "bal": gw["bal"]
                })
            else:
                # Update priority
                await session.execute(text("""
                    UPDATE payout_gateway_configs 
                    SET priority = :priority, is_default = :is_def, status = 'ACTIVE'
                    WHERE provider_code = :code
                """), {"code": gw["code"], "priority": gw["priority"], "is_def": gw["is_def"]})

        await session.commit()
        print("✅ Payout routing policy & gateway tables initialized successfully!")

if __name__ == '__main__':
    asyncio.run(init_routing_tables())
