#!/bin/bash
# ==============================================================================
# Pay2Pay Automatic Server Provisioning & Software Setup Script
# Target OS: Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

set -e

echo "===================================================="
echo " Starting Pay2Pay Server Software Installation...   "
echo "===================================================="

# 1. Update system package repositories
echo "[1/6] Updating APT package repositories..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Python 3, pip, venv, git, curl, Nginx, and build utilities
echo "[2/6] Installing Python, Git, Nginx, and system utilities..."
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nginx \
    git \
    curl \
    unzip \
    build-essential \
    libpq-dev \
    ufw

# 3. Install Node.js 20 LTS and npm
echo "[3/6] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

node_ver=$(node -v)
npm_ver=$(npm -v)
echo "Installed Node.js: $node_ver, npm: $npm_ver"

# 4. Install PM2 process manager globally
echo "[4/6] Installing PM2 process manager..."
sudo npm install -g pm2

# 5. Enable & Configure Firewall (UFW)
echo "[5/6] Configuring Firewall (Allow SSH, HTTP, HTTPS)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 6. Configure Nginx Reverse Proxy
echo "[6/6] Configuring Nginx reverse proxy..."
sudo cat << 'EOF' | sudo tee /etc/nginx/sites-available/pay2pay
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Pay2Pay Public Company Website (Port 3005)
    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Retailer Portal & Workspaces (Port 3000)
    location ~ ^/(retailer|dist|sd|admin|super-admin) {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend (FastAPI) Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/pay2pay /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "===================================================="
echo " Server Software Setup Completed Successfully!      "
echo " Installed: Node.js, Python3, Nginx, PM2, UFW        "
echo " Port 80 is now active and routing traffic.         "
echo "===================================================="
