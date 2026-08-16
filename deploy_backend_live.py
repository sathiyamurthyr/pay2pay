import os
import sys
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
BACKEND_DIR = BASE_DIR / "backend"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

def deploy():
    zip_path = BASE_DIR / "backend_deploy.zip"
    if zip_path.exists():
        zip_path.unlink()

    print(f"Creating {zip_path}...")
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

    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{zip_path}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("Uploaded backend zip!")

    remote_script = """set -e
sudo unzip -q -o /home/ubuntu/backend_deploy.zip -d /home/ubuntu/pay2pay/backend/
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/backend
sudo systemctl restart pay2pay-backend
sleep 2
sudo systemctl status pay2pay-backend --no-pager
"""

    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-i", KEY_PATH, SERVER_HOST, remote_script]
    res = subprocess.run(ssh_cmd, capture_output=True, text=True)
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    deploy()
