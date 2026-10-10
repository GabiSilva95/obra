// Ponta a ponta do e-mail do chamado: o que sai (confirmação, resposta da equipe, resolvido) e o que entra (resposta do cliente por e-mail).
// Usa um Resend de mentira (servidor local) e a API real com o banco real; apaga tudo o que cria.
//   node --env-file=.env scripts/painel/e2e-email.mjs
import bcrypt from "bcryptjs";
import http from "node:http";
import prisma from "../../server/db.js";
import { enderecoDoChamado } from "../../server/email/enderecos.js";
import { assinarSvix } from "../../server/email/svix.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA = "Senha-Teste-2026", SEGREDO_WEBHOOK = "whsec_" + Buffer.from("segredo-do-webhook-e2e").toString("base64");
const DOMINIO = "receber.exemplo.test", SEGREDO_END = "segredo-e2e-enderecos", PORTA_FAKE = 3030;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");
const equipeCriada = [], empresasCriadas = [];

// ── Resend de mentira ───────────────────────────────────────────────────────
const enviados = [], recebidos = new Map(), anexosDe = new Map(), arquivos = new Map();
const falha = { envio: false, leitura: false };
const fake = http.createServer((req, res) => {
  let t = "";
  req.on("data", d => (t += d));
  req.on("end", () => {
    const json = (status, corpo) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(corpo)); };
    const autorizado = req.headers.authorization === "Bearer re_teste";
    const url = new URL(req.url, "http://x");
    if (url.pathname.startsWith("/cdn/")) { const b = arquivos.get(url.pathname.slice(5)); if (!b) return json(404, {}); res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": b.length }); return res.end(b); }
    if (!autorizado) return json(401, { message: "chave inválida" });
    if (req.method === "POST" && url.pathname === "/emails") {
      if (falha.envio) return json(500, { message: "erro de teste" });
      const corpo = JSON.parse(t); enviados.push({ corpo, chaveIdempotencia: req.headers["idempotency-key"] });
      return json(200, { id: `em_${enviados.length}` });
    }
    const m = /^\/emails\/receiving\/([^/]+)(\/attachments)?$/.exec(url.pathname);
    if (req.method === "GET" && m) {
      if (falha.leitura) return json(500, { message: "indisponível" });
      if (m[2]) return json(200, { object: "list", has_more: false, data: anexosDe.get(m[1]) ?? [] });
      const mail = recebidos.get(m[1]);
      return mail ? json(200, mail) : json(404, { message: "não achei" });
    }
    json(404, {});
  });
});
await new Promise(r => fake.listen(PORTA_FAKE, "127.0.0.1", r));

