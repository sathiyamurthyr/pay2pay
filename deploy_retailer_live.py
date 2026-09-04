import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
RETAILER_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "retailer"
BACKEND_DIR = BASE_DIR / "backend"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def package_app(app_dir: Path, zip_name: str, app_rel_name: str):
    print(f"\n📦 Packaging {app_rel_name} ({app_dir})...")
    standalone_dir = app_dir / ".next" / "standalone"
    static_src = app_dir / ".next" / "static"
    public_src = app_dir / "public"
    
    if not standalone_dir.exists():
        raise FileNotFoundError(f"Standalone dir {standalone_dir} does not exist. Run build first!")

    monorepo_app_dir = standalone_dir / "apps" / app_rel_name
    
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

    zip_path = BASE_DIR / zip_name
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
    print(f"✅ Created {zip_name}: {size_mb:.2f} MB")
    return zip_path

def deploy_to_server(retailer_zip: Path):
    print("\n🚀 Uploading retailer package to 129.225.91.190 via SCP...")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{retailer_zip}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("✅ Uploaded retailer archive successfully!")

    print("\n🔄 Extracting packages and restarting services on production server...")
    remote_script = """#!/bin/bash
set -e
echo '=== 1. Deploying Retailer Frontend (Port 3000) ==='
sudo rm -rf /home/ubuntu/pay2pay/frontend/*
sudo unzip -q -o /home/ubuntu/retailer_deploy.zip -d /home/ubuntu/pay2pay/frontend/
if [ -f /home/ubuntu/pay2pay/frontend/apps/retailer/server.js ]; then
  cp /home/ubuntu/pay2pay/frontend/apps/retailer/server.js /home/ubuntu/pay2pay/frontend/server.js || true
fi
if [ -d /home/ubuntu/pay2pay/frontend/apps/retailer/.next ]; then
  cp -r /home/ubuntu/pay2pay/frontend/apps/retailer/.next /home/ubuntu/pay2pay/frontend/ || true
fi
if [ -d /home/ubuntu/pay2pay/frontend/apps/retailer/public ]; then
  cp -r /home/ubuntu/pay2pay/frontend/apps/retailer/public /home/ubuntu/pay2pay/frontend/ || true
fi

echo '=== 2. Setting Permissions & Restarting Frontend ==='
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/frontend
sudo systemctl restart pay2pay-frontend
sudo systemctl restart pay2pay-backend
sudo systemctl reload nginx || sudo systemctl restart nginx

sleep 3

echo '=== 3. Health Check ==='
sudo systemctl is-active pay2pay-frontend
sudo systemctl is-active pay2pay-backend
curl -s -o /dev/null -w 'Retailer (Port 3000) Status: %{http_code}\n' http://127.0.0.1:3000/retailer/login || true
echo '=== Deployment Done! ==='
"""

    import tempfile
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".sh", newline="\n") as f:
        f.write(remote_script)
        tmp_script_path = f.name

    subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, tmp_script_path, f"{SERVER_HOST}:/tmp/do_deploy_retailer.sh"], check=True)
    res = subprocess.run(["ssh", "-n", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, SERVER_HOST, "bash /tmp/do_deploy_retailer.sh"], stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    retailer_zip = package_app(RETAILER_DIR, "retailer_deploy.zip", "retailer")
    deploy_to_server(retailer_zip)
