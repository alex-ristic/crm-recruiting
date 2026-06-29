import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from dataclasses import replace
from pathlib import Path

from crm.app import create_server
from crm.config import load_settings
from crm.storage import JsonStateStorage


class ServerSmokeTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.state_file = Path(self.temp_dir.name) / "state.json"
        self.settings = replace(
            load_settings(),
            host="127.0.0.1",
            port=0,
            state_file=self.state_file,
            max_state_bytes=1024 * 1024,
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
        self.assertIn("const storageKey", self._get_text("/src/app.js"))
        self.assertIn(".crm-shell", self._get_text("/src/styles.css"))

    def test_api_state_round_trip(self):
        self.assertEqual(self._get_json("/api/state"), {"state": None})

        payload = {"activeTab": "positions", "jobs": [], "positions": [], "candidates": []}
        response = self._post_json("/api/state", payload)

        self.assertEqual(response, {"ok": True})
        self.assertEqual(self._get_json("/api/state"), {"state": payload})

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

    def test_state_file_is_not_served_staticly(self):
        self.state_file.write_text(json.dumps({"secret": "local data"}), encoding="utf-8")

        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(f"{self.base_url}/crm-state.json", timeout=5)

        self.assertEqual(error.exception.code, 404)

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

