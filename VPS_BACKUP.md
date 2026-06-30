# VPS Backup And Restore

Code is backed up in GitHub. CRM data is not backed up in GitHub and must never be committed.

Live production data is stored at:

```text
/var/lib/crm-recruiting/crm-state.json
```

The app creates a local timestamped backup before every successful overwrite:

```text
/var/lib/crm-recruiting/backups/crm-state-YYYYMMDD-HHMMSS-ffffff.json
```

It keeps the latest 50 local backups by default.

Local backups protect against bad edits and accidental overwrites. They do not protect against total VPS loss. Configure offsite backups with rclone before relying on the CRM online.

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

Check rclone logs regularly and occasionally perform a test restore to a temporary directory.

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

## Restore On A New VPS After Total VPS Loss

1. Provision a fresh VPS.
2. Clone the GitHub repo into `/opt/crm-recruiting/`.
3. Follow `OPENCLAW_DEPLOYMENT.md` through package install, virtualenv setup, `/etc/crm-recruiting.env`, systemd, Nginx, and HTTPS.
4. Stop the service:

```bash
sudo systemctl stop crm-recruiting
```

5. Restore data from rclone:

```bash
sudo mkdir -p /var/lib/crm-recruiting
rclone copy gdrive:crm-recruiting-backups /var/lib/crm-recruiting
sudo chown -R crm-recruiting:crm-recruiting /var/lib/crm-recruiting
sudo chmod 750 /var/lib/crm-recruiting /var/lib/crm-recruiting/backups
sudo chmod 640 /var/lib/crm-recruiting/crm-state.json
```

6. Start the service:

```bash
sudo systemctl start crm-recruiting
```

7. Log in and verify jobs, positions, candidates, and tasks.

## Verify Restore

Open the CRM, log in, and confirm:

- jobs appear
- positions appear
- candidates appear
- recent tasks/notes are present
- `/crm-state.json` is still blocked
