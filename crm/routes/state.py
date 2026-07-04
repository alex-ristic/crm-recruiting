import json
import logging
from http import HTTPStatus

from crm.utils.validation import RequestValidationError, parse_json_body
from crm.utils.state_validation import StateValidationError, validate_crm_state


logger = logging.getLogger(__name__)


def send_json(handler, payload, status=HTTPStatus.OK):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def handle_get_state(handler):
    send_json(handler, {"state": handler.storage.load_state()})


def handle_post_state(handler):
    try:
        payload = parse_json_body(handler, handler.settings.max_state_bytes)
        strip_removed_fields(payload)
        validate_crm_state(payload)
        current_state = handler.storage.load_state()
        current_revision = current_state.get("_revision", 0) if isinstance(current_state, dict) else 0
        payload_revision = payload.get("_revision")
        if current_state is not None and payload_revision != current_revision:
            send_json(handler, {"ok": False, "state": current_state, "reason": "stale_state"}, HTTPStatus.CONFLICT)
            return
        payload["_revision"] = current_revision + 1
        handler.storage.save_state(payload)
    except RequestValidationError as exc:
        logger.info("Rejected invalid state payload: %s", exc)
        send_json(handler, {"ok": False}, HTTPStatus.BAD_REQUEST)
        return
    except StateValidationError as exc:
        logger.info("Rejected invalid CRM state: %s", exc)
        send_json(handler, {"ok": False, "reason": "invalid_state"}, HTTPStatus.BAD_REQUEST)
        return
    except OSError:
        logger.exception("Unable to persist CRM state")
        send_json(handler, {"ok": False}, HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    send_json(handler, {"ok": True, "state": payload})


def strip_removed_fields(payload):
    if not isinstance(payload, dict):
        return
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        return
    allowed_candidate_fields = {
        "added",
        "eu",
        "experience",
        "id",
        "jobId",
        "lastActivityAt",
        "name",
        "note",
        "phone",
        "positionId",
        "source",
        "startDate",
        "stage",
        "tasks",
        "whenStart",
    }
    for candidate in candidates:
        if isinstance(candidate, dict):
            for field in list(candidate):
                if field not in allowed_candidate_fields:
                    candidate.pop(field, None)
