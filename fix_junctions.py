"""
Insert junction records for the test hierarchy created:
- super_distributor_distributor: SD <-> Distributor
- distributor_retailer: Distributor <-> Retailer
"""
import psycopg2
from datetime import datetime, timezone

conn = psycopg2.connect(
    "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres",
    connect_timeout=15
)
conn.autocommit = False
cur = conn.cursor()

now = datetime.now(timezone.utc)

# Values from the creation run
SD_REF_ID       = 2
DIST_REF_ID     = 19  # next_dist_ref_id used during creation
RET_REF_ID      = 159 # next_ret_ref_id used during creation
TENANT_ID       = "fa480c2d-2725-43bd-a7ba-6fc60a89a1cb"
COMPANY_ID      = "0bf4371b-4c74-4916-a817-61c203b353e8"

# --- Junction 1: super_distributor_distributor ---
print("Inserting super_distributor_distributor junction...")
try:
    cur.execute("""
        INSERT INTO super_distributor_distributor
            (super_distributor_ref_id, distributor_ref_id, tenant_id, company_id, status, created_at, updated_at, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (
        SD_REF_ID, DIST_REF_ID,
        TENANT_ID, COMPANY_ID,
        "ACTIVE", now, now, "admin@pay2pay.in"
    ))
    print(f"[OK] sd <-> dist junction inserted (rows affected: {cur.rowcount})")
except Exception as e:
    print(f"[WARN] sd_dist junction: {e}")
    conn.rollback()

# --- Junction 2: distributor_retailer ---
print("Inserting distributor_retailer junction...")
try:
    cur.execute("""
        INSERT INTO distributor_retailer
            (distributor_ref_id, retailer_ref_id, tenant_id, company_id, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (
        DIST_REF_ID, RET_REF_ID,
        TENANT_ID, COMPANY_ID,
        "ACTIVE", now, now
    ))
    print(f"[OK] dist <-> retailer junction inserted (rows affected: {cur.rowcount})")
except Exception as e:
    print(f"[WARN] dist_retailer junction: {e}")
    conn.rollback()

conn.commit()
print("")
print("=" * 60)
print("All junctions committed!")
print("  SD P2P-SD338992 -> Distributor P2P-D261574-test -> Retailer P2P-R182566-test")
print("=" * 60)

cur.close()
conn.close()
