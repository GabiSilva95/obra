import prisma from "../db.js";
import { hojeBR } from "../utils/datas.js";
import { ErroNegocio } from "../financeiro/erro.js";
import { formaValida } from "../config/cobranca.js";
import { estornarPagamento, registrarPagamento } from "../cobranca/servico.js";
import { sincronizarAssinatura, sincronizarCheckout, sincronizarFatura } from "../cobranca/gateway.js";
import { invalidarConta } from "../middleware/conta.js";
import { obterProvedor } from "./provedores.js";

const TX = { timeout: 30000, maxWait: 10000 };

/**
 * Recebe um aviso de gateway: confere a origem, registra o evento (chave `gateway + eventoId`) e aplica o efeito na cobrança,
 * tudo numa transação. Se aplicar falha, o evento não fica gravado e o gateway, que reenvia, será processado de verdade na
 * próxima tentativa. O mesmo evento repetido responde 200 `duplicado` e não faz nada.
 * Devolve { http, corpo }: 2xx rápido sempre que o aviso é legítimo, mesmo que não haja o que fazer (o gateway pararia de tentar).
 */
export async function receberWebhook(gatewayId, req) {
  const provedor = obterProvedor(gatewayId);
  if (!provedor?.automatico) return { http: 404, corpo: { error: "Não encontrado." } };
  if (!provedor.verificarWebhook(req)) return { http: 401, corpo: { error: "Aviso não autenticado." } };
  const evento = provedor.interpretarWebhook(req.body);
  if (!evento?.eventoId) return { http: 400, corpo: { error: "Aviso inválido." } };

  const hoje = hojeBR();
  try {
    const r = await prisma.$transaction(async tx => {
      const registro = await tx.eventoPagamento.create({ data: { gateway: provedor.id, eventoId: evento.eventoId, tipo: evento.tipo, payload: req.body } });
      const resultado = await aplicar(tx, provedor.id, evento, hoje);
      await tx.eventoPagamento.update({ where: { id: registro.id }, data: { resultado: resultado.rotulo } });
      return resultado;
    }, TX);
    if (r.tenantId) invalidarConta(r.tenantId);
    return { http: 200, corpo: { ok: true, resultado: r.rotulo } };
  } catch (e) {
    if (e.code === "P2002") return { http: 200, corpo: { ok: true, resultado: "duplicado" } };
    console.error(`[pagamentos] ${gatewayId}: falha ao processar o evento ${evento.eventoId}:`, e);
    return { http: 500, corpo: { error: "Falha ao processar." } };
  }
}

async function aplicar(tx, gateway, evento, hoje) {
  // Aviso legítimo que a regra de negócio recusa (valor absurdo, cobrança que mudou) não pode virar 500: o gateway insistiria para sempre
  try { return await aplicarEvento(tx, gateway, evento, hoje); }
  catch (e) { if (e instanceof ErroNegocio) return { rotulo: `ignorado: ${e.message}` }; throw e; }
}

async function aplicarEvento(tx, gateway, evento, hoje) {
  // Gateways recorrentes (Stripe) mandam faturas, mudanças de assinatura e checkout; o resto é o aviso simples de pagamento (provedor de teste)
  if (evento.tipo === "fatura") return sincronizarFatura(tx, gateway, evento, hoje);
  if (evento.tipo === "assinatura") return sincronizarAssinatura(tx, gateway, evento.assinatura);
  if (evento.tipo === "checkout") return sincronizarCheckout(tx, gateway, evento.sessao);
  if (evento.tipo !== "pagamento_confirmado" && evento.tipo !== "pagamento_estornado") return { rotulo: `ignorado: ${evento.rotulo ?? "tipo sem efeito"}` };
  const c = evento.cobrancaExterna ? await tx.cobranca.findFirst({ where: { gateway, gatewayId: evento.cobrancaExterna } }) : null;
  if (!c) return { rotulo: "ignorado: cobrança não encontrada" };

  if (evento.tipo === "pagamento_estornado") {
    if (c.status !== "paga") return { rotulo: "ignorado: a cobrança não estava paga", tenantId: c.tenantId };
    await estornarPagamento(tx, c.id);
    return { rotulo: "estornado", tenantId: c.tenantId };
  }
  if (c.status !== "aberta") return { rotulo: `ignorado: cobrança ${c.status}`, tenantId: c.tenantId };
  const pagaEm = /^\d{4}-\d{2}-\d{2}$/.test(String(evento.pagoEm)) && evento.pagoEm <= hoje ? evento.pagoEm : hoje;
  await registrarPagamento(tx, c.id, { pagaEm, forma: formaValida(evento.forma) ? evento.forma : undefined, valorPago: evento.valor > 0 ? evento.valor : undefined }, hoje);
  return { rotulo: "pago", tenantId: c.tenantId };
}
