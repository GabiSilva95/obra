// Serviço do suporte: chamados (ticket) e chat ao vivo na mesma fila de atendimento.
// Usado pelas rotas do cliente (/api/suporte) e da equipe (/api/painel/atendimento e /api/painel/chamados).
import prisma from "../db.js";
import { ErroNegocio } from "../financeiro/erro.js";
import { getLimites, normalizarPlano } from "../config/planos.js";
import { CHAT, HORARIO_CHAT_PADRAO, LIMITES_SUPORTE, PRIORIDADES, STATUS_ABERTOS, rotuloSetor, setorValido } from "../config/suporte.js";
import { PAPEL_ADMIN } from "../config/painel.js";
import { configEmail } from "../email/config.js";
import { enviarConfirmacao, enviarResolvido, enviarResposta } from "../email/notificacoes.js";
import { validarAnexo } from "./anexo.js";
import {
  aposRespostaDoCliente, atendentesComVaga, chatAberto, esperaEstimadaMin, mediaAtendimentoMin, ordenarChamados, ordenarFilaChat, podeMudarStatus,
  posicaoNaFila, prazoHoras, prioridadeInicial, situacaoPrazo, statusEfetivoAtendente, textoHorario, venceEm,
} from "./fila.js";

const TX = { timeout: 30000, maxWait: 10000 };
const primeiroNome = nome => String(nome || "").trim().split(/\s+/)[0] || "Suporte";
const inteiro = v => { const n = parseInt(v, 10); return Number.isInteger(n) ? n : null; };

const SELECIONA_ATENDENTE = { OR: [{ papel: PAPEL_ADMIN }, { permissoes: { has: "suporte" } }], ativo: true };

// ─── Configuração do atendimento ──────────────────────────────────────────────

export async function lerConfig() {
  const c = await prisma.configAtendimento.findUnique({ where: { id: 1 } });
  const capacidade = c?.capacidade ?? CHAT.capacidadePadrao;
  // Só os testes ponta a ponta usam: o resultado não pode depender do dia e da hora em que rodam
  if (process.env.SUPORTE_HORARIO_TESTE === "sempre") return { horario: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, ["00:00", "24:00"]])), capacidade };
  if (process.env.SUPORTE_HORARIO_TESTE === "nunca") return { horario: {}, capacidade };
  return { horario: c?.horario ?? HORARIO_CHAT_PADRAO, capacidade };
}

export async function salvarConfig({ horario, capacidade }) {
  const dados = {};
  if (horario !== undefined) {
    const limpo = {};
    for (const [dia, faixa] of Object.entries(horario || {})) {
      if (!/^[0-6]$/.test(dia) || !Array.isArray(faixa) || faixa.length !== 2 || !faixa.every(h => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)) || faixa[0] >= faixa[1]) throw new ErroNegocio("Horário inválido: use HH:MM e o início antes do fim.");
      limpo[dia] = faixa;
    }
    dados.horario = limpo;
  }
  if (capacidade !== undefined) {
    const n = inteiro(capacidade);
    if (!n || n < 1 || n > 10) throw new ErroNegocio("Chats por atendente: de 1 a 10.");
    dados.capacidade = n;
  }
  const atual = await lerConfig();
  await prisma.configAtendimento.upsert({ where: { id: 1 }, update: dados, create: { id: 1, horario: dados.horario ?? atual.horario, capacidade: dados.capacidade ?? atual.capacidade } });
  return lerConfig();
}

// ─── Serializadores (o que cada lado pode ver) ────────────────────────────────

const anexoMeta = a => ({ id: a.id, nome: a.nome, mimeType: a.mimeType, tamanho: a.tamanho });

/** Mensagem como o cliente vê: sem nota interna (nunca chega aqui) e com o nome do atendente só pelo primeiro nome. */
const mensagemCliente = m => ({
  id: m.id, autorTipo: m.autorTipo, autorNome: m.autorTipo === "equipe" ? `${primeiroNome(m.autorNome)} (Suporte)` : m.autorNome, texto: m.texto,
  origem: m.origem, createdAt: m.createdAt, anexos: (m.anexos || []).map(anexoMeta),
});
const mensagemEquipe = m => ({
  id: m.id, autorTipo: m.autorTipo, autorNome: m.autorNome, texto: m.texto, interna: m.interna, origem: m.origem, emailStatus: m.emailStatus ?? null, createdAt: m.createdAt, anexos: (m.anexos || []).map(anexoMeta),
});
const ticketCliente = t => ({
  id: t.id, numero: t.id, canal: t.canal, assunto: t.assunto, setor: t.setor, setorRotulo: rotuloSetor(t.setor), prioridade: t.prioridade, bloqueante: t.bloqueante, status: t.status,
  createdAt: t.createdAt, ultimaMensagemEm: t.ultimaMensagemEm, encerradoEm: t.encerradoEm, naoLido: t.naoLidoCliente, avaliacao: t.avaliacao,
});

const INCLUI_MENSAGENS = { include: { anexos: { select: { id: true, nome: true, mimeType: true, tamanho: true } } }, orderBy: { id: "asc" } };

// ─── Mensagens e anexos ───────────────────────────────────────────────────────

function textoValido(texto) {
  const t = String(texto ?? "").trim();
  if (!t) throw new ErroNegocio("Escreva a mensagem.");
  if (t.length > LIMITES_SUPORTE.textoMax) throw new ErroNegocio(`A mensagem passa de ${LIMITES_SUPORTE.textoMax} caracteres.`);
  return t;
}

async function nomeDoUsuario(userId) {
  return (await prisma.user.findUnique({ where: { id: userId }, select: { nome: true } }))?.nome || "Cliente";
}

