// Verificação ponta a ponta do painel interno (API real, banco real). Apaga tudo o que cria.
//
//   node --env-file=.env scripts/painel/e2e.mjs
//
// Cria uma equipe de teste (e-mails "e2e-painel-...@exemplo.test") e, nas fases de suporte, empresas de teste.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../server/db.js";
import { IDS_PERMISSOES } from "../../server/config/painel.js";
import { cliente, iniciarApi, marca, ok, totalFalhas } from "./lib.mjs";

const SENHA_ADMIN = "Senha-Admin-2026";
const email = nome => `${marca}-${nome}@exemplo.test`;
const criadosEquipe = [];

async function criarEquipe(nome, dados = {}) {
  const e = await prisma.equipeUsuario.create({ data: { nome: `Teste ${nome}`, email: email(nome), senha: await bcrypt.hash(SENHA_ADMIN, 10), trocarSenha: false, ...dados } });
  criadosEquipe.push(e.id);
  return e;
}

const api = await iniciarApi(3013);
const guardado = await iniciarApi(3014, { PAINEL_HOST: "painel.teste.local" });
try {
  const anonimo = cliente(api.base);
  const admin = await criarEquipe("admin", { papel: "equipe_admin", permissoes: IDS_PERMISSOES });

  // ── Login ──────────────────────────────────────────────────────────────────
  const errado = await anonimo.post("/api/painel/auth/login", { email: admin.email, senha: "errada-errada" });
  ok(errado.status === 401 && errado.corpo.error === "Credenciais inválidas.", "senha errada: 401 com mensagem genérica");
  const inexistente = await anonimo.post("/api/painel/auth/login", { email: email("ninguem"), senha: SENHA_ADMIN });
  ok(inexistente.status === 401 && inexistente.corpo.error === errado.corpo.error, "e-mail que não existe responde igual à senha errada");
  const entrou = await anonimo.post("/api/painel/auth/login", { email: admin.email.toUpperCase(), senha: SENHA_ADMIN });
  ok(entrou.status === 200 && entrou.corpo.token && entrou.corpo.refreshToken && !("senha" in entrou.corpo.equipe), "login certo (e-mail sem diferenciar maiúsculas) devolve token e não devolve a senha");
  const doAdmin = cliente(api.base, entrou.corpo.token);
  ok((await doAdmin.get("/api/painel/auth/me")).corpo.email === admin.email, "GET /auth/me devolve quem está logado");
  ok((await anonimo.get("/api/painel/auth/me")).status === 401, "sem token: 401");

  // ── Isolamento entre painel e cliente ──────────────────────────────────────
  const tokenDeCliente = jwt.sign({ userId: 1, tenantId: "qualquer", role: "tenant_admin" }, process.env.JWT_SECRET, { expiresIn: "5m" });
  ok((await cliente(api.base, tokenDeCliente).get("/api/painel/auth/me")).status === 401, "token do cliente não abre o painel (401)");
  ok((await cliente(api.base, tokenDeCliente).get("/api/painel/equipe")).status === 401, "token do cliente não lista a equipe (401)");
  for (const rota of ["/api/obras", "/api/usuarios", "/api/financeiro/resumo", "/api/estoque", "/api/compras"]) {
    ok((await doAdmin.get(rota)).status === 401, `token da equipe não abre ${rota} (401)`);
  }

  // ── Refresh rotativo ───────────────────────────────────────────────────────
  const r1 = await anonimo.post("/api/painel/auth/refresh", { refreshToken: entrou.corpo.refreshToken });
  ok(r1.status === 200 && r1.corpo.refreshToken !== entrou.corpo.refreshToken, "refresh devolve um par novo");
  ok((await anonimo.post("/api/painel/auth/refresh", { refreshToken: entrou.corpo.refreshToken })).status === 401, "o refresh antigo não vale mais (rotação)");

  // ── Equipe: criar, permissões e senha provisória ───────────────────────────
  const criado = await doAdmin.post("/api/painel/equipe", { nome: "Atendente Teste", email: email("atendente"), perfil: "atendente" });
  ok(criado.status === 201 && criado.corpo.senhaTemporaria?.length === 14 && !("senha" in criado.corpo), "administrador cria atendente e recebe a senha provisória uma vez");
  if (criado.corpo.id) criadosEquipe.push(criado.corpo.id);
  ok(JSON.stringify(criado.corpo.permissoes) === JSON.stringify(["suporte", "clientes"]) && criado.corpo.papel === "atendente", "perfil Atendente grava suporte e clientes");
  ok((await doAdmin.post("/api/painel/equipe", { nome: "Repetido", email: email("atendente"), perfil: "leitura" })).status === 409, "e-mail repetido na equipe: 409");
  ok((await doAdmin.post("/api/painel/equipe", { nome: "Sem email", email: "isso-nao-e-email", perfil: "leitura" })).status === 400, "e-mail inválido: 400");

  const loginAtendente = await anonimo.post("/api/painel/auth/login", { email: email("atendente"), senha: criado.corpo.senhaTemporaria });
  ok(loginAtendente.status === 200 && loginAtendente.corpo.equipe.trocarSenha === true, "atendente entra com a senha provisória e é avisado para trocar");
  let doAtendente = cliente(api.base, loginAtendente.corpo.token);
  const bloqueado = await doAtendente.get("/api/painel/equipe");
  ok(bloqueado.status === 403 && bloqueado.corpo.codigo === "TROCAR_SENHA", "antes de trocar a senha, nada além de /auth funciona");
  ok((await doAtendente.get("/api/painel/auth/me")).status === 200, "mas /auth/me funciona");
  ok((await doAtendente.post("/api/painel/auth/trocar-senha", { senhaAtual: criado.corpo.senhaTemporaria, senhaNova: "curta" })).status === 400, "senha nova curta é recusada");
  ok((await doAtendente.post("/api/painel/auth/trocar-senha", { senhaAtual: "errada-errada", senhaNova: "Outra-Senha-2026" })).status === 400, "senha atual errada é recusada");
  const trocou = await doAtendente.post("/api/painel/auth/trocar-senha", { senhaAtual: criado.corpo.senhaTemporaria, senhaNova: "Outra-Senha-2026" });
  ok(trocou.status === 200 && trocou.corpo.equipe.trocarSenha === false && trocou.corpo.token, "troca de senha libera o acesso e devolve sessão nova");
  doAtendente = cliente(api.base, trocou.corpo.token);
  ok((await doAtendente.get("/api/painel/equipe")).status === 403, "atendente sem a permissão `equipe` não vê a equipe (403)");
  ok((await doAtendente.get("/api/painel/auditoria")).status === 403, "atendente não vê a auditoria (403)");
  ok((await doAtendente.post("/api/painel/equipe", { nome: "X", email: email("x"), perfil: "leitura" })).status === 403, "atendente não cria pessoas (403)");

  // ── Quem tem `equipe` mas não é administrador ─────────────────────────────
  const gestor = await criarEquipe("gestor", { papel: "atendente", permissoes: ["equipe", "suporte"] });
  const doGestor = cliente(api.base, (await anonimo.post("/api/painel/auth/login", { email: gestor.email, senha: SENHA_ADMIN })).corpo.token);
  ok((await doGestor.post("/api/painel/equipe", { nome: "Admin falso", email: email("falso"), perfil: "administrador" })).status === 403, "quem não é administrador não cria administrador (403)");
  ok((await doGestor.post("/api/painel/equipe", { nome: "Com equipe", email: email("falso2"), permissoes: ["equipe"] })).status === 403, "nem concede a permissão `equipe` (403)");
  ok((await doGestor.put(`/api/painel/equipe/${admin.id}`, { nome: "Trocado" })).status === 403, "nem altera um administrador (403)");
  const leitura = await doGestor.post("/api/painel/equipe", { nome: "Leitura Teste", email: email("leitura"), perfil: "leitura" });
  ok(leitura.status === 201, "mas cria alguém com perfil comum");
  if (leitura.corpo.id) criadosEquipe.push(leitura.corpo.id);

  // ── Regras de segurança do administrador ──────────────────────────────────
  ok((await doAdmin.put(`/api/painel/equipe/${admin.id}`, { ativo: false })).status === 403, "ninguém se desativa");
  ok((await doAdmin.put(`/api/painel/equipe/${admin.id}`, { perfil: "leitura" })).status === 403, "ninguém rebaixa o próprio acesso");
  ok((await doAdmin.post(`/api/painel/equipe/${admin.id}/redefinir-senha`)).status === 403, "ninguém redefine a própria senha por aqui");
  const editou = await doAdmin.put(`/api/painel/equipe/${criado.corpo.id}`, { perfil: "supervisor", setores: ["financeiro"] });
  ok(editou.status === 200 && editou.corpo.permissoes.includes("suporte_supervisor"), "administrador muda o perfil de alguém");

  // ── Desativar e redefinir senha cortam o acesso na hora ────────────────────
  const antesTokenAtendente = (await anonimo.post("/api/painel/auth/login", { email: email("atendente"), senha: "Outra-Senha-2026" })).corpo;
  ok((await doAdmin.put(`/api/painel/equipe/${criado.corpo.id}`, { ativo: false })).status === 200, "administrador desativa o atendente");
  ok((await cliente(api.base, antesTokenAtendente.token).get("/api/painel/auth/me")).status === 401, "o token dele deixa de valer na hora (401)");
  ok((await anonimo.post("/api/painel/auth/refresh", { refreshToken: antesTokenAtendente.refreshToken })).status === 401, "e o refresh também");
  ok((await anonimo.post("/api/painel/auth/login", { email: email("atendente"), senha: "Outra-Senha-2026" })).status === 401, "e ele não consegue entrar de novo");
  ok((await doAdmin.put(`/api/painel/equipe/${criado.corpo.id}`, { ativo: true })).status === 200, "administrador reativa");
  const novaTemp = await doAdmin.post(`/api/painel/equipe/${criado.corpo.id}/redefinir-senha`);
  ok(novaTemp.status === 200 && novaTemp.corpo.senhaTemporaria?.length === 14, "administrador redefine a senha e recebe uma nova provisória");
  ok((await anonimo.post("/api/painel/auth/login", { email: email("atendente"), senha: "Outra-Senha-2026" })).status === 401, "a senha antiga deixa de valer");
  ok((await anonimo.post("/api/painel/auth/login", { email: email("atendente"), senha: novaTemp.corpo.senhaTemporaria })).corpo.equipe?.trocarSenha === true, "a provisória nova exige troca");

  // ── Auditoria ──────────────────────────────────────────────────────────────
  const aud = await doAdmin.get(`/api/painel/auditoria?equipeId=${admin.id}&limite=100`);
  const acoes = new Set((aud.corpo.itens || []).map(i => i.acao));
  ok(aud.status === 200 && ["login", "equipe_criou", "equipe_editou", "equipe_desativou", "equipe_reativou", "equipe_redefiniu_senha"].every(a => acoes.has(a)), "a auditoria registrou login, criação, edição, desativação, reativação e redefinição");
  ok((aud.corpo.itens || []).every(i => i.equipe?.nome && !("senha" in (i.equipe || {}))), "a auditoria mostra quem fez, sem dados sensíveis");
  ok((await doAdmin.get("/api/painel/auditoria?acao=login_falhou")).corpo.itens.some(i => i.detalhe === email("ninguem")), "tentativas de login erradas ficam registradas");

  // ── PAINEL_HOST ────────────────────────────────────────────────────────────
  const noEndereco = cliente(guardado.base, null, "painel.teste.local");
  const foraDoEndereco = cliente(guardado.base, null, "construktpro.com.br");
  ok((await noEndereco.post("/api/painel/auth/login", { email: admin.email, senha: SENHA_ADMIN })).status === 200, "com PAINEL_HOST, o endereço do painel funciona");
  ok((await foraDoEndereco.post("/api/painel/auth/login", { email: admin.email, senha: SENHA_ADMIN })).status === 404, "com PAINEL_HOST, qualquer outro endereço recebe 404");
  ok((await foraDoEndereco.get("/api/painel/equipe")).status === 404, "e a lista da equipe também");
} finally {
  await api.parar(); await guardado.parar();
  // Limpeza: só o que esta execução criou (marca única no e-mail)
  const ids = (await prisma.equipeUsuario.findMany({ where: { email: { startsWith: marca } }, select: { id: true } })).map(e => e.id);
  await prisma.auditoriaEquipe.deleteMany({ where: { OR: [{ equipeId: { in: ids } }, { acao: "login_falhou", detalhe: { startsWith: marca } }] } });
  const r = await prisma.equipeUsuario.deleteMany({ where: { email: { startsWith: marca } } });
  console.log(`limpeza: ${r.count} pessoa(s) da equipe de teste apagada(s)`);
  await prisma.$disconnect();
}
console.log(totalFalhas() ? `\n${totalFalhas()} verificação(ões) com falha` : "\nTodas as verificações passaram");
process.exit(totalFalhas() ? 1 : 0);
