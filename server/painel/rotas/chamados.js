import { Router } from "express";
import { rota } from "../rota.js";
import { registrarAuditoria } from "../auditoria.js";
import { temPermissao } from "../../config/painel.js";
import * as suporte from "../../suporte/servico.js";

/** Chamados e conversas, lado da equipe: lista com filtros, conversa completa (com notas internas), resposta e mudanças. */
const router = Router();
const supervisor = req => temPermissao(req.equipe, "suporte_supervisor");

router.get("/", rota(async (req, res) => res.json(await suporte.listarEquipe(req.query))));
router.get("/:id", rota(async (req, res) => res.json(await suporte.detalheEquipe(req.params.id, { depois: req.query.depois }))));

router.post("/:id/mensagens", rota(async (req, res) => {
  const r = await suporte.responderEquipe(req.equipe, req.params.id, req.body || {}, { supervisor: supervisor(req) });
  if (r.alterou.status) await registrarAuditoria(req, { acao: "chamado_status", alvoTipo: "ticket", alvoId: r.id, ticketId: r.id, tenantId: r.empresa.id, detalhe: `resposta mudou para ${r.alterou.status}` });
  res.status(201).json(r);
}));

router.patch("/:id", rota(async (req, res) => {
  const { chamado, mudou } = await suporte.atualizarEquipe(req.equipe, req.params.id, req.body || {}, { supervisor: supervisor(req) });
  for (const m of mudou) await registrarAuditoria(req, { acao: m.acao, alvoTipo: "ticket", alvoId: chamado.id, ticketId: chamado.id, tenantId: chamado.empresa.id, detalhe: m.detalhe });
  res.json(chamado);
}));

router.get("/:id/anexos/:anexoId", rota(async (req, res) => {
  const a = await suporte.anexoDoChamado({ ticketId: req.params.id, anexoId: req.params.anexoId });
  res.setHeader("Content-Type", a.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(a.nome)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(a.dados);
}));

export default router;
