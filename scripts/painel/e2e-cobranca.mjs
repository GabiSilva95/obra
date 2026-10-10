// Ponta a ponta de assinatura e cobrança: permissões, cobranças, pagamento à mão, efeito na empresa, indicadores,
// CSV, o lado do cliente e o webhook (gateway de mentira, idempotente). API real e banco real; apaga tudo o que cria.
//   node --env-file=.env scripts/painel/e2e-cobranca.mjs
import bcrypt from "bcryptjs";
import prisma from "../../server/db.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA = "Senha-Teste-2026", SEGREDO = "segredo-de-teste-123";
const hoje = hojeBR(), mes = hoje.slice(0, 7);
const equipeCriada = [], empresasCriadas = [];

async function criarEquipe(nome, perms, papel = "atendente") {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel, permissoes: perms, trocarSenha: false } });
  equipeCriada.push(e.id);
  return e;
}
async function criarEmpresa(nome, dados = {}, assinatura = null) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Cobranca ${nome} ${marca}`, cnpj: `TESTE-COB-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", status: "ativo", ...dados } });
  empresasCriadas.push(t.id);
  const adm = await prisma.user.create({ data: { tenantId: t.id, nome: `Admin ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin" } });
  const comum = await prisma.user.create({ data: { tenantId: t.id, nome: `Pessoa ${nome}`, email: `${marca}-${nome}-u@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "user" } });
  if (assinatura) await prisma.assinatura.create({ data: { tenantId: t.id, ...assinatura } });
  return { t, adm, comum };
}

