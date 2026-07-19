import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from crm.auth import hash_password
from crm.routes.state import filter_state_for_user, merge_authorized_state
from crm.users import JsonUserStorage, effective_permissions


class MultiUserStateTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.users = JsonUserStorage(
            Path(self.temp_dir.name) / "users.json",
            "admin",
            hash_password("admin-password", iterations=1000),
        )
        self.admin = self.users.find_by_username("admin")
        self.alex = self.users.create_user(username="alex", name="Alex", password="password-1", role="associate")
        self.maria = self.users.create_user(username="maria", name="Maria", password="password-2", role="associate")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_role_defaults_and_per_user_overrides(self):
        self.assertEqual(effective_permissions(self.alex)["candidateScope"], "own")
        self.assertTrue(effective_permissions(self.alex)["createCandidates"])
        self.assertFalse(effective_permissions(self.alex)["canAssign"])

        updated = self.users.update_user(self.alex["id"], permissions={"candidateScope": "all", "candidateEdit": False})
        permissions = effective_permissions(updated)
        self.assertEqual(permissions["candidateScope"], "all")
        self.assertFalse(permissions["candidateEdit"])
        self.assertTrue(permissions["taskEdit"])

    def test_associate_only_sees_own_candidates_and_tasks(self):
        state = self._state()
        visible = filter_state_for_user(state, self.alex)

        self.assertEqual([candidate["id"] for candidate in visible["candidates"]], ["candidate-alex", "candidate-maria"])
        self.assertEqual([task["id"] for task in visible["candidates"][0]["tasks"]], ["task-alex", "task-completed"])
        self.assertEqual([task["id"] for task in visible["candidates"][1]["tasks"]], ["task-alex-on-maria"])

    def test_associate_edits_preserve_hidden_records_and_new_candidates_are_self_assigned(self):
        current = self._state()
        submitted = filter_state_for_user(current, self.alex)
        submitted["candidates"][0]["name"] = "Updated by Alex"
        submitted["candidates"][0]["tasks"][0]["title"] = "Updated task"
        submitted["candidates"].append(self._candidate("candidate-new", "New", self.maria["id"], []))

        merged = merge_authorized_state(current, submitted, self.alex, effective_permissions(self.alex), self.users)
        alex_candidate = next(candidate for candidate in merged["candidates"] if candidate["id"] == "candidate-alex")
        hidden_task = next(task for task in alex_candidate["tasks"] if task["id"] == "task-maria")
        new_candidate = next(candidate for candidate in merged["candidates"] if candidate["id"] == "candidate-new")

        self.assertEqual(alex_candidate["name"], "Updated by Alex")
        self.assertEqual(hidden_task["title"], "Maria's explicit task")
        self.assertEqual(new_candidate["assigneeId"], self.alex["id"])

    def test_candidate_reassignment_moves_only_open_inherited_tasks(self):
        current = self._state()
        submitted = deepcopy(current)
        candidate = submitted["candidates"][0]
        candidate["assigneeId"] = self.maria["id"]

        merged = merge_authorized_state(current, submitted, self.admin, effective_permissions(self.admin), self.users)
        tasks = {task["id"]: task for task in merged["candidates"][0]["tasks"]}

        self.assertEqual(tasks["task-alex"]["assigneeId"], self.maria["id"])
        self.assertEqual(tasks["task-maria"]["assigneeId"], self.maria["id"])
        self.assertEqual(tasks["task-completed"]["assigneeId"], self.alex["id"])

    def _state(self):
        alex_tasks = [
            self._task("task-alex", "Alex task", self.alex["id"], "inherited"),
            self._task("task-maria", "Maria's explicit task", self.maria["id"], "explicit"),
            self._task("task-completed", "Completed", self.alex["id"], "inherited", done=True),
        ]
        maria_tasks = [self._task("task-alex-on-maria", "Help Maria", self.alex["id"], "explicit")]
        return {
            "_revision": 2,
            "jobs": [],
            "positions": [],
            "candidates": [
                self._candidate("candidate-alex", "Alex Candidate", self.alex["id"], alex_tasks),
                self._candidate("candidate-maria", "Maria Candidate", self.maria["id"], maria_tasks),
            ],
        }

    @staticmethod
    def _candidate(candidate_id, name, assignee_id, tasks):
        return {"id": candidate_id, "name": name, "stage": "new-lead", "assigneeId": assignee_id, "tasks": tasks}

    @staticmethod
    def _task(task_id, title, assignee_id, mode, done=False):
        return {"id": task_id, "title": title, "assigneeId": assignee_id, "assignmentMode": mode, "done": done}


if __name__ == "__main__":
    unittest.main()
