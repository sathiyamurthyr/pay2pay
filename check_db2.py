import sqlite3
conn = sqlite3.connect('/home/ubuntu/pay2pay/backend/pay2pay.db')
cur = conn.cursor()
# List all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = cur.fetchall()
print("TABLES:", [t[0] for t in tables])

# Check auth_users count
try:
    cur.execute("SELECT COUNT(*) FROM auth_users;")
    count = cur.fetchone()[0]
    print(f"auth_users count: {count}")
    if count > 0:
        cur.execute("SELECT mobile_number, email, role, is_active, created_at FROM auth_users LIMIT 5;")
        for r in cur.fetchall():
            print(r)
except Exception as e:
    print(f"Error: {e}")
conn.close()
