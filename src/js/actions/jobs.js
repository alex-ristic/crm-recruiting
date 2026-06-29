import { state, freshPositionDraft, setState, setStateQuiet } from "../state.js";
import { cleanJobName, headlinePart } from "../selectors.js";
import { slug } from "../utils/ids.js";
import { setPendingFocusSelector } from "../dom.js";

export function createJob() {
  if (!state.newJob.name.trim()) return;
  const job = { ...state.newJob, id: slug(state.newJob.name) + `-${Date.now()}` };
  setState({ jobs: [...state.jobs, job], newJob: { name: "", note: "" }, newPosition: { ...state.newPosition, jobId: job.id }, showJobComposer: false });
}

export function createPosition() {
  if (!state.newPosition.client.trim() && !state.newPosition.city.trim()) return;
  const name = state.newPosition.name.trim() || [cleanJobName(state.newPosition.jobId), state.newPosition.client, state.newPosition.city].filter(Boolean).join(" - ");
  const position = { ...state.newPosition, name, id: slug(name) + `-${Date.now()}`, stage: "open", openings: Number(state.newPosition.openings) || 1 };
  setState({ positions: [...state.positions, position], newPosition: freshPositionDraft(state.newPosition.jobId), showPositionComposer: false, selectedPositionId: position.id });
}

export function updateNewJob(event) {
  const key = event.target.dataset.newJob;
  setStateQuiet({ newJob: { ...state.newJob, [key]: event.target.value } });
}

export function updateNewPosition(event) {
  const key = event.target.dataset.newPosition;
  const value = event.target.type === "checkbox" ? event.target.checked : key === "openings" ? Number(event.target.value) : event.target.value;
  setStateQuiet({ newPosition: { ...state.newPosition, [key]: value } });
}

export function updatePositionFilter(event) {
  const key = event.target.dataset.positionFilter;
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  setState({ positionFilters: { ...state.positionFilters, [key]: value } });
}

export function togglePositionFilter(key) {
  setState({ openPositionFilter: state.openPositionFilter === key ? null : key });
}

export function updatePositionFilterSearch(event) {
  const key = event.target.dataset.positionFilterSearch;
  setPendingFocusSelector(`[data-position-filter-search="${key}"]`);
  setState({
    openPositionFilter: key,
    positionFilterSearch: { ...state.positionFilterSearch, [key]: event.target.value }
  });
}

export function updatePositionFilterOption(event) {
  const key = event.target.dataset.positionFilterOption;
  const value = event.target.dataset.positionFilterValue;
  const current = state.positionFilters[key] || [];
  const next = event.target.checked ? [...current, value] : current.filter((item) => item !== value);
  setState({ openPositionFilter: key, positionFilters: { ...state.positionFilters, [key]: next } });
}

export function toggleHeadlinePart(event) {
  const [positionId, key] = event.currentTarget.dataset.toggleHeadlinePart.split(":");
  const position = state.positions.find((item) => item.id === positionId);
  if (!position) return;
  const manual = position.headlineOverrides?.[key] !== null && position.headlineOverrides?.[key] !== undefined;
  const nextValue = manual ? null : headlinePart(position, key);
  setState({
    positions: state.positions.map((item) => item.id === positionId ? {
      ...item,
      headlineOverrides: { city: null, client: null, job: null, ...(item.headlineOverrides || {}), [key]: nextValue }
    } : item)
  });
}

export function updateHeadlinePart(event) {
  const [positionId, key] = event.target.dataset.headlinePart.split(":");
  setPendingFocusSelector(`[data-headline-part="${positionId}:${key}"]`);
  const value = event.target.value;
  setState({
    positions: state.positions.map((item) => item.id === positionId ? {
      ...item,
      headlineOverrides: { city: null, client: null, job: null, ...(item.headlineOverrides || {}), [key]: value }
    } : item)
  });
}

export function clearPositionFilters() {
  setState({
    openPositionFilter: null,
    positionFilterSearch: { jobIds: "", clients: "", cities: "" },
    positionFilters: { jobIds: [], clients: [], cities: [], eu: false, accommodation: false }
  });
}

export function updateJob(event) {
  const [id, key] = event.target.dataset.jobField.split(":");
  setStateQuiet({ jobs: state.jobs.map((job) => job.id === id ? { ...job, [key]: event.target.value } : job) });
}

export function updatePosition(event) {
  const [id, key] = event.target.dataset.positionField.split(":");
  const value = event.target.type === "checkbox" ? event.target.checked : key === "openings" ? Number(event.target.value) : event.target.value;
  const oldPosition = state.positions.find((position) => position.id === id);
  let patch = { positions: state.positions.map((position) => position.id === id ? { ...position, [key]: value } : position) };
  if (key === "stage" && value !== "open" && oldPosition && oldPosition.stage !== "open") {
    patch = {
      ...patch,
      candidates: state.candidates.map((candidate) => candidate.positionId === id && candidate.stage === oldPosition.stage ? { ...candidate, stage: value } : candidate)
    };
  }
  if (event.type === "input" && !["stage", "jobId", "eu", "accommodation", "food"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

export function deleteJob(jobId) {
  const remainingJobs = state.jobs.filter((job) => job.id !== jobId);
  const fallbackJobId = remainingJobs[0]?.id || "";
  setState({
    jobs: remainingJobs,
    positions: state.positions.map((position) => position.jobId === jobId ? { ...position, jobId: fallbackJobId } : position),
    candidates: state.candidates.map((candidate) => candidate.jobId === jobId ? { ...candidate, jobId: fallbackJobId } : candidate),
    newPosition: { ...state.newPosition, jobId: state.newPosition.jobId === jobId ? fallbackJobId : state.newPosition.jobId }
  });
}

export function deletePosition(positionId) {
  setState({
    positions: state.positions.filter((position) => position.id !== positionId),
    candidates: state.candidates.map((candidate) => candidate.positionId === positionId ? { ...candidate, positionId: "" } : candidate),
    selectedPositionId: null,
    newPosition: state.newPosition
  });
}

export function movePositionToStage(positionId, stage) {
  const oldPosition = state.positions.find((position) => position.id === positionId);
  let patch = { positions: state.positions.map((position) => position.id === positionId ? { ...position, stage } : position) };
  if (stage !== "open" && oldPosition && oldPosition.stage !== "open") {
    patch = {
      ...patch,
      candidates: state.candidates.map((candidate) => candidate.positionId === positionId && candidate.stage === oldPosition.stage ? { ...candidate, stage } : candidate)
    };
  }
  setState(patch);
}
