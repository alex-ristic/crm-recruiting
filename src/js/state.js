import { loadServerState, saveServerState } from "./api.js";
import {
  defaultJobs,
  defaultPositions,
  automaticTaskStages,
  placeholderCandidateIds,
  placeholderPositionIds
} from "./constants.js";
import { isAtLeastDaysAgo, today } from "./utils/dates.js";

export const defaultState = {
  activeTab: "tasks",
  selectedId: null,
  selectedPositionId: null,
  search: "",
  positionFilters: { jobIds: [], clients: [], cities: [], eu: false, accommodation: false },
  openPositionFilter: null,
  positionFilterSearch: { jobIds: "", clients: "", cities: "" },
  showOpenPositionGroups: false,
  showClosedWonPositionGroups: false,
  showClosedWonCandidateGroups: false,
  showPotentialCandidates: false,
  pendingClosedLostDecision: null,
  collapsedCandidateGroups: {},
  collapsedTaskGroups: {},
  taskView: { groupBy: "due", sortBy: "urgency", includeUpcoming: false },
  taskComposerCandidateId: null,
  showJobComposer: false,
  showPositionComposer: false,
  jobs: defaultJobs,
  positions: defaultPositions,
  candidates: [],
  newTask: freshTaskDraft(),
  newJob: { name: "", note: "" },
  newPosition: { name: "", jobId: "kuvar-hr", client: "", city: "", salary: "", eu: false, accommodation: false, food: false, note: "", openings: 1 }
};

export let state = structuredClone(defaultState);

let renderCallback = () => {};
let beforeRenderCallback = () => {};
let saveChain = Promise.resolve();

export function configureState({ beforeRender, render }) {
  beforeRenderCallback = beforeRender || beforeRenderCallback;
  renderCallback = render || renderCallback;
}

export async function loadState() {
  const serverState = await loadServerState();
  if (serverState) return hydrateState(serverState);
  return structuredClone(defaultState);
}

export function replaceState(nextState) {
  state = nextState;
}

export function hydrateState(parsed) {
  const jobs = mergeById(parsed.jobs || [], defaultJobs);
  const positionFilters = normalizePositionFilters(parsed.positionFilters || {});
  const positions = mergeById(
    (parsed.positions || []).filter((position) => !placeholderPositionIds.has(position.id)).map(normalizePosition),
    defaultPositions
  );
  const candidates = (parsed.candidates || [])
    .filter((candidate) => !placeholderCandidateIds.has(candidate.id))
    .map((candidate) => normalizeCandidate({
      ...candidate,
      positionId: placeholderPositionIds.has(candidate.positionId) ? "" : candidate.positionId
    }));
  const nextState = {
    ...structuredClone(defaultState),
    ...parsed,
    selectedPositionId: null,
    showJobComposer: false,
    showPositionComposer: false,
    positionFilters,
    openPositionFilter: null,
    positionFilterSearch: { jobIds: "", clients: "", cities: "" },
    showOpenPositionGroups: !!parsed.showOpenPositionGroups,
    showClosedWonPositionGroups: !!parsed.showClosedWonPositionGroups,
    showClosedWonCandidateGroups: !!parsed.showClosedWonCandidateGroups,
    showPotentialCandidates: !!parsed.showPotentialCandidates,
    pendingClosedLostDecision: null,
    collapsedCandidateGroups: parsed.collapsedCandidateGroups || {},
    collapsedTaskGroups: parsed.collapsedTaskGroups || {},
    taskView: normalizeTaskView(parsed.taskView || {}),
    taskComposerCandidateId: null,
    jobs,
    positions,
    candidates,
    newTask: freshTaskDraft(),
    newJob: { name: "", note: "" },
    newPosition: freshPositionDraft(jobs[0]?.id || "kuvar-hr")
  };
  return applyAutomaticCandidateTasks(nextState);
}

function normalizeTaskView(view) {
  const groups = new Set(["none", "due", "urgency", "person", "job", "position"]);
  const sorts = new Set(["due", "urgency", "person", "job", "position"]);
  return {
    groupBy: groups.has(view.groupBy) ? view.groupBy : "due",
    sortBy: sorts.has(view.sortBy) ? view.sortBy : "urgency",
    includeUpcoming: view.includeUpcoming !== false
  };
}

