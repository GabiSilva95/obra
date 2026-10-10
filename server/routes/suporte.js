import { Router } from "express";
import { rota } from "../painel/rota.js";
import * as suporte from "../suporte/servico.js";

/**
 * Suporte, lado do cliente (`/api/suporte`): chamados (ticket) e chat ao vivo.
 * Tudo escopado pela empresa do token. O administrador da empresa vê os chamados de todos; os demais, só os seus.
 * Notas internas da equipe nunca saem daqui (o serviço filtra no banco, não na tela).
 */
const router = Router();

router.get("/config", rota(async (req, res) => res.json(await suporte.configCliente(req.user))));
router.get("/resumo", rota(async (req, res) => res.json(await suporte.resumoCliente(req.user))));

router.get("/chamados", rota(async (req, res) => res.json(await suporte.listarCliente(req.user, { status: req.query.status }))));
router.post("/chamados", rota(async (req, res) => res.status(201).json(await suporte.abrirChamado(req.user, req.body || {}))));
router.get("/chamados/:id", rota(async (req, res) => res.json(await suporte.detalheCliente(req.user, req.params.id))));
router.post("/chamados/:id/mensagens", rota(async (req, res) => res.status(201).json(await suporte.responderCliente(req.user, req.params.id, req.body || {}))));
router.post("/chamados/:id/resolver", rota(async (req, res) => res.json(await suporte.resolverCliente(req.user, req.params.id))));
router.post("/chamados/:id/avaliar", rota(async (req, res) => res.json(await suporte.avaliarCliente(req.user, req.params.id, req.body?.nota))));
router.get("/chamados/:id/anexos/:anexoId", rota(async (req, res) => {
  const a = await suporte.anexoDoChamado({ user: req.user, ticketId: req.params.id, anexoId: req.params.anexoId });
  res.setHeader("Content-Type", a.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(a.nome)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(a.dados);
}));

// O chat é presença ao vivo (a consulta mantém o cliente na fila): a equipe em modo leitura não pode mexer nisso
router.use("/chat", (req, res, next) => req.user.leitura
  ? res.status(403).json({ error: "O chat não está disponível no modo leitura.", codigo: "MODO_LEITURA" })
  : next());
router.post("/chat/entrar", rota(async (req, res) => res.status(201).json(await suporte.entrarChat(req.user, req.body || {}))));
router.get("/chat/:id", rota(async (req, res) => res.json(await suporte.consultarChat(req.user, req.params.id, req.query.depois))));
router.post("/chat/:id/mensagens", rota(async (req, res) => res.status(201).json(await suporte.mensagemChat(req.user, req.params.id, req.body || {}))));
router.post("/chat/:id/sair", rota(async (req, res) => res.json(await suporte.sairChat(req.user, req.params.id))));
router.post("/chat/:id/avaliar", rota(async (req, res) => res.json(await suporte.avaliarCliente(req.user, req.params.id, req.body?.nota))));

export default router;
