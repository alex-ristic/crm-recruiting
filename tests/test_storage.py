import tempfile
import unittest
from pathlib import Path

from crm.storage import JsonStateStorage


class JsonStateStorageTest(unittest.TestCase):
    def test_load_missing_state_returns_none(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            storage = JsonStateStorage(Path(temp_dir) / "missing.json")

            self.assertIsNone(storage.load_state())

    def test_save_and_load_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            storage = JsonStateStorage(Path(temp_dir) / "state.json")
            state = {"jobs": [{"id": "job-1", "name": "Kuvar"}], "candidates": []}

            storage.save_state(state)

            self.assertEqual(storage.load_state(), state)

    def test_corrupt_state_returns_none(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state_file = Path(temp_dir) / "state.json"
            state_file.write_text("{not-json", encoding="utf-8")
            storage = JsonStateStorage(state_file)

            with self.assertLogs("crm.storage.json_storage", level="WARNING"):
                self.assertIsNone(storage.load_state())


if __name__ == "__main__":
    unittest.main()
