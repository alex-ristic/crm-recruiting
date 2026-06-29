import { state } from "../state.js";
import { escapeAttr, escapeHtml, formatCompletedAt, icon } from "../utils/formatting.js";

export function renderTaskComposer(candidate) {
  return `
    <div class="task-composer">
      <label class="task-title-input">${icon("plus")}<input data-new-task-title value="${escapeAttr(state.newTask.title)}" placeholder="Add a task - click and type here..." /></label>
      <div class="task-controls">
        <div class="urgency-set">
          <span>Urgency</span>
          ${[1, 2, 3, 4].map((n) => `<button class="urgency-choice ${state.newTask.urgency === n ? `u${n}` : ""}" data-new-urgency="${n}">${n}</button>`).join("")}
        </div>
        <label class="date-input">${icon("calendar")}<input data-new-task-date type="date" value="${state.newTask.due}" /></label>
        <label class="date-input">${icon("calendar")}<input data-new-task-time type="time" value="${state.newTask.time || ""}" /></label>
        ${state.newTask.time ? `<button class="clear-time-button" data-clear-new-task-time>Clear time</button>` : ""}
        <button class="primary-button compact" data-add-task="${candidate.id}">${icon("plus")} Add task</button>
      </div>
    </div>
  `;
}

export function renderTask(candidate, task) {
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
          <label class="task-chip">${icon("calendar")}<input type="date" data-task-field="${candidate.id}:${task.id}:due" value="${task.due}" /></label>
          <label class="task-chip">${icon("calendar")}<input type="time" data-task-field="${candidate.id}:${task.id}:time" value="${task.time || ""}" /></label>
          ${task.time ? `<button class="task-chip clear-chip" data-clear-task-time="${candidate.id}:${task.id}">Clear time</button>` : ""}
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
          ${quickButton("good-to-place", "Good to place")}
        </div>
      </div>
    </article>
  `.replaceAll('data-action="', `data-action="${candidate.id}:${task.id}:`);
}

function quickButton(action, label) {
  return `<button class="quick ${action}" data-action="${action}">${label}</button>`;
}

