import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def run_remote(cmd):
    print(f"\n--- RUNNING: {cmd} ---")
    ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "{cmd}"'
    res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace", timeout=30)
    print("STDOUT:", res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)
    return res

run_remote("ls -la /etc/nginx/sites-available /etc/nginx/sites-enabled")
run_remote("sudo sed -i 's|proxy_pass http://pay2pay_api/;|proxy_pass http://pay2pay_api;|g' /etc/nginx/sites-available/pay2pay")
run_remote("sudo nginx -t")
run_remote("sudo systemctl reload nginx")
run_remote("curl -i -s -X POST https://retailer.pay2pay.in/api/v1/auth/enterprise/login-password -H 'Content-Type: application/json' -d '{\"mobile_number\": \"9176669426\", \"password\": \"Asdfg!234567\", \"accepted_terms\": true}'")
