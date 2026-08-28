import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
RETAILER_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "retailer"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def package_retailer():
    print(f"\nPackaging Retailer Frontend ({RETAILER_DIR})...")
    standalone_dir = RETAILER_DIR / ".next" / "standalone"
    static_src = RETAILER_DIR / ".next" / "static"
    public_src = RETAILER_DIR / "public"
    
    if not standalone_dir.exists():
        raise FileNotFoundError(f"Standalone dir {standalone_dir} does not exist.")

    monorepo_app_dir = standalone_dir / "apps" / "retailer"
    
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

    zip_path = BASE_DIR / "retailer_deploy.zip"
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
    print(f"Created retailer_deploy.zip: {size_mb:.2f} MB")
    return zip_path

def deploy_retailer(zip_path: Path):
    print("\nUploading retailer_deploy.zip to server via SCP...")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{zip_path}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("Uploaded retailer_deploy.zip successfully!")

    print("\nExtracting and restarting pay2pay-frontend...")
    remote_script = """set -e
sudo rm -rf /home/ubuntu/pay2pay/frontend/*
sudo unzip -q -o /home/ubuntu/retailer_deploy.zip -d /home/ubuntu/pay2pay/frontend/
if [ -f /home/ubuntu/pay2pay/frontend/apps/retailer/server.js ]; then
  cp /home/ubuntu/pay2pay/frontend/apps/retailer/server.js /home/ubuntu/pay2pay/frontend/server.js || true
fi
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/frontend
sudo systemctl restart pay2pay-frontend
sleep 3
sudo systemctl status pay2pay-frontend --no-pager
curl -s -o /dev/null -w 'Retailer (Port 3000) Status: %{http_code}\\n' http://127.0.0.1:3000/retailer/login || true
"""

    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, SERVER_HOST, remote_script]
    res = subprocess.run(ssh_cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    zip_p = package_retailer()
    deploy_retailer(zip_p)
