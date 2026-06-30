#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/crm-recruiting}"
DATA_DIR="${DATA_DIR:-/var/lib/crm-recruiting}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/crm-recruiting/backups}"
ENV_FILE="${ENV_FILE:-/etc/crm-recruiting.env}"
SERVICE_USER="${SERVICE_USER:-crm-recruiting}"
SERVICE_FILE="/etc/systemd/system/crm-recruiting.service"

echo "Installing system packages..."
sudo apt-get update
sudo apt-get install -y python3 python3-venv nginx certbot python3-certbot-nginx git rclone

echo "Creating service user and directories..."
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  sudo useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
sudo mkdir -p "$APP_DIR" "$DATA_DIR" "$BACKUP_DIR"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
sudo chmod 750 "$DATA_DIR" "$BACKUP_DIR"

echo "Creating Python virtual environment..."
python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/python" -m pip install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt"

if [ ! -f "$ENV_FILE" ]; then
  echo "Creating env template at $ENV_FILE"
  sudo cp "$APP_DIR/.env.production.example" "$ENV_FILE"
  sudo chown root:"$SERVICE_USER" "$ENV_FILE"
  sudo chmod 640 "$ENV_FILE"
  echo "Edit $ENV_FILE and replace CHANGE_ME values before starting the service."
else
  echo "$ENV_FILE already exists; leaving it unchanged."
fi

echo "Installing systemd service..."
sudo cp "$APP_DIR/deploy/systemd/crm-recruiting.service.example" "$SERVICE_FILE"
sudo systemctl daemon-reload

echo "Install complete. Edit $ENV_FILE, then run:"
echo "  sudo systemctl enable --now crm-recruiting"
