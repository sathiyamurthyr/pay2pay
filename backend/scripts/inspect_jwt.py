import requests
from app.core.security import decode_access_token

BASE_URL = "http://127.0.0.1:8000"

admin_login_res = requests.post(
    f"{BASE_URL}/api/v1/auth/enterprise/login-password",
    json={"mobile_number": "9176669426", "password": "Admin#2026"}
)
admin_token = admin_login_res.json()["data"]["access_token"]
payload = decode_access_token(admin_token)
print("Decoded JWT payload:", payload)
