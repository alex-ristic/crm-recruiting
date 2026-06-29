# VPS Backup And Restore

The app creates a local timestamped backup before every successful overwrite:

```text
/var/lib/crm-recruiting/backups/crm-state-YYYYMMDD-HHMMSS-ffffff.json
```

It keeps the latest 50 local backups by default.

## Offsite Backups With rclone

Install rclone:

```bash
sudo apt-get update
sudo apt-get install rclone
```

Configure a remote:

```bash
rclone config
```

Common remote names:

```text
gdrive:
dropbox:
s3:
```

Example backup command:

```bash
rclone sync /var/lib/crm-recruiting gdrive:crm-recruiting-backups --backup-dir gdrive:crm-recruiting-backups-archive/$(date +%Y%m%d-%H%M%S)
```

Example cron job:

```cron
15 * * * * rclone sync /var/lib/crm-recruiting gdrive:crm-recruiting-backups --backup-dir gdrive:crm-recruiting-backups-archive/$(date +\%Y\%m\%d-\%H\%M\%S)
```

## Restore From Local Backup

Stop the service:

```bash
sudo systemctl stop crm-recruiting
```

Copy the desired backup over the live state:

```bash
sudo cp /var/lib/crm-recruiting/backups/crm-state-YYYYMMDD-HHMMSS-ffffff.json /var/lib/crm-recruiting/crm-state.json
sudo chown www-data:www-data /var/lib/crm-recruiting/crm-state.json
```

Start the service:

```bash
sudo systemctl start crm-recruiting
```

Check logs:

```bash
journalctl -u crm-recruiting -n 100
```

## Restore From rclone Remote

List remote backups:

```bash
rclone ls gdrive:crm-recruiting-backups
```

Copy data back:

```bash
sudo systemctl stop crm-recruiting
rclone copy gdrive:crm-recruiting-backups /var/lib/crm-recruiting
sudo chown -R www-data:www-data /var/lib/crm-recruiting
sudo systemctl start crm-recruiting
```

## Verify Restore

Open the CRM, log in, and confirm:

- jobs appear
- positions appear
- candidates appear
- recent tasks/notes are present
- `/crm-state.json` is still blocked
