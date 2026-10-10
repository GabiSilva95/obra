// Ponta a ponta de Clientes e ciclo de vida: lista, detalhe, ações, bloqueio da conta e "entrar como o cliente" (leitura).
// API real e banco real; apaga tudo o que cria.   node --env-file=.env scripts/painel/e2e-clientes.mjs
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../server/db.js";
import { hojeBR, somarDias } from "../../server/utils/datas.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA = "Senha-Teste-2026";
const equipeCriada = [], empresasCriadas = [];
const hoje = hojeBR();

async function criarEquipe(nome, perms, papel = "atendente") {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel, permissoes: perms, trocarSenha: false } });
  equipeCriada.push(e.id);
  return e;
}
async function criarEmpresa(nome, dados) {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Clientes ${nome} ${marca}`, cnpj: `TESTE-CLI-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano: "pro", ...dados } });
  empresasCriadas.push(t.id);
  const adm = await prisma.user.create({ data: { tenantId: t.id, nome: `Admin ${nome}`, email: `${marca}-${nome}-adm@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "tenant_admin" } });
  await prisma.user.create({ data: { tenantId: t.id, nome: `Pessoa ${nome}`, email: `${marca}-${nome}-u@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role: "user" } });
  return { tenant: t, adm };
}

const api = await iniciarApi(3017, { SUPORTE_HORARIO_TESTE: "sempre" });
try {
  const anon = cliente(api.base);
  const loginCliente = async u => {
    const r = await anon.post("/api/auth/login", { email: u.email, senha: SENHA });
    return { http: cliente(api.base, r.corpo.token), corpo: r.corpo, status: r.status };
  };
  const loginEquipe = async e => cliente(api.base, (await anon.post("/api/painel/auth/login", { email: e.email, senha: SENHA })).corpo.token);

  const e1 = await criarEmpresa("e1", { status: "trial", trialAte: somarDias(hoje, 10), telefone: "5511987654321", aceiteMensagensEm: new Date(), aceiteMensagensTexto: "teste", aceiteMensagensIp: "1.2.3.4", notasInternas: "nota combinada" });
  const e2 = await criarEmpresa("e2", { status: "trial", trialAte: somarDias(hoje, -1) }); // teste vencido ontem
  const e3 = await criarEmpresa("e3", { status: "ativo", plano: "starter" });
  const ver = await criarEquipe("ver", ["clientes"]);
  const edit = await criarEquipe("edit", ["clientes", "clientes_editar"]);
  const soSuporte = await criarEquipe("sup", ["suporte"]);
  const SV = await loginEquipe(ver), SE = await loginEquipe(edit), SS = await loginEquipe(soSuporte);
  const C1 = await loginCliente(e1.adm);

  // ── Permissões ───────────────────────────────────────────────────────────
  ok((await SS.get("/api/painel/clientes")).status === 403, "sem a permissão `clientes`: lista 403");
  ok((await SS.get(`/api/painel/clientes/${e1.tenant.id}`)).status === 403, "sem a permissão `clientes`: detalhe 403");
  ok((await anon.get("/api/painel/clientes")).status === 401, "sem token: 401");
  ok((await C1.http.get("/api/painel/clientes")).status === 401, "token do cliente não abre o painel (401)");
  ok((await SV.get("/api/painel/clientes")).status === 200, "com `clientes`: lista 200");
  for (const [rotulo, chamada] of [
    ["plano", () => SV.post(`/api/painel/clientes/${e1.tenant.id}/plano`, { plano: "starter" })],
    ["estender teste", () => SV.post(`/api/painel/clientes/${e1.tenant.id}/estender-teste`, { dias: 7 })],
    ["status", () => SV.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "suspenso", motivo: "teste" })],
    ["notas", () => SV.patch(`/api/painel/clientes/${e1.tenant.id}/notas`, { notas: "x" })],
  ]) ok((await chamada()).status === 403, `só ver não basta para mudar ${rotulo} (403)`);

  // ── Lista ────────────────────────────────────────────────────────────────
  const lista = (await SV.get(`/api/painel/clientes?q=${marca}&limite=50`)).corpo;
  ok(lista.total === 3 && lista.itens.length === 3, "busca pela marca do teste acha as 3 empresas");
  ok(!JSON.stringify(lista).includes("senha"), "a lista nunca traz senha");
  const l1 = lista.itens.find(i => i.id === e1.tenant.id), l2 = lista.itens.find(i => i.id === e2.tenant.id), l3 = lista.itens.find(i => i.id === e3.tenant.id);
  ok(l1.situacao === "trial" && l1.diasRestantes === 10 && l1.bloqueada === false, "lista: teste em dia com 10 dias restantes");
  ok(l2.situacao === "trial_expirado" && l2.bloqueada === true && l2.diasRestantes === -1, "lista: teste vencido ontem aparece como 'teste acabado'");
  ok(l3.situacao === "ativo" && l1.usuarios === 2 && l1.obras === 0, "lista: ativo, e contagem de usuários e obras");
  const filtro = async q => (await SV.get(`/api/painel/clientes?q=${marca}&${q}`)).corpo.itens.map(i => i.id);
  ok(JSON.stringify(await filtro("status=trial")) === JSON.stringify([e1.tenant.id]), "filtro status=trial não inclui o vencido");
  ok(JSON.stringify(await filtro("status=trial_expirado")) === JSON.stringify([e2.tenant.id]), "filtro status=trial_expirado");
  ok(JSON.stringify(await filtro("status=ativo")) === JSON.stringify([e3.tenant.id]), "filtro status=ativo");
  ok(JSON.stringify(await filtro("plano=starter")) === JSON.stringify([e3.tenant.id]), "filtro por plano");
  ok((await SV.get(`/api/painel/clientes?q=${marca}-e1`)).corpo.total === 1, "busca por parte do e-mail");
  ok((await SV.get(`/api/painel/clientes?q=987654321`)).corpo.itens.some(i => i.id === e1.tenant.id), "busca pelo telefone");
  ok(Object.keys(lista.resumo).sort().join() === "ativo,cancelado,inadimplente,suspenso,trial,trial_expirado", "resumo traz um número por situação");
  ok((await SV.get(`/api/painel/clientes?q=${marca}&limite=2&pagina=2`)).corpo.itens.length === 1, "paginação");
  const demo = await prisma.tenant.findFirst({ where: { email: "admin@teste.com" }, select: { id: true } });
  if (demo) ok((await SV.get(`/api/painel/clientes?q=admin@teste.com`)).corpo.itens.find(i => i.id === demo.id)?.interna === true, "a conta interna vem marcada na lista");

  // ── Detalhe ──────────────────────────────────────────────────────────────
  const chamado = (await C1.http.post("/api/suporte/chamados", { assunto: "Dúvida de teste", setor: "obras", texto: "Como crio uma obra?" })).corpo;
  const d = (await SV.get(`/api/painel/clientes/${e1.tenant.id}`)).corpo;
  ok(d.razaoSocial.includes("e1") && d.telefone === "5511987654321" && d.aceite.ip === "1.2.3.4" && d.notasInternas === "nota combinada", "detalhe: dados, telefone, aceite e notas");
  ok(d.usuariosLista.length === 2 && !JSON.stringify(d).includes("senha"), "detalhe: usuários da empresa, sem senha");
  ok(d.chamados.length === 1 && d.chamados[0].id === chamado.id && d.chamadosAbertos === 1, "detalhe: chamados da empresa");
  ok(d.uso.usuarios === 2 && d.uso.usuariosLimite === 5 && d.uso.obrasLimite === 15, "detalhe: uso e limites do plano");
  ok((await SV.get("/api/painel/clientes/id-que-nao-existe")).status === 404, "empresa inexistente: 404");

  // ── O cliente não enxerga o que é da equipe ──────────────────────────────
  const minha = (await C1.http.get("/api/assinatura")).corpo;
  ok(minha.situacao === "trial" && minha.diasRestantes === 10 && !("notasInternas" in minha) && !("motivoStatus" in minha) && !("aceiteMensagensIp" in minha), "cliente: /assinatura traz a situação e nada interno");
  ok(!JSON.stringify(C1.corpo).includes("nota combinada"), "cliente: o login não traz as notas internas");

  // ── Plano ────────────────────────────────────────────────────────────────
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/plano`, { plano: "inventado" })).status === 400, "plano inválido: 400");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/plano`, { plano: "pro", ciclo: "mensal" })).status === 400, "mesmo plano e ciclo: 400");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/plano`, { plano: "enterprise", ciclo: "anual" })).status === 200, "alterar plano e ciclo");
  const aposPlano = await prisma.tenant.findUnique({ where: { id: e1.tenant.id } });
  ok(aposPlano.plano === "enterprise" && aposPlano.ciclo === "anual", "plano gravado");

  // ── Estender teste ───────────────────────────────────────────────────────
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/estender-teste`, { dias: 0 })).status === 400, "estender com 0 dia: 400");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/estender-teste`, { dias: 999 })).status === 400, "estender além do máximo: 400");
  ok((await SE.post(`/api/painel/clientes/${e3.tenant.id}/estender-teste`, { dias: 7 })).status === 409, "conta ativa não tem teste para estender (409)");
  const est = await SE.post(`/api/painel/clientes/${e1.tenant.id}/estender-teste`, { dias: 7, motivo: "pediu mais tempo" });
  ok(est.status === 200 && est.corpo.trialAte === somarDias(hoje, 17), "estender soma ao fim do teste (10 + 7 dias)");

  // ── Teste vencido: o cliente entra, mas só alcança assinatura e suporte ──
  const C2 = await loginCliente(e2.adm);
  ok(C2.status === 200 && C2.corpo.tenant.bloqueada === true && C2.corpo.tenant.situacao === "trial_expirado", "teste vencido: o login funciona e avisa que está bloqueada");
  const r402 = await C2.http.get("/api/obras");
  ok(r402.status === 402 && r402.corpo.codigo === "CONTA_BLOQUEADA" && r402.corpo.situacao === "trial_expirado", "teste vencido: /obras responde 402 CONTA_BLOQUEADA");
  for (const caminho of ["/api/financeiro/resumo", "/api/cadastros/insumos", "/api/usuarios", "/api/plano/uso", "/api/me/preferencias"]) ok((await C2.http.get(caminho)).status === 402, `teste vencido: ${caminho} responde 402`);
  ok((await C2.http.post("/api/obras", { nome: "x" })).status === 402, "teste vencido: criar obra responde 402");
  ok((await C2.http.get("/api/assinatura")).status === 200, "teste vencido: /assinatura liberada");
  ok((await C2.http.get("/api/suporte/config")).status === 200, "teste vencido: /suporte liberado");
  const chamadoBloq = await C2.http.post("/api/suporte/chamados", { assunto: "Quero assinar", setor: "assinatura", texto: "Como faço para continuar?" });
  ok(chamadoBloq.status === 201, "teste vencido: ainda dá para abrir chamado (setor Assinatura e cobrança)");
  ok((await anon.post("/api/auth/refresh", { refreshToken: C2.corpo.refreshToken })).status === 200, "teste vencido: a sessão ainda renova (refresh)");
  ok(!JSON.stringify(r402.corpo).includes("motivo"), "a resposta do bloqueio não vaza motivo interno");

  // Estender o teste vencido libera na hora (a equipe é a mesma instância da API: o cache foi esquecido)
  const lib = await SE.post(`/api/painel/clientes/${e2.tenant.id}/estender-teste`, { dias: 5 });
  ok(lib.status === 200 && lib.corpo.trialAte === somarDias(hoje, 5), "teste vencido recomeça a contar de hoje");
  ok((await C2.http.get("/api/obras")).status === 200, "estender o teste libera o acesso na hora");

  // ── Suspender, reativar, cancelar ────────────────────────────────────────
  ok((await C1.http.get("/api/obras")).status === 200, "antes: cliente em teste acessa normalmente (e a situação fica guardada)");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "suspenso" })).status === 400, "suspender sem motivo: 400");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "voando", motivo: "teste" })).status === 400, "status inválido: 400");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "suspenso", motivo: "Pagamento não confirmado" })).status === 200, "suspender com motivo");
  const apos = await C1.http.get("/api/obras");
  ok(apos.status === 402 && apos.corpo.situacao === "suspenso", "suspensa: o cliente é bloqueado na hora, sem esperar o cache");
  ok(!JSON.stringify(apos.corpo).includes("Pagamento não confirmado"), "suspensa: o motivo interno não vai ao cliente");
  ok((await C1.http.get("/api/assinatura")).corpo.situacao === "suspenso", "suspensa: a tela de assinatura sabe o que houve");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "suspenso", motivo: "de novo" })).status === 409, "suspender quem já está suspenso: 409");
  const detSusp = (await SV.get(`/api/painel/clientes/${e1.tenant.id}`)).corpo;
  ok(detSusp.situacao === "suspenso" && detSusp.motivoStatus === "Pagamento não confirmado", "equipe vê o motivo da suspensão");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "ativo" })).status === 200, "reativar (ativar)");
  ok((await C1.http.get("/api/obras")).status === 200, "reativada: o cliente volta na hora");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "cancelado", motivo: "Pediu cancelamento" })).status === 200, "cancelar com motivo");
  ok((await C1.http.get("/api/obras")).status === 402, "cancelada: bloqueada");
  ok((await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "ativo" })).status === 200, "reativar a cancelada");

  // ── Conta interna da casa ────────────────────────────────────────────────
  if (demo) {
    const r = await SE.post(`/api/painel/clientes/${demo.id}/status`, { status: "suspenso", motivo: "não deve passar" });
    ok(r.status === 409, "a conta interna não pode ser suspensa pelo painel (409)");
    ok((await prisma.tenant.findUnique({ where: { id: demo.id }, select: { status: true } })).status === "ativo", "e continua ativa no banco");
  }

  // ── Notas internas ───────────────────────────────────────────────────────
  ok((await SE.patch(`/api/painel/clientes/${e1.tenant.id}/notas`, { notas: "Prefere contato por WhatsApp" })).status === 200, "salvar notas internas");
  ok((await SV.get(`/api/painel/clientes/${e1.tenant.id}`)).corpo.notasInternas === "Prefere contato por WhatsApp", "notas gravadas");
  ok(!JSON.stringify((await C1.http.get("/api/assinatura")).corpo).includes("WhatsApp"), "notas nunca saem para o cliente");

  // ── Entrar como o cliente (leitura) ──────────────────────────────────────
  const entrar = (S, corpo, id = e1.tenant.id) => S.post(`/api/painel/clientes/${id}/entrar`, corpo);
  ok((await entrar(SS, { chamadoId: chamado.id })).status === 403, "sem `clientes` não entra na conta (403)");
  ok((await entrar(SV, {})).status === 400, "entrar sem chamado: 400");
  ok((await entrar(SV, { chamadoId: chamadoBloq.corpo.id })).status === 400, "entrar com chamado de OUTRA empresa: 400");
  ok((await entrar(SV, { chamadoId: 999999999 })).status === 400, "entrar com chamado que não existe: 400");
  // Uma resposta da equipe deixa o chamado "não lido" para o cliente: o modo leitura não pode marcar como lido
  const staffSup = await criarEquipe("resp", ["suporte"]);
  const SR = await loginEquipe(staffSup);
  ok((await SR.post(`/api/painel/chamados/${chamado.id}/mensagens`, { texto: "Vamos ver isso." })).status === 201, "equipe responde o chamado");
  const antes = await prisma.ticket.findUnique({ where: { id: chamado.id }, select: { naoLidoCliente: true } });
  const ent = await entrar(SV, { chamadoId: chamado.id });
  ok(ent.status === 200 && ent.corpo.token && ent.corpo.chamado === chamado.id && ent.corpo.user.role === "tenant_admin" && ent.corpo.tenant.id === e1.tenant.id, "entrar como o cliente: token, chamado e dados da sessão");
  const payload = jwt.decode(ent.corpo.token);
  ok(payload.leitura === true && payload.tenantId === e1.tenant.id && payload.exp - payload.iat === 30 * 60 && payload.equipeId === ver.id && payload.chamadoId === chamado.id, "o token é de leitura, dura 30 minutos e traz quem entrou e por qual chamado");
  ok(!("refreshToken" in ent.corpo), "sem refresh: o acesso expira sozinho");
  const L = cliente(api.base, ent.corpo.token);
  ok((await L.get("/api/obras")).status === 200 && (await L.get("/api/cadastros/insumos")).status === 200 && (await L.get("/api/financeiro/resumo")).status === 200, "modo leitura: consegue ler as telas do cliente");
  for (const [rotulo, chamada] of [
    ["criar obra", () => L.post("/api/obras", { nome: "x" })], ["alterar", () => L.put("/api/obras/1", { nome: "x" })], ["apagar", () => L.del("/api/obras/1")],
    ["abrir chamado", () => L.post("/api/suporte/chamados", { assunto: "a", setor: "obras", texto: "b" })],
    ["responder chamado", () => L.post(`/api/suporte/chamados/${chamado.id}/mensagens`, { texto: "x" })],
    ["preferências do tour", () => L.patch("/api/me/preferencias", { ocultarTour: true })],
    ["registrar baixa", () => L.post("/api/financeiro/titulos/1/baixas", {})],
  ]) {
    const r = await chamada();
    ok(r.status === 403 && r.corpo.codigo === "MODO_LEITURA", `modo leitura recusa: ${rotulo}`);
  }
  ok((await L.get("/api/suporte/chat/1")).status === 403 && (await L.post("/api/suporte/chat/entrar", { setor: "obras" })).status === 403, "modo leitura não toca no chat (presença)");
  ok((await L.get("/api/suporte/resumo")).corpo.chatAtivo === null, "modo leitura não herda o chat de quem está olhando");
  const detLeitura = await L.get(`/api/suporte/chamados/${chamado.id}`);
  ok(detLeitura.status === 200 && detLeitura.corpo.mensagens.some(m => /consultou a sua conta em modo leitura/.test(m.texto)), "o chamado ganhou a mensagem de sistema avisando o cliente");
  const depois = await prisma.ticket.findUnique({ where: { id: chamado.id }, select: { naoLidoCliente: true } });
  ok(antes.naoLidoCliente === 1 && depois.naoLidoCliente === 1, "ler o chamado em modo leitura NÃO marca como lido para o cliente");
  const detCliente = (await C1.http.get(`/api/suporte/chamados/${chamado.id}`)).corpo;
  ok(detCliente.mensagens.some(m => /Equipe ver|consultou a sua conta/.test(m.texto)) && !JSON.stringify(detCliente).includes("nota"), "o cliente vê o aviso da consulta, e continua sem ver nota interna");
  ok((await prisma.ticket.findUnique({ where: { id: chamado.id }, select: { naoLidoCliente: true } })).naoLidoCliente === 0, "o cliente de verdade lendo marca como lido");
  // Conta bloqueada: a equipe em leitura ainda enxerga os dados (é para investigar)
  await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "suspenso", motivo: "teste de leitura" });
  ok((await C1.http.get("/api/obras")).status === 402 && (await L.get("/api/obras")).status === 200, "conta suspensa: o cliente é bloqueado, a equipe em leitura ainda vê os dados");
  await SE.post(`/api/painel/clientes/${e1.tenant.id}/status`, { status: "ativo" });
  ok(!("token" in (await C1.http.get("/api/assinatura")).corpo), "o cliente nunca recebe tokens de leitura");
  // O token de leitura vive só 30 min: um vencido é recusado
  const vencido = jwt.sign({ userId: 1, tenantId: e1.tenant.id, role: "tenant_admin", leitura: true }, process.env.JWT_SECRET, { expiresIn: -10 });
  ok((await cliente(api.base, vencido).get("/api/obras")).status === 401, "token de leitura vencido: 401");

  // ── Auditoria ────────────────────────────────────────────────────────────
  const aud = (await SE.get(`/api/painel/auditoria?tenantId=${e1.tenant.id}`)).status; // `edit` não tem a permissão equipe
  ok(aud === 403, "a auditoria continua exclusiva de quem tem a permissão `equipe`");
  const linhas = await prisma.auditoriaEquipe.findMany({ where: { tenantId: e1.tenant.id }, select: { acao: true, equipeId: true, ticketId: true, detalhe: true } });
  const acoes = new Set(linhas.map(l => l.acao));
  for (const a of ["cliente_plano", "cliente_teste", "cliente_status", "cliente_notas", "cliente_entrou_leitura"]) ok(acoes.has(a), `auditoria registrou: ${a}`);
  ok(linhas.find(l => l.acao === "cliente_entrou_leitura").ticketId === chamado.id && linhas.find(l => l.acao === "cliente_entrou_leitura").equipeId === ver.id, "a entrada em leitura guarda quem e o chamado");
  ok(linhas.find(l => l.acao === "cliente_status" && /Pagamento/.test(l.detalhe)), "o motivo da suspensão ficou na auditoria");
} finally {
  await api.parar();
  const r = await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas }, cnpj: { startsWith: "TESTE-CLI-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: equipeCriada } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const q = await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipeCriada }, email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} empresa(s) e ${q.count} pessoa(s) da equipe de teste apagadas`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
