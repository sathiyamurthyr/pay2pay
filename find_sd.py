"""
Get SD schema and find P2P-SD338992, then create test distributor + retailer
"""
import psycopg2
import uuid
from datetime import datetime, timezone

conn = psycopg2.connect(
    "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres",
    connect_timeout=15
)
conn.autocommit = False
cur = conn.cursor()

# Get super_distributor columns
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'super_distributor' AND table_schema = 'public'
    ORDER BY ordinal_position
""")
sd_cols = [r[0] for r in cur.fetchall()]
print("super_distributor columns:", sd_cols)

# Get a sample SD row
cur.execute("SELECT * FROM super_distributor LIMIT 1")
row = cur.fetchone()
if row:
    for col, val in zip(sd_cols, row):
        print(f"  {col}: {val}")

# Find P2P-SD338992
print("\n=== Finding P2P-SD338992 ===")
cur.execute("""
    SELECT * FROM super_distributor
    WHERE super_distributor_code = 'P2P-SD338992'
       OR business_name ILIKE '%Sathus Super%'
    LIMIT 3
""")
sds = cur.fetchall()
for r in sds:
    for col, val in zip(sd_cols, r):
        print(f"  {col}: {val}")
    print("---")

cur.close()
conn.close()
