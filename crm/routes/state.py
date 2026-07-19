import json
import logging
from copy import deepcopy
from http import HTTPStatus

from crm.auth import get_current_user
from crm.users import effective_permissions
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
    user = get_current_user(handler)
    state = handler.storage.load_state()
    send_json(handler, {"state": filter_state_for_user(state, user)})


def handle_post_state(handler):
    try:
        payload = parse_json_body(handler, handler.settings.max_state_bytes)
        strip_removed_fields(payload)
        validate_crm_state(payload)
        current_state = handler.storage.load_state()
        current_revision = current_state.get("_revision", 0) if isinstance(current_state, dict) else 0
        payload_revision = payload.get("_revision")
        if current_state is not None and payload_revision != current_revision:
            send_json(handler, {"ok": False, "state": filter_state_for_user(current_state, get_current_user(handler)), "reason": "stale_state"}, HTTPStatus.CONFLICT)
            return
        user = get_current_user(handler)
        permissions = effective_permissions(user)
        if not any((permissions["candidateEdit"], permissions["taskEdit"], permissions["createCandidates"], permissions["manageCatalog"])):
            send_json(handler, {"ok": False, "reason": "forbidden"}, HTTPStatus.FORBIDDEN)
            return
        next_state = merge_authorized_state(current_state, payload, user, permissions, handler.user_storage)
        validate_crm_state(next_state)
        next_state["_revision"] = current_revision + 1
        handler.storage.save_state(next_state)
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
    send_json(handler, {"ok": True, "state": filter_state_for_user(next_state, user)})


