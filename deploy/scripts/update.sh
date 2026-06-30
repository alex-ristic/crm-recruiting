#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/crm-recruiting}"

cd "$APP_DIR"
PREVIOUS_COMMIT="$(git rev-parse HEAD)"

echo "Current commit: $PREVIOUS_COMMIT"
echo "Fetching latest code..."
git fetch --all --prune
git pull --ff-only

echo "Updating Python dependencies..."
"$APP_DIR/.venv/bin/pip" install -r requirements.txt

echo "Running tests..."
"$APP_DIR/.venv/bin/python" -m unittest

echo "Restarting service..."
sudo systemctl restart crm-recruiting
sudo systemctl status crm-recruiting --no-pager

echo "Updated from $PREVIOUS_COMMIT to $(git rev-parse HEAD)"
