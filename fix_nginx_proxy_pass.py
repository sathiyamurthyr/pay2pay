import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

fix_script = """#!/usr/bin/env bash
set -e

echo "=== 1. Identifying Nginx config file ==="
CONF_FILE="/etc/nginx/sites-available/pay2pay"
if [ ! -f "$CONF_FILE" ]; then
  CONF_FILE=$(ls /etc/nginx/sites-enabled/* | head -n 1)
fi
echo "Target config: $CONF_FILE"

echo "=== 2. Creating Backup ==="
sudo cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%s)"

echo "=== 3. Fixing proxy_pass http://pay2pay_api/ in $CONF_FILE ==="
# Replace 'proxy_pass http://pay2pay_api/;' with 'proxy_pass http://pay2pay_api;'
sudo sed -i 's|proxy_pass http://pay2pay_api/;|proxy_pass http://pay2pay_api;|g' "$CONF_FILE"

echo "=== 4. Testing Nginx Syntax ==="
sudo nginx -t

echo "=== 5. Reloading Nginx ==="
sudo systemctl reload nginx
sleep 2

echo "=== 6. Testing Public Login on retailer.pay2pay.in ==="
curl -i -s -X POST https://retailer.pay2pay.in/api/v1/auth/enterprise/login-password \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "9176669426", "password": "Asdfg!234567", "accepted_terms": true}'

echo ""
echo "=== 7. Testing Public Login on pay2pay.in ==="
curl -i -s -X POST https://pay2pay.in/api/v1/auth/enterprise/login-password \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "9176669426", "password": "Asdfg!234567", "accepted_terms": true}'

echo ""
echo "=== 8. Testing Public Login on admin.pay2pay.in ==="
curl -i -s -X POST https://admin.pay2pay.in/api/v1/auth/enterprise/login-password \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "9176669426", "password": "Asdfg!234567", "accepted_terms": true}'
"""

with open(r"d:\pay2pay\fix_nginx.sh", "w", newline="\n", encoding="utf-8") as f:
    f.write(fix_script)

scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "d:\\pay2pay\\fix_nginx.sh" {SERVER_HOST}:/home/ubuntu/fix_nginx.sh'
subprocess.run(scp_cmd, shell=True, check=True)

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "bash /home/ubuntu/fix_nginx.sh"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
