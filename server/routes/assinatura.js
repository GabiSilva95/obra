import { Router } from "express";
import prisma from "../db.js";
import { ACEITE_MENSAGENS, ehContaInterna } from "../config/conta.js";
import { getLimites, resolverPlano } from "../config/planos.js";
import { CICLOS, valorListaCent } from "../config/cobranca.js";
import { emCentavos, emReais } from "../financeiro/dinheiro.js";
import { ErroNegocio } from "../financeiro/erro.js";
import { rota } from "../painel/rota.js";
import { provedorAtivo } from "../pagamentos/provedores.js";
import { ErroGateway, configStripe, stripeApi } from "../pagamentos/stripe.js";
import { faturasDoCliente } from "../cobranca/servico.js";
import { normalizarTelefoneBR } from "../utils/telefone.js";
import { tenantParaCliente } from "../utils/tenantPublico.js";
import { hojeBR } from "../utils/datas.js";

/**
 * A assinatura do próprio cliente (`/api/assinatura`). Liberada mesmo com a conta bloqueada:
 * é por aqui que a tela de bloqueio descobre o que aconteceu, vê as faturas e quando o acesso volta.
 * Faturas e contato são do administrador da empresa.
 */
const router = Router();
/** O pagamento online (Stripe) está ligado e configurado neste ambiente? */
const pagamentoOnline = () => provedorAtivo().id === "stripe" && configStripe().pronto;
const soAdmin = (req, res, next) => (req.user.role === "tenant_admin" ? next() : res.status(403).json({ error: "Só o administrador da empresa vê a assinatura e as faturas." }));

router.get("/", async (req, res, next) => {
  try {
    const t = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    if (!t) return res.status(404).json({ error: "Conta não encontrada." });
    res.json(tenantParaCliente(t));
  } catch (e) { next(e); }
});

/** Tudo da tela Assinatura: a conta, o plano, quanto paga e as faturas. */
router.get("/resumo", soAdmin, async (req, res, next) => {
  try {
    const t = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, include: { assinatura: true } });
    if (!t) return res.status(404).json({ error: "Conta não encontrada." });
    const hoje = hojeBR();
    const faturas = await faturasDoCliente(t.id, hoje);
    const lim = getLimites(t.plano);
    res.json({
      conta: tenantParaCliente(t, hoje),
      plano: { nome: lim.label, ciclo: t.ciclo, valorLista: emReais(valorListaCent(t.plano, t.ciclo)), obras: Number.isFinite(lim.obras) ? lim.obras : null, usuarios: Number.isFinite(lim.usuarios) ? lim.usuarios : null },
      // Quanto este cliente paga de fato (pode ser um preço combinado); cortesia não mostra valor
      assinatura: t.assinatura && !t.assinatura.cortesia ? { valor: Number(t.assinatura.valor), diaVencimento: t.assinatura.diaVencimento } : null,
      // Pagamento online: o cliente assina e paga sozinho (Stripe) ou combina com a equipe por um chamado
      pagamento: { online: pagamentoOnline(), cartao: t.assinatura?.gateway === "stripe" && !!t.assinatura.gatewayClienteId },
      cortesia: !!t.assinatura?.cortesia,
      faturas,
      emAtraso: faturas.filter(f => f.situacao === "atrasada").length,
    });
  } catch (e) { next(e); }
});

/**
 * Começa a assinatura no cartão: cria (ou reaproveita) o cliente no Stripe e abre o Checkout hospedado, que cobra todo mês ou ano.
 * O preço é o de lista do plano e ciclo escolhidos, ou o combinado com a equipe se for o mesmo plano e ciclo. A ativação da conta vem pelo
 * webhook quando a primeira fatura for paga (o navegador volta para a tela Assinatura e acompanha).
 */
