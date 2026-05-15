#!/bin/bash
# AMS deployment script — run on production server
# Usage: ./scripts/deploy.sh [branch]

set -e

BRANCH=${1:-main}
APP_DIR="/var/www/ams"
REPO="https://github.com/ankdigitalmedia/ams.git"

echo "==> Deploying AMS from branch: $BRANCH"

# Pull latest code
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Installing backend dependencies"
cd "$APP_DIR/backend"
npm ci --omit=dev

echo "==> Building frontend"
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> Reloading PM2 (zero-downtime)"
cd "$APP_DIR/backend"
pm2 reload ecosystem.config.js --env production

echo "==> Reloading Nginx"
sudo nginx -t && sudo systemctl reload nginx

echo "==> Verifying health"
sleep 3
curl -sf https://ams.ankdigitalmedia.com/api/v1/health | grep '"status":"ok"' && \
  echo "✓ Health check passed" || \
  (echo "✗ Health check failed!" && exit 1)

echo "==> Deploy complete at $(date)"
