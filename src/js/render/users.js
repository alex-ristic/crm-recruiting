import { currentUser, users } from "../access.js";
import { escapeAttr, escapeHtml, initials } from "../utils/formatting.js";

export function renderUsers() {
  return `
    <section class="users-page">
      <div class="user-create-card" data-user-create-form>
        <div><h2>Add user</h2><p>Create a login and choose their starting role.</p></div>
        <input name="name" placeholder="Full name" />
        <input name="username" placeholder="Username" autocomplete="off" />
        <input name="password" type="password" placeholder="Temporary password (8+ characters)" autocomplete="new-password" />
        <select name="role">${roleOptions("associate")}</select>
        <button class="primary-button compact" data-create-user>Add user</button>
      </div>
      <p class="user-error" data-user-error></p>
      <div class="user-list">
        ${users.map(renderUserRow).join("") || `<div class="empty-tasks">No users yet.</div>`}
      </div>
    </section>
  `;
}

function renderUserRow(user) {
  const permissions = user.effectivePermissions;
  return `
    <article class="user-card" data-user-row="${user.id}">
      <div class="user-card-head">
        <span class="user-avatar">${initials(user.name)}</span>
        <div><strong>${escapeHtml(user.name)}</strong><span>@${escapeHtml(user.username)}</span></div>
        ${user.id === currentUser?.id ? `<em>You</em>` : ""}
        <label class="user-active"><input type="checkbox" data-user-field="active" ${user.active ? "checked" : ""} /> Active</label>
      </div>
      <div class="user-fields">
        <label>Name<input data-user-field="name" value="${escapeAttr(user.name)}" /></label>
        <label>Role<select data-user-field="role">${roleOptions(user.role)}</select></label>
        <label>New password<input data-user-field="password" type="password" placeholder="Leave unchanged" autocomplete="new-password" /></label>
      </div>
      <div class="permission-grid">
        ${scopeField("Candidates visible", "candidateScope", permissions.candidateScope)}
        ${checkField("Edit candidates", "candidateEdit", permissions.candidateEdit)}
        ${scopeField("Tasks visible", "taskScope", permissions.taskScope)}
        ${checkField("Edit tasks", "taskEdit", permissions.taskEdit)}
        ${checkField("Create candidates", "createCandidates", permissions.createCandidates)}
        ${checkField("Assign work", "canAssign", permissions.canAssign)}
        ${checkField("Manage users", "manageUsers", permissions.manageUsers)}
        ${checkField("Manage jobs/positions", "manageCatalog", permissions.manageCatalog)}
      </div>
      <div class="user-card-actions"><button class="primary-button compact" data-update-user="${user.id}">Save changes</button></div>
    </article>
  `;
}

function roleOptions(current) {
  return [["admin", "Administrator"], ["viewer", "Viewer"], ["associate", "Associate"]]
    .map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`).join("");
}

function scopeField(label, key, current) {
  return `<label>${label}<select data-user-field="${key}"><option value="own" ${current === "own" ? "selected" : ""}>Assigned only</option><option value="all" ${current === "all" ? "selected" : ""}>Everything</option></select></label>`;
}

function checkField(label, key, checked) {
  return `<label class="permission-check"><input type="checkbox" data-user-field="${key}" ${checked ? "checked" : ""} /><span>${label}</span></label>`;
}
