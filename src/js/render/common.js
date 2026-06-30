import { candidateStages, positionStages } from "../constants.js";
import { state } from "../state.js";
import { escapeAttr, icon } from "../utils/formatting.js";

const tabs = [
  ["tasks", "listChecks"],
  ["candidates", "users"],
  ["positions", "briefcase"],
  ["jobs", "tag"]
];

const tabCopy = {
  tasks: () => {
    const tasks = state.candidates.flatMap((candidate) => candidate.tasks || []);
    const open = tasks.filter((task) => !task.done).length;
    return ["Tasks", `${open} open task${open === 1 ? "" : "s"}`, "Search tasks...", null, false];
  },
  candidates: () => ["Candidates", `${state.candidates.length} total - ${candidateStages.length} stages`, "Search candidates...", "candidate", false],
  positions: () => ["Positions", `${state.positions.length} concrete openings - ${positionStages.length} stages`, "Search positions...", "position", state.showPositionComposer],
  jobs: () => ["Jobs", `${state.jobs.length} manually managed jobs`, "Search jobs...", "job", state.showJobComposer]
};

export function renderRail() {
  const item = (tab, iconName) => `<button class="rail-item ${state.activeTab === tab ? "active" : ""}" data-tab="${tab}" title="${tab}">${icon(iconName)}</button>`;
  return `
    <aside class="rail">
      <div class="logo">R</div>
      <div class="rail-stack">
        ${tabs.map(([tab, iconName]) => item(tab, iconName)).join("")}
      </div>
    </aside>
  `;
}

export function renderTopbar() {
  const copy = (tabCopy[state.activeTab] || tabCopy.tasks)();
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
      ${copy[3] ? `<button class="primary-button" data-add="${copy[3]}">${copy[4] ? icon("x") : icon("plus")} ${copy[4] ? "Close" : `Add ${copy[3]}`}</button>` : ""}
      <button class="logout-button" data-logout>Logout</button>
    </header>
  `;
}
