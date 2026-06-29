const storageKey = "recruiting-crm-state-v4";
const serverStateUrl = "/api/state";
const today = () => new Date().toISOString().slice(0, 10);

const candidateStages = [
  ["new-lead", "New Lead", "#0052ff"],
  ["in-work", "In Work", "#d97706"],
  ["negotiation", "Negotiation", "#7c3aed"],
  ["good-to-place", "Good to Place", "#0891b2"],
  ["sent", "Sent", "#2563eb"],
  ["trial-starting", "Trial Starting", "#ca8a04"],
  ["trial", "Trial", "#eab308"],
  ["closed-won", "Closed Won", "#16a34a"],
  ["closed-lost", "Closed Lost", "#dc2626"],
  ["disqualified", "Disqualified", "#64748b"]
];

const positionStages = [
  ["open", "Open", "#0052ff"],
  ["sent", "Sent", "#2563eb"],
  ["trial-starting", "Trial Starting", "#ca8a04"],
  ["trial", "Trial", "#eab308"],
  ["closed-won", "Closed Won", "#16a34a"],
  ["closed-lost", "Closed Lost", "#dc2626"]
];

const linkedStageMap = {
  sent: "sent",
  "trial-starting": "trial-starting",
  trial: "trial",
  "closed-won": "closed-won",
  "closed-lost": "closed-lost"
};

const defaultJobs = [
  { id: "konobar-hr", name: "Konobar HR", note: "Konobari i konobarice za Hrvatsku" },
  { id: "kuvar-hr", name: "Kuvar HR", note: "Kuvari i mladji kuvari za Hrvatsku" },
  { id: "pomocni-kuvar-hr", name: "Pomocni kuvar HR", note: "Pomocni kuvari i rad u kuhinji" },
  { id: "sanker-hr", name: "Sanker HR", note: "Sankeri za Hrvatsku" },
  { id: "sudovi-hr", name: "Sudovi / pomocni HR", note: "Pranje sudova i pomocni radnici" }
];

const defaultPositions = [
  { id: "kuvar-brod-andis-star", name: "Kuvar na brodu - Andis Star", jobId: "kuvar-hr", client: "Andis Star brod", city: "Dalmacija", salary: "3,000 EUR", eu: true, accommodation: false, food: false, note: "Kuvar na brodu sa EU papirima.", stage: "open", openings: 1 },
  { id: "sanker-deni-melita", name: "Sanker - Deni Melita", jobId: "sanker-hr", client: "Deni Melita", city: "Tribulj, Vodice", salary: "1,600 EUR", eu: true, accommodation: false, food: false, note: "SVE, EU.", stage: "open", openings: 1 },
  { id: "konobarice-deni-melita", name: "Konobarice - Deni Melita", jobId: "konobar-hr", client: "Deni Melita", city: "Tribulj, Vodice", salary: "1,500-1,700 EUR", eu: true, accommodation: false, food: false, note: "SVE, EU.", stage: "open", openings: 2 },
  { id: "kuvar-deni-melita", name: "Kuvar - Deni Melita", jobId: "kuvar-hr", client: "Deni Melita", city: "Tribulj, Vodice", salary: "2,500 EUR pocetna", eu: true, accommodation: false, food: false, note: "SVE, EU.", stage: "open", openings: 1 },
  { id: "sudovi-mladen-zadar", name: "Sudovi / pomocne osobe - Mladen", jobId: "sudovi-hr", client: "Mladen", city: "Zadar", salary: "1,500 EUR", eu: false, accommodation: false, food: false, note: "4 osobe za sudove / pomocne.", stage: "open", openings: 4 },
  { id: "kuvar-mladen-zadar", name: "Kuvar - Mladen", jobId: "kuvar-hr", client: "Mladen", city: "Zadar", salary: "2,500+ EUR", eu: false, accommodation: false, food: false, note: "", stage: "open", openings: 1 },
  { id: "sudovi-matija-kredencia", name: "Sudovi - Matija Kredencia", jobId: "sudovi-hr", client: "Matija Kredencia", city: "", salary: "1,400 EUR", eu: true, accommodation: false, food: false, note: "EU.", stage: "open", openings: 1 },
  { id: "konobarice-matija-kredencia", name: "Konobarice - Matija Kredencia", jobId: "konobar-hr", client: "Matija Kredencia", city: "", salary: "1,500 EUR / 1,700 EUR povisica", eu: true, accommodation: false, food: false, note: "EU. Potrebno 1-2 konobarice.", stage: "open", openings: 2 },
  { id: "pomocni-kuvar-matija-kredencia", name: "Pomocni kuvar - Matija Kredencia", jobId: "pomocni-kuvar-hr", client: "Matija Kredencia", city: "", salary: "1,800-2,500 EUR", eu: true, accommodation: false, food: false, note: "1 slobodan dan / 8h. Mladji kuvar, a la carte, moderniji. Nije problem ako nema puno iskustva, ali da je mastovit i talentovan. Poslat klinac.", stage: "open", openings: 1 },
  { id: "pomocni-tabo-marina", name: "Pomocni radnik - Tabo Marina", jobId: "pomocni-kuvar-hr", client: "Tabo Marina", city: "Dalmacija blizu Trogira", salary: "1,600-2,000 EUR", eu: true, accommodation: true, food: true, note: "Smestaj soba, 1 obrok.", stage: "open", openings: 1 }
];

const seedCandidates = [];

const placeholderPositionIds = new Set(["kuvar-momento", "konobar-adria", "kuvar-miramar", "sobarica-alpine"]);
const placeholderCandidateIds = new Set(["maya", "tomas", "aisha", "sofia", "noah", "marco"]);

