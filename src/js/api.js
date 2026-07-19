const serverStateUrl = "/api/state";
const sessionUrl = "/api/session";
const usersUrl = "/api/users";

let csrfToken = null;
let sessionPromise = null;

export async function loadSession() {
  if (sessionPromise) return sessionPromise;
  sessionPromise = fetch(sessionUrl, { cache: "no-store", credentials: "same-origin" })
    .then((response) => {
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      return response.ok ? response.json() : null;
    })
    .then((payload) => {
      if (payload) csrfToken = payload.csrfToken || "";
      return payload;
    })
    .catch(() => null);
  return sessionPromise;
}

export async function loadServerState() {
  if (!window.location.protocol.startsWith("http")) return null;
  try {
    const response = await fetch(serverStateUrl, { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login";
      return null;
    }
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.state || null;
  } catch {
    return null;
  }
}

export async function saveServerState(state) {
  if (!window.location.protocol.startsWith("http")) return null;
  const token = await getCsrfToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-CSRF-Token"] = token;
  const response = await fetch(serverStateUrl, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify(state)
  });
  if (response.status === 401) {
    window.location.href = "/login";
    return null;
  }
  if (response.status === 409) {
    const payload = await response.json();
    const error = new Error("stale_state");
    error.state = payload.state || null;
    throw error;
  }
  if (!response.ok) throw new Error("save_failed");
  return response.json();
}

export async function logout() {
  const token = await getCsrfToken();
  const headers = {};
  if (token) headers["X-CSRF-Token"] = token;
  await fetch("/logout", { method: "POST", headers, credentials: "same-origin" });
  window.location.href = "/login";
}

export async function loadServerUsers() {
  const response = await fetch(usersUrl, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) return [];
  return (await response.json()).users || [];
}

export async function saveServerUser(payload) {
  const token = await getCsrfToken();
  const response = await fetch(usersUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "X-CSRF-Token": token } : {}) },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({ ok: false, reason: "request_failed" }));
  if (!response.ok) throw new Error(result.reason || "request_failed");
  return result;
}

async function getCsrfToken() {
  if (csrfToken !== null) return csrfToken;
  try {
    const payload = await loadSession();
    csrfToken = payload?.csrfToken || "";
    return csrfToken;
  } catch {
    return null;
  }
}
