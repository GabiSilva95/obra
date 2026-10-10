import { Router } from "express";
import { rota, ErroNegocio } from "../rota.js";
import { registrarAuditoria } from "../auditoria.js";
import { exigirPermissao } from "../guardas.js";
import { temPermissao } from "../../config/painel.js";
import * as suporte from "../../suporte/servico.js";
import { HORARIO_CHAT_PADRAO } from "../../config/suporte.js";

/** Tela Atendimento da equipe: fila do chat ao vivo, conversas em andamento, chamados abertos e atendentes. */
const router = Router();

router.get("/atendentes", rota(async (req, res) => res.json(await suporte.listarAtendentes())));
router.get("/estado", rota(async (req, res) => res.json(await suporte.estadoAtendimento(req.equipe))));

router.post("/presenca", rota(async (req, res) => {
  const r = await suporte.definirPresenca(req.equipe, req.body?.status);
  await registrarAuditoria(req, { acao: "presenca", detalhe: r.status });
  res.json(r);
}));

router.post("/proximo", rota(async (req, res) => {
  const ticketId = req.body?.ticketId ? parseInt(req.body.ticketId, 10) : undefined;
  if (ticketId && !temPermissao(req.equipe, "suporte_supervisor")) throw new ErroNegocio("Só o supervisor escolhe alguém fora da ordem da fila.", 403);
  const r = await suporte.assumirProximo(req.equipe, { ticketId });
  await registrarAuditoria(req, { acao: r.furouFila ? "fila_furada" : "chat_assumiu", alvoTipo: "ticket", alvoId: r.id, ticketId: r.id, tenantId: r.tenantId, detalhe: r.furouFila ? "supervisor escolheu fora da ordem" : undefined });
  res.json(await suporte.detalheEquipe(r.id));
}));

router.get("/config", rota(async (req, res) => res.json({ ...(await suporte.lerConfig()), horarioPadrao: HORARIO_CHAT_PADRAO })));
router.put("/config", exigirPermissao("suporte_supervisor"), rota(async (req, res) => {
  const cfg = await suporte.salvarConfig({ horario: req.body?.horario, capacidade: req.body?.capacidade });
  await registrarAuditoria(req, { acao: "atendimento_config", detalhe: `${cfg.capacidade} chats por atendente` });
  res.json(cfg);
}));

export default router;
