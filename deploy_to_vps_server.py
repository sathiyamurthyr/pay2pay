import os
import sys
import shutil
import tarfile
import subprocess
from pathlib import Path

WORKSPACE = Path(r"c:\Users\Sathyamoorthy\.gemini\antigravity\worktrees\pay2pay\fix_role_based_routing")
FRONTEND_DIR = WORKSPACE / "frontend"
BACKEND_DIR = WORKSPACE / "backend"
STANDALONE_DIR = FRONTEND_DIR / ".next" / "standalone"
STATIC_SRC = FRONTEND_DIR / ".next" / "static"
PUBLIC_SRC = FRONTEND_DIR / "public"

KEY_PATH = os.path.expandvars(r"%USERPROFILE%\.ssh\id_ed25519_vps")
SERVER_HOST = "sathiya@157.20.172.186"
SSH_PORT = "55002"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def prepare_and_package_frontend():
    print("\n📦 1. Preparing standalone assets...")
    if not STANDALONE_DIR.exists():
        raise FileNotFoundError(f"Standalone dir {STANDALONE_DIR} not found. Run next build first!")

    # 1. Root standalone assets
    static_dst_root = STANDALONE_DIR / ".next" / "static"
    public_dst_root = STANDALONE_DIR / "public"

    if STATIC_SRC.exists():
        print(f"  -> Copying static assets to {static_dst_root}")
        if static_dst_root.exists():
            shutil.rmtree(static_dst_root)
        shutil.copytree(STATIC_SRC, static_dst_root)

    if PUBLIC_SRC.exists():
        print(f"  -> Copying public assets to {public_dst_root}")
        if public_dst_root.exists():
            shutil.rmtree(public_dst_root)
        shutil.copytree(PUBLIC_SRC, public_dst_root)

    # 2. Monorepo apps/retailer standalone assets (needed by Docker CMD ["node", "apps/retailer/server.js"])
    monorepo_retailer = STANDALONE_DIR / "apps" / "retailer"
    monorepo_retailer.mkdir(parents=True, exist_ok=True)

    static_dst_mono = monorepo_retailer / ".next" / "static"
    public_dst_mono = monorepo_retailer / "public"
    server_dst_mono = monorepo_retailer / "server.js"
    server_next_dst_mono = monorepo_retailer / ".next" / "server"
    mono_next = monorepo_retailer / ".next"
    mono_next.mkdir(parents=True, exist_ok=True)

    if STATIC_SRC.exists():
        print(f"  -> Copying static assets to {static_dst_mono}")
        if static_dst_mono.exists():
            shutil.rmtree(static_dst_mono)
        shutil.copytree(STATIC_SRC, static_dst_mono)

    if PUBLIC_SRC.exists():
        print(f"  -> Copying public assets to {public_dst_mono}")
        if public_dst_mono.exists():
            shutil.rmtree(public_dst_mono)
        shutil.copytree(PUBLIC_SRC, public_dst_mono)

    # Copy all manifest and config files from .next to apps/retailer/.next
    root_next = STANDALONE_DIR / ".next"
    for item in root_next.iterdir():
        if item.is_file():
            shutil.copy2(item, mono_next / item.name)

    root_server_js = STANDALONE_DIR / "server.js"
    if root_server_js.exists():
        shutil.copy2(root_server_js, server_dst_mono)
        print(f"  -> Copied server.js to {server_dst_mono}")

    # 3. Create tar.gz
    fe_tar = WORKSPACE / "near4you_frontend_update.tar.gz"
    if fe_tar.exists():
        fe_tar.unlink()

    print(f"\n📦 Compressing standalone folder to {fe_tar.name}...")
    with tarfile.open(fe_tar, "w:gz") as tar:
        for item in STANDALONE_DIR.iterdir():
            tar.add(item, arcname=item.name)

    size_mb = os.path.getsize(fe_tar) / (1024 * 1024)
    print(f"✅ Created {fe_tar.name}: {size_mb:.2f} MB")
    return fe_tar

def package_backend():
    print("\n📦 2. Packaging Backend...")
    be_tar = WORKSPACE / "near4you_backend_update.tar.gz"
    if be_tar.exists():
        be_tar.unlink()

    items_to_include = ["app", "requirements.txt", "alembic", "alembic.ini"]
    with tarfile.open(be_tar, "w:gz") as tar:
        for item_name in items_to_include:
            item_path = BACKEND_DIR / item_name
            if item_path.exists():
                tar.add(
                    item_path,
                    arcname=item_name,
                    filter=lambda t: None if "__pycache__" in t.name or t.name.endswith(".pyc") else t
                )

    size_mb = os.path.getsize(be_tar) / (1024 * 1024)
    print(f"✅ Created {be_tar.name}: {size_mb:.2f} MB")
    return be_tar

def deploy(fe_tar: Path, be_tar: Path):
    print(f"\n🚀 3. Uploading packages to {SERVER_HOST} via SCP (port {SSH_PORT})...")
    scp_cmd = [
        "scp", "-P", SSH_PORT, "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=30",
        str(fe_tar), str(be_tar), f"{SERVER_HOST}:/tmp/"
    ]
    subprocess.run(scp_cmd, check=True)
    print("✅ Upload completed successfully!")

    print(f"\n🔄 4. Extracting packages and restarting services on server...")
    remote_script = """#!/bin/bash
set -euo pipefail

echo '=== 1. Extracting Updated Frontend ==='
tar --no-same-owner --no-same-permissions -xzf /tmp/near4you_frontend_update.tar.gz -C /opt/near4you-retailer/frontend/

echo '=== 2. Extracting Updated Backend ==='
tar --no-same-owner --no-same-permissions -xzf /tmp/near4you_backend_update.tar.gz -C /opt/near4you-retailer/backend/

echo '=== 3. Rebuilding Docker Containers ==='
cd /opt/near4you-retailer
docker compose build --no-cache frontend backend
docker compose up -d --force-recreate frontend backend

echo '=== 4. Waiting for containers to become healthy ==='
sleep 25
docker compose ps frontend backend

echo '=== 5. Title & Branding Verification ==='
echo -n 'Root Login Title: '
curl -s http://127.0.0.1:3060/login | grep -o '<title>[^<]*</title>' || true

echo -n 'Retailer Login Title: '
curl -s http://127.0.0.1:3060/retailer/login | grep -o '<title>[^<]*</title>' || true

echo -n 'Check for Pay2Pay in Login: '
if curl -s http://127.0.0.1:3060/login | grep -qi 'Pay2Pay'; then
    echo 'WARNING: Pay2Pay found in HTML!'
else
    echo 'SUCCESS: No Pay2Pay references found in login HTML!'
fi

echo 'Backend Services Status Check:'
curl -s http://127.0.0.1:8090/api/v1/services/status || true

echo ''
echo '=== Live Server Deployment Complete! ==='
"""

    ssh_cmd = [
        "ssh", "-p", SSH_PORT, "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=30",
        SERVER_HOST, remote_script
    ]
    res = subprocess.run(ssh_cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)
    if res.returncode != 0:
        raise RuntimeError(f"Deployment script failed with code {res.returncode}")

if __name__ == "__main__":
    fe = prepare_and_package_frontend()
    be = package_backend()
    deploy(fe, be)

