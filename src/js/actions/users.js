import { reloadUsers, users } from "../access.js";
import { saveServerUser } from "../api.js";
import { renderApp } from "../render/app.js";

export async function createUser() {
  const form = document.querySelector("[data-user-create-form]");
  if (!form) return;
  const value = (name) => form.querySelector(`[name='${name}']`)?.value || "";
  try {
    await saveServerUser({ action: "create", username: value("username"), name: value("name"), password: value("password"), role: value("role") || "associate" });
    await reloadUsers();
    renderApp();
  } catch (error) {
    showUserError(error.message);
  }
}

export async function updateUser(userId) {
  const row = document.querySelector(`[data-user-row='${userId}']`);
  if (!row) return;
  const field = (name) => row.querySelector(`[data-user-field='${name}']`);
  const permissions = {
    candidateScope: field("candidateScope").value,
    candidateEdit: field("candidateEdit").checked,
    taskScope: field("taskScope").value,
    taskEdit: field("taskEdit").checked,
    createCandidates: field("createCandidates").checked,
    canAssign: field("canAssign").checked,
    manageUsers: field("manageUsers").checked,
    manageCatalog: field("manageCatalog").checked
  };
  const password = field("password").value;
  try {
    await saveServerUser({
      action: "update",
      id: userId,
      name: field("name").value,
      role: field("role").value,
      active: field("active").checked,
      permissions,
      ...(password ? { password } : {})
    });
    await reloadUsers();
    renderApp();
  } catch (error) {
    showUserError(error.message);
  }
}

export function applyRoleDefaults(event) {
  const row = event.target.closest("[data-user-row]");
  if (!row) return;
  const defaults = {
    admin: { candidateScope: "all", candidateEdit: true, taskScope: "all", taskEdit: true, createCandidates: true, canAssign: true, manageUsers: true, manageCatalog: true },
    viewer: { candidateScope: "all", candidateEdit: false, taskScope: "all", taskEdit: false, createCandidates: false, canAssign: false, manageUsers: false, manageCatalog: false },
    associate: { candidateScope: "own", candidateEdit: true, taskScope: "own", taskEdit: true, createCandidates: true, canAssign: false, manageUsers: false, manageCatalog: false }
  }[event.target.value];
  Object.entries(defaults || {}).forEach(([key, value]) => {
    const input = row.querySelector(`[data-user-field='${key}']`);
    if (!input) return;
    if (input.type === "checkbox") input.checked = value;
    else input.value = value;
  });
}

function showUserError(message) {
  const target = document.querySelector("[data-user-error]");
  if (target) target.textContent = message.replaceAll("_", " ");
}
