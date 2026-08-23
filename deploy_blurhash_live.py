import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
RETAILER_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "retailer"
ADMIN_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "admin"
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

    # In monorepo setups, standalone may contain apps/<name>
    monorepo_app_dir = standalone_dir / "apps" / app_rel_name
    
    # Copy static assets to standalone root and monorepo app subfolder
    for s_target in [standalone_dir / ".next" / "static", monorepo_app_dir / ".next" / "static"]:
        if static_src.exists():
            s_target.parent.mkdir(parents=True, exist_ok=True)
            if s_target.exists():
                shutil.rmtree(s_target)
            shutil.copytree(static_src, s_target)
            print(f"  -> Copied static assets to {s_target}")

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

def deploy_to_server(retailer_zip: Path, admin_zip: Path):
    print("\n🚀 Uploading deployment packages to 129.225.91.190 via SCP...")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{retailer_zip}" "{admin_zip}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("✅ Uploaded deployment archives successfully!")

    print("\n🔄 Extracting packages and restarting services on production...")
    remote_script = (
        "set -e\n"
        "echo '=== 1. Deploying Retailer Frontend (Port 3000) ==='\n"
        "sudo rm -rf /home/ubuntu/pay2pay/frontend/*\n"
        "sudo unzip -q -o /home/ubuntu/retailer_deploy.zip -d /home/ubuntu/pay2pay/frontend/\n"
        "if [ -f /home/ubuntu/pay2pay/frontend/apps/retailer/server.js ]; then\n"
        "  cp /home/ubuntu/pay2pay/frontend/apps/retailer/server.js /home/ubuntu/pay2pay/frontend/server.js || true\n"
        "fi\n"
        "echo '=== 2. Deploying Admin Frontend (Port 3003) ==='\n"
        "sudo rm -rf /home/ubuntu/pay2pay/admin/*\n"
        "sudo unzip -q -o /home/ubuntu/admin_deploy.zip -d /home/ubuntu/pay2pay/admin/\n"
        "if [ -f /home/ubuntu/pay2pay/admin/apps/admin/server.js ]; then\n"
        "  cp /home/ubuntu/pay2pay/admin/apps/admin/server.js /home/ubuntu/pay2pay/admin/server.js || true\n"
        "fi\n"
        "echo '=== 3. Setting Permissions ==='\n"
        "sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay\n"
        "echo '=== 4. Restarting Services ==='\n"
        "sudo systemctl restart pay2pay-frontend\n"
        "sudo systemctl restart pay2pay-admin\n"
        "sleep 3\n"
        "echo '=== 5. Verifying Service Health ==='\n"
        "curl -s -o /dev/null -w 'Retailer HTTP Status: %{http_code}\\n' http://127.0.0.1:3000 || true\n"
        "curl -s -o /dev/null -w 'Admin HTTP Status: %{http_code}\\n' http://127.0.0.1:3003 || true\n"
        "echo '=== Live Deployment Finished Successfully! ==='\n"
    )

    ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "{remote_script}"'
    res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    retailer_zip = package_app(RETAILER_DIR, "retailer_deploy.zip", "retailer")
    admin_zip = package_app(ADMIN_DIR, "admin_deploy.zip", "admin")
    deploy_to_server(retailer_zip, admin_zip)
