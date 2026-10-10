// Ajudas dos testes ponta a ponta do painel: sobe uma API de teste, cliente HTTP e contagem de falhas.
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

export const marca = `e2e-painel-${Date.now().toString(36)}`;
let falhas = 0;
export const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FALHA"} ${msg}`); if (!cond) falhas++; return !!cond; };
export const totalFalhas = () => falhas;

const esperarPorta = porta => new Promise((resolve, reject) => {
  const limite = Date.now() + 30000;
  const tentar = () => {
    const s = net.connect(porta, "127.0.0.1");
    s.on("connect", () => { s.destroy(); resolve(); });
    s.on("error", () => {
      s.destroy();
      if (Date.now() > limite) reject(new Error(`API não subiu na porta ${porta}`)); else setTimeout(tentar, 250);
    });
  };
  tentar();
});

/** Sobe `node server/index.js` numa porta de teste (sem limite de requisições) e devolve { base, parar }. */
export async function iniciarApi(porta, env = {}) {
  const filho = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, PORT: String(porta), API_RATE_LIMIT: "5000", ...env }, stdio: ["ignore", "ignore", "inherit"] });
  await esperarPorta(porta);
  return { base: `http://127.0.0.1:${porta}`, parar: () => new Promise(r => { filho.once("exit", r); filho.kill(); }) };
}

/** Cliente HTTP com token opcional. `host` troca o cabeçalho Host (para testar o PAINEL_HOST). */
export function cliente(base, token, host) {
  const chamar = (metodo, caminho, corpo) => new Promise((resolve, reject) => {
    const url = new URL(base + caminho);
    const dados = corpo === undefined ? null : JSON.stringify(corpo);
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: metodo, headers: {
      "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(host ? { Host: host } : {}), ...(dados ? { "Content-Length": Buffer.byteLength(dados) } : {}),
    } }, res => {
      let t = ""; res.on("data", d => (t += d));
      res.on("end", () => { let corpoJson = {}; try { corpoJson = JSON.parse(t); } catch { /* resposta vazia ou texto */ } resolve({ status: res.statusCode, corpo: corpoJson, texto: t, cabecalhos: res.headers }); });
    });
    req.on("error", reject);
    if (dados) req.write(dados);
    req.end();
  });
  return { get: c => chamar("GET", c), post: (c, b) => chamar("POST", c, b ?? {}), put: (c, b) => chamar("PUT", c, b), patch: (c, b) => chamar("PATCH", c, b), del: c => chamar("DELETE", c) };
}

/** Espera `ms` milissegundos. */
export const esperar = ms => new Promise(r => setTimeout(r, ms));
