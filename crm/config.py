import os
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _int_env(name, default):
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    project_root: Path
    state_file: Path
    max_state_bytes: int


def load_settings():
    state_file = os.environ.get("CRM_STATE_FILE")
    return Settings(
        host=os.environ.get("CRM_HOST", "127.0.0.1"),
        port=_int_env("CRM_PORT", 8000),
        project_root=PROJECT_ROOT,
        state_file=Path(state_file).expanduser() if state_file else PROJECT_ROOT / "crm-state.json",
        max_state_bytes=_int_env("CRM_MAX_STATE_BYTES", 5 * 1024 * 1024),
    )

