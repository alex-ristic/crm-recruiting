import { setPendingFocusSelector } from "../dom.js";
import { state, setState } from "../state.js";
import { logout } from "../api.js";

export function updateSearch(event) {
  setPendingFocusSelector("[data-search]");
  setState({ search: event.target.value });
}

export function updateTaskView(event) {
  const key = event.target.dataset.taskView;
  setState({ taskView: { ...state.taskView, [key]: event.target.value } });
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

export function logoutCurrentUser() {
  logout();
}
