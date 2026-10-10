import prisma from "../db.js";
import { verificarAcessoEquipe } from "./token.js";

// Enquanto a senha provisória não for trocada, só estas rotas funcionam
const LIBERADAS_SEM_TROCA = new Set(["/auth/me", "/auth/trocar-senha", "/auth/logout"]);

/** Exige token da equipe; carrega a pessoa do banco (permissão atual, não a do token) e recusa quem foi desativado. */
export async function equipeAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token ausente." });
    let payload;
    try { payload = verificarAcessoEquipe(h.slice(7)); } catch { return res.status(401).json({ error: "Token inválido." }); }
    const e = await prisma.equipeUsuario.findFirst({
      where: { id: payload.equipeId, ativo: true },
      select: { id: true, nome: true, email: true, papel: true, permissoes: true, trocarSenha: true, setores: true },
    });
    if (!e) return res.status(401).json({ error: "Acesso desativado." });
    if (e.trocarSenha && !LIBERADAS_SEM_TROCA.has(req.path)) return res.status(403).json({ error: "Troque a senha provisória para continuar.", codigo: "TROCAR_SENHA" });
    req.equipe = e;
    next();
  } catch (err) { next(err); }
}
