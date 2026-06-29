import logging
import mimetypes
import errno
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from crm.config import load_settings
from crm.routes.state import handle_get_state, handle_post_state
from crm.storage import JsonStateStorage


logger = logging.getLogger(__name__)


STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/src/app.js": "src/app.js",
    "/src/styles.css": "src/styles.css",
}


class CRMRequestHandler(BaseHTTPRequestHandler):
    settings = None
    storage = None

    def do_GET(self):
        path = self._request_path()
        if path == "/api/state":
            handle_get_state(self)
            return
        self._serve_static(path)

    def do_POST(self):
        path = self._request_path()
        if path == "/api/state":
            handle_post_state(self)
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def log_message(self, fmt, *args):
        logger.info("%s - %s", self.address_string(), fmt % args)

    def _request_path(self):
        return unquote(urlparse(self.path).path)

    def _serve_static(self, path):
        relative_path = STATIC_FILES.get(path)
        if not relative_path:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        file_path = (self.settings.project_root / relative_path).resolve()
        if not _is_within(file_path, self.settings.project_root):
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
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _is_within(path, root):
    try:
        path.relative_to(Path(root).resolve())
    except ValueError:
        return False
    return True


def create_server(settings=None, storage=None):
    settings = settings or load_settings()
    storage = storage or JsonStateStorage(settings.state_file)

    class Handler(CRMRequestHandler):
        pass

    Handler.settings = settings
    Handler.storage = storage
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
