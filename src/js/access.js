import { loadServerUsers, loadSession } from "./api.js";

export let currentUser = null;
export let permissions = {
  candidateScope: "own",
  candidateEdit: false,
  taskScope: "own",
  taskEdit: false,
  createCandidates: false,
  canAssign: false,
  manageUsers: false,
  manageCatalog: false
};
export let users = [];

export async function initializeAccess() {
  const session = await loadSession();
  currentUser = session?.user || null;
  permissions = { ...permissions, ...(session?.permissions || {}) };
  users = session?.assignees || [];
  if (permissions.canAssign || permissions.manageUsers) users = await loadServerUsers();
}

export async function reloadUsers() {
  users = await loadServerUsers();
}

export function canEditCandidate(candidate) {
  return !!permissions.candidateEdit && (permissions.candidateScope === "all" || candidate.assigneeId === currentUser?.id);
}

export function canEditTask(task) {
  return !!permissions.taskEdit && (permissions.taskScope === "all" || task.assigneeId === currentUser?.id);
}

export function userName(userId, fallback = "Unassigned") {
  return users.find((user) => user.id === userId)?.name || (currentUser?.id === userId ? currentUser.name : fallback);
}

export function activeUsers() {
  return users.filter((user) => user.active);
}
