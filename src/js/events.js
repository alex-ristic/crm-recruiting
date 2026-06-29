import { app } from "./dom.js";
import { state, setState } from "./state.js";
import { addCandidate, deleteCandidate, moveCandidateToNextStage, moveCandidateToStage, toggleCandidateGroup, updateCandidate } from "./actions/candidates.js";
import {
  clearPositionFilters,
  createJob,
  createPosition,
  deleteJob,
  deletePosition,
  movePositionToStage,
  toggleHeadlinePart,
  togglePositionFilter,
  updateHeadlinePart,
  updateJob,
  updateNewJob,
  updateNewPosition,
  updatePosition,
  updatePositionFilter,
  updatePositionFilterOption,
  updatePositionFilterSearch
} from "./actions/jobs.js";
import {
  addTask,
  clearNewTaskTime,
  clearTaskTime,
  deleteTask,
  quickAction,
  toggleTask,
  updateNewTaskDate,
  updateNewTaskTime,
  updateNewTaskTitle,
  updateNewTaskUrgency,
  updateTask
} from "./actions/tasks.js";
import { closeModals, logoutCurrentUser, switchTab, toggleJobComposer, togglePositionComposer, updateSearch } from "./actions/ui.js";

let pointerDrag = null;
let suppressClick = null;

export function bindEvents() {
  app.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  app.querySelector("[data-search]")?.addEventListener("input", updateSearch);
  app.querySelector("[data-logout]")?.addEventListener("click", logoutCurrentUser);
  app.querySelector("[data-close-modal]")?.addEventListener("click", () => setState({ selectedId: null }));
  app.querySelector("[data-close-position-modal]")?.addEventListener("click", () => setState({ selectedPositionId: null }));
  app.querySelectorAll("[data-modal-overlay]").forEach((overlay) => overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) return;
    closeModals();
  }));
  document.onkeydown = (event) => {
    if (event.key === "Escape" && (state.selectedId || state.selectedPositionId)) closeModals();
  };
  app.querySelectorAll("[data-open-candidate]").forEach((card) => card.addEventListener("click", () => {
    if (suppressClick?.type === "candidate" && suppressClick.id === card.dataset.openCandidate) {
      suppressClick = null;
      return;
    }
    setState({ selectedId: card.dataset.openCandidate });
  }));
  app.querySelectorAll("[data-open-position]").forEach((card) => card.addEventListener("click", (event) => {
    if (suppressClick?.type === "position" && suppressClick.id === card.dataset.openPosition) {
      suppressClick = null;
      return;
    }
    if (event.target.closest("select, input, button")) return;
    setState({ selectedPositionId: card.dataset.openPosition });
  }));
  app.querySelectorAll("[data-open-candidate-from-position]").forEach((button) => button.addEventListener("click", () => setState({ selectedId: button.dataset.openCandidateFromPosition, selectedPositionId: null, activeTab: "candidates" })));
  app.querySelector("[data-add='candidate']")?.addEventListener("click", addCandidate);
  app.querySelectorAll("[data-toggle-candidate-group]").forEach((button) => button.addEventListener("click", () => toggleCandidateGroup(button.dataset.toggleCandidateGroup)));
  app.querySelectorAll("[data-next-candidate-stage]").forEach((button) => button.addEventListener("click", () => moveCandidateToNextStage(button.dataset.nextCandidateStage)));
  app.querySelector("[data-add='job']")?.addEventListener("click", toggleJobComposer);
  app.querySelector("[data-add='position']")?.addEventListener("click", togglePositionComposer);
  app.querySelector("[data-create-position]")?.addEventListener("click", createPosition);
  app.querySelector("[data-create-job]")?.addEventListener("click", createJob);
  app.querySelectorAll("[data-position-filter]").forEach((input) => input.addEventListener("change", updatePositionFilter));
  app.querySelectorAll("[data-toggle-position-filter]").forEach((button) => button.addEventListener("click", () => togglePositionFilter(button.dataset.togglePositionFilter)));
  app.querySelectorAll("[data-position-filter-search]").forEach((input) => input.addEventListener("input", updatePositionFilterSearch));
  app.querySelectorAll("[data-position-filter-option]").forEach((input) => input.addEventListener("change", updatePositionFilterOption));
  app.querySelector("[data-clear-position-filters]")?.addEventListener("click", clearPositionFilters);
  app.querySelectorAll("[data-delete-job]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteJob(button.dataset.deleteJob);
  }));
  app.querySelectorAll("[data-delete-position]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    deletePosition(button.dataset.deletePosition);
  }));
  app.querySelectorAll("[data-delete-candidate]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteCandidate(button.dataset.deleteCandidate);
  }));
  app.querySelectorAll("[draggable='true'][data-drag-type]").forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);
    item.addEventListener("pointerdown", handlePointerDragStart);
  });
  app.querySelectorAll("[data-drop-type][data-drop-stage]").forEach((zone) => {
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);
  });
  app.querySelectorAll("[data-new-position]").forEach((input) => input.addEventListener("input", updateNewPosition));
  app.querySelectorAll("[data-new-position]").forEach((input) => input.addEventListener("change", updateNewPosition));
  app.querySelectorAll("[data-new-job]").forEach((input) => input.addEventListener("input", updateNewJob));
  app.querySelectorAll("[data-position-field]").forEach((input) => input.addEventListener("input", updatePosition));
  app.querySelectorAll("[data-position-field]").forEach((input) => input.addEventListener("change", updatePosition));
  app.querySelectorAll("[data-toggle-headline-part]").forEach((button) => button.addEventListener("click", toggleHeadlinePart));
  app.querySelectorAll("[data-headline-part]").forEach((input) => input.addEventListener("input", updateHeadlinePart));
  app.querySelectorAll("[data-job-field]").forEach((input) => input.addEventListener("input", updateJob));
  app.querySelectorAll("[data-candidate-field]").forEach((input) => input.addEventListener("input", updateCandidate));
  app.querySelectorAll("[data-candidate-field]").forEach((input) => input.addEventListener("change", updateCandidate));
  app.querySelector("[data-new-task-title]")?.addEventListener("input", updateNewTaskTitle);
  app.querySelector("[data-new-task-date]")?.addEventListener("input", updateNewTaskDate);
  app.querySelector("[data-new-task-time]")?.addEventListener("input", updateNewTaskTime);
  app.querySelector("[data-clear-new-task-time]")?.addEventListener("click", clearNewTaskTime);
  app.querySelectorAll("[data-new-urgency]").forEach((button) => button.addEventListener("click", () => updateNewTaskUrgency(Number(button.dataset.newUrgency))));
  app.querySelector("[data-add-task]")?.addEventListener("click", (event) => addTask(event.currentTarget.dataset.addTask));
  app.querySelectorAll("[data-task-field]").forEach((input) => input.addEventListener("input", updateTask));
  app.querySelectorAll("[data-task-field]").forEach((input) => input.addEventListener("change", updateTask));
  app.querySelectorAll("[data-clear-task-time]").forEach((button) => button.addEventListener("click", clearTaskTime));
  app.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", deleteTask));
  app.querySelectorAll("[data-toggle-task]").forEach((button) => button.addEventListener("click", toggleTask));
  app.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", quickAction));
}

