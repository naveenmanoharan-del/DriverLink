#!/usr/bin/env bash
# Pulls the latest main, builds both apps, migrates the database and restarts.
# Run on the server:  bash ~/DriverLink/deploy/lightsail/deploy.sh
#
# The site is briefly unavailable (a minute or two) while `npm ci` and
# `next build` replace files the running processes use.
set -euo pipefail

cd "$(dirname "$0")/../.."
git pull --ff-only

echo "==> API"
cd backend
npm ci
npm run build
# Applies pending migrations, re-seeds categories and creates the first admin.
node dist/src/database/migrate
cd ..

echo "==> Website"
cd web
npm ci
# NEXT_PUBLIC_API_URL comes from web/.env.production and is baked in here.
npm run build
cd ..

pm2 startOrReload deploy/lightsail/ecosystem.config.js --update-env
pm2 save

sleep 3
curl -fsS http://127.0.0.1:3000/api/health >/dev/null && echo "API healthy"
curl -fsS -o /dev/null http://127.0.0.1:3001/ && echo "Website up"
