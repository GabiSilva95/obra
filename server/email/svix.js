import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Confere a assinatura de um aviso do Resend (padrão Svix): HMAC-SHA256 de "id.timestamp.corpo" com a chave `whsec_...`
 * decodificada de base64, comparada em tempo constante com cada assinatura "v1,<base64>" do cabeçalho. O corpo precisa ser
 * o EXATO recebido (bytes originais). Recusa aviso com mais de `toleranciaSeg` de diferença (repetição).
 */
export function verificarAssinaturaSvix({ id, timestamp, assinatura, corpo, segredo, agora = Date.now(), toleranciaSeg = 300 }) {
  if (!id || !timestamp || !assinatura || !segredo || corpo == null) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(agora / 1000 - ts) > toleranciaSeg) return false;
  const chave = Buffer.from(String(segredo).replace(/^whsec_/, ""), "base64");
  if (!chave.length) return false;
  const esperado = createHmac("sha256", chave).update(`${id}.${timestamp}.`).update(corpo).digest();
  return String(assinatura).split(" ").some(par => {
    const [versao, valor] = par.split(",");
    if (versao !== "v1" || !valor) return false;
    const recebido = Buffer.from(valor, "base64");
    return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
  });
}

/** Assina como o Resend/Svix faria (para os testes). */
export function assinarSvix({ id, timestamp, corpo, segredo }) {
  const chave = Buffer.from(String(segredo).replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", chave).update(`${id}.${timestamp}.`).update(corpo).digest("base64")}`;
}
