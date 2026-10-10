import { Router } from "express";
import { chatLimiter } from "../middleware/rateLimiter.js";
import { equipeAuth } from "./middleware.js";
import { exigirPermissao, somenteHostDoPainel } from "./guardas.js";
import { login, logout, me, refresh, trocarSenha } from "./rotas/auth.js";
import equipeRoutes from "./rotas/equipe.js";
import auditoriaRoutes from "./rotas/auditoria.js";
import atendimentoRoutes from "./rotas/atendimento.js";
import chamadosRoutes from "./rotas/chamados.js";
import clientesRoutes from "./rotas/clientes.js";
import financeiroRoutes from "./rotas/financeiro.js";
import visaoGeralRoutes from "./rotas/visaoGeral.js";

/**
 * API do painel interno (`/api/painel`). Montada ANTES do authMiddleware do cliente em server/index.js:
 * o painel tem login, chave e permissões próprios e nunca passa pelo token do cliente.
 */
const router = Router();
router.use(somenteHostDoPainel);

router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.post("/auth/logout", logout);

router.use(equipeAuth);
router.get("/auth/me", me);
router.post("/auth/trocar-senha", trocarSenha);
router.use("/equipe", exigirPermissao("equipe"), equipeRoutes);
router.use("/auditoria", exigirPermissao("equipe"), auditoriaRoutes);
// Depois da autenticação, o limitador conhece a pessoa: um escritório com vários atendentes no mesmo IP não se atrapalha
router.use("/atendimento", chatLimiter, exigirPermissao("suporte"), atendimentoRoutes);
router.use("/chamados", chatLimiter, exigirPermissao("suporte"), chamadosRoutes);
// Cada rota de clientes confere a própria permissão (ver, editar ou entrar)
router.use("/clientes", clientesRoutes);
router.use("/financeiro", exigirPermissao("financeiro"), financeiroRoutes);
// Cada pessoa recebe só as áreas que pode ver; o sino consulta toda hora, então tem o limitador por pessoa
router.use("/visao-geral", chatLimiter, visaoGeralRoutes);

export default router;
