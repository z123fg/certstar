#!/bin/bash
set -e

REPO_DIR="/srv/certstar"
NGINX_CONF="/etc/nginx/conf.d/certstar.conf"

echo ""
echo "╔══════════════════════════════╗"
echo "║   CertStar Deployment        ║"
echo "╚══════════════════════════════╝"
echo ""

# ── Check env files exist ─────────────────────────────────────────────────────
echo "==> Checking env files..."
for f in \
    "$REPO_DIR/packages/backend/.env" \
    "$REPO_DIR/packages/admin/.env" \
    "$REPO_DIR/packages/cert-inquiry/.env"; do
    if [ ! -f "$f" ]; then
        echo "ERROR: Missing env file: $f"
        exit 1
    fi
done
echo "    OK"

# ── Pull latest code ──────────────────────────────────────────────────────────
echo "==> Pulling latest code..."
cd "$REPO_DIR"
git pull

# ── Install dependencies ──────────────────────────────────────────────────────
echo "==> Removing old dependencies..."
rm -rf "$REPO_DIR/node_modules" "$REPO_DIR/package-lock.json"
echo "==> Installing dependencies..."
npm install

# ── Generate Prisma client ────────────────────────────────────────────────────
echo "==> Generating Prisma client..."
cd "$REPO_DIR/packages/backend"
npx prisma generate
cd "$REPO_DIR"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "==> Building backend..."
npm run build -w @certstar/backend

echo "==> Building admin..."
npm run build -w admin

echo "==> Building cert-inquiry..."
npm run build -w @certstar/cert-inquiry

# ── Database migration ────────────────────────────────────────────────────────
echo "==> Running database migrations..."
cd "$REPO_DIR/packages/backend"
npx prisma migrate deploy
cd "$REPO_DIR"

# ── Restart backend ───────────────────────────────────────────────────────────
echo "==> Restarting backend..."
if pm2 describe certstar-api > /dev/null 2>&1; then
    pm2 restart certstar-api
else
    pm2 start "$REPO_DIR/packages/backend/dist/server.js" --name certstar-api
    pm2 save
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "==> Updating Nginx config..."
cp "$REPO_DIR/deploy/nginx.conf" "$NGINX_CONF"
nginx -t && systemctl reload nginx

echo ""
echo "✓ Deployment complete"
echo ""
