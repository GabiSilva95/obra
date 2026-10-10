// Anexo de chamado: validação pura (sem banco). O navegador manda o arquivo em base64 dentro do JSON.
import { LIMITE_ANEXO_SUPORTE, TIPOS_ANEXO_SUPORTE } from "../config/suporte.js";
import { ErroNegocio } from "../financeiro/erro.js";

// Primeiros bytes de cada formato binário: confere o conteúdo, não só o nome do arquivo
const ASSINATURAS = {
  ".png": b => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  ".jpg": b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".jpeg": b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".gif": b => b.subarray(0, 4).toString("latin1") === "GIF8",
  ".webp": b => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  ".pdf": b => b.subarray(0, 4).toString("latin1") === "%PDF",
  ".xlsx": b => b[0] === 0x50 && b[1] === 0x4b,
  ".docx": b => b[0] === 0x50 && b[1] === 0x4b,
};

const extensaoDe = nome => { const i = String(nome).lastIndexOf("."); return i === -1 ? "" : String(nome).slice(i).toLowerCase(); };
const nomeSeguro = nome => String(nome).split(/[\\/]/).pop().replace(/[^\p{L}\p{N}.\-_() ]/gu, "_").slice(0, 120) || "arquivo";

/**
 * Valida o anexo enviado ({ nome, dados: base64 }) e devolve { nome, mimeType, tamanho, dados: Buffer }.
 * Sem anexo, devolve null. Erros viram ErroNegocio com mensagem para a pessoa.
 * O tipo de arquivo (mimeType) vem da extensão aceita, nunca do que o navegador disse.
 */
export function validarAnexo(anexo) {
  if (!anexo) return null;
  const { nome, dados } = anexo;
  if (typeof nome !== "string" || !nome.trim() || typeof dados !== "string" || !dados) throw new ErroNegocio("Anexo inválido.");
  const ext = extensaoDe(nome);
  const mimeType = TIPOS_ANEXO_SUPORTE[ext];
  if (!mimeType) throw new ErroNegocio(`Tipo de arquivo não aceito. Envie ${Object.keys(TIPOS_ANEXO_SUPORTE).join(", ")}.`);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dados)) throw new ErroNegocio("Anexo inválido.");
  // Confere o tamanho antes de decodificar (base64 incha um terço)
  if (Math.ceil(dados.length * 3 / 4) > LIMITE_ANEXO_SUPORTE + 4) throw new ErroNegocio(`O arquivo passa de ${LIMITE_ANEXO_SUPORTE / 1024 / 1024} MB.`);
  const buffer = Buffer.from(dados, "base64");
  if (!buffer.length) throw new ErroNegocio("Anexo vazio.");
  if (buffer.length > LIMITE_ANEXO_SUPORTE) throw new ErroNegocio(`O arquivo passa de ${LIMITE_ANEXO_SUPORTE / 1024 / 1024} MB.`);
  const confere = ASSINATURAS[ext];
  if (confere && !confere(buffer)) throw new ErroNegocio("O conteúdo do arquivo não é do tipo que o nome indica.");
  return { nome: nomeSeguro(nome), mimeType, tamanho: buffer.length, dados: buffer };
}
