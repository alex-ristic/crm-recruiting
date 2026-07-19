from http import HTTPStatus

from crm.auth import get_current_user
from crm.routes.state import send_json
from crm.users import effective_permissions, public_user
from crm.utils.validation import RequestValidationError, parse_json_body


def handle_get_users(handler):
    current = get_current_user(handler)
    if not current or not effective_permissions(current)["manageUsers"]:
        send_json(handler, {"ok": False, "reason": "forbidden"}, HTTPStatus.FORBIDDEN)
        return
    send_json(handler, {"users": [public_user(user) for user in handler.user_storage.list_users()]})


def handle_post_users(handler):
    current = get_current_user(handler)
    if not current or not effective_permissions(current)["manageUsers"]:
        send_json(handler, {"ok": False, "reason": "forbidden"}, HTTPStatus.FORBIDDEN)
        return
    try:
        payload = parse_json_body(handler, 100_000)
        if not isinstance(payload, dict):
            raise ValueError("invalid_payload")
        action = payload.get("action")
        if action == "create":
            user = handler.user_storage.create_user(
                username=str(payload.get("username", "")),
                name=str(payload.get("name", "")),
                password=str(payload.get("password", "")),
                role=str(payload.get("role", "associate")),
                permissions=payload.get("permissions", {}),
            )
        elif action == "update":
            if str(payload.get("id", "")) == current["id"] and payload.get("active") is False:
                raise ValueError("cannot_deactivate_yourself")
            user = handler.user_storage.update_user(
                str(payload.get("id", "")),
                name=payload.get("name"),
                role=payload.get("role"),
                active=payload.get("active"),
                permissions=payload.get("permissions"),
                password=payload.get("password"),
            )
        else:
            raise ValueError("invalid_action")
    except (RequestValidationError, ValueError) as exc:
        send_json(handler, {"ok": False, "reason": str(exc)}, HTTPStatus.BAD_REQUEST)
        return
    send_json(handler, {"ok": True, "user": public_user(user)})
