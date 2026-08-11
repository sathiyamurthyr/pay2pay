import sqlite3
conn = sqlite3.connect('/home/ubuntu/pay2pay/backend/pay2pay.db')
cur = conn.cursor()
cur.execute('SELECT id, mobile_number, email, is_active FROM auth_users LIMIT 10;')
rows = cur.fetchall()
for r in rows:
    print(r)
conn.close()
