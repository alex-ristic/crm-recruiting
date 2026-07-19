import { state } from "../state.js";
import { candidateJobName, positionName } from "../selectors.js";
import { compactDateLabel, isFutureDate, taskDateGroup } from "../utils/dates.js";
import { escapeAttr, escapeHtml, formatCompletedAt, icon } from "../utils/formatting.js";

export function renderTasksBoard() {
  const tasks = candidateTasks();
  const groups = groupedTasks(tasks);
  return `
    <section class="tasks-page">
      <div class="task-view-bar">
        <button class="task-preset ${isTaskPresetActive("today-urgency") ? "active" : ""}" data-task-preset="today-urgency">${icon("calendar")} Today by urgency</button>
        <button class="task-preset ${isTaskPresetActive("first-call") ? "active" : ""}" data-task-preset="first-call">${icon("phone")} 1st call by job</button>
        <label>Group <select data-task-view="groupBy">
          ${taskViewOption("none", "None", state.taskView.groupBy)}
          ${taskViewOption("due", "Date", state.taskView.groupBy)}
          ${taskViewOption("urgency", "Urgency", state.taskView.groupBy)}
          ${taskViewOption("person", "Person", state.taskView.groupBy)}
          ${taskViewOption("job", "Job", state.taskView.groupBy)}
          ${taskViewOption("position", "Position", state.taskView.groupBy)}
        </select></label>
        <label>Sort <select data-task-view="sortBy">
          ${taskViewOption("due", "Date", state.taskView.sortBy)}
          ${taskViewOption("urgency", "Urgency", state.taskView.sortBy)}
          ${taskViewOption("person", "Person", state.taskView.sortBy)}
          ${taskViewOption("job", "Job", state.taskView.sortBy)}
          ${taskViewOption("position", "Position", state.taskView.sortBy)}
        </select></label>
        <label class="task-upcoming-toggle"><input data-task-view="includeUpcoming" type="checkbox" ${state.taskView.includeUpcoming ? "checked" : ""} /> Include upcoming tasks</label>
      </div>
      <div class="task-list-shell">
        ${groups.map((group) => renderTaskGroup(group)).join("") || `<div class="empty-tasks">No open tasks.</div>`}
      </div>
    </section>
  `;
}

