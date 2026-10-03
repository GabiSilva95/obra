import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// Preferências do próprio usuário logado (hoje: ocultar o tour de primeiros passos)
router.patch("/", async (req, res) => {
  const { ocultarTour } = req.body;
  if (typeof ocultarTour !== "boolean") return res.status(400).json({ error: "ocultarTour deve ser true ou false." });
  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: { ocultarTour },
    select: { ocultarTour: true },
  });
  res.json(user);
});

export default router;
