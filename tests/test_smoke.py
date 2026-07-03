import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import urllib.parse
import http.cookiejar
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from crm.auth import hash_password
from crm.app import create_server
from crm.config import load_settings
from crm.storage import JsonStateStorage


class ServerSmokeTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.state_file = Path(self.temp_dir.name) / "state.json"
        self.settings = replace(
            load_settings(load_dotenv_file=False),
            host="127.0.0.1",
            port=0,
            state_file=self.state_file,
            backup_dir=Path(self.temp_dir.name) / "backups",
            max_state_bytes=1024 * 1024,
            auth_required=False,
        )
        self.server = create_server(
            settings=self.settings,
            storage=JsonStateStorage(self.state_file),
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        host, port = self.server.server_address
        self.base_url = f"http://{host}:{port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def test_main_routes_respond(self):
        self.assertIn("Recruiting CRM", self._get_text("/"))
        self.assertIn("initialize();", self._get_text("/src/app.js"))
        self.assertIn("export let state", self._get_text("/src/js/state.js"))
        self.assertIn(".crm-shell", self._get_text("/src/styles.css"))

    def test_api_state_round_trip(self):
        self.assertEqual(self._get_json("/api/state"), {"state": None})

        payload = {
            "activeTab": "positions",
            "jobs": [],
            "positions": [],
            "candidates": [{
                "id": "candidate-1",
                "name": "Candidate One",
                "stage": "new-lead",
                "lastActivityAt": "2026-07-03",
                "experience": "5 seasons",
                "whenStart": "Immediately",
                "startDate": "2026-07-15",
                "legacyRemovedField": "remove me",
                "tasks": [],
            }],
        }
        response = self._post_json("/api/state", payload)

        self.assertTrue(response["ok"])
        self.assertEqual(response["state"]["_revision"], 1)
        self.assertEqual(response["state"]["candidates"][0]["experience"], "5 seasons")
        self.assertEqual(response["state"]["candidates"][0]["whenStart"], "Immediately")
        self.assertEqual(response["state"]["candidates"][0]["startDate"], "2026-07-15")
        self.assertEqual(response["state"]["candidates"][0]["lastActivityAt"], "2026-07-03")
        self.assertNotIn("legacyRemovedField", response["state"]["candidates"][0])
        self.assertEqual(self._get_json("/api/state"), {"state": response["state"]})

    def test_bad_json_returns_400(self):
        request = urllib.request.Request(
            f"{self.base_url}/api/state",
            data=b"{bad-json",
            method="POST",
            headers={"Content-Type": "application/json"},
        )

        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request, timeout=5)

        self.assertEqual(error.exception.code, 400)

    def test_large_payload_returns_400(self):
        settings = replace(self.settings, max_state_bytes=20)
        server = create_server(
            settings=settings,
            storage=JsonStateStorage(self.state_file),
        )
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        host, port = server.server_address
        try:
            request = urllib.request.Request(
                f"http://{host}:{port}/api/state",
                data=b'{"jobs":[],"positions":[],"candidates":[]}',
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(request, timeout=5)
            self.assertEqual(error.exception.code, 400)
            self.assertFalse(self.state_file.exists())
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_invalid_state_is_rejected_without_overwrite(self):
        valid = self._post_json("/api/state", {"activeTab": "positions", "jobs": [], "positions": [], "candidates": []})["state"]
        invalid = {"activeTab": "positions", "jobs": "bad", "positions": [], "candidates": [], "_revision": valid["_revision"]}

        with self.assertRaises(urllib.error.HTTPError) as error:
            self._post_json("/api/state", invalid)

        self.assertEqual(error.exception.code, 400)
        self.assertEqual(self._get_json("/api/state"), {"state": valid})

    def test_backup_created_before_overwrite(self):
        first = self._post_json("/api/state", {"activeTab": "positions", "jobs": [], "positions": [], "candidates": []})["state"]
        second = {**first, "search": "updated"}

        self._post_json("/api/state", second)

        backups = list((Path(self.temp_dir.name) / "backups").glob("crm-state-*.json"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(json.loads(backups[0].read_text(encoding="utf-8")), first)

    def test_state_file_is_not_served_staticly(self):
        self.state_file.write_text(json.dumps({"secret": "local data"}), encoding="utf-8")

        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(f"{self.base_url}/crm-state.json", timeout=5)

        self.assertEqual(error.exception.code, 404)

    def test_auth_protects_pages_api_and_post_csrf(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state_file = Path(temp_dir) / "state.json"
            settings = replace(
                load_settings(load_dotenv_file=False),
                host="127.0.0.1",
                port=0,
                state_file=state_file,
                backup_dir=Path(temp_dir) / "backups",
                auth_required=True,
                admin_username="admin",
                admin_password_hash=hash_password("secret-password"),
                session_secret="test-session-secret-with-enough-length",
                cookie_secure=False,
            )
            server = create_server(settings=settings, storage=JsonStateStorage(state_file, settings.backup_dir))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            host, port = server.server_address
            base_url = f"http://{host}:{port}"
            try:
                with self.assertRaises(urllib.error.HTTPError) as api_error:
                    urllib.request.urlopen(f"{base_url}/api/state", timeout=5)
                self.assertEqual(api_error.exception.code, 401)

                login_page = urllib.request.urlopen(f"{base_url}/", timeout=5).read().decode("utf-8")
                self.assertIn("Sign in to continue", login_page)

                jar = http.cookiejar.CookieJar()
                opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
                login_body = urllib.parse.urlencode({"username": "admin", "password": "secret-password"}).encode("utf-8")
                login_request = urllib.request.Request(
                    f"{base_url}/login",
                    data=login_body,
                    method="POST",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                opener.open(login_request, timeout=5)

                session = json.loads(opener.open(f"{base_url}/api/session", timeout=5).read().decode("utf-8"))
                self.assertTrue(session["authenticated"])
                self.assertTrue(session["csrfToken"])

                protected_post = urllib.request.Request(
                    f"{base_url}/api/state",
                    data=json.dumps({"activeTab": "positions", "jobs": [], "positions": [], "candidates": []}).encode("utf-8"),
                    method="POST",
                    headers={"Content-Type": "application/json"},
                )
                with self.assertRaises(urllib.error.HTTPError) as csrf_error:
                    opener.open(protected_post, timeout=5)
                self.assertEqual(csrf_error.exception.code, 403)

                allowed_post = urllib.request.Request(
                    f"{base_url}/api/state",
                    data=json.dumps({"activeTab": "positions", "jobs": [], "positions": [], "candidates": []}).encode("utf-8"),
                    method="POST",
                    headers={"Content-Type": "application/json", "X-CSRF-Token": session["csrfToken"]},
                )
                response = json.loads(opener.open(allowed_post, timeout=5).read().decode("utf-8"))
                self.assertTrue(response["ok"])

                logout_request = urllib.request.Request(
                    f"{base_url}/logout",
                    data=b"",
                    method="POST",
                    headers={"X-CSRF-Token": session["csrfToken"]},
                )
                opener.open(logout_request, timeout=5)
                with self.assertRaises(urllib.error.HTTPError) as logged_out_error:
                    opener.open(f"{base_url}/api/state", timeout=5)
                self.assertEqual(logged_out_error.exception.code, 401)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)

    def test_deployment_env_aliases_are_supported(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = Path(temp_dir) / "alias-state.json"
            with patch.dict("os.environ", {
                "HOST": "127.0.0.2",
                "PORT": "9090",
                "CRM_STATE_PATH": str(state_path),
                "CRM_ENV": "production",
            }, clear=True):
                settings = load_settings(load_dotenv_file=False)

        self.assertEqual(settings.environment, "production")
        self.assertEqual(settings.host, "127.0.0.2")
        self.assertEqual(settings.port, 9090)
        self.assertEqual(settings.state_file, state_path)

    def _get_text(self, path):
        with urllib.request.urlopen(f"{self.base_url}{path}", timeout=5) as response:
            return response.read().decode("utf-8")

    def _get_json(self, path):
        return json.loads(self._get_text(path))

    def _post_json(self, path, payload):
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
