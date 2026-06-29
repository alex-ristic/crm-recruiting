import { candidateStages, positionStages } from "./constants.js";
import { state } from "./state.js";

export function jobName(id) {
  return state.jobs.find((job) => job.id === id)?.name || "No job";
}

export function positionName(id) {
  const position = state.positions.find((item) => item.id === id);
  return position ? positionCardTitle(position) : "No position";
}

export function stageMeta(id, collection = candidateStages) {
  const stage = collection.find(([stageId]) => stageId === id);
  return { id: stage?.[0] || collection[0][0], name: stage?.[1] || collection[0][1], color: stage?.[2] || collection[0][2] };
}

export function visibleCandidates() {
  const q = state.search.trim().toLowerCase();
  if (!q || state.activeTab !== "candidates") return state.candidates;
  return state.candidates.filter((candidate) =>
    [candidate.name, candidate.phone, candidate.source, jobName(candidate.jobId), positionName(candidate.positionId)]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export function visiblePositions() {
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

export function uniquePositionValues(key) {
  return [...new Set(state.positions.map((position) => position[key] || "").filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function positionCardTitle(position) {
  return [headlinePart(position, "city"), headlinePart(position, "client"), headlinePart(position, "job")]
    .filter(Boolean)
    .join(" - ");
}

export function headlinePart(position, key) {
  const override = position.headlineOverrides?.[key];
  if (override !== null && override !== undefined) return override.trim() || fallbackHeadlinePart(position, key);
  return fallbackHeadlinePart(position, key);
}

export function headlineInputValue(position, key) {
  const override = position.headlineOverrides?.[key];
  return override !== null && override !== undefined ? override : fallbackHeadlinePart(position, key);
}

export function cleanJobName(jobId) {
  return jobName(jobId).replace(/\s+HR$/i, "");
}

export function positionSalaryLine(position) {
  return [
    position.salary || "No salary",
    position.eu ? "EU" : "No EU",
    position.accommodation ? "Acc" : "",
    position.food ? "Food" : ""
  ].filter(Boolean).join(" - ");
}

export function positionStageMeta(id) {
  return stageMeta(id, positionStages);
}

function fallbackHeadlinePart(position, key) {
  if (key === "city") return position.city || "No city";
  if (key === "client") return position.client || "No client";
  if (key === "job") return cleanJobName(position.jobId);
  return "";
}

