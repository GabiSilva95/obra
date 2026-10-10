// Tour de primeiros passos: abre a cada login até o usuário marcar "Não mostrar novamente".
// Cada passo destaca um item do menu (data-nav-id) e navega até a tela de que fala.
// No mobile, itens que não estão na barra inferior caem no botão "Menu".
// Mudou o menu ou o fluxo de uso? Atualize estes passos e a Central de treinamentos.

const alvoMenu = id => `[data-nav-id="${id}"], [data-nav-id="menu"]`;

const PASSOS = [
  {
    route: "dashboard",
    title: "Boas-vindas ao ConstruktPro",
    content: "Em poucos passos você vai ver onde fica cada parte do sistema e em que ordem usar. Use Próximo e Voltar (ou as setas do teclado). Pode fechar quando quiser.",
  },
  {
    menuId: "dashboard",
    title: "Início",
    content: "O resumo do que importa em três seções: Obras (cronograma e orçamento), Financeiro (contas a pagar, a receber e fluxo de caixa) e Estoque (posição do estoque e compras). É a tela que abre ao entrar.",
  },
  {
    menuId: "cadastros",
    title: "1º Cadastros: a base de tudo",
    content: "Cadastre tipos de etapa e de obra, pessoas (colaboradores, fornecedores e clientes) e insumos (materiais). Faça isso primeiro: sem insumo cadastrado não há compra nem estoque.",
  },
  {
    menuId: "obras",
    title: "2º Crie suas obras",
    content: "Cada obra tem cliente, endereço, datas, orçamento e etapas. As etapas organizam o cronograma e o custo. Quando: assim que fechar um contrato.",
  },
  {
    menuId: "maquinas",
    title: "Máquinas e equipamentos",
    content: "Registre a frota própria ou alugada. O sistema calcula o custo por hora de cada máquina, usado depois na Alocação.",
  },
  {
    menuId: "compras",
    title: "3º Compre materiais",
    content: "Crie a ordem de compra, aprove e marque como entregue: os itens entram no estoque com o custo unitário. Também dá para importar a nota fiscal (XML).",
  },
  {
    menuId: "estoque",
    title: "4º Controle o estoque",
    content: "Saldo de cada insumo por obra, baixa do que foi consumido e transferências entre obras. A entrada acontece quando a compra é entregue. Registre a baixa para o custo da obra ficar certo.",
  },
  {
    menuId: "alocacao",
    title: "Alocação de recursos",
    content: "Lance as horas que cada máquina trabalhou em cada obra. O custo por hora vezes as horas entra no custo da obra.",
  },
  {
    menuId: "diario",
    title: "Diário de obra",
    content: "Registre o dia: clima, equipe presente, atividades e ocorrências. A presença da equipe gera o custo de mão de obra. O ideal é preencher no fim de cada dia.",
  },
  {
    menuId: "financeiro",
    title: "Financeiro",
    content: "Contas a pagar e a receber com vencimento e rateio por obra, contas bancárias, conciliação do extrato, fluxo de caixa e o resultado de cada obra. Aparece para quem tem a permissão Financeiro.",
  },
  {
    menuId: "relatorios",
    title: "Relatórios",
    content: "Custos, cronograma e andamento de cada obra em um lugar só, com exportação em CSV e PDF.",
  },
  {
    menuId: "usuarios",
    title: "Usuários e plano",
    content: "Convide a equipe e defina o que cada pessoa pode ver e editar, por tela (inclusive o Financeiro) e por obra. Aqui você também acompanha o seu plano.",
  },
  {
    route: "obras",
    target: '[data-tour="acoes"]',
    title: "Ações da tela",
    content: "Os botões de cada tela ficam aqui no topo: criar um registro, filtrar, exportar. Eles mudam conforme a tela aberta.",
  },
  {
    target: '[data-tour="notificacoes"]',
    title: "Notificações",
    content: "O sino avisa o que precisa de atenção: etapas atrasadas, orçamento estourado, estoque zerado, prazos vencendo e, para quem tem acesso ao Financeiro, contas vencidas.",
  },
  {
    menuId: "treinamentos",
    title: "Central de treinamentos",
    content: "Ficou com dúvida? Aqui tem vídeos com o passo a passo de cada tela e o que preencher em cada campo. É também onde você refaz este tour.",
  },
  {
    route: "cadastros",
    title: "Pronto para começar",
    content: "Sugestão: comece agora pelos Cadastros. Se não quiser ver este tour no próximo login, marque \"Não mostrar novamente\".",
  },
];

/**
 * Passos visíveis para o usuário: só os itens de menu a que ele tem acesso.
 * `idsBarraMobile`: itens da barra inferior; no mobile, os demais são apontados no botão "Menu".
 */
export function passosDoTour(menuPermitido, { mobile = false, idsBarraMobile = [] } = {}) {
  const ids = new Set(menuPermitido.map(m => m.id));
  return PASSOS
    .filter(p => !p.menuId || ids.has(p.menuId))
    .map(p => {
      const noMenu = mobile && p.menuId && !idsBarraMobile.includes(p.menuId);
      return {
        ...p,
        route: p.route || p.menuId,
        target: p.target || (p.menuId && alvoMenu(p.menuId)),
        content: noMenu ? `${p.content} No celular, toque em Menu para chegar aqui.` : p.content,
      };
    });
}
