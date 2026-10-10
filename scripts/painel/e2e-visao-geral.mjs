// Ponta a ponta da Visão geral do painel: indicadores de atendimento, clientes e financeiro, permissões por área e o sino
// (pendências). API real e banco real; compara com a linha de base (o banco tem clientes de verdade) e apaga o que cria.
//   node --env-file=.env scripts/painel/e2e-visao-geral.mjs
import bcrypt from "bcryptjs";
import prisma from "../../server/db.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA = "Senha-Teste-2026";
const hoje = hojeBR(), H = 3600000, DIA = 86400000, agora = Date.now();
const equipeCriada = [], empresasCriadas = [];

async function criarEquipe(nome, perms, papel = "atendente") {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel, permissoes: perms, trocarSenha: false } });
  equipeCriada.push(e.id);
  return e;
}
async function criarEmpresa(nome, dados = {}) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Visao ${nome} ${marca}`, cnpj: `TESTE-VG-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", status: "ativo", telefone: "5511987654321", ...dados } });
  empresasCriadas.push(t.id);
  const u = await prisma.user.create({ data: { tenantId: t.id, nome: `Dono ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin" } });
  return { t, u };
}

const api = await iniciarApi(3020, {});
try {
  const anon = cliente(api.base);
  const loginEquipe = async e => cliente(api.base, (await anon.post("/api/painel/auth/login", { email: e.email, senha: SENHA })).corpo.token);
  const tudo = await criarEquipe("tudo", IDS_PERMISSOES, "equipe_admin");
  const suporte = await criarEquipe("sup", ["suporte"]);
  const soClientes = await criarEquipe("cli", ["clientes"]);
  const soFin = await criarEquipe("fin", ["financeiro"]);
  const semArea = await criarEquipe("nada", ["equipe"]);
  const ST = await loginEquipe(tudo), SS = await loginEquipe(suporte), SC = await loginEquipe(soClientes), SF = await loginEquipe(soFin), SN = await loginEquipe(semArea);

  // ── Permissões ───────────────────────────────────────────────────────────
  ok((await anon.get("/api/painel/visao-geral")).status === 401 && (await anon.get("/api/painel/visao-geral/pendencias")).status === 401, "sem token: 401");
  const A0 = (await ST.get("/api/painel/visao-geral")).corpo;
  ok(A0.dias === 30 && A0.atendimento && A0.clientes && A0.financeiro && typeof A0.geradoEm === "string", "administrador: recebe as três áreas, período padrão de 30 dias");
  const vs = (await SS.get("/api/painel/visao-geral")).corpo, vc = (await SC.get("/api/painel/visao-geral")).corpo, vf = (await SF.get("/api/painel/visao-geral")).corpo, vn = (await SN.get("/api/painel/visao-geral")).corpo;
  ok(vs.atendimento && vs.clientes === null && vs.financeiro === null, "suporte: só o atendimento");
  ok(vc.atendimento === null && vc.clientes && vc.financeiro === null, "clientes: só os clientes");
  ok(vf.atendimento === null && vf.clientes === null && vf.financeiro && typeof vf.financeiro.mrr === "number", "financeiro: só o financeiro");
  ok(vn.atendimento === null && vn.clientes === null && vn.financeiro === null, "sem nenhuma área: tudo nulo (nenhum dado vaza)");
  ok(!JSON.stringify(vs).includes("mrr") && !JSON.stringify(vc).includes("mrr") && !JSON.stringify(vs).includes("telefone"), "quem não tem Financeiro não recebe valor; atendimento não traz telefone de cliente");
  ok((await ST.get("/api/painel/visao-geral?dias=7")).corpo.dias === 7 && (await ST.get("/api/painel/visao-geral?dias=90")).corpo.dias === 90, "período de 7 e 90 dias");
  ok((await ST.get("/api/painel/visao-geral?dias=5")).corpo.dias === 30 && (await ST.get("/api/painel/visao-geral?dias=abc")).corpo.dias === 30, "período inválido volta para 30");

  // ── Dados de teste ───────────────────────────────────────────────────────
  const P0 = (await ST.get("/api/painel/visao-geral/pendencias")).corpo;
  const A = await criarEmpresa("a", { status: "trial", trialAte: somarDias(hoje, 2) });
  const B = await criarEmpresa("b", { status: "trial", trialAte: somarDias(hoje, -3) });
  const C = await criarEmpresa("c", { status: "trial", trialAte: somarDias(hoje, 10) });
  const D = await criarEmpresa("d", { ultimoAcessoEm: new Date(agora - 30 * DIA) });
  await criarEmpresa("e", { status: "suspenso" });
  await prisma.assinatura.create({ data: { tenantId: D.t.id, valor: 349 } });
  await prisma.cobranca.create({ data: { tenantId: D.t.id, referencia: "2026-01", descricao: "x", plano: "pro", valor: 349, vencimento: somarDias(hoje, -10) } });
  const tk = (o = {}) => prisma.ticket.create({ data: { tenantId: A.t.id, abertoPorId: A.u.id, canal: "ticket", assunto: "Teste de indicador", setor: "financeiro", plano: "pro", status: "aberto", ...o } });
  await tk({ entrouNaFilaEm: new Date(agora - 30 * H), createdAt: new Date(agora - 30 * H) });                                        // sem resposta, prazo estourado (pro: 24 h)
  await tk({ entrouNaFilaEm: new Date(agora - 2 * H), createdAt: new Date(agora - 2 * H) });                                          // sem resposta, no prazo
  await tk({ status: "em_atendimento", entrouNaFilaEm: new Date(agora - 20 * H), createdAt: new Date(agora - 20 * H), primeiraRespostaEm: new Date(agora - 17 * H) }); // respondido em 3 h
  await tk({ status: "resolvido", entrouNaFilaEm: new Date(agora - 5 * H), createdAt: new Date(agora - 5 * H), primeiraRespostaEm: new Date(agora - 4 * H), encerradoEm: new Date(agora - H), avaliacao: 5 });
  // Com sinal no futuro: a varredura do chat (de qualquer tela de Atendimento aberta por aí) não pode abandonar o chat de teste no meio
  await tk({ canal: "chat", status: "na_fila", setor: "obras", ultimoSinalClienteEm: new Date(agora + H) });
  await tk({ canal: "chat", status: "resolvido", setor: "obras", entrouNaFilaEm: new Date(agora - 3 * H), createdAt: new Date(agora - 3 * H), iniciadoEm: new Date(agora - 3 * H + 5 * 60000), encerradoEm: new Date(agora - 2 * H), avaliacao: 3 });
  const A1 = (await ST.get("/api/painel/visao-geral")).corpo;
  const dif = (depois, antes) => depois - antes;

  // ── Atendimento ──────────────────────────────────────────────────────────
  ok(dif(A1.atendimento.agora.chamadosAbertos, A0.atendimento.agora.chamadosAbertos) === 3, "atendimento: chamados abertos agora +3");
  ok(dif(A1.atendimento.agora.semResposta, A0.atendimento.agora.semResposta) === 2, "atendimento: sem resposta +2");
  ok(dif(A1.atendimento.agora.prazoEstourado, A0.atendimento.agora.prazoEstourado) === 1, "atendimento: prazo estourado +1 (30 h no plano de 24 h)");
  ok(dif(A1.atendimento.agora.chatsNaFila, A0.atendimento.agora.chatsNaFila) === 1, "atendimento: chat na fila +1");
  ok(A1.atendimento.agora.maisAntigoSemRespostaEm !== null, "atendimento: informa o chamado mais antigo sem resposta");
  const p0 = A0.atendimento.periodo, p1 = A1.atendimento.periodo;
  ok(dif(p1.chamadosNovos, p0.chamadosNovos) === 4 && dif(p1.chatsPedidos, p0.chatsPedidos) === 2, "atendimento: chamados e chats do período");
  ok(dif(p1.resolvidos, p0.resolvidos) === 1 && dif(p1.chatsAtendidos, p0.chatsAtendidos) === 1, "atendimento: resolvidos e chats atendidos");
  ok(dif(p1.avaliacoes, p0.avaliacoes) === 2, "atendimento: avaliações (chamado e chat)");
  const soma = (p, k) => p.porDia.reduce((s, d) => s + d[k], 0);
  ok(p1.porDia.length === 14 && p1.porDia.at(-1).dia === hoje && soma(p1, "chamados") - soma(p0, "chamados") === 4 && soma(p1, "chats") - soma(p0, "chats") === 2, "atendimento: série dos últimos 14 dias termina hoje e soma os chamados e chats novos");
  ok(p1.porSetor.some(s => s.setor === "financeiro" && s.rotulo === "Financeiro") && p1.porSetor.length >= 2, "atendimento: chamados por setor, com o nome do setor");
  ok(typeof p1.tempoMedioRespostaMin === "number" && (p1.dentroDoPrazoPct === null || (p1.dentroDoPrazoPct >= 0 && p1.dentroDoPrazoPct <= 100)), "atendimento: tempo de resposta e % no prazo coerentes");

  // ── Clientes ─────────────────────────────────────────────────────────────
  const naoInterna = await prisma.tenant.count({ where: { email: { not: "admin@teste.com" } } });
  const c0 = A0.clientes, c1 = A1.clientes;
  ok(c1.total === naoInterna, `clientes: o total (${c1.total}) é o das empresas reais, sem a conta interna`);
  ok(dif(c1.porSituacao.trial, c0.porSituacao.trial) === 2 && dif(c1.porSituacao.trial_expirado, c0.porSituacao.trial_expirado) === 1 && dif(c1.porSituacao.ativo, c0.porSituacao.ativo) === 1 && dif(c1.porSituacao.suspenso, c0.porSituacao.suspenso) === 1, "clientes: contagem por situação");
  ok(dif(c1.novos7, c0.novos7) === 5 && dif(c1.novos30, c0.novos30) === 5, "clientes: cadastros novos");
  const acab = c1.testesAcabando.find(e => e.id === A.t.id);
  ok(acab && acab.diasRestantes === 2 && acab.telefone === "5511987654321" && !c1.testesAcabando.some(e => e.id === C.t.id), "clientes: teste acabando em 2 dias aparece (e o de 10 dias não), com o telefone para contato");
  const acabou = c1.testesAcabaram.find(e => e.id === B.t.id);
  ok(acabou && acabou.acabouHaDias === 3, "clientes: teste que acabou há 3 dias aparece");
  ok(c1.semAcesso.itens.some(e => e.id === D.t.id && e.semAcessoHaDias >= 29) && dif(c1.semAcesso.total, c0.semAcesso.total) === 1, "clientes: ativa que não entra há 30 dias aparece");
  ok(c1.conversao.base >= c0.conversao.base && (c1.conversao.pct === null || c1.conversao.pct <= 100), "clientes: conversão do teste coerente");
  ok(!JSON.stringify(c1).includes("senha") && !JSON.stringify(c1).includes("notasInternas") && !JSON.stringify(c1).includes("aceite"), "clientes: nada de senha, nota interna nem dado de aceite");

  // ── Financeiro ───────────────────────────────────────────────────────────
  ok(A1.financeiro.mrr >= A0.financeiro.mrr + 349 && A1.financeiro.emAtraso.cobrancas === A0.financeiro.emAtraso.cobrancas + 1, "financeiro: a assinatura nova entra no MRR e a cobrança vencida no atraso");

  // ── Pendências (o sino) ──────────────────────────────────────────────────
  const P1 = (await ST.get("/api/painel/visao-geral/pendencias")).corpo;
  ok(P1.atendimento.chatNaFila === P0.atendimento.chatNaFila + 1 && P1.atendimento.chamadosSemResposta === P0.atendimento.chamadosSemResposta + 2 && P1.atendimento.prazoEstourado === P0.atendimento.prazoEstourado + 1, "sino: fila, sem resposta e prazo estourado");
  ok(P1.clientes.testesAcabando === P0.clientes.testesAcabando + 1 && P1.clientes.testesAcabaram === P0.clientes.testesAcabaram + 1, "sino: testes acabando e que acabaram");
  ok(P1.financeiro.cobrancasAtrasadas === P0.financeiro.cobrancasAtrasadas + 1 && P1.financeiro.valorEmAtraso >= P0.financeiro.valorEmAtraso + 349, "sino: cobranças em atraso e valor");
  const ps = (await SS.get("/api/painel/visao-geral/pendencias")).corpo;
  ok(ps.atendimento && ps.clientes === null && ps.financeiro === null, "sino: o suporte só vê o atendimento");
  const pn = (await SN.get("/api/painel/visao-geral/pendencias")).corpo;
  ok(pn.atendimento === null && pn.clientes === null && pn.financeiro === null, "sino: sem área, nada");
  ok(!JSON.stringify(ps).includes("razaoSocial") && !JSON.stringify(P1).includes("Teste Visao"), "sino: só números, nenhum nome de empresa");

  // ── Só leitura: consultar não mexe em presença nem na fila ───────────────
  const antes = await prisma.equipeUsuario.findUnique({ where: { id: suporte.id }, select: { ultimoSinalEm: true, statusAtendimento: true } });
  for (let i = 0; i < 3; i++) { await SS.get("/api/painel/visao-geral"); await SS.get("/api/painel/visao-geral/pendencias"); }
  const depois = await prisma.equipeUsuario.findUnique({ where: { id: suporte.id }, select: { ultimoSinalEm: true, statusAtendimento: true } });
  ok(antes.ultimoSinalEm?.getTime() === depois.ultimoSinalEm?.getTime() && antes.statusAtendimento === depois.statusAtendimento, "consultar a visão geral não conta como presença no atendimento");
  ok((await prisma.ticket.count({ where: { tenantId: A.t.id, canal: "chat", status: "na_fila" } })) === 1, "e não mexe na fila do chat");

  // ── Auditoria com o nome da empresa ──────────────────────────────────────
  await prisma.auditoriaEquipe.create({ data: { equipeId: tudo.id, acao: "cliente_notas", tenantId: A.t.id, detalhe: `${marca} com empresa` } });
  await prisma.auditoriaEquipe.create({ data: { equipeId: tudo.id, acao: "cliente_notas", tenantId: "empresa-que-nao-existe-mais", detalhe: `${marca} empresa apagada` } });
  await prisma.auditoriaEquipe.create({ data: { equipeId: tudo.id, acao: "presenca", detalhe: `${marca} sem empresa` } });
  const aud = (await ST.get(`/api/painel/auditoria?equipeId=${tudo.id}&limite=20`)).corpo.itens.filter(i => (i.detalhe || "").startsWith(marca));
  ok(aud.find(i => i.detalhe.endsWith("com empresa"))?.empresa?.nome === `Teste Visao a ${marca}`, "auditoria: a linha traz o nome da empresa");
  ok(aud.find(i => i.detalhe.endsWith("empresa apagada"))?.empresa?.nome === null, "auditoria: empresa que não existe mais fica sem nome, sem quebrar");
  ok(aud.find(i => i.detalhe.endsWith("sem empresa"))?.empresa === null, "auditoria: ação sem empresa não tem empresa");
} finally {
  await api.parar();
  const r = await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas }, cnpj: { startsWith: "TESTE-VG-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: equipeCriada } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const q = await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipeCriada }, email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} empresa(s) e ${q.count} pessoa(s) da equipe de teste apagadas`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
