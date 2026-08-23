import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

remote_script = """#!/usr/bin/env bash
set -e
echo "=== 1. Extracting Retailer Frontend ==="
sudo rm -rf /home/ubuntu/pay2pay/frontend/*
sudo unzip -q -o /home/ubuntu/retailer_deploy.zip -d /home/ubuntu/pay2pay/frontend/
if [ -f /home/ubuntu/pay2pay/frontend/apps/retailer/server.js ]; then
  cp /home/ubuntu/pay2pay/frontend/apps/retailer/server.js /home/ubuntu/pay2pay/frontend/server.js
fi
echo "=== 2. Extracting Admin Frontend ==="
sudo rm -rf /home/ubuntu/pay2pay/admin/*
sudo unzip -q -o /home/ubuntu/admin_deploy.zip -d /home/ubuntu/pay2pay/admin/
if [ -f /home/ubuntu/pay2pay/admin/apps/admin/server.js ]; then
  cp /home/ubuntu/pay2pay/admin/apps/admin/server.js /home/ubuntu/pay2pay/admin/server.js
fi
echo "=== 3. Setting Permissions ==="
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay
echo "=== 4. Restarting Services ==="
sudo systemctl restart pay2pay-frontend
sudo systemctl restart pay2pay-admin
sleep 3
echo "=== 5. Verifying Ports & HTTP Status ==="
curl -s -o /dev/null -w "Retailer (Port 3000) Status: %{http_code}\\n" http://127.0.0.1:3000 || true
curl -s -o /dev/null -w "Admin (Port 3003) Status: %{http_code}\\n" http://127.0.0.1:3003 || true
echo "=== Deployment Finished Successfully! ==="
"""

with open(r"d:\pay2pay\deploy_remote.sh", "w", newline="\n", encoding="utf-8") as f:
    f.write(remote_script)

scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "d:\\pay2pay\\deploy_remote.sh" {SERVER_HOST}:/home/ubuntu/deploy_remote.sh'
subprocess.run(scp_cmd, shell=True, check=True)

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "bash /home/ubuntu/deploy_remote.sh"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