function candidateTasks() {
  const q = state.search.trim().toLowerCase();
  return state.candidates
    .flatMap((candidate) => (candidate.tasks || []).map((task) => ({ candidate, task })))
    .filter(({ candidate, task }) => {
      if (task.done) return false;
      if (!state.taskView.includeUpcoming && isFutureDate(task.due)) return false;
      if (!q) return true;
      return [task.title, task.note, task.due, task.time, candidate.name, candidate.phone, candidate.experience, candidate.whenStart, candidate.startDate, candidateJobName(candidate), positionName(candidate.positionId)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort(taskSorter(state.taskView.sortBy));
}

function isTaskPresetActive(preset) {
  if (preset === "today-urgency") return state.taskView.groupBy === "due" && state.taskView.sortBy === "urgency" && !state.taskView.includeUpcoming;
  if (preset === "first-call") return state.taskView.groupBy === "job" && state.taskView.sortBy === "urgency" && state.taskView.includeUpcoming;
  return false;
}

function taskSorter(sortBy) {
  return (a, b) => {
    if (sortBy === "urgency") return Number(a.task.urgency || 4) - Number(b.task.urgency || 4) || dueKey(a).localeCompare(dueKey(b));
    if (sortBy === "person") return a.candidate.name.localeCompare(b.candidate.name) || dueKey(a).localeCompare(dueKey(b));
    if (sortBy === "job") return candidateJobName(a.candidate).localeCompare(candidateJobName(b.candidate)) || dueKey(a).localeCompare(dueKey(b));
    if (sortBy === "position") return positionName(a.candidate.positionId).localeCompare(positionName(b.candidate.positionId)) || dueKey(a).localeCompare(dueKey(b));
    return dueKey(a).localeCompare(dueKey(b)) || Number(a.task.urgency || 4) - Number(b.task.urgency || 4);
  };
}

function groupedTasks(tasks) {
  const groupBy = state.taskView.groupBy;
  if (groupBy === "none") return tasks.length ? [{ key: "all", label: "All open tasks", tasks }] : [];
  const groups = new Map();
  tasks.forEach((item) => {
    const group = groupMeta(item, groupBy);
    const label = group.label;
    if (!groups.has(label)) groups.set(label, { key: label, label, order: group.order, tasks: [] });
    groups.get(label).tasks.push(item);
  });
  return [...groups.values()]
    .sort((a, b) => {
      if (groupBy === "due") return a.order - b.order;
      if (groupBy === "urgency") return Number(a.label.replace("Urgency ", "")) - Number(b.label.replace("Urgency ", ""));
      return a.label.localeCompare(b.label);
    });
}

function groupMeta({ candidate, task }, groupBy) {
  if (groupBy === "urgency") return { label: `Urgency ${task.urgency || 4}`, order: Number(task.urgency || 4) };
  if (groupBy === "person") return { label: candidate.name || "No person", order: 0 };
  if (groupBy === "job") return { label: candidateJobName(candidate), order: 0 };
  if (groupBy === "position") return { label: positionName(candidate.positionId), order: 0 };
  return taskDateGroup(task.due);
}

function renderTaskGroup(group) {
  const key = `${state.taskView.groupBy}:${group.key}`;
  const collapsed = !!state.collapsedTaskGroups[key];
  return `
    <section class="task-group">
      <button class="task-group-title" data-toggle-task-group="${escapeAttr(key)}">
        <span class="chevron">${collapsed ? "›" : "⌄"}</span>
        <strong>${escapeHtml(group.label)}</strong>
        <b>${group.tasks.length}</b>
      </button>
      ${collapsed ? "" : `<div class="task-group-list">
        ${group.tasks.map(({ candidate, task }) => renderTaskRow(candidate, task)).join("")}
      </div>`}
    </section>
  `;
}

function renderTaskRow(candidate, task) {
  const assignment = candidateJobName(candidate);
  return `
    <button class="task-tab-card u${task.urgency || 4}" data-open-candidate-from-task="${candidate.id}">
      <span class="task-tab-title">${escapeHtml(task.title)}</span>
      <span class="task-tab-person">${escapeHtml(candidate.name)}</span>
      <span class="task-tab-phone">${escapeHtml(candidate.phone || "No phone")}</span>
      <span class="task-tab-experience">${escapeHtml(candidate.experience || "No experience")}</span>
      <span class="task-tab-start">${escapeHtml(candidate.whenStart || "No start")}</span>
      <span class="task-tab-assignment">${escapeHtml(assignment)}</span>
      <span class="task-tab-urgency">${icon("flag")}U${task.urgency || 4}</span>
      <span class="task-tab-date">${icon("calendar")}${escapeHtml(taskDate(task))}</span>
    </button>
  `;
}

function taskViewOption(value, label, current) {
  return `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`;
}

function taskDate(task) {
  return [compactDateLabel(task.due), task.time || ""].filter(Boolean).join(" ");
}

function dueKey({ task }) {
  return `${task.due || "9999-12-31"} ${task.time || "23:59"}`;
}

export function renderTaskComposer(candidate) {
  return `
    <div class="task-composer">
      <label class="task-title-input">${icon("plus")}<input data-new-task-title value="${escapeAttr(state.newTask.title)}" placeholder="Add a task - click and type here..." /></label>
      <div class="task-controls">
        <div class="urgency-set">
          <span>Urgency</span>
          ${[1, 2, 3, 4].map((n) => `<button class="urgency-choice ${state.newTask.urgency === n ? `u${n}` : ""}" data-new-urgency="${n}">${n}</button>`).join("")}
        </div>
          ${renderDateControl({ value: state.newTask.due, inputAttr: "data-new-task-date", todayAttr: 'data-new-task-due-shortcut="0"', tomorrowAttr: 'data-new-task-due-shortcut="1"' })}
        <label class="date-input">${icon("calendar")}<input data-new-task-time type="time" value="${state.newTask.time || ""}" /></label>
        ${state.newTask.time ? `<button class="clear-time-button" data-clear-new-task-time>Clear time</button>` : ""}
        <button class="primary-button compact" data-add-task="${candidate.id}">${icon("plus")} Add task</button>
      </div>
    </div>
  `;
}

export function renderTask(candidate, task) {
  if (task.type === "stage-move") return renderStageMoveTask(candidate, task);
  return `
    <article class="task-card ${task.done ? "done" : ""}">
      <button class="complete-toggle" data-toggle-task="${candidate.id}:${task.id}" title="Complete task">${task.done ? icon("check") : ""}</button>
      <div class="task-main">
        <div class="task-title-row">
          <input class="task-title" data-task-field="${candidate.id}:${task.id}:title" value="${escapeAttr(task.title)}" />
          ${task.done ? `<span class="completed-at">${formatCompletedAt(task.completedAt)}</span>` : ""}
          <button class="tiny-danger" data-delete-task="${candidate.id}:${task.id}" title="Delete task">${icon("x")}</button>
        </div>
        <div class="task-meta-row">
          <label class="task-chip urgency-chip u${task.urgency}">${icon("flag")} U<select data-task-field="${candidate.id}:${task.id}:urgency">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${task.urgency === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="task-chip task-date-display" data-task-date-display>
            ${icon("calendar")}
            <span>${escapeHtml(compactDateLabel(task.due))}</span>
            <input type="date" data-task-field="${candidate.id}:${task.id}:due" value="${escapeAttr(task.due || "")}" aria-label="Task date" />
          </label>
          <label class="task-chip">${icon("calendar")}<input type="time" data-task-field="${candidate.id}:${task.id}:time" value="${task.time || ""}" /></label>
        </div>
        <textarea class="task-note" data-task-field="${candidate.id}:${task.id}:note" placeholder="Task comment - click and type here...">${escapeHtml(task.note || "")}</textarea>
        <div class="quick-actions">
          ${quickButton("no-answer", "No answer")}
          ${quickButton("interested", "Interested")}
          ${quickButton("not-interested", "Not interested")}
          ${quickButton("busy", "Busy")}
          ${quickButton("disqualify", "Disqualify")}
          ${quickButton("no-call-dq", "No call - DQ")}
          <span class="quick-divider"></span>
          ${quickButton("second-no-answer", "2nd no answer")}
          ${quickButton("good-to-place", "Good to place")}
        </div>
      </div>
    </article>
  `.replaceAll('data-action="', `data-action="${candidate.id}:${task.id}:`);
}

function renderStageMoveTask(candidate, task) {
  return `
    <article class="task-card stage-move-task done">
      <span class="complete-toggle square-toggle">${icon("check")}</span>
      <div class="task-main">
        <div class="task-title-row">
          <span class="stage-move-title">${escapeHtml(task.title)}</span>
          <span class="completed-at">${formatCompletedAt(task.completedAt)}</span>
          <button class="tiny-danger" data-delete-task="${candidate.id}:${task.id}" title="Delete task">${icon("x")}</button>
        </div>
      </div>
    </article>
  `;
}

function quickButton(action, label) {
  return `<button class="quick ${action}" data-action="${action}">${label}</button>`;
}

function renderDateControl({ value, inputAttr, todayAttr, tomorrowAttr }) {
  return `
    <span class="date-choice">
      ${icon("calendar")}
      <input type="date" ${inputAttr} value="${escapeAttr(value || "")}" />
      <button type="button" ${todayAttr}>Today</button>
      <button type="button" ${tomorrowAttr}>Tomorrow</button>
    </span>
  `;
}
