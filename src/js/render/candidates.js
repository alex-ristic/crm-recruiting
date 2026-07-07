import { assignablePositionStages, candidateStages, closedWonPositionGroups } from "../constants.js";
import { state } from "../state.js";
import { jobName, positionCardTitle, positionName, stageMeta, visibleCandidates } from "../selectors.js";
import { compactDateLabel } from "../utils/dates.js";
import { escapeAttr, escapeHtml, icon, initials } from "../utils/formatting.js";
import { renderTask, renderTaskComposer } from "./tasks.js";

export function renderCandidatesBoard() {
  const candidates = visibleCandidates();
  const stages = state.showPotentialCandidates ? candidateStages : candidateStages.filter(([id]) => id !== "potential");
  const potentialCount = candidates.filter((candidate) => candidate.stage === "potential").length;
  return `
    <section class="board-wrap">
      <div class="candidate-board-tools">
        <button class="potential-toggle ${state.showPotentialCandidates ? "active" : ""}" data-toggle-potential-candidates>
          ${icon(state.showPotentialCandidates ? "x" : "plus")} Potential <b>${potentialCount}</b>
        </button>
      </div>
      <div class="board" data-board>
        ${stages.map(([id, label, color]) => renderCandidateStage(id, label, color, candidates)).join("")}
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
          ${renderCandidateOpenPositions(candidate)}
        </div>
      </article>
    </div>
  `;
}

function renderCandidateOpenPositions(candidate) {
  const positions = openPositionsForCandidate(candidate);
  return `
    <div class="candidate-open-positions">
      <div class="task-heading">
        <h2>Open positions</h2><span>${positions.length} active for ${escapeHtml(jobName(candidate.jobId))}</span>
      </div>
      <div class="candidate-position-list">
        ${positions.map((position) => renderCandidatePositionSummary(position)).join("") || `<div class="empty-tasks">No active open positions for this job.</div>`}
      </div>
    </div>
  `;
}

function renderCandidatePositionSummary(position) {
  return `
    <article class="candidate-position-summary">
      <div class="candidate-position-summary-head">
        <strong>${escapeHtml(positionCardTitle(position))}</strong>
        <span>${escapeHtml(position.openGroup ? position.openGroup.toUpperCase() : "OPEN")}</span>
      </div>
      <div class="candidate-position-facts">
        <span>${icon("link")} ${escapeHtml(position.city || "No city")}</span>
        <span>${icon("users")} ${escapeHtml(position.client || "No client")}</span>
        <span>${icon("flag")} ${escapeHtml(position.salary || "No salary")}</span>
      </div>
      <div class="candidate-position-tags">
        <span>${position.eu ? "EU" : "No EU"}</span>
        <span>${position.accommodation ? "Accommodation" : "No accommodation"}</span>
        <span>${position.food ? "Food" : "No food"}</span>
      </div>
      ${position.note ? `<p>${escapeHtml(position.note)}</p>` : ""}
    </article>
  `;
}