/** Cria a mensagem (e o anexo, se houver) dentro de uma transação. */
async function criarMensagem(tx, ticket, { autorTipo, autorUserId = null, autorEquipeId = null, autorNome, texto, interna = false, origem = "app", anexo = null, anexos = null, emailMessageId = null }) {
  const m = await tx.ticketMensagem.create({ data: { ticketId: ticket.id, tenantId: ticket.tenantId, autorTipo, autorUserId, autorEquipeId, autorNome, texto, interna, origem, emailMessageId } });
  for (const a of [...(anexo ? [anexo] : []), ...(anexos ?? [])]) await tx.ticketAnexo.create({ data: { ticketId: ticket.id, mensagemId: m.id, tenantId: ticket.tenantId, nome: a.nome, mimeType: a.mimeType, tamanho: a.tamanho, dados: a.dados } });
  return m;
}
const mensagemSistema = (tx, ticket, texto) => criarMensagem(tx, ticket, { autorTipo: "sistema", autorNome: "Sistema", texto, origem: ticket.canal === "chat" ? "chat" : "app" });

// ─── Chamados: lado do cliente ────────────────────────────────────────────────

async function ticketDoCliente(user, id) {
  const n = inteiro(id);
  const t = n ? await prisma.ticket.findFirst({ where: { id: n, tenantId: user.tenantId, ...(user.role === "tenant_admin" ? {} : { abertoPorId: user.userId }) } }) : null;
  if (!t) throw new ErroNegocio("Chamado não encontrado.", 404);
  return t;
}

export async function configCliente(user) {
  const [cfg, tenant] = await Promise.all([lerConfig(), prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plano: true } })]);
  return {
    chat: { aberto: chatAberto(new Date(), cfg.horario), horario: textoHorario(cfg.horario) },
    prazoRespostaHoras: prazoHoras(normalizarPlano(tenant?.plano)),
    limites: { assuntoMax: LIMITES_SUPORTE.assuntoMax, textoMax: LIMITES_SUPORTE.textoMax },
    // O cliente só é avisado de e-mail quando ele de fato existe; "responder" = pode responder o e-mail e a resposta volta ao chamado
    email: { ativo: configEmail().ligado, responder: configEmail().recebe },
  };
}

/** Números para o sino e o menu: chamados com resposta nova e o chat em andamento. */
export async function resumoCliente(user) {
  const escopo = { tenantId: user.tenantId, ...(user.role === "tenant_admin" ? {} : { abertoPorId: user.userId }) };
  const [respondidos, chat] = await Promise.all([
    prisma.ticket.findMany({ where: { ...escopo, canal: "ticket", naoLidoCliente: { gt: 0 } }, select: { id: true, assunto: true }, orderBy: { ultimaMensagemEm: "desc" }, take: 20 }),
    prisma.ticket.findFirst({ where: { tenantId: user.tenantId, abertoPorId: user.userId, canal: "chat", status: { in: ["na_fila", "em_atendimento"] } }, select: { id: true, status: true } }),
  ]);
  return { respondidos, chatAtivo: user.leitura ? null : chat }; // a equipe em modo leitura não herda o chat de quem ela está olhando
}

export async function listarCliente(user, { status } = {}) {
  const escopo = { tenantId: user.tenantId, ...(user.role === "tenant_admin" ? {} : { abertoPorId: user.userId }) };
  const itens = await prisma.ticket.findMany({
    where: { ...escopo, ...(status === "abertos" ? { status: { in: [...STATUS_ABERTOS, "na_fila"] } } : {}) },
    orderBy: [{ ultimaMensagemEm: "desc" }], take: 100,
    include: { abertoPor: { select: { nome: true } } },
  });
  return itens.map(t => ({ ...ticketCliente(t), abertoPor: t.abertoPor?.nome ?? null }));
}

export async function abrirChamado(user, { assunto, setor, bloqueante, texto, anexo }) {
  const a = String(assunto ?? "").trim();
  if (!a) throw new ErroNegocio("Informe o assunto.");
  if (a.length > LIMITES_SUPORTE.assuntoMax) throw new ErroNegocio(`O assunto passa de ${LIMITES_SUPORTE.assuntoMax} caracteres.`);
  if (!setorValido(setor)) throw new ErroNegocio("Escolha o setor do problema.");
  const t = textoValido(texto);
  const anexoOk = validarAnexo(anexo);
  const [doUsuario, daEmpresa] = await Promise.all([
    prisma.ticket.count({ where: { tenantId: user.tenantId, abertoPorId: user.userId, canal: "ticket", status: { in: STATUS_ABERTOS } } }),
    prisma.ticket.count({ where: { tenantId: user.tenantId, canal: "ticket", status: { in: STATUS_ABERTOS } } }),
  ]);
  if (doUsuario >= LIMITES_SUPORTE.chamadosAbertosPorUsuario) throw new ErroNegocio(`Você já tem ${doUsuario} chamados abertos. Aguarde a resposta ou resolva algum antes de abrir outro.`, 429);
  if (daEmpresa >= LIMITES_SUPORTE.chamadosAbertosPorEmpresa) throw new ErroNegocio("A sua empresa já tem muitos chamados abertos. Aguarde as respostas antes de abrir outro.", 429);
  const [pessoa, tenant] = await Promise.all([prisma.user.findUnique({ where: { id: user.userId }, select: { nome: true, email: true } }), prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plano: true } })]);
  const nome = pessoa?.nome || "Cliente";
  const criado = await prisma.$transaction(async tx => {
    const ticket = await tx.ticket.create({
      data: { tenantId: user.tenantId, abertoPorId: user.userId, canal: "ticket", assunto: a, setor, bloqueante: !!bloqueante, prioridade: prioridadeInicial(!!bloqueante), status: "aberto", plano: normalizarPlano(tenant?.plano), naoLidoEquipe: 1 },
    });
    await criarMensagem(tx, ticket, { autorTipo: "cliente", autorUserId: user.userId, autorNome: nome, texto: t, anexo: anexoOk });
    return ticket;
  }, TX);
  // Confirmação por e-mail (melhor esforço: se falhar, o chamado já está aberto e a conversa fica no sistema)
  await enviarConfirmacao({ chamado: criado, para: pessoa?.email, nome, setorRotulo: rotuloSetor(setor), prazoHoras: prazoHoras(criado.plano), planoNome: getLimites(criado.plano).label });
  return ticketCliente(criado);
}

