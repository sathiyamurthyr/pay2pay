import os
import sys
import shutil
import tarfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
PLATFORM_DIR = BASE_DIR / "pay2pay-platform"
ADMIN_DIR = PLATFORM_DIR / "apps" / "admin"
STANDALONE_ADMIN = ADMIN_DIR / ".next" / "standalone" / "apps" / "admin"
STATIC_SRC = ADMIN_DIR / ".next" / "static"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def create_bundle():
    print("1. Preparing standalone apps/admin...")
    if not STANDALONE_ADMIN.exists():
        raise RuntimeError(f"Standalone admin dir not found: {STANDALONE_ADMIN}")

    # Copy static files to standalone admin .next/static
    dst_static = STANDALONE_ADMIN / ".next" / "static"
    if STATIC_SRC.exists():
        dst_static.parent.mkdir(parents=True, exist_ok=True)
        if dst_static.exists():
            shutil.rmtree(dst_static)
        shutil.copytree(STATIC_SRC, dst_static)
        print(f"  -> Copied static to {dst_static}")

    # Copy public folder if exists
    pub_src = ADMIN_DIR / "public"
    dst_pub = STANDALONE_ADMIN / "public"
    if pub_src.exists():
        if dst_pub.exists():
            shutil.rmtree(dst_pub)
        shutil.copytree(pub_src, dst_pub)
        print(f"  -> Copied public to {dst_pub}")

    # Copy .env.production
    env_file = ADMIN_DIR / ".env.production"
    if env_file.exists():
        shutil.copy2(env_file, STANDALONE_ADMIN / ".env.production")
        print(f"  -> Copied .env.production to {STANDALONE_ADMIN}")

    # Create tar.gz of apps/admin
    bundle_path = BASE_DIR / "admin_fast_bundle.tar.gz"
    if bundle_path.exists():
        bundle_path.unlink()

    print(f"2. Packing tar.gz to {bundle_path}...")
    with tarfile.open(bundle_path, "w:gz") as tar:
        # We want the archive structure to be apps/admin/...
        tar.add(STANDALONE_ADMIN, arcname="apps/admin")

    size_mb = os.path.getsize(bundle_path) / (1024 * 1024)
    print(f"  -> Done! Bundle size: {size_mb:.2f} MB")
    return bundle_path

def deploy_bundle(bundle_path: Path):
    print(f"\n3. Transferring {bundle_path.name} to {SERVER_HOST}:/home/ubuntu/pay2pay/admin/ ...")
    cmd = f'scp -B -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{bundle_path}" {SERVER_HOST}:/home/ubuntu/pay2pay/admin/{bundle_path.name}'
    subprocess.run(cmd, shell=True, check=True)
    print("  -> Transfer successful!")

    print("\n4. Unpacking and restarting service on remote server...")
    remote_cmds = """#!/bin/bash
set -e
cd /home/ubuntu/pay2pay/admin

echo '--- Unpacking admin_fast_bundle.tar.gz ---'
tar -xzf admin_fast_bundle.tar.gz

echo '--- Syncing static to root .next/static ---'
mkdir -p .next
rm -rf .next/static
cp -r apps/admin/.next/static .next/static

echo '--- Ensuring root server.js wrapper ---'
cat << 'EOF' > server.js
const path = require("path");
process.chdir(path.join(__dirname, "apps/admin"));
require("./apps/admin/server.js");
EOF

echo '--- Setting permissions ---'
chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/admin

echo '--- Restarting pay2pay-admin.service ---'
sudo systemctl restart pay2pay-admin
sleep 3

echo '--- Service status ---'
sudo systemctl status pay2pay-admin --no-pager | head -n 15

echo '--- Restarting pay2pay-backend.service ---'
sudo systemctl restart pay2pay-backend
sleep 2

echo '--- Testing local route response ---'
curl -s -o /dev/null -w 'Admin /wallet-ledger/wallets HTTP: %{http_code}\n' http://127.0.0.1:3003/wallet-ledger/wallets
curl -s -o /dev/null -w 'Admin /wallet-ledger/transactions HTTP: %{http_code}\n' http://127.0.0.1:3003/wallet-ledger/transactions
curl -s -o /dev/null -w 'Admin / HTTP: %{http_code}\n' http://127.0.0.1:3003/
"""
    cmd_ssh = f'ssh -n -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "bash -s"'
    res = subprocess.run(cmd_ssh, input=remote_cmds, text=True, shell=True, capture_output=True, encoding="utf-8", errors="replace")
    print("Remote Output:\n", res.stdout)
    if res.stderr:
        print("Remote Stderr:\n", res.stderr)

if __name__ == "__main__":
    bundle = create_bundle()
    deploy_bundle(bundle)