const api = await iniciarApi(3018, { PAGAMENTO_GATEWAY: "falso", PAGAMENTO_WEBHOOK_SEGREDO: SEGREDO });
const manual = await iniciarApi(3019, { PAGAMENTO_GATEWAY: "manual", PAGAMENTO_WEBHOOK_SEGREDO: "" });
try {
  const anon = cliente(api.base);
  const loginCliente = async (u, base = api.base) => { const r = await cliente(base).post("/api/auth/login", { email: u.email, senha: SENHA }); return cliente(base, r.corpo.token); };
  const loginEquipe = async (e, base = api.base) => cliente(base, (await cliente(base).post("/api/painel/auth/login", { email: e.email, senha: SENHA })).corpo.token);
  const aviso = (corpo, eventoId, extra = {}) => ({ id: `${marca}-${eventoId}`, tipo: "pagamento_confirmado", ...corpo, ...extra });
  const webhook = (corpo, segredo = SEGREDO, base = api.base, gateway = "falso") => new Promise((resolve, reject) => {
    const dados = JSON.stringify(corpo ?? {});
    const url = new URL(`${base}/api/pagamentos/webhook/${gateway}`);
    import("node:http").then(({ default: http }) => {
      const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(dados), ...(segredo ? { "x-falso-segredo": segredo } : {}) } }, res => {
        let t = ""; res.on("data", d => (t += d)); res.on("end", () => { let c = {}; try { c = JSON.parse(t); } catch { /* vazio */ } resolve({ status: res.statusCode, corpo: c }); });
      });
      req.on("error", reject); req.write(dados); req.end();
    });
  });

  const fin = await criarEquipe("fin", ["financeiro", "clientes"]);
  const semFin = await criarEquipe("semfin", ["clientes"]);
  const edit = await criarEquipe("edit", ["clientes", "clientes_editar"]);
  const tudo = await criarEquipe("tudo", IDS_PERMISSOES, "equipe_admin");
  const SF = await loginEquipe(fin), SN = await loginEquipe(semFin), SE = await loginEquipe(edit), ST = await loginEquipe(tudo);

  // Empresas
  const A = await criarEmpresa("a", { status: "trial", trialAte: somarDias(hoje, 10) });
  const A2 = await criarEmpresa("a2", { status: "trial", trialAte: somarDias(hoje, -3) }, { valor: 349, diaVencimento: 10 });
  const B = await criarEmpresa("b", { plano: "starter", ciclo: "anual" }, { valor: 1200, diaVencimento: 5 });
  const C = await criarEmpresa("c"); // ativa e sem assinatura configurada
  const D = await criarEmpresa("d", {}, { valor: 349, cortesia: true });
  const E = await criarEmpresa("e", { status: "suspenso" }, { valor: 349 });
  const F = await criarEmpresa("f", {}, { valor: 200, diaVencimento: 8 });
  const G = await criarEmpresa("g", { status: "inadimplente" }, { valor: 349 });
  const H = await criarEmpresa("h", { status: "inadimplente" }, { valor: 349 });
  const demo = await prisma.tenant.findFirst({ where: { email: "admin@teste.com" }, select: { id: true } });

  // ── Permissões ───────────────────────────────────────────────────────────
  ok((await anon.get("/api/painel/financeiro/resumo")).status === 401, "financeiro sem token: 401");
  ok((await (await loginCliente(F.adm)).get("/api/painel/financeiro/resumo")).status === 401, "token do cliente não abre o financeiro (401)");
  for (const [rotulo, S] of [["só ver clientes", SN], ["clientes_editar sem financeiro", SE]]) {
    ok((await S.get("/api/painel/financeiro/resumo")).status === 403 && (await S.get("/api/painel/financeiro/cobrancas")).status === 403 && (await S.post("/api/painel/financeiro/cobrancas", { tenantId: F.t.id, referencia: mes })).status === 403, `${rotulo}: o financeiro é 403`);
  }
  ok((await SN.put(`/api/painel/clientes/${F.t.id}/assinatura`, { valor: 100 })).status === 403, "configurar a assinatura exige `financeiro` (403)");
  const detSem = (await SN.get(`/api/painel/clientes/${B.t.id}`)).corpo;
  ok(detSem.assinatura === null && detSem.cobrancas === null && !JSON.stringify(detSem).includes("1200"), "quem não tem `financeiro` não vê valor nem cobrança no detalhe da empresa");

  // ── Indicadores: linha de base ───────────────────────────────────────────
  const base = (await SF.get("/api/painel/financeiro/resumo")).corpo;
  ok(base.mes === mes && Array.isArray(base.serie) && base.serie.length === 6, "resumo: mês atual e série de 6 meses");
  ok(base.semAssinatura.some(e => e.id === C.t.id) && !base.semAssinatura.some(e => e.id === demo?.id) && !base.semAssinatura.some(e => e.id === D.t.id), "resumo: empresa ativa sem assinatura aparece à parte; a interna e a cortesia não");

  // ── Assinatura da empresa ────────────────────────────────────────────────
  const dF = id => `/api/painel/clientes/${id}/assinatura`;
  ok((await SF.put(dF(F.t.id), { valor: 0 })).status === 400 && (await SF.put(dF(F.t.id), { valor: -5 })).status === 400, "assinatura: valor zero ou negativo: 400");
  ok((await SF.put(dF(F.t.id), { diaVencimento: 29 })).status === 400 && (await SF.put(dF(F.t.id), { diaVencimento: 0 })).status === 400, "assinatura: dia de vencimento fora de 1 a 28: 400");
  const cfg = await SF.put(dF(C.t.id), { valor: 280.5, diaVencimento: 12 });
  ok(cfg.status === 200 && cfg.corpo.valor === 280.5 && cfg.corpo.diaVencimento === 12, "assinatura: cria e configura (valor e dia)");
  ok((await SF.put(dF(demo.id), { valor: 10 })).status === 409, "assinatura: a conta interna não tem assinatura (409)");
  const aposCfg = (await SF.get("/api/painel/financeiro/resumo")).corpo;
  ok(!aposCfg.semAssinatura.some(e => e.id === C.t.id), "assinatura configurada sai da lista de 'sem assinatura'");

  // ── Cobranças: criar ─────────────────────────────────────────────────────
  const CB = "/api/painel/financeiro/cobrancas";
  ok((await SF.post(CB, { tenantId: F.t.id, referencia: "2026-13" })).status === 400, "cobrança: referência inválida: 400");
  ok((await SF.post(CB, { tenantId: F.t.id, referencia: mes, vencimento: "2026-02-30" })).status === 400, "cobrança: vencimento inexistente: 400");
  ok((await SF.post(CB, { tenantId: F.t.id, referencia: mes, valor: -1 })).status === 400, "cobrança: valor negativo: 400");
  ok((await SF.post(CB, { tenantId: "nao-existe", referencia: mes })).status === 404, "cobrança: empresa inexistente: 404");
  ok((await SF.post(CB, { tenantId: D.t.id, referencia: mes })).status === 409, "cobrança: empresa em cortesia não gera (409)");
  ok((await SF.post(CB, { tenantId: demo.id, referencia: mes })).status === 409, "cobrança: a conta interna não gera (409)");
  const cF = await SF.post(CB, { tenantId: F.t.id, referencia: mes });
  ok(cF.status === 201 && cF.corpo.valor === 200 && cF.corpo.vencimento === `${mes}-08` && cF.corpo.status === "aberta" && cF.corpo.situacao !== "paga", "cobrança: valor da assinatura e vencimento no dia combinado");
  ok(cF.corpo.gateway === "falso" && cF.corpo.gatewayId === `fk_${cF.corpo.id}` && /^https:\/\/pagamento\.exemplo\.test\//.test(cF.corpo.linkPagamento), "cobrança: com gateway automático guarda o id e o link de pagamento");
  ok((await SF.post(CB, { tenantId: F.t.id, referencia: mes })).status === 409, "cobrança: repetir o mês não duplica (409)");
  const cB = await SF.post(CB, { tenantId: B.t.id, referencia: mes });
  ok(cB.status === 201 && cB.corpo.valor === 1200 && cB.corpo.ciclo === "anual", "cobrança anual: o valor do ano inteiro");
  const mesDepois = `${Number(mes.slice(0, 4))}-${String(Math.min(12, Number(mes.slice(5)) + 1)).padStart(2, "0")}`;
  if (mesDepois !== mes) ok((await SF.post(CB, { tenantId: B.t.id, referencia: mesDepois })).status === 409, "cobrança anual: o mês seguinte já está coberto (409)");
  const outra = await prisma.cobranca.count({ where: { tenantId: B.t.id } });
  ok(outra === 1, "cobrança anual: só uma cobrança no banco");

  // ── Gerar o mês ──────────────────────────────────────────────────────────
  const G1 = await criarEmpresa("g1", {}, { valor: 150, diaVencimento: 20 }); // ativa, assinatura, sem cobrança
  const previa = (await SF.get(`${CB}/previa?mes=${mes}`)).corpo;
  const minhas = previa.itens.filter(i => i.empresa.includes(marca));
  ok(minhas.some(i => i.tenantId === G1.t.id && i.valor === 150 && i.vencimento === `${mes}-20`), "prévia: empresa ativa sem cobrança entra, com o vencimento do dia combinado");
  ok(minhas.some(i => i.tenantId === C.t.id), "prévia: a empresa que acabou de ter a assinatura configurada também entra");
  ok(!minhas.some(i => [B.t.id, D.t.id, E.t.id, F.t.id, A.t.id, A2.t.id].includes(i.tenantId)), "prévia: já cobradas, cortesia, suspensa e em teste ficam de fora");
  ok((await SF.get(`${CB}/previa?mes=2026-13`)).status === 400, "prévia: mês inválido: 400");
  const ger = await SF.post(`${CB}/gerar`, { mes });
  ok(ger.status === 200 && ger.corpo.criadas >= 1, "gerar o mês: cria as cobranças da prévia");
  const ger2 = await SF.post(`${CB}/gerar`, { mes });
  ok(ger2.status === 200 && ger2.corpo.criadas === 0, "gerar o mês de novo não cria nada");
  ok(await prisma.cobranca.count({ where: { tenantId: G1.t.id } }) === 1, "gerar o mês duas vezes não duplica a cobrança");
  ok(await prisma.cobranca.count({ where: { tenantId: { in: [D.t.id, E.t.id, A.t.id] } } }) === 0, "cortesia, suspensa e em teste não receberam cobrança");
  ok(await prisma.cobranca.count({ where: { tenantId: C.t.id } }) === 1, "a empresa configurada depois também recebeu uma só cobrança");

  // ── Pagamento à mão ──────────────────────────────────────────────────────
  const pg = id => `${CB}/${id}/pagamento`;
  ok((await SF.post(pg(cF.corpo.id), { pagaEm: somarDias(hoje, 3) })).status === 400, "pagamento: data no futuro: 400");
  ok((await SF.post(pg(cF.corpo.id), { forma: "ouro" })).status === 400, "pagamento: forma inválida: 400");
  ok((await SF.post(pg(cF.corpo.id), { valorPago: 0 })).status === 400, "pagamento: valor zero: 400");
  ok((await SF.post(pg(99999999))).status === 404, "pagamento: cobrança inexistente: 404");
  const pago = await SF.post(pg(cF.corpo.id), { forma: "pix" });
  ok(pago.status === 200 && pago.corpo.status === "paga" && pago.corpo.pagaEm === hoje && pago.corpo.valorPago === 200 && pago.corpo.forma === "pix", "pagamento: registra com a data de hoje e o valor da cobrança");
  ok((await SF.post(pg(cF.corpo.id), {})).status === 409, "pagamento: pagar duas vezes: 409");
  ok((await SF.post(`${CB}/${cF.corpo.id}/cancelar`, { motivo: "engano" })).status === 409, "cancelar uma paga: 409 (estorne antes)");
  const est = await SF.post(`${CB}/${cF.corpo.id}/estornar`);
  ok(est.status === 200 && est.corpo.status === "aberta" && est.corpo.pagaEm === null && est.corpo.valorPago === null, "estorno: a cobrança volta a ficar em aberto");
  ok((await SF.post(`${CB}/${cF.corpo.id}/estornar`)).status === 409, "estorno de uma que não está paga: 409");
  ok((await SF.post(pg(cF.corpo.id), { pagaEm: somarDias(hoje, -2), valorPago: 190.5, forma: "boleto" })).corpo.valorPago === 190.5, "pagamento: aceita data passada e valor pago diferente");

  // ── Cancelar e reabrir ───────────────────────────────────────────────────
  const cG1 = await prisma.cobranca.findFirst({ where: { tenantId: G1.t.id } });
  ok((await SF.post(`${CB}/${cG1.id}/cancelar`, {})).status === 400, "cancelar sem motivo: 400");
  const canc = await SF.post(`${CB}/${cG1.id}/cancelar`, { motivo: "Empresa pediu para pular o mês" });
  ok(canc.status === 200 && canc.corpo.status === "cancelada" && canc.corpo.motivoCancelamento.includes("pular"), "cancelar com motivo");
  ok((await SF.post(`${CB}/${cG1.id}/cancelar`, { motivo: "de novo" })).status === 409, "cancelar a cancelada: 409");
  ok((await SF.post(pg(cG1.id), {})).status === 409, "pagar a cancelada: 409");
  ok((await SF.post(CB, { tenantId: G1.t.id, referencia: mes })).status === 409, "criar de novo a cancelada: 409 (pede para reabrir)");
  ok((await SF.post(`${CB}/${cG1.id}/reabrir`)).corpo.status === "aberta", "reabrir a cancelada");
  ok((await SF.post(`${CB}/${cG1.id}/reabrir`)).status === 409, "reabrir a que não está cancelada: 409");

  // ── O pagamento muda a situação da empresa ───────────────────────────────
  // Teste vencido (bloqueada) que paga: passa a ativa e o acesso volta na hora
  const CA2 = await loginCliente(A2.adm);
  ok((await CA2.get("/api/obras")).status === 402, "antes de pagar, a empresa com teste vencido está bloqueada");
  const cA2 = await SF.post(CB, { tenantId: A2.t.id, referencia: mes });
  ok(cA2.status === 201, "cobrança para a empresa em teste vencido");
  const pA2 = await SF.post(pg(cA2.corpo.id), { forma: "pix" });
  ok(pA2.status === 200, "pagamento da empresa em teste vencido");
  ok((await prisma.tenant.findUnique({ where: { id: A2.t.id }, select: { status: true } })).status === "ativo" && (await CA2.get("/api/obras")).status === 200, "pagar libera o acesso na hora e a empresa vira ativa");
  ok(!!(await prisma.assinatura.findUnique({ where: { tenantId: A2.t.id } })).ativadaEm, "a data de ativação da assinatura foi marcada");
  // Inadimplente: volta a ativa só se não restar cobrança vencida
  const vencida = (t, ref, valor = 349) => prisma.cobranca.create({ data: { tenantId: t.id, referencia: ref, descricao: "x", plano: "pro", valor, vencimento: somarDias(hoje, -10), gateway: "falso" } });
  const [g1, h1, h2] = [await vencida(G.t, "2026-01"), await vencida(H.t, "2026-01"), await vencida(H.t, "2026-02")];
  await SF.post(pg(g1.id), {});
  ok((await prisma.tenant.findUnique({ where: { id: G.t.id }, select: { status: true } })).status === "ativo", "inadimplente que quita a única vencida volta a ativa");
  await SF.post(pg(h1.id), {});
  ok((await prisma.tenant.findUnique({ where: { id: H.t.id }, select: { status: true } })).status === "inadimplente", "inadimplente que ainda deve outra vencida continua inadimplente");
  await SF.post(pg(h2.id), {});
  ok((await prisma.tenant.findUnique({ where: { id: H.t.id }, select: { status: true } })).status === "ativo", "e volta a ativa quando quita todas");
  ok((await prisma.tenant.findUnique({ where: { id: E.t.id }, select: { status: true } })).status === "suspenso", "suspensa não muda sozinha");

  // ── Listar, filtrar, exportar ────────────────────────────────────────────
  const lst = async q => (await SF.get(`${CB}?q=${marca}&limite=100${q}`)).corpo;
  const todas = await lst("");
  ok(todas.total >= 6 && !JSON.stringify(todas).includes("senha"), "lista: traz as cobranças das empresas de teste");
  ok((await lst("&status=paga")).itens.every(c => c.status === "paga"), "lista: filtro pagas");
  const atras = await lst("&status=atrasada");
  ok(atras.itens.every(c => c.situacao === "atrasada" && c.status === "aberta"), "lista: filtro atrasadas é só aberta com vencimento passado");
  ok((await lst("&status=cancelada")).itens.length === 0 && (await lst("&status=aberta")).itens.every(c => c.situacao === "aberta"), "lista: filtros cancelada e em aberto");
  ok((await lst(`&mes=${somarDias(hoje, -10).slice(0, 7)}`)).itens.every(c => c.vencimento.startsWith(somarDias(hoje, -10).slice(0, 7))), "lista: filtro por mês de vencimento");
  ok((await SF.get(`${CB}?q=${marca}-b&limite=100`)).corpo.total === 1, "lista: busca pelo nome da empresa");
  ok(typeof todas.soma === "number" && todas.soma > 0, "lista: soma do filtro");
  ok((await SF.get(`${CB}?q=${marca}&limite=2&pagina=2`)).corpo.itens.length === 2, "lista: paginação");
  const inj = await criarEmpresa("inj", {}, { valor: 100 });
  await prisma.tenant.update({ where: { id: inj.t.id }, data: { razaoSocial: `=HYPERLINK("http://exemplo.test") ${marca}` } });
  await SF.post(CB, { tenantId: inj.t.id, referencia: mes });
  const csv = await SF.get(`${CB}.csv?q=${marca}`);
  ok(csv.status === 200 && /text\/csv/.test(csv.cabecalhos["content-type"]) && /attachment/.test(csv.cabecalhos["content-disposition"]), "CSV: baixa como arquivo text/csv");
  ok(csv.texto.startsWith("\uFEFFNº;Empresa;CNPJ;Referência;Descrição;Plano;Ciclo;Valor;Vencimento;Situação;Pago em;Valor pago;Forma"), "CSV: BOM e cabeçalho em português, separado por ponto e vírgula");
  ok(/Teste Cobranca f /.test(csv.texto) && /;190,50;/.test(csv.texto) && /\d{2}\/\d{2}\/\d{4}/.test(csv.texto), "CSV: empresas, valor com vírgula decimal e datas dd/mm/aaaa");
  ok(csv.texto.includes(`"'=HYPERLINK(""http://exemplo.test"") ${marca}"`), "CSV: nome que começa com = não vira fórmula no Excel (apóstrofo na frente)");
  ok((await SN.get(`${CB}.csv`)).status === 403, "CSV: exige a permissão `financeiro` (403)");

  // ── Lado do cliente ──────────────────────────────────────────────────────
  const CB_ = await loginCliente(B.adm), CBu = await loginCliente(B.comum), CF = await loginCliente(F.adm);
  const resumo = (await CF.get("/api/assinatura/resumo")).corpo;
  ok(resumo.assinatura.valor === 200 && resumo.plano.nome === "Business" && resumo.faturas.length >= 1, "cliente: resumo da assinatura com plano, valor e faturas");
  ok(!JSON.stringify(resumo).includes("gatewayId") && !JSON.stringify(resumo).includes("motivoCancelamento") && !JSON.stringify(resumo).includes("registradaPor"), "cliente: nenhuma fatura traz dado interno de gateway ou cancelamento");
  ok(!resumo.faturas.some(f => f.situacao === "cancelada"), "cliente: faturas canceladas não aparecem");
  ok((await CBu.get("/api/assinatura/resumo")).status === 403, "cliente: usuário comum não vê a assinatura nem as faturas (403)");
  const rB = (await CB_.get("/api/assinatura/resumo")).corpo;
  ok(rB.faturas.every(f => ["aberta", "paga", "atrasada"].includes(f.situacao)) && rB.faturas[0].linkPagamento, "cliente: a fatura em aberto traz o link de pagamento");
  const rD = (await (await loginCliente(D.adm)).get("/api/assinatura/resumo")).corpo;
  ok(rD.cortesia === true && rD.assinatura === null, "cliente: cortesia não mostra valor");
  ok((await (await loginCliente(E.adm)).get("/api/assinatura/resumo")).status === 200, "cliente com conta suspensa ainda abre a assinatura e as faturas");
  const bad = await CF.patch("/api/assinatura/contato", { telefone: "123" });
  ok(bad.status === 400, "contato: telefone inválido: 400");
  ok((await CF.patch("/api/assinatura/contato", {})).status === 400, "contato: sem nada para atualizar: 400");
  const tel = await CF.patch("/api/assinatura/contato", { telefone: "(11) 98765-4321", aceiteMensagens: true });
  ok(tel.status === 200 && tel.corpo.telefone === "5511987654321" && tel.corpo.aceitouMensagens === true, "contato: telefone normalizado e aceite concedido");
  const ac1 = await prisma.tenant.findUnique({ where: { id: F.t.id }, select: { aceiteMensagensEm: true, aceiteMensagensTexto: true } });
  ok(/mensagens e notificações/.test(ac1.aceiteMensagensTexto) && /^\d{4}-\d{2}-\d{2}: /.test(ac1.aceiteMensagensTexto), "contato: grava o texto do servidor com a versão (nunca o do navegador)");
  await CF.patch("/api/assinatura/contato", { aceiteMensagens: true, telefone: "(21) 91234-5678" });
  const ac2 = await prisma.tenant.findUnique({ where: { id: F.t.id }, select: { aceiteMensagensEm: true, telefone: true } });
  ok(ac2.aceiteMensagensEm.getTime() === ac1.aceiteMensagensEm.getTime() && ac2.telefone === "5521912345678", "contato: aceitar de novo não troca a data do primeiro aceite; o telefone atualiza");
  ok((await CBu.patch("/api/assinatura/contato", { telefone: "(11) 98765-4321" })).status === 403, "contato: usuário comum: 403");
  const leit = await SN.post(`/api/painel/clientes/${F.t.id}/entrar`, { chamadoId: (await prisma.ticket.create({ data: { tenantId: F.t.id, abertoPorId: F.adm.id, canal: "ticket", assunto: "x", setor: "assinatura", status: "aberto", plano: "pro" } })).id });
  ok((await cliente(api.base, leit.corpo.token).patch("/api/assinatura/contato", { telefone: "(11) 98765-4321" })).status === 403, "contato: modo leitura da equipe não altera (403)");

  // ── Ativar com preço e primeira cobrança; cancelar e reativar ────────────
  const Z = await criarEmpresa("z", { status: "trial", trialAte: somarDias(hoje, 5) });
  const urlStatus = id => `/api/painel/clientes/${id}/status`;
  const corpoAtivar = { status: "ativo", assinatura: { valor: 320, diaVencimento: 7, primeiraCobranca: { referencia: mes, vencimento: somarDias(hoje, 5) } } };
  ok((await SE.post(urlStatus(Z.t.id), corpoAtivar)).status === 403, "ativar combinando preço e cobrança exige `financeiro` (403)");
  ok((await prisma.tenant.findUnique({ where: { id: Z.t.id }, select: { status: true } })).status === "trial", "e nada mudou (continua em teste)");
  const at = await ST.post(urlStatus(Z.t.id), corpoAtivar);
  ok(at.status === 200 && at.corpo.cobranca?.valor === 320 && at.corpo.cobranca.vencimento === somarDias(hoje, 5), "ativar: cria a assinatura combinada e a primeira cobrança");
  const aZ = await prisma.assinatura.findUnique({ where: { tenantId: Z.t.id } });
  ok(Number(aZ.valor) === 320 && aZ.diaVencimento === 7 && !!aZ.ativadaEm && aZ.canceladaEm === null, "ativar: assinatura com preço, dia e data de ativação");
  const Zc = await ST.post(urlStatus(Z.t.id), { status: "cancelado", motivo: "Pediu cancelamento" });
  ok(Zc.status === 200 && (await prisma.assinatura.findUnique({ where: { tenantId: Z.t.id } })).canceladaEm !== null, "cancelar marca a data de cancelamento");
  const rs = (await SF.get("/api/painel/financeiro/resumo")).corpo;
  ok(rs.cancelamentosNoMes === base.cancelamentosNoMes + 1, "indicador: cancelamentos do mês sobem");
  await ST.post(urlStatus(Z.t.id), { status: "ativo" });
  ok((await prisma.assinatura.findUnique({ where: { tenantId: Z.t.id } })).canceladaEm === null, "reativar apaga a data de cancelamento");
  ok((await ST.post(urlStatus(Z.t.id), { status: "inadimplente" })).status === 400, "marcar inadimplente exige motivo (400)");
  ok((await ST.post(urlStatus(Z.t.id), { status: "inadimplente", motivo: "Fatura vencida há 15 dias" })).status === 200, "marcar inadimplente com motivo");
  const Y = await criarEmpresa("y", { status: "trial", trialAte: somarDias(hoje, 5) });
  const ativY = await ST.post(urlStatus(Y.t.id), { status: "ativo", assinatura: { primeiraCobranca: { referencia: "2026-13" } } });
  ok(ativY.status === 200 && ativY.corpo.avisoCobranca && (await prisma.tenant.findUnique({ where: { id: Y.t.id }, select: { status: true } })).status === "ativo", "ativar com cobrança inválida: a ativação vale e a resposta avisa do problema");

  // ── Plano acompanha o preço de lista, mas não o preço combinado ──────────
  const P1 = await criarEmpresa("p1", { plano: "starter" }, { valor: 149 });
  const P2 = await criarEmpresa("p2", { plano: "starter" }, { valor: 99 });
  await ST.post(`/api/painel/clientes/${P1.t.id}/plano`, { plano: "pro", ciclo: "mensal" });
  await ST.post(`/api/painel/clientes/${P2.t.id}/plano`, { plano: "pro", ciclo: "mensal" });
  ok(Number((await prisma.assinatura.findUnique({ where: { tenantId: P1.t.id } })).valor) === 349, "plano: o valor que era o de lista acompanha o plano novo");
  ok(Number((await prisma.assinatura.findUnique({ where: { tenantId: P2.t.id } })).valor) === 99, "plano: o preço combinado (diferente da lista) fica como está");

  // ── Indicadores depois de tudo ───────────────────────────────────────────
  const fim = (await SF.get("/api/painel/financeiro/resumo")).corpo;
  ok(fim.mrr > base.mrr && fim.pagantes > base.pagantes, "indicadores: a receita recorrente cresceu com as assinaturas ativas");
  ok(fim.novosNoMes >= base.novosNoMes + 3, "indicadores: novos do mês contam as ativações");
  ok(fim.recebidoNoMes > base.recebidoNoMes, "indicadores: recebido no mês subiu com os pagamentos");
  ok(fim.emTeste >= base.emTeste && fim.testeAcabado >= base.testeAcabado - 1, "indicadores: contagem de empresas em teste");
  const planoPro = fim.porPlano.find(p => p.plano === "pro");
  ok(!!planoPro && planoPro.empresas >= 1, "indicadores: receita por plano");
  ok(!fim.semAssinatura.some(e => e.id === C.t.id) && !fim.semAssinatura.some(e => e.id === demo?.id), "indicadores: sem assinatura não inclui a configurada nem a interna");

  // ── Webhook (gateway de mentira) ─────────────────────────────────────────
  const W1 = await criarEmpresa("w1", { status: "trial", trialAte: somarDias(hoje, -1) }, { valor: 349 });
  const cW = (await SF.post(CB, { tenantId: W1.t.id, referencia: mes })).corpo;
  const CW = await loginCliente(W1.adm);
  ok((await CW.get("/api/obras")).status === 402, "webhook: antes do aviso, a empresa está bloqueada");
  ok((await webhook(aviso({ cobranca: cW.gatewayId, valor: 349 }, "e1"), "errado")).status === 401, "webhook: segredo errado: 401");
  ok((await webhook(aviso({ cobranca: cW.gatewayId }, "e1"), "")).status === 401, "webhook: sem segredo: 401");
  ok((await webhook({ tipo: "pagamento_confirmado" })).status === 400, "webhook: sem id do evento: 400");
  ok((await webhook(aviso({}, "e1"), SEGREDO, api.base, "asaas")).status === 404, "webhook: gateway desconhecido: 404");
  ok((await webhook(aviso({ cobranca: cW.gatewayId }, "e1"), SEGREDO, manual.base)).status === 404, "webhook: instância com gateway manual e sem segredo não recebe (404)");
  ok((await webhook(aviso({}, "e1"), SEGREDO, api.base, "manual")).status === 404, "webhook: o gateway manual não recebe webhook (404)");
  ok((await prisma.cobranca.findUnique({ where: { id: cW.id } })).status === "aberta", "webhook: avisos recusados não pagaram nada");
  const w1 = await webhook(aviso({ cobranca: cW.gatewayId, valor: 340, pagoEm: somarDias(hoje, -1), forma: "pix" }, "e1"));
  ok(w1.status === 200 && w1.corpo.resultado === "pago", "webhook: pagamento confirmado: 200 pago");
  const pW = await prisma.cobranca.findUnique({ where: { id: cW.id } });
  ok(pW.status === "paga" && pW.pagaEm === somarDias(hoje, -1) && Number(pW.valorPago) === 340 && pW.forma === "pix", "webhook: grava data, valor pago e forma do aviso");
  ok((await CW.get("/api/obras")).status === 200, "webhook: o pagamento libera a empresa bloqueada na hora");
  const w1b = await webhook(aviso({ cobranca: cW.gatewayId, valor: 340 }, "e1"));
  ok(w1b.status === 200 && w1b.corpo.resultado === "duplicado", "webhook: o mesmo aviso reenviado: 200 duplicado");
  ok(await prisma.eventoPagamento.count({ where: { gateway: "falso", eventoId: `${marca}-e1` } }) === 1, "webhook: um único evento gravado");
  const w2 = await webhook(aviso({ cobranca: cW.gatewayId }, "e2"));
  ok(w2.status === 200 && /ignorado/.test(w2.corpo.resultado), "webhook: outro aviso para cobrança já paga: ignorado, sem erro");
  ok((await webhook(aviso({ cobranca: "fk_inexistente" }, "e3"))).corpo.resultado.startsWith("ignorado"), "webhook: cobrança desconhecida: 200 ignorado (o gateway não insiste)");
  ok((await webhook(aviso({ cobranca: cW.gatewayId }, "e4", { tipo: "qualquer_coisa" }))).corpo.resultado.startsWith("ignorado"), "webhook: tipo sem efeito: ignorado");
  const w5 = await webhook(aviso({ cobranca: cW.gatewayId }, "e5", { tipo: "pagamento_estornado" }));
  ok(w5.corpo.resultado === "estornado" && (await prisma.cobranca.findUnique({ where: { id: cW.id } })).status === "aberta", "webhook: estorno devolve a cobrança para em aberto");
  // Avisos iguais ao mesmo tempo: só um vale
  const cW2 = (await SF.post(CB, { tenantId: W1.t.id, referencia: `${Number(mes.slice(0, 4)) + 1}-01` })).corpo;
  const rajada = await Promise.all(Array.from({ length: 6 }, () => webhook(aviso({ cobranca: cW2.gatewayId }, "e6"))));
  ok(rajada.every(r => r.status === 200), "webhook: rajada do mesmo aviso: todos respondem 200");
  ok(rajada.filter(r => r.corpo.resultado === "pago").length === 1 && rajada.filter(r => r.corpo.resultado === "duplicado").length === 5, "webhook: rajada do mesmo aviso: só um paga, os outros são duplicados");
  ok(await prisma.eventoPagamento.count({ where: { gateway: "falso", eventoId: `${marca}-e6` } }) === 1, "webhook: rajada: um único evento gravado");
  // Data futura e forma inválida no aviso não quebram nada
  const cW3 = (await SF.post(CB, { tenantId: W1.t.id, referencia: `${Number(mes.slice(0, 4)) + 1}-02` })).corpo;
  await webhook(aviso({ cobranca: cW3.gatewayId, pagoEm: somarDias(hoje, 30), forma: "bitcoin" }, "e7"));
  const p3 = await prisma.cobranca.findUnique({ where: { id: cW3.id } });
  ok(p3.status === "paga" && p3.pagaEm === hoje && p3.forma === null, "webhook: data futura vira hoje e forma inválida é descartada");
  // Instância manual: cobrança sem gateway
  const mT = await loginEquipe(fin, manual.base);
  const cM = (await mT.post(CB, { tenantId: F.t.id, referencia: `${Number(mes.slice(0, 4)) + 2}-01` })).corpo;
  ok(cM.gateway === "manual" && cM.gatewayId === null && cM.linkPagamento === null, "gateway manual: cobrança sem id nem link de pagamento");

  // ── Auditoria ────────────────────────────────────────────────────────────
  const aud = new Set((await prisma.auditoriaEquipe.findMany({ where: { equipeId: { in: equipeCriada } }, select: { acao: true } })).map(a => a.acao));
  for (const a of ["cobranca_criou", "cobranca_gerou_mes", "cobranca_pagamento", "cobranca_estorno", "cobranca_cancelou", "cobranca_reabriu", "cliente_assinatura", "cliente_status"]) ok(aud.has(a), `auditoria registrou: ${a}`);
} finally {
  await api.parar(); await manual.parar();
  const r = await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas }, cnpj: { startsWith: "TESTE-COB-" } } });
  const ev = await prisma.eventoPagamento.deleteMany({ where: { gateway: "falso", eventoId: { startsWith: marca } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: equipeCriada } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const q = await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipeCriada }, email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} empresa(s), ${ev.count} evento(s) de pagamento e ${q.count} pessoa(s) da equipe de teste apagadas`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
