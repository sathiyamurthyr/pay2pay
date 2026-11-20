import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Checking customer_service_configuration.company_ref_id...")
        await conn.execute(text("""
            ALTER TABLE customer_service_configuration 
            ADD COLUMN IF NOT EXISTS company_ref_id BIGINT NULL;
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_cust_svc_cfg_comp_ref 
            ON customer_service_configuration(company_ref_id);
        """))
        print("✅ Added company_ref_id to customer_service_configuration")

        print("Checking user_favorite_menu.company_ref_id...")
        await conn.execute(text("""
            ALTER TABLE user_favorite_menu 
            ADD COLUMN IF NOT EXISTS company_ref_id BIGINT NULL;
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_user_fav_comp_ref 
            ON user_favorite_menu(company_ref_id);
        """))
        print("✅ Added company_ref_id to user_favorite_menu")

        print("Applying deploy_service_availability_sp.sql...")
        with open("scripts/deploy_service_availability_sp.sql", "r", encoding="utf-8") as f:
            sql = f.read()

        raw_conn = await engine.raw_connection()
        await raw_conn.connection._connection.execute(sql)
        print("✅ Stored procedures compiled successfully in PostgreSQL!")

    async with engine.connect() as conn:
        res1 = await conn.execute(text("SELECT * FROM sp_get_all_platform_services_status(2);"))
        rows1 = res1.fetchall()
        print(f"✅ sp_get_all_platform_services_status(2) returned {len(rows1)} rows: {rows1}")

        res2 = await conn.execute(text("SELECT * FROM sp_get_all_platform_services_status(47);"))
        rows2 = res2.fetchall()
        print(f"✅ sp_get_all_platform_services_status(47) returned {len(rows2)} rows: {rows2}")

if __name__ == "__main__":
    asyncio.run(migrate())