export async function detalheCliente(user, id) {
  const t = await ticketDoCliente(user, id);
  const mensagens = await prisma.ticketMensagem.findMany({ where: { ticketId: t.id, interna: false }, ...INCLUI_MENSAGENS });
  // Ler como a equipe (modo leitura) não pode marcar a resposta como lida para o cliente
  if (t.naoLidoCliente && !user.leitura) await prisma.ticket.update({ where: { id: t.id }, data: { naoLidoCliente: 0 } });
  let posicao = null;
  if (t.status === "aberto" && t.canal === "ticket") {
    const abertos = await prisma.ticket.findMany({ where: { canal: "ticket", status: "aberto" }, select: { id: true, prioridade: true, entrouNaFilaEm: true } });
    const i = ordenarChamados(abertos).findIndex(x => x.id === t.id);
    posicao = i === -1 ? null : i + 1;
  }
  return { ...ticketCliente({ ...t, naoLidoCliente: 0 }), posicaoFila: posicao, mensagens: mensagens.map(mensagemCliente) };
}

export async function responderCliente(user, id, { texto, anexo }) {
  const t = await ticketDoCliente(user, id);
  if (t.canal === "chat") throw new ErroNegocio("Use a janela do chat para conversar.");
  const depois = aposRespostaDoCliente(t);
  if (depois.erro) throw new ErroNegocio(depois.erro, 409);
  const corpo = textoValido(texto);
  const anexoOk = validarAnexo(anexo);
  const nome = await nomeDoUsuario(user.userId);
  const agora = new Date();
  return prisma.$transaction(async tx => {
    await criarMensagem(tx, t, { autorTipo: "cliente", autorUserId: user.userId, autorNome: nome, texto: corpo, anexo: anexoOk });
    return tx.ticket.update({
      where: { id: t.id },
      data: { status: depois.status, ultimaMensagemEm: agora, naoLidoEquipe: { increment: 1 }, ...(depois.reentra ? { entrouNaFilaEm: agora, encerradoEm: null, avaliacao: null } : {}) },
    });
  }, TX).then(ticketCliente);
}

/**
 * Uma resposta do cliente que chegou por e-mail. Quem chama (server/email/entrada.js) já conferiu que o endereço do chamado é válido
 * e que o remetente é a pessoa que abriu o chamado ou o administrador da empresa. Aqui valem as mesmas regras da resposta pelo sistema:
 * responder um chamado resolvido o reabre e coloca de volta na fila, um fechado não aceita resposta.
 * `emailMessageId` repetido para o mesmo chamado lança o erro único do Prisma (P2002): o chamador trata como duplicado.
 */
export async function registrarRespostaPorEmail({ ticketId, tenantId, usuario, texto, anexos, emailMessageId }) {
  const t = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId, canal: "ticket" } });
  if (!t) throw new ErroNegocio("Chamado não encontrado.", 404);
  const depois = aposRespostaDoCliente(t);
  if (depois.erro) throw new ErroNegocio(depois.erro, 409);
  const corpo = textoValido(texto);
  const agora = new Date();
  return prisma.$transaction(async tx => {
    await criarMensagem(tx, t, { autorTipo: "cliente", autorUserId: usuario.id, autorNome: usuario.nome, texto: corpo, anexos, origem: "email", emailMessageId });
    return tx.ticket.update({
      where: { id: t.id },
      data: { status: depois.status, ultimaMensagemEm: agora, naoLidoEquipe: { increment: 1 }, ...(depois.reentra ? { entrouNaFilaEm: agora, encerradoEm: null, avaliacao: null } : {}) },
    });
  }, TX);
}

export async function resolverCliente(user, id) {
  const t = await ticketDoCliente(user, id);
  if (t.canal === "chat" || t.status === "fechado" || t.status === "resolvido") throw new ErroNegocio("Este chamado não pode ser marcado como resolvido agora.", 409);
  return prisma.$transaction(async tx => {
    await mensagemSistema(tx, t, "O cliente marcou o chamado como resolvido.");
    return tx.ticket.update({ where: { id: t.id }, data: { status: "resolvido", encerradoEm: new Date(), ultimaMensagemEm: new Date(), naoLidoEquipe: { increment: 1 } } });
  }, TX).then(ticketCliente);
}

export async function avaliarCliente(user, id, nota) {
  const t = await ticketDoCliente(user, id);
  const n = inteiro(nota);
  if (!n || n < 1 || n > 5) throw new ErroNegocio("A nota vai de 1 a 5.");
  if (!["resolvido", "fechado", "abandonado"].includes(t.status)) throw new ErroNegocio("Avalie depois que o atendimento terminar.", 409);
  return ticketCliente(await prisma.ticket.update({ where: { id: t.id }, data: { avaliacao: n } }));
}

