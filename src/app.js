import { rememberScrollState } from "./js/dom.js";
import { renderApp } from "./js/render/app.js";
import { configureState, loadState, replaceState, saveState, state } from "./js/state.js";

async function initialize() {
  configureState({
    beforeRender: () => rememberScrollState(state),
    render: renderApp
  });
  replaceState(await loadState());
  saveState();
  renderApp();
}

initialize();

