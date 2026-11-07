#!/bin/bash
set -euo pipefail

# One-time switch to Let's Encrypt certificates with automatic renewal.
# Safe to re-run: existing certificates are kept until they near expiry.
# Usage: sudo bash /srv/certstar/deploy/setup-ssl.sh [email]
#
# Afterwards certbot's systemd timer renews certs ~30 days before expiry and
# reloads nginx via a deploy hook — nothing else to do.

REPO_DIR="/srv/certstar"
NGINX_CONF="/etc/nginx/conf.d/certstar.conf"
WEBROOT="/var/www/certbot"

# One cert per site. The first domain is the cert name, which must match the
# /etc/letsencrypt/live/<name>/ paths in deploy/nginx.conf.
CERTS=(
    "qrcode-portal.site www.qrcode-portal.site"
    "cert-inquiry.cn www.cert-inquiry.cn"
)

echo ""
echo "╔══════════════════════════════╗"
echo "║   CertStar SSL Setup         ║"
echo "╚══════════════════════════════╝"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Run as root: sudo bash $0"
    exit 1
fi

EMAIL="${1:-}"
if [ -n "$EMAIL" ]; then
    EMAIL_ARGS=(--email "$EMAIL")
else
    EMAIL_ARGS=(--register-unsafely-without-email)
fi

ALL_DOMAINS=""
for entry in "${CERTS[@]}"; do ALL_DOMAINS="$ALL_DOMAINS $entry"; done

# ── Install certbot ───────────────────────────────────────────────────────────
echo "==> Installing certbot..."
if ! command -v certbot > /dev/null; then
    apt update
    apt install -y certbot
fi
echo "    $(certbot --version 2>&1)"
mkdir -p "$WEBROOT/.well-known/acme-challenge"

# ── Temporary HTTP-only config (only if some cert is missing) ─────────────────
# deploy/nginx.conf references the Let's Encrypt cert files, so nginx won't
# load it until they exist. Serve just the challenge path on port 80 meanwhile.
# HTTPS is down from here until the final config is installed (~30s).
NEED_TEMP=false
for entry in "${CERTS[@]}"; do
    name="${entry%% *}"
    [ -f "/etc/letsencrypt/live/$name/fullchain.pem" ] || NEED_TEMP=true
done

BACKUP=""
restore_nginx() {
    echo ""
    echo "!!  Failed — restoring previous nginx config"
    if [ -n "$BACKUP" ]; then
        cp "$BACKUP" "$NGINX_CONF"
    else
        rm -f "$NGINX_CONF"
    fi
    nginx -t && systemctl reload nginx
}

if $NEED_TEMP; then
    echo "==> Switching nginx to temporary HTTP-only config..."
    if [ -f "$NGINX_CONF" ]; then
        BACKUP="$NGINX_CONF.bak-$(date +%Y%m%d%H%M%S)"
        cp "$NGINX_CONF" "$BACKUP"
        echo "    Backed up current config to $BACKUP"
    fi
    trap restore_nginx ERR

    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name$ALL_DOMAINS;
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
    location / {
        return 503;
    }
}
EOF
    nginx -t
    systemctl reload nginx
fi

# ── Pre-flight: can each domain reach this server on port 80? ─────────────────
# Let's Encrypt allows only a few failed validations per hour, so catch DNS /
# security-group problems here first. Warning only: some networks can't reach
# their own public IP from inside, which would give a false failure.
echo "==> Checking each domain serves the challenge path..."
TOKEN="certstar-check-$RANDOM"
echo "$TOKEN" > "$WEBROOT/.well-known/acme-challenge/$TOKEN"
for d in $ALL_DOMAINS; do
    if curl -fsS -m 10 "http://$d/.well-known/acme-challenge/$TOKEN" 2>/dev/null | grep -q "$TOKEN"; then
        echo "    OK    $d"
    else
        echo "    WARN  $d — not reachable; check its DNS A record and that port 80 is open"
    fi
done
rm -f "$WEBROOT/.well-known/acme-challenge/$TOKEN"

# ── Issue certificates ────────────────────────────────────────────────────────
echo "==> Requesting certificates..."
for entry in "${CERTS[@]}"; do
    read -r -a domains <<< "$entry"
    domain_args=()
    for d in "${domains[@]}"; do domain_args+=(-d "$d"); done
    certbot certonly --webroot -w "$WEBROOT" \
        --cert-name "${domains[0]}" "${domain_args[@]}" \
        --non-interactive --agree-tos --keep-until-expiring \
        "${EMAIL_ARGS[@]}"
done

# ── Reload nginx after every renewal ──────────────────────────────────────────
echo "==> Installing renewal hook..."
HOOK="/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"
mkdir -p "$(dirname "$HOOK")"
cat > "$HOOK" <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
chmod +x "$HOOK"
echo "    $HOOK"

# ── Final config ──────────────────────────────────────────────────────────────
echo "==> Installing final nginx config..."
cp "$REPO_DIR/deploy/nginx.conf" "$NGINX_CONF"
nginx -t
systemctl reload nginx
trap - ERR

# ── Verify renewal works ──────────────────────────────────────────────────────
echo "==> Testing renewal (dry run)..."
if certbot renew --dry-run --quiet; then
    echo "    OK"
else
    echo "    WARN: dry-run renewal failed — HTTPS is working now, but check 'certbot renew --dry-run' output"
fi

if systemctl is-enabled certbot.timer > /dev/null 2>&1; then
    echo "    Auto-renew timer: $(systemctl show certbot.timer -p NextElapseUSecRealtime --value | sed 's/^$/scheduled/')"
elif [ -f /etc/cron.d/certbot ]; then
    echo "    Auto-renew: /etc/cron.d/certbot"
else
    echo "    WARN: no certbot timer or cron found — renewal will not run automatically"
fi

echo ""
certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" || true
echo ""
echo "✓ SSL setup complete"
echo ""
