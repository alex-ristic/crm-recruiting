# Architecture

## Overview

The project is intentionally simple:

- `server.py` starts the local CRM server.
- `crm/` contains backend configuration, routing, validation, logging, and storage.
- `index.html` loads the browser app.
- `src/app.js` starts the browser app.
- `src/js/` contains frontend state, API, events, actions, renderers, selectors, and utilities.
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

`src/app.js` is a small entry point. The browser code is split by concern:

```text
src/
  app.js                  Browser entry point
  styles.css              UI styles
  js/
    api.js                Calls /api/state
    constants.js          Stages, seed jobs, seed positions, migration placeholders
    dom.js                Root element, focus restoration, scroll restoration
    events.js             Event binding and drag/drop handlers
    selectors.js          Derived CRM lookups and filtered collections
    state.js              Current state, hydration, normalization, load/save, setState
    actions/
      candidates.js       Candidate create/update/delete/stage actions
      jobs.js             Job, position, filter, and headline actions
      tasks.js            Task create/update/delete/quick-action logic
      ui.js               Small tab/search/composer actions
    render/
      app.js              Root render function
      candidates.js       Candidate board and modal rendering
      common.js           Rail and topbar rendering
      jobs.js             Jobs, positions, position modal rendering
      tasks.js            Task rendering
    utils/
      dates.js            Date helpers
      formatting.js       Icons, escaping, display formatting
      ids.js              Slug/id helper
```

Rendering, event binding, state persistence, and domain actions are now separate so future changes can usually touch one small file instead of rereading the entire frontend.

## HTTP Contract

The frontend relies on:

- `GET /api/state`
- `POST /api/state`
- `/`
- `/src/app.js`
- `/src/styles.css`
- `/src/**/*.js`

The server serves `index.html` plus `.js` and `.css` files under `src/`. It does not expose the project root.

## Storage Migration Path

The current JSON storage class reads and writes a complete state object. A future database migration should:

1. Add a new storage implementation behind `StateStorage`.
2. Keep route responses stable while introducing domain-level methods.
3. Add import/migration scripts from `crm-state.json`.
4. Move frontend save behavior away from full-state writes when the API becomes resource-based.
