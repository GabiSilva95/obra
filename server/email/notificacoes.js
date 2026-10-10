// Os e-mails que o suporte envia: confirmação de chamado aberto, resposta da equipe e chamado resolvido.
// Nunca derrubam a ação que os disparou: falha vira { status: "falhou" } e o chamado segue normal (a conversa fica no sistema).
import { configEmail } from "./config.js";
import { enderecoDoChamado } from "./enderecos.js";
import { emailDeConfirmacao, emailDeResolvido, emailDeResposta } from "./modelos.js";
import { provedorDeEmail } from "./provedores.js";

async function enviar({ para, mail, chamadoId, chave, automatico }) {
  const provedor = provedorDeEmail();
  if (!provedor.ativo) return { status: "sem_provedor", id: null };
  if (!para) return { status: "falhou", id: null, erro: "sem e-mail do destinatário" };
  const cfg = configEmail();
  try {
    const r = await provedor.enviar({
      para, assunto: mail.assunto, texto: mail.texto, chaveIdempotencia: chave,
      replyTo: cfg.recebe ? enderecoDoChamado(chamadoId, cfg.dominioRecebimento, cfg.segredoEnderecos) : undefined,
      headers: automatico ? { "Auto-Submitted": "auto-generated" } : undefined,
    });
    return { status: "enviado", id: r?.id ?? null };
  } catch (e) {
    console.error(`[email] chamado #${chamadoId}: falha ao enviar (${chave}):`, e.message);
    return { status: "falhou", id: null, erro: e.message };
  }
}

const opcoes = () => { const cfg = configEmail(); return { podeResponder: cfg.recebe, link: cfg.appUrl ? `${cfg.appUrl}/app/suporte` : null }; };

/** Confirmação para quem abriu o chamado. */
export function enviarConfirmacao({ chamado, para, nome, setorRotulo, prazoHoras, planoNome }) {
  return enviar({ para, chamadoId: chamado.id, chave: `chamado-${chamado.id}-confirmacao`, automatico: true,
    mail: emailDeConfirmacao({ chamado, nome, setorRotulo, prazoHoras, planoNome, ...opcoes() }) });
}

/** A resposta da equipe (mensagem `mensagemId`) para quem abriu o chamado. */
export function enviarResposta({ chamado, para, nomeAtendente, texto, mensagemId }) {
  return enviar({ para, chamadoId: chamado.id, chave: `chamado-${chamado.id}-msg-${mensagemId}`, mail: emailDeResposta({ chamado, nomeAtendente, texto, ...opcoes() }) });
}

/** Aviso de chamado resolvido pela equipe. */
export function enviarResolvido({ chamado, para, nomeAtendente }) {
  return enviar({ para, chamadoId: chamado.id, chave: `chamado-${chamado.id}-resolvido-${chamado.encerradoEm ? new Date(chamado.encerradoEm).getTime() : "x"}`, mail: emailDeResolvido({ chamado, nomeAtendente, ...opcoes() }) });
}