const defaultState = {
  activeTab: "positions",
  selectedId: null,
  selectedPositionId: null,
  search: "",
  positionFilters: { jobIds: [], clients: [], cities: [], eu: false, accommodation: false },
  openPositionFilter: null,
  positionFilterSearch: { jobIds: "", clients: "", cities: "" },
  collapsedCandidateGroups: {},
  showJobComposer: false,
  showPositionComposer: false,
  jobs: defaultJobs,
  positions: defaultPositions,
  candidates: seedCandidates,
  newTask: { title: "", urgency: 2, due: today(), time: "" },
  newJob: { name: "", note: "" },
  newPosition: { name: "", jobId: "kuvar-hr", client: "", city: "", salary: "", eu: false, accommodation: false, food: false, note: "", openings: 1 }
};

let state = structuredClone(defaultState);
const app = document.querySelector("#app");
let pointerDrag = null;
let suppressClick = null;
let pendingFocusSelector = null;
let pendingScrollSnapshot = null;

async function loadState() {
  const serverState = await loadServerState();
  if (serverState) return hydrateState(serverState);
  const stored = localStorage.getItem(storageKey);
  if (!stored) return structuredClone(defaultState);
  try {
    return hydrateState(JSON.parse(stored));
  } catch {
    return structuredClone(defaultState);
  }
}

async function loadServerState() {
  if (!window.location.protocol.startsWith("http")) return null;
  try {
    const response = await fetch(serverStateUrl, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.state || null;
  } catch {
    return null;
  }
}

function hydrateState(parsed) {
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
  return {
    ...structuredClone(defaultState),
    ...parsed,
    selectedPositionId: null,
    showJobComposer: false,
    showPositionComposer: false,
    positionFilters,
    openPositionFilter: null,
    positionFilterSearch: { jobIds: "", clients: "", cities: "" },
    collapsedCandidateGroups: parsed.collapsedCandidateGroups || {},
    jobs,
    positions,
    candidates,
    newTask: { title: "", urgency: 2, due: today(), time: "" },
    newJob: { name: "", note: "" },
    newPosition: freshPositionDraft(jobs[0]?.id || "kuvar-hr")
  };
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
  return {
    positionId: "",
    ...candidate,
    tasks: (candidate.tasks || []).map((task) => normalizeTask(task))
  };
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
    headlineOverrides: { city: null, client: null, job: null },
    ...position
  };
  return {
    ...normalized,
    headlineOverrides: { city: null, client: null, job: null, ...(position.headlineOverrides || {}) }
  };
}

function freshPositionDraft(jobId = "kuvar-hr") {
  return { name: "", jobId, client: "", city: "", salary: "", url: "", eu: false, accommodation: false, food: false, note: "", openings: 1, headlineOverrides: { city: null, client: null, job: null } };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (!window.location.protocol.startsWith("http")) return;
  fetch(serverStateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  }).catch(() => {});
}

function setState(patch) {
  pendingScrollSnapshot = captureScrollState();
  state = { ...state, ...patch };
  saveState();
  render();
}

function setStateQuiet(patch) {
  state = { ...state, ...patch };
  saveState();
}

