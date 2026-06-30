import os
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def _int_env(*names, default):
    raw = _env(*names)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"{names[0]} must be an integer") from exc


def _bool_env(name, default=False):
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    environment: str
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


def load_settings(load_dotenv_file=True):
    if load_dotenv_file:
        _load_dotenv(PROJECT_ROOT / ".env")
    state_file = _env("CRM_STATE_FILE", "CRM_STATE_PATH")
    backup_dir = os.environ.get("CRM_BACKUP_DIR")
    resolved_state_file = Path(state_file).expanduser() if state_file else PROJECT_ROOT / "crm-state.json"
    return Settings(
        environment=os.environ.get("CRM_ENV", "local"),
        host=_env("CRM_HOST", "HOST", default="127.0.0.1"),
        port=_int_env("CRM_PORT", "PORT", default=8000),
        project_root=PROJECT_ROOT,
        state_file=resolved_state_file,
        backup_dir=Path(backup_dir).expanduser() if backup_dir else resolved_state_file.parent / "backups",
        max_backups=_int_env("CRM_MAX_BACKUPS", default=50),
        max_state_bytes=_int_env("CRM_MAX_STATE_BYTES", default=5 * 1024 * 1024),
        auth_required=_bool_env("CRM_AUTH_REQUIRED", False),
        admin_username=os.environ.get("ADMIN_USERNAME", ""),
        admin_password_hash=os.environ.get("ADMIN_PASSWORD_HASH", ""),
        session_secret=os.environ.get("SESSION_SECRET", ""),
        session_cookie_name=os.environ.get("CRM_SESSION_COOKIE_NAME", "crm_recruiting_session"),
        session_max_age_seconds=_int_env("CRM_SESSION_MAX_AGE_SECONDS", default=12 * 60 * 60),
        cookie_secure=_bool_env("CRM_COOKIE_SECURE", False),
    )


def _env(*names, default=""):
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return default
