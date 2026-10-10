import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../db.js";
import { rota, ErroNegocio } from "../rota.js";
import { registrarAuditoria } from "../auditoria.js";
import { senhaTemporaria } from "../senha.js";
import { CUSTO } from "./auth.js";
import { PAPEL_ADMIN, PERFIS_EQUIPE, permissoesValidas } from "../../config/painel.js";

const router = Router();

const CAMPOS = { id: true, nome: true, email: true, papel: true, ativo: true, permissoes: true, setores: true, statusAtendimento: true, ultimoSinalEm: true, ultimoLoginEm: true, trocarSenha: true, createdAt: true };
const emailValido = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const souAdmin = req => req.equipe.papel === PAPEL_ADMIN;

/** Perfil pronto, ou a lista de permissões escolhida à mão. Quem não é administrador não concede administração nem a permissão `equipe`. */
function resolverAcesso(req, { perfil, permissoes }) {
  const p = PERFIS_EQUIPE.find(x => x.id === perfil);
  const papel = p ? p.papel : "atendente";
  const lista = p ? p.permissoes : permissoesValidas(permissoes);
  if (!souAdmin(req) && (papel === PAPEL_ADMIN || lista.includes("equipe"))) throw new ErroNegocio("Só um administrador da equipe concede acesso à equipe e à auditoria.", 403);
  return { papel, permissoes: p ? [...p.permissoes] : lista };
}

async function administradoresAtivos(exceto) {
  return prisma.equipeUsuario.count({ where: { papel: PAPEL_ADMIN, ativo: true, ...(exceto ? { id: { not: exceto } } : {}) } });
}

async function alvo(req) {
  const id = parseInt(req.params.id);
  const e = Number.isInteger(id) ? await prisma.equipeUsuario.findUnique({ where: { id }, select: CAMPOS }) : null;
  if (!e) throw new ErroNegocio("Pessoa não encontrada.", 404);
  if (e.papel === PAPEL_ADMIN && !souAdmin(req)) throw new ErroNegocio("Só um administrador da equipe altera outro administrador.", 403);
  return e;
}

router.get("/", rota(async (req, res) => {
  const itens = await prisma.equipeUsuario.findMany({ select: CAMPOS, orderBy: [{ ativo: "desc" }, { nome: "asc" }] });
  res.json(itens);
}));

router.post("/", rota(async (req, res) => {
  const nome = String(req.body?.nome ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!nome) throw new ErroNegocio("Informe o nome.");
  if (!emailValido(email)) throw new ErroNegocio("Informe um e-mail válido.");
  if (await prisma.equipeUsuario.findUnique({ where: { email } })) throw new ErroNegocio("Esse e-mail já está na equipe.", 409);
  const { papel, permissoes } = resolverAcesso(req, req.body || {});
  const temporaria = senhaTemporaria();
  const criada = await prisma.equipeUsuario.create({
    data: { nome, email, senha: await bcrypt.hash(temporaria, CUSTO), papel, permissoes, setores: Array.isArray(req.body?.setores) ? req.body.setores.map(String).slice(0, 12) : [], trocarSenha: true },
    select: CAMPOS,
  });
  await registrarAuditoria(req, { acao: "equipe_criou", alvoTipo: "equipe", alvoId: criada.id, detalhe: `${criada.email} (${papel}: ${permissoes.join(", ") || "sem permissões"})` });
  // A senha provisória só aparece agora: quem criou a entrega à pessoa, que a troca no primeiro acesso
  res.status(201).json({ ...criada, senhaTemporaria: temporaria });
}));

router.put("/:id", rota(async (req, res) => {
  const e = await alvo(req);
  const eu = e.id === req.equipe.id;
  const dados = {};
  if (req.body?.nome !== undefined) { const n = String(req.body.nome).trim(); if (!n) throw new ErroNegocio("Informe o nome."); dados.nome = n; }
  if (Array.isArray(req.body?.setores)) dados.setores = req.body.setores.map(String).slice(0, 12);
  const mudaAcesso = req.body?.perfil !== undefined || req.body?.permissoes !== undefined;
  const mudaAtivo = req.body?.ativo !== undefined && !!req.body.ativo !== e.ativo;
  if (eu && (mudaAcesso || mudaAtivo)) throw new ErroNegocio("Você não pode mudar o próprio acesso nem se desativar. Peça a outro administrador.", 403);
  if (mudaAcesso) {
    const novo = resolverAcesso(req, req.body);
    if (e.papel === PAPEL_ADMIN && novo.papel !== PAPEL_ADMIN && (await administradoresAtivos(e.id)) < 1) throw new ErroNegocio("A equipe precisa ter pelo menos um administrador ativo.");
    dados.papel = novo.papel; dados.permissoes = novo.permissoes;
  }
  if (mudaAtivo) {
    if (!req.body.ativo && e.papel === PAPEL_ADMIN && (await administradoresAtivos(e.id)) < 1) throw new ErroNegocio("A equipe precisa ter pelo menos um administrador ativo.");
    dados.ativo = !!req.body.ativo;
    if (!dados.ativo) dados.statusAtendimento = "ausente";
  }
  const atualizada = await prisma.equipeUsuario.update({ where: { id: e.id }, data: dados, select: CAMPOS });
  if (dados.ativo === false) await prisma.equipeRefreshToken.updateMany({ where: { equipeId: e.id, revogado: false }, data: { revogado: true } });
  await registrarAuditoria(req, {
    acao: dados.ativo === false ? "equipe_desativou" : dados.ativo === true ? "equipe_reativou" : "equipe_editou", alvoTipo: "equipe", alvoId: e.id,
    detalhe: [dados.nome && "nome", dados.permissoes && `acesso: ${dados.papel}, ${dados.permissoes.join(", ")}`, dados.setores && "setores"].filter(Boolean).join("; ") || undefined,
  });
  res.json(atualizada);
}));

router.post("/:id/redefinir-senha", rota(async (req, res) => {
  const e = await alvo(req);
  if (e.id === req.equipe.id) throw new ErroNegocio("Para trocar a própria senha, use a opção Trocar senha.", 403);
  const temporaria = senhaTemporaria();
  await prisma.equipeUsuario.update({ where: { id: e.id }, data: { senha: await bcrypt.hash(temporaria, CUSTO), trocarSenha: true } });
  await prisma.equipeRefreshToken.updateMany({ where: { equipeId: e.id, revogado: false }, data: { revogado: true } });
  await registrarAuditoria(req, { acao: "equipe_redefiniu_senha", alvoTipo: "equipe", alvoId: e.id });
  res.json({ senhaTemporaria: temporaria });
}));

export default router;
