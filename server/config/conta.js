// Regras da conta do cliente que o servidor e a tela precisam enxergar iguais (arquivo puro: o front também importa).

/** Duração do teste grátis, em dias. A landing e o cadastro leem daqui. */
export const DIAS_TESTE = 14;

/** Situações da conta. `ativo` é o padrão: clientes antigos e a conta interna não mudam. */
export const STATUS_CONTA = ["trial", "ativo", "inadimplente", "suspenso", "cancelado"];

/**
 * Aceite exigido no cadastro. O servidor grava o texto daqui (nunca o que o navegador mandar) e a versão,
 * para provar exatamente o que a pessoa aceitou. Mudou o texto? Mude a versão.
 * Cobre só mensagens do serviço (conta, chamados, assinatura). Divulgação exigiria um aceite à parte.
 */
export const ACEITE_MENSAGENS = {
  versao: "2026-10-10",
  texto: "Aceito receber mensagens e notificações do ConstruktPro sobre minha conta, meus chamados e minha assinatura, por e-mail, WhatsApp e SMS.",
};

// ─── Situação efetiva da conta e bloqueio ─────────────────────────────────────

/** Contas da casa (vídeos e testes). Nunca são bloqueadas, suspensas nem canceladas. */
export const EMAILS_CONTA_INTERNA = ["admin@teste.com"];
export const ehContaInterna = t => !!t && EMAILS_CONTA_INTERNA.includes(String(t.email ?? "").toLowerCase());

/** Nome, tom (Badge/Tag do design system) e se bloqueia o acesso, para cada situação efetiva. */
export const SITUACOES = {
  trial: { rotulo: "Em teste", tom: "info", bloqueia: false },
  trial_expirado: { rotulo: "Teste acabado", tom: "warning", bloqueia: true },
  ativo: { rotulo: "Ativo", tom: "success", bloqueia: false },
  inadimplente: { rotulo: "Inadimplente", tom: "warning", bloqueia: false },
  suspenso: { rotulo: "Suspenso", tom: "danger", bloqueia: true },
  cancelado: { rotulo: "Cancelado", tom: "neutral", bloqueia: true },
};
export const rotuloSituacao = s => SITUACOES[s]?.rotulo || s;

/**
 * Situação de verdade da conta hoje (`hoje` = AAAA-MM-DD em São Paulo). O banco guarda `trial` até a equipe mudar;
 * o teste que passou da data vira `trial_expirado` aqui, sem precisar de tarefa agendada. O último dia do teste ainda vale.
 */
export function statusEfetivo(tenant, hoje) {
  if (!tenant || ehContaInterna(tenant)) return "ativo";
  const s = STATUS_CONTA.includes(tenant.status) ? tenant.status : "ativo";
  if (s === "trial" && tenant.trialAte && tenant.trialAte < hoje) return "trial_expirado";
  return s;
}
export const contaBloqueada = (tenant, hoje) => !!SITUACOES[statusEfetivo(tenant, hoje)]?.bloqueia;

/** Dias que faltam do teste (0 no último dia, negativo se passou); null se a conta não está em teste ou não tem data. */
export function diasRestantesTeste(tenant, hoje) {
  if (!tenant || tenant.status !== "trial" || !tenant.trialAte || ehContaInterna(tenant)) return null;
  const [a, m, d] = tenant.trialAte.split("-").map(Number), [ha, hm, hd] = hoje.split("-").map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000);
}

/**
 * Com a conta bloqueada, a API só aceita estes caminhos (relativos a /api): a tela de assinatura, o suporte
 * (para a pessoa pedir ajuda) e a autenticação. Todo o resto responde 402 CONTA_BLOQUEADA.
 */
const LIBERADAS_BLOQUEADA = ["/assinatura", "/suporte", "/auth", "/health"];
export const caminhoLiberadoComContaBloqueada = caminho => LIBERADAS_BLOQUEADA.some(p => caminho === p || caminho.startsWith(`${p}/`));

/** Quanto dura o acesso "como o cliente" (somente leitura) que a equipe pede, em minutos. */
export const DURACAO_LEITURA_MIN = 30;
/** Máximo de dias de uma extensão de teste (por pedido). */
export const MAX_DIAS_EXTENSAO = 60;

const METODOS_DE_LEITURA = new Set(["GET", "HEAD", "OPTIONS"]);
/** O token da equipe "como o cliente" (`leitura: true`) pode usar este método? Só os que não alteram nada. */
export const leituraRecusa = (user, metodo) => !!user?.leitura && !METODOS_DE_LEITURA.has(String(metodo).toUpperCase());
