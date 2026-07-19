# VPS Deployment

Do not commit CRM data or secrets. Put code, data, and secrets in separate places:

```text
/opt/crm-recruiting/              app code
/var/lib/crm-recruiting/          CRM data
/var/lib/crm-recruiting/backups/  local timestamped backups
/etc/crm-recruiting.env           environment secrets
```

## Prepare Directories

```bash
sudo mkdir -p /opt/crm-recruiting
sudo mkdir -p /var/lib/crm-recruiting/backups
sudo chown -R "$USER":"$USER" /opt/crm-recruiting
sudo chown -R "$USER":"$USER" /var/lib/crm-recruiting
```

Copy or clone the code into:

```text
/opt/crm-recruiting/
```

Move existing local data to:

```text
/var/lib/crm-recruiting/crm-state.json
```

## Environment

Create `/etc/crm-recruiting.env`:

```bash
CRM_HOST=127.0.0.1
CRM_PORT=8000
CRM_ENV=production
CRM_STATE_FILE=/var/lib/crm-recruiting/crm-state.json
CRM_USER_FILE=/var/lib/crm-recruiting/crm-users.json
CRM_BACKUP_DIR=/var/lib/crm-recruiting/backups
CRM_MAX_BACKUPS=50
CRM_MAX_STATE_BYTES=5242880
CRM_AUTH_REQUIRED=1
CRM_COOKIE_SECURE=1
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=REPLACE_WITH_HASH
SESSION_SECRET=REPLACE_WITH_RANDOM_SECRET
```

The initial administrator is created from `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` the first time the app starts. Additional users, roles, and permissions are managed from the Users screen.

The app also accepts `HOST`, `PORT`, and `CRM_STATE_PATH` as aliases, but the `CRM_*` names above are preferred for clarity.

Generate password hash:

```bash
cd /opt/crm-recruiting
python3 -m crm.auth 'your-long-admin-password'
```

Generate session secret:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
```

Protect the env file:

```bash
sudo chown root:root /etc/crm-recruiting.env
sudo chmod 600 /etc/crm-recruiting.env
```

## systemd

Create `/etc/systemd/system/crm-recruiting.service`:

```ini
[Unit]
Description=Recruiting CRM
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/crm-recruiting
EnvironmentFile=/etc/crm-recruiting.env
ExecStart=/usr/bin/python3 -u server.py
Restart=on-failure
RestartSec=5
User=www-data
Group=www-data
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/lib/crm-recruiting

[Install]
WantedBy=multi-user.target
```

Make sure `www-data` can read code and write data:

```bash
sudo chown -R www-data:www-data /var/lib/crm-recruiting
sudo chown -R root:root /opt/crm-recruiting
sudo chmod -R a+rX /opt/crm-recruiting
```

Service commands:

```bash
sudo systemctl daemon-reload
sudo systemctl enable crm-recruiting
sudo systemctl start crm-recruiting
sudo systemctl stop crm-recruiting
sudo systemctl restart crm-recruiting
sudo systemctl status crm-recruiting
journalctl -u crm-recruiting -f
```

## Nginx Reverse Proxy

Example `/etc/nginx/sites-available/crm-recruiting`:

```nginx
server {
    server_name crm.example.com;

    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/crm-recruiting /etc/nginx/sites-enabled/crm-recruiting
sudo nginx -t
sudo systemctl reload nginx
```

Use HTTPS before entering real CRM data online:

```bash
sudo certbot --nginx -d crm.example.com
```

## Security Checklist

- `CRM_AUTH_REQUIRED=1`
- `CRM_COOKIE_SECURE=1`
- Strong `ADMIN_PASSWORD_HASH`
- Random `SESSION_SECRET`
- Data in `/var/lib/crm-recruiting/`, not git
- `crm-users.json` included in protected backups
- Backups enabled and not web-served
- Nginx HTTPS enabled
