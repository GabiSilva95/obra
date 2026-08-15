import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import prisma from "../db.js";
import { normalizarPlano } from "../config/planos.js";
import { popularDadosReferencia } from "../config/dadosReferencia.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCESS_TTL   = "15m";                          // access token curto
const REFRESH_DAYS = 30;                             // refresh token longo

function makeAccessToken(user) {
  return jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

async function makeRefreshToken(userId, tenantId) {
  const token     = randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tenantId, token, expiresAt } });
  return token;
}

// ─── Registro ─────────────────────────────────────────────────────────────────

router.post("/registro", async (req, res) => {
  const { razaoSocial, cnpj, email, nome, senha, plano } = req.body;
  if (!razaoSocial || !cnpj || !email || !nome || !senha)
    return res.status(400).json({ error: "Preencha todos os campos." });

  const existe = await prisma.tenant.findUnique({ where: { cnpj } });
  if (existe) return res.status(400).json({ error: "CNPJ já cadastrado." });

  const hash   = await bcrypt.hash(senha, 10);
  const tenant = await prisma.tenant.create({
    data: {
      razaoSocial, cnpj, email, plano: normalizarPlano(plano || "starter"),
      users: { create: { nome, email, senha: hash, role: "tenant_admin" } },
    },
    include: { users: true },
  });

  // A conta precisa nascer utilizável: sem tipos de etapa, categorias e insumos
  // o usuário não consegue criar a primeira obra. Falha aqui não invalida o
  // cadastro — o tenant já existe e as listas podem ser recriadas depois.
  try {
    await popularDadosReferencia(prisma, tenant.id);
  } catch (e) {
    console.error(`[registro] falha ao popular dados de referência do tenant ${tenant.id}:`, e);
  }

  const user         = tenant.users[0];
  const accessToken  = makeAccessToken(user);
  const refreshToken = await makeRefreshToken(user.id, tenant.id);

  res.json({
    token: accessToken,
    refreshToken,
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    tenantId: tenant.id,
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "E-mail e senha obrigatórios." });

  // Busca todos os usuários ativos com esse e-mail e valida senha
  const candidates = await prisma.user.findMany({
    where: { email, ativo: true },
    include: { tenant: true },
  });

  let matchedUser = null;
  for (const candidate of candidates) {
    if (await bcrypt.compare(senha, candidate.senha)) { matchedUser = candidate; break; }
  }

  if (!matchedUser) return res.status(401).json({ error: "Credenciais inválidas." });

  const accessToken  = makeAccessToken(matchedUser);
  const refreshToken = await makeRefreshToken(matchedUser.id, matchedUser.tenantId);

  res.json({
    token: accessToken,
    refreshToken,
    user: { id: matchedUser.id, nome: matchedUser.nome, email: matchedUser.email, role: matchedUser.role, permissoes: matchedUser.permissoes },
    tenant: matchedUser.tenant,
  });
});

// ─── Refresh ──────────────────────────────────────────────────────────────────

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token ausente." });

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: { include: { tenant: true } } },
  });

  if (!stored || stored.revogado || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: "Refresh token inválido ou expirado." });
  }

  if (!stored.user.ativo) return res.status(401).json({ error: "Usuário inativo." });

  // Rotaciona o refresh token (revoga o antigo, cria novo)
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revogado: true } });

  const accessToken     = makeAccessToken(stored.user);
  const newRefreshToken = await makeRefreshToken(stored.userId, stored.tenantId);

  res.json({ token: accessToken, refreshToken: newRefreshToken });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data:  { revogado: true },
    }).catch(() => {});
  }
  res.json({ ok: true });
});

export default router;
