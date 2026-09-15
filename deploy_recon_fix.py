import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
ADMIN_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "admin"
BACKEND_DIR = BASE_DIR / "backend"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def package_admin():
    print(f"\n📦 Packaging Admin ({ADMIN_DIR})...")
    standalone_dir = ADMIN_DIR / ".next" / "standalone"
    static_src = ADMIN_DIR / ".next" / "static"
    public_src = ADMIN_DIR / "public"
    
    if not standalone_dir.exists():
        raise FileNotFoundError(f"Standalone dir {standalone_dir} does not exist. Run build first!")

    monorepo_app_dir = standalone_dir / "apps" / "admin"
    
    # Copy static assets
    for s_target in [standalone_dir / ".next" / "static", monorepo_app_dir / ".next" / "static"]:
        if static_src.exists():
            s_target.parent.mkdir(parents=True, exist_ok=True)
            if s_target.exists():
                shutil.rmtree(s_target)
            shutil.copytree(static_src, s_target)
            print(f"  -> Copied static assets to {s_target}")

    # Copy public assets
    for p_target in [standalone_dir / "public", monorepo_app_dir / "public"]:
        if public_src.exists():
            p_target.parent.mkdir(parents=True, exist_ok=True)
            if p_target.exists():
                shutil.rmtree(p_target)
            shutil.copytree(public_src, p_target)
            print(f"  -> Copied public assets to {p_target}")

    zip_path = BASE_DIR / "admin_deploy.zip"
    if zip_path.exists():
        zip_path.unlink()

    print(f"  -> Zipping {standalone_dir} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(standalone_dir):
            for file in files:
                full_path = Path(root) / file
                rel_path = full_path.relative_to(standalone_dir)
                z.write(full_path, str(rel_path))

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✅ Created admin_deploy.zip: {size_mb:.2f} MB")
    return zip_path

def package_backend():
    print(f"\n📦 Packaging Backend ({BACKEND_DIR})...")
    zip_path = BASE_DIR / "backend_deploy.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(BACKEND_DIR):
            dirs[:] = [d for d in dirs if d not in ('venv', '__pycache__', '.pytest_cache', '.git', 'node_modules', 'uploads', 'scratch')]
            for file in files:
                if file.endswith('.pyc') or file.endswith('.pyo') or file.startswith('.env'):
                    continue
                full_path = Path(root) / file
                rel_path = full_path.relative_to(BACKEND_DIR)
                z.write(full_path, str(rel_path))

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✅ Created backend_deploy.zip: {size_mb:.2f} MB")
    return zip_path

def deploy():
    admin_zip = package_admin()
    backend_zip = package_backend()

    print("\n🚀 Uploading deployment packages to 129.225.91.190 via SCP...")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{admin_zip}" "{backend_zip}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("✅ Uploaded deployment archives successfully!")

    print("\n🔄 Extracting packages and restarting services on production server...")
    remote_script = """#!/bin/bash
set -e

echo '=== 1. Deploying Admin Frontend (Port 3003) ==='
sudo rm -rf /home/ubuntu/pay2pay/admin/*
sudo unzip -q -o /home/ubuntu/admin_deploy.zip -d /home/ubuntu/pay2pay/admin/
if [ -f /home/ubuntu/pay2pay/admin/apps/admin/server.js ]; then
  cp /home/ubuntu/pay2pay/admin/apps/admin/server.js /home/ubuntu/pay2pay/admin/server.js || true
fi
if [ -d /home/ubuntu/pay2pay/admin/apps/admin/.next ]; then
  cp -r /home/ubuntu/pay2pay/admin/apps/admin/.next /home/ubuntu/pay2pay/admin/ || true
fi
if [ -d /home/ubuntu/pay2pay/admin/apps/admin/public ]; then
  cp -r /home/ubuntu/pay2pay/admin/apps/admin/public /home/ubuntu/pay2pay/admin/ || true
fi

echo '=== 2. Deploying Backend API ==='
sudo unzip -q -o /home/ubuntu/backend_deploy.zip -d /home/ubuntu/pay2pay/backend/

echo '=== 3. Setting Correct Ownership & Permissions ==='
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/admin /home/ubuntu/pay2pay/backend

echo '=== 4. Restarting Production Systemd Services ==='
sudo systemctl restart pay2pay-backend
sudo systemctl restart pay2pay-admin
sudo systemctl reload nginx || sudo systemctl restart nginx

sleep 4

echo '=== 5. Service Health Check ==='
sudo systemctl is-active pay2pay-backend
sudo systemctl is-active pay2pay-admin
curl -s -o /dev/null -w 'Admin (Port 3003) Status: %{http_code}\n' http://127.0.0.1:3003/admin/login || true
curl -s -o /dev/null -w 'Backend Docs (Port 8000) Status: %{http_code}\n' http://127.0.0.1:8000/docs || true
echo '=== Live Production Deployment Finished Successfully! ==='
"""

    import tempfile
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".sh", newline="\n") as f:
        f.write(remote_script)
        tmp_script_path = f.name

    subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, tmp_script_path, f"{SERVER_HOST}:/tmp/do_deploy_recon.sh"], check=True)
    res = subprocess.run(
        ["ssh", "-n", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, SERVER_HOST, "bash /tmp/do_deploy_recon.sh"],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    deploy()
