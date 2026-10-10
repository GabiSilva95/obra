// Endereços e texto de e-mail: funções puras (sem banco nem rede).
import { createHmac, timingSafeEqual } from "node:crypto";

/** "Maria Silva <Maria@Empresa.com>" -> "maria@empresa.com". Sem endereço válido, devolve null. */
export function extrairEndereco(valor) {
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(String(valor ?? "")) || /([^\s<>"',;]+@[^\s<>"',;]+)/.exec(String(valor ?? ""));
  const e = m?.[1]?.toLowerCase().replace(/^mailto:/, "");
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** Todos os endereços de uma lista (array ou texto "a@x.com, B <b@y.com>"). */
export function extrairEnderecos(lista) {
  const itens = Array.isArray(lista) ? lista : String(lista ?? "").split(",");
  return [...new Set(itens.map(extrairEndereco).filter(Boolean))];
}

// ─── O endereço de resposta de cada chamado ───────────────────────────────────
// chamado-<id>-<assinatura>@<domínio de recebimento>. A assinatura (HMAC do id) impede que alguém adivinhe o endereço de um chamado alheio.

const assinar = (id, segredo) => createHmac("sha256", segredo).update(`chamado:${id}`).digest("hex").slice(0, 12);

export const enderecoDoChamado = (id, dominio, segredo) => `chamado-${id}-${assinar(id, segredo)}@${dominio}`;

/** O id do chamado se o endereço é o endereço de resposta de algum chamado (domínio e assinatura conferem); senão, null. */
export function chamadoDoEndereco(endereco, dominio, segredo) {
  const m = /^chamado-(\d{1,12})-([0-9a-f]{12})@(.+)$/.exec(String(endereco ?? "").toLowerCase());
  if (!m || m[3] !== String(dominio).toLowerCase()) return null;
  const esperado = Buffer.from(assinar(m[1], segredo)), recebido = Buffer.from(m[2]);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido) ? parseInt(m[1], 10) : null;
}

// ─── O texto novo de uma resposta ─────────────────────────────────────────────

const MARCADORES_DE_CITACAO = [
  /^\s*(em|on)\s.{5,200}(escreveu|wrote)\s*:?\s*$/i,                 // "Em seg., 5 de out. de 2026, Fulano escreveu:"
  /^\s*-{2,}\s*(mensagem original|original message|forwarded message|mensagem encaminhada)\s*-{2,}\s*$/i,
  /^\s*_{5,}\s*$/,                                                    // linha de sublinhados do Outlook
  /^\s*(de|from)\s*:\s.+/i,                                           // bloco de cabeçalho do Outlook (De: ...)
  /^\s*>{1}/,                                                         // primeira linha citada com ">"
];
const AVISO_ACIMA = /^\s*(responda acima desta linha|please reply above this line|- - -|— — —)\s*$/i;

/**
 * Só o que a pessoa escreveu de novo: corta na primeira citação ("Em ... escreveu:", "De: ...", linhas com ">", a linha
 * "- - -" que os e-mails do sistema trazem). Se o corte deixaria a resposta vazia, devolve o texto inteiro limpo.
 */
export function removerCitacao(texto) {
  const linhas = String(texto ?? "").replace(/\r\n?/g, "\n").split("\n");
  const corte = linhas.findIndex(l => AVISO_ACIMA.test(l) || MARCADORES_DE_CITACAO.some(r => r.test(l)));
  const novo = (corte === -1 ? linhas : linhas.slice(0, corte)).join("\n").trim();
  const inteiro = linhas.join("\n").trim();
  return novo || inteiro;
}

/** Tira as tags de um HTML e devolve texto simples (para e-mails que chegam só em HTML). */
export function htmlParaTexto(html) {
  return String(html ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Resposta automática (fora do escritório, aviso de entrega, lista): nunca vira mensagem do chamado, para não criar laço. */
export function ehRespostaAutomatica({ headers = {}, de = "", assunto = "" }) {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(Array.isArray(v) ? v.join(",") : v).toLowerCase()]));
  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return true;
  if (h["x-autoreply"] || h["x-autorespond"] || h["x-auto-response-suppress"]) return true;
  if (/(bulk|junk|auto_reply|auto-reply|list)/.test(h.precedence ?? "")) return true;
  if (h["list-id"] || h["list-unsubscribe"]) return true;
  if (/^(mailer-daemon|postmaster|no-?reply|noreply|do-?not-?reply)@/.test(String(de).toLowerCase())) return true;
  if (/^(resposta automática|automatic reply|auto(matic)? ?reply|out of office|fora do escritório|undeliverable|delivery status)/i.test(String(assunto).trim())) return true;
  return false;
}

/**
 * O Resend informa o resultado de SPF, DKIM e DMARC do e-mail recebido (`authentication`; pode ser null em e-mails antigos).
 * Regra: sem informação, aceita; com informação, pelo menos um dos três precisa ter passado. O formato do valor (texto ou objeto
 * com `result`/`status`) não é garantido, então os dois são lidos. Evita que um e-mail com remetente forjado entre no chamado.
 */
export function remetenteAutenticado(authentication) {
  if (!authentication || typeof authentication !== "object") return true;
  const valores = ["spf", "dkim", "dmarc"].map(k => authentication[k]).filter(v => v != null);
  if (!valores.length) return true;
  const passou = v => /^pass$/i.test(String(typeof v === "object" ? (v.result ?? v.status ?? "") : v));
  return valores.some(passou);
}
