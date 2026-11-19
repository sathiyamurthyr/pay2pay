import subprocess
import os

files = [
    ("backend/app/application/payin_dtos.py", "/app/app/application/payin_dtos.py"),
    ("backend/app/application/payin_config_service.py", "/app/app/application/payin_config_service.py"),
    ("backend/app/application/payin_mdr_service.py", "/app/app/application/payin_mdr_service.py"),
    ("backend/app/presentation/api/v1/admin_payin_router.py", "/app/app/presentation/api/v1/admin_payin_router.py"),
    ("backend/app/presentation/api/v1/payin_router.py", "/app/app/presentation/api/v1/payin_router.py"),
    ("backend/app/presentation/api/v1/retailer_dashboard_router.py", "/app/app/presentation/api/v1/retailer_dashboard_router.py"),
    ("backend/tests/test_company_vendor_card_mdr.py", "/app/test_company_vendor_card_mdr.py"),
]

key_path = os.path.expandvars(r"%USERPROFILE%\.ssh\id_ed25519_vps")

for local_path, remote_container_path in files:
    filename = os.path.basename(local_path)
    tmp_path = f"/tmp/{filename}"
    print(f"Copying {local_path} -> {tmp_path}")
    subprocess.run(["scp", "-P", "55002", "-i", key_path, "-o", "StrictHostKeyChecking=no", local_path, f"sathiya@157.20.172.186:{tmp_path}"], check=True)
    print(f"Docker copying {tmp_path} -> near4you-retailer-backend:{remote_container_path}")
    subprocess.run(["ssh", "-p", "55002", "-i", key_path, "-o", "StrictHostKeyChecking=no", "sathiya@157.20.172.186", f"docker cp {tmp_path} near4you-retailer-backend:{remote_container_path}"], check=True)

print("Restarting near4you-retailer-backend...")
subprocess.run(["ssh", "-p", "55002", "-i", key_path, "-o", "StrictHostKeyChecking=no", "sathiya@157.20.172.186", "docker restart near4you-retailer-backend"], check=True)
print("Deployment to backend container complete!")
