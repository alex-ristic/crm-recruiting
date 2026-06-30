# OpenClaw VPS Deployment Guide

This guide is written for an AI deployment agent that receives only the GitHub repository link and must deploy the Recruiting CRM safely on a VPS.

Do not commit or upload private `.env` files, `crm-state.json`, local backups, or credentials. Code lives in GitHub. CRM data lives on the VPS.

## Assumptions

- OS: Ubuntu 22.04 LTS or 24.04 LTS, or a close Debian-based VPS.
- Access: SSH user with `sudo`.
- Network: a domain such as `crm.example.com` points to the VPS.
- Python: Python 3.9+.
- Service name: `crm-recruiting`.
- App listens only on `127.0.0.1:8000`; Nginx handles public HTTP/HTTPS.

## Paths

```text
/opt/crm-recruiting/                         application code
/opt/crm-recruiting/.venv/                   Python virtual environment
/var/lib/crm-recruiting/crm-state.json       live CRM data
/var/lib/crm-recruiting/backups/             local JSON backups
/etc/crm-recruiting.env                      production environment file
/etc/systemd/system/crm-recruiting.service   systemd service
```

## Required Packages

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv nginx certbot python3-certbot-nginx git rclone
```

## Initial Deployment

Clone the repository into the app location:

```bash
sudo mkdir -p /opt/crm-recruiting
sudo chown "$USER":"$USER" /opt/crm-recruiting
git clone REPLACE_WITH_GITHUB_REPO_URL /opt/crm-recruiting
cd /opt/crm-recruiting
```

Create the service user and data directories:

```bash
sudo useradd --system --home /var/lib/crm-recruiting --shell /usr/sbin/nologin crm-recruiting || true
sudo mkdir -p /var/lib/crm-recruiting/backups
sudo chown -R crm-recruiting:crm-recruiting /var/lib/crm-recruiting
sudo chmod 750 /var/lib/crm-recruiting /var/lib/crm-recruiting/backups
```

Create a Python virtual environment and install dependencies:

```bash
python3 -m venv /opt/crm-recruiting/.venv
/opt/crm-recruiting/.venv/bin/python -m pip install --upgrade pip
/opt/crm-recruiting/.venv/bin/pip install -r /opt/crm-recruiting/requirements.txt
```

Run tests before creating the service:

```bash
cd /opt/crm-recruiting
/opt/crm-recruiting/.venv/bin/python -m unittest
```

## Production Environment File

Create `/etc/crm-recruiting.env` from the template:

```bash
sudo cp /opt/crm-recruiting/.env.production.example /etc/crm-recruiting.env
sudo chown root:crm-recruiting /etc/crm-recruiting.env
sudo chmod 640 /etc/crm-recruiting.env
sudo nano /etc/crm-recruiting.env
```

Use these production values:

```bash
CRM_HOST=127.0.0.1
CRM_PORT=8000
CRM_STATE_FILE=/var/lib/crm-recruiting/crm-state.json
CRM_BACKUP_DIR=/var/lib/crm-recruiting/backups
CRM_MAX_BACKUPS=50
CRM_MAX_STATE_BYTES=5242880
CRM_AUTH_REQUIRED=1
CRM_COOKIE_SECURE=1
CRM_SESSION_COOKIE_NAME=crm_recruiting_session
CRM_SESSION_MAX_AGE_SECONDS=43200
ADMIN_USERNAME=CHANGE_ME
ADMIN_PASSWORD_HASH=CHANGE_ME
SESSION_SECRET=CHANGE_ME
CRM_ENV=production
```

Generate the password hash:

```bash
cd /opt/crm-recruiting
/opt/crm-recruiting/.venv/bin/python -m crm.auth 'REPLACE_WITH_LONG_ADMIN_PASSWORD'
```

Generate the session secret:

```bash
/opt/crm-recruiting/.venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(64))'
```

Important:

- Do not store the raw admin password in any file.
- Use `CRM_COOKIE_SECURE=1` after HTTPS is active.
- Use `CRM_COOKIE_SECURE=0` only temporarily if testing over plain HTTP.

## Existing Data

If there is existing `crm-state.json`, copy it to:

```bash
sudo cp crm-state.json /var/lib/crm-recruiting/crm-state.json
sudo chown crm-recruiting:crm-recruiting /var/lib/crm-recruiting/crm-state.json
sudo chmod 640 /var/lib/crm-recruiting/crm-state.json
```

Never place live CRM data inside `/opt/crm-recruiting/`.

## systemd Service

Install the service file:

```bash
sudo cp /opt/crm-recruiting/deploy/systemd/crm-recruiting.service.example /etc/systemd/system/crm-recruiting.service
sudo systemctl daemon-reload
sudo systemctl enable crm-recruiting
sudo systemctl start crm-recruiting
```

Service commands:

```bash
sudo systemctl start crm-recruiting
sudo systemctl stop crm-recruiting
sudo systemctl restart crm-recruiting
sudo systemctl status crm-recruiting --no-pager
journalctl -u crm-recruiting -f
```

Verify the app is listening locally:

```bash
curl -I http://127.0.0.1:8000/login
```

## Nginx Reverse Proxy

Copy the example config and replace `crm.example.com`:

```bash
sudo cp /opt/crm-recruiting/deploy/nginx/crm-recruiting.conf.example /etc/nginx/sites-available/crm-recruiting
sudo nano /etc/nginx/sites-available/crm-recruiting
sudo ln -s /etc/nginx/sites-available/crm-recruiting /etc/nginx/sites-enabled/crm-recruiting
sudo nginx -t
sudo systemctl reload nginx
```

The proxy must send public traffic to:

```text
http://127.0.0.1:8000
```

## HTTPS

After DNS points to the VPS:

```bash
sudo certbot --nginx -d crm.example.com
sudo nginx -t
sudo systemctl reload nginx
```

After HTTPS is working, confirm:

```bash
grep '^CRM_COOKIE_SECURE=1' /etc/crm-recruiting.env
sudo systemctl restart crm-recruiting
```

## Deployment Verification

Run these checks:

```bash
sudo systemctl status crm-recruiting --no-pager
journalctl -u crm-recruiting -n 100 --no-pager
curl -I http://127.0.0.1:8000/login
curl -I https://crm.example.com/login
```

Manual browser verification:

1. Open `https://crm.example.com`.
2. Confirm the login page appears.
3. Log in with `ADMIN_USERNAME` and the real password.
4. Confirm existing jobs, positions, candidates, and tasks appear.
5. Add a temporary candidate and task.
6. Refresh the page and confirm the temporary data persists.
7. Delete the temporary candidate/task.
8. Confirm `/crm-state.json` is not publicly available.
9. Confirm browser console has no errors.

