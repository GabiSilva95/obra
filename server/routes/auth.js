import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db.js";

const router = Router();

router.post("/registro", async (req, res) => {
  const { razaoSocial, cnpj, email, nome, senha, plano } = req.body;
  if (!razaoSocial || !cnpj || !email || !nome || !senha)
    return res.status(400).json({ error: "Preencha todos os campos." });

  const existe = await prisma.tenant.findUnique({ where: { cnpj } });
  if (existe) return res.status(400).json({ error: "CNPJ já cadastrado." });

  const hash = await bcrypt.hash(senha, 10);
  const tenant = await prisma.tenant.create({
    data: {
      razaoSocial, cnpj, email, plano: plano || "starter",
      users: {
        create: { nome, email, senha: hash, role: "tenant_admin" },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  const token = jwt.sign({ userId: user.id, tenantId: tenant.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role }, tenantId: tenant.id });
});

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "E-mail e senha obrigatórios." });

  // Busca todos os usuários ativos com esse e-mail (pode haver um por tenant)
  // e encontra aquele cuja senha bate — evita retornar usuário do tenant errado
  const candidates = await prisma.user.findMany({
    where: { email, ativo: true },
    include: { tenant: true },
  });

  let matchedUser = null;
  for (const candidate of candidates) {
    const ok = await bcrypt.compare(senha, candidate.senha);
    if (ok) { matchedUser = candidate; break; }
  }

  if (!matchedUser) return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign({ userId: matchedUser.id, tenantId: matchedUser.tenantId, role: matchedUser.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({
    token,
    user: { id: matchedUser.id, nome: matchedUser.nome, email: matchedUser.email, role: matchedUser.role, permissoes: matchedUser.permissoes },
    tenant: matchedUser.tenant,
  });
});

export default router;