export function renderClosedLostDecisionModal() {
  const candidate = state.candidates.find((item) => item.id === state.pendingClosedLostDecision?.candidateId);
  const position = state.positions.find((item) => item.id === candidate?.positionId);
  if (!candidate || !position) return "";
  const linkedCandidates = state.candidates.filter((item) => item.positionId === position.id);
  return `
    <div class="overlay" data-modal-overlay="closed-lost" data-closed-lost-modal>
      <article class="decision-modal">
        <div class="modal-bar">
          ${icon("briefcase")} <span>Linked position</span><span class="crumb">›</span><strong>${escapeHtml(positionCardTitle(position))}</strong>
          <button class="icon-button" data-cancel-closed-lost-decision>${icon("x")}</button>
        </div>
        <div class="modal-body">
          <div class="decision-copy">
            <h2>What happens with ${escapeHtml(positionCardTitle(position))}?</h2>
            <p>Choose what happens with the linked position and whether this candidate stays linked.</p>
          </div>
          <div class="fields decision-fields">
            <div class="field-row">
              <span>${icon("briefcase")}</span><label>Position</label>
              <select data-closed-lost-position-action>
                <option value="closed-lost">Move to Closed Lost</option>
                <option value="open">Move to Open</option>
                <option value="none">Do nothing</option>
              </select>
            </div>
            <div class="field-row">
              <span>${icon("link")}</span><label>Link</label>
              <select data-closed-lost-link-action>
                <option value="keep">Keep linked</option>
                <option value="unlink">Unlink candidate</option>
              </select>
            </div>
          </div>
          <div class="task-heading">
            <h2>All linked candidates</h2><span>${linkedCandidates.length} total</span>
          </div>
          <div class="linked-list">
            ${linkedCandidates.map((item) => `<div class="linked-row linked-row-static"><span>${initials(item.name)}</span><strong>${escapeHtml(item.name)}</strong><em>${stageMeta(item.stage, candidateStages).name}</em></div>`).join("")}
          </div>
          <div class="decision-actions">
            <button class="task-heading-action cancel" data-cancel-closed-lost-decision>Cancel</button>
            <button class="primary-button compact" data-apply-closed-lost-decision>${icon("check")} Apply</button>
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
  const closedWonExpanded = id === "closed-won" && state.showClosedWonCandidateGroups;
  return `
    <section class="stage-column candidate-stage candidate-stage-${id} ${closedWonExpanded ? "closed-won-groups-expanded" : ""}">
      <div class="stage-title">
        <span class="dot" style="background:${color}"></span>
        <span>${label}</span>
        ${id === "closed-won" ? `<button class="open-group-toggle ${closedWonExpanded ? "active" : ""}" data-toggle-closed-won-candidate-groups title="${closedWonExpanded ? "Hide Closed Won groups" : "Show Closed Won groups"}">${icon("check")}</button>` : ""}
        <b>${stageCandidates.length}</b>
      </div>
      ${closedWonExpanded ? renderClosedWonCandidateGroups(stageCandidates, color) : `
        <div class="stage-list" data-drop-type="candidate" data-drop-stage="${id}">
          ${renderCandidateGroups(id, stageCandidates, color)}
        </div>
      `}
    </section>
  `;
}

function renderClosedWonCandidateGroups(candidates, color) {
  return `
    <div class="candidate-closed-won-groups">
      ${closedWonPositionGroups.map(([id, label, groupColor]) => {
        const groupCandidates = candidates.filter((candidate) => closedWonGroupForCandidate(candidate) === id);
        return `
          <section class="open-group">
            <div class="open-group-title">
              <span class="dot" style="background:${groupColor}"></span>
              <span>${label}</span>
              <b>${groupCandidates.length}</b>
            </div>
            <div class="stage-list open-group-list" data-drop-type="candidate" data-drop-stage="closed-won" data-drop-open-group="${id}">
              ${renderCandidateGroups("closed-won", groupCandidates, color)}
            </div>
          </section>
        `;
      }).join("")}
    </div>
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
        ${collapsed ? "" : renderCandidateGroupBody(group, key, color, stageId)}
      </div>
    `;
  }).join("");
}

function renderCandidateGroupBody(group, key, color, stageId) {
  if (!group.subgroups) return `<div class="job-group-list">${group.candidates.map((candidate) => renderCandidateCard(candidate, color, stageId)).join("")}</div>`;
  return `
    <div class="job-group-list">
      ${group.subgroups.map((subgroup) => renderCandidateSubgroup(subgroup, `${key}:${subgroup.id}`, color, stageId)).join("")}
    </div>
  `;
}

function renderCandidateSubgroup(group, key, color, stageId) {
  const collapsed = !!state.collapsedCandidateGroups[key];
  return `
    <div class="candidate-subgroup">
      <button class="candidate-subgroup-head" data-toggle-candidate-group="${escapeAttr(key)}">
        <span class="chevron">${collapsed ? "›" : "⌄"}</span>
        <span class="eu-sticker ${group.eu ? "eu" : "non-eu"}">${group.label}</span>
        <em>${group.candidates.length}</em>
      </button>
      ${collapsed ? "" : `<div class="job-group-list">${group.candidates.map((candidate) => renderCandidateCard(candidate, color, stageId)).join("")}</div>`}
    </div>
  `;
}

function jobCandidateGroups(candidates) {
  const groups = state.jobs
    .map((job) => jobCandidateGroup(job.id, job.name, candidates.filter((candidate) => candidate.jobId === job.id)))
    .filter((group) => group.candidates.length);
  const unassigned = candidates.filter((candidate) => !state.jobs.some((job) => job.id === candidate.jobId));
  if (unassigned.length) groups.push(jobCandidateGroup("unassigned", "No job", unassigned));
  return groups;
}

function jobCandidateGroup(id, name, candidates) {
  const euCandidates = candidates.filter((candidate) => candidate.eu);
  const nonEuCandidates = candidates.filter((candidate) => !candidate.eu);
  return {
    id,
    name,
    candidates,
    subgroups: [
      { id: "eu", label: "EU", eu: true, candidates: euCandidates },
      { id: "non-eu", label: "non-EU", eu: false, candidates: nonEuCandidates }
    ].filter((group) => group.candidates.length)
  };
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

function closedWonGroupForCandidate(candidate) {
  const position = state.positions.find((item) => item.id === candidate.positionId);
  return candidate.closedWonGroup || position?.closedWonGroup || "not-paid";
}

function assignablePositions(candidate) {
  const positions = state.positions.filter((position) =>
    position.jobId === candidate.jobId &&
    (assignablePositionStages.has(position.stage) || position.id === candidate.positionId)
  );
  const linkedPosition = state.positions.find((position) => position.id === candidate.positionId);
  if (linkedPosition && !positions.some((position) => position.id === linkedPosition.id)) return [linkedPosition, ...positions];
  return positions;
}

function openPositionsForCandidate(candidate) {
  return state.positions
    .filter((position) => position.stage === "open" && position.jobId === candidate.jobId)
    .sort((a, b) => (a.city || "").localeCompare(b.city || "") || (a.client || "").localeCompare(b.client || ""));
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
