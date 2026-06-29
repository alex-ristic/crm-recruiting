# Development Notes

## Refactor Summary

This pass kept the CRM behavior intact while separating the backend into focused modules:

- `server.py` is now startup-only.
- Config moved to `crm/config.py`.
- `/api/state` route logic moved to `crm/routes/state.py`.
- JSON persistence moved to `crm/storage/json_storage.py`.
- Request validation moved to `crm/utils/validation.py`.
- Logging setup moved to `crm/logging_config.py`.
- Smoke and storage tests were added under `tests/`.
- Project docs, `.env.example`, `.gitignore`, and `requirements.txt` were added.

## Safety Backup

A pre-refactor copy was created outside the served project tree:

```text
/private/tmp/crm-recruiting-pre-refactor-20260629-134416
```

## Behavior Notes

The main app behavior is intended to be unchanged. One deliberate hardening change was made: the server no longer serves arbitrary files from the project root, so files like `crm-state.json` are not directly downloadable as static files.

## Remaining Technical Debt

- `src/app.js` is still large and mixes state, rendering, event binding, and frontend business rules.
- The API still persists the complete CRM state as one JSON document.
- There is no authentication or authorization.
- There is no CSRF protection.
- There is no schema validation for individual candidates, positions, jobs, or tasks.
- There are no browser interaction tests yet.
- Google Fonts are loaded from the network.
- There is no deployment profile yet.

## Suggested Next Steps

1. Add lightweight frontend module boundaries around state, rendering, and domain actions.
2. Add state schema validation before CSV or AI imports.
3. Add an import staging service for CSV/AI extraction so imported data can be reviewed before saving.
4. Add authentication before any deployment work.
5. Add a database-backed storage implementation when concurrent use or reporting becomes important.

