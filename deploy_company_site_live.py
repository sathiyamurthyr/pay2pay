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

echo '=== Updating Nginx for Multi-Domain SSL (pay2pay.in, retailer.pay2pay.in, admin.pay2pay.in, api.pay2pay.in, receipt.pay2pay.in) ==='
sudo tee /etc/nginx/sites-available/pay2pay > /dev/null << 'EOF'
upstream pay2pay_frontend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

upstream pay2pay_admin {
    server 127.0.0.1:3003 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

upstream pay2pay_company_site {
    server 127.0.0.1:3005 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

upstream pay2pay_api {
    server 127.0.0.1:8000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

# HTTP to HTTPS Global Redirect
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name pay2pay.in www.pay2pay.in retailer.pay2pay.in admin.pay2pay.in api.pay2pay.in receipt.pay2pay.in _;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# 1. Retailer Portal (https://retailer.pay2pay.in)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name retailer.pay2pay.in;

    ssl_certificate /etc/letsencrypt/live/retailer.pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/retailer.pay2pay.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;
    client_body_buffer_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/retailer_access.log;
    error_log /var/log/nginx/retailer_error.log warn;

    location /api/ {
        proxy_pass http://pay2pay_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location /uploads/ {
        alias /home/ubuntu/pay2pay/backend/uploads/;
        expires 30d;
        access_log off;
    }

    location /_next/static/ {
        proxy_pass http://pay2pay_frontend/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://pay2pay_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}

# 2. Company Admin Portal (https://admin.pay2pay.in)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.pay2pay.in;

    ssl_certificate /etc/letsencrypt/live/admin.pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.pay2pay.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;
    client_body_buffer_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/admin_access.log;
    error_log /var/log/nginx/admin_error.log warn;

    location /api/ {
        proxy_pass http://pay2pay_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /home/ubuntu/pay2pay/backend/uploads/;
        expires 30d;
        access_log off;
    }

    location /_next/static/ {
        proxy_pass http://pay2pay_admin/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
    }

    location / {
        proxy_pass http://pay2pay_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Main Platform & Company Landing Page (https://pay2pay.in)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pay2pay.in www.pay2pay.in;

    ssl_certificate /etc/letsencrypt/live/pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pay2pay.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;
    client_body_buffer_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/pay2pay_access.log;
    error_log /var/log/nginx/pay2pay_error.log warn;

    location /api/ {
        proxy_pass http://pay2pay_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /home/ubuntu/pay2pay/backend/uploads/;
        expires 30d;
        access_log off;
    }

    location ~ ^/(retailer|dist|sd|super-admin|dmt|aeps|recharge|settlement|customers|beneficiaries|wallet) {
        proxy_pass http://pay2pay_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /_next/static/ {
        proxy_pass http://pay2pay_frontend/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
    }

    location / {
        proxy_pass http://pay2pay_company_site;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Direct API Gateway (https://api.pay2pay.in)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.pay2pay.in;

    ssl_certificate /etc/letsencrypt/live/api.pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pay2pay.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log warn;

    location /uploads/ {
        alias /home/ubuntu/pay2pay/backend/uploads/;
        expires 30d;
        access_log off;
    }

    location / {
        proxy_pass http://pay2pay_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 4. Public Receipt Verification Portal (https://receipt.pay2pay.in)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name receipt.pay2pay.in;

    ssl_certificate /etc/letsencrypt/live/receipt.pay2pay.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/receipt.pay2pay.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/receipt_access.log;
    error_log /var/log/nginx/receipt_error.log warn;

    location /_next/static/ {
        proxy_pass http://pay2pay_frontend/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        access_log off;
    }

    location / {
        proxy_pass http://pay2pay_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
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
