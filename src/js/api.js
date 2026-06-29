const serverStateUrl = "/api/state";

export async function loadServerState() {
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

export function saveServerState(state) {
  if (!window.location.protocol.startsWith("http")) return;
  fetch(serverStateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  }).catch(() => {});
}

