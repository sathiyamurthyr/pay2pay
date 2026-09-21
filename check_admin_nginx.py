import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "grep -rn \'admin.pay2pay.in\' /etc/nginx/"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
print("GREP ADMIN RESULT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
