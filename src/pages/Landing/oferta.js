// Conteúdo da oferta da landing que precisa ser exato: teste grátis, preço por dia e diagnóstico.
// A landing não mostra e-mail nem telefone (decisão de 10/10/2026).
// Regra: a landing só promete o que o sistema faz hoje (confira em src/treinamentos/conteudo.js).
// Extensão explícita nos imports para o `npm test` (node) conseguir carregar o arquivo.

import { DIAS_TESTE } from "../../../server/config/conta.js";
export { DIAS_TESTE };
/** Plano do teste quando a pessoa clica em "Testar grátis" fora dos cartões de preço. */
export const PLANO_DO_TESTE = "business";

/** Garantias do topo da página. A conta já nasce pronta (popularDadosReferencia, server/config/dadosReferencia.js). */
export const GARANTIAS_TOPO = ["Sem cartão de crédito", "Sem implantação: crie a conta e já use", "Funciona no celular, sem instalar nada"];

/** Frases de "sem implantação". "Contrate e já use" só entra depois que o pagamento for autoatendimento (Fase 4). */
export const SEM_IMPLANTACAO = {
  apoioComoFunciona: "Sem implantação: a conta já nasce pronta, com tipos de etapa, categorias de máquina e insumos de exemplo.",
  comparativo: { item: "Implantação", antes: "Você monta tudo do zero", agora: "Nenhuma: a conta já vem pronta" },
  duvida: { q: "Preciso de implantação ou de alguém para configurar?", a: "Não. Você cria a conta e já usa: ela nasce com tipos de etapa, categorias de máquina e insumos de exemplo. Cadastre a primeira obra e comece a lançar no mesmo dia." },
  garantiaPrecos: "Sem implantação: escolheu o plano, já usa",
};

/** Depoimentos reais (com autorização). Vazio, a seção não aparece: nunca invente um. */
export const DEPOIMENTOS = [];

/** Preço por dia de um plano mensal (mês de 30 dias), arredondado ao centavo. */
export const precoPorDia = precoMensal => Math.round((precoMensal * 100) / 30) / 100;

/** Quanto se economiza num ano pagando o anual. */
export const economiaAnual = plano => (plano.preco.mensal - plano.preco.anual) * 12;

/** "R$ 4,97" (sem espaço inquebrável, para o texto ser previsível em tela e em teste). */
export const reais = v => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** As dores do Raio-X e o que o sistema faz com cada uma (só o que existe no código). */
export const DORES = [
  { dor: "Só descubro se a obra deu lucro quando ela acaba.", solucao: "Lucro de cada obra a qualquer momento, em Financeiro > Resultado." },
  { dor: "O orçamento estoura e ninguém avisa antes.", solucao: "Aviso no sino quando a obra passa de 90% do orçamento." },
  { dor: "Compro material que já tinha, ou falta o que eu achava que tinha.", solucao: "Saldo de material por obra, da compra à baixa por etapa." },
  { dor: "Diária, máquina e frete ficam fora da conta.", solucao: "Diária, hora de máquina e despesa entram no custo da obra." },
  { dor: "A informação está no WhatsApp, no caderno e na cabeça do mestre de obras.", solucao: "Tudo num lugar só, no celular e no computador, com acesso por pessoa." },
];

/** Resultado do Raio-X pela quantidade de dores marcadas. */
export function resultadoDiagnostico(marcadas, total = DORES.length) {
  if (marcadas <= 0) return { titulo: `0 de ${total}`, texto: "Marque o que acontece na sua obra." };
  if (marcadas <= 2) return { titulo: `${marcadas} de ${total}`, texto: "Já tem dinheiro escapando da sua obra." };
  return { titulo: `${marcadas} de ${total}`, texto: "Sua obra está perdendo dinheiro em silêncio." };
}
