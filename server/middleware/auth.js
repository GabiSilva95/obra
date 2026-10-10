import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Token ausente" });
  try {
    const user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    // Defesa em profundidade: o token da equipe usa outra chave e nem chega a verificar aqui, mas nunca passa
    if (user.tipo === "equipe") return res.status(401).json({ error: "Token inválido" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

export function requireTenant(req, res, next) {
  if (!req.user?.tenantId) return res.status(403).json({ error: "Sem tenant" });
  next();
}
