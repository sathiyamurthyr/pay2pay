import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
SD_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "super-distributor"
DIST_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "distributor"
RETAILER_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "retailer"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def package_app(app_dir: Path, zip_name: str, app_rel_name: str) -> Path:
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
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(standalone_dir):
            for file in files:
                if file.endswith((".zip", ".tar.gz", ".tsbuildinfo")):
                    continue
                full_path = Path(root) / file
                rel_path = full_path.relative_to(standalone_dir)
                z.write(full_path, str(rel_path))

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✅ Created {zip_name}: {size_mb:.2f} MB")
    return zip_path

def deploy_all():
    sd_zip = package_app(SD_DIR, "sd_deploy.zip", "super-distributor")
    dist_zip = package_app(DIST_DIR, "dist_deploy.zip", "distributor")
    ret_zip = package_app(RETAILER_DIR, "retailer_deploy.zip", "retailer")

    print("\n🚀 Uploading deploy packages to server...")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{sd_zip}" "{dist_zip}" "{ret_zip}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)

    print("\n🚀 Uploading backend machines.py to server...")
    backend_machines = BASE_DIR / "backend" / "app" / "presentation" / "api" / "v1" / "machines.py"
    scp_be = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{backend_machines}" {SERVER_HOST}:/home/ubuntu/pay2pay/backend/app/presentation/api/v1/machines.py'
    subprocess.run(scp_be, shell=True, check=True)

    print("\n🔄 Executing remote deployment and service restarts...")
    remote_script = """#!/bin/bash
set -e

echo '=== 1. Deploying Super-Distributor (Port 3007) ==='
sudo rm -rf /home/ubuntu/pay2pay/super-distributor/apps/super-distributor/*
sudo unzip -q -o /home/ubuntu/sd_deploy.zip -d /home/ubuntu/pay2pay/super-distributor/
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/super-distributor
sudo systemctl restart pay2pay-super-distributor

echo '=== 2. Deploying Distributor (Port 3006) ==='
sudo fuser -k 3006/tcp || true
sudo rm -rf /home/ubuntu/pay2pay/distributor/apps/distributor/*
sudo unzip -q -o /home/ubuntu/dist_deploy.zip -d /home/ubuntu/pay2pay/distributor/
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/distributor
sudo systemctl restart pay2pay-distributor

echo '=== 3. Deploying Retailer (Port 3000) ==='
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
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/frontend
sudo systemctl restart pay2pay-frontend

echo '=== 4. Restarting Backend and Reloading Nginx ==='
sudo systemctl restart pay2pay-backend
sudo systemctl reload nginx

sleep 4

echo '=== 5. Health Checks ==='
echo -n 'Super-Distributor service: '
sudo systemctl is-active pay2pay-super-distributor
echo -n 'Distributor service: '
sudo systemctl is-active pay2pay-distributor
echo -n 'Retailer frontend service: '
sudo systemctl is-active pay2pay-frontend
echo -n 'Backend service: '
sudo systemctl is-active pay2pay-backend

echo 'HTTP Checks:'
curl -s -o /dev/null -w 'SD (Port 3007) /pos-info: %{http_code}\n' http://127.0.0.1:3007/pos-info || true
curl -s -o /dev/null -w 'Dist (Port 3006) /pos-info: %{http_code}\n' http://127.0.0.1:3006/pos-info || true
curl -s -o /dev/null -w 'Retailer (Port 3000) /retailer/pos-info: %{http_code}\n' http://127.0.0.1:3000/retailer/pos-info || true
curl -s -o /dev/null -w 'Retailer (Port 3000) /pos-info: %{http_code}\n' http://127.0.0.1:3000/pos-info || true
curl -s -o /dev/null -w 'Backend /api/v1/machines: %{http_code}\n' http://127.0.0.1:8000/api/v1/machines || true

echo '=== Deployment Complete ==='
"""

    import tempfile
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".sh", newline="\n") as f:
        f.write(remote_script)
        tmp_script_path = f.name

    subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, tmp_script_path, f"{SERVER_HOST}:/tmp/do_deploy_pos_info.sh"], check=True)
    res = subprocess.run(["ssh", "-n", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, SERVER_HOST, "bash /tmp/do_deploy_pos_info.sh"], stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("\nSTDOUT:\n", res.stdout)
    if res.stderr:
        print("\nSTDERR:\n", res.stderr)

if __name__ == "__main__":
    deploy_all()
