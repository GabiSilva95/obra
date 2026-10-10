// Ponta a ponta do suporte (chamados e chat ao vivo na fila), API real e banco real. Apaga tudo o que cria.
//
//   node --env-file=.env scripts/painel/e2e-suporte.mjs
//
// Cria empresas de teste ("Teste Suporte ...") e uma equipe de teste. O horário do chat vem de SUPORTE_HORARIO_TESTE.
import bcrypt from "bcryptjs";
import prisma from "../../server/db.js";
import { cliente, esperar, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA = "Senha-Teste-2026";
const equipeCriada = [], empresasCriadas = [];
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]).toString("base64");

async function criarEquipe(nome, perms, papel = "atendente") {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel, permissoes: perms, trocarSenha: false } });
  equipeCriada.push(e.id);
  return e;
}
async function criarEmpresa(nome, usuarios, plano = "pro") {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Suporte ${nome} ${marca}`, cnpj: `TESTE-SUP-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano } });
  empresasCriadas.push(t.id);
  const us = {};
  for (const [chave, role] of usuarios) us[chave] = await prisma.user.create({ data: { tenantId: t.id, nome: `Pessoa ${chave}`, email: `${marca}-${nome}-${chave}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), role } });
  return { tenant: t, usuarios: us };
}

const api = await iniciarApi(3015, { SUPORTE_HORARIO_TESTE: "sempre" });
const fora = await iniciarApi(3016, { SUPORTE_HORARIO_TESTE: "nunca" });
try {
  const anon = cliente(api.base);
  const loginCliente = async (u, base = api.base) => cliente(base, (await cliente(base).post("/api/auth/login", { email: u.email, senha: SENHA })).corpo.token);
  const loginEquipe = async (e, base = api.base) => cliente(base, (await cliente(base).post("/api/painel/auth/login", { email: e.email, senha: SENHA })).corpo.token);

  const e1 = await criarEmpresa("e1", [["adm", "tenant_admin"], ["u1", "user"], ["u2", "user"], ["u3", "user"]]);
  const e2 = await criarEmpresa("e2", [["adm", "tenant_admin"]], "starter");
  const A1 = await loginCliente(e1.usuarios.adm), U1 = await loginCliente(e1.usuarios.u1), U2 = await loginCliente(e1.usuarios.u2), U3 = await loginCliente(e1.usuarios.u3), B1 = await loginCliente(e2.usuarios.adm);
  const staffA = await criarEquipe("ana", ["suporte", "clientes"]);
  const staffB = await criarEquipe("beto", ["suporte"]);
  const sup = await criarEquipe("sup", ["suporte", "suporte_supervisor"]);
  const semSuporte = await criarEquipe("fin", ["financeiro"]);
  const SA = await loginEquipe(staffA), SB = await loginEquipe(staffB), SS = await loginEquipe(sup), SF = await loginEquipe(semSuporte);

  // ── Isolamento ───────────────────────────────────────────────────────────
  ok((await anon.get("/api/suporte/config")).status === 401, "suporte do cliente sem token: 401");
  const tokenEquipe = (await cliente(api.base).post("/api/painel/auth/login", { email: staffA.email, senha: SENHA })).corpo.token;
  ok((await cliente(api.base, tokenEquipe).get("/api/suporte/chamados")).status === 401, "token da equipe não abre o suporte do cliente (401)");
  ok((await SF.get("/api/painel/atendimento/estado")).status === 403, "equipe sem a permissão `suporte` não vê o atendimento (403)");
  ok((await SF.get("/api/painel/chamados")).status === 403, "nem a lista de chamados (403)");

  // ── Abrir chamado ────────────────────────────────────────────────────────
  const cfg = (await U1.get("/api/suporte/config")).corpo;
  ok(cfg.prazoRespostaHoras === 24 && cfg.chat.aberto === true && cfg.chat.horario.length > 0, "config: prazo do plano Business (24 h) e horário do chat");
  ok((await B1.get("/api/suporte/config")).corpo.prazoRespostaHoras === 48, "config: prazo do plano Starter (48 h)");
  const base = { assunto: "Não consigo lançar a compra", setor: "estoque_compras", texto: "Ao salvar a ordem de compra aparece um erro." };
  ok((await U1.post("/api/suporte/chamados", { ...base, assunto: "" })).status === 400, "chamado sem assunto: 400");
  ok((await U1.post("/api/suporte/chamados", { ...base, setor: "inventado" })).status === 400, "chamado com setor inválido: 400");
  ok((await U1.post("/api/suporte/chamados", { ...base, texto: "x".repeat(5001) })).status === 400, "texto grande demais: 400");
  ok((await U1.post("/api/suporte/chamados", { ...base, anexo: { nome: "virus.exe", dados: "AAAA" } })).status === 400, "anexo de tipo não aceito: 400");
  const c1 = await U1.post("/api/suporte/chamados", { ...base, bloqueante: true, anexo: { nome: "print.png", dados: PNG } });
  ok(c1.status === 201 && c1.corpo.prioridade === "alta" && c1.corpo.status === "aberto" && c1.corpo.numero > 0, "chamado aberto: prioridade alta quando bloqueia o trabalho");
  const c2 = await A1.post("/api/suporte/chamados", { ...base, assunto: "Dúvida no relatório", setor: "relatorios" });
  const c3 = await U2.post("/api/suporte/chamados", { ...base, assunto: "Erro no estoque", setor: "estoque_compras" });
  const c4 = await B1.post("/api/suporte/chamados", { ...base, assunto: "Outra empresa", setor: "obras" });
  ok(c2.corpo.numero > c1.corpo.numero && c3.corpo.numero > c2.corpo.numero, "os números seguem a ordem de abertura");

  // ── Visibilidade ─────────────────────────────────────────────────────────
  const listaAdm = (await A1.get("/api/suporte/chamados")).corpo.map(c => c.id);
  ok([c1, c2, c3].every(c => listaAdm.includes(c.corpo.id)) && !listaAdm.includes(c4.corpo.id), "administrador vê os chamados de toda a empresa, e só dela");
  ok(JSON.stringify((await U1.get("/api/suporte/chamados")).corpo.map(c => c.id)) === JSON.stringify([c1.corpo.id]), "usuário comum vê só os seus");
  ok((await U1.get(`/api/suporte/chamados/${c2.corpo.id}`)).status === 404, "usuário comum não abre chamado de outro colega (404)");
  ok((await B1.get(`/api/suporte/chamados/${c1.corpo.id}`)).status === 404, "outra empresa não abre o chamado (404)");
  ok((await A1.get(`/api/suporte/chamados/${c1.corpo.id}`)).status === 200, "mas o administrador da empresa abre o de um colega");

  // ── Atendimento do chamado ───────────────────────────────────────────────
  const det = (await U1.get(`/api/suporte/chamados/${c1.corpo.id}`)).corpo;
  ok(det.mensagens.length === 1 && det.mensagens[0].anexos.length === 1 && det.posicaoFila >= 1, "detalhe traz a mensagem, o anexo e a posição na fila");
  const anexoId = det.mensagens[0].anexos[0].id;
  const baixa = await fetch(`${api.base}/api/suporte/chamados/${c1.corpo.id}/anexos/${anexoId}`, { headers: { Authorization: `Bearer ${(await cliente(api.base).post("/api/auth/login", { email: e1.usuarios.u1.email, senha: SENHA })).corpo.token}` } });
  ok(baixa.status === 200 && baixa.headers.get("content-type") === "image/png" && /attachment/.test(baixa.headers.get("content-disposition")) && baixa.headers.get("x-content-type-options") === "nosniff", "o dono baixa o anexo, como arquivo e com nosniff");
  ok((await B1.get(`/api/suporte/chamados/${c1.corpo.id}/anexos/${anexoId}`)).status === 404, "outra empresa não baixa o anexo (404)");

  const est1 = (await SA.get("/api/painel/atendimento/estado")).corpo;
  const ordem = est1.chamados.map(c => c.id);
  ok(ordem.indexOf(c1.corpo.id) < ordem.indexOf(c2.corpo.id) && ordem.indexOf(c2.corpo.id) < ordem.indexOf(c3.corpo.id), "a equipe vê os chamados na ordem de solicitação");
  const vista = est1.chamados.find(c => c.id === c1.corpo.id);
  ok(vista.empresa.nome.includes("Teste Suporte e1") && vista.setor === "estoque_compras" && vista.setorRotulo === "Estoque e Compras" && vista.entrouNaFilaEm && vista.prazo.venceEm && vista.prazo.situacao === "ok", "cada chamado mostra empresa, setor, há quanto tempo e o prazo do plano");
  ok((await SA.patch(`/api/painel/chamados/${c3.corpo.id}`, { prioridade: "urgente" })).status === 200, "a equipe marca um chamado como urgente");
  const ordem2 = (await SA.get("/api/painel/atendimento/estado")).corpo.chamados.map(c => c.id).filter(id => [c1, c2, c3].some(c => c.corpo.id === id));
  ok(JSON.stringify(ordem2) === JSON.stringify([c3.corpo.id, c1.corpo.id, c2.corpo.id]), "o urgente sobe ao topo; o resto segue a ordem de solicitação");

  const resp = await SA.post(`/api/painel/chamados/${c1.corpo.id}/mensagens`, { texto: "Vamos olhar isso agora." });
  ok(resp.status === 201 && resp.corpo.status === "aguardando_cliente" && resp.corpo.primeiraRespostaEm && resp.corpo.atendente?.id === staffA.id, "a resposta registra o primeiro retorno, atribui quem respondeu e aguarda o cliente");
  ok((await SA.post(`/api/painel/chamados/${c1.corpo.id}/mensagens`, { texto: "Anotação só da equipe: cliente já abriu 3 chamados.", interna: true })).status === 201, "nota interna criada");
  ok((await U1.get("/api/suporte/resumo")).corpo.respondidos.some(r => r.id === c1.corpo.id), "o resumo do cliente avisa do chamado respondido (para o sino)");
  ok((await A1.get("/api/suporte/resumo")).corpo.respondidos.some(r => r.id === c1.corpo.id), "e o administrador da empresa também vê o aviso");
  const doCliente = (await U1.get(`/api/suporte/chamados/${c1.corpo.id}`)).corpo;
  ok(doCliente.mensagens.length === 2 && doCliente.mensagens.every(m => !("interna" in m)) && !JSON.stringify(doCliente).includes("Anotação só da equipe"), "a nota interna não aparece para o cliente");
  ok(doCliente.mensagens[1].autorNome === "Equipe (Suporte)", "o cliente vê só o primeiro nome do atendente");
  ok((await SA.get(`/api/painel/chamados/${c1.corpo.id}`)).corpo.mensagens.length === 3, "a equipe vê as três mensagens");
  ok((await U1.get("/api/suporte/chamados")).corpo[0].naoLido === 0, "ao abrir o chamado, o aviso some");

  const volta = await U1.post(`/api/suporte/chamados/${c1.corpo.id}/mensagens`, { texto: "Obrigado, aguardo." });
  ok(volta.status === 201 && volta.corpo.status === "em_atendimento", "o cliente responde e o chamado volta a ficar em atendimento (já tem atendente)");
  ok((await SA.patch(`/api/painel/chamados/${c1.corpo.id}`, { status: "aberto", atribuidoId: staffB.id })).status === 403, "atendente comum não passa o chamado a outra pessoa (403)");
  ok((await SS.patch(`/api/painel/chamados/${c1.corpo.id}`, { atribuidoId: staffB.id })).status === 200, "o supervisor atribui a outra pessoa");
  ok((await SA.patch(`/api/painel/chamados/${c1.corpo.id}`, { status: "fechado" })).status === 200, "a equipe fecha o chamado");
  ok((await U1.post(`/api/suporte/chamados/${c1.corpo.id}/mensagens`, { texto: "E agora?" })).status === 409, "cliente não responde a chamado fechado (409)");
  ok((await SA.patch(`/api/painel/chamados/${c1.corpo.id}`, { status: "aberto" })).status === 409, "atendente comum não reabre chamado fechado (409)");
  ok((await SS.patch(`/api/painel/chamados/${c1.corpo.id}`, { status: "aberto" })).status === 200, "o supervisor reabre");
  ok((await SA.patch(`/api/painel/chamados/${c2.corpo.id}`, { status: "na_fila" })).status === 409, "mudança de situação inválida é recusada (409)");

  const resolvido = await A1.post(`/api/suporte/chamados/${c2.corpo.id}/resolver`);
  ok(resolvido.status === 200 && resolvido.corpo.status === "resolvido", "o cliente marca como resolvido");
  const antes = (await SA.get(`/api/painel/chamados/${c2.corpo.id}`)).corpo.entrouNaFilaEm;
  const reaberto = await A1.post(`/api/suporte/chamados/${c2.corpo.id}/mensagens`, { texto: "Na verdade ainda acontece." });
  const depois = (await SA.get(`/api/painel/chamados/${c2.corpo.id}`)).corpo.entrouNaFilaEm;
  ok(reaberto.corpo.status === "aberto" && new Date(depois) > new Date(antes), "responder a um resolvido reabre e manda para o fim da fila");
  ok((await A1.post(`/api/suporte/chamados/${c2.corpo.id}/avaliar`, { nota: 5 })).status === 409, "avaliar só depois que termina (409)");

  // Limite de chamados abertos por pessoa
  let limite = 0;
  for (let i = 0; i < 12; i++) { const r = await U3.post("/api/suporte/chamados", { ...base, assunto: `Limite ${i}` }); if (r.status === 429) { limite = i; break; } }
  ok(limite === 10, `limite de 10 chamados abertos por pessoa (travou no ${limite + 1}º)`);

  // ── Chat ao vivo ─────────────────────────────────────────────────────────
  ok((await cliente(fora.base, (await cliente(fora.base).post("/api/auth/login", { email: e1.usuarios.u1.email, senha: SENHA })).corpo.token).post("/api/suporte/chat/entrar", { setor: "obras" })).status === 409, "fora do horário o chat recusa e manda abrir chamado (409)");
  const foraMsg = (await cliente(fora.base, (await cliente(fora.base).post("/api/auth/login", { email: e1.usuarios.u1.email, senha: SENHA })).corpo.token).post("/api/suporte/chat/entrar", { setor: "obras" })).corpo.error;
  ok(/horário/.test(foraMsg) && /chamado/.test(foraMsg), "a mensagem explica o horário e o caminho do chamado");

  ok((await SA.post("/api/painel/atendimento/proximo")).status === 409, "sem ninguém na fila, 'atender próximo' avisa (409)");
  await SA.post("/api/painel/atendimento/presenca", { status: "disponivel" });
  await SB.post("/api/painel/atendimento/presenca", { status: "disponivel" });
  ok((await SA.post("/api/painel/atendimento/presenca", { status: "qualquer" })).status === 400, "situação de presença inválida: 400");

  const ch = {};
  ch.u1 = (await U1.post("/api/suporte/chat/entrar", { setor: "financeiro" })).corpo;
  ch.u2 = (await U2.post("/api/suporte/chat/entrar", { setor: "obras" })).corpo;
  ch.adm = (await A1.post("/api/suporte/chat/entrar", { setor: "outro" })).corpo;
  ch.b1 = (await B1.post("/api/suporte/chat/entrar", { setor: "assinatura" })).corpo;
  ok((await U1.post("/api/suporte/chat/entrar", { setor: "financeiro" })).corpo.id === ch.u1.id, "entrar de novo devolve o mesmo chat (um por pessoa)");
  const pos = async (c, id) => (await c.get(`/api/suporte/chat/${id}`)).corpo.chat;
  const p1 = await pos(U1, ch.u1.id);
  ok(p1.status === "na_fila" && p1.posicao === 1 && p1.esperaMin >= 5, `1º da fila com espera estimada (${p1.esperaMin} min)`);
  ok((await pos(U2, ch.u2.id)).posicao === 2 && (await pos(A1, ch.adm.id)).posicao === 3 && (await pos(B1, ch.b1.id)).posicao === 4, "as posições seguem a ordem de chegada (2º, 3º e 4º)");
  ok((await U1.post(`/api/suporte/chat/${ch.u1.id}/mensagens`, { texto: "oi" })).status === 409, "na fila ainda não dá para conversar (409)");
  ok((await U2.get(`/api/suporte/chat/${ch.u1.id}`)).status === 404, "ninguém espia o chat do outro (404)");

  const est = (await SA.get("/api/painel/atendimento/estado")).corpo;
  const filaIds = est.fila.map(f => f.id);
  ok(JSON.stringify(filaIds.slice(0, 4)) === JSON.stringify([ch.u1.id, ch.u2.id, ch.adm.id, ch.b1.id]), "a tela da equipe mostra a fila na mesma ordem");
  const topo = est.fila[0];
  ok(topo.posicao === 1 && topo.setorRotulo === "Financeiro" && topo.empresa.nome.includes("Teste Suporte e1") && topo.solicitante === "Pessoa u1" && topo.entrouNaFilaEm, "cada pessoa na fila traz empresa, solicitante, setor e a hora que entrou");
  ok(est.atendentes.find(a => a.id === staffA.id)?.status === "disponivel" && est.atendentes.find(a => a.id === staffB.id)?.chatsAtivos === 0, "a tela mostra os atendentes, a situação e os chats de cada um");
  ok(est.chat.aberto === true && est.capacidade === 3, "e o horário do chat e a capacidade");

  // Dois atendentes clicando ao mesmo tempo: pessoas diferentes, na ordem da fila
  const [ra, rb] = await Promise.all([SA.post("/api/painel/atendimento/proximo"), SB.post("/api/painel/atendimento/proximo")]);
  ok(ra.status === 200 && rb.status === 200 && ra.corpo.id !== rb.corpo.id, "dois cliques ao mesmo tempo pegam pessoas diferentes");
  ok([ra.corpo.id, rb.corpo.id].sort().join() === [ch.u1.id, ch.u2.id].sort().join(), "e são exatamente os dois primeiros da fila");
  const doA = ra.corpo; // a Ana (SA) ficou com doA e o Beto (SB) com o outro dos dois primeiros
  ok(doA.status === "em_atendimento" && doA.atendente && doA.setorRotulo && doA.empresa && doA.mensagens.some(m => /assumiu/.test(m.texto)), "o chat assumido mostra o atendente e a mensagem de sistema");
  const clienteDe = id => (id === ch.u1.id ? U1 : id === ch.u2.id ? U2 : id === ch.adm.id ? A1 : id === ch.b1.id ? B1 : U3);
  const cA = clienteDe(doA.id);
  ok((await pos(cA, doA.id)).atendente === "Equipe", "o cliente vê quem o atende (só o primeiro nome)");
  ok((await pos(A1, ch.adm.id)).posicao === 1 && (await pos(B1, ch.b1.id)).posicao === 2, "quem esperava sobe na fila");

  // Conversa com cursor
  ok((await cA.post(`/api/suporte/chat/${doA.id}/mensagens`, { texto: "Preciso de ajuda com o financeiro." })).status === 201, "o cliente escreve no chat");
  const novas = (await SA.get(`/api/painel/chamados/${doA.id}?depois=${doA.mensagens.at(-1).id}`)).corpo.mensagens;
  ok(novas.length === 1 && novas[0].texto.startsWith("Preciso"), "a equipe recebe só a mensagem nova (cursor)");
  ok((await SB.post(`/api/painel/chamados/${doA.id}/mensagens`, { texto: "Sou outro atendente" })).status === 403, "outro atendente não escreve no chat alheio (403)");
  await SA.post(`/api/painel/chamados/${doA.id}/mensagens`, { texto: "Anotação interna do chat", interna: true });
  await SA.post(`/api/painel/chamados/${doA.id}/mensagens`, { texto: "Claro, o que aconteceu?" });
  const cur = (await cA.get(`/api/suporte/chat/${doA.id}`)).corpo;
  ok(cur.mensagens.some(m => m.texto === "Claro, o que aconteceu?") && !cur.mensagens.some(m => m.texto.includes("Anotação interna")), "o cliente recebe a resposta e não a nota interna");
  ok((await cA.get(`/api/suporte/chat/${doA.id}?depois=${cur.mensagens.at(-1).id}`)).corpo.mensagens.length === 0, "consultar de novo com o cursor não repete mensagens");

  // Capacidade: 3 chats por atendente, seguindo a fila
  const t3 = await SA.post("/api/painel/atendimento/proximo");
  const t4 = await SA.post("/api/painel/atendimento/proximo");
  ok(t3.status === 200 && t4.status === 200 && t3.corpo.id === ch.adm.id && t4.corpo.id === ch.b1.id, "o atendente pega os próximos da fila, na ordem, até a capacidade");
  ch.u3 = (await U3.post("/api/suporte/chat/entrar", { setor: "obras" })).corpo;
  const cheio = await SA.post("/api/painel/atendimento/proximo");
  ok(cheio.status === 409 && /limite é 3/.test(cheio.corpo.error), "com 3 chats, o 4º é recusado (409)");
  ok((await SA.get("/api/painel/atendimento/estado")).corpo.atendentes.find(a => a.id === staffA.id).chatsAtivos === 3, "a tela mostra 3 chats com a Ana");
  const pegouU3 = await SB.post("/api/painel/atendimento/proximo");
  ok(pegouU3.status === 200 && pegouU3.corpo.id === ch.u3.id, "e o chat seguinte vai para outro atendente");

  // Atendente que some: os 3 chats voltam à fila, nas posições originais
  const originais = Object.fromEntries((await prisma.ticket.findMany({ where: { id: { in: [doA.id, ch.adm.id, ch.b1.id] } }, select: { id: true, entrouNaFilaEm: true } })).map(t => [t.id, t.entrouNaFilaEm.getTime()]));
  for (const [id] of [[doA.id], [ch.adm.id], [ch.b1.id]]) await pos(clienteDe(id), id); // os clientes seguem presentes
  await prisma.equipeUsuario.update({ where: { id: staffA.id }, data: { ultimoSinalEm: new Date(Date.now() - 10 * 60000) } });
  await esperarVarredura();
  await SB.get("/api/painel/atendimento/estado");
  const voltaram = await prisma.ticket.findMany({ where: { id: { in: [doA.id, ch.adm.id, ch.b1.id] } } });
  ok(voltaram.every(t => t.status === "na_fila" && t.atribuidoId === null), "atendente sem sinal por 1,5 min: os chats voltam à fila, sem atendente");
  ok(voltaram.every(t => t.entrouNaFilaEm.getTime() === originais[t.id]), "e mantêm a posição original (entrouNaFilaEm intacto)");
  const aviso = (await cA.get(`/api/suporte/chat/${doA.id}`)).corpo;
  ok(aviso.chat.status === "na_fila" && aviso.chat.posicao === 1 && aviso.mensagens.some(m => /O atendente saiu/.test(m.texto)), "o cliente é avisado e continua em 1º lugar");

  // Cliente que some: sai da fila sozinho
  await prisma.ticket.update({ where: { id: ch.b1.id }, data: { ultimoSinalClienteEm: new Date(Date.now() - 2 * 60000) } });
  await esperarVarredura();
  await SB.get("/api/painel/atendimento/estado");
  ok((await prisma.ticket.findUnique({ where: { id: ch.b1.id } })).status === "abandonado", "cliente sem sinal por mais de 1 min sai da fila (abandonado)");
  const retomado = await SB.post("/api/painel/atendimento/proximo");
  ok(retomado.status === 200 && retomado.corpo.id === doA.id, "o atendente seguinte pega primeiro quem foi devolvido (posição original)");

  // Supervisor fura a fila de propósito
  const f2 = (await B1.post("/api/suporte/chat/entrar", { setor: "obras" })).corpo; // entra depois de quem já espera (o administrador da empresa 1)
  ok((await SA.post("/api/painel/atendimento/proximo", { ticketId: f2.id })).status === 403, "atendente comum não escolhe fora da ordem (403)");
  const furou = await SS.post("/api/painel/atendimento/proximo", { ticketId: f2.id });
  ok(furou.status === 200 && furou.corpo.id === f2.id, "o supervisor escolhe alguém fora da ordem");
  const aud = (await prisma.auditoriaEquipe.findMany({ where: { equipeId: sup.id, acao: "fila_furada" } }));
  ok(aud.length === 1 && aud[0].ticketId === f2.id, "e isso fica na auditoria (fila_furada)");

  // Encerrar e avaliar
  const encerra = await SS.patch(`/api/painel/chamados/${f2.id}`, { status: "resolvido" });
  ok(encerra.status === 200 && encerra.corpo.status === "resolvido", "a equipe encerra o chat");
  ok((await SS.patch(`/api/painel/chamados/${f2.id}`, { status: "aguardando_cliente" })).status === 409, "chat encerrado não muda para outra situação (409)");
  const fim = (await B1.get(`/api/suporte/chat/${f2.id}`)).corpo.chat;
  ok(fim.encerrado === true && fim.status === "resolvido", "o cliente descobre que o chat acabou");
  ok((await B1.post(`/api/suporte/chat/${f2.id}/avaliar`, { nota: 6 })).status === 400, "nota fora de 1 a 5: 400");
  ok((await B1.post(`/api/suporte/chat/${f2.id}/avaliar`, { nota: 5 })).corpo.avaliacao === 5, "o cliente avalia o atendimento");
  const sai = await A1.post(`/api/suporte/chat/${ch.adm.id}/sair`);
  ok(sai.status === 200 && (await prisma.ticket.findUnique({ where: { id: ch.adm.id } })).status === "abandonado", "o cliente sai da fila por conta própria");

  // Configuração do atendimento
  ok((await SA.put("/api/painel/atendimento/config", { capacidade: 2 })).status === 403, "só o supervisor altera o atendimento (403)");
  ok((await SS.put("/api/painel/atendimento/config", { capacidade: 99 })).status === 400, "capacidade fora de 1 a 10: 400");
  ok((await SS.put("/api/painel/atendimento/config", { horario: { 1: ["18:00", "08:00"] } })).status === 400, "horário com o início depois do fim: 400");
} finally {
  await api.parar(); await fora.parar();
  // Limpeza: só o que esta execução criou
  const r = await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas }, cnpj: { startsWith: "TESTE-SUP-" } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: equipeCriada } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const q = await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipeCriada }, email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} empresa(s) e ${q.count} pessoa(s) da equipe de teste apagadas`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);

// A varredura da fila roda no máximo a cada 5 s por instância: espera passar para o teste ver o efeito
async function esperarVarredura() { await esperar(5300); }
