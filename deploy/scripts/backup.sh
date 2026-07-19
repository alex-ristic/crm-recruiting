#!/usr/bin/env bash
set -euo pipefail

DATA_FILE="${DATA_FILE:-/var/lib/crm-recruiting/crm-state.json}"
USER_FILE="${USER_FILE:-/var/lib/crm-recruiting/crm-users.json}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/crm-recruiting/backups}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

if [ ! -f "$DATA_FILE" ]; then
  echo "No CRM data file found at $DATA_FILE"
  exit 1
fi

sudo mkdir -p "$BACKUP_DIR"
sudo cp "$DATA_FILE" "$BACKUP_DIR/crm-state-manual-$STAMP.json"
echo "Created $BACKUP_DIR/crm-state-manual-$STAMP.json"

if [ -f "$USER_FILE" ]; then
  sudo cp "$USER_FILE" "$BACKUP_DIR/crm-users-manual-$STAMP.json"
  echo "Created $BACKUP_DIR/crm-users-manual-$STAMP.json"
fi

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "Syncing $BACKUP_DIR to $RCLONE_REMOTE"
  rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE"
fi
