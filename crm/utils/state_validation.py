class StateValidationError(ValueError):
    pass


MAX_ITEMS = 10000
MAX_TASKS_PER_CANDIDATE = 500
MAX_STRING_LENGTH = 20000


def validate_crm_state(state):
    if not isinstance(state, dict):
        raise StateValidationError("state must be an object")
    for key in ("jobs", "positions", "candidates"):
        if key not in state:
            raise StateValidationError(f"missing {key}")
        if not isinstance(state[key], list):
            raise StateValidationError(f"{key} must be a list")
        if len(state[key]) > MAX_ITEMS:
            raise StateValidationError(f"{key} is too large")

    _validate_jobs(state["jobs"])
    _validate_positions(state["positions"])
    _validate_candidates(state["candidates"])
    _walk_strings(state)
    return state


def _validate_jobs(jobs):
    seen = set()
    for job in jobs:
        _require_object(job, "job")
        job_id = _require_string(job, "id", "job")
        _require_string(job, "name", "job")
        if job_id in seen:
            raise StateValidationError(f"duplicate job id: {job_id}")
        seen.add(job_id)


def _validate_positions(positions):
    seen = set()
    for position in positions:
        _require_object(position, "position")
        position_id = _require_string(position, "id", "position")
        _require_string(position, "jobId", "position")
        _require_string(position, "stage", "position")
        if position_id in seen:
            raise StateValidationError(f"duplicate position id: {position_id}")
        seen.add(position_id)
        for key in ("eu", "accommodation", "food"):
            if key in position and not isinstance(position[key], bool):
                raise StateValidationError(f"position {key} must be boolean")
        if "openings" in position and not isinstance(position["openings"], (int, float)):
            raise StateValidationError("position openings must be numeric")


def _validate_candidates(candidates):
    seen = set()
    for candidate in candidates:
        _require_object(candidate, "candidate")
        candidate_id = _require_string(candidate, "id", "candidate")
        _require_string(candidate, "name", "candidate")
        _require_string(candidate, "stage", "candidate")
        if candidate_id in seen:
            raise StateValidationError(f"duplicate candidate id: {candidate_id}")
        seen.add(candidate_id)
        if "eu" in candidate and not isinstance(candidate["eu"], bool):
            raise StateValidationError("candidate eu must be boolean")
        if "groupOverride" in candidate and candidate["groupOverride"] is not None and not isinstance(candidate["groupOverride"], str):
            raise StateValidationError("candidate groupOverride must be a string or null")
        if "assigneeId" in candidate and not isinstance(candidate["assigneeId"], str):
            raise StateValidationError("candidate assigneeId must be a string")
        tasks = candidate.get("tasks", [])
        if not isinstance(tasks, list):
            raise StateValidationError("candidate tasks must be a list")
        if len(tasks) > MAX_TASKS_PER_CANDIDATE:
            raise StateValidationError("candidate has too many tasks")
        task_ids = set()
        for task in tasks:
            _require_object(task, "task")
            _require_string(task, "id", "task")
            _require_string(task, "title", "task")
            if task["id"] in task_ids:
                raise StateValidationError(f"duplicate task id: {task['id']}")
            task_ids.add(task["id"])
            if "done" in task and not isinstance(task["done"], bool):
                raise StateValidationError("task done must be boolean")
            if "urgency" in task and not isinstance(task["urgency"], (int, float)):
                raise StateValidationError("task urgency must be numeric")
            if "assigneeId" in task and not isinstance(task["assigneeId"], str):
                raise StateValidationError("task assigneeId must be a string")
            if "assignmentMode" in task and task["assignmentMode"] not in {"inherited", "explicit"}:
                raise StateValidationError("task assignmentMode is invalid")


def _require_object(value, label):
    if not isinstance(value, dict):
        raise StateValidationError(f"{label} must be an object")


def _require_string(container, key, label):
    value = container.get(key)
    if not isinstance(value, str) or not value.strip():
        raise StateValidationError(f"{label} {key} must be a non-empty string")
    return value


def _walk_strings(value):
    if isinstance(value, str):
        if len(value) > MAX_STRING_LENGTH:
            raise StateValidationError("string value is too large")
    elif isinstance(value, dict):
        for nested in value.values():
            _walk_strings(nested)
    elif isinstance(value, list):
        for nested in value:
            _walk_strings(nested)
