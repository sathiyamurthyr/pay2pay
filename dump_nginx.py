import subprocess
import sys

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "sudo nginx -T"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
with open(r"d:\pay2pay\nginx_full_dump.conf", "w", encoding="utf-8") as f:
    f.write(res.stdout)
print("Dumped full nginx config. Length:", len(res.stdout))
