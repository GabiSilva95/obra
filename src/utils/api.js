const BASE = "/api";

function createApi(token) {
  const h = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const req = async (method, path, body) => {
    const res = await fetch(`${BASE}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro na requisição");
    return data;
  };
  return {
    get:  path        => req("GET",    path),
    post: (path, b)   => req("POST",   path, b),
    put:  (path, b)   => req("PUT",    path, b),
    patch:(path, b)   => req("PATCH",  path, b),
    del:  path        => req("DELETE", path),
  };
}

export default createApi;
