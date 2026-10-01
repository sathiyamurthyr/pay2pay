"""
Deploy Mailora Worker to Ubuntu OCR Server
============================================
Copies the mailora package + worker to the remote server and
installs/starts the systemd service.
"""
import subprocess
import sys

KEY = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
HOST = "ubuntu@129.225.91.190"
REMOTE_DIR = "/home/ubuntu/pay2pay/backend"


def run(cmd, check=True, timeout=60):
    print(f"$ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        r = subprocess.run(cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired:
        print(f"Command timed out after {timeout}s")
        if check:
            sys.exit(1)
        return None
    if r and r.stdout and r.stdout.strip():
        print(r.stdout.strip())
    if r and r.stderr and r.stderr.strip():
        print("STDERR:", r.stderr.strip()[:500])
    if check and r and r.returncode != 0:
        print(f"Command failed with code {r.returncode}")
        sys.exit(1)
    return r


def ssh(remote_cmd: str, check=True, timeout=60):
    return run(["ssh", "-n", "-i", KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
                 "-o", "ConnectTimeout=15", HOST, remote_cmd], check=check, timeout=timeout)


def scp(local: str, remote: str, timeout=60):
    return run(["scp", "-i", KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
                 "-o", "ConnectTimeout=15", "-r", local, f"{HOST}:{remote}"], timeout=timeout)


print("=== [1] Uploading mailora package ===")
scp(r"D:\pay2pay\backend\mailora", f"{REMOTE_DIR}/")
scp(r"D:\pay2pay\backend\mailora_worker.py", f"{REMOTE_DIR}/")

print("\n=== [2] Installing Python dependencies on server ===")
ssh(f"cd {REMOTE_DIR} && venv/bin/pip install pytesseract pdf2image psycopg2-binary b2sdk --quiet")

print("\n=== [3] Installing system dependencies (poppler for pdf2image) ===")
ssh("sudo apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-eng 2>&1 | tail -5")

print("\n=== [4] Installing systemd service ===")
ssh(f"sudo cp {REMOTE_DIR}/mailora/mailora-worker.service /etc/systemd/system/")
ssh("sudo systemctl daemon-reload")
ssh("sudo systemctl enable mailora-worker")
ssh("sudo systemctl restart mailora-worker")

print("\n=== [5] Checking service status ===")
ssh("sudo systemctl status mailora-worker --no-pager -l", check=False)

print("\n=== [6] Tailing logs (last 20 lines) ===")
ssh("sudo journalctl -u mailora-worker -n 20 --no-pager", check=False)

print("\nDeployment complete!")
