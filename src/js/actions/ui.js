import { setPendingFocusSelector } from "../dom.js";
import { state, setState } from "../state.js";

export function updateSearch(event) {
  setPendingFocusSelector("[data-search]");
  setState({ search: event.target.value });
}

export function switchTab(tab) {
  setState({ activeTab: tab, selectedId: null, selectedPositionId: null });
}

export function closeModals() {
  setState({ selectedId: null, selectedPositionId: null });
}

export function toggleJobComposer() {
  setState({ showJobComposer: !state.showJobComposer });
}

export function togglePositionComposer() {
  setState({ showPositionComposer: !state.showPositionComposer });
}

