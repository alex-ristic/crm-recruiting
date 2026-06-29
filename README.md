# Recruiting CRM

A lightweight local CRM for recruiting work. The current app is a static browser UI backed by a small Python HTTP server that persists CRM state to JSON.

## Run Locally

```bash
python3 -u server.py
```

Open:

```text
http://127.0.0.1:8000
```

## Configuration

The app runs without environment variables. Optional settings:

```bash
CRM_HOST=127.0.0.1
CRM_PORT=8000
CRM_STATE_FILE=crm-state.json
CRM_BACKUP_DIR=backups
CRM_MAX_STATE_BYTES=5242880
```

See `.env.example` for the same values.

For VPS use, set `CRM_AUTH_REQUIRED=1`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`. Generate a password hash with:

```bash
python3 -m crm.auth 'your-long-admin-password'
```

## Tests

```bash
python3 -m unittest
```

The tests use only the Python standard library.

## Current Storage

CRM data is stored as one JSON document. By default that file is:

```text
crm-state.json
```

The browser also keeps a localStorage fallback. The backend API contract is:

- `GET /api/state` returns `{"state": <object-or-null>}`.
- `POST /api/state` accepts a complete JSON state object and returns `{"ok": true}`.

## Local-Only Notice

For online use, read `VPS_DEPLOYMENT.md` and `VPS_BACKUP.md` first. Keep `crm-state.json`, `.env`, and `/etc/crm-recruiting.env` out of git.
