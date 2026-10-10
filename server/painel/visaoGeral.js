import prisma from "../db.js";
import { STATUS_ABERTOS } from "../config/suporte.js";
import { hojeBR } from "../utils/datas.js";
import { emReais } from "../financeiro/dinheiro.js";
import { calcularAtendimento, calcularClientes } from "./indicadores.js";

// Busca no banco o que os indicadores puros precisam. Só leitura: nada aqui mexe em presença, fila ou status.
const DIA = 86400000;
const CAMPOS_TICKET = { canal: true, status: true, plano: true, setor: true, createdAt: true, entrouNaFilaEm: true, iniciadoEm: true, primeiraRespostaEm: true, avaliacao: true };

/** O atendimento: retrato de agora e resultado dos últimos `dias` dias. */
export async function atendimentoDoPeriodo(dias, agora = Date.now()) {
  const desde = new Date(agora - dias * DIA);
  const [criados, encerrados, abertos, chatsAtivos] = await Promise.all([
    prisma.ticket.findMany({ where: { createdAt: { gte: desde } }, select: CAMPOS_TICKET, take: 5000 }),
    prisma.ticket.findMany({ where: { encerradoEm: { gte: desde } }, select: CAMPOS_TICKET, take: 5000 }),
    prisma.ticket.findMany({ where: { canal: "ticket", status: { in: STATUS_ABERTOS } }, select: CAMPOS_TICKET, take: 2000 }),
    prisma.ticket.findMany({ where: { canal: "chat", status: { in: ["na_fila", "em_atendimento"] } }, select: { status: true } }),
  ]);
  return calcularAtendimento({ criados, encerrados, abertos, chatsAtivos, agora, dias });
}

/** Só o "agora" do atendimento (para o sino, que consulta toda hora): fila e chamados abertos. */
export async function atendimentoAgora(agora = Date.now()) {
  const [abertos, chatsAtivos] = await Promise.all([
    prisma.ticket.findMany({ where: { canal: "ticket", status: { in: STATUS_ABERTOS } }, select: CAMPOS_TICKET, take: 2000 }),
    prisma.ticket.findMany({ where: { canal: "chat", status: { in: ["na_fila", "em_atendimento"] } }, select: { status: true } }),
  ]);
  return calcularAtendimento({ criados: [], encerrados: [], abertos, chatsAtivos, agora, dias: 1 }).agora;
}

const CAMPOS_EMPRESA = { id: true, razaoSocial: true, email: true, plano: true, status: true, trialAte: true, createdAt: true, ultimoAcessoEm: true, telefone: true, assinatura: { select: { ativadaEm: true } } };
const empresa = t => ({ ...t, ativadaEm: t.assinatura?.ativadaEm ?? null });

/** Os clientes: situação, cadastros, teste acabando, conversão e quem sumiu. */
export async function clientesDoPeriodo(agora = Date.now()) {
  const empresas = await prisma.tenant.findMany({ select: CAMPOS_EMPRESA });
  return calcularClientes({ empresas: empresas.map(empresa), agora });
}

/** Só quem está em teste (para o sino): quantos estão acabando e quantos acabaram há pouco. */
export async function testesAgora(agora = Date.now()) {
  const empresas = await prisma.tenant.findMany({ where: { status: "trial" }, select: CAMPOS_EMPRESA });
  const c = calcularClientes({ empresas: empresas.map(empresa), agora });
  return { testesAcabando: c.testesAcabando, testesAcabaram: c.testesAcabaram };
}

/** Cobranças em aberto e vencidas: quantas e quanto. */
export async function atrasoAgora(hoje = hojeBR()) {
  const r = await prisma.cobranca.aggregate({ where: { status: "aberta", vencimento: { lt: hoje } }, _count: { _all: true }, _sum: { valor: true } });
  return { cobrancas: r._count._all, valor: emReais(Math.round(Number(r._sum.valor ?? 0) * 100)) };
}
