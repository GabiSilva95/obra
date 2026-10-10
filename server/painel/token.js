import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// Token da equipe: chave própria, audiência própria e claim `tipo: "equipe"`.
// Um token do cliente não abre o painel, e um da equipe não abre o sistema do cliente: o do cliente
// lê `req.user.tenantId`, e o Prisma ignora filtro `undefined` (devolveria todos os clientes).

const ACESSO_TTL = "15m";
export const REFRESH_HORAS = 12;

/** Chave derivada do JWT_SECRET (não exige variável nova na Vercel); JWT_SECRET_EQUIPE a substitui. */
export function chaveEquipe() {
  if (process.env.JWT_SECRET_EQUIPE) return process.env.JWT_SECRET_EQUIPE;
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET não definido.");
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update("equipe").digest("hex");
}

export const assinarAcessoEquipe = equipe =>
  jwt.sign({ equipeId: equipe.id, tipo: "equipe" }, chaveEquipe(), { expiresIn: ACESSO_TTL, audience: "painel" });

/** Devolve o conteúdo do token ou lança se for inválido, expirado, de outra audiência ou de outro tipo. */
export function verificarAcessoEquipe(token) {
  const p = jwt.verify(token, chaveEquipe(), { audience: "painel" });
  if (p.tipo !== "equipe" || !Number.isInteger(p.equipeId)) throw new Error("Token de outro tipo.");
  return p;
}

export const novoRefreshEquipe = () => crypto.randomBytes(48).toString("hex");
