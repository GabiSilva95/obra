// E-mail recebido: a resposta do cliente ao e-mail do chamado volta para a conversa do chamado.
// O Resend avisa (webhook `email.received`, assinado) só com os metadados; o texto e os anexos vêm da API deles.
import prisma from "../db.js";
import { ErroNegocio } from "../financeiro/erro.js";
import { LIMITE_ANEXO_SUPORTE, LIMITES_SUPORTE } from "../config/suporte.js";
import { validarAnexo } from "../suporte/anexo.js";
import { registrarRespostaPorEmail } from "../suporte/servico.js";
import { configEmail } from "./config.js";
import { chamadoDoEndereco, ehRespostaAutomatica, htmlParaTexto, remetenteAutenticado, removerCitacao } from "./enderecos.js";
import { resend } from "./provedores.js";
import { verificarAssinaturaSvix } from "./svix.js";

const MAX_ANEXOS = 3;

/** Baixa e valida os anexos do e-mail (sem as imagens embutidas da assinatura). O que não serve é contado, não vira erro. */
async function anexosDoEmail(provedor, emailId) {
  const lista = (await provedor.listarAnexosRecebidos(emailId)).filter(a => a.disposicao !== "inline" && a.url);
  const aceitos = [];
  let recusados = 0;
  for (const a of lista) {
    if (aceitos.length >= MAX_ANEXOS || a.tamanho > LIMITE_ANEXO_SUPORTE) { recusados++; continue; }
    try {
      const buffer = await provedor.baixar(a.url, LIMITE_ANEXO_SUPORTE);
      aceitos.push(validarAnexo({ nome: a.nome, dados: buffer.toString("base64") }));
    } catch { recusados++; }
  }
  return { aceitos, recusados };
}

/** Lê o e-mail recebido e, se for uma resposta legítima a um chamado, registra na conversa. Devolve o resultado em texto. */
export async function processarEmailRecebido(emailId, { temAnexos = false, provedor = resend } = {}) {
  const cfg = configEmail();
  const mail = await provedor.lerRecebido(emailId);

  let ticketId = null;
  for (const e of mail.para) { ticketId = chamadoDoEndereco(e, cfg.dominioRecebimento, cfg.segredoEnderecos); if (ticketId) break; }
  if (!ticketId) return "ignorado: nenhum endereço de chamado válido";
  const t = await prisma.ticket.findFirst({ where: { id: ticketId, canal: "ticket" }, select: { id: true, tenantId: true, abertoPorId: true } });
  if (!t) return "ignorado: chamado não encontrado";

  if (ehRespostaAutomatica({ headers: mail.headers, de: mail.de, assunto: mail.assunto })) return "ignorado: resposta automática";
  if (!mail.de) return "ignorado: sem remetente";
  // Quem pode responder por e-mail: quem abriu o chamado e o administrador da empresa (os mesmos que o enxergam no sistema)
  const pessoas = await prisma.user.findMany({ where: { tenantId: t.tenantId, ativo: true, email: { equals: mail.de, mode: "insensitive" } }, select: { id: true, nome: true, role: true } });
  const autor = pessoas.find(p => p.id === t.abertoPorId || p.role === "tenant_admin");
  if (!autor) return "ignorado: o remetente não é quem abriu o chamado nem o administrador da empresa";
  if (!remetenteAutenticado(mail.authentication)) return "ignorado: remetente não autenticado (SPF, DKIM e DMARC falharam)";

  let texto = removerCitacao(mail.texto?.trim() ? mail.texto : htmlParaTexto(mail.html));
  if (!texto) return "ignorado: e-mail sem texto";
  const { aceitos, recusados } = temAnexos ? await anexosDoEmail(provedor, emailId) : { aceitos: [], recusados: 0 };
  if (recusados) texto = `${texto}\n\n(${recusados} anexo(s) deste e-mail não foram aceitos: só imagens, PDF, planilhas e textos de até ${LIMITE_ANEXO_SUPORTE / 1024 / 1024} MB.)`;
  texto = texto.slice(0, LIMITES_SUPORTE.textoMax);

  try {
    await registrarRespostaPorEmail({ ticketId: t.id, tenantId: t.tenantId, usuario: autor, texto, anexos: aceitos, emailMessageId: mail.messageId || `resend:${emailId}` });
  } catch (e) {
    if (e.code === "P2002") return "duplicado";
    if (e instanceof ErroNegocio) return `ignorado: ${e.message}`;
    throw e;
  }
  return `registrado no chamado #${t.id}`;
}

/**
 * O aviso do Resend: confere a assinatura (sobre o corpo exato), pula o que já foi visto e processa. 2xx sempre que o aviso é legítimo,
 * mesmo quando o e-mail é ignorado (o Resend repetiria para sempre); falha de rede ao buscar o e-mail devolve 500 para ele tentar de novo.
 */
export async function receberAvisoDoResend({ corpoBruto, headers, provedor = resend }) {
  const cfg = configEmail();
  if (!cfg.recebe) return { http: 404, corpo: { error: "Não encontrado." } };
  const ok = verificarAssinaturaSvix({
    id: headers["svix-id"], timestamp: headers["svix-timestamp"], assinatura: headers["svix-signature"], corpo: corpoBruto, segredo: cfg.segredoWebhook,
  });
  if (!ok) return { http: 401, corpo: { error: "Aviso não autenticado." } };

  let evento;
  try { evento = JSON.parse(corpoBruto.toString("utf8")); } catch { return { http: 400, corpo: { error: "Aviso inválido." } }; }
  if (evento?.type !== "email.received" || !evento.data?.email_id) return { http: 200, corpo: { ok: true, resultado: "ignorado: evento sem efeito" } };

  const eventoId = String(headers["svix-id"]);
  if (await prisma.eventoEmail.findUnique({ where: { provedor_eventoId: { provedor: "resend", eventoId } }, select: { id: true } })) return { http: 200, corpo: { ok: true, resultado: "duplicado" } };

  let resultado;
  try {
    resultado = await processarEmailRecebido(evento.data.email_id, { temAnexos: (evento.data.attachments ?? []).length > 0, provedor });
  } catch (e) {
    console.error(`[email] falha ao processar o e-mail recebido ${evento.data.email_id}:`, e.message);
    return { http: 500, corpo: { error: "Falha ao processar." } };
  }
  // O registro do aviso só marca como visto depois de processar; um aviso simultâneo igual cai na unicidade da mensagem ("duplicado")
  await prisma.eventoEmail.create({ data: { provedor: "resend", eventoId, tipo: evento.type, resultado } }).catch(() => {});
  return { http: 200, corpo: { ok: true, resultado } };
}
