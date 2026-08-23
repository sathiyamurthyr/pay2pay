import subprocess

KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

remote_cmd = """
sudo systemctl list-units --type=service --state=running | grep pay2pay || true
ls -la /home/ubuntu/pay2pay/ || true
"""

ssh_cmd = f'ssh -o StrictHostKeyChecking=no -i "{KEY_PATH}" {SERVER_HOST} "{remote_cmd}"'
res = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
print("STDOUT:\n", res.stdout)
if res.stderr:
    print("STDERR:\n", res.stderr)
