import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
FRONTEND_DIR = BASE_DIR / "frontend"
BACKEND_DIR = BASE_DIR / "pay2pay-platform" / "apps" / "api"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

def package_frontend():
    print("\n--- 1. Packaging Standalone Frontend ---")
    standalone_dir = FRONTEND_DIR / ".next" / "standalone"
    static_src = FRONTEND_DIR / ".next" / "static"
    public_src = FRONTEND_DIR / "public"
    
    # Ensure static and public are inside standalone folder
    static_dst = standalone_dir / ".next" / "static"
    public_dst = standalone_dir / "public"
    
    if static_src.exists():
        print(f"Copying static files from {static_src} -> {static_dst}")
        if static_dst.exists():
            shutil.rmtree(static_dst)
        shutil.copytree(static_src, static_dst)
        
    if public_src.exists():
        print(f"Copying public files from {public_src} -> {public_dst}")
        if public_dst.exists():
            shutil.rmtree(public_dst)
        shutil.copytree(public_src, public_dst)

    zip_path = BASE_DIR / "frontend_standalone_deploy.zip"
    if zip_path.exists():
        zip_path.unlink()

    print(f"Zipping standalone directory to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(standalone_dir):
            for file in files:
                full_path = Path(root) / file
                rel_path = full_path.relative_to(standalone_dir)
                z.write(full_path, str(rel_path))
                
    print(f"Frontend package created: {zip_path} ({os.path.getsize(zip_path) / 1024 / 1024:.2f} MB)")
    return zip_path

def package_backend():
    print("\n--- 2. Packaging Backend ---")
    zip_path = BASE_DIR / "backend_deploy.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(BACKEND_DIR):
            dirs[:] = [d for d in dirs if d not in ('venv', '__pycache__', '.pytest_cache', '.git', 'node_modules', 'uploads')]
            for file in files:
                if file.endswith('.pyc') or file.endswith('.pyo'):
                    continue
                full_path = Path(root) / file
                rel_path = full_path.relative_to(BACKEND_DIR)
                z.write(full_path, str(rel_path))

    print(f"Backend package created: {zip_path} ({os.path.getsize(zip_path) / 1024 / 1024:.2f} MB)")
    return zip_path

def deploy_to_server(fe_zip, be_zip):
    print("\n--- 3. Uploading to 129.225.91.190 via SCP ---")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{fe_zip}" "{be_zip}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("Files uploaded successfully!")

    print("\n--- 4. Unzipping and Restarting Services on Server ---")
    remote_script = (
        "set -e\n"
        "echo '=== Extracting Frontend ==='\n"
        "sudo rm -rf /home/ubuntu/pay2pay/frontend/*\n"
        "sudo unzip -q -o /home/ubuntu/frontend_standalone_deploy.zip -d /home/ubuntu/pay2pay/frontend/\n"
        "echo '=== Extracting Backend ==='\n"
        "sudo unzip -q -o /home/ubuntu/backend_deploy.zip -d /home/ubuntu/pay2pay/backend/\n"
        "sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay\n"
        "echo '=== Restarting Systemd Services ==='\n"
        "sudo systemctl restart pay2pay-backend pay2pay-frontend\n"
        "sleep 3\n"
        "sudo systemctl status pay2pay-frontend --no-pager\n"
        "sudo systemctl status pay2pay-backend --no-pager\n"
        "echo '=== Live Server Deployment Complete! ==='\n"
    )
    
    ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "{remote_script}"'
    res = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    fe = package_frontend()
    be = package_backend()
    deploy_to_server(fe, be)
