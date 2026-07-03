import { candidateStages, linkedStageMap } from "../constants.js";
import { state, setState, setStateQuiet } from "../state.js";
import { today } from "../utils/dates.js";

const assignablePositionStages = new Set(["open", "sent", "trial-starting", "trial", "wait"]);

export function toggleCandidateGroup(key) {
  setState({ collapsedCandidateGroups: { ...state.collapsedCandidateGroups, [key]: !state.collapsedCandidateGroups[key] } });
}

export function addCandidate() {
  const jobId = state.jobs[0]?.id || "";
  const id = `candidate-${Date.now()}`;
  const candidate = { id, name: "New Candidate", phone: "", source: "Manual", experience: "", whenStart: "", startDate: "", jobId, positionId: "", stage: "new-lead", lastActivityAt: today(), added: "Just added", note: "", tasks: [] };
  setState({ candidates: [candidate, ...state.candidates], selectedId: id, activeTab: "candidates" });
}

export function deleteCandidate(candidateId) {
  setState({
    candidates: state.candidates.filter((candidate) => candidate.id !== candidateId),
    selectedId: state.selectedId === candidateId ? null : state.selectedId
  });
}

export function updateCandidate(event) {
  const [id, key] = event.target.dataset.candidateField.split(":");
  const value = event.target.value;
  const candidates = state.candidates.map((candidate) => {
    if (candidate.id !== id) return candidate;
    const nextCandidate = { ...candidate, [key]: value, lastActivityAt: today() };
    if (key === "jobId" && !positionAvailableForJob(nextCandidate.positionId, value)) nextCandidate.positionId = "";
    return nextCandidate;
  });
  const patch = syncLinkedPosition({ candidates }, id, key === "stage" ? value : candidates.find((candidate) => candidate.id === id)?.stage);
  if (event.type === "input" && !["stage", "jobId", "positionId"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

export function moveCandidateToNextStage(candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  const currentIndex = candidateStages.findIndex(([stageId]) => stageId === candidate?.stage);
  if (!candidate || currentIndex < 0 || currentIndex >= candidateStages.length - 1) return;
  moveCandidateToStage(candidateId, candidateStages[currentIndex + 1][0]);
}

export function moveCandidateToStage(candidateId, stage) {
  const candidates = state.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, stage, lastActivityAt: today() } : candidate);
  setState(syncLinkedPosition({ candidates }, candidateId, stage));
}

export function syncLinkedPosition(patch, candidateId, candidateStage) {
  const candidate = (patch.candidates || state.candidates).find((item) => item.id === candidateId);
  const positionStage = linkedStageMap[candidateStage];
  if (!candidate?.positionId || !positionStage) return patch;
  return {
    ...patch,
    positions: state.positions.map((position) => position.id === candidate.positionId ? { ...position, stage: positionStage } : position)
  };
}

function positionAvailableForJob(positionId, jobId) {
  if (!positionId) return true;
  return state.positions.some((position) =>
    position.id === positionId &&
    position.jobId === jobId &&
    assignablePositionStages.has(position.stage)
  );
}
