with open("/home/ubuntu/pay2pay/backend/app/main.py", "r") as f:
    content = f.read()

# Replace table creation block in startup with a pass/print
old_block = """    try:
        async def _create_tables():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        await asyncio.wait_for(_create_tables(), timeout=5.0)
    except asyncio.TimeoutError:
        print("[STARTUP DB WARNING] Table creation timed out (DB may be locked) — continuing startup.")
    except Exception as e:
        print(f"[STARTUP DB WARNING] Table creation notice: {str(e)}")"""

new_block = """    print("[STARTUP DB] Skipping DDL create_all for instant startup")"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("/home/ubuntu/pay2pay/backend/app/main.py", "w") as f:
        f.write(content)
    print("Successfully removed create_all from main.py startup!")
else:
    print("Could not find exact old_block, searching pattern...")
