# Development Notes

## Refactor Summary

The first pass kept the CRM behavior intact while separating the backend into focused modules:

- `server.py` is now startup-only.
- Config moved to `crm/config.py`.
- `/api/state` route logic moved to `crm/routes/state.py`.
- JSON persistence moved to `crm/storage/json_storage.py`.
- Request validation moved to `crm/utils/validation.py`.
- Logging setup moved to `crm/logging_config.py`.
- Smoke and storage tests were added under `tests/`.
- Project docs, `.env.example`, `.gitignore`, and `requirements.txt` were added.

The frontend pass split the old single `src/app.js` into focused browser modules:

- `src/app.js` is now startup-only.
- API calls moved to `src/js/api.js`.
- State hydration, normalization, load/save, and `setState` moved to `src/js/state.js`.
- Derived lookups and filters moved to `src/js/selectors.js`.
- Event binding and drag/drop handlers moved to `src/js/events.js`.
- Candidate, job/position, task, and UI actions moved under `src/js/actions/`.
- Board, modal, topbar, and task rendering moved under `src/js/render/`.
- Shared formatting/date/id helpers moved under `src/js/utils/`.
- The backend static server now serves nested `.js` files under `src/` for browser module imports.

The VPS prep pass added:

- Single-user auth using `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`.
- Signed HttpOnly session cookies and CSRF-protected state writes.
- Login, logout, and `/api/session`.
- CRM state validation before save.
- Timestamped local backups before overwrite.
- VPS deployment and offsite backup docs.

## Safety Backup

A pre-refactor copy was created outside the served project tree:

```text
/private/tmp/crm-recruiting-pre-refactor-20260629-134416
```

## Behavior Notes

The main app behavior is intended to be unchanged. One deliberate hardening change was made: the server no longer serves arbitrary files from the project root, so files like `crm-state.json` are not directly downloadable as static files. Browser module files under `src/` are served so the frontend can use ES modules. In VPS mode, auth must be configured before the CRM is exposed online.

## Remaining Technical Debt

- Frontend modules are separated, but many render functions are still string-template based and large.
- The API still persists the complete CRM state as one JSON document.
- Authentication is single-user only.
- CRM state validation is intentionally basic and should become stricter before bulk imports.
- Browser interaction checks are manual/runtime checks, not automated test-suite coverage yet.
- Google Fonts are loaded from the network.
- VPS deployment docs exist, but no deployment has been performed from this workspace.

## Suggested Next Steps

1. Tighten state validation before CSV or AI imports.
2. Add an import staging service for CSV/AI extraction so imported data can be reviewed before saving.
3. Add automated browser tests for add/edit/delete/task persistence.
4. Add a database-backed storage implementation when concurrent use or reporting becomes important.
5. Add multi-user auth only if the CRM workflow needs it.
