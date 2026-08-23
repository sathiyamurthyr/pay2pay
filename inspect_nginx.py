import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

test_script = """
echo "=== 1. Checking Nginx Sites Enabled ==="
ls -la /etc/nginx/sites-enabled/
for f in /etc/nginx/sites-enabled/*; do
  echo "--- FILE: $f ---"
  cat "$f"
done

echo ""
echo "=== 2. Testing curl on retailer.pay2pay.in ==="
curl -i -s -X POST https://retailer.pay2pay.in/api/v1/auth/enterprise/login-password \\
  -H "Content-Type: application/json" \\
  -d '{"mobile_number": "9176669426", "password": "Asdfg!234567", "accepted_terms": true}'
"""

with open(r"d:\pay2pay\test_nginx_config.sh", "w", newline="\n", encoding="utf-8") as f:
    f.write(test_script)

scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "d:\\pay2pay\\test_nginx_config.sh" {SERVER_HOST}:/home/ubuntu/test_nginx_config.sh'
subprocess.run(scp_cmd, shell=True, check=True)

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "bash /home/ubuntu/test_nginx_config.sh"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
