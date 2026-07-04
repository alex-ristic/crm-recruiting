import { assignablePositionStages, candidateStages } from "../constants.js";
import { state } from "../state.js";
import { jobName, positionCardTitle, positionName, stageMeta, visibleCandidates } from "../selectors.js";
import { compactDateLabel } from "../utils/dates.js";
import { escapeAttr, escapeHtml, icon, initials } from "../utils/formatting.js";
import { renderTask, renderTaskComposer } from "./tasks.js";

export function renderCandidatesBoard() {
  const candidates = visibleCandidates();
  return `
    <section class="board-wrap">
      <div class="board" data-board>
        ${candidateStages.map(([id, label, color]) => renderCandidateStage(id, label, color, candidates)).join("")}
      </div>
    </section>
  `;
}

export function renderCandidateModal(candidate) {
  const meta = stageMeta(candidate.stage, candidateStages);
  const sortedTasks = [...candidate.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done && b.done) return `${b.completedAt || ""}`.localeCompare(`${a.completedAt || ""}`);
    return `${a.due || ""} ${a.time || ""}`.localeCompare(`${b.due || ""} ${b.time || ""}`);
  });
  const openCount = candidate.tasks.filter((task) => !task.done).length;
  const composerOpen = state.taskComposerCandidateId === candidate.id;
  return `
    <div class="overlay" data-modal-overlay="candidate">
      <article class="candidate-modal">
        <div class="modal-bar">
          ${icon("users")} <span>Candidates</span><span class="crumb">›</span><strong>${candidate.name}</strong>
          <select class="stage-pill" data-candidate-field="${candidate.id}:stage" style="--stage:${meta.color}">
            ${candidateStages.map(([id, label]) => `<option value="${id}" ${candidate.stage === id ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <button class="next-stage-button" data-next-candidate-stage="${candidate.id}">Move to next stage</button>
          <button class="danger-button" data-delete-candidate="${candidate.id}">Delete</button>
          <button class="icon-button" data-close-modal>${icon("x")}</button>
        </div>
        <div class="modal-body">
          <div class="profile-head">
            <span class="profile-avatar" style="--accent:${meta.color}">${initials(candidate.name)}</span>
            <div>
              <input class="profile-name" data-candidate-field="${candidate.id}:name" value="${escapeAttr(candidate.name)}" />
              <p>${jobName(candidate.jobId)} - ${positionName(candidate.positionId)} - ${candidate.added}</p>
            </div>
          </div>
          <div class="fields">
            ${candidateField(candidate, "name", "Name", "users")}
            ${candidateField(candidate, "phone", "Phone number", "phone")}
            ${candidateField(candidate, "source", "Source", "link")}
            ${candidateField(candidate, "experience", "Experience", "briefcase")}
            ${candidateField(candidate, "whenStart", "When start", "calendar")}
            <div class="field-row">
              <span>${icon("check")}</span><label>EU papers</label>
              <input class="field-checkbox" data-candidate-field="${candidate.id}:eu" type="checkbox" ${candidate.eu ? "checked" : ""} />
            </div>
            <div class="field-row">
              <span>${icon("tag")}</span><label>Job</label>
              <select data-candidate-field="${candidate.id}:jobId">
                ${state.jobs.map((job) => `<option value="${job.id}" ${candidate.jobId === job.id ? "selected" : ""}>${job.name}</option>`).join("")}
              </select>
            </div>
            <div class="field-row">
              <span>${icon("briefcase")}</span><label>Position</label>
              <select data-candidate-field="${candidate.id}:positionId">
                <option value="" ${candidate.positionId ? "" : "selected"}>No position</option>
                ${assignablePositions(candidate).map((position) => `<option value="${position.id}" ${candidate.positionId === position.id ? "selected" : ""}>${escapeHtml(positionCardTitle(position))}</option>`).join("")}
              </select>
            </div>
            ${candidateField(candidate, "startDate", "Start date", "calendar", "date")}
          </div>
          <label class="candidate-note">
            <span>${icon("flag")} Candidate note</span>
            <textarea data-candidate-field="${candidate.id}:note" placeholder="Write an overarching comment for this candidate...">${escapeHtml(candidate.note)}</textarea>
          </label>
          <div class="task-heading">
            <h2>Tasks</h2><span>${openCount} open</span>
            <button class="task-heading-action ${composerOpen ? "cancel" : ""}" data-toggle-task-composer="${candidate.id}">
              ${icon(composerOpen ? "x" : "plus")} ${composerOpen ? "Cancel" : "Add task"}
            </button>
          </div>
          ${composerOpen ? renderTaskComposer(candidate) : ""}
          <div class="tasks">
            ${sortedTasks.map((task) => renderTask(candidate, task)).join("") || `<div class="empty-tasks">No tasks yet.</div>`}
          </div>
        </div>
      </article>
    </div>
  `;
}

export function isPlacementGroupedStage(stageId) {
  return ["sent", "trial-starting", "trial", "closed-won"].includes(stageId);
}

function renderCandidateStage(id, label, color, candidates) {
  const stageCandidates = candidates.filter((candidate) => candidate.stage === id);
  return `
    <section class="stage-column">
      <div class="stage-title">
        <span class="dot" style="background:${color}"></span>
        <span>${label}</span>
        <b>${stageCandidates.length}</b>
      </div>
      <div class="stage-list" data-drop-type="candidate" data-drop-stage="${id}">
        ${renderCandidateGroups(id, stageCandidates, color)}
      </div>
    </section>
  `;
}

function renderCandidateGroups(stageId, candidates, color) {
  if (!candidates.length) return `<div class="empty-stage">No candidates</div>`;
  const groups = isPlacementGroupedStage(stageId) ? placementCandidateGroups(candidates) : jobCandidateGroups(candidates);
  return groups.map((group) => {
    const key = `${stageId}:${group.id}`;
    const collapsed = !!state.collapsedCandidateGroups[key];
    return `
      <div class="job-group">
        <button class="job-group-head" data-toggle-candidate-group="${escapeAttr(key)}">
          <span class="chevron">${collapsed ? "›" : "⌄"}</span>
          <strong>${escapeHtml(group.name)}</strong>
          ${group.euLabel ? `<span class="eu-sticker ${group.eu ? "eu" : "non-eu"}">${group.euLabel}</span>` : ""}
          <em>${group.candidates.length}</em>
        </button>
        ${collapsed ? "" : `<div class="job-group-list">${group.candidates.map((candidate) => renderCandidateCard(candidate, color, stageId)).join("")}</div>`}
      </div>
    `;
  }).join("");
}

function jobCandidateGroups(candidates) {
  const groups = state.jobs.flatMap((job) => [
    { id: `${job.id}:eu`, name: job.name, eu: true, euLabel: "EU", candidates: candidates.filter((candidate) => candidate.jobId === job.id && candidate.eu) },
    { id: `${job.id}:non-eu`, name: job.name, eu: false, euLabel: "Non-EU", candidates: candidates.filter((candidate) => candidate.jobId === job.id && !candidate.eu) }
  ]).filter((group) => group.candidates.length);
  const unassigned = candidates.filter((candidate) => !state.jobs.some((job) => job.id === candidate.jobId));
  const unassignedEu = unassigned.filter((candidate) => candidate.eu);
  const unassignedNonEu = unassigned.filter((candidate) => !candidate.eu);
  if (unassignedEu.length) groups.push({ id: "unassigned:eu", name: "No job", eu: true, euLabel: "EU", candidates: unassignedEu });
  if (unassignedNonEu.length) groups.push({ id: "unassigned:non-eu", name: "No job", eu: false, euLabel: "Non-EU", candidates: unassignedNonEu });
  return groups;
}

function placementCandidateGroups(candidates) {
  const groups = new Map();
  candidates.forEach((candidate) => {
    const position = state.positions.find((item) => item.id === candidate.positionId);
    const client = position?.client || "No client";
    const city = position?.city || "No city";
    const id = position ? `${client}::${city}` : "unassigned-placement";
    const name = position ? `${client} - ${city}` : "No linked position";
    if (!groups.has(id)) groups.set(id, { id, name, candidates: [] });
    groups.get(id).candidates.push(candidate);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function assignablePositions(candidate) {
  return state.positions.filter((position) =>
    position.jobId === candidate.jobId &&
    assignablePositionStages.has(position.stage)
  );
}

function renderCandidateCard(candidate, color, stageId) {
  const showStartDate = shouldShowStartDate(stageId) && candidate.startDate;
  return `
    <button class="candidate-card ${candidate.id === state.selectedId ? "selected" : ""}" data-open-candidate="${candidate.id}" draggable="true" data-drag-type="candidate" data-drag-id="${candidate.id}">
      <div class="card-row">
        <span class="avatar" style="--accent:${color}">${initials(candidate.name)}</span>
        <span class="card-name">${candidate.name}</span>
      </div>
      <div class="card-meta">${candidate.phone || "No phone number"}</div>
      ${isPlacementGroupedStage(stageId) ? `<div class="card-sub">${jobName(candidate.jobId)}</div>` : ""}
      ${showStartDate ? `<div class="card-sub">Start date: ${escapeHtml(compactDateLabel(candidate.startDate))}</div>` : ""}
    </button>
  `;
}

function shouldShowStartDate(stageId) {
  const trialStartingIndex = candidateStages.findIndex(([id]) => id === "trial-starting");
  const currentIndex = candidateStages.findIndex(([id]) => id === stageId);
  return trialStartingIndex >= 0 && currentIndex >= trialStartingIndex;
}

function candidateField(candidate, key, label, iconName, type = "text") {
  return `
    <div class="field-row">
      <span>${icon(iconName)}</span><label>${label}</label>
      <input data-candidate-field="${candidate.id}:${key}" type="${type}" value="${escapeAttr(candidate[key])}" />
    </div>
  `;
}
