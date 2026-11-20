import os
import sys
import shutil
import tarfile
import argparse
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

def ensure_frontend_built(force_build: bool = False):
    """Ensures Next.js standalone build exists; builds automatically if absent or requested."""
    if force_build or not STANDALONE_DIR.exists():
        print(f"\n⚙️ Standalone build not found or rebuild requested. Running Next.js build in {FRONTEND_DIR}...")
        subprocess.run(["npm", "run", "build"], cwd=str(FRONTEND_DIR), shell=True, check=True)
        print("✅ Next.js build completed successfully.")

def prepare_and_package_frontend(force_build: bool = False):
    print("\n📦 1. Preparing standalone assets...")
    ensure_frontend_built(force_build=force_build)

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

    server_src = STANDALONE_DIR / ".next" / "server"
    if server_src.exists():
        print(f"  -> Copying server assets to {server_next_dst_mono}")
        if server_next_dst_mono.exists():
            shutil.rmtree(server_next_dst_mono)
        shutil.copytree(server_src, server_next_dst_mono)

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

    print(f"\n📦 Compressing standalone folder to {fe_tar.name} with fast native tar...")
    subprocess.run(["tar", "-czf", str(fe_tar), "-C", str(STANDALONE_DIR), "."], check=True)

    size_mb = os.path.getsize(fe_tar) / (1024 * 1024)
    print(f"✅ Created {fe_tar.name}: {size_mb:.2f} MB")
    return fe_tar

def package_backend():
    print("\n📦 2. Packaging Backend...")
    be_tar = WORKSPACE / "near4you_backend_update.tar.gz"
    if be_tar.exists():
        be_tar.unlink()

    items_to_include = ["app", "requirements.txt", "alembic", "alembic.ini", "sathus_notification", "seed_payin_mdr_master.py", "scripts"]
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

def deploy(fe_tar: Path | None, be_tar: Path | None):
    files_to_upload = []
    if fe_tar and fe_tar.exists():
        files_to_upload.append(str(fe_tar))
    if be_tar and be_tar.exists():
        files_to_upload.append(str(be_tar))

    if not files_to_upload:
        print("⚠️ No packages selected for deployment.")
        return

    print(f"\n🚀 Uploading packages to {SERVER_HOST} via SCP (port {SSH_PORT})...")
    scp_cmd = [
        "scp", "-P", SSH_PORT, "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=30",
        *files_to_upload, f"{SERVER_HOST}:/tmp/"
    ]
    subprocess.run(scp_cmd, check=True)
    print("✅ Upload completed successfully!")

    print(f"\n🔄 Applying updates and restarting services on server...")
    remote_script = """#!/bin/bash
set -euo pipefail

DEPLOY_DIR="/opt/near4you-retailer"
sudo mkdir -p "$DEPLOY_DIR/frontend" "$DEPLOY_DIR/backend"

if [ -f /tmp/near4you_frontend_update.tar.gz ]; then
    echo '=== 1. Extracting Updated Frontend ==='
    sudo tar --no-same-owner --no-same-permissions -xzf /tmp/near4you_frontend_update.tar.gz -C "$DEPLOY_DIR/frontend/"
    sudo rm -f /tmp/near4you_frontend_update.tar.gz
    echo '=== 2. Rebuilding Frontend Container ==='
    cd "$DEPLOY_DIR"
    sudo docker compose build frontend
    sudo docker compose up -d --force-recreate frontend
fi

if [ -f /tmp/near4you_backend_update.tar.gz ]; then
    echo '=== 3. Extracting Updated Backend ==='
    sudo tar --no-same-owner --no-same-permissions -xzf /tmp/near4you_backend_update.tar.gz -C "$DEPLOY_DIR/backend/"
    sudo rm -f /tmp/near4you_backend_update.tar.gz
    
    echo '=== 4. Updating Backend in Container ==='
    sudo docker cp "$DEPLOY_DIR/backend/app" near4you-retailer-backend:/app/
    if [ -d "$DEPLOY_DIR/backend/sathus_notification" ]; then
        sudo docker cp "$DEPLOY_DIR/backend/sathus_notification" near4you-retailer-backend:/app/
    fi
    if [ -d "$DEPLOY_DIR/backend/scripts" ]; then
        sudo docker cp "$DEPLOY_DIR/backend/scripts" near4you-retailer-backend:/app/
    fi
    if [ -f "$DEPLOY_DIR/backend/seed_payin_mdr_master.py" ]; then
        sudo docker cp "$DEPLOY_DIR/backend/seed_payin_mdr_master.py" near4you-retailer-backend:/app/
    fi
    sudo docker restart near4you-retailer-backend
fi

echo '=== 5. Waiting for containers to become healthy ==='
sleep 10
sudo docker compose ps frontend backend

echo '=== 6. Domain-Based Branding & Route Verification ==='
echo -n 'Pay2Pay Host Title: '
curl -s -H 'Host: pay2pay.in' http://127.0.0.1:3060/login | grep -o '<title>[^<]*</title>' || true

echo -n 'SMSPAY Host Title: '
curl -s -H 'Host: smspay.store' http://127.0.0.1:3060/login | grep -o '<title>[^<]*</title>' || true

echo -n 'Near4You Host Title: '
curl -s -H 'Host: near4you.store' http://127.0.0.1:3060/login | grep -o '<title>[^<]*</title>' || true

echo -n 'Backend Health Check: '
curl -s http://127.0.0.1:8090/health || true
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

def check_frontend_changes():
    try:
        res = subprocess.run(["git", "status", "--porcelain", "frontend"], capture_output=True, text=True, check=True)
        return len(res.stdout.strip()) > 0
    except Exception:
        return False

def main():
    parser = argparse.ArgumentParser(description="Near4You / Pay2Pay VPS Deployment Tool")
    parser.add_argument("--backend-only", action="store_true", help="Deploy only backend updates (fast, no Next.js build)")
    parser.add_argument("--frontend-only", action="store_true", help="Deploy only frontend updates")
    parser.add_argument("--build", action="store_true", help="Force rebuild frontend Next.js before deploying")
    args = parser.parse_args()

    fe = None
    be = None

    if args.backend_only:
        be = package_backend()
    elif args.frontend_only:
        fe = prepare_and_package_frontend(force_build=args.build)
    else:
        # Auto-detect or full deploy
        be = package_backend()
        if STANDALONE_DIR.exists() or args.build or check_frontend_changes():
            fe = prepare_and_package_frontend(force_build=args.build)
        else:
            print("ℹ️ Standalone directory not found and frontend unchanged. Deploying backend only.")

    deploy(fe, be)

if __name__ == "__main__":
    main()
