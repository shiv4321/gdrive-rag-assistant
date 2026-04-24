/**
 * lib/api.js
 * Thin typed wrapper around the backend REST API.
 * Every function throws on HTTP errors so callers can catch cleanly.
 */

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json();
}

/** POST /sync-drive */
export function syncDrive(payload = {}) {
  return request("POST", "/sync-drive", payload);
}

/** POST /ask */
export function ask(query, topK = 5, filter = null) {
  return request("POST", "/ask", { query, top_k: topK, filter });
}

/** GET /health */
export function health() {
  return request("GET", "/health");
}

/** GET /stats */
export function stats() {
  return request("GET", "/stats");
}

/** GET /auth/url */
export function getOAuthUrl() {
  return request("GET", "/auth/url");
}
