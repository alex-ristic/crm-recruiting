import json
import logging
import shutil
from pathlib import Path
from datetime import datetime

from .base import StateStorage


logger = logging.getLogger(__name__)


class JsonStateStorage(StateStorage):
    def __init__(self, state_file, backup_dir=None, max_backups=50):
        self.state_file = Path(state_file)
        self.backup_dir = Path(backup_dir) if backup_dir else self.state_file.parent / "backups"
        self.max_backups = max_backups

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
        self._backup_existing_state()
        tmp_file = self.state_file.with_name(f"{self.state_file.name}.tmp")
        tmp_file.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp_file.replace(self.state_file)

    def _backup_existing_state(self):
        if not self.state_file.exists():
            return
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")
        backup_file = self.backup_dir / f"crm-state-{timestamp}.json"
        shutil.copy2(self.state_file, backup_file)
        self._prune_backups()

    def _prune_backups(self):
        backups = sorted(self.backup_dir.glob("crm-state-*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
        for backup in backups[self.max_backups:]:
            try:
                backup.unlink()
            except OSError:
                logger.warning("Unable to delete old backup: %s", backup)
