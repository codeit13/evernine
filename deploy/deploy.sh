#!/usr/bin/env bash
# Idempotent build + restart for the Evernine app on the server.
# Run from the repo root on the server:  bash deploy/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pulling latest"
git pull --ff-only || true

echo "==> Backend deps"
cd "$ROOT/backend"
python3 -m venv .venv
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet -r requirements.txt

echo "==> Frontend build"
cd "$ROOT/frontend"
npm ci
npm run build

echo "==> Restart API"
sudo systemctl restart evernine-api

echo "==> Reload nginx"
sudo nginx -t && sudo systemctl reload nginx

echo "==> Done."