/** Anexo para download. `user` (cliente) respeita a visibilidade; sem ele (equipe) vale qualquer chamado. */
export async function anexoDoChamado({ user, ticketId, anexoId }) {
  const tid = inteiro(ticketId), aid = inteiro(anexoId);
  const a = tid && aid ? await prisma.ticketAnexo.findFirst({ where: { id: aid, ticketId: tid, ...(user ? { tenantId: user.tenantId, mensagem: { interna: false } } : {}) } }) : null;
  if (!a) throw new ErroNegocio("Anexo não encontrado.", 404);
  if (user) await ticketDoCliente(user, tid);
  return a;
}

// ─── Chat ao vivo: contexto da fila ───────────────────────────────────────────

let ultimaVarredura = 0;

/**
 * Mantém a fila honesta: tira quem sumiu, encerra conversas abandonadas e devolve à fila (na posição original)
 * o chat cujo atendente sumiu. Roda a cada consulta, no máximo uma vez a cada 5 s por instância.
 */
export async function manutencaoChat({ forcar = false } = {}) {
  const agora = Date.now();
  if (!forcar && agora - ultimaVarredura < 5000) return;
  ultimaVarredura = agora;
  const quando = new Date(agora);
  await prisma.ticket.updateMany({
    where: { canal: "chat", status: "na_fila", OR: [{ ultimoSinalClienteEm: null }, { ultimoSinalClienteEm: { lt: new Date(agora - CHAT.clienteSumiuSeg * 1000) } }] },
    data: { status: "abandonado", encerradoEm: quando },
  });
  const paradosEmConversa = await prisma.ticket.findMany({
    where: { canal: "chat", status: "em_atendimento", OR: [{ ultimoSinalClienteEm: null }, { ultimoSinalClienteEm: { lt: new Date(agora - CHAT.clienteSumiuEmAtendimentoSeg * 1000) } }] },
    select: { id: true, tenantId: true, canal: true },
  });
  const orfaos = await prisma.ticket.findMany({
    where: { canal: "chat", status: "em_atendimento", atribuido: { OR: [{ ultimoSinalEm: null }, { ultimoSinalEm: { lt: new Date(agora - CHAT.atendenteSumiuSeg * 1000) } }] } },
    select: { id: true, tenantId: true, canal: true },
  });
  // Quem está nas duas listas (cliente e atendente sumiram) é encerrado, não devolvido à fila
  const encerrados = new Set(paradosEmConversa.map(t => t.id));
  for (const t of paradosEmConversa) {
    await prisma.$transaction(async tx => {
      await mensagemSistema(tx, t, "O chat foi encerrado porque você ficou muito tempo sem responder.");
      await tx.ticket.update({ where: { id: t.id }, data: { status: "resolvido", encerradoEm: quando } });
    }, TX).catch(() => {});
  }
  for (const t of orfaos.filter(o => !encerrados.has(o.id))) {
    await prisma.$transaction(async tx => {
      await mensagemSistema(tx, t, "O atendente saiu. Você voltou à fila, na sua posição.");
      await tx.ticket.update({ where: { id: t.id }, data: { status: "na_fila", atribuidoId: null, iniciadoEm: null, primeiraRespostaEm: null } });
    }, TX).catch(() => {});
  }
}

/** Tudo o que a fila precisa saber agora: quem espera, quem pode atender, capacidade e a média de atendimento. */
async function contextoFila() {
  const [cfg, naFila, atendentes, ativos, concluidos] = await Promise.all([
    lerConfig(),
    prisma.ticket.findMany({ where: { canal: "chat", status: "na_fila" }, select: { id: true, entrouNaFilaEm: true } }),
    prisma.equipeUsuario.findMany({ where: SELECIONA_ATENDENTE, select: { id: true, nome: true, ativo: true, statusAtendimento: true, ultimoSinalEm: true, setores: true } }),
    prisma.ticket.groupBy({ by: ["atribuidoId"], where: { canal: "chat", status: "em_atendimento", atribuidoId: { not: null } }, _count: { _all: true } }),
    prisma.ticket.findMany({ where: { canal: "chat", status: "resolvido", iniciadoEm: { not: null }, encerradoEm: { not: null } }, orderBy: { id: "desc" }, take: 20, select: { iniciadoEm: true, encerradoEm: true } }),
  ]);
  const ativosPor = Object.fromEntries(ativos.map(a => [a.atribuidoId, a._count._all]));
  const duracoes = concluidos.map(c => (c.encerradoEm - c.iniciadoEm) / 60000);
  return { cfg, fila: ordenarFilaChat(naFila), atendentes, ativosPor, comVaga: atendentesComVaga(atendentes, ativosPor, cfg.capacidade), mediaMin: mediaAtendimentoMin(duracoes) };
}

// ─── Chat ao vivo: lado do cliente ────────────────────────────────────────────

const estadoChatCliente = (t, ctx, atendenteNome) => {
  const posicao = t.status === "na_fila" ? posicaoNaFila(ctx.fila, t.id) : null;
  return {
    id: t.id, numero: t.id, status: t.status, setor: t.setor, setorRotulo: rotuloSetor(t.setor), posicao,
    esperaMin: posicao ? esperaEstimadaMin(posicao, ctx.comVaga.length, ctx.mediaMin) : null,
    atendente: t.status === "em_atendimento" ? primeiroNome(atendenteNome) : null,
    encerrado: !["na_fila", "em_atendimento"].includes(t.status), avaliacao: t.avaliacao,
  };
};

