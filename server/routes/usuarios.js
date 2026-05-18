import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId },
    include: { obrasAcesso: true },
    orderBy: { nome: "asc" },
  });
  res.json(users.map(u => ({ ...u, senha: undefined })));
});

router.post("/", async (req, res) => {
  if (req.user.role !== "tenant_admin") return res.status(403).json({ error: "Sem permissão." });
  const { nome, email, senha, permissoes, obrasAcesso } = req.body;
  const hash = await bcrypt.hash(senha, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: req.user.tenantId, nome, email, senha: hash,
      permissoes: permissoes || [],
      obrasAcesso: obrasAcesso?.length
        ? { create: obrasAcesso.map(obraId => ({ obraId })) }
        : undefined,
    },
    include: { obrasAcesso: true },
  });
  res.status(201).json({ ...user, senha: undefined });
});

router.put("/:id", async (req, res) => {
  if (req.user.role !== "tenant_admin") return res.status(403).json({ error: "Sem permissão." });
  const id = parseInt(req.params.id);
  // Verifica que o usuário pertence ao tenant antes de atualizar
  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Usuário não encontrado." });

  const { nome, email, senha, permissoes, obrasAcesso, ativo } = req.body;
  const data = { nome, email, permissoes: permissoes || [], ativo: ativo ?? true };
  if (senha) data.senha = await bcrypt.hash(senha, 10);

  await prisma.obraAcesso.deleteMany({ where: { userId: id } });
  if (obrasAcesso?.length) {
    await prisma.obraAcesso.createMany({ data: obrasAcesso.map(obraId => ({ userId: id, obraId })) });
  }

  const user = await prisma.user.update({ where: { id }, data, include: { obrasAcesso: true } });
  res.json({ ...user, senha: undefined });
});

router.patch("/:id/ativo", async (req, res) => {
  if (req.user.role !== "tenant_admin") return res.status(403).json({ error: "Sem permissão." });
  const id = parseInt(req.params.id);
  // Verifica que o usuário pertence ao tenant antes de alterar
  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: "Usuário não encontrado." });

  const user = await prisma.user.update({ where: { id }, data: { ativo: req.body.ativo } });
  res.json({ ...user, senha: undefined });
});

export default router;