export function freshTaskDraft() {
  return { title: "", urgency: 2, due: today(), time: "" };
}

export function freshPositionDraft(jobId = "kuvar-hr") {
  return { name: "", jobId, client: "", city: "", salary: "", url: "", eu: false, accommodation: false, food: false, note: "", openings: 1, headlineOverrides: { city: null, client: null, job: null } };
}

export function saveState() {
  saveChain = saveChain
    .catch(() => {})
    .then(() => saveServerState(state))
    .then((payload) => {
      if (payload?.state?._revision !== undefined) state._revision = payload.state._revision;
    })
    .catch((error) => {
      if (error?.state) {
        state = hydrateState(error.state);
        renderCallback();
      }
    });
}

export function setState(patch) {
  beforeRenderCallback();
  state = applyAutomaticCandidateTasks({ ...state, ...patch });
  saveState();
  renderCallback();
}

export function setStateQuiet(patch) {
  state = applyAutomaticCandidateTasks({ ...state, ...patch });
  saveState();
}

function mergeById(existing, defaults) {
  const seen = new Set(existing.map((item) => item.id));
  return [...existing, ...defaults.filter((item) => !seen.has(item.id))];
}

function normalizePositionFilters(filters) {
  return {
    jobIds: Array.isArray(filters.jobIds) ? filters.jobIds : filters.jobId ? [filters.jobId] : [],
    clients: Array.isArray(filters.clients) ? filters.clients : [],
    cities: Array.isArray(filters.cities) ? filters.cities : [],
    eu: !!filters.eu,
    accommodation: !!filters.accommodation
  };
}

function normalizeCandidate(candidate) {
  const {
    id = "",
    name = "",
    phone = "",
    source = "",
    experience = "",
    whenStart = "",
    startDate = "",
    eu = false,
    jobId = "",
    positionId = "",
    stage = "new-lead",
    closedWonGroup = "",
    lastActivityAt = today(),
    added = "",
    note = "",
    tasks = []
  } = candidate;
  return {
    id,
    name,
    phone,
    source,
    experience,
    whenStart,
    startDate,
    eu: !!eu,
    jobId,
    positionId,
    stage: normalizeCandidateStage(stage),
    closedWonGroup: normalizeCandidateStage(stage) === "closed-won" ? closedWonGroup || "" : "",
    lastActivityAt,
    added,
    note,
    tasks: tasks.map((task) => normalizeTask(task))
  };
}

function normalizeCandidateStage(stage) {
  if (stage === "negotiation") return "negotiation-1";
  return stage;
}

function normalizeTask(task) {
  const normalized = { time: "", completedAt: "", ...task };
  if (normalized.done && !normalized.completedAt) {
    normalized.completedAt = `${normalized.due || today()}T${normalized.time || "00:00"}`;
  }
  if (!normalized.done) normalized.completedAt = "";
  return normalized;
}

function normalizePosition(position) {
  const normalized = {
    salary: "",
    eu: false,
    accommodation: false,
    food: false,
    url: "",
    note: "",
    openings: 1,
    openGroup: "",
    closedWonGroup: "",
    headlineOverrides: { city: null, client: null, job: null },
    ...position
  };
  return {
    ...normalized,
    openGroup: normalized.stage === "open" ? normalized.openGroup || "" : "",
    closedWonGroup: normalized.stage === "closed-won" ? normalized.closedWonGroup || "" : "",
    headlineOverrides: { city: null, client: null, job: null, ...(position.headlineOverrides || {}) }
  };
}

function applyAutomaticCandidateTasks(nextState) {
  return {
    ...nextState,
    candidates: (nextState.candidates || []).map((candidate) => {
      if (!automaticTaskStages.has(candidate.stage)) return candidate;
      if ((candidate.tasks || []).some((task) => !task.done)) return candidate;
      if (!isAtLeastDaysAgo(candidate.lastActivityAt, 2)) return candidate;
      return {
        ...candidate,
        tasks: [
          ...(candidate.tasks || []),
          { id: `auto-check-lead-${candidate.id}-${Date.now()}`, title: "Check lead", urgency: 3, due: today(), time: "", done: false, note: "" }
        ]
      };
    })
  };
}