function icon(name) {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.11 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M16 11V7a4 4 0 0 0-7.5-2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function jobName(id) {
  return state.jobs.find((job) => job.id === id)?.name || "No job";
}

function positionName(id) {
  const position = state.positions.find((item) => item.id === id);
  return position ? positionCardTitle(position) : "No position";
}

function stageMeta(id, collection = candidateStages) {
  const stage = collection.find(([stageId]) => stageId === id);
  return { id: stage?.[0] || collection[0][0], name: stage?.[1] || collection[0][1], color: stage?.[2] || collection[0][2] };
}

function visibleCandidates() {
  const q = state.search.trim().toLowerCase();
  if (!q || state.activeTab !== "candidates") return state.candidates;
  return state.candidates.filter((candidate) =>
    [candidate.name, candidate.phone, candidate.source, jobName(candidate.jobId), positionName(candidate.positionId)]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

function visiblePositions() {
  return state.positions.filter((position) => {
    const q = state.search.trim().toLowerCase();
    if (q && state.activeTab === "positions") {
      const haystack = [positionCardTitle(position), jobName(position.jobId), position.client, position.city, position.salary, position.url, position.note]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (state.positionFilters.jobIds.length && !state.positionFilters.jobIds.includes(position.jobId)) return false;
    if (state.positionFilters.clients.length && !state.positionFilters.clients.includes(position.client || "")) return false;
    if (state.positionFilters.cities.length && !state.positionFilters.cities.includes(position.city || "")) return false;
    if (state.positionFilters.eu && !position.eu) return false;
    if (state.positionFilters.accommodation && !position.accommodation) return false;
    return true;
  });
}

function uniquePositionValues(key) {
  return [...new Set(state.positions.map((position) => position[key] || "").filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function positionCardTitle(position) {
  return [headlinePart(position, "city"), headlinePart(position, "client"), headlinePart(position, "job")]
    .filter(Boolean)
    .join(" - ");
}

function headlinePart(position, key) {
  const override = position.headlineOverrides?.[key];
  if (override !== null && override !== undefined) return override.trim() || fallbackHeadlinePart(position, key);
  return fallbackHeadlinePart(position, key);
}

function headlineInputValue(position, key) {
  const override = position.headlineOverrides?.[key];
  return override !== null && override !== undefined ? override : fallbackHeadlinePart(position, key);
}

function fallbackHeadlinePart(position, key) {
  if (key === "city") return position.city || "No city";
  if (key === "client") return position.client || "No client";
  if (key === "job") return cleanJobName(position.jobId);
  return "";
}

function cleanJobName(jobId) {
  return jobName(jobId).replace(/\s+HR$/i, "");
}

function positionSalaryLine(position) {
  return [
    position.salary || "No salary",
    position.eu ? "EU" : "No EU",
    position.accommodation ? "Acc" : "",
    position.food ? "Food" : ""
  ].filter(Boolean).join(" - ");
}

function render() {
  const selected = state.candidates.find((candidate) => candidate.id === state.selectedId);
  const selectedPosition = state.positions.find((position) => position.id === state.selectedPositionId);
  app.innerHTML = `
    <div class="crm-shell">
      ${renderRail()}
      <main class="workspace">
        ${renderTopbar()}
        ${renderCurrentTab()}
      </main>
      ${selected && state.activeTab === "candidates" ? renderCandidateModal(selected) : ""}
      ${selectedPosition && state.activeTab === "positions" ? renderPositionModal(selectedPosition) : ""}
    </div>
  `;
  bindEvents();
  restorePendingFocus();
  restoreScrollState();
}

function renderCurrentTab() {
  if (state.activeTab === "positions") return renderPositionsBoard();
  if (state.activeTab === "jobs") return renderJobs();
  return renderCandidatesBoard();
}

function renderRail() {
  const item = (tab, iconName) => `<button class="rail-item ${state.activeTab === tab ? "active" : ""}" data-tab="${tab}" title="${tab}">${icon(iconName)}</button>`;
  return `
    <aside class="rail">
      <div class="logo">R</div>
      <div class="rail-stack">
        <button class="rail-item" title="Dashboard">${icon("grid")}</button>
        ${item("candidates", "users")}
        ${item("jobs", "tag")}
        ${item("positions", "briefcase")}
        <button class="rail-item" title="Reports">${icon("chart")}</button>
      </div>
    </aside>
  `;
}

function renderTopbar() {
  const copy = {
    candidates: ["Candidates", `${state.candidates.length} total - ${candidateStages.length} stages`, "Search candidates...", "candidate", false],
    jobs: ["Jobs", `${state.jobs.length} manually managed jobs`, "Search jobs...", "job", state.showJobComposer],
    positions: ["Positions", `${state.positions.length} concrete openings - ${positionStages.length} stages`, "Search positions...", "position", state.showPositionComposer]
  }[state.activeTab];
  return `
    <header class="topbar">
      <div class="title-group">
        <h1>${copy[0]}</h1>
        <p>${copy[1]}</p>
      </div>
      <label class="search-box">
        ${icon("search")}
        <input data-search value="${escapeAttr(state.search)}" placeholder="${copy[2]}" />
      </label>
      <button class="primary-button" data-add="${copy[3]}">${copy[4] ? icon("x") : icon("plus")} ${copy[4] ? "Close" : `Add ${copy[3]}`}</button>
    </header>
  `;
}

function renderCandidatesBoard() {
  const candidates = visibleCandidates();
  return `
    <section class="board-wrap">
      <div class="board" data-board>
        ${candidateStages.map(([id, label, color]) => renderCandidateStage(id, label, color, candidates)).join("")}
      </div>
    </section>
  `;
}

function renderCandidateStage(id, label, color, candidates) {
  const stageCandidates = candidates.filter((candidate) => candidate.stage === id);
  return `
    <section class="stage-column">
      <div class="stage-title">
        <span class="dot" style="background:${color}"></span>
        <span>${label}</span>
        <b>${stageCandidates.length}</b>
      </div>
      <div class="stage-list" data-drop-type="candidate" data-drop-stage="${id}">
        ${renderCandidateGroups(id, stageCandidates, color)}
      </div>
    </section>
  `;
}

function renderCandidateGroups(stageId, candidates, color) {
  if (!candidates.length) return `<div class="empty-stage">No candidates</div>`;
  const groups = isPlacementGroupedStage(stageId) ? placementCandidateGroups(candidates) : jobCandidateGroups(candidates);
  return groups.map((group) => {
    const key = `${stageId}:${group.id}`;
    const collapsed = !!state.collapsedCandidateGroups[key];
    return `
      <div class="job-group">
        <button class="job-group-head" data-toggle-candidate-group="${escapeAttr(key)}">
          <span class="chevron">${collapsed ? "›" : "⌄"}</span>
          <strong>${escapeHtml(group.name)}</strong>
          <em>${group.candidates.length}</em>
        </button>
        ${collapsed ? "" : `<div class="job-group-list">${group.candidates.map((candidate) => renderCandidateCard(candidate, color, stageId)).join("")}</div>`}
      </div>
    `;
  }).join("");
}

function isPlacementGroupedStage(stageId) {
  return ["sent", "trial-starting", "trial", "closed-won"].includes(stageId);
}

function jobCandidateGroups(candidates) {
  const groups = state.jobs
    .map((job) => ({ id: job.id, name: job.name, candidates: candidates.filter((candidate) => candidate.jobId === job.id) }))
    .filter((group) => group.candidates.length);
  const unassigned = candidates.filter((candidate) => !state.jobs.some((job) => job.id === candidate.jobId));
  if (unassigned.length) groups.push({ id: "unassigned", name: "No job", candidates: unassigned });
  return groups;
}

function placementCandidateGroups(candidates) {
  const groups = new Map();
  candidates.forEach((candidate) => {
    const position = state.positions.find((item) => item.id === candidate.positionId);
    const client = position?.client || "No client";
    const city = position?.city || "No city";
    const id = position ? `${client}::${city}` : "unassigned-placement";
    const name = position ? `${client} - ${city}` : "No linked position";
    if (!groups.has(id)) groups.set(id, { id, name, candidates: [] });
    groups.get(id).candidates.push(candidate);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderCandidateCard(candidate, color, stageId) {
  return `
    <button class="candidate-card ${candidate.id === state.selectedId ? "selected" : ""}" data-open-candidate="${candidate.id}" draggable="true" data-drag-type="candidate" data-drag-id="${candidate.id}">
      <div class="card-row">
        <span class="avatar" style="--accent:${color}">${initials(candidate.name)}</span>
        <span class="card-name">${candidate.name}</span>
      </div>
      <div class="card-meta">${candidate.phone || "No phone number"}</div>
      ${isPlacementGroupedStage(stageId) ? `<div class="card-sub">${jobName(candidate.jobId)}</div>` : ""}
    </button>
  `;
}

function renderPositionsBoard() {
  return `
    <section class="board-wrap positions-wrap">
      ${renderPositionFilters()}
      ${state.showPositionComposer ? renderPositionComposer() : ""}
      <div class="board ${state.showPositionComposer ? "positions-board with-composer" : "positions-board"}" data-board>
        ${positionStages.map(([id, label, color]) => renderPositionStage(id, label, color)).join("")}
      </div>
    </section>
  `;
}

function renderPositionFilters() {
  return `
    <div class="position-filters">
      ${renderMultiFilter("jobIds", "Jobs", state.jobs.map((job) => ({ value: job.id, label: job.name })))}
      ${renderMultiFilter("clients", "Clients", uniquePositionValues("client").map((value) => ({ value, label: value })))}
      ${renderMultiFilter("cities", "Cities", uniquePositionValues("city").map((value) => ({ value, label: value })))}
      <label class="filter-check">
        <input data-position-filter="eu" type="checkbox" ${state.positionFilters.eu ? "checked" : ""} />
        EU papers
      </label>
      <label class="filter-check">
        <input data-position-filter="accommodation" type="checkbox" ${state.positionFilters.accommodation ? "checked" : ""} />
        Accommodation
      </label>
      <button class="filter-clear" data-clear-position-filters>Clear</button>
    </div>
  `;
}

function renderMultiFilter(key, label, options) {
  const selected = state.positionFilters[key] || [];
  const search = state.positionFilterSearch[key] || "";
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()));
  const summary = selected.length ? `${selected.length} selected` : `All ${label.toLowerCase()}`;
  const open = state.openPositionFilter === key;
  return `
    <div class="multi-filter ${open ? "open" : ""}">
      <button class="filter-trigger" data-toggle-position-filter="${key}">
        <span>${label}</span>
        <strong>${summary}</strong>
      </button>
      ${open ? `
        <div class="filter-menu">
          <input class="filter-search" data-position-filter-search="${key}" value="${escapeAttr(search)}" placeholder="Search ${label.toLowerCase()}..." />
          <div class="filter-options">
            ${visibleOptions.map((option) => `
              <label class="filter-option">
                <input data-position-filter-option="${key}" data-position-filter-value="${escapeAttr(option.value)}" type="checkbox" ${selected.includes(option.value) ? "checked" : ""} />
                <span>${escapeHtml(option.label)}</span>
              </label>
            `).join("") || `<div class="filter-empty">No matches</div>`}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function renderPositionComposer() {
  return `
    <div class="position-composer inline-composer">
      <select data-new-position="jobId">${state.jobs.map((job) => `<option value="${job.id}" ${state.newPosition.jobId === job.id ? "selected" : ""}>${job.name}</option>`).join("")}</select>
      <input data-new-position="client" value="${escapeAttr(state.newPosition.client)}" placeholder="Client" />
      <input data-new-position="city" value="${escapeAttr(state.newPosition.city)}" placeholder="City" />
      <input data-new-position="salary" value="${escapeAttr(state.newPosition.salary)}" placeholder="Salary" />
      <input data-new-position="url" value="${escapeAttr(state.newPosition.url)}" placeholder="Restaurant URL" />
      <label class="composer-check"><input data-new-position="eu" type="checkbox" ${state.newPosition.eu ? "checked" : ""} /> EU</label>
      <label class="composer-check"><input data-new-position="accommodation" type="checkbox" ${state.newPosition.accommodation ? "checked" : ""} /> Accommodation</label>
      <label class="composer-check"><input data-new-position="food" type="checkbox" ${state.newPosition.food ? "checked" : ""} /> Food</label>
      <input data-new-position="openings" type="number" min="1" value="${state.newPosition.openings}" />
      <button class="primary-button compact" data-create-position>${icon("plus")} Add</button>
    </div>
  `;
}

function renderPositionStage(id, label, color) {
  const positions = visiblePositions().filter((position) => position.stage === id);
  return `
    <section class="stage-column">
      <div class="stage-title">
        <span class="dot" style="background:${color}"></span>
        <span>${label}</span>
        <b>${positions.length}</b>
      </div>
      <div class="stage-list" data-drop-type="position" data-drop-stage="${id}">
        ${positions.map((position) => renderPositionCard(position, color)).join("") || `<div class="empty-stage">No positions</div>`}
      </div>
    </section>
  `;
}

function renderPositionCard(position, color) {
  const linkedCandidates = state.candidates.filter((candidate) => candidate.positionId === position.id);
  return `
    <article class="candidate-card position-board-card" data-open-position="${position.id}" draggable="true" data-drag-type="position" data-drag-id="${position.id}">
      <div class="card-row">
        <span class="avatar square-avatar" style="--accent:${color}">${icon("briefcase")}</span>
        <span class="card-name">${positionCardTitle(position)}</span>
        <span class="drag-grip" aria-hidden="true"></span>
      </div>
      <div class="card-meta">${jobName(position.jobId)}</div>
      <div class="card-sub">${position.client || "No client"} - ${position.city || "No city"}</div>
      <div class="card-sub">${positionSalaryLine(position)}</div>
      <div class="card-sub">${linkedCandidates.length} linked candidate${linkedCandidates.length === 1 ? "" : "s"} - ${position.openings} opening${position.openings === 1 ? "" : "s"}</div>
    </article>
  `;
}

function renderJobs() {
  const q = state.search.trim().toLowerCase();
  const jobs = q ? state.jobs.filter((job) => [job.name, job.note].join(" ").toLowerCase().includes(q)) : state.jobs;
  return `
    <section class="positions-page">
      ${state.showJobComposer ? `<div class="position-composer">
        <input data-new-job="name" value="${escapeAttr(state.newJob.name)}" placeholder="Job name, e.g. Konobar HR" />
        <input data-new-job="note" value="${escapeAttr(state.newJob.note)}" placeholder="Short note" />
        <button class="primary-button compact" data-create-job>${icon("plus")} Add</button>
      </div>` : ""}
      <div class="positions-grid">
        ${jobs.map((job) => `
          <article class="position-card">
            <div class="position-icon">${icon("tag")}</div>
            <div>
              <div class="position-card-head">
                <input class="position-name" data-job-field="${job.id}:name" value="${escapeAttr(job.name)}" />
                <button class="tiny-danger" data-delete-job="${job.id}" title="Delete job">${icon("x")}</button>
              </div>
              <input class="muted-inline-input" data-job-field="${job.id}:note" value="${escapeAttr(job.note || "")}" placeholder="No note" />
              <span>${state.positions.filter((position) => position.jobId === job.id).length} positions - ${state.candidates.filter((candidate) => candidate.jobId === job.id).length} candidates</span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCandidateModal(candidate) {
  const meta = stageMeta(candidate.stage, candidateStages);
  const sortedTasks = [...candidate.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done && b.done) return `${b.completedAt || ""}`.localeCompare(`${a.completedAt || ""}`);
    return `${a.due || ""} ${a.time || ""}`.localeCompare(`${b.due || ""} ${b.time || ""}`);
  });
  const openCount = candidate.tasks.filter((task) => !task.done).length;
  return `
    <div class="overlay" data-modal-overlay="candidate">
      <article class="candidate-modal">
        <div class="modal-bar">
          ${icon("users")} <span>Candidates</span><span class="crumb">›</span><strong>${candidate.name}</strong>
          <select class="stage-pill" data-candidate-field="${candidate.id}:stage" style="--stage:${meta.color}">
            ${candidateStages.map(([id, label]) => `<option value="${id}" ${candidate.stage === id ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <button class="next-stage-button" data-next-candidate-stage="${candidate.id}">Move to next stage</button>
          <button class="danger-button" data-delete-candidate="${candidate.id}">Delete</button>
          <button class="icon-button" data-close-modal>${icon("x")}</button>
        </div>
        <div class="modal-body">
          <div class="profile-head">
            <span class="profile-avatar" style="--accent:${meta.color}">${initials(candidate.name)}</span>
            <div>
              <input class="profile-name" data-candidate-field="${candidate.id}:name" value="${escapeAttr(candidate.name)}" />
              <p>${jobName(candidate.jobId)} - ${positionName(candidate.positionId)} - ${candidate.added}</p>
            </div>
          </div>
          <div class="fields">
            ${field(candidate, "name", "Name", "users")}
            ${field(candidate, "phone", "Phone number", "phone")}
            ${field(candidate, "source", "Source", "link")}
            <div class="field-row">
              <span>${icon("tag")}</span><label>Job</label>
              <select data-candidate-field="${candidate.id}:jobId">
                ${state.jobs.map((job) => `<option value="${job.id}" ${candidate.jobId === job.id ? "selected" : ""}>${job.name}</option>`).join("")}
              </select>
            </div>
            <div class="field-row">
              <span>${icon("briefcase")}</span><label>Position</label>
              <select data-candidate-field="${candidate.id}:positionId">
                <option value="" ${candidate.positionId ? "" : "selected"}>No position</option>
                ${state.positions.map((position) => `<option value="${position.id}" ${candidate.positionId === position.id ? "selected" : ""}>${escapeHtml(positionCardTitle(position))}</option>`).join("")}
              </select>
            </div>
          </div>
          <label class="candidate-note">
            <span>${icon("flag")} Candidate note</span>
            <textarea data-candidate-field="${candidate.id}:note" placeholder="Write an overarching comment for this candidate...">${escapeHtml(candidate.note)}</textarea>
          </label>
          <div class="task-heading">
            <h2>Tasks</h2><span>${openCount} open</span>
          </div>
          ${renderTaskComposer(candidate)}
          <div class="tasks">
            ${sortedTasks.map((task) => renderTask(candidate, task)).join("") || `<div class="empty-tasks">No tasks yet. Add the next action above.</div>`}
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderPositionModal(position) {
  const meta = stageMeta(position.stage, positionStages);
  const linkedCandidates = state.candidates.filter((candidate) => candidate.positionId === position.id);
  const title = positionCardTitle(position);
  return `
    <div class="overlay" data-modal-overlay="position">
      <article class="candidate-modal">
        <div class="modal-bar">
          ${icon("briefcase")} <span>Positions</span><span class="crumb">›</span><strong>${title}</strong>
          <select class="stage-pill" data-position-field="${position.id}:stage" style="--stage:${meta.color}">
            ${positionStages.map(([id, label]) => `<option value="${id}" ${position.stage === id ? "selected" : ""}>${label}</option>`).join("")}
          </select>
          <button class="danger-button" data-delete-position="${position.id}">Delete</button>
          <button class="icon-button" data-close-position-modal>${icon("x")}</button>
        </div>
        <div class="modal-body">
          <div class="profile-head">
            <span class="profile-avatar square-profile-avatar" style="--accent:${meta.color}">${icon("briefcase")}</span>
            <div>
              <h2 class="profile-title">${title}</h2>
              <p>${jobName(position.jobId)} - ${position.client || "No client"} - ${position.city || "No city"}</p>
            </div>
          </div>
          ${renderHeadlineControls(position)}
          <div class="fields">
            <div class="field-row">
              <span>${icon("tag")}</span><label>Job</label>
              <select data-position-field="${position.id}:jobId">
                ${state.jobs.map((job) => `<option value="${job.id}" ${position.jobId === job.id ? "selected" : ""}>${job.name}</option>`).join("")}
              </select>
            </div>
            ${positionTextField(position, "client", "Client", "users")}
            ${positionTextField(position, "city", "City", "link")}
            ${positionTextField(position, "salary", "Salary", "flag")}
            ${positionTextField(position, "url", "URL", "link")}
            <div class="field-row">
              <span>${icon("check")}</span><label>EU papers</label>
              <input class="field-checkbox" data-position-field="${position.id}:eu" type="checkbox" ${position.eu ? "checked" : ""} />
            </div>
            <div class="field-row">
              <span>${icon("check")}</span><label>Accommodation</label>
              <input class="field-checkbox" data-position-field="${position.id}:accommodation" type="checkbox" ${position.accommodation ? "checked" : ""} />
            </div>
            <div class="field-row">
              <span>${icon("check")}</span><label>Food</label>
              <input class="field-checkbox" data-position-field="${position.id}:food" type="checkbox" ${position.food ? "checked" : ""} />
            </div>
          </div>
          <label class="candidate-note">
            <span>${icon("flag")} Position notes</span>
            <textarea data-position-field="${position.id}:note" placeholder="Add position notes...">${escapeHtml(position.note || "")}</textarea>
          </label>
          <div class="task-heading">
            <h2>Linked candidates</h2><span>${linkedCandidates.length} total</span>
          </div>
          <div class="linked-list">
            ${linkedCandidates.map((candidate) => `<button class="linked-row" data-open-candidate-from-position="${candidate.id}"><span>${initials(candidate.name)}</span><strong>${candidate.name}</strong><em>${stageMeta(candidate.stage, candidateStages).name}</em></button>`).join("") || `<div class="empty-tasks">No candidates linked to this position.</div>`}
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderHeadlineControls(position) {
  return `
    <div class="headline-controls">
      ${renderHeadlineControl(position, "city", "City")}
      ${renderHeadlineControl(position, "client", "Client")}
      ${renderHeadlineControl(position, "job", "Job")}
    </div>
  `;
}

function renderHeadlineControl(position, key, label) {
  const manual = position.headlineOverrides?.[key] !== null && position.headlineOverrides?.[key] !== undefined;
  return `
    <label class="headline-control ${manual ? "manual" : ""}">
      <button type="button" class="headline-lock" data-toggle-headline-part="${position.id}:${key}" title="${manual ? "Use linked field" : "Unlock manual headline text"}">${icon(manual ? "unlock" : "lock")}</button>
      <span>${label}</span>
      <input data-headline-part="${position.id}:${key}" value="${escapeAttr(headlineInputValue(position, key))}" ${manual ? "" : "disabled"} />
    </label>
  `;
}

function positionTextField(position, key, label, iconName) {
  return `
    <div class="field-row">
      <span>${icon(iconName)}</span><label>${label}</label>
      <input data-position-field="${position.id}:${key}" value="${escapeAttr(position[key] || "")}" />
    </div>
  `;
}

function field(candidate, key, label, iconName) {
  return `
    <div class="field-row">
      <span>${icon(iconName)}</span><label>${label}</label>
      <input data-candidate-field="${candidate.id}:${key}" value="${escapeAttr(candidate[key])}" />
    </div>
  `;
}

function renderTaskComposer(candidate) {
  return `
    <div class="task-composer">
      <label class="task-title-input">${icon("plus")}<input data-new-task-title value="${escapeAttr(state.newTask.title)}" placeholder="Add a task - click and type here..." /></label>
      <div class="task-controls">
        <div class="urgency-set">
          <span>Urgency</span>
          ${[1, 2, 3, 4].map((n) => `<button class="urgency-choice ${state.newTask.urgency === n ? `u${n}` : ""}" data-new-urgency="${n}">${n}</button>`).join("")}
        </div>
        <label class="date-input">${icon("calendar")}<input data-new-task-date type="date" value="${state.newTask.due}" /></label>
        <label class="date-input">${icon("calendar")}<input data-new-task-time type="time" value="${state.newTask.time || ""}" /></label>
        ${state.newTask.time ? `<button class="clear-time-button" data-clear-new-task-time>Clear time</button>` : ""}
        <button class="primary-button compact" data-add-task="${candidate.id}">${icon("plus")} Add task</button>
      </div>
    </div>
  `;
}

function renderTask(candidate, task) {
  return `
    <article class="task-card ${task.done ? "done" : ""}">
      <button class="complete-toggle" data-toggle-task="${candidate.id}:${task.id}" title="Complete task">${task.done ? icon("check") : ""}</button>
      <div class="task-main">
        <div class="task-title-row">
          <input class="task-title" data-task-field="${candidate.id}:${task.id}:title" value="${escapeAttr(task.title)}" />
          ${task.done ? `<span class="completed-at">${formatCompletedAt(task.completedAt)}</span>` : ""}
          <button class="tiny-danger" data-delete-task="${candidate.id}:${task.id}" title="Delete task">${icon("x")}</button>
        </div>
        <div class="task-meta-row">
          <label class="task-chip urgency-chip u${task.urgency}">${icon("flag")} U<select data-task-field="${candidate.id}:${task.id}:urgency">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${task.urgency === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="task-chip">${icon("calendar")}<input type="date" data-task-field="${candidate.id}:${task.id}:due" value="${task.due}" /></label>
          <label class="task-chip">${icon("calendar")}<input type="time" data-task-field="${candidate.id}:${task.id}:time" value="${task.time || ""}" /></label>
          ${task.time ? `<button class="task-chip clear-chip" data-clear-task-time="${candidate.id}:${task.id}">Clear time</button>` : ""}
        </div>
        <textarea class="task-note" data-task-field="${candidate.id}:${task.id}:note" placeholder="Task comment - click and type here...">${escapeHtml(task.note || "")}</textarea>
        <div class="quick-actions">
          ${quickButton("no-answer", "No answer")}
          ${quickButton("interested", "Interested")}
          ${quickButton("not-interested", "Not interested")}
          ${quickButton("busy", "Busy")}
          ${quickButton("disqualify", "Disqualify")}
          ${quickButton("no-call-dq", "No call - DQ")}
          <span class="quick-divider"></span>
          ${quickButton("good-to-place", "Good to place")}
        </div>
      </div>
    </article>
  `.replaceAll('data-action="', `data-action="${candidate.id}:${task.id}:`);
}

function quickButton(action, label) {
  return `<button class="quick ${action}" data-action="${action}">${label}</button>`;
}

function completionTimestamp() {
  return new Date().toISOString();
}

function formatCompletedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function bindEvents() {
  app.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => setState({ activeTab: button.dataset.tab, selectedId: null, selectedPositionId: null })));
  app.querySelector("[data-search]")?.addEventListener("input", updateSearch);
  app.querySelector("[data-close-modal]")?.addEventListener("click", () => setState({ selectedId: null }));
  app.querySelector("[data-close-position-modal]")?.addEventListener("click", () => setState({ selectedPositionId: null }));
  app.querySelectorAll("[data-modal-overlay]").forEach((overlay) => overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) return;
    setState({ selectedId: null, selectedPositionId: null });
  }));
  document.onkeydown = (event) => {
    if (event.key === "Escape" && (state.selectedId || state.selectedPositionId)) setState({ selectedId: null, selectedPositionId: null });
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
  app.querySelector("[data-add='job']")?.addEventListener("click", () => setState({ showJobComposer: !state.showJobComposer }));
  app.querySelector("[data-add='position']")?.addEventListener("click", () => setState({ showPositionComposer: !state.showPositionComposer }));
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
  app.querySelector("[data-new-task-title]")?.addEventListener("input", (event) => setStateQuiet({ newTask: { ...state.newTask, title: event.target.value } }));
  app.querySelector("[data-new-task-date]")?.addEventListener("input", (event) => setStateQuiet({ newTask: { ...state.newTask, due: event.target.value } }));
  app.querySelector("[data-new-task-time]")?.addEventListener("input", (event) => setStateQuiet({ newTask: { ...state.newTask, time: event.target.value } }));
  app.querySelector("[data-clear-new-task-time]")?.addEventListener("click", () => setState({ newTask: { ...state.newTask, time: "" } }));
  app.querySelectorAll("[data-new-urgency]").forEach((button) => button.addEventListener("click", () => setState({ newTask: { ...state.newTask, urgency: Number(button.dataset.newUrgency) } })));
  app.querySelector("[data-add-task]")?.addEventListener("click", (event) => addTask(event.currentTarget.dataset.addTask));
  app.querySelectorAll("[data-task-field]").forEach((input) => input.addEventListener("input", updateTask));
  app.querySelectorAll("[data-task-field]").forEach((input) => input.addEventListener("change", updateTask));
  app.querySelectorAll("[data-clear-task-time]").forEach((button) => button.addEventListener("click", clearTaskTime));
  app.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", deleteTask));
  app.querySelectorAll("[data-toggle-task]").forEach((button) => button.addEventListener("click", toggleTask));
  app.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", quickAction));
}

function restorePendingFocus() {
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

function captureScrollState() {
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

function restoreScrollState() {
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

function updateSearch(event) {
  pendingFocusSelector = "[data-search]";
  setState({ search: event.target.value });
}

function toggleCandidateGroup(key) {
  setState({ collapsedCandidateGroups: { ...state.collapsedCandidateGroups, [key]: !state.collapsedCandidateGroups[key] } });
}

function addCandidate() {
  const jobId = state.jobs[0]?.id || "";
  const id = `candidate-${Date.now()}`;
  const candidate = { id, name: "New Candidate", phone: "", source: "Manual", jobId, positionId: "", stage: "new-lead", added: "Just added", note: "", tasks: [] };
  setState({ candidates: [candidate, ...state.candidates], selectedId: id, activeTab: "candidates" });
}

function createJob() {
  if (!state.newJob.name.trim()) return;
  const job = { ...state.newJob, id: slug(state.newJob.name) + `-${Date.now()}` };
  setState({ jobs: [...state.jobs, job], newJob: { name: "", note: "" }, newPosition: { ...state.newPosition, jobId: job.id }, showJobComposer: false });
}

function createPosition() {
  if (!state.newPosition.client.trim() && !state.newPosition.city.trim()) return;
  const name = state.newPosition.name.trim() || [cleanJobName(state.newPosition.jobId), state.newPosition.client, state.newPosition.city].filter(Boolean).join(" - ");
  const position = { ...state.newPosition, name, id: slug(name) + `-${Date.now()}`, stage: "open", openings: Number(state.newPosition.openings) || 1 };
  setState({ positions: [...state.positions, position], newPosition: freshPositionDraft(state.newPosition.jobId), showPositionComposer: false, selectedPositionId: position.id });
}

function updateNewJob(event) {
  const key = event.target.dataset.newJob;
  setStateQuiet({ newJob: { ...state.newJob, [key]: event.target.value } });
}

function updateNewPosition(event) {
  const key = event.target.dataset.newPosition;
  const value = event.target.type === "checkbox" ? event.target.checked : key === "openings" ? Number(event.target.value) : event.target.value;
  setStateQuiet({ newPosition: { ...state.newPosition, [key]: value } });
}

function updatePositionFilter(event) {
  const key = event.target.dataset.positionFilter;
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  setState({ positionFilters: { ...state.positionFilters, [key]: value } });
}

function togglePositionFilter(key) {
  setState({ openPositionFilter: state.openPositionFilter === key ? null : key });
}

function updatePositionFilterSearch(event) {
  const key = event.target.dataset.positionFilterSearch;
  pendingFocusSelector = `[data-position-filter-search="${key}"]`;
  setState({
    openPositionFilter: key,
    positionFilterSearch: { ...state.positionFilterSearch, [key]: event.target.value }
  });
}

function updatePositionFilterOption(event) {
  const key = event.target.dataset.positionFilterOption;
  const value = event.target.dataset.positionFilterValue;
  const current = state.positionFilters[key] || [];
  const next = event.target.checked ? [...current, value] : current.filter((item) => item !== value);
  setState({ openPositionFilter: key, positionFilters: { ...state.positionFilters, [key]: next } });
}

function toggleHeadlinePart(event) {
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

function updateHeadlinePart(event) {
  const [positionId, key] = event.target.dataset.headlinePart.split(":");
  pendingFocusSelector = `[data-headline-part="${positionId}:${key}"]`;
  const value = event.target.value;
  setState({
    positions: state.positions.map((item) => item.id === positionId ? {
      ...item,
      headlineOverrides: { city: null, client: null, job: null, ...(item.headlineOverrides || {}), [key]: value }
    } : item)
  });
}

function clearPositionFilters() {
  setState({
    openPositionFilter: null,
    positionFilterSearch: { jobIds: "", clients: "", cities: "" },
    positionFilters: { jobIds: [], clients: [], cities: [], eu: false, accommodation: false }
  });
}

function updateJob(event) {
  const [id, key] = event.target.dataset.jobField.split(":");
  setStateQuiet({ jobs: state.jobs.map((job) => job.id === id ? { ...job, [key]: event.target.value } : job) });
}

function updatePosition(event) {
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

function deleteJob(jobId) {
  const remainingJobs = state.jobs.filter((job) => job.id !== jobId);
  const fallbackJobId = remainingJobs[0]?.id || "";
  setState({
    jobs: remainingJobs,
    positions: state.positions.map((position) => position.jobId === jobId ? { ...position, jobId: fallbackJobId } : position),
    candidates: state.candidates.map((candidate) => candidate.jobId === jobId ? { ...candidate, jobId: fallbackJobId } : candidate),
    newPosition: { ...state.newPosition, jobId: state.newPosition.jobId === jobId ? fallbackJobId : state.newPosition.jobId }
  });
}

function deletePosition(positionId) {
  setState({
    positions: state.positions.filter((position) => position.id !== positionId),
    candidates: state.candidates.map((candidate) => candidate.positionId === positionId ? { ...candidate, positionId: "" } : candidate),
    selectedPositionId: null,
    newPosition: state.newPosition
  });
}

function deleteCandidate(candidateId) {
  setState({
    candidates: state.candidates.filter((candidate) => candidate.id !== candidateId),
    selectedId: state.selectedId === candidateId ? null : state.selectedId
  });
}

function updateCandidate(event) {
  const [id, key] = event.target.dataset.candidateField.split(":");
  const value = event.target.value;
  const candidates = state.candidates.map((candidate) => candidate.id === id ? { ...candidate, [key]: value } : candidate);
  const patch = syncLinkedPosition({ candidates }, id, key === "stage" ? value : candidates.find((candidate) => candidate.id === id)?.stage);
  if (event.type === "input" && !["stage", "jobId", "positionId"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

function moveCandidateToNextStage(candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  const currentIndex = candidateStages.findIndex(([stageId]) => stageId === candidate?.stage);
  if (!candidate || currentIndex < 0 || currentIndex >= candidateStages.length - 1) return;
  moveCandidateToStage(candidateId, candidateStages[currentIndex + 1][0]);
}

function moveCandidateToStage(candidateId, stage) {
  const candidates = state.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, stage } : candidate);
  setState(syncLinkedPosition({ candidates }, candidateId, stage));
}

function movePositionToStage(positionId, stage) {
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

function addTask(candidateId) {
  if (!state.newTask.title.trim()) return;
  const task = { id: `task-${Date.now()}`, title: state.newTask.title.trim(), urgency: state.newTask.urgency, due: state.newTask.due || today(), time: state.newTask.time || "", done: false, note: "" };
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, tasks: [...candidate.tasks, task] } : candidate),
    newTask: { title: "", urgency: 2, due: today(), time: "" }
  });
}

function updateTask(event) {
  const [candidateId, taskId, key] = event.target.dataset.taskField.split(":");
  const value = key === "urgency" ? Number(event.target.value) : event.target.value;
  const patch = {
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      tasks: candidate.tasks.map((task) => task.id === taskId ? { ...task, [key]: value } : task)
    } : candidate)
  };
  if (["title", "note"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

function clearTaskTime(event) {
  const [candidateId, taskId] = event.currentTarget.dataset.clearTaskTime.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      tasks: candidate.tasks.map((task) => task.id === taskId ? { ...task, time: "" } : task)
    } : candidate)
  });
}

function deleteTask(event) {
  const [candidateId, taskId] = event.currentTarget.dataset.deleteTask.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      tasks: candidate.tasks.filter((task) => task.id !== taskId)
    } : candidate)
  });
}

function toggleTask(event) {
  const [candidateId, taskId] = event.currentTarget.dataset.toggleTask.split(":");
  setState({
    candidates: state.candidates.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      tasks: candidate.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const done = !task.done;
        return { ...task, done, completedAt: done ? completionTimestamp() : "" };
      })
    } : candidate)
  });
}

