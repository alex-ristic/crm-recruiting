const serverStateUrl = "/api/state";
const sessionUrl = "/api/session";

let csrfToken = null;

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

async function getCsrfToken() {
  if (csrfToken !== null) return csrfToken;
  try {
    const response = await fetch(sessionUrl, { cache: "no-store", credentials: "same-origin" });
    if (response.status === 401) {
      window.location.href = "/login";
      return null;
    }
    if (!response.ok) return null;
    const payload = await response.json();
    csrfToken = payload.csrfToken || "";
    return csrfToken;
  } catch {
    return null;
  }
}
