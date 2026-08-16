import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

BASE_DIR = Path(r"d:\pay2pay")
SITE_DIR = BASE_DIR / "pay2pay-company-site"
KEY_PATH = r"C:\Users\Sathyamoorthy\.ssh\id_rsa_129_225_91_190"
SERVER_HOST = "ubuntu@129.225.91.190"

def deploy():
    print("--- 1. Packaging Company Site Standalone Bundle ---")
    standalone_dir = SITE_DIR / ".next" / "standalone"
    static_src = SITE_DIR / ".next" / "static"
    public_src = SITE_DIR / "public"

    static_dst = standalone_dir / ".next" / "static"
    public_dst = standalone_dir / "public"

    if static_src.exists():
        print(f"Copying static files from {static_src} -> {static_dst}")
        if static_dst.exists():
            shutil.rmtree(static_dst)
        shutil.copytree(static_src, static_dst)

    if public_src.exists():
        print(f"Copying public files from {public_src} -> {public_dst}")
        if public_dst.exists():
            shutil.rmtree(public_dst)
        shutil.copytree(public_src, public_dst)

    zip_path = BASE_DIR / "company_site_deploy.zip"
    if zip_path.exists():
        zip_path.unlink()

    print(f"Zipping standalone bundle to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(standalone_dir):
            for file in files:
                full_path = Path(root) / file
                rel_path = full_path.relative_to(standalone_dir)
                z.write(full_path, str(rel_path))

    print(f"Package created: {zip_path} ({os.path.getsize(zip_path) / 1024 / 1024:.2f} MB)")

    print("\n--- 2. Uploading company_site_deploy.zip via SCP ---")
    scp_cmd = f'scp -o StrictHostKeyChecking=no -i "{KEY_PATH}" "{zip_path}" {SERVER_HOST}:/home/ubuntu/'
    subprocess.run(scp_cmd, shell=True, check=True)
    print("Uploaded successfully!")

    print("\n--- 3. Extracting, Configuring Systemd & Nginx on 129.225.91.190 ---")
    remote_script = """set -e
echo '=== Creating directory and extracting ==='
sudo mkdir -p /home/ubuntu/pay2pay/company-site
sudo rm -rf /home/ubuntu/pay2pay/company-site/*
sudo unzip -q -o /home/ubuntu/company_site_deploy.zip -d /home/ubuntu/pay2pay/company-site/
sudo chown -R ubuntu:ubuntu /home/ubuntu/pay2pay/company-site

echo '=== Creating Systemd Service for Company Site on Port 3005 ==='
sudo tee /etc/systemd/system/pay2pay-company-site.service > /dev/null << 'EOF'
[Unit]
Description=Pay2Pay Next.js Public Company Website
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/pay2pay/company-site
ExecStartPre=/bin/sh -c "fuser -k 3005/tcp || true"
ExecStart=/usr/bin/node /home/ubuntu/pay2pay/company-site/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3005
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

echo '=== Reloading and starting systemd service ==='
sudo systemctl daemon-reload
sudo systemctl enable pay2pay-company-site
sudo systemctl restart pay2pay-company-site
sleep 3
sudo systemctl status pay2pay-company-site --no-pager

echo '=== Updating Nginx for pay2pay.in ==='
sudo tee /etc/nginx/sites-available/pay2pay > /dev/null << 'EOF'
server {
    server_name pay2pay.in www.pay2pay.in;

    # 1. Backend REST APIs
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Retailer Platform & Partner Workspaces (Port 3000)
    location ~ ^/(retailer|dist|sd|super-admin) {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Pay2Pay Company Landing Page (Port 3005)
    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pay2pay.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    server_name admin.pay2pay.in;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/admin.pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.pay2pay.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name pay2pay.in www.pay2pay.in admin.pay2pay.in _;
    return 301 https://$host$request_uri;
}
EOF

sudo nginx -t
sudo systemctl reload nginx
echo '=== Live Nginx Reloaded Successfully! ==='
"""

    ssh_cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-i", KEY_PATH,
        SERVER_HOST,
        remote_script
    ]
    res = subprocess.run(ssh_cmd, capture_output=True, text=True)
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)

if __name__ == "__main__":
    deploy()
