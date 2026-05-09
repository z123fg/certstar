#!/bin/bash
set -e

# One-time server setup script. Run this once on a fresh ECS instance.
# Usage: bash /srv/certstar/deploy/setup.sh

echo ""
echo "╔══════════════════════════════╗"
echo "║   CertStar Server Setup      ║"
echo "╚══════════════════════════════╝"
echo ""

# ── Node.js via nvm ───────────────────────────────────────────────────────────
echo "==> Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
nvm alias default 22
echo "    Node $(node -v) installed"

# ── PM2 ───────────────────────────────────────────────────────────────────────
echo "==> Installing PM2..."
npm install -g pm2
pm2 startup
echo "    PM2 installed"

# ── PostgreSQL ────────────────────────────────────────────────────────────────
echo "==> Installing PostgreSQL..."
apt update
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "==> Setting up database..."
read -p "Enter database name [certstar]: " DB_NAME
DB_NAME=${DB_NAME:-certstar}
read -p "Enter database user [certstar]: " DB_USER
DB_USER=${DB_USER:-certstar}
read -s -p "Enter database password: " DB_PASS
echo ""

sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

echo ""
echo "    Add this to packages/backend/.env:"
echo "    DATABASE_URL=postgresql://$DB_USER:****@localhost:5432/$DB_NAME"
echo "    (replace **** with your actual password)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup complete. Next steps:                                 ║"
echo "║  1. Create .env files in each package (see .env.example)     ║"
echo "║  2. Run: bash /srv/certstar/deploy/deploy.sh                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
