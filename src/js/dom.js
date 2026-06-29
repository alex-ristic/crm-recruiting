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
      const [type, stage] = item.key.split(":");
      const list = app.querySelector(`[data-drop-type="${type}"][data-drop-stage="${stage}"]`);
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
      key: `${stage.dataset.dropType}:${stage.dataset.dropStage}`,
      top: stage.scrollTop,
      left: stage.scrollLeft
    }))
  };
}

