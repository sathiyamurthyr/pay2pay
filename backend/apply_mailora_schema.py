"""
Apply mailora_schema.sql to Supabase using psycopg2 (sync driver).
Uses existing Supabase credentials from .env
"""
import os, sys
import io

DB_URL = "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

# Force stdout to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sql_path = os.path.join(os.path.dirname(__file__), "migrations", "mailora_schema.sql")

# Read and sanitize SQL: replace any remaining uuid_generate_v4 just in case
with open(sql_path, encoding="utf-8", errors="replace") as f:
    sql = f.read()

sql = sql.replace("uuid_generate_v4()", "gen_random_uuid()")

# Remove the CREATE EXTENSION line if present
sql = sql.replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '-- uuid-ossp not needed (using gen_random_uuid)')

try:
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    print("SUCCESS: mailora_schema.sql applied!")

    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'mailora' ORDER BY tablename;")
    tables = cur.fetchall()
    print(f"\nMailora tables created ({len(tables)}):")
    for t in tables:
        print(f"   - mailora.{t[0]}")

    cur.execute("SELECT tenant_ref_id, domain FROM mailora.tenants;")
    tenants = cur.fetchall()
    print(f"\nTenants seeded ({len(tenants)}):")
    for t in tenants:
        print(f"   - {t[0]} ({t[1]})")

    cur.execute("SELECT email_address FROM mailora.mailboxes ORDER BY email_address;")
    boxes = cur.fetchall()
    print(f"\nMailboxes registered ({len(boxes)}):")
    for b in boxes:
        print(f"   - {b[0]}")

    # Check views
    cur.execute("SELECT viewname FROM pg_views WHERE schemaname = 'mailora' ORDER BY viewname;")
    views = cur.fetchall()
    print(f"\nViews created ({len(views)}):")
    for v in views:
        print(f"   - mailora.{v[0]}")

    # Check functions
    cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'mailora' ORDER BY routine_name;")
    funcs = cur.fetchall()
    print(f"\nFunctions/SPs created ({len(funcs)}):")
    for f in funcs:
        print(f"   - mailora.{f[0]}()")

    cur.close()
    conn.close()
    print("\nAll done!")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
