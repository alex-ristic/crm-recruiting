import json
import logging
from http import HTTPStatus

from crm.utils.validation import RequestValidationError, parse_json_body


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
        handler.storage.save_state(payload)
    except RequestValidationError as exc:
        logger.info("Rejected invalid state payload: %s", exc)
        send_json(handler, {"ok": False}, HTTPStatus.BAD_REQUEST)
        return
    except OSError:
        logger.exception("Unable to persist CRM state")
        send_json(handler, {"ok": False}, HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    send_json(handler, {"ok": True})

