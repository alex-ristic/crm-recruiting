import logging
import mimetypes
import errno
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from crm.config import load_settings
from crm.auth import is_authenticated, is_same_origin, verify_csrf
from crm.routes.auth import handle_login_page, handle_login_post, handle_logout_post, handle_session
from crm.routes.state import handle_get_state, handle_post_state
from crm.routes.users import handle_get_users, handle_post_users
from crm.storage import JsonStateStorage
from crm.users import JsonUserStorage


logger = logging.getLogger(__name__)


STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
}


class CRMRequestHandler(BaseHTTPRequestHandler):
    settings = None
    storage = None
    user_storage = None
    state_lock = None

    def do_GET(self):
        path = self._request_path()
        if path == "/login":
            handle_login_page(self)
            return
        if path == "/api/session":
            if not self._require_auth(api=True):
                return
            handle_session(self)
            return
        if not self._require_auth(api=path.startswith("/api/")):
            return
        if path == "/api/state":
            handle_get_state(self)
            return
        if path == "/api/users":
            handle_get_users(self)
            return
        self._serve_static(path)

    def do_POST(self):
        path = self._request_path()
        if path == "/login":
            handle_login_post(self)
            return
        if path == "/logout":
            if not self._require_auth(api=False):
                return
            handle_logout_post(self)
            return
        if not self._require_auth(api=True):
            return
        if not is_same_origin(self):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not verify_csrf(self):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if path == "/api/state":
            with self.state_lock:
                handle_post_state(self)
            return
        if path == "/api/users":
            handle_post_users(self)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def log_message(self, fmt, *args):
        logger.info("%s - %s", self.address_string(), fmt % args)

    def _request_path(self):
        return unquote(urlparse(self.path).path)

    def _require_auth(self, api=False):
        if self.settings.auth_misconfigured:
            if api:
                self.send_error(HTTPStatus.SERVICE_UNAVAILABLE)
            else:
                handle_login_page(self)
            return False
        if is_authenticated(self):
            return True
        if api:
            self.send_error(HTTPStatus.UNAUTHORIZED)
        else:
            self.send_response(HTTPStatus.SEE_OTHER)
            self.send_header("Location", "/login")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        return False

    def _serve_static(self, path):
        relative_path = _static_path_for(path)
        if relative_path is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        file_path = (self.settings.project_root / relative_path).resolve()
        allowed_root = self.settings.project_root / "src" if path.startswith("/src/") else self.settings.project_root
        if not _is_within(file_path, allowed_root):
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        try:
            body = file_path.read_bytes()
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _is_within(path, root):
    try:
        path.relative_to(Path(root).resolve())
    except ValueError:
        return False
    return True


def _static_path_for(path):
    if path in STATIC_FILES:
        return STATIC_FILES[path]
    if not path.startswith("/src/"):
        return None
    relative_path = path.lstrip("/")
    if Path(relative_path).suffix not in {".js", ".css"}:
        return None
    return relative_path


def create_server(settings=None, storage=None, user_storage=None):
    settings = settings or load_settings()
    storage = storage or JsonStateStorage(settings.state_file, settings.backup_dir, settings.max_backups)
    user_storage = user_storage or JsonUserStorage(settings.user_file, settings.admin_username, settings.admin_password_hash, settings.backup_dir, settings.max_backups)

    class Handler(CRMRequestHandler):
        pass

    Handler.settings = settings
    Handler.storage = storage
    Handler.user_storage = user_storage
    Handler.state_lock = threading.RLock()
    return ThreadingHTTPServer((settings.host, settings.port), Handler)


def run():
    settings = load_settings()
    try:
        server = create_server(settings=settings)
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            print(f"Port {settings.port} is already in use on {settings.host}.")
            print("Stop the process using that port, or run with another port, for example:")
            print(f"CRM_PORT={settings.port + 1} python3 -u server.py")
            return
        raise
    print(f"Serving Recruiting CRM at http://{settings.host}:{settings.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Recruiting CRM")
    finally:
        server.server_close()