function handleDragStart(event) {
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify({
    type: event.currentTarget.dataset.dragType,
    id: event.currentTarget.dataset.dragId
  }));
}

function handlePointerDragStart(event) {
  if (event.button !== 0 || event.target.closest("select, input, textarea, button, [data-delete-candidate]")) return;
  pointerDrag = {
    type: event.currentTarget.dataset.dragType,
    id: event.currentTarget.dataset.dragId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    el: event.currentTarget
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
  document.onpointermove = handlePointerDragMove;
  document.onpointerup = handlePointerDragEnd;
}

function handlePointerDragMove(event) {
  if (!pointerDrag) return;
  const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
  if (distance > 8) {
    pointerDrag.moved = true;
    pointerDrag.el.classList.add("dragging");
    const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-type][data-drop-stage]");
    app.querySelectorAll(".drop-ready").forEach((item) => item.classList.remove("drop-ready"));
    if (zone && zone.dataset.dropType === pointerDrag.type) zone.classList.add("drop-ready");
  }
}

function handlePointerDragEnd(event) {
  if (!pointerDrag) return;
  const drag = pointerDrag;
  pointerDrag = null;
  document.onpointermove = null;
  document.onpointerup = null;
  drag.el.classList.remove("dragging");
  app.querySelectorAll(".drop-ready").forEach((item) => item.classList.remove("drop-ready"));
  if (!drag.moved) return;
  suppressClick = { type: drag.type, id: drag.id };
  const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-type][data-drop-stage]");
  if (!zone || zone.dataset.dropType !== drag.type) return;
  if (drag.type === "candidate") moveCandidateToStage(drag.id, zone.dataset.dropStage);
  if (drag.type === "position") movePositionToStage(drag.id, zone.dataset.dropStage);
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  app.querySelectorAll(".drop-ready").forEach((zone) => zone.classList.remove("drop-ready"));
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drop-ready");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drop-ready");
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drop-ready");
  let payload;
  try {
    payload = JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return;
  }
  const stage = event.currentTarget.dataset.dropStage;
  if (payload.type !== event.currentTarget.dataset.dropType) return;
  if (payload.type === "candidate") moveCandidateToStage(payload.id, stage);
  if (payload.type === "position") movePositionToStage(payload.id, stage);
}
