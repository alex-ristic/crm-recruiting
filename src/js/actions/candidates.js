import { assignablePositionStages, candidateStages, linkedStageMap } from "../constants.js";
import { state, setState, setStateQuiet } from "../state.js";
import { completionTimestamp, today } from "../utils/dates.js";

export function toggleCandidateGroup(key) {
  setState({ collapsedCandidateGroups: { ...state.collapsedCandidateGroups, [key]: !state.collapsedCandidateGroups[key] } });
}

export function addCandidate() {
  const jobId = state.jobs[0]?.id || "";
  const id = `candidate-${Date.now()}`;
  const candidate = { id, name: "New Candidate", phone: "", source: "Manual", experience: "", whenStart: "", startDate: "", eu: false, jobId, positionId: "", stage: "new-lead", lastActivityAt: today(), added: "Just added", note: "", tasks: [] };
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
  const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
  const candidates = state.candidates.map((candidate) => {
    if (candidate.id !== id) return candidate;
    if (key === "stage") return withStageMoveTask(candidate, value);
    const nextCandidate = { ...candidate, [key]: value, lastActivityAt: today() };
    if (key === "jobId" && !positionAvailableForJob(nextCandidate.positionId, value)) nextCandidate.positionId = "";
    return nextCandidate;
  });
  const patch = syncLinkedPosition({ candidates }, id, key === "stage" ? value : candidates.find((candidate) => candidate.id === id)?.stage);
  if (event.type === "input" && !["stage", "jobId", "positionId", "eu"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

export function moveCandidateToNextStage(candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  const currentIndex = candidateStages.findIndex(([stageId]) => stageId === candidate?.stage);
  if (!candidate || currentIndex < 0 || currentIndex >= candidateStages.length - 1) return;
  moveCandidateToStage(candidateId, candidateStages[currentIndex + 1][0]);
}

export function moveCandidateToStage(candidateId, stage) {
  const candidates = state.candidates.map((candidate) => candidate.id === candidateId ? withStageMoveTask(candidate, stage) : candidate);
  setState(syncLinkedPosition({ candidates }, candidateId, stage));
}

export function withStageMoveTask(candidate, stage) {
  const nextCandidate = { ...candidate, stage, lastActivityAt: today() };
  if (candidate.stage === stage) return nextCandidate;
  return {
    ...nextCandidate,
    tasks: [...(candidate.tasks || []), stageMoveTask(stage, candidate.id)]
  };
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

function stageMoveTask(stage, candidateId) {
  return {
    id: `stage-move-${candidateId}-${stage}-${Date.now()}`,
    title: `Moved to ${stageLabel(stage)}`,
    urgency: 4,
    due: today(),
    time: "",
    done: true,
    completedAt: completionTimestamp(),
    note: "",
    type: "stage-move"
  };
}

function stageLabel(stage) {
  return candidateStages.find(([stageId]) => stageId === stage)?.[1] || stage;
}
