#!/usr/bin/env bash
# One-time setup for a fresh Lightsail Ubuntu 24.04 instance (2 GB plan).
# Run over SSH as the default `ubuntu` user:
#
#   curl -fsSL https://raw.githubusercontent.com/naveenmanoharan-del/DriverLink/main/deploy/lightsail/setup.sh -o setup.sh
#   DOMAIN=yuktisolutions.co.in bash setup.sh
#
# (If the repository is private, copy this file up with scp instead.)
#
# It installs Node 22, pm2, nginx, certbot and the Postgres 17 client, adds 2 GB
# of swap so `next build` doesn't run out of memory, clones the repository and
# configures nginx. It does NOT start the app: fill in the env files it creates,
# then run deploy.sh. Safe to re-run.
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=yuktisolutions.co.in bash setup.sh}"
REPO="${REPO:-git@github.com:naveenmanoharan-del/DriverLink.git}"
APP_DIR="$HOME/DriverLink"

echo "==> Swap (2 GB)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> System packages"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx

echo "==> Node.js 22"
if ! node --version 2>/dev/null | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g pm2

echo "==> Postgres 17 client (for moving data off Supabase)"
if ! command -v pg_dump >/dev/null || ! pg_dump --version | grep -q ' 17'; then
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y postgresql-client-17
fi

echo "==> GitHub access"
if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
  ssh-keygen -t ed25519 -N '' -f "$HOME/.ssh/id_ed25519" -C "lightsail-deploy"
fi
ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null
if [ ! -d "$APP_DIR/.git" ]; then
  echo
  echo "Add this key on GitHub: repo -> Settings -> Deploy keys -> Add deploy key (read-only):"
  echo
  cat "$HOME/.ssh/id_ed25519.pub"
  echo
  read -r -p "Press Enter once the key is added... "
  git clone "$REPO" "$APP_DIR"
fi

echo "==> Env files"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  sed "s|__DOMAIN__|$DOMAIN|g" "$APP_DIR/deploy/lightsail/api.env.example" > "$APP_DIR/backend/.env"
  # Fresh random secrets; nothing secret is ever committed.
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" "$APP_DIR/backend/.env"
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" "$APP_DIR/backend/.env"
  chmod 600 "$APP_DIR/backend/.env"
fi
if [ ! -f "$APP_DIR/web/.env.production" ]; then
  echo "NEXT_PUBLIC_API_URL=https://$DOMAIN/api" > "$APP_DIR/web/.env.production"
fi

echo "==> nginx"
sed "s|__DOMAIN__|$DOMAIN|g" "$APP_DIR/deploy/lightsail/nginx.conf" | sudo tee /etc/nginx/sites-available/yukti >/dev/null
sudo ln -sf /etc/nginx/sites-available/yukti /etc/nginx/sites-enabled/yukti
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> pm2 on boot"
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

cat <<EOF

Setup done. Next:
  1. Fill in DATABASE_URL, RESEND_API_KEY, ADMIN_PHONE and ADMIN_PASSWORD in
       $APP_DIR/backend/.env
  2. Build and start:   bash $APP_DIR/deploy/lightsail/deploy.sh
  3. Once DNS for $DOMAIN points at this server's static IP, turn on HTTPS:
       sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN
EOF