## Backups

The app creates a timestamped local backup before every successful overwrite:

```text
/var/lib/crm-recruiting/backups/crm-state-YYYYMMDD-HHMMSS-ffffff.json
```

Use `VPS_BACKUP.md` for rclone offsite backups and restore procedures.

Manual backup:

```bash
cd /opt/crm-recruiting
sudo deploy/scripts/backup.sh
```

Optional rclone sync:

```bash
RCLONE_REMOTE=gdrive:crm-recruiting-backups sudo -E deploy/scripts/backup.sh
```

## Updating From GitHub

```bash
cd /opt/crm-recruiting
git status
git fetch --all --prune
git pull --ff-only
/opt/crm-recruiting/.venv/bin/pip install -r requirements.txt
/opt/crm-recruiting/.venv/bin/python -m unittest
sudo systemctl restart crm-recruiting
sudo systemctl status crm-recruiting --no-pager
```

Or run:

```bash
cd /opt/crm-recruiting
deploy/scripts/update.sh
```

## Rollback If Deployment Fails

Code rollback:

```bash
cd /opt/crm-recruiting
git log --oneline -10
git checkout PREVIOUS_GOOD_COMMIT
/opt/crm-recruiting/.venv/bin/pip install -r requirements.txt
/opt/crm-recruiting/.venv/bin/python -m unittest
sudo systemctl restart crm-recruiting
journalctl -u crm-recruiting -n 100 --no-pager
```

Data rollback:

```bash
ls -lt /var/lib/crm-recruiting/backups/
sudo /opt/crm-recruiting/deploy/scripts/restore.sh /var/lib/crm-recruiting/backups/crm-state-YYYYMMDD-HHMMSS-ffffff.json
```

If the service fails after rollback, stop it and inspect logs:

```bash
sudo systemctl stop crm-recruiting
journalctl -u crm-recruiting -n 200 --no-pager
```

## Final Safety Checklist

- `/etc/crm-recruiting.env` exists and contains no `CHANGE_ME`.
- `CRM_AUTH_REQUIRED=1`.
- `CRM_COOKIE_SECURE=1` when using HTTPS.
- `/var/lib/crm-recruiting/` is owned by `crm-recruiting`.
- `/opt/crm-recruiting/` contains code only, not live CRM data.
- Nginx config points to `127.0.0.1:8000`.
- `/crm-state.json` is blocked publicly.
- Offsite rclone backup is configured.
