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


def _bool_env(name, default=False):
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    project_root: Path
    state_file: Path
    backup_dir: Path
    max_backups: int
    max_state_bytes: int
    auth_required: bool
    admin_username: str
    admin_password_hash: str
    session_secret: str
    session_cookie_name: str
    session_max_age_seconds: int
    cookie_secure: bool

    @property
    def auth_configured(self):
        return bool(self.admin_username and self.admin_password_hash and self.session_secret)

    @property
    def auth_enabled(self):
        return self.auth_required or self.auth_configured

    @property
    def auth_misconfigured(self):
        return self.auth_enabled and not self.auth_configured


def load_settings():
    state_file = os.environ.get("CRM_STATE_FILE")
    backup_dir = os.environ.get("CRM_BACKUP_DIR")
    resolved_state_file = Path(state_file).expanduser() if state_file else PROJECT_ROOT / "crm-state.json"
    return Settings(
        host=os.environ.get("CRM_HOST", "127.0.0.1"),
        port=_int_env("CRM_PORT", 8000),
        project_root=PROJECT_ROOT,
        state_file=resolved_state_file,
        backup_dir=Path(backup_dir).expanduser() if backup_dir else resolved_state_file.parent / "backups",
        max_backups=_int_env("CRM_MAX_BACKUPS", 50),
        max_state_bytes=_int_env("CRM_MAX_STATE_BYTES", 5 * 1024 * 1024),
        auth_required=_bool_env("CRM_AUTH_REQUIRED", False),
        admin_username=os.environ.get("ADMIN_USERNAME", ""),
        admin_password_hash=os.environ.get("ADMIN_PASSWORD_HASH", ""),
        session_secret=os.environ.get("SESSION_SECRET", ""),
        session_cookie_name=os.environ.get("CRM_SESSION_COOKIE_NAME", "crm_recruiting_session"),
        session_max_age_seconds=_int_env("CRM_SESSION_MAX_AGE_SECONDS", 12 * 60 * 60),
        cookie_secure=_bool_env("CRM_COOKIE_SECURE", False),
    )