async function chatDoCliente(user, id) {
  const n = inteiro(id);
  const t = n ? await prisma.ticket.findFirst({ where: { id: n, tenantId: user.tenantId, abertoPorId: user.userId, canal: "chat" }, include: { atribuido: { select: { nome: true } } } }) : null;
  if (!t) throw new ErroNegocio("Chat não encontrado.", 404);
  return t;
}

export async function entrarChat(user, { setor, assunto }) {
  const cfg = await lerConfig();
  if (!chatAberto(new Date(), cfg.horario)) throw new ErroNegocio(`O chat está fora do horário (${textoHorario(cfg.horario)}). Abra um chamado: respondemos por e-mail.`, 409);
  if (!setorValido(setor)) throw new ErroNegocio("Escolha o setor do problema.");
  await manutencaoChat({ forcar: true });
  const existente = await prisma.ticket.findFirst({ where: { tenantId: user.tenantId, abertoPorId: user.userId, canal: "chat", status: { in: ["na_fila", "em_atendimento"] } }, select: { id: true } });
  if (existente) return { id: existente.id, jaExistia: true };
  const [nome, tenant] = await Promise.all([nomeDoUsuario(user.userId), prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plano: true } })]);
  const agora = new Date();
  const ticket = await prisma.$transaction(async tx => {
    const t = await tx.ticket.create({
      data: { tenantId: user.tenantId, abertoPorId: user.userId, canal: "chat", assunto: String(assunto || "").trim().slice(0, LIMITES_SUPORTE.assuntoMax) || `Chat ao vivo de ${nome}`, setor, status: "na_fila", plano: normalizarPlano(tenant?.plano), entrouNaFilaEm: agora, ultimoSinalClienteEm: agora, naoLidoEquipe: 1 },
    });
    await mensagemSistema(tx, t, "Você entrou na fila de atendimento. Fique nesta tela: se sair, perde o lugar.");
    return t;
  }, TX);
  return { id: ticket.id, jaExistia: false };
}

/** Consulta curta do cliente: marca presença, devolve o estado e as mensagens novas (depois do cursor). */
export async function consultarChat(user, id, depois) {
  await manutencaoChat();
  let t = await chatDoCliente(user, id);
  if (["na_fila", "em_atendimento"].includes(t.status)) {
    await prisma.ticket.update({ where: { id: t.id }, data: { ultimoSinalClienteEm: new Date(), naoLidoCliente: 0 } });
  }
  const [ctx, mensagens] = await Promise.all([
    contextoFila(),
    prisma.ticketMensagem.findMany({ where: { ticketId: t.id, interna: false, id: { gt: inteiro(depois) ?? 0 } }, ...INCLUI_MENSAGENS }),
  ]);
  t = await chatDoCliente(user, id); // a varredura pode ter mudado o estado
  return { chat: estadoChatCliente(t, ctx, t.atribuido?.nome), mensagens: mensagens.map(mensagemCliente) };
}

export async function mensagemChat(user, id, { texto }) {
  const t = await chatDoCliente(user, id);
  if (t.status !== "em_atendimento") throw new ErroNegocio(t.status === "na_fila" ? "Aguarde: um atendente ainda vai assumir o seu chat." : "Este chat já foi encerrado.", 409);
  const corpo = textoValido(texto);
  const nome = await nomeDoUsuario(user.userId);
  const agora = new Date();
  await prisma.$transaction(async tx => {
    await criarMensagem(tx, t, { autorTipo: "cliente", autorUserId: user.userId, autorNome: nome, texto: corpo, origem: "chat" });
    await tx.ticket.update({ where: { id: t.id }, data: { ultimaMensagemEm: agora, ultimoSinalClienteEm: agora, naoLidoEquipe: { increment: 1 } } });
  }, TX);
  return { ok: true };
}

/** Sair da fila (abandona) ou encerrar a conversa (resolvido). */
export async function sairChat(user, id) {
  const t = await chatDoCliente(user, id);
  if (!["na_fila", "em_atendimento"].includes(t.status)) return { ok: true };
  await prisma.$transaction(async tx => {
    await mensagemSistema(tx, t, t.status === "na_fila" ? "O cliente saiu da fila." : "O cliente encerrou o chat.");
    await tx.ticket.update({ where: { id: t.id }, data: { status: t.status === "na_fila" ? "abandonado" : "resolvido", encerradoEm: new Date() } });
  }, TX);
  return { ok: true };
}

// ─── Equipe: presença e fila ──────────────────────────────────────────────────

export async function definirPresenca(equipe, status) {
  if (!["disponivel", "ocupado", "ausente"].includes(status)) throw new ErroNegocio("Situação inválida.");
  await prisma.equipeUsuario.update({ where: { id: equipe.id }, data: { statusAtendimento: status, ultimoSinalEm: new Date() } });
  return { status };
}

const empresaResumo = t => ({ id: t.tenantId, nome: t.tenant?.razaoSocial ?? null, plano: t.plano ?? t.tenant?.plano ?? null });

/**
 * A tela Atendimento num só retorno: fila do chat, conversas em andamento, chamados abertos e atendentes.
 * Cada chamada também é o sinal de presença de quem está com o painel aberto.
 */
