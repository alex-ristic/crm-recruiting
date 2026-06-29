import json
import logging
from pathlib import Path

from .base import StateStorage


logger = logging.getLogger(__name__)


class JsonStateStorage(StateStorage):
    def __init__(self, state_file):
        self.state_file = Path(state_file)

    def load_state(self):
        if not self.state_file.exists():
            return None
        try:
            return json.loads(self.state_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            logger.warning("State file contains invalid JSON: %s", self.state_file)
            return None
        except OSError:
            logger.exception("Unable to read state file: %s", self.state_file)
            return None

    def save_state(self, state):
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_file = self.state_file.with_name(f"{self.state_file.name}.tmp")
        tmp_file.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp_file.replace(self.state_file)
