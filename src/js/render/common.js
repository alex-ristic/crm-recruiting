import { candidateStages, positionStages } from "../constants.js";
import { state } from "../state.js";
import { escapeAttr, icon } from "../utils/formatting.js";

export function renderRail() {
  const item = (tab, iconName) => `<button class="rail-item ${state.activeTab === tab ? "active" : ""}" data-tab="${tab}" title="${tab}">${icon(iconName)}</button>`;
  return `
    <aside class="rail">
      <div class="logo">R</div>
      <div class="rail-stack">
        <button class="rail-item" title="Dashboard">${icon("grid")}</button>
        ${item("candidates", "users")}
        ${item("jobs", "tag")}
        ${item("positions", "briefcase")}
        <button class="rail-item" title="Reports">${icon("chart")}</button>
      </div>
    </aside>
  `;
}

export function renderTopbar() {
  const copy = {
    candidates: ["Candidates", `${state.candidates.length} total - ${candidateStages.length} stages`, "Search candidates...", "candidate", false],
    jobs: ["Jobs", `${state.jobs.length} manually managed jobs`, "Search jobs...", "job", state.showJobComposer],
    positions: ["Positions", `${state.positions.length} concrete openings - ${positionStages.length} stages`, "Search positions...", "position", state.showPositionComposer]
  }[state.activeTab];
  return `
    <header class="topbar">
      <div class="title-group">
        <h1>${copy[0]}</h1>
        <p>${copy[1]}</p>
      </div>
      <label class="search-box">
        ${icon("search")}
        <input data-search value="${escapeAttr(state.search)}" placeholder="${copy[2]}" />
      </label>
      <button class="primary-button" data-add="${copy[3]}">${copy[4] ? icon("x") : icon("plus")} ${copy[4] ? "Close" : `Add ${copy[3]}`}</button>
      <button class="logout-button" data-logout>Logout</button>
    </header>
  `;
}