def strip_removed_fields(payload):
    if not isinstance(payload, dict):
        return
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        return
    allowed_candidate_fields = {
        "added",
        "assigneeId",
        "closedWonGroup",
        "eu",
        "experience",
        "groupOverride",
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


def filter_state_for_user(state, user):
    if not isinstance(state, dict) or not user:
        return state
    result = deepcopy(state)
    permissions = effective_permissions(user)
    user_id = user["id"]
    visible = []
    for candidate in result.get("candidates", []):
        owns_candidate = candidate.get("assigneeId", "") == user_id
        candidate_visible = permissions["candidateScope"] == "all" or owns_candidate
        tasks = candidate.get("tasks", [])
        if permissions["taskScope"] != "all":
            tasks = [task for task in tasks if task.get("assigneeId", "") == user_id]
        if candidate_visible or tasks:
            candidate["tasks"] = tasks
            visible.append(candidate)
    result["candidates"] = visible
    return result


def merge_authorized_state(current_state, submitted, user, permissions, user_storage):
    if current_state is None:
        result = deepcopy(submitted)
        if not permissions["manageCatalog"]:
            result["jobs"] = deepcopy(submitted.get("jobs", []))
            result["positions"] = deepcopy(submitted.get("positions", []))
        result["candidates"] = [
            _prepare_new_candidate(candidate, user, permissions, user_storage)
            for candidate in submitted.get("candidates", [])
            if permissions["createCandidates"]
        ]
        return result

    result = deepcopy(current_state)
    if permissions["manageCatalog"]:
        result["jobs"] = deepcopy(submitted.get("jobs", []))
        result["positions"] = deepcopy(submitted.get("positions", []))
        for key, value in submitted.items():
            if key not in {"jobs", "positions", "candidates", "_revision"}:
                result[key] = deepcopy(value)

    current_by_id = {candidate["id"]: candidate for candidate in current_state.get("candidates", [])}
    submitted_by_id = {candidate["id"]: candidate for candidate in submitted.get("candidates", [])}
    merged_candidates = []

    for candidate_id, current in current_by_id.items():
        incoming = submitted_by_id.get(candidate_id)
        can_edit_candidate = _can_edit_candidate(current, user, permissions)
        if incoming is None:
            if user.get("role") == "admin" and can_edit_candidate:
                continue
            merged_candidates.append(deepcopy(current))
            continue

        merged = deepcopy(current)
        if can_edit_candidate:
            submitted_fields = {key: deepcopy(value) for key, value in incoming.items() if key != "tasks"}
            requested_assignee = submitted_fields.pop("assigneeId", current.get("assigneeId", ""))
            merged.update(submitted_fields)
        else:
            requested_assignee = incoming.get("assigneeId", current.get("assigneeId", ""))
        can_assign_candidate = permissions["canAssign"] and (
            permissions["candidateScope"] == "all" or current.get("assigneeId", "") == user["id"]
        )
        if can_assign_candidate:
            merged["assigneeId"] = _valid_assignee(requested_assignee, user_storage)
        else:
            merged["assigneeId"] = current.get("assigneeId", "")

        merged["tasks"] = _merge_tasks(current, incoming, merged, user, permissions, user_storage)
        merged_candidates.append(merged)

    if permissions["createCandidates"]:
        for candidate_id, incoming in submitted_by_id.items():
            if candidate_id not in current_by_id:
                merged_candidates.append(_prepare_new_candidate(incoming, user, permissions, user_storage))

    result["candidates"] = merged_candidates
    return result


def _prepare_new_candidate(candidate, user, permissions, user_storage):
    prepared = deepcopy(candidate)
    requested = prepared.get("assigneeId", "")
    prepared["assigneeId"] = _valid_assignee(requested, user_storage) if permissions["canAssign"] else user["id"]
    tasks = []
    for task in prepared.get("tasks", []):
        next_task = deepcopy(task)
        requested_task_assignee = next_task.get("assigneeId", "")
        if permissions["canAssign"] and requested_task_assignee and requested_task_assignee != prepared["assigneeId"]:
            next_task["assigneeId"] = _valid_assignee(requested_task_assignee, user_storage)
            next_task["assignmentMode"] = "explicit"
        else:
            next_task["assigneeId"] = prepared["assigneeId"]
            next_task["assignmentMode"] = "inherited"
        tasks.append(next_task)
    prepared["tasks"] = tasks
    return prepared


def _merge_tasks(current_candidate, incoming_candidate, merged_candidate, user, permissions, user_storage):
    current_tasks = {task["id"]: task for task in current_candidate.get("tasks", [])}
    incoming_tasks = {task["id"]: task for task in incoming_candidate.get("tasks", [])}
    tasks = []
    owner_changed = current_candidate.get("assigneeId", "") != merged_candidate.get("assigneeId", "")

    for task_id, current in current_tasks.items():
        incoming = incoming_tasks.get(task_id)
        can_edit = _can_edit_task(current, user, permissions)
        can_assign = permissions["canAssign"] and (
            permissions["taskScope"] == "all" or current.get("assigneeId", "") == user["id"]
        )
        if incoming is None:
            if can_edit:
                continue
            task = deepcopy(current)
        elif can_edit or can_assign:
            task = deepcopy(incoming) if can_edit else deepcopy(current)
            if can_assign and not can_edit:
                task["assigneeId"] = incoming.get("assigneeId", current.get("assigneeId", ""))
                task["assignmentMode"] = incoming.get("assignmentMode", current.get("assignmentMode", "inherited"))
            if owner_changed and current.get("done"):
                task["assigneeId"] = current.get("assigneeId", "")
                task["assignmentMode"] = current.get("assignmentMode", "inherited")
            elif can_assign:
                if task.get("assignmentMode", current.get("assignmentMode", "inherited")) == "inherited":
                    task["assigneeId"] = merged_candidate.get("assigneeId", "")
                    task["assignmentMode"] = "inherited"
                else:
                    requested = task.get("assigneeId", current.get("assigneeId", ""))
                    task["assigneeId"] = _valid_assignee(requested, user_storage)
                    task["assignmentMode"] = "explicit"
            else:
                task["assigneeId"] = current.get("assigneeId", "")
                task["assignmentMode"] = current.get("assignmentMode", "inherited")
        else:
            task = deepcopy(current)

        if owner_changed and not task.get("done") and task.get("assignmentMode", "inherited") != "explicit":
            task["assigneeId"] = merged_candidate.get("assigneeId", "")
            task["assignmentMode"] = "inherited"
        tasks.append(task)

    may_add = permissions["taskEdit"] and (_can_edit_candidate(current_candidate, user, permissions) or permissions["taskScope"] == "all")
    if may_add:
        for task_id, incoming in incoming_tasks.items():
            if task_id in current_tasks:
                continue
            task = deepcopy(incoming)
            requested = task.get("assigneeId", "")
            if permissions["canAssign"] and requested and requested != merged_candidate.get("assigneeId", ""):
                task["assigneeId"] = _valid_assignee(requested, user_storage)
                task["assignmentMode"] = "explicit"
            else:
                task["assigneeId"] = merged_candidate.get("assigneeId", "")
                task["assignmentMode"] = "inherited"
            tasks.append(task)
    return tasks


def _can_edit_candidate(candidate, user, permissions):
    return permissions["candidateEdit"] and (
        permissions["candidateScope"] == "all" or candidate.get("assigneeId", "") == user["id"]
    )


def _can_edit_task(task, user, permissions):
    return permissions["taskEdit"] and (
        permissions["taskScope"] == "all" or task.get("assigneeId", "") == user["id"]
    )


def _valid_assignee(user_id, user_storage):
    if not user_id:
        return ""
    user = user_storage.find_by_id(user_id)
    return user_id if user and user.get("active", True) else ""