export async function estadoAtendimento(equipe) {
  await manutencaoChat();
  const agora = new Date();
  await prisma.equipeUsuario.update({ where: { id: equipe.id }, data: { ultimoSinalEm: agora } });
  const ctx = await contextoFila();
  const incluir = { tenant: { select: { razaoSocial: true, plano: true } }, abertoPor: { select: { nome: true } }, atribuido: { select: { id: true, nome: true } } };
  const [chats, tickets] = await Promise.all([
    prisma.ticket.findMany({ where: { canal: "chat", status: { in: ["na_fila", "em_atendimento"] } }, include: incluir }),
    prisma.ticket.findMany({ where: { canal: "ticket", status: { in: STATUS_ABERTOS } }, include: incluir, take: 300 }),
  ]);
  const fila = ordenarFilaChat(chats.filter(c => c.status === "na_fila")).map((ref, i) => {
    const c = chats.find(x => x.id === ref.id);
    return { id: c.id, posicao: i + 1, empresa: empresaResumo(c), solicitante: c.abertoPor?.nome ?? "", setor: c.setor, setorRotulo: rotuloSetor(c.setor), assunto: c.assunto, entrouNaFilaEm: c.entrouNaFilaEm };
  });
  const emAtendimento = chats.filter(c => c.status === "em_atendimento").sort((a, b) => a.iniciadoEm - b.iniciadoEm).map(c => ({
    id: c.id, empresa: empresaResumo(c), solicitante: c.abertoPor?.nome ?? "", setor: c.setor, setorRotulo: rotuloSetor(c.setor), atendente: c.atribuido, iniciadoEm: c.iniciadoEm, naoLidoEquipe: c.naoLidoEquipe,
  }));
  const chamados = ordenarChamados(tickets).map(t => ({
    id: t.id, numero: t.id, empresa: empresaResumo(t), solicitante: t.abertoPor?.nome ?? "", setor: t.setor, setorRotulo: rotuloSetor(t.setor), assunto: t.assunto, prioridade: t.prioridade, bloqueante: t.bloqueante,
    status: t.status, atendente: t.atribuido, entrouNaFilaEm: t.entrouNaFilaEm, ultimaMensagemEm: t.ultimaMensagemEm, naoLidoEquipe: t.naoLidoEquipe,
    prazo: { venceEm: venceEm(t), situacao: situacaoPrazo(t, agora) },
  }));
  const atendentes = ctx.atendentes.map(a => ({ id: a.id, nome: a.nome, status: statusEfetivoAtendente(a, agora), chatsAtivos: ctx.ativosPor[a.id] || 0, setores: a.setores }));
  return {
    agora, capacidade: ctx.cfg.capacidade, chat: { aberto: chatAberto(agora, ctx.cfg.horario), horario: textoHorario(ctx.cfg.horario), mediaMin: ctx.mediaMin },
    fila, emAtendimento, chamados, atendentes, vagas: ctx.comVaga.length,
  };
}

/**
 * "Atender próximo": pega o primeiro da fila. A trava na linha do atendente evita estourar a capacidade com dois cliques
 * seguidos; a trava na linha do chat (SKIP LOCKED) faz dois atendentes simultâneos pegarem pessoas diferentes, na ordem.
 * `ticketId` (só supervisor) escolhe alguém fora da ordem, e isso fica registrado pelo chamador.
 */
