import sqlite3
import uuid
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
os.chdir("/home/ubuntu/pay2pay/backend")

from dotenv import load_dotenv
load_dotenv(".env")

from app.core.security import hash_password

db_path = "/home/ubuntu/pay2pay/backend/pay2pay.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

USERS = [
    {"mobile_number": "9999999999", "full_name": "Platform Admin", "email": "admin@pay2pay.in", "password": "Admin@123", "role": "ADMIN"},
    {"mobile_number": "8888888888", "full_name": "Test Retailer", "email": "retailer@pay2pay.in", "password": "Retailer@123", "role": "RETAILER"}
]

now_str = datetime.now(timezone.utc).isoformat()
tenant_id = "00000000-0000-0000-0000-000000000001"

for u in USERS:
    cur.execute("SELECT id FROM auth_users WHERE mobile_number = ?;", (u["mobile_number"],))
    exists = cur.fetchone()
    if exists:
        print(f"User {u['mobile_number']} already exists, skipping")
        continue
    
    uid = str(uuid.uuid4())
    pub_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    pwd_hash = hash_password(u["password"])
    
    try:
        cur.execute("""
            INSERT INTO auth_users (
                id, public_id, tenant_id, user_id, mobile_number, full_name, email,
                password_hash, role, account_status, is_active, mfa_enabled, failed_attempts,
                record_status, is_deleted, version_no, created_date, updated_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (uid, pub_id, tenant_id, user_id, u["mobile_number"], u["full_name"], u["email"],
              pwd_hash, u["role"], "ACTIVE", 1, 0, 0, "ACTIVE", 0, 1, now_str, now_str))
        print(f"Created: {u['mobile_number']} ({u['role']})")
    except Exception as e:
        print(f"Error inserting {u['mobile_number']}: {e}")

conn.commit()
cur.execute("SELECT mobile_number, full_name, role, account_status, is_active FROM auth_users;")
rows = cur.fetchall()
print(f"\nAll auth_users ({len(rows)} total):")
for r in rows:
    print(f"  - {r}")

conn.close()
print("Done!")
