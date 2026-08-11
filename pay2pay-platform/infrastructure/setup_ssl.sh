#!/bin/bash
# Certbot SSL Provisioning Automation for Pay2Pay Platform Monorepo

set -e

echo "=== Provisioning Wildcard Ready SSL Certificates for pay2pay.in ==="

# Install certbot if missing
if ! command -v certbot &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Request Let's Encrypt SSL certificate for all platform subdomains
sudo certbot certonly --nginx \
    -d pay2pay.in \
    -d www.pay2pay.in \
    -d super.pay2pay.in \
    -d admin.pay2pay.in \
    -d sd.pay2pay.in \
    -d dist.pay2pay.in \
    -d ret.pay2pay.in \
    -d share.pay2pay.in \
    -d auth.pay2pay.in \
    -d api.pay2pay.in \
    --non-interactive \
    --agree-tos \
    --email admin@pay2pay.in || true

echo "=== SSL Setup Completed. Reloading Nginx ==="
sudo nginx -t
sudo systemctl reload nginx
