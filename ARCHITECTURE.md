# Architecture

## Overview

The project is intentionally simple:

- `server.py` starts the local CRM server.
- `crm/` contains backend configuration, routing, validation, logging, and storage.
- `index.html` loads the browser app.
- `src/app.js` contains the current frontend CRM experience.
- `src/styles.css` contains the current UI styles.
- `crm-state.json` is the local persisted state file.
- `tests/` contains smoke and storage tests.

## Backend Layout

```text
crm/
  app.py                 HTTP server factory and static file serving
  config.py              Environment-backed settings
  logging_config.py      Logging setup
  routes/state.py        /api/state handlers
  storage/base.py        Storage interface
  storage/json_storage.py JSON-backed storage implementation
  utils/validation.py    Request parsing and validation helpers
```

The backend keeps routes separate from storage so a later Postgres implementation can replace `JsonStateStorage` without changing the API route shape.

## Frontend Layout

`src/app.js` is still a single-file frontend. It owns:

- default CRM seed data
- browser state hydration and normalization
- rendering
- DOM event binding
- candidate, position, job, and task interactions

This was deliberately left in place during the first hardening pass to preserve behavior. Future UI work should split it by domain only when making related feature changes.

## HTTP Contract

The frontend relies on:

- `GET /api/state`
- `POST /api/state`
- `/`
- `/src/app.js`
- `/src/styles.css`

The server only serves those static files. It does not expose the project root.

## Storage Migration Path

The current JSON storage class reads and writes a complete state object. A future database migration should:

1. Add a new storage implementation behind `StateStorage`.
2. Keep route responses stable while introducing domain-level methods.
3. Add import/migration scripts from `crm-state.json`.
4. Move frontend save behavior away from full-state writes when the API becomes resource-based.

