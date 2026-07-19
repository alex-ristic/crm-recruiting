import { assignablePositionStages, candidateStages, linkedStageMap } from "../constants.js";
import { state, setState, setStateQuiet } from "../state.js";
import { completionTimestamp, today } from "../utils/dates.js";
import { actionLabel } from "../utils/formatting.js";

export function toggleCandidateGroup(key) {
  setState({ collapsedCandidateGroups: { ...state.collapsedCandidateGroups, [key]: !state.collapsedCandidateGroups[key] } });
}

export function addCandidate() {
  const jobId = state.jobs[0]?.id || "";
  const id = `candidate-${Date.now()}`;
  const candidate = { id, name: "New Candidate", phone: "", source: "Manual", experience: "", whenStart: "", startDate: "", eu: true, jobId, positionId: "", stage: "new-lead", closedWonGroup: "", groupOverride: null, lastActivityAt: today(), added: "Just added", note: "", tasks: [] };
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
    if (key === "stage" && shouldAskClosedLostDecision(candidate, value)) {
      return candidate;
    }
    if (key === "stage") return withStageMoveTask(candidate, value, closedWonGroupForCandidate(candidate));
    let nextCandidate = { ...candidate, [key]: value, lastActivityAt: today() };
    if (key === "jobId" && !positionAvailableForJob(nextCandidate.positionId, value)) nextCandidate.positionId = "";
    if (key === "positionId") nextCandidate = withPositionStage(nextCandidate, value);
    return nextCandidate;
  });
  if (key === "stage" && shouldAskClosedLostDecision(state.candidates.find((candidate) => candidate.id === id), value)) {
    setState({ pendingClosedLostDecision: { candidateId: id, taskId: "", action: "" } });
    return;
  }
  const patch = syncLinkedPosition({ candidates }, id, key === "stage" ? value : candidates.find((candidate) => candidate.id === id)?.stage);
  if (event.type === "input" && !["stage", "jobId", "positionId", "eu"].includes(key)) setStateQuiet(patch);
  else setState(patch);
}

export function toggleCandidateGroupOverride(candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  const groupOverride = candidate.groupOverride === null || candidate.groupOverride === undefined
    ? candidateGroupName(candidate)
    : null;
  setState({
    candidates: state.candidates.map((item) => item.id === candidateId ? { ...item, groupOverride } : item)
  });
}

export function moveCandidateToNextStage(candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  const currentIndex = candidateStages.findIndex(([stageId]) => stageId === candidate?.stage);
  if (!candidate || currentIndex < 0 || currentIndex >= candidateStages.length - 1) return;
  moveCandidateToStage(candidateId, candidateStages[currentIndex + 1][0]);
}

export function moveCandidateToStage(candidateId, stage, closedWonGroup = null) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (shouldAskClosedLostDecision(candidate, stage)) {
    setState({ pendingClosedLostDecision: { candidateId, taskId: "", action: "" } });
    return;
  }
  const group = closedWonGroup || closedWonGroupForCandidate(candidate);
  const candidates = state.candidates.map((candidate) => candidate.id === candidateId ? withStageMoveTask(candidate, stage, group) : candidate);
  setState(syncLinkedPosition({ candidates }, candidateId, stage, group));
}

export function startClosedLostDecision(candidateId, taskId = "", action = "") {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!shouldAskClosedLostDecision(candidate, "closed-lost")) return false;
  setState({ pendingClosedLostDecision: { candidateId, taskId, action } });
  return true;
}

export function cancelClosedLostDecision() {
  setState({ pendingClosedLostDecision: null });
}

export function applyClosedLostDecision(event) {
  const modal = event.currentTarget.closest("[data-closed-lost-modal]");
  const candidateId = state.pendingClosedLostDecision?.candidateId;
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!modal || !candidate) return;
  const positionAction = modal.querySelector("[data-closed-lost-position-action]")?.value || "none";
  const linkAction = modal.querySelector("[data-closed-lost-link-action]")?.value || "keep";
  const taskId = state.pendingClosedLostDecision?.taskId || "";
  const action = state.pendingClosedLostDecision?.action || "";
  const candidates = state.candidates.map((item) => {
    if (item.id !== candidateId) return item;
    const tasks = (item.tasks || []).map((task) => {
      if (!taskId || task.id !== taskId) return task;
      return { ...task, done: true, completedAt: task.completedAt || completionTimestamp(), note: [task.note, actionLabel(action)].filter(Boolean).join("\n") };
    });
    return withStageMoveTask({ ...item, tasks, positionId: linkAction === "unlink" ? "" : item.positionId }, "closed-lost");
  });
  const positions = state.positions.map((position) => {
    if (position.id !== candidate.positionId || positionAction === "none") return position;
    return { ...position, stage: positionAction, openGroup: positionAction === "open" ? position.openGroup || "" : "", closedWonGroup: "" };
  });
  setState({ candidates, positions, pendingClosedLostDecision: null });
}

export function withStageMoveTask(candidate, stage, closedWonGroup = null) {
  const nextCandidate = {
    ...candidate,
    stage,
    closedWonGroup: stage === "closed-won" ? closedWonGroup || candidate.closedWonGroup || linkedPositionClosedWonGroup(candidate.positionId) || "not-paid" : "",
    lastActivityAt: today()
  };
  if (candidate.stage === stage) return nextCandidate;
  return {
    ...nextCandidate,
    tasks: [...(candidate.tasks || []), stageMoveTask(stage, candidate.id)]
  };
}

export function syncLinkedPosition(patch, candidateId, candidateStage, closedWonGroup = null) {
  const candidate = (patch.candidates || state.candidates).find((item) => item.id === candidateId);
  const positionStage = linkedStageMap[candidateStage];
  if (!candidate?.positionId || !positionStage) return patch;
  const group = closedWonGroup || candidate.closedWonGroup || "not-paid";
  return {
    ...patch,
    positions: state.positions.map((position) => position.id === candidate.positionId ? {
      ...position,
      stage: positionStage,
      closedWonGroup: positionStage === "closed-won" ? group : ""
    } : position)
  };
}

function shouldAskClosedLostDecision(candidate, stage) {
  return stage === "closed-lost" && candidate?.positionId;
}

function closedWonGroupForCandidate(candidate) {
  return candidate?.closedWonGroup || linkedPositionClosedWonGroup(candidate?.positionId) || "not-paid";
}

function linkedPositionClosedWonGroup(positionId) {
  return state.positions.find((position) => position.id === positionId)?.closedWonGroup || "";
}

function candidateGroupName(candidate) {
  const manualGroup = typeof candidate.groupOverride === "string" ? candidate.groupOverride.trim() : "";
  return manualGroup || state.jobs.find((job) => job.id === candidate.jobId)?.name || "No job";
}

function withPositionStage(candidate, positionId) {
  const position = state.positions.find((item) => item.id === positionId);
  if (!position) return { ...candidate, closedWonGroup: candidate.stage === "closed-won" ? candidate.closedWonGroup : "" };
  const candidateStage = candidateStageForPosition(position);
  if (!candidateStage) return candidate;
  return withStageMoveTask(candidate, candidateStage, position.closedWonGroup || candidate.closedWonGroup || "not-paid");
}

function candidateStageForPosition(position) {
  if (["sent", "trial-starting", "trial", "closed-won", "closed-lost"].includes(position.stage)) return position.stage;
  return "";
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
