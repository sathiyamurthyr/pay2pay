import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

remote_cmd = """
sudo systemctl status pay2pay-frontend --no-pager || true
sudo systemctl status pay2pay-admin --no-pager || true
sudo systemctl status pay2pay-company-site --no-pager || true
"""

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "{remote_cmd}"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
