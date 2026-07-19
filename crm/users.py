import json
import secrets
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path

from crm.auth import hash_password


ROLE_PERMISSIONS = {
    "admin": {
        "candidateScope": "all",
        "candidateEdit": True,
        "taskScope": "all",
        "taskEdit": True,
        "createCandidates": True,
        "canAssign": True,
        "manageUsers": True,
        "manageCatalog": True,
    },
    "viewer": {
        "candidateScope": "all",
        "candidateEdit": False,
        "taskScope": "all",
        "taskEdit": False,
        "createCandidates": False,
        "canAssign": False,
        "manageUsers": False,
        "manageCatalog": False,
    },
    "associate": {
        "candidateScope": "own",
        "candidateEdit": True,
        "taskScope": "own",
        "taskEdit": True,
        "createCandidates": True,
        "canAssign": False,
        "manageUsers": False,
        "manageCatalog": False,
    },
}


def effective_permissions(user):
    role = user.get("role", "associate")
    permissions = dict(ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["associate"]))
    overrides = user.get("permissions", {})
    for key in permissions:
        if key in overrides:
            permissions[key] = overrides[key]
    if permissions["candidateScope"] not in {"own", "all"}:
        permissions["candidateScope"] = "own"
    if permissions["taskScope"] not in {"own", "all"}:
        permissions["taskScope"] = "own"
    return permissions


def public_user(user):
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user.get("name") or user["username"],
        "role": user.get("role", "associate"),
        "active": user.get("active", True),
        "permissions": user.get("permissions", {}),
        "effectivePermissions": effective_permissions(user),
        "createdAt": user.get("createdAt", ""),
    }


def local_admin_user():
    return {
        "id": "local-admin",
        "username": "local-admin",
        "name": "Local Admin",
        "role": "admin",
        "active": True,
        "permissions": {},
    }


class JsonUserStorage:
    def __init__(self, path, bootstrap_username="", bootstrap_password_hash="", backup_dir=None, max_backups=50):
        self.path = Path(path)
        self.backup_dir = Path(backup_dir) if backup_dir else self.path.parent / "backups"
        self.max_backups = max_backups
        self.bootstrap_username = bootstrap_username
        self.bootstrap_password_hash = bootstrap_password_hash
        self._lock = threading.RLock()
        self._ensure_bootstrap_admin()

    def list_users(self):
        with self._lock:
            return self._load()

    def find_by_username(self, username):
        normalized = str(username).strip().lower()
        return next((user for user in self.list_users() if user.get("username", "").lower() == normalized), None)

    def find_by_id(self, user_id):
        if user_id == "local-admin":
            return local_admin_user()
        return next((user for user in self.list_users() if user.get("id") == user_id), None)

    def create_user(self, *, username, name, password, role, permissions=None):
        username = username.strip()
        if not username or self.find_by_username(username):
            raise ValueError("username_unavailable")
        if role not in ROLE_PERMISSIONS:
            raise ValueError("invalid_role")
        if len(password) < 8:
            raise ValueError("password_too_short")
        user = {
            "id": f"user-{secrets.token_hex(8)}",
            "username": username,
            "name": name.strip() or username,
            "passwordHash": hash_password(password),
            "role": role,
            "active": True,
            "permissions": _clean_overrides(permissions or {}),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        with self._lock:
            users = self._load()
            users.append(user)
            self._save(users)
        return user

    def update_user(self, user_id, *, name=None, role=None, active=None, permissions=None, password=None):
        with self._lock:
            users = self._load()
            user = next((item for item in users if item.get("id") == user_id), None)
            if not user:
                raise ValueError("user_not_found")
            if name is not None:
                user["name"] = str(name).strip() or user["username"]
            if role is not None:
                if role not in ROLE_PERMISSIONS:
                    raise ValueError("invalid_role")
                user["role"] = role
            if active is not None:
                user["active"] = bool(active)
            if permissions is not None:
                user["permissions"] = _clean_overrides(permissions)
            if password:
                if len(password) < 8:
                    raise ValueError("password_too_short")
                user["passwordHash"] = hash_password(password)
            self._save(users)
            return user

    def _ensure_bootstrap_admin(self):
        if not self.bootstrap_username or not self.bootstrap_password_hash:
            return
        with self._lock:
            users = self._load()
            if any(user.get("username", "").lower() == self.bootstrap_username.lower() for user in users):
                return
            users.append({
                "id": "user-admin",
                "username": self.bootstrap_username,
                "name": self.bootstrap_username,
                "passwordHash": self.bootstrap_password_hash,
                "role": "admin",
                "active": True,
                "permissions": {},
                "createdAt": datetime.now(timezone.utc).isoformat(),
            })
            self._save(users)

    def _load(self):
        if not self.path.exists():
            return []
        try:
            value = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []
        return value if isinstance(value, list) else []

    def _save(self, users):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists():
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
            shutil.copy2(self.path, self.backup_dir / f"crm-users-{stamp}.json")
            backups = sorted(self.backup_dir.glob("crm-users-*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
            for backup in backups[self.max_backups:]:
                backup.unlink()
        temporary = self.path.with_name(f"{self.path.name}.tmp")
        temporary.write_text(json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8")
        temporary.replace(self.path)


def _clean_overrides(value):
    if not isinstance(value, dict):
        return {}
    allowed = set(ROLE_PERMISSIONS["admin"])
    result = {}
    for key, setting in value.items():
        if key not in allowed:
            continue
        if key.endswith("Scope") and setting in {"own", "all"}:
            result[key] = setting
        elif not key.endswith("Scope") and isinstance(setting, bool):
            result[key] = setting
    return result
