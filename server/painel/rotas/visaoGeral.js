import { Router } from "express";
import { rota } from "../rota.js";
import { temPermissao } from "../../config/painel.js";
import * as cobranca from "../../cobranca/servico.js";
import { atendimentoAgora, atendimentoDoPeriodo, atrasoAgora, clientesDoPeriodo, testesAgora } from "../visaoGeral.js";
import { montarPendencias } from "../indicadores.js";

/**
 * Visão geral do painel (`/api/painel/visao-geral`): cada pessoa recebe só as áreas a que tem acesso
 * (atendimento: `suporte`; clientes: `clientes`; financeiro: `financeiro`). Só leitura.
 */
const router = Router();
const PERIODOS = [7, 30, 90];

router.get("/", rota(async (req, res) => {
  const dias = PERIODOS.includes(parseInt(req.query.dias, 10)) ? parseInt(req.query.dias, 10) : 30;
  const agora = Date.now();
  const [atendimento, clientes, financeiro] = await Promise.all([
    temPermissao(req.equipe, "suporte") ? atendimentoDoPeriodo(dias, agora) : null,
    temPermissao(req.equipe, "clientes") ? clientesDoPeriodo(agora) : null,
    temPermissao(req.equipe, "financeiro") ? cobranca.resumoFinanceiro() : null,
  ]);
  res.json({ dias, geradoEm: new Date(agora).toISOString(), atendimento, clientes, financeiro });
}));

/** O que pede atenção agora (o sino do painel): leve, para consultar a cada minuto. */
router.get("/pendencias", rota(async (req, res) => {
  const agora = Date.now();
  const [atendimento, testes, atraso] = await Promise.all([
    temPermissao(req.equipe, "suporte") ? atendimentoAgora(agora) : null,
    temPermissao(req.equipe, "clientes") ? testesAgora(agora) : null,
    temPermissao(req.equipe, "financeiro") ? atrasoAgora() : null,
  ]);
  res.json(montarPendencias({ atendimento, clientes: testes, financeiro: atraso }));
}));

export default router;
