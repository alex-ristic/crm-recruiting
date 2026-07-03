export const app = document.querySelector("#app");

let pendingFocusSelector = null;
let pendingScrollSnapshot = null;

export function setPendingFocusSelector(selector) {
  pendingFocusSelector = selector;
}

export function rememberScrollState(state) {
  pendingScrollSnapshot = captureScrollState(state);
}

export function restorePendingFocus() {
  if (!pendingFocusSelector) return;
  const selector = pendingFocusSelector;
  pendingFocusSelector = null;
  const input = app.querySelector(selector);
  if (!input) return;
  input.focus();
  if (typeof input.setSelectionRange === "function") {
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }
}

export function restoreScrollState(state) {
  const snapshot = pendingScrollSnapshot;
  pendingScrollSnapshot = null;
  if (!snapshot) return;
  if (snapshot.activeTab === state.activeTab) {
    const board = app.querySelector("[data-board]");
    if (board) {
      board.scrollLeft = snapshot.boardLeft;
      board.scrollTop = snapshot.boardTop;
    }
    snapshot.stages.forEach((item) => {
      const selector = item.group
        ? `[data-drop-type="${item.type}"][data-drop-stage="${item.stage}"][data-drop-open-group="${item.group}"]`
        : `[data-drop-type="${item.type}"][data-drop-stage="${item.stage}"]:not([data-drop-open-group])`;
      const list = app.querySelector(selector);
      if (!list) return;
      list.scrollTop = item.top;
      list.scrollLeft = item.left;
    });
  }
  const modalBody = app.querySelector(".modal-body");
  if (modalBody) modalBody.scrollTop = snapshot.modalTop;
}

function captureScrollState(state) {
  const board = app.querySelector("[data-board]");
  return {
    activeTab: state.activeTab,
    boardLeft: board?.scrollLeft || 0,
    boardTop: board?.scrollTop || 0,
    modalTop: app.querySelector(".modal-body")?.scrollTop || 0,
    stages: Array.from(app.querySelectorAll("[data-drop-type][data-drop-stage]")).map((stage) => ({
      type: stage.dataset.dropType,
      stage: stage.dataset.dropStage,
      group: stage.dataset.dropOpenGroup || "",
      top: stage.scrollTop,
      left: stage.scrollLeft
    }))
  };
}