export async function assumirProximo(equipe, { ticketId } = {}) {
  const cfg = await lerConfig();
  await manutencaoChat({ forcar: true });
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "EquipeUsuario" WHERE id = ${equipe.id} FOR UPDATE`;
    const ativos = await tx.ticket.count({ where: { canal: "chat", status: "em_atendimento", atribuidoId: equipe.id } });
    if (ativos >= cfg.capacidade) throw new ErroNegocio(`Você já está com ${ativos} chat(s), o limite é ${cfg.capacidade}. Encerre um para pegar outro.`, 409);
    const limite = new Date(Date.now() - CHAT.clienteSumiuSeg * 1000);
    const [alvo] = ticketId
      ? await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} AND canal = 'chat' AND status = 'na_fila' AND "ultimoSinalClienteEm" > ${limite} FOR UPDATE SKIP LOCKED`
      : await tx.$queryRaw`SELECT id FROM "Ticket" WHERE canal = 'chat' AND status = 'na_fila' AND "ultimoSinalClienteEm" > ${limite} ORDER BY "entrouNaFilaEm", id LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!alvo) throw new ErroNegocio(ticketId ? "Esse chat já foi atendido ou saiu da fila." : "Ninguém na fila agora.", 409);
    const agora = new Date();
    const t = await tx.ticket.update({ where: { id: alvo.id }, data: { status: "em_atendimento", atribuidoId: equipe.id, iniciadoEm: agora, primeiraRespostaEm: agora, naoLidoEquipe: 0 } });
    await criarMensagem(tx, t, { autorTipo: "sistema", autorNome: "Sistema", texto: `${primeiroNome(equipe.nome)} assumiu o seu atendimento.`, origem: "chat" });
    const primeiro = await tx.ticket.findFirst({ where: { canal: "chat", status: "na_fila", entrouNaFilaEm: { lt: t.entrouNaFilaEm } }, select: { id: true } });
    return { id: t.id, tenantId: t.tenantId, furouFila: !!primeiro };
  }, TX);
}

// ─── Equipe: chamados ─────────────────────────────────────────────────────────

const INCLUI_EQUIPE = { tenant: { select: { id: true, razaoSocial: true, plano: true, status: true } }, abertoPor: { select: { id: true, nome: true, email: true } }, atribuido: { select: { id: true, nome: true } } };

const ticketEquipe = (t, agora = new Date()) => ({
  id: t.id, numero: t.id, canal: t.canal, assunto: t.assunto, setor: t.setor, setorRotulo: rotuloSetor(t.setor), prioridade: t.prioridade, bloqueante: t.bloqueante, status: t.status,
  empresa: t.tenant ? { id: t.tenant.id, nome: t.tenant.razaoSocial, plano: t.plano ?? t.tenant.plano, statusConta: t.tenant.status } : { id: t.tenantId },
  solicitante: t.abertoPor ?? null, atendente: t.atribuido ?? null, entrouNaFilaEm: t.entrouNaFilaEm, iniciadoEm: t.iniciadoEm, primeiraRespostaEm: t.primeiraRespostaEm, encerradoEm: t.encerradoEm,
  ultimaMensagemEm: t.ultimaMensagemEm, naoLidoEquipe: t.naoLidoEquipe, avaliacao: t.avaliacao, createdAt: t.createdAt,
  prazo: { venceEm: venceEm(t), situacao: situacaoPrazo(t, agora) },
});

export async function listarEquipe({ pagina = 1, limite = 50, status, canal, setor, atendenteId, tenantId, q, de, ate } = {}) {
  const where = {};
  if (status) where.status = status === "abertos" ? { in: [...STATUS_ABERTOS, "na_fila"] } : String(status);
  if (canal === "ticket" || canal === "chat") where.canal = canal;
  if (setor && setorValido(setor)) where.setor = setor;
  if (inteiro(atendenteId)) where.atribuidoId = inteiro(atendenteId);
  if (tenantId) where.tenantId = String(tenantId).slice(0, 40);
  const n = inteiro(String(q ?? "").replace("#", ""));
  if (q) where.OR = [...(n ? [{ id: n }] : []), { assunto: { contains: String(q).slice(0, 80), mode: "insensitive" } }, { tenant: { razaoSocial: { contains: String(q).slice(0, 80), mode: "insensitive" } } }];
  if (/^\d{4}-\d{2}-\d{2}$/.test(de ?? "") || /^\d{4}-\d{2}-\d{2}$/.test(ate ?? "")) where.createdAt = { ...(/^\d{4}-\d{2}-\d{2}$/.test(de ?? "") ? { gte: new Date(`${de}T00:00:00-03:00`) } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(ate ?? "") ? { lte: new Date(`${ate}T23:59:59.999-03:00`) } : {}) };
  const p = Math.max(1, inteiro(pagina) || 1), l = Math.min(100, Math.max(1, inteiro(limite) || 50));
  const [total, itens] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({ where, include: INCLUI_EQUIPE, orderBy: { id: "desc" }, skip: (p - 1) * l, take: l }),
  ]);
  const agora = new Date();
  return { total, pagina: p, limite: l, itens: itens.map(t => ticketEquipe(t, agora)) };
}

async function ticketParaEquipe(id) {
  const n = inteiro(id);
  const t = n ? await prisma.ticket.findUnique({ where: { id: n }, include: INCLUI_EQUIPE }) : null;
  if (!t) throw new ErroNegocio("Chamado não encontrado.", 404);
  return t;
}

/** Chamado completo (com notas internas). `depois` devolve só as mensagens novas, para a consulta curta do chat aberto. */
export async function detalheEquipe(id, { depois } = {}) {
  const t = await ticketParaEquipe(id);
  const mensagens = await prisma.ticketMensagem.findMany({ where: { ticketId: t.id, ...(depois !== undefined ? { id: { gt: inteiro(depois) ?? 0 } } : {}) }, ...INCLUI_MENSAGENS });
  if (t.naoLidoEquipe) await prisma.ticket.update({ where: { id: t.id }, data: { naoLidoEquipe: 0 } });
  return { ...ticketEquipe(t), emailAtivo: configEmail().ligado, mensagens: mensagens.map(mensagemEquipe) };
}

export async function responderEquipe(equipe, id, { texto, interna = false, anexo, depois }, { supervisor = false } = {}) {
  const t = await ticketParaEquipe(id);
  const corpo = textoValido(texto);
  const anexoOk = validarAnexo(anexo);
  const nota = !!interna;
  if (t.canal === "chat") {
    if (t.status !== "em_atendimento") throw new ErroNegocio("Este chat não está em atendimento.", 409);
    if (t.atribuidoId !== equipe.id && !supervisor) throw new ErroNegocio("Este chat está com outro atendente.", 403);
  } else if (!nota && t.status === "fechado") throw new ErroNegocio("Chamado fechado. Reabra-o antes de responder.", 409);
  const agora = new Date();
  const dados = {};
  if (!nota) {
    dados.ultimaMensagemEm = agora;
    dados.naoLidoCliente = { increment: 1 };
    if (!t.primeiraRespostaEm) dados.primeiraRespostaEm = agora;
    if (t.canal === "ticket") {
      const novo = depois && depois !== t.status ? depois : (["aberto", "em_atendimento"].includes(t.status) ? "aguardando_cliente" : t.status);
      if (novo !== t.status) {
        if (!podeMudarStatus(t.status, novo, { supervisor })) throw new ErroNegocio("Essa mudança de situação não é permitida.", 409);
        dados.status = novo;
        if (["resolvido", "fechado"].includes(novo)) dados.encerradoEm = agora;
      }
      if (!t.atribuidoId) { dados.atribuidoId = equipe.id; if (!t.iniciadoEm) dados.iniciadoEm = agora; }
    }
  }
  let mensagem;
  const atualizado = await prisma.$transaction(async tx => {
    mensagem = await criarMensagem(tx, t, { autorTipo: "equipe", autorEquipeId: equipe.id, autorNome: equipe.nome, texto: corpo, interna: nota, origem: t.canal === "chat" ? "chat" : "app", anexo: anexoOk });
    return tx.ticket.update({ where: { id: t.id }, data: dados, include: INCLUI_EQUIPE });
  }, TX);
  // A resposta (nunca a nota interna, nunca o chat) também vai por e-mail para quem abriu o chamado
  if (!nota && t.canal === "ticket") {
    const r = await enviarResposta({ chamado: atualizado, para: t.abertoPor?.email, nomeAtendente: equipe.nome, texto: corpo, mensagemId: mensagem.id });
    await prisma.ticketMensagem.update({ where: { id: mensagem.id }, data: { emailStatus: r.status, emailId: r.id } }).catch(() => {});
  }
  return { ...ticketEquipe(atualizado), alterou: { status: dados.status ?? null } };
}

/**
 * Altera situação, prioridade, setor ou atendente de um chamado. Devolve o chamado e a lista do que mudou (para a auditoria).
 * Atribuir a outra pessoa, reabrir fechado e reclassificar chat só com `supervisor`; assumir para si qualquer atendente pode.
 */
export async function atualizarEquipe(equipe, id, { status, prioridade, setor, atribuidoId }, { supervisor = false } = {}) {
  const t = await ticketParaEquipe(id);
  const dados = {}, mudou = [];
  const agora = new Date();
  if (prioridade !== undefined && prioridade !== t.prioridade) {
    if (!PRIORIDADES.some(p => p.id === prioridade)) throw new ErroNegocio("Prioridade inválida.");
    dados.prioridade = prioridade; mudou.push({ acao: "chamado_prioridade", detalhe: `${t.prioridade} para ${prioridade}` });
  }
  if (setor !== undefined && setor !== t.setor) {
    if (!setorValido(setor)) throw new ErroNegocio("Setor inválido.");
    dados.setor = setor; mudou.push({ acao: "chamado_setor", detalhe: `${t.setor} para ${setor}` });
  }
  if (atribuidoId !== undefined && (atribuidoId ?? null) !== t.atribuidoId) {
    const alvo = atribuidoId === null ? null : inteiro(atribuidoId);
    if (alvo !== equipe.id && !supervisor) throw new ErroNegocio("Só o supervisor atribui o chamado a outra pessoa.", 403);
    if (alvo !== null) {
      const pessoa = await prisma.equipeUsuario.findFirst({ where: { id: alvo, ...SELECIONA_ATENDENTE }, select: { id: true } });
      if (!pessoa) throw new ErroNegocio("Essa pessoa não atende chamados.", 400);
    }
    if (t.canal === "chat" && alvo === null) throw new ErroNegocio("Para devolver um chat à fila, encerre-o e peça ao cliente para entrar de novo.", 409);
    dados.atribuidoId = alvo; mudou.push({ acao: "chamado_atribuiu", detalhe: alvo === null ? "sem atendente" : `atendente ${alvo}` });
    if (alvo !== null && !t.iniciadoEm) dados.iniciadoEm = agora;
  }
  if (status !== undefined && status !== t.status) {
    if (t.canal === "chat" && !["resolvido", "fechado"].includes(status)) throw new ErroNegocio("Um chat só pode ser encerrado (resolvido ou fechado).", 409);
    if (!podeMudarStatus(t.status, status, { supervisor })) throw new ErroNegocio(t.status === "fechado" ? "Só o supervisor reabre um chamado fechado." : "Essa mudança de situação não é permitida.", 409);
    dados.status = status; mudou.push({ acao: "chamado_status", detalhe: `${t.status} para ${status}` });
    if (["resolvido", "fechado"].includes(status)) dados.encerradoEm = agora;
    if (t.status === "fechado") { dados.encerradoEm = null; dados.entrouNaFilaEm = agora; }
    if (status === "em_atendimento" && !t.atribuidoId && dados.atribuidoId === undefined) { dados.atribuidoId = equipe.id; if (!t.iniciadoEm) dados.iniciadoEm = agora; }
  }
  if (!mudou.length) return { chamado: ticketEquipe(t), mudou };
  const atualizado = await prisma.$transaction(async tx => {
    if (dados.status === "resolvido" || dados.status === "fechado") {
      await criarMensagem(tx, t, { autorTipo: "sistema", autorNome: "Sistema", texto: `${dados.status === "resolvido" ? "Chamado resolvido" : "Chamado fechado"} por ${primeiroNome(equipe.nome)}.`, origem: t.canal === "chat" ? "chat" : "app" });
      dados.ultimaMensagemEm = agora; dados.naoLidoCliente = { increment: 1 };
    }
    return tx.ticket.update({ where: { id: t.id }, data: dados, include: INCLUI_EQUIPE });
  }, TX);
  if (dados.status === "resolvido" && t.canal === "ticket") await enviarResolvido({ chamado: atualizado, para: t.abertoPor?.email, nomeAtendente: equipe.nome });
  return { chamado: ticketEquipe(atualizado), mudou };
}

/** Quem pode atender (para escolher a quem atribuir um chamado). */
export async function listarAtendentes() {
  return prisma.equipeUsuario.findMany({ where: SELECIONA_ATENDENTE, select: { id: true, nome: true }, orderBy: { nome: "asc" } });
}

/**
 * A equipe vai olhar a conta do cliente em modo leitura por causa de um chamado: confere que o chamado é daquela empresa
 * e deixa uma mensagem de sistema na conversa, que o cliente enxerga (ele sabe quando alguém consultou a conta dele).
 */
export async function registrarEntradaLeitura(equipe, { ticketId, tenantId, minutos }) {
  const n = inteiro(ticketId);
  const t = n ? await prisma.ticket.findFirst({ where: { id: n, tenantId } }) : null;
  if (!t) throw new ErroNegocio("Informe um chamado desta empresa para entrar na conta.", 400);
  await prisma.$transaction(tx => mensagemSistema(tx, t, `${primeiroNome(equipe.nome)}, da equipe do ConstruktPro, consultou a sua conta em modo leitura (sem alterar nada), por até ${minutos} minutos, para atender este chamado.`), TX);
  return { id: t.id, numero: t.id };
}