function quickAction(event) {
  const [candidateId, taskId, action] = event.currentTarget.dataset.action.split(":");
  const earlyStages = new Set(["new-lead", "in-work"]);
  let nextCandidates = state.candidates.map((candidate) => {
    if (candidate.id !== candidateId) return candidate;
    let stage = candidate.stage;
    if (action === "good-to-place") {
      const currentIndex = candidateStages.findIndex(([stageId]) => stageId === stage);
      const goodIndex = candidateStages.findIndex(([stageId]) => stageId === "good-to-place");
      if (currentIndex >= 0 && currentIndex < goodIndex) stage = "good-to-place";
    }
    else if (earlyStages.has(stage)) {
      const stageByAction = {
        interested: "negotiation",
        "not-interested": "closed-lost",
        disqualify: "disqualified",
        "no-call-dq": "disqualified"
      };
      if (action === "no-answer" && stage === "new-lead") stage = "in-work";
      if (stageByAction[action]) stage = stageByAction[action];
    }
    const tasks = candidate.tasks.map((task) => task.id === taskId ? { ...task, done: true, completedAt: task.completedAt || completionTimestamp(), note: [task.note, actionLabel(action)].filter(Boolean).join("\n") } : task);
    return { ...candidate, stage, tasks };
  });
  const changed = nextCandidates.find((candidate) => candidate.id === candidateId);
  setState(syncLinkedPosition({ candidates: nextCandidates }, candidateId, changed.stage));
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

function syncLinkedPosition(patch, candidateId, candidateStage) {
  const candidate = (patch.candidates || state.candidates).find((item) => item.id === candidateId);
  const positionStage = linkedStageMap[candidateStage];
  if (!candidate?.positionId || !positionStage) return patch;
  return {
    ...patch,
    positions: state.positions.map((position) => position.id === candidate.positionId ? { ...position, stage: positionStage } : position)
  };
}

function actionLabel(action) {
  return `Outcome: ${action.replaceAll("-", " ")}`;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

async function initialize() {
  state = await loadState();
  saveState();
  render();
}

initialize();
