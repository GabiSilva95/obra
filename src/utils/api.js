import { emitirLimiteAtingido } from "./planoLimite.js";

const BASE = "/api";

// ─── Refresh silencioso ───────────────────────────────────────────────────────

// Cada sistema (cliente e painel da equipe) guarda a sessão numa chave própria e renova por uma rota própria
const PADRAO = { chaveSessao: "session", rotaRefresh: "/auth/refresh", aoExpirar: () => { window.location.href = "/"; } };
const refreshPromises = {}; // evita múltiplos refreshes paralelos, um por sessão

async function tryRefresh(op) {
  if (refreshPromises[op.chaveSessao]) return refreshPromises[op.chaveSessao];

  refreshPromises[op.chaveSessao] = (async () => {
    try {
      const raw = localStorage.getItem(op.chaveSessao);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.refreshToken) return null;

      const res = await fetch(`${BASE}${op.rotaRefresh}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!res.ok) {
        localStorage.removeItem(op.chaveSessao);
        op.aoExpirar();
        return null;
      }

      const data = await res.json();
      const updated = { ...session, token: data.token, refreshToken: data.refreshToken };
      localStorage.setItem(op.chaveSessao, JSON.stringify(updated));
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromises[op.chaveSessao] = null;
    }
  })();

  return refreshPromises[op.chaveSessao];
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** `opcoes`: { chaveSessao, rotaRefresh, aoExpirar } para outro sistema (o painel da equipe). Sem opções, é o do cliente. */
function createApi(token, opcoes) {
  const op = { ...PADRAO, ...opcoes };
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
      const newToken = await tryRefresh(op);
      if (newToken) {
        currentToken = newToken;
        return req(method, path, body, false);
      }
    }

    // Tenta parsear o JSON; se a resposta estiver vazia ou não for JSON válido,
    // usa objeto vazio como fallback (evita "Unexpected end of JSON input").
    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const erro = Object.assign(new Error(data.error || `Erro ${res.status}`), { status: res.status, data });
      // Limite de plano: o aviso vira pop-up, então a tela não deve alertar
      // de novo. O flag `limitePlano` sinaliza isso a quem trata o erro.
      if (res.status === 403 && data.upgrade) {
        erro.limitePlano = true;
        emitirLimiteAtingido(data);
      }
      // Conta bloqueada no meio do uso (teste acabou, suspensa): o app troca para a tela de assinatura
      if (res.status === 402 && data.codigo === "CONTA_BLOQUEADA") {
        erro.contaBloqueada = true;
        window.dispatchEvent(new CustomEvent("conta-bloqueada", { detail: data }));
      }
      throw erro;
    }
    return data;
  };

  /** Baixa um arquivo (corpo binário) pela API autenticada, com a mesma renovação de token. */
  const baixar = async (path, retry = true) => {
    const res = await fetch(`${BASE}${path}`, { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} });
    if (res.status === 401 && retry) {
      const novo = await tryRefresh(op);
      if (novo) { currentToken = novo; return baixar(path, false); }
    }
    if (!res.ok) {
      let msg = `Erro ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch { /* sem corpo */ }
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return res.blob();
  };

  return {
    baixar,
    get:   (path)       => req("GET",    path),
    post:  (path, b)    => req("POST",   path, b),
    put:   (path, b)    => req("PUT",    path, b),
    patch: (path, b)    => req("PATCH",  path, b),
    del:   (path)       => req("DELETE", path),
  };
}

export default createApi;
