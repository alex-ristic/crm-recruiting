import { setPendingFocusSelector } from "../dom.js";
import { state, setState } from "../state.js";
import { logout } from "../api.js";

export function updateSearch(event) {
  setPendingFocusSelector("[data-search]");
  setState({ search: event.target.value });
}

export function updateTaskView(event) {
  const key = event.target.dataset.taskView;
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  setState({ taskView: { ...state.taskView, [key]: value } });
}

export function applyTaskPreset(preset) {
  if (preset === "today-urgency") {
    setState({ taskView: { ...state.taskView, groupBy: "due", sortBy: "urgency", includeUpcoming: false } });
    return;
  }
  if (preset === "first-call") {
    setState({ taskView: { ...state.taskView, groupBy: "job", sortBy: "urgency", includeUpcoming: true } });
  }
}

export function switchTab(tab) {
  setState({ activeTab: tab, selectedId: null, selectedPositionId: null, taskComposerCandidateId: null });
}

export function closeModals() {
  setState({ selectedId: null, selectedPositionId: null, taskComposerCandidateId: null });
}

export function toggleJobComposer() {
  setState({ showJobComposer: !state.showJobComposer });
}

export function togglePositionComposer() {
  setState({ showPositionComposer: !state.showPositionComposer });
}

export function togglePotentialCandidates() {
  setState({ showPotentialCandidates: !state.showPotentialCandidates });
}

export function toggleClosedWonCandidateGroups() {
  setState({ showClosedWonCandidateGroups: !state.showClosedWonCandidateGroups });
}

export function logoutCurrentUser() {
  logout();
}
