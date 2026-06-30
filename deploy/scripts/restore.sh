#!/usr/bin/env bash
set -euo pipefail

DATA_FILE="${DATA_FILE:-/var/lib/crm-recruiting/crm-state.json}"
SERVICE_USER="${SERVICE_USER:-crm-recruiting}"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/crm-state-backup.json"
  exit 2
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

python3 -m json.tool "$BACKUP_FILE" >/dev/null

echo "Stopping crm-recruiting..."
sudo systemctl stop crm-recruiting

echo "Restoring $BACKUP_FILE to $DATA_FILE"
sudo mkdir -p "$(dirname "$DATA_FILE")"
sudo cp "$BACKUP_FILE" "$DATA_FILE"
sudo chown "$SERVICE_USER:$SERVICE_USER" "$DATA_FILE"
sudo chmod 640 "$DATA_FILE"

echo "Starting crm-recruiting..."
sudo systemctl start crm-recruiting
sudo systemctl status crm-recruiting --no-pager
