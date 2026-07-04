import { freshTaskDraft, state, setState, setStateQuiet } from "../state.js";
import { syncLinkedPosition, withStageMoveTask } from "./candidates.js";
import { actionLabel } from "../utils/formatting.js";
import { addDays, completionTimestamp, today } from "../utils/dates.js";
import { candidateStages } from "../constants.js";

export function toggleTaskGroup(key) {
  setState({ collapsedTaskGroups: { ...state.collapsedTaskGroups, [key]: !state.collapsedTaskGroups[key] } });
}

export function updateNewTaskTitle(event) {
  setStateQuiet({ newTask: { ...state.newTask, title: event.target.value } });
}

export function toggleTaskComposer(candidateId) {
  const open = state.taskComposerCandidateId === candidateId;
  setState({
    taskComposerCandidateId: open ? null : candidateId,
    newTask: freshTaskDraft()
  });
}

export function updateNewTaskDate(event) {
  setStateQuiet({ newTask: { ...state.newTask, due: event.target.value } });
}

export function setNewTaskDueShortcut(days) {
  setState({ newTask: { ...state.newTask, due: addDays(today(), days) } });
}

export function updateNewTaskTime(event) {
  setStateQuiet({ newTask: { ...state.newTask, time: event.target.value } });
}

export function clearNewTaskTime() {
  setState({ newTask: { ...state.newTask, time: "" } });
}

export function updateNewTaskUrgency(urgency) {
  setState({ newTask: { ...state.newTask, urgency } });
}

export function addTask(candidateId) {
  if (!state.newTask.title.trim()) return;
  const task = { id: `task-${Date.now()}`, title: state.newTask.title.trim(), urgency: state.newTask.urgency, due: state.newTask.due || today(), time: state.newTask.time || "", done: false, note: "" };
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, lastActivityAt: today(), tasks: [...candidate.tasks, task] } : candidate),
    newTask: freshTaskDraft(),
    taskComposerCandidateId: null
  });
}

export function updateTask(event) {
  const [candidateId, taskId, key] = event.target.dataset.taskField.split(":");
  const value = key === "urgency" ? Number(event.target.value) : event.target.value;
  const patch = {
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      lastActivityAt: today(),
      tasks: candidate.tasks.map((task) => task.id === taskId ? { ...task, [key]: value } : task)
    } : candidate)
  };
  if (["title", "note"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

export function setTaskDueShortcut(event) {
  const [candidateId, taskId, days] = event.currentTarget.dataset.taskDueShortcut.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      lastActivityAt: today(),
      tasks: candidate.tasks.map((task) => task.id === taskId ? { ...task, due: addDays(today(), Number(days)) } : task)
    } : candidate)
  });
}

export function clearTaskTime(event) {
  const [candidateId, taskId] = event.currentTarget.dataset.clearTaskTime.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      lastActivityAt: today(),
      tasks: candidate.tasks.map((task) => task.id === taskId ? { ...task, time: "" } : task)
    } : candidate)
  });
}

export function deleteTask(event) {
  const [candidateId, taskId] = event.currentTarget.dataset.deleteTask.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      lastActivityAt: today(),
      tasks: candidate.tasks.filter((task) => task.id !== taskId)
    } : candidate)
  });
}

export function toggleTask(event) {
  const [candidateId, taskId] = event.currentTarget.dataset.toggleTask.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      lastActivityAt: today(),
      tasks: candidate.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const done = !task.done;
        return { ...task, done, completedAt: done ? completionTimestamp() : "" };
      })
    } : candidate)
  });
}

export function quickAction(event) {
  const [candidateId, taskId, action] = event.currentTarget.dataset.action.split(":");
  let nextCandidates = state.candidates.map((candidate) => {
    if (candidate.id !== candidateId) return candidate;
    let stage = candidate.stage;
    if (action === "good-to-place") {
      const currentIndex = candidateStages.findIndex(([stageId]) => stageId === stage);
      const goodIndex = candidateStages.findIndex(([stageId]) => stageId === "good-to-place");
      if (currentIndex >= 0 && currentIndex < goodIndex) stage = "good-to-place";
    }
    else {
      const stageByAction = {
        "no-answer": "in-work",
        busy: "negotiation-1",
        interested: "negotiation-1",
        "not-interested": "closed-lost",
        disqualify: "disqualified",
        "no-call-dq": "disqualified"
      };
      if (stageByAction[action]) stage = stageByAction[action];
    }
    const tasks = candidate.tasks.map((task) => task.id === taskId ? { ...task, done: true, completedAt: task.completedAt || completionTimestamp(), note: [task.note, actionLabel(action)].filter(Boolean).join("\n") } : task);
    return withStageMoveTask({ ...candidate, tasks }, stage);
  });
  const changed = nextCandidates.find((candidate) => candidate.id === candidateId);
  setState(syncLinkedPosition({ candidates: nextCandidates }, candidateId, changed.stage));
}
