"""
Create test distributor under P2P-SD338992 (Sathus Super Distribution Master Hub)
and test retailer under that distributor. Names end with "-test".
"""
import psycopg2
import uuid
import random
from datetime import datetime, timezone

conn = psycopg2.connect(
    "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres",
    connect_timeout=15
)
conn.autocommit = False
cur = conn.cursor()

# SD reference data (P2P-SD338992 = Sathus Super Distribution Master Hub)
SD_PUBLIC_ID     = "3e9bf2ea-d105-4553-8e8e-8222a4285d24"
SD_REF_ID        = 2
TENANT_ID        = "fa480c2d-2725-43bd-a7ba-6fc60a89a1cb"
TENANT_REF_ID    = 39
COMPANY_ID       = "0bf4371b-4c74-4916-a817-61c203b353e8"
COMPANY_REF_ID   = 2

now = datetime.now(timezone.utc)

# --- Distributor code uses random 6-digit suffix (matches existing pattern) ---
dist_suffix     = str(random.randint(100000, 999999))
new_dist_code   = f"P2P-D{dist_suffix}-test"
new_dist_pub_id = str(uuid.uuid4())

# Next ref_id
cur.execute("SELECT COALESCE(MAX(distributor_ref_id), 0) + 1 FROM distributor")
next_dist_ref_id = cur.fetchone()[0]
print(f"Creating distributor: {new_dist_code} (ref_id={next_dist_ref_id})")

cur.execute("""
    INSERT INTO distributor (
        business_name, owner_name, mobile, email,
        wallet_balance, credit_limit,
        state, city, address, pincode,
        status, mapped_super_distributor_id,
        public_id, tenant_id, company_id,
        version_no, record_status, is_active, is_deleted,
        created_date, updated_date, created_by,
        distributor_code, distributor_ref_id,
        tenant_ref_id, company_ref_id, super_distributor_ref_id
    ) VALUES (
        %s, %s, %s, %s,
        0.0, 0.0,
        %s, %s, %s, %s,
        %s, %s,
        %s, %s, %s,
        1, 'ACTIVE', true, false,
        %s, %s, %s,
        %s, %s,
        %s, %s, %s
    ) RETURNING id, public_id, distributor_code
""", (
    "Test Distribution Hub-test",
    "Test Distributor Owner-test",
    "9000000098",
    "testdist.hub@pay2pay.in",
    "Tamil Nadu", "Chennai",
    "100 Test Street, Test Nagar",
    "600001",
    "ACTIVE",
    SD_PUBLIC_ID,
    new_dist_pub_id, TENANT_ID, COMPANY_ID,
    now, now, "admin@pay2pay.in",
    new_dist_code, next_dist_ref_id,
    TENANT_REF_ID, COMPANY_REF_ID, SD_REF_ID,
))
dist_row      = cur.fetchone()
dist_id       = dist_row[0]
dist_pub_id   = str(dist_row[1])
dist_code_out = dist_row[2]
print(f"[OK] Distributor: id={dist_id}, code={dist_code_out}, public_id={dist_pub_id}")

# Check junction table columns
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'super_distributor_distributor' AND table_schema = 'public'
    ORDER BY ordinal_position
""")
junc_cols = [r[0] for r in cur.fetchall()]
print(f"Junction super_distributor_distributor columns: {junc_cols}")

# Insert into junction if standard columns exist
if "super_distributor_id" in junc_cols and "distributor_id" in junc_cols:
    cur.execute("""
        INSERT INTO super_distributor_distributor (super_distributor_id, distributor_id)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (SD_REF_ID, dist_id))
    print("[OK] super_distributor_distributor junction inserted")

# --- Retailer ---
ret_suffix      = str(random.randint(100000, 999999))
new_ret_code    = f"P2P-R{ret_suffix}-test"
new_ret_pub_id  = str(uuid.uuid4())

cur.execute("SELECT COALESCE(MAX(retailer_ref_id), 0) + 1 FROM retailer")
next_ret_ref_id = cur.fetchone()[0]
print(f"Creating retailer: {new_ret_code} (ref_id={next_ret_ref_id})")

cur.execute("""
    INSERT INTO retailer (
        retailer_code, store_name, legal_name, owner_name,
        business_category, store_type, status,
        mapped_distributor_id, mapped_super_distributor_id,
        public_id, tenant_id, company_id,
        version_no, record_status, is_active, is_deleted,
        mpin_failed_attempts, mpin_max_attempts, mpin_locked,
        created_date, updated_date, created_by,
        retailer_ref_id, tenant_ref_id, company_ref_id,
        distributor_ref_id, super_distributor_ref_id
    ) VALUES (
        %s, %s, %s, %s,
        %s, %s, %s,
        %s, %s,
        %s, %s, %s,
        1, 'ACTIVE', true, false,
        0, 5, false,
        %s, %s, %s,
        %s, %s, %s,
        %s, %s
    ) RETURNING id, public_id, retailer_code
""", (
    new_ret_code,
    "Test Retail Store-test",
    "Test Retail Store-test",
    "Test Store Owner-test",
    "General", "RETAIL", "ACTIVE",
    dist_pub_id,
    SD_PUBLIC_ID,
    new_ret_pub_id, TENANT_ID, COMPANY_ID,
    now, now, "admin@pay2pay.in",
    next_ret_ref_id, TENANT_REF_ID, COMPANY_REF_ID,
    next_dist_ref_id, SD_REF_ID,
))
ret_row      = cur.fetchone()
ret_id       = ret_row[0]
ret_pub_id   = str(ret_row[1])
ret_code_out = ret_row[2]
print(f"[OK] Retailer: id={ret_id}, code={ret_code_out}, public_id={ret_pub_id}")

# Check distributor_retailer junction
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'distributor_retailer' AND table_schema = 'public'
    ORDER BY ordinal_position
""")
dr_cols = [r[0] for r in cur.fetchall()]
print(f"distributor_retailer columns: {dr_cols}")

if "distributor_id" in dr_cols and "retailer_id" in dr_cols:
    cur.execute("""
        INSERT INTO distributor_retailer (distributor_id, retailer_id)
        VALUES (%s, %s) ON CONFLICT DO NOTHING
    """, (dist_id, ret_id))
    print("[OK] distributor_retailer junction inserted")

conn.commit()
print("")
print("=" * 60)
print("COMMIT SUCCESSFUL!")
print("=" * 60)
print(f"  SD:          P2P-SD338992 - Sathus Super Distribution Master Hub")
print(f"  Distributor: {dist_code_out} - Test Distribution Hub-test")
print(f"  Retailer:    {ret_code_out} - Test Retail Store-test")
print("=" * 60)

cur.close()
conn.close()
