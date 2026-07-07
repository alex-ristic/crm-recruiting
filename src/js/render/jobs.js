import { closedWonPositionGroups, openPositionGroups, positionStages } from "../constants.js";
import { state } from "../state.js";
import {
  headlineInputValue,
  jobName,
  positionCardTitle,
  positionSalaryLine,
  positionStageMeta,
  stageMeta,
  uniquePositionValues,
  visiblePositions
} from "../selectors.js";
import { candidateStages } from "../constants.js";
import { escapeAttr, escapeHtml, icon, initials } from "../utils/formatting.js";

export function renderPositionsBoard() {
  return `
    <section class="board-wrap positions-wrap">
      ${renderPositionFilters()}
      ${state.showPositionComposer ? renderPositionComposer() : ""}
      <div class="board ${state.showPositionComposer ? "positions-board with-composer" : "positions-board"}" data-board>
        ${positionStages.map(([id, label, color]) => renderPositionStage(id, label, color)).join("")}
      </div>
    </section>
  `;
}

export function renderJobs() {
  const q = state.search.trim().toLowerCase();
  const jobs = q ? state.jobs.filter((job) => [job.name, job.note].join(" ").toLowerCase().includes(q)) : state.jobs;
  return `
    <section class="positions-page">
      ${state.showJobComposer ? `<div class="position-composer">
        <input data-new-job="name" value="${escapeAttr(state.newJob.name)}" placeholder="Job name, e.g. Konobar HR" />
        <input data-new-job="note" value="${escapeAttr(state.newJob.note)}" placeholder="Short note" />
        <button class="primary-button compact" data-create-job>${icon("plus")} Add</button>
      </div>` : ""}
      <div class="positions-grid">
        ${jobs.map((job) => `
          <article class="position-card">
            <div class="position-icon">${icon("tag")}</div>
            <div>
              <div class="position-card-head">
                <input class="position-name" data-job-field="${job.id}:name" value="${escapeAttr(job.name)}" />
                <button class="tiny-danger" data-delete-job="${job.id}" title="Delete job">${icon("x")}</button>
              </div>
              <input class="muted-inline-input" data-job-field="${job.id}:note" value="${escapeAttr(job.note || "")}" placeholder="No note" />
              <span>${state.positions.filter((position) => position.jobId === job.id).length} positions - ${state.candidates.filter((candidate) => candidate.jobId === job.id).length} candidates</span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function renderPositionModal(position) {
  const meta = positionStageMeta(position.stage);
  const linkedCandidates = state.candidates.filter((candidate) => candidate.positionId === position.id);
  const title = positionCardTitle(position);
  return `
    <div class="overlay" data-modal-overlay="position">
      <article class="candidate-modal">
        <div class="modal-bar">
          ${icon("briefcase")} <span>Positions</span><span class="crumb">›</span><strong>${title}</strong>
          <select class="stage-pill" data-position-field="${position.id}:stage" style="--stage:${meta.color}">
            ${positionStages.map(([id, label]) => `<option value="${id}" ${position.stage === id ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <button class="danger-button" data-delete-position="${position.id}">Delete</button>
          <button class="icon-button" data-close-position-modal>${icon("x")}</button>
        </div>
        <div class="modal-body">
          <div class="profile-head">
            <span class="profile-avatar square-profile-avatar" style="--accent:${meta.color}">${icon("briefcase")}</span>
            <div>
              <h2 class="profile-title">${title}</h2>
              <p>${jobName(position.jobId)} - ${position.client || "No client"} - ${position.city || "No city"}</p>
            </div>
          </div>
          ${renderHeadlineControls(position)}
          <div class="fields">
            <div class="field-row">
              <span>${icon("tag")}</span><label>Job</label>
              <select data-position-field="${position.id}:jobId">
                ${state.jobs.map((job) => `<option value="${job.id}" ${position.jobId === job.id ? "selected" : ""}>${job.name}</option>`).join("")}
              </select>
            </div>
            ${positionTextField(position, "client", "Client", "users")}
            ${positionTextField(position, "city", "City", "link")}
            ${positionTextField(position, "salary", "Salary", "flag")}
            ${positionTextField(position, "url", "URL", "link")}
            <div class="field-row">
              <span>${icon("check")}</span><label>EU papers</label>
              <input class="field-checkbox" data-position-field="${position.id}:eu" type="checkbox" ${position.eu ? "checked" : ""} />
            </div>
            <div class="field-row">
              <span>${icon("check")}</span><label>Accommodation</label>
              <input class="field-checkbox" data-position-field="${position.id}:accommodation" type="checkbox" ${position.accommodation ? "checked" : ""} />
            </div>
            <div class="field-row">
              <span>${icon("check")}</span><label>Food</label>
              <input class="field-checkbox" data-position-field="${position.id}:food" type="checkbox" ${position.food ? "checked" : ""} />
            </div>
          </div>
          <label class="candidate-note">
            <span>${icon("flag")} Position notes</span>
            <textarea data-position-field="${position.id}:note" placeholder="Add position notes...">${escapeHtml(position.note || "")}</textarea>
          </label>
          <div class="task-heading">
            <h2>Linked candidates</h2><span>${linkedCandidates.length} total</span>
          </div>
          <div class="linked-list">
            ${linkedCandidates.map((candidate) => `<button class="linked-row" data-open-candidate-from-position="${candidate.id}"><span>${initials(candidate.name)}</span><strong>${candidate.name}</strong><em>${stageMeta(candidate.stage, candidateStages).name}</em></button>`).join("") || `<div class="empty-tasks">No candidates linked to this position.</div>`}
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderPositionFilters() {
  return `
    <div class="position-filters">
      ${renderMultiFilter("jobIds", "Jobs", state.jobs.map((job) => ({ value: job.id, label: job.name })))}
      ${renderMultiFilter("clients", "Clients", uniquePositionValues("client").map((value) => ({ value, label: value })))}
      ${renderMultiFilter("cities", "Cities", uniquePositionValues("city").map((value) => ({ value, label: value })))}
      <label class="filter-check">
        <input data-position-filter="eu" type="checkbox" ${state.positionFilters.eu ? "checked" : ""} />
        EU papers
      </label>
      <label class="filter-check">
        <input data-position-filter="accommodation" type="checkbox" ${state.positionFilters.accommodation ? "checked" : ""} />
        Accommodation
      </label>
      <button class="filter-clear" data-clear-position-filters>Clear</button>
    </div>
  `;
}

function renderMultiFilter(key, label, options) {
  const selected = state.positionFilters[key] || [];
  const search = state.positionFilterSearch[key] || "";
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()));
  const summary = selected.length ? `${selected.length} selected` : `All ${label.toLowerCase()}`;
  const open = state.openPositionFilter === key;
  return `
    <div class="multi-filter ${open ? "open" : ""}">
      <button class="filter-trigger" data-toggle-position-filter="${key}">
        <span>${label}</span>
        <strong>${summary}</strong>
      </button>
      ${open ? `
        <div class="filter-menu">
          <input class="filter-search" data-position-filter-search="${key}" value="${escapeAttr(search)}" placeholder="Search ${label.toLowerCase()}..." />
          <div class="filter-options">
            ${visibleOptions.map((option) => `
              <label class="filter-option">
                <input data-position-filter-option="${key}" data-position-filter-value="${escapeAttr(option.value)}" type="checkbox" ${selected.includes(option.value) ? "checked" : ""} />
                <span>${escapeHtml(option.label)}</span>
              </label>
            `).join("") || `<div class="filter-empty">No matches</div>`}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function renderPositionComposer() {
  return `
    <div class="position-composer inline-composer">
      <select data-new-position="jobId">${state.jobs.map((job) => `<option value="${job.id}" ${state.newPosition.jobId === job.id ? "selected" : ""}>${job.name}</option>`).join("")}</select>
      <input data-new-position="client" value="${escapeAttr(state.newPosition.client)}" placeholder="Client" />
      <input data-new-position="city" value="${escapeAttr(state.newPosition.city)}" placeholder="City" />
      <input data-new-position="salary" value="${escapeAttr(state.newPosition.salary)}" placeholder="Salary" />
      <input data-new-position="url" value="${escapeAttr(state.newPosition.url)}" placeholder="Restaurant URL" />
      <label class="composer-check"><input data-new-position="eu" type="checkbox" ${state.newPosition.eu ? "checked" : ""} /> EU</label>
      <label class="composer-check"><input data-new-position="accommodation" type="checkbox" ${state.newPosition.accommodation ? "checked" : ""} /> Accommodation</label>
      <label class="composer-check"><input data-new-position="food" type="checkbox" ${state.newPosition.food ? "checked" : ""} /> Food</label>
      <input data-new-position="openings" type="number" min="1" value="${state.newPosition.openings}" />
      <button class="primary-button compact" data-create-position>${icon("plus")} Add</button>
    </div>
  `;
}

function renderPositionStage(id, label, color) {
  const positions = visiblePositions().filter((position) => position.stage === id);
  const openExpanded = id === "open" && state.showOpenPositionGroups;
  const closedWonExpanded = id === "closed-won" && state.showClosedWonPositionGroups;
  return `
    <section class="stage-column position-stage position-stage-${id} ${openExpanded ? "open-groups-expanded" : ""} ${closedWonExpanded ? "closed-won-groups-expanded" : ""}">
      <div class="stage-title">
        <span class="dot" style="background:${color}"></span>
        <span>${label}</span>
        ${id === "open" ? `<button class="open-group-toggle ${openExpanded ? "active" : ""}" data-toggle-open-position-groups title="${openExpanded ? "Hide Open groups" : "Show Open groups"}">${icon("check")}</button>` : ""}
        ${id === "closed-won" ? `<button class="open-group-toggle ${closedWonExpanded ? "active" : ""}" data-toggle-closed-won-position-groups title="${closedWonExpanded ? "Hide Closed Won groups" : "Show Closed Won groups"}">${icon("check")}</button>` : ""}
        <b>${positions.length}</b>
      </div>
      ${openExpanded ? renderOpenPositionGroups(positions, color) : closedWonExpanded ? renderClosedWonPositionGroups(positions, color) : `
        <div class="stage-list" data-drop-type="position" data-drop-stage="${id}">
          ${positions.map((position) => renderPositionCard(position, color)).join("") || `<div class="empty-stage">No positions</div>`}
        </div>
      `}
    </section>
  `;
}

function renderClosedWonPositionGroups(positions, color) {
  return `
    <div class="closed-won-groups">
      ${closedWonPositionGroups.map(([id, label, groupColor]) => {
        const groupPositions = positions.filter((position) => closedWonGroupForPosition(position) === id);
        return `
          <section class="open-group">
            <div class="open-group-title">
              <span class="dot" style="background:${groupColor}"></span>
              <span>${label}</span>
              <b>${groupPositions.length}</b>
            </div>
            <div class="stage-list open-group-list" data-drop-type="position" data-drop-stage="closed-won" data-drop-open-group="${id}">
              ${groupPositions.map((position) => renderPositionCard(position, color)).join("") || `<div class="empty-stage">No positions</div>`}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderOpenPositionGroups(positions, color) {
  return `
    <div class="open-groups">
      ${openPositionGroups.map(([id, label, groupColor]) => {
        const groupPositions = positions.filter((position) => openGroupForPosition(position) === id);
        return `
          <section class="open-group">
            <div class="open-group-title">
              <span class="dot" style="background:${groupColor}"></span>
              <span>${label}</span>
              <b>${groupPositions.length}</b>
            </div>
            <div class="stage-list open-group-list" data-drop-type="position" data-drop-stage="open" data-drop-open-group="${id}">
              ${groupPositions.map((position) => renderPositionCard(position, color)).join("") || `<div class="empty-stage">No positions</div>`}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function openGroupForPosition(position) {
  return position.openGroup || "u3";
}

function closedWonGroupForPosition(position) {
  return position.closedWonGroup || "not-paid";
}

function renderPositionCard(position, color) {
  const linkedCandidates = state.candidates.filter((candidate) => candidate.positionId === position.id);
  return `
    <article class="candidate-card position-board-card" data-open-position="${position.id}" draggable="true" data-drag-type="position" data-drag-id="${position.id}">
      <div class="card-row">
        <span class="avatar square-avatar" style="--accent:${color}">${icon("briefcase")}</span>
        <span class="card-name">${positionCardTitle(position)}</span>
        <span class="drag-grip" aria-hidden="true"></span>
      </div>
      <div class="card-meta">${jobName(position.jobId)}</div>
      <div class="card-sub">${position.client || "No client"} - ${position.city || "No city"}</div>
      <div class="card-sub">${positionSalaryLine(position)}</div>
      <div class="card-sub">${linkedCandidates.length} linked candidate${linkedCandidates.length === 1 ? "" : "s"} - ${position.openings} opening${position.openings === 1 ? "" : "s"}</div>
    </article>
  `;
}

function renderHeadlineControls(position) {
  return `
    <div class="headline-controls">
      ${renderHeadlineControl(position, "city", "City")}
      ${renderHeadlineControl(position, "client", "Client")}
      ${renderHeadlineControl(position, "job", "Job")}
    </div>
  `;
}

function renderHeadlineControl(position, key, label) {
  const manual = position.headlineOverrides?.[key] !== null && position.headlineOverrides?.[key] !== undefined;
  return `
    <label class="headline-control ${manual ? "manual" : ""}">
      <button type="button" class="headline-lock" data-toggle-headline-part="${position.id}:${key}" title="${manual ? "Use linked field" : "Unlock manual headline text"}">${icon(manual ? "unlock" : "lock")}</button>
      <span>${label}</span>
      <input data-headline-part="${position.id}:${key}" value="${escapeAttr(headlineInputValue(position, key))}" ${manual ? "" : "disabled"} />
    </label>
  `;
}

function positionTextField(position, key, label, iconName) {
  return `
    <div class="field-row">
      <span>${icon(iconName)}</span><label>${label}</label>
      <input data-position-field="${position.id}:${key}" value="${escapeAttr(position[key] || "")}" />
    </div>
  `;
}
