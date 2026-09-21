import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "sed -n \'112,170p\' /etc/nginx/sites-available/pay2pay"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
print("ADMIN NGINX BLOCK:\n", res.stdout)
