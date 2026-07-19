import { rememberScrollState } from "./js/dom.js";
import { renderApp } from "./js/render/app.js";
import { configureState, loadState, replaceState, saveState, state } from "./js/state.js";
import { initializeAccess } from "./js/access.js";

async function initialize() {
  await initializeAccess();
  configureState({
    beforeRender: () => rememberScrollState(state),
    render: renderApp
  });
  replaceState(await loadState());
  renderApp();
}

initialize();
