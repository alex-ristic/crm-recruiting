import { app, restorePendingFocus, restoreScrollState } from "../dom.js";
import { state } from "../state.js";
import { bindEvents } from "../events.js";
import { renderCandidatesBoard, renderCandidateModal } from "./candidates.js";
import { renderJobs, renderPositionModal, renderPositionsBoard } from "./jobs.js";
import { renderRail, renderTopbar } from "./common.js";

export function renderApp() {
  const selected = state.candidates.find((candidate) => candidate.id === state.selectedId);
  const selectedPosition = state.positions.find((position) => position.id === state.selectedPositionId);
  app.innerHTML = `
    <div class="crm-shell">
      ${renderRail()}
      <main class="workspace">
        ${renderTopbar()}
        ${renderCurrentTab()}
      </main>
      ${selected && state.activeTab === "candidates" ? renderCandidateModal(selected) : ""}
      ${selectedPosition && state.activeTab === "positions" ? renderPositionModal(selectedPosition) : ""}
    </div>
  `;
  bindEvents();
  restorePendingFocus();
  restoreScrollState(state);
}

function renderCurrentTab() {
  if (state.activeTab === "positions") return renderPositionsBoard();
  if (state.activeTab === "jobs") return renderJobs();
  return renderCandidatesBoard();
}

