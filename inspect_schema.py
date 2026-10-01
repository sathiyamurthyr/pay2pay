"""
Inspect schema of super_distributor, distributor, retailer tables
"""
import psycopg2

conn = psycopg2.connect(
    "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres",
    connect_timeout=15
)
cur = conn.cursor()

for table in ["super_distributor", "distributor", "retailer"]:
    cur.execute(f"""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '{table}' AND table_schema = 'public'
        ORDER BY ordinal_position
    """)
    cols = cur.fetchall()
    print(f"\n=== {table} ({len(cols)} columns) ===")
    for c in cols:
        nullable = "" if c[2] == "YES" else " NOT NULL"
        default = f" DEFAULT {c[3]}" if c[3] else ""
        print(f"  {c[0]:35s} {c[1]}{nullable}{default}")

# Also get sample row from super_distributor
print("\n=== Sample super_distributor rows ===")
cur.execute("SELECT id, public_id, name, code, status, company_id FROM super_distributor LIMIT 5")
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()