async function criarEquipe(nome, perms) {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Equipe ${nome}`, email: `${marca}-${nome}@exemplo.test`, senha: await bcrypt.hash(SENHA, 10), papel: "atendente", permissoes: perms, trocarSenha: false } });
  equipeCriada.push(e.id);
  return e;
}
async function criarEmpresa(nome, plano = "pro") {
  const t = await prisma.tenant.create({ data: { razaoSocial: `Teste Email ${nome} ${marca}`, cnpj: `TESTE-EML-${marca}-${nome}`, email: `${marca}-${nome}@exemplo.test`, plano } });
  empresasCriadas.push(t.id);
  const mk = (chave, role, nomeP) => prisma.user.create({ data: { tenantId: t.id, nome: nomeP, email: `${marca}-${nome}-${chave}@exemplo.test`, senha: bcrypt.hashSync(SENHA, 10), role } });
  return { t, adm: await mk("adm", "tenant_admin", `Admin ${nome}`), abriu: await mk("abriu", "user", `Maria Cliente ${nome}`), outro: await mk("outro", "user", `Outro ${nome}`) };
}

const envApi = { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_teste", EMAIL_REMETENTE: "ConstruktPro <suporte@exemplo.test>", EMAIL_RECEBIMENTO_DOMINIO: DOMINIO, RESEND_WEBHOOK_SECRET: SEGREDO_WEBHOOK, RESEND_API_BASE: `http://127.0.0.1:${PORTA_FAKE}`, APP_URL: "https://app.exemplo.test", EMAIL_SEGREDO: SEGREDO_END, SUPORTE_HORARIO_TESTE: "sempre" };
const api = await iniciarApi(3021, envApi);
const semEmail = await iniciarApi(3022, { EMAIL_PROVIDER: "", RESEND_API_KEY: "", EMAIL_REMETENTE: "", RESEND_WEBHOOK_SECRET: "", SUPORTE_HORARIO_TESTE: "sempre" });
try {
  const anon = cliente(api.base);
  const loginCliente = async (u, base = api.base) => cliente(base, (await cliente(base).post("/api/auth/login", { email: u.email, senha: SENHA })).corpo.token);
  const loginEquipe = async (e, base = api.base) => cliente(base, (await cliente(base).post("/api/painel/auth/login", { email: e.email, senha: SENHA })).corpo.token);
  const aviso = (corpo, { id, ts = String(Math.floor(Date.now() / 1000)), segredo = SEGREDO_WEBHOOK, base = api.base, adulterar = false } = {}) => new Promise((resolve, reject) => {
    const dados = JSON.stringify(corpo);
    const sig = assinarSvix({ id, timestamp: ts, corpo: Buffer.from(dados), segredo });
    const enviar = adulterar ? dados + " " : dados;
    const url = new URL(`${base}/api/email/webhook/resend`);
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(enviar), "svix-id": id, "svix-timestamp": ts, "svix-signature": sig } }, res => {
      let t = ""; res.on("data", d => (t += d)); res.on("end", () => { let c = {}; try { c = JSON.parse(t); } catch { /* vazio */ } resolve({ status: res.statusCode, corpo: c }); });
    });
    req.on("error", reject); req.write(enviar); req.end();
  });

  const E1 = await criarEmpresa("e1"), E2 = await criarEmpresa("e2", "starter");
  const atendente = await criarEquipe("sup", ["suporte"]);
  const SA = await loginEquipe(atendente);
  const Cabriu = await loginCliente(E1.abriu), Cadm = await loginCliente(E1.adm), Cb2 = await loginCliente(E2.adm);

  // ── Configuração ─────────────────────────────────────────────────────────
  ok((await Cabriu.get("/api/suporte/config")).corpo.email?.ativo === true && (await Cabriu.get("/api/suporte/config")).corpo.email.responder === true, "config: com e-mail ligado, o cliente é avisado e pode responder por e-mail");
  const off = await loginCliente(E1.abriu, semEmail.base);
  ok((await off.get("/api/suporte/config")).corpo.email.ativo === false, "config: sem e-mail ligado, nada é prometido");

  // ── Saída: confirmação ───────────────────────────────────────────────────
  const aberto = (await Cabriu.post("/api/suporte/chamados", { assunto: "Compra não fecha", setor: "estoque_compras", texto: "Ao salvar a ordem aparece um erro." })).corpo;
  const n = aberto.id, endereco = enderecoDoChamado(n, DOMINIO, SEGREDO_END);
  const conf = enviados.find(e => e.corpo.subject?.startsWith(`[Chamado #${n}]`));
  ok(!!conf && conf.corpo.to[0] === E1.abriu.email && conf.corpo.from === "ConstruktPro <suporte@exemplo.test>", "saída: a confirmação vai para quem abriu o chamado, do remetente configurado");
  ok(conf.corpo.subject === `[Chamado #${n}] Compra não fecha` && /Recebemos o seu chamado #\d+: "Compra não fecha"/.test(conf.corpo.text) && /Respondemos em até 24 horas no plano Business/.test(conf.corpo.text), "saída: assunto com o número, texto com o prazo do plano");
  ok(conf.corpo.reply_to?.[0] === endereco, "saída: Reply-To é o endereço único e assinado do chamado");
  ok(conf.corpo.text.includes("https://app.exemplo.test/app/suporte") && conf.corpo.text.includes("- - -"), "saída: link do chamado e a linha de corte para a resposta");
  ok(conf.corpo.headers?.["Auto-Submitted"] === "auto-generated" && conf.chaveIdempotencia === `chamado-${n}-confirmacao`, "saída: marcada como automática e com chave de idempotência");
  ok(!conf.corpo.text.includes("Ao salvar a ordem aparece um erro."), "saída: a confirmação não repete o que o cliente escreveu");
  // A abertura sem e-mail ligado não quebra
  const semE = await off.post("/api/suporte/chamados", { assunto: "Outro", setor: "obras", texto: "Teste sem e-mail." });
  ok(semE.status === 201, "saída: sem e-mail ligado, abrir o chamado funciona do mesmo jeito");

  // ── Saída: resposta da equipe ────────────────────────────────────────────
  const antes = enviados.length;
  const r1 = await SA.post(`/api/painel/chamados/${n}/mensagens`, { texto: "Vamos olhar a ordem agora.\nVocê consegue mandar um print?" });
  ok(r1.status === 201, "equipe responde o chamado");
  const resp = enviados.slice(antes).find(e => e.corpo.subject === `Re: [Chamado #${n}] Compra não fecha`);
  ok(!!resp && resp.corpo.to[0] === E1.abriu.email && resp.corpo.text.includes("Vamos olhar a ordem agora.\nVocê consegue mandar um print?") && /Equipe sup/.test(resp.corpo.text) === false && /Equipe, do suporte|, do suporte do ConstruktPro, respondeu o seu chamado/.test(resp.corpo.text), "saída: a resposta da equipe vai por e-mail, com o texto inteiro");
  ok(resp.corpo.reply_to?.[0] === endereco && resp.corpo.headers === undefined, "saída: resposta humana (sem marca de automática) e com Reply-To do chamado");
  const det = (await SA.get(`/api/painel/chamados/${n}`)).corpo;
  const msgEq = det.mensagens.find(m => m.autorTipo === "equipe");
  ok(msgEq.emailStatus === "enviado", "painel: a mensagem da equipe mostra que foi enviada por e-mail");
  const dbMsg = await prisma.ticketMensagem.findUnique({ where: { id: msgEq.id }, select: { emailId: true } });
  ok(/^em_\d+$/.test(dbMsg.emailId), "painel: guarda o id do e-mail no provedor");
  const apos = enviados.length;
  await SA.post(`/api/painel/chamados/${n}/mensagens`, { texto: "Nota: cliente parece nervoso, atender com calma.", interna: true });
  ok(enviados.length === apos, "nota interna nunca vai por e-mail");
  ok(!JSON.stringify((await Cabriu.get(`/api/suporte/chamados/${n}`)).corpo).includes("emailStatus"), "o cliente não recebe o estado do e-mail (dado da equipe)");

  // Falha do provedor não derruba a resposta
  falha.envio = true;
  const r2 = await SA.post(`/api/painel/chamados/${n}/mensagens`, { texto: "Segunda mensagem com o provedor fora do ar." });
  falha.envio = false;
  ok(r2.status === 201, "falha do Resend: a resposta da equipe é salva do mesmo jeito");
  const det2 = (await SA.get(`/api/painel/chamados/${n}`)).corpo;
  ok(det2.mensagens.filter(m => m.autorTipo === "equipe" && !m.interna).at(-1).emailStatus === "falhou", "painel: a mensagem mostra que o envio por e-mail falhou");

  // ── Entrada: a resposta do cliente por e-mail ────────────────────────────
  let seq = 0;
  const receber = async ({ de = E1.abriu.email, nome = "Maria Cliente", para = [endereco], texto = "Mandei o print pelo sistema, mas olha: o erro continua.\n\nEm seg., 5 de out. de 2026 às 10:00, Equipe escreveu:\n> Vamos olhar a ordem agora.", msgId, headers = {}, auth = { spf: "pass", dkim: "pass", dmarc: "pass" }, anexos = [], assunto = `Re: [Chamado #${n}] Compra não fecha`, html = "", svixId, base = api.base, extra = {} } = {}) => {
    const emailId = `rec_${marca}_${++seq}`;
    recebidos.set(emailId, { object: "email", id: emailId, from: `${nome} <${de}>`, to: para, cc: [], received_for: [], subject: assunto, text: texto, html, headers: { from: `${nome} <${de}>`, ...headers }, message_id: msgId === undefined ? `<m${seq}-${marca}@mail.exemplo>` : msgId, authentication: auth });
    anexosDe.set(emailId, anexos.map((a, i) => ({ id: `a${i}`, filename: a.nome, size: a.tamanho ?? a.dados?.length ?? 0, content_type: a.tipo ?? "application/octet-stream", content_disposition: a.disposicao ?? "attachment", download_url: `http://127.0.0.1:${PORTA_FAKE}/cdn/${emailId}-${i}`, expires_at: "2099-01-01T00:00:00Z" })));
    anexos.forEach((a, i) => arquivos.set(`${emailId}-${i}`, a.dados));
    const resp = await aviso({ type: "email.received", created_at: new Date().toISOString(), data: { email_id: emailId, from: de, to: para, message_id: "x", subject: assunto, attachments: anexos.map((a, i) => ({ id: `a${i}`, filename: a.nome })), ...extra } }, { id: svixId ?? `msg_${marca}_${seq}`, base });
    return { ...resp, emailId };
  };
  const mensagensDe = id => prisma.ticketMensagem.findMany({ where: { ticketId: id }, orderBy: { id: "asc" }, include: { anexos: { select: { nome: true, mimeType: true, tamanho: true } } } });
  const ticket = id => prisma.ticket.findUnique({ where: { id }, select: { status: true, naoLidoEquipe: true, entrouNaFilaEm: true, ultimaMensagemEm: true } });

  const t0 = await ticket(n);
  ok(t0.status === "aguardando_cliente", "antes da resposta por e-mail: o chamado aguarda o cliente (a equipe respondeu)");
  const e1 = await receber({ msgId: `<unica-${marca}@mail.exemplo>` });
  ok(e1.status === 200 && /^registrado no chamado #/.test(e1.corpo.resultado), `entrada: a resposta por e-mail é registrada (${e1.corpo.resultado})`);
  const m1 = (await mensagensDe(n)).at(-1);
  ok(m1.origem === "email" && m1.autorTipo === "cliente" && m1.texto === "Mandei o print pelo sistema, mas olha: o erro continua." && m1.emailMessageId === `<unica-${marca}@mail.exemplo>`, "entrada: só o texto novo entra, sem a citação, com origem e-mail e o Message-ID guardado");
  const t1 = await ticket(n);
  ok(t1.status === "em_atendimento" && t1.naoLidoEquipe > t0.naoLidoEquipe, "entrada: o chamado volta para a equipe (em atendimento) com mensagem nova não lida");
  const vista = (await Cabriu.get(`/api/suporte/chamados/${n}`)).corpo.mensagens.at(-1);
  ok(vista.origem === "email" && vista.autorNome.includes("Maria Cliente"), "entrada: o cliente vê a própria resposta na conversa, como dele");
  ok((await SA.get(`/api/painel/chamados/${n}`)).corpo.mensagens.at(-1).origem === "email", "entrada: a equipe vê a resposta com a marca de e-mail");

  // Duplicados
  const rep = await receber({ svixId: `msg_${marca}_${seq}`, msgId: `<unica-${marca}@mail.exemplo>` }); // nova leitura, mesmo Message-ID
  ok(rep.status === 200 && rep.corpo.resultado === "duplicado", "entrada: o mesmo e-mail (mesmo Message-ID) com outro aviso: duplicado");
  const mesmoAviso = await aviso({ type: "email.received", data: { email_id: e1.emailId, attachments: [] } }, { id: `msg_${marca}_1` });
  ok(mesmoAviso.status === 200 && mesmoAviso.corpo.resultado === "duplicado", "entrada: o mesmo aviso reenviado pelo Resend (mesmo svix-id): duplicado");
  ok((await mensagensDe(n)).filter(m => m.origem === "email").length === 1, "entrada: uma única mensagem no banco depois dos reenvios");
  const rajada = await Promise.all(Array.from({ length: 5 }, (_, i) => (async () => {
    const idAviso = `msg_${marca}_rajada_${i}`;
    return aviso({ type: "email.received", data: { email_id: e1.emailId, attachments: [] } }, { id: idAviso });
  })()));
  ok(rajada.every(r => r.status === 200) && (await mensagensDe(n)).filter(m => m.origem === "email").length === 1, "entrada: rajada de avisos do mesmo e-mail com ids diferentes: ainda uma mensagem só");

  // Autenticação do aviso
  const corpoAviso = { type: "email.received", data: { email_id: e1.emailId, attachments: [] } };
  ok((await aviso(corpoAviso, { id: "msg_x1", segredo: "whsec_" + Buffer.from("errado").toString("base64") })).status === 401, "aviso: assinatura com o segredo errado: 401");
  ok((await aviso(corpoAviso, { id: "msg_x2", adulterar: true })).status === 401, "aviso: corpo alterado depois de assinado: 401");
  ok((await aviso(corpoAviso, { id: "msg_x3", ts: String(Math.floor(Date.now() / 1000) - 3600) })).status === 401, "aviso: assinatura antiga (repetição): 401");
  ok((await anon.post("/api/email/webhook/resend", corpoAviso)).status === 401, "aviso: sem cabeçalhos de assinatura: 401");
  ok((await aviso(corpoAviso, { id: "msg_x4", base: semEmail.base })).status === 404, "aviso: instância sem e-mail ligado não recebe (404)");
  ok((await aviso({ type: "email.delivered", data: { email_id: "x" } }, { id: "msg_x5" })).corpo.resultado?.startsWith("ignorado"), "aviso: outros eventos do Resend: 200 ignorado");

  // Quem pode responder
  const tenta = async (opcoes, esperado, msg) => { const r = await receber(opcoes); ok(r.status === 200 && new RegExp(esperado).test(r.corpo.resultado), `${msg} (${r.corpo.resultado})`); return r; };
  const antesMsgs = (await mensagensDe(n)).length;
  await tenta({ para: [enderecoDoChamado(n, DOMINIO, "segredo-errado")] }, "^ignorado: nenhum endereço", "entrada: endereço com assinatura errada é ignorado");
  await tenta({ para: [`chamado-${n}-000000000000@${DOMINIO}`] }, "^ignorado: nenhum endereço", "entrada: endereço inventado é ignorado");
  await tenta({ para: [`chamado-${n}-${endereco.split("-")[2].split("@")[0]}@outro.exemplo.test`] }, "^ignorado: nenhum endereço", "entrada: domínio diferente é ignorado");
  await tenta({ de: "estranho@fora.com" }, "^ignorado: o remetente", "entrada: remetente desconhecido é ignorado");
  await tenta({ de: E1.outro.email }, "^ignorado: o remetente", "entrada: colega que não abriu o chamado (e não é administrador) é ignorado");
  await tenta({ de: E2.adm.email }, "^ignorado: o remetente", "entrada: usuário de OUTRA empresa com o endereço certo é ignorado");
  await tenta({ headers: { "Auto-Submitted": "auto-replied" } }, "^ignorado: resposta automática", "entrada: resposta automática (fora do escritório) é ignorada");
  await tenta({ assunto: "Resposta automática: Re: [Chamado]" }, "^ignorado: resposta automática", "entrada: assunto de resposta automática é ignorado");
  await tenta({ auth: { spf: "fail", dkim: "fail", dmarc: "fail" } }, "^ignorado: remetente não autenticado", "entrada: remetente que falhou em SPF, DKIM e DMARC é ignorado");
  await tenta({ texto: "> só citação\n> nada novo", msgId: `<so-citacao-${marca}>` }, "^registrado", "entrada: e-mail só com citação entra inteiro em vez de sumir");
  await tenta({ texto: "   \n  ", msgId: `<vazio-${marca}>` }, "^ignorado: e-mail sem texto", "entrada: e-mail sem texto é ignorado");
  const adm = await tenta({ de: E1.adm.email, nome: "Admin", texto: "Aqui é o administrador da empresa, também preciso disso.", msgId: `<adm-${marca}>` }, "^registrado", "entrada: o administrador da empresa pode responder o chamado de um colega");
  ok((await mensagensDe(n)).at(-1).autorUserId === E1.adm.id && adm.status === 200, "entrada: a mensagem fica no nome do administrador");
  ok((await mensagensDe(n)).length === antesMsgs + 2, "entrada: só entraram as duas respostas legítimas (a só-citação e a do administrador)");
  const chat = await prisma.ticket.create({ data: { tenantId: E1.t.id, abertoPorId: E1.abriu.id, canal: "chat", assunto: "chat", setor: "obras", status: "na_fila", plano: "pro", ultimoSinalClienteEm: new Date(Date.now() + 3600000) } });
  await tenta({ para: [enderecoDoChamado(chat.id, DOMINIO, SEGREDO_END)] }, "^ignorado: chamado não encontrado", "entrada: o endereço de um chat (não é chamado) é ignorado");

  // Anexos
  const comAnexos = await receber({ texto: "Segue o print e a planilha.", msgId: `<anx-${marca}>`, extra: {}, anexos: [
    { nome: "print.png", dados: PNG, tipo: "image/png" },
    { nome: "relatorio.pdf", dados: PDF, tipo: "application/pdf" },
    { nome: "virus.exe", dados: Buffer.from("MZ....."), tipo: "application/x-msdownload" },
    { nome: "assinatura.png", dados: PNG, tipo: "image/png", disposicao: "inline" },
    { nome: "enorme.pdf", dados: PDF, tipo: "application/pdf", tamanho: 4 * 1024 * 1024 },
  ] });
  ok(comAnexos.status === 200 && /^registrado/.test(comAnexos.corpo.resultado), "anexos: e-mail com anexos é registrado");
  const mAnx = (await mensagensDe(n)).at(-1);
  ok(mAnx.anexos.length === 2 && mAnx.anexos.some(a => a.nome === "print.png" && a.mimeType === "image/png") && mAnx.anexos.some(a => a.nome === "relatorio.pdf"), "anexos: só o PNG e o PDF válidos viram anexo do chamado (sem .exe, sem a imagem da assinatura, sem o arquivo grande)");
  ok(/2 anexo\(s\) deste e-mail não foram aceitos/.test(mAnx.texto), "anexos: a mensagem avisa quantos não foram aceitos");
  const lista = (await Cabriu.get(`/api/suporte/chamados/${n}`)).corpo.mensagens.at(-1).anexos;
  const baixou = await new Promise(r => { const u = new URL(`${api.base}/api/suporte/chamados/${n}/anexos/${lista[0].id}`); http.get({ hostname: u.hostname, port: u.port, path: u.pathname, headers: { Authorization: `Bearer ${Cabriu.token ?? ""}` } }, res => r(res.statusCode)); });
  void baixou;
  ok(lista.length === 2, "anexos: o cliente enxerga os anexos da própria resposta");

  // Chamado resolvido reabre; fechado não aceita
  const a2 = (await Cabriu.post("/api/suporte/chamados", { assunto: "Reabrir", setor: "obras", texto: "Primeira mensagem." })).corpo;
  await SA.patch(`/api/painel/chamados/${a2.id}`, { status: "resolvido" });
  const resolvidoMail = enviados.find(e => e.corpo.subject === `Re: [Chamado #${a2.id}] Reabrir` && /como resolvido/.test(e.corpo.text));
  ok(!!resolvidoMail && resolvidoMail.corpo.to[0] === E1.abriu.email, "saída: marcar como resolvido avisa o cliente por e-mail");
  const tRes = await ticket(a2.id);
  const rea = await tenta({ para: [enderecoDoChamado(a2.id, DOMINIO, SEGREDO_END)], texto: "Na verdade ainda não resolveu.", msgId: `<reabre-${marca}>` }, "^registrado", "entrada: a resposta por e-mail a um chamado resolvido é aceita");
  const tRea = await ticket(a2.id);
  ok(rea.status === 200 && tRea.status === "aberto" && tRea.entrouNaFilaEm > tRes.entrouNaFilaEm, "entrada: o chamado resolvido reabre e volta ao fim da fila de chamados");
  await SA.patch(`/api/painel/chamados/${a2.id}`, { status: "em_atendimento" });
  await prisma.ticket.update({ where: { id: a2.id }, data: { status: "fechado" } });
  await tenta({ para: [enderecoDoChamado(a2.id, DOMINIO, SEGREDO_END)], texto: "Respondendo a um fechado.", msgId: `<fechado-${marca}>` }, "^ignorado:", "entrada: chamado fechado não aceita resposta por e-mail");

  // Falha ao ler o e-mail: o Resend precisa tentar de novo, e o aviso não pode ficar marcado como visto
  const a3 = (await Cabriu.post("/api/suporte/chamados", { assunto: "Tentar de novo", setor: "obras", texto: "Mensagem." })).corpo;
  falha.leitura = true;
  const falhou = await receber({ para: [enderecoDoChamado(a3.id, DOMINIO, SEGREDO_END)], msgId: `<retry-${marca}>`, texto: "Resposta depois da falha.", svixId: `msg_${marca}_retry` });
  falha.leitura = false;
  ok(falhou.status === 500, "falha ao buscar o e-mail no Resend: responde 500 para ele tentar de novo");
  ok(await prisma.eventoEmail.count({ where: { eventoId: `msg_${marca}_retry` } }) === 0, "e o aviso não fica marcado como visto");
  const retry = await aviso({ type: "email.received", data: { email_id: falhou.emailId, attachments: [] } }, { id: `msg_${marca}_retry` });
  ok(retry.status === 200 && /^registrado/.test(retry.corpo.resultado), "na nova tentativa do Resend o e-mail é registrado");
  ok((await mensagensDe(a3.id)).filter(m => m.origem === "email").length === 1, "e entra uma vez só");

  // Idempotência de envio e isolamento
  ok(new Set(enviados.map(e => e.chaveIdempotencia)).size === enviados.length, "cada e-mail enviado tem uma chave de idempotência diferente");
  ok((await Cb2.get(`/api/suporte/chamados/${n}`)).status === 404, "o chamado de uma empresa continua invisível para outra");
  void Cadm;
} finally {
  await api.parar(); await semEmail.parar(); fake.close();
  const r = await prisma.tenant.deleteMany({ where: { id: { in: empresasCriadas }, cnpj: { startsWith: "TESTE-EML-" } } });
  const ev = await prisma.eventoEmail.deleteMany({ where: { eventoId: { contains: marca } } });
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: equipeCriada } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const q = await prisma.equipeUsuario.deleteMany({ where: { id: { in: equipeCriada }, email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} empresa(s), ${ev.count} aviso(s) de e-mail e ${q.count} pessoa(s) da equipe de teste apagados`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