router.post("/checkout", soAdmin, rota(async (req, res) => {
  if (!pagamentoOnline()) throw new ErroNegocio("O pagamento online ainda não está disponível. Abra um chamado e a equipe combina a assinatura com você.", 409);
  const plano = resolverPlano(String(req.body?.plano ?? ""));
  const ciclo = String(req.body?.ciclo ?? "");
  if (!plano || !CICLOS.includes(ciclo)) throw new ErroNegocio("Escolha o plano e o ciclo (mensal ou anual).");
  const t = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, include: { assinatura: true } });
  if (!t) throw new ErroNegocio("Conta não encontrada.", 404);
  if (ehContaInterna(t)) throw new ErroNegocio("A conta interna da casa não tem assinatura.", 409);
  if (t.assinatura?.cortesia) throw new ErroNegocio("A sua conta está em cortesia: fale com a equipe pelo suporte para mudar isso.", 409);
  if (t.assinatura?.gateway === "stripe" && t.assinatura.gatewayAssinaturaId && ["ativo", "inadimplente"].includes(t.status)) {
    throw new ErroNegocio("Você já tem uma assinatura no cartão. Use \"Gerenciar pagamento\" para trocar o cartão ou cancelar.", 409);
  }
  const combinado = t.assinatura && t.plano === plano && t.ciclo === ciclo ? emCentavos(t.assinatura.valor) : null;
  const valorCent = combinado ?? valorListaCent(plano, ciclo);

  try {
    let clienteId = t.assinatura?.gatewayClienteId;
    if (!clienteId) {
      clienteId = (await stripeApi.criarCliente({ email: t.email, nome: t.razaoSocial, tenantId: t.id })).id;
      // Guarda o cliente já agora (sem marcar o gateway: a empresa só passa a ser cobrada lá quando a assinatura existir)
      await prisma.assinatura.upsert({ where: { tenantId: t.id }, update: { gatewayClienteId: clienteId }, create: { tenantId: t.id, valor: emReais(valorListaCent(t.plano, t.ciclo)), gatewayClienteId: clienteId } });
    }
    const app = configStripe().appUrl;
    const sessao = await stripeApi.criarCheckout({
      clienteId, tenantId: t.id, plano, ciclo, valorCent, nomeProduto: `ConstruktPro ${getLimites(plano).label} (${ciclo === "anual" ? "anual" : "mensal"})`,
      sucessoUrl: `${app}/app/assinatura?checkout=ok`, cancelaUrl: `${app}/app/assinatura?checkout=cancelado`,
    });
    res.json({ url: sessao.url });
  } catch (e) {
    if (!(e instanceof ErroGateway)) throw e;
    console.error(`[assinatura] checkout da empresa ${t.id}:`, e.message);
    throw new ErroNegocio("Não foi possível abrir o pagamento agora. Tente de novo em instantes ou fale com a equipe pelo suporte.", 502);
  }
}));

/** Portal do cliente da Stripe: trocar o cartão, ver as faturas e cancelar. Só para quem já assina no cartão. */
router.post("/portal", soAdmin, rota(async (req, res) => {
  if (!pagamentoOnline()) throw new ErroNegocio("O pagamento online ainda não está disponível.", 409);
  const ass = await prisma.assinatura.findUnique({ where: { tenantId: req.user.tenantId } });
  if (ass?.gateway !== "stripe" || !ass.gatewayClienteId) throw new ErroNegocio("Você ainda não tem uma assinatura no cartão.", 409);
  try {
    const p = await stripeApi.criarPortal({ clienteId: ass.gatewayClienteId, retornoUrl: `${configStripe().appUrl}/app/assinatura` });
    res.json({ url: p.url });
  } catch (e) {
    if (!(e instanceof ErroGateway)) throw e;
    console.error(`[assinatura] portal da empresa ${req.user.tenantId}:`, e.message);
    throw new ErroNegocio("Não foi possível abrir o portal agora. Tente de novo em instantes ou fale com a equipe pelo suporte.", 502);
  }
}));

/**
 * Telefone e aceite de mensagens: contas antigas ficaram sem aceite. O texto aceito é o do servidor (versionado),
 * nunca o que o navegador mandar. Só concede o aceite; retirar o consentimento é pelo suporte.
 */
router.patch("/contato", soAdmin, async (req, res, next) => {
  try {
    const dados = {};
    if (req.body?.telefone !== undefined) {
      const tel = normalizarTelefoneBR(req.body.telefone);
      if (!tel) return res.status(400).json({ error: "Informe um telefone válido, com DDD." });
      dados.telefone = tel;
    }
    if (req.body?.aceiteMensagens === true) {
      const atual = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: { aceiteMensagensEm: true } });
      if (!atual?.aceiteMensagensEm) {
        dados.aceiteMensagensEm = new Date();
        dados.aceiteMensagensTexto = `${ACEITE_MENSAGENS.versao}: ${ACEITE_MENSAGENS.texto}`;
        dados.aceiteMensagensIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString().split(",")[0].trim().slice(0, 45) || null;
      }
    }
    if (!Object.keys(dados).length) return res.status(400).json({ error: "Nada para atualizar." });
    const t = await prisma.tenant.update({ where: { id: req.user.tenantId }, data: dados });
    res.json(tenantParaCliente(t));
  } catch (e) { next(e); }
});

export default router;
