const BASE = "/api";

// ─── Refresh silencioso ───────────────────────────────────────────────────────

let refreshPromise = null; // evita múltiplos refreshes paralelos

async function tryRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const raw = localStorage.getItem("session");
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.refreshToken) return null;

      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!res.ok) {
        localStorage.removeItem("session");
        window.location.href = "/";
        return null;
      }

      const data = await res.json();
      const updated = { ...session, token: data.token, refreshToken: data.refreshToken };
      localStorage.setItem("session", JSON.stringify(updated));
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function createApi(token) {
  let currentToken = token;

  const req = async (method, path, body, retry = true) => {
    const h = {
      "Content-Type": "application/json",
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    };

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Token expirado → tenta refresh uma vez
    if (res.status === 401 && retry) {
      const newToken = await tryRefresh();
      if (newToken) {
        currentToken = newToken;
        return req(method, path, body, false);
      }
    }

    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || "Erro na requisição"), { status: res.status, data });
    return data;
  };

  return {
    get:   (path)       => req("GET",    path),
    post:  (path, b)    => req("POST",   path, b),
    put:   (path, b)    => req("PUT",    path, b),
    patch: (path, b)    => req("PATCH",  path, b),
    del:   (path)       => req("DELETE", path),
  };
}

export default createApi;
