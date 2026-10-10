import bcrypt from "bcryptjs";
import prisma from "../../db.js";
import { rota, ErroNegocio } from "../rota.js";
import { assinarAcessoEquipe, novoRefreshEquipe, REFRESH_HORAS } from "../token.js";
import { validarSenhaEquipe } from "../../config/painel.js";
import { registrarAuditoria } from "../auditoria.js";

const CUSTO = 12;
let hashFalso; // para gastar o mesmo tempo quando o e-mail não existe (não revela quem é da equipe)

/** O que o painel pode saber de si mesmo. */
export const equipePublica = e => ({
  id: e.id, nome: e.nome, email: e.email, papel: e.papel, permissoes: e.permissoes, setores: e.setores, trocarSenha: e.trocarSenha,
});

async function abrirSessao(equipe) {
  const refreshToken = novoRefreshEquipe();
  await prisma.equipeRefreshToken.create({ data: { equipeId: equipe.id, token: refreshToken, expiresAt: new Date(Date.now() + REFRESH_HORAS * 3600 * 1000) } });
  return { token: assinarAcessoEquipe(equipe), refreshToken, equipe: equipePublica(equipe) };
}

export const login = rota(async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const senha = String(req.body?.senha ?? "");
  if (!email || !senha) throw new ErroNegocio("E-mail e senha obrigatórios.");
  const e = await prisma.equipeUsuario.findUnique({ where: { email } });
  hashFalso ??= bcrypt.hashSync("senha-que-nao-existe", CUSTO);
  const confere = await bcrypt.compare(senha, e?.senha ?? hashFalso);
  if (!e || !e.ativo || !confere) {
    await registrarAuditoria(req, { acao: "login_falhou", detalhe: email.slice(0, 120), equipeId: e?.id ?? null });
    throw new ErroNegocio("Credenciais inválidas.", 401);
  }
  await prisma.equipeUsuario.update({ where: { id: e.id }, data: { ultimoLoginEm: new Date() } });
  await registrarAuditoria(req, { acao: "login", equipeId: e.id });
  res.json(await abrirSessao(e));
});

export const refresh = rota(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new ErroNegocio("Refresh token ausente.");
  const guardado = await prisma.equipeRefreshToken.findUnique({ where: { token: String(refreshToken) }, include: { equipe: true } });
  if (!guardado || guardado.revogado || guardado.expiresAt < new Date() || !guardado.equipe.ativo) throw new ErroNegocio("Sessão expirada.", 401);
  // Rotaciona: o antigo deixa de valer no mesmo instante
  const { count } = await prisma.equipeRefreshToken.updateMany({ where: { id: guardado.id, revogado: false }, data: { revogado: true } });
  if (!count) throw new ErroNegocio("Sessão expirada.", 401);
  res.json(await abrirSessao(guardado.equipe));
});

export const logout = rota(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await prisma.equipeRefreshToken.updateMany({ where: { token: String(refreshToken) }, data: { revogado: true } });
  res.json({ ok: true });
});

export const me = rota(async (req, res) => res.json(equipePublica(req.equipe)));

export const trocarSenha = rota(async (req, res) => {
  const { senhaAtual, senhaNova } = req.body || {};
  const e = await prisma.equipeUsuario.findUnique({ where: { id: req.equipe.id } });
  if (!(await bcrypt.compare(String(senhaAtual ?? ""), e.senha))) throw new ErroNegocio("A senha atual não confere.", 400);
  const erro = validarSenhaEquipe(senhaNova);
  if (erro) throw new ErroNegocio(erro);
  if (senhaNova === senhaAtual) throw new ErroNegocio("A senha nova precisa ser diferente da atual.");
  const atualizada = await prisma.equipeUsuario.update({ where: { id: e.id }, data: { senha: await bcrypt.hash(senhaNova, CUSTO), trocarSenha: false } });
  // Outras sessões abertas com a senha antiga deixam de valer
  await prisma.equipeRefreshToken.updateMany({ where: { equipeId: e.id, revogado: false }, data: { revogado: true } });
  await registrarAuditoria(req, { acao: "senha_trocada", alvoTipo: "equipe", alvoId: e.id });
  res.json(await abrirSessao(atualizada));
});

export { CUSTO };
