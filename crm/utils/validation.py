import json


class RequestValidationError(ValueError):
    pass


def parse_json_body(handler, max_bytes):
    raw_length = handler.headers.get("Content-Length", "0")
    try:
        length = int(raw_length)
    except ValueError as exc:
        raise RequestValidationError("Content-Length must be an integer") from exc

    if length <= 0:
        raise RequestValidationError("Request body is required")
    if length > max_bytes:
        raise RequestValidationError("Request body is too large")

    try:
        payload = json.loads(handler.rfile.read(length).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RequestValidationError("Request body must be valid JSON") from exc

    if not isinstance(payload, dict):
        raise RequestValidationError("CRM state must be a JSON object")
    return payload

