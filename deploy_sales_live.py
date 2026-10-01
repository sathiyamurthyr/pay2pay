import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
SALES_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "sales"
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
        raise FileNotFoundError(f"Standalone dir {standalone_dir} does not exist. Run 'npm run build' first!")

    monorepo_app_dir = standalone_dir / "apps" / app_rel_name

    # Copy static assets into both standalone root and app subfolder
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


def deploy_to_server(sales_zip: Path):
    print("\n🚀 Uploading sales package to 129.225.91.190 via SCP...")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{sales_zip}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)

    # Backend files changed in this release
    backend_files_to_sync = [
        ("backend/app/application/kyc_document_reader_service.py",
         "pay2pay/backend/app/application/kyc_document_reader_service.py"),
        ("backend/app/presentation/api/v1/progressive_onboarding_router.py",
         "pay2pay/backend/app/presentation/api/v1/progressive_onboarding_router.py"),
        ("backend/app/application/progressive_onboarding_service.py",
         "pay2pay/backend/app/application/progressive_onboarding_service.py"),
        ("backend/app/application/cashfree_service.py",
         "pay2pay/backend/app/application/cashfree_service.py"),
        ("backend/app/infrastructure/adapters/cashfree_aadhaar_adapter.py",
         "pay2pay/backend/app/infrastructure/adapters/cashfree_aadhaar_adapter.py"),
    ]

    for rel_src, rel_dst in backend_files_to_sync:
        src_path = BASE_DIR / rel_src
        if src_path.exists():
            scp_f = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{src_path}" {SERVER_HOST}:/home/ubuntu/{rel_dst}'
            subprocess.run(scp_f, shell=True, check=True)
            print(f"✅ Uploaded {rel_src}")

    print("✅ All uploads complete.")

    print("\n🔄 Extracting and restarting services on production server...")
    remote_script = """#!/bin/bash
set -e
echo '=== 1. Deploying Sales Frontend (Port 3006) ==='
sudo rm -rf /home/ubuntu/pay2pay/sales/*
sudo mkdir -p /home/ubuntu/pay2pay/sales
sudo unzip -q -o /home/ubuntu/sales_deploy.zip -d /home/ubuntu/pay2pay/sales/
if [ -f /home/ubuntu/pay2pay/sales/apps/sales/server.js ]; then
  cp /home/ubuntu/pay2pay/sales/apps/sales/server.js /home/ubuntu/pay2pay/sales/server.js || true
fi
if [ -d /home/ubuntu/pay2pay/sales/apps/sales/.next ]; then
  cp -r /home/ubuntu/pay2pay/sales/apps/sales/.next /home/ubuntu/pay2pay/sales/ || true
fi
if [ -d /home/ubuntu/pay2pay/sales/apps/sales/public ]; then
  cp -r /home/ubuntu/pay2pay/sales/apps/sales/public /home/ubuntu/pay2pay/sales/ || true
fi

echo '=== 2. Setting Permissions ==='
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/sales /home/ubuntu/pay2pay/backend

echo '=== 3. Restarting Services ==='
sudo systemctl restart pay2pay-sales || true
sudo systemctl restart pay2pay-backend
sudo systemctl reload nginx || sudo systemctl restart nginx

sleep 4

echo '=== 4. Health Check ==='
sudo systemctl is-active pay2pay-sales || echo "pay2pay-sales not found - check service name"
sudo systemctl is-active pay2pay-backend
curl -s -o /dev/null -w 'Sales (Port 3006) Status: %{http_code}\\n' http://127.0.0.1:3006 || true
curl -s -o /dev/null -w 'Backend (Port 8000) Status: %{http_code}\\n' http://127.0.0.1:8000/docs || true
echo '=== Sales Deployment Finished Successfully! ==='
"""

    import tempfile
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".sh", newline="\n") as f:
        f.write(remote_script)
        tmp_script_path = f.name

    subprocess.run(
        ["scp", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, tmp_script_path, f"{SERVER_HOST}:/tmp/deploy_sales.sh"],
        check=True
    )
    res = subprocess.run(
        ["ssh", "-n", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, SERVER_HOST, "bash /tmp/deploy_sales.sh"],
        stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)


if __name__ == "__main__":
    sales_zip = package_app(SALES_DIR, "sales_deploy.zip", "sales")
    deploy_to_server(sales_zip)
