const KEY = "dspatch_auth";

export function saveAuth(token, business) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify({ token, business }));
}

export function getAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getToken() {
  return getAuth()?.token ?? null;
}

export function getBusiness() {
  return getAuth()?.business ?? null;
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
