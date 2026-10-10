// Provedores de e-mail. O sistema fala só com esta interface; trocar de provedor é escrever outro arquivo aqui.
//
//   id                              nome curto
//   ativo                           este provedor realmente envia?
//   enviar(mail)                    -> { id }   mail: { para, assunto, texto, replyTo?, headers?, chaveIdempotencia? }
//   lerRecebido(emailId)            -> { de, para[], cc[], assunto, texto, html, headers, messageId, authentication, anexos[] }
//   listarAnexosRecebidos(emailId)  -> [{ id, nome, tipo, tamanho, url, expiraEm }]
//   baixar(url, limiteBytes)        -> Buffer (recusa o que passa do limite)
import { configEmail } from "./config.js";
import { extrairEndereco, extrairEnderecos } from "./enderecos.js";

export class ErroEmail extends Error {
  constructor(mensagem, status = 0) { super(mensagem); this.status = status; }
}

/** E-mail desligado: não envia nem recebe, e quem chama sabe pelo `ativo`. */
export const nenhum = { id: "nenhum", ativo: false, async enviar() { return null; } };

const espera = ms => new Promise(r => setTimeout(r, ms));

async function chamarResend(cfg, metodo, caminho, { corpo, chaveIdempotencia } = {}, tentativa = 1) {
  const r = await fetch(`${cfg.apiBase}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${cfg.chaveApi}`, "Content-Type": "application/json", ...(chaveIdempotencia ? { "Idempotency-Key": String(chaveIdempotencia).slice(0, 256) } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  // Limite de taxa: espera um instante e tenta uma vez mais
  if (r.status === 429 && tentativa === 1) { await espera(Math.min(2000, (Number(r.headers.get("retry-after")) || 1) * 1000)); return chamarResend(cfg, metodo, caminho, { corpo, chaveIdempotencia }, 2); }
  let dados = {};
  try { dados = await r.json(); } catch { /* resposta vazia */ }
  if (!r.ok) throw new ErroEmail(`Resend ${r.status}: ${dados.message || dados.error || "erro"}`, r.status);
  return dados;
}

const listaDe = v => (Array.isArray(v) ? v : v ? [v] : []);

export const resend = {
  id: "resend",
  ativo: true,
  async enviar({ para, assunto, texto, replyTo, headers, chaveIdempotencia }) {
    const cfg = configEmail();
    const r = await chamarResend(cfg, "POST", "/emails", {
      corpo: { from: cfg.remetente, to: [para], subject: assunto, text: texto, ...(replyTo ? { reply_to: [replyTo] } : {}), ...(headers ? { headers } : {}) },
      chaveIdempotencia,
    });
    return { id: r.id ?? null };
  },
  async lerRecebido(emailId) {
    const r = await chamarResend(configEmail(), "GET", `/emails/receiving/${encodeURIComponent(emailId)}`);
    const headers = r.headers && typeof r.headers === "object" ? r.headers : {};
    return {
      de: extrairEndereco(r.from) || extrairEndereco(headers.from),
      para: extrairEnderecos([...listaDe(r.to), ...listaDe(r.cc), ...listaDe(r.received_for)]),
      assunto: r.subject ?? "", texto: r.text ?? "", html: r.html ?? "", headers, messageId: r.message_id ?? null, authentication: r.authentication ?? null,
    };
  },
  async listarAnexosRecebidos(emailId) {
    const r = await chamarResend(configEmail(), "GET", `/emails/receiving/${encodeURIComponent(emailId)}/attachments`);
    return listaDe(r.data).map(a => ({ id: a.id, nome: a.filename ?? "arquivo", tipo: a.content_type ?? "", disposicao: a.content_disposition ?? "attachment", tamanho: a.size ?? 0, url: a.download_url ?? null, expiraEm: a.expires_at ?? null }));
  },
  async baixar(url, limiteBytes) {
    const u = new URL(url);
    const cfg = configEmail();
    // A URL vem da API do Resend (assinada, no CDN deles). Mesmo assim: só https no domínio do Resend (ou o servidor de teste, fora de produção)
    const dentro = (u.protocol === "https:" && /(^|\.)resend\.com$/.test(u.hostname)) || (process.env.NODE_ENV !== "production" && cfg.apiBase !== "https://api.resend.com" && u.origin === new URL(cfg.apiBase).origin);
    if (!dentro) throw new ErroEmail("Endereço de anexo não permitido.");
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new ErroEmail(`Falha ao baixar o anexo (${r.status}).`, r.status);
    if (Number(r.headers.get("content-length")) > limiteBytes) throw new ErroEmail("Anexo grande demais.");
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > limiteBytes) throw new ErroEmail("Anexo grande demais.");
    return buf;
  },
};

/** O provedor ligado neste ambiente (ou o "nenhum"). */
export function provedorDeEmail() {
  const cfg = configEmail();
  if (process.env.EMAIL_PROVIDER === "resend" && !cfg.ligado) console.error("[email] EMAIL_PROVIDER=resend precisa de RESEND_API_KEY e EMAIL_REMETENTE: e-mail desligado.");
  return cfg.ligado ? resend : nenhum;
}
