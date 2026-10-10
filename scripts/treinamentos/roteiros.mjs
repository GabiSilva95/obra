// Roteiros dos vídeos da Central de treinamentos: um por módulo de src/treinamentos/conteudo.js (mesmo id).
//
// Cada roteiro navega no app de verdade, com a conta de demonstração. Regra: NUNCA salvar.
// Os formulários são abertos, preenchidos para mostrar os campos e fechados com Cancelar.
// `t.passo(n)` mostra na legenda do vídeo o passo n do módulo (o mesmo texto da central).
//
// Helpers (ver gravar.mjs): t.page, t.passo(n), t.legenda(texto), t.menu(id), t.aba(nome), t.botao(nome),
// t.clicar(locator), t.mostrar(locator ou label), t.digitar(label, texto), t.escolher(label, índice|texto),
// t.data(label, aaaa-mm-dd), t.mostrar(locator), t.cancelar(), t.pausa(ms).

export const ROTEIROS = {
  "primeiros-passos": async t => {
    await t.passo(1);
    for (const id of ["dashboard", "obras", "cadastros"]) await t.mostrar(t.page.locator(`[data-nav-id="${id}"]`));
    await t.passo(2);
    await t.menu("cadastros");
    await t.passo(3);
    await t.menu("obras");
    await t.passo(4);
    await t.menu("compras");
    await t.passo(5);
    await t.menu("estoque");
    await t.menu("alocacao");
    await t.menu("diario");
    await t.passo(6);
    await t.menu("financeiro");
    await t.menu("relatorios");
    await t.passo(7);
    await t.mostrar(t.page.locator('[data-tour="acoes"]'));
    await t.mostrar(t.page.locator('[data-tour="notificacoes"]'));
  },

  inicio: async t => {
    await t.menu("dashboard");
    await t.passo(1);
    await t.escolher("Filtrar obra", 1);
    await t.escolher("Filtrar obra", 0);
    const titulo = nome => t.page.getByRole("heading", { name: nome, exact: true });
    await t.passo(2);
    await t.mostrar(titulo("Obras"));
    await t.mostrar(t.page.getByText("Progresso médio").first());
    await t.mostrar(titulo("Orçamento"));
    await t.passo(3);
    await t.mostrar(titulo("Financeiro"));
    await t.mostrar(titulo("Contas a pagar"));
    await t.mostrar(titulo("Fluxo de caixa"));
    await t.passo(4);
    await t.mostrar(titulo("Estoque"));
    await t.mostrar(titulo("Posição do estoque"));
    await t.mostrar(titulo("Compras"));
    await t.passo(5);
    await t.mostrar(titulo("Cada obra"));
    await t.page.mouse.wheel(0, -6000);
    await t.pausa(1500);
  },

  "cadastros-tipos-etapa": async t => {
    await t.passo(1);
    await t.menu("cadastros");
    await t.aba("Tipos de etapa");
    await t.passo(2);
    await t.botao("Novo tipo");
    await t.passo(3);
    await t.digitar("Nome da etapa", "Impermeabilização");
    await t.digitar("Tempo padrão de conclusão (dias)", "5");
    await t.passo(4);
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar" }));
    await t.cancelar();
    await t.passo(5);
    await t.mostrar(t.page.getByRole("button", { name: "Editar" }).first());
  },

  "cadastros-tipos-obra": async t => {
    await t.passo(1);
    await t.menu("cadastros");
    await t.aba("Tipos de obra");
    await t.passo(2);
    await t.botao("Novo tipo");
    await t.digitar("Nome", "Casa térrea");
    await t.digitar("Descrição (opcional)", "Residência de um pavimento");
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar" }));
    await t.cancelar();
    await t.passo(3);
    await t.passo(5);
  },

  "cadastros-pessoas": async t => {
    await t.passo(1);
    await t.menu("cadastros");
    await t.aba("Pessoas");
    await t.passo(2);
    await t.botao("Nova pessoa");
    await t.digitar("Nome completo / razão social", "João da Silva");
    await t.passo(3);
    await t.clicar(t.modal().getByRole("checkbox", { name: "Colaborador" }));
    await t.digitar("CPF / CNPJ", "123.456.789-00");
    await t.digitar("Telefone", "11 99999-0000");
    await t.passo(4);
    await t.digitar("Cargo / função", "Pedreiro");
    await t.digitar("Valor/dia", "250,00");
    await t.passo(5);
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar" }));
    await t.cancelar();
    await t.botao("Vincular a obra");
    await t.mostrar(t.modal().getByText("Prefira apontar pela presença no Diário"));
    await t.cancelar();
  },

  "cadastros-insumos": async t => {
    await t.passo(1);
    await t.menu("cadastros");
    await t.aba("Insumos");
    await t.passo(2);
    await t.botao("Novo insumo");
    await t.passo(3);
    await t.digitar("Nome", "Cimento CP-II 50kg");
    await t.digitar("Unidade", "sc 50kg");
    await t.digitar("Custo unitário", "38,90");
    await t.passo(4);
    await t.digitar("Fornecedor", "Depósito Central");
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar" }));
    await t.cancelar();
    await t.passo(5);
  },

  obras: async t => {
    await t.passo(1);
    await t.menu("obras");
    await t.botao("Nova obra");
    await t.passo(2);
    await t.digitar("Nome", "Residência Silva");
    await t.digitar("Local", "Rua das Flores, 120, Goiânia");
    await t.escolher("Responsável", 1);
    await t.data("Início", "2026-10-05");
    await t.data("Previsão de fim", "2027-04-30");
    await t.digitar("Orçamento", "450000,00");
    await t.passo(3);
    await t.mostrar("Tipo de obra");
    await t.passo(4);
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar" }));
    await t.cancelar();
    await t.passo(5);
    await t.mostrar(t.page.getByRole("tab").first());
  },

  "obras-etapas": async t => {
    await t.menu("obras");
    await t.passo(1);
    await t.clicar(t.page.getByRole("button", { name: /^Etapas/ }).last());
    await t.passo(2);
    await t.clicar(t.modal().getByRole("button", { name: "Adicionar etapa" }));
    await t.escolher("Tipo de etapa", 1);
    await t.data("Início previsto", "2026-10-05");
    await t.data("Fim previsto", "2026-10-20");
    await t.passo(3);
    await t.mostrar("Status");
    await t.mostrar("Orçamento da etapa");
    await t.cancelar();
    await t.passo(4);
    await t.passo(5);
    await t.page.keyboard.press("Escape");
    await t.pausa(600);
    await t.passo(6);
    await t.clicar(t.page.getByRole("button", { name: "Anexos" }).last());
    await t.pausa(1500);
    await t.page.keyboard.press("Escape");
  },

  maquinas: async t => {
    await t.passo(1);
    await t.menu("maquinas");
    await t.botao("Nova máquina");
    await t.passo(2);
    await t.digitar("Nome / identificação", "Betoneira 400L");
    await t.digitar("Modelo", "CSM 400");
    await t.passo(3);
    await t.escolher("Tipo de propriedade", "Própria");
    await t.passo(4);
    await t.digitar("Valor de aquisição", "8500,00");
    await t.digitar("Vida útil (anos)", "8");
    await t.digitar("Horas produtivas/mês", "120");
    await t.pausa(800);
    await t.passo(5);
    await t.escolher("Tipo de propriedade", "Alugada / terceirizada");
    await t.digitar("Valor por hora", "45,00");
    await t.passo(6);
    await t.escolher("Locador", 1);
    await t.passo(7);
    await t.cancelar();
  },

  compras: async t => {
    await t.passo(1);
    await t.menu("compras");
    await t.botao("Nova ordem");
    await t.passo(2);
    await t.escolher("Obra", 1);
    await t.digitar("Ou fornecedor livre", "Depósito Central");
    await t.passo(3);
    await t.escolher("Insumo", 1);
    await t.digitar("Quantidade", "20");
    await t.digitar("Valor unitário", "38,90");
    await t.pausa(800);
    await t.passo(4);
    await t.mostrar("Status");
    await t.cancelar();
    await t.passo(5);
    await t.mostrar(t.page.getByLabel(/^Status da OC/).first());
    await t.passo(6);
    await t.mostrar(t.page.getByRole("tab").first());
    await t.mostrar(t.page.getByRole("button", { name: "CSV" }));
  },

  "compras-nf": async t => {
    await t.menu("compras");
    await t.passo(1);
    await t.mostrar(t.page.getByRole("tab", { name: /^Aprovada/ }));
    await t.passo(2);
    await t.botao("Importar NF");
    await t.passo(3);
    await t.mostrar(t.modal().getByText("Selecionar XML"));
    await t.passo(4);
    await t.passo(5);
    await t.page.keyboard.press("Escape");
  },

  estoque: async t => {
    await t.menu("estoque");
    await t.passo(1);
    await t.mostrar(t.page.getByText("Valor em estoque").first());
    await t.passo(2);
    await t.passo(3);
    await t.aba("Baixa");
    await t.botao("Registrar baixa");
    await t.passo(4);
    await t.escolher("Insumo", 1);
    await t.digitar("Quantidade", "1");
    await t.passo(5);
    await t.mostrar(t.modal().getByRole("button", { name: "Confirmar baixa" }));
    await t.cancelar();
    await t.passo(6);
    await t.mostrar(t.page.getByRole("button", { name: "Desfazer baixa" }).first());
  },

  "estoque-transferencias": async t => {
    await t.passo(1);
    await t.menu("estoque");
    await t.aba("Transferências");
    await t.passo(2);
    await t.botao("Nova transferência");
    await t.passo(3);
    await t.escolher("Obra de destino", 1);
    await t.escolher("Insumo", 1);
    await t.passo(4);
    await t.digitar("Quantidade", "2");
    await t.digitar("Observação (opcional)", "Sobra de material");
    await t.passo(5);
    await t.mostrar(t.modal().getByRole("button", { name: "Confirmar transferência" }));
    await t.cancelar();
  },

  alocacao: async t => {
    await t.passo(1);
    await t.menu("alocacao");
    await t.passo(2);
    await t.botao("Nova alocação");
    await t.passo(3);
    await t.escolher("Máquina", 1);
    await t.digitar("Horas utilizadas", "6");
    await t.passo(4);
    await t.mostrar(t.modal().getByText("Custo estimado"));
    await t.mostrar(t.modal().getByRole("button", { name: "Lançar" }));
    await t.cancelar();
    await t.passo(5);
  },

  diario: async t => {
    await t.passo(1);
    await t.menu("diario");
    await t.botao("Novo registro");
    await t.passo(2);
    await t.escolher("Obra", 1);
    await t.escolher("Clima", "Ensolarado");
    await t.passo(3);
    await t.clicar(t.modal().getByRole("checkbox").first());
    await t.pausa(600);
    await t.passo(4);
    await t.digitar("Descrição das atividades", "Concretagem da laje do 1º pavimento.");
    await t.digitar("Observações", "Chegada do caminhão às 8h.");
    await t.passo(5);
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar registro" }));
    await t.cancelar();
  },

  "financeiro-resumo": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.passo(2);
    await t.mostrar(t.page.getByText("Saldo em contas").first());
    await t.mostrar(t.page.getByText("A pagar em aberto").first());
    await t.passo(3);
    await t.mostrar(t.page.getByText("Vencem hoje").first());
    await t.passo(4);
    await t.mostrar(t.page.getByRole("button", { name: "Ver vencidas" }).first());
    await t.passo(5);
    await t.mostrar(t.page.getByText("Há pagamentos sem conta a pagar"));
  },

  "financeiro-contas-pagar": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("A pagar");
    await t.passo(2);
    await t.escolher("Situação", "Vencidos");
    await t.escolher("Situação", "Em aberto");
    await t.digitar("Buscar", "Aço");
    await t.digitar("Buscar", "");
    await t.passo(3);
    await t.botao("Nova conta a pagar");
    await t.passo(4);
    await t.digitar("Descrição", "Cimento CP-II para a laje");
    await t.escolher("Categoria", "Outros");
    await t.escolher("Fornecedor", "Depósito Construforte");
    await t.digitar("Valor", "245000");
    await t.passo(5);
    await t.escolher("Condição", "Parcelado");
    await t.digitar("Número de parcelas", "3");
    await t.mostrar(t.modal().getByRole("columnheader", { name: "Vencimento" }));
    await t.passo(6);
    await t.clicar(t.modal().getByRole("button", { name: "Ratear em mais de uma linha" }));
    const obras = t.modal().locator("select[aria-label='Obra']");
    await t.mostrar(obras.nth(0));
    await obras.nth(0).selectOption({ index: 1 });
    await obras.nth(1).selectOption({ index: 2 });
    await t.pausa(900);
    await t.passo(7);
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar lançamento" }));
    await t.cancelar();
    await t.passo(8);
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Aço CA-50" }).first());
    await t.mostrar(t.modal().getByRole("heading", { name: "Parcelas" }));
    await t.page.keyboard.press("Escape");
  },

  "financeiro-contas-receber": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("A receber");
    await t.passo(2);
    await t.botao("Nova conta a receber");
    await t.passo(3);
    await t.digitar("Descrição", "2ª medição da Casa Gabriella");
    await t.escolher("Tipo de receita", "Medição");
    await t.escolher("Cliente", "Silva Empreendimentos");
    await t.digitar("Valor", "3800000");
    await t.passo(4);
    await t.escolher("Condição", "Parcelado");
    await t.digitar("Número de parcelas", "2");
    await t.passo(5);
    await t.escolher("Obra", 2);
    await t.cancelar();
    await t.passo(6);
    await t.mostrar(t.page.getByRole("button", { name: "Receber" }).first());
    await t.mostrar(t.page.getByText("de atraso").first());
  },

  "financeiro-baixas": async t => {
    await t.menu("financeiro");
    await t.aba("A pagar");
    await t.passo(1);
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Conta de energia" }).getByRole("button", { name: "Pagar" }));
    await t.passo(2);
    await t.escolher("Forma", "PIX");
    await t.passo(3);
    await t.escolher("Quanto", "Pagamento parcial (outro valor)");
    await t.digitar("Valor", "30000");
    await t.passo(4);
    await t.digitar("Juros", "500");
    await t.digitar("Multa", "1800");
    await t.mostrar(t.modal().getByText("Sai da conta"));
    await t.cancelar();
    await t.passo(5);
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Conta de energia" }).getByRole("checkbox"));
    await t.mostrar(t.page.getByRole("button", { name: "Pagar selecionados" }));
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Conta de energia" }).getByRole("checkbox"));
    await t.passo(6);
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Locação de betoneira" }).first());
    await t.mostrar(t.modal().getByRole("heading", { name: "Pagamentos" }));
    await t.mostrar(t.modal().getByRole("button", { name: "Estornar" }).first());
    await t.passo(7);
    await t.mostrar(t.modal().getByRole("button", { name: "Prorrogar vencimento" }).first());
    await t.page.keyboard.press("Escape");
  },

  "financeiro-rateio": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("A pagar");
    await t.botao("Nova conta a pagar");
    await t.digitar("Descrição", "Óleo hidráulico das máquinas");
    await t.digitar("Valor", "180000");
    await t.mostrar(t.modal().getByRole("heading", { name: "Rateio" }));
    await t.passo(2);
    const obras = () => t.modal().locator("select[aria-label='Obra']");
    await obras().nth(0).selectOption({ index: 1 });
    await t.escolher("Centro de custo", "Frota e equipamentos");
    await t.passo(3);
    await t.clicar(t.modal().getByRole("button", { name: "Ratear em mais de uma linha" }));
    await obras().nth(1).selectOption({ index: 2 });
    await t.passo(4);
    await t.clicar(t.modal().getByRole("button", { name: "Dividir igualmente" }));
    await t.passo(5);
    await t.mostrar(t.modal().getByText("Rateio fechado"));
    await t.passo(6);
    await t.cancelar();
    await t.menu("financeiro");
    await t.aba("Resultado");
    await t.aba("Por centro de custo");
    await t.pausa(1500);
  },

  "financeiro-pendencias": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Pendências");
    await t.passo(2);
    await t.mostrar(t.page.getByRole("heading", { name: "Compras entregues sem conta a pagar" }));
    await t.clicar(t.page.getByRole("button", { name: "Gerar conta" }).first());
    await t.passo(5);
    await t.escolher("Situação do pagamento", "Já foi pago");
    await t.cancelar();
    await t.passo(3);
    await t.mostrar(t.page.getByRole("heading", { name: "Diárias a pagar" }));
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Ana Beatriz" }).getByRole("checkbox"));
    await t.mostrar(t.page.getByRole("button", { name: /^Gerar pagamento/ }).first());
    await t.passo(4);
    await t.passo(6);
  },

  "financeiro-contas": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Contas e conciliação");
    await t.passo(2);
    await t.botao("Nova conta");
    await t.digitar("Nome da conta", "Conta da obra Casa Gabriella");
    await t.escolher("Tipo", "Conta bancária");
    await t.digitar("Banco", "Caixa Econômica");
    await t.passo(3);
    await t.digitar("Saldo inicial", "1500000");
    await t.data("Data do saldo inicial", "2026-10-01");
    await t.passo(4);
    await t.cancelar();
    await t.mostrar(t.page.getByText("Saldo atual").first());
    await t.passo(5);
    await t.botao("Transferência entre contas");
    await t.escolher("Conta de origem", 1);
    await t.escolher("Conta de destino", 2);
    await t.digitar("Valor", "300000");
    await t.cancelar();
  },

  "financeiro-conciliacao": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Contas e conciliação");
    await t.passo(2);
    await t.botao("Importar extrato");
    await t.mostrar(t.modal().getByText("Selecionar extrato"));
    await t.cancelar();
    await t.passo(3);
    await t.clicar(t.page.getByRole("row").filter({ hasText: "Banco Principal" }).getByRole("button", { name: "Conciliar" }));
    await t.page.getByRole("heading", { name: /Conciliação:/ }).waitFor();
    await t.passo(4);
    await t.mostrar(t.page.getByRole("button", { name: /^Conciliar \d+ exato/ }));
    await t.mostrar(t.page.getByRole("button", { name: "Conciliar", exact: true }).first());
    await t.passo(5);
    await t.clicar(t.page.getByRole("row").filter({ hasText: "TARIFA PACOTE" }).getByRole("button", { name: "Tratar" }));
    await t.clicar(t.modal().getByRole("tab", { name: "Lançar novo" }));
    await t.mostrar(t.modal().getByRole("heading", { name: "Rateio" }));
    await t.clicar(t.modal().getByRole("tab", { name: "Transferência" }));
    await t.cancelar().catch(() => {});
    await t.page.keyboard.press("Escape");
    await t.passo(6);
    await t.mostrar(t.page.getByText(/Diferença de|O saldo fecha/).first());
  },

  "financeiro-fluxo": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Fluxo de caixa");
    await t.passo(2);
    await t.escolher("Agrupar por", "Mês");
    await t.escolher("Agrupar por", "Semana");
    await t.passo(3);
    await t.mostrar(t.page.getByRole("columnheader", { name: "A receber" }));
    await t.mostrar(t.page.getByRole("columnheader", { name: "A pagar" }));
    await t.passo(4);
    await t.mostrar(t.page.getByText("A pagar em atraso").first());
    await t.passo(5);
    await t.escolher("Obra", 1);
    await t.escolher("Obra", 0);
    await t.passo(6);
    await t.mostrar(t.page.getByRole("button", { name: "CSV" }));
  },

  "financeiro-resultado": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Resultado");
    await t.passo(2);
    await t.escolher("Filtrar obra", 2);
    await t.passo(3);
    await t.mostrar(t.page.getByText("Composição de custos"));
    await t.passo(4);
    await t.aba("Por obra");
    await t.aba("Por centro de custo");
    await t.passo(5);
    await t.aba("Custo por mês");
    await t.pausa(1200);
  },

  "financeiro-relatorios": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Relatórios");
    await t.passo(2);
    await t.mostrar(t.page.getByRole("columnheader", { name: "Mais de 90 dias" }));
    await t.aba("Envelhecimento a receber");
    await t.pausa(900);
    await t.passo(3);
    await t.aba("Extrato da conta");
    await t.mostrar(t.page.getByText(/Saldo anterior/));
    await t.passo(4);
    await t.mostrar(t.page.getByRole("button", { name: "CSV" }));
    await t.mostrar(t.page.getByRole("button", { name: "PDF" }));
  },

  "financeiro-cadastros": async t => {
    await t.passo(1);
    await t.menu("financeiro");
    await t.aba("Cadastros");
    await t.passo(2);
    await t.botao("Nova categoria");
    await t.digitar("Nome", "Seguros da obra");
    await t.escolher("Usada em", "Contas a pagar");
    await t.cancelar();
    await t.passo(3);
    await t.aba("Centros de custo");
    await t.botao("Novo centro de custo");
    await t.digitar("Nome", "Segurança do trabalho");
    await t.cancelar();
    await t.passo(4);
    await t.mostrar(t.page.getByRole("button", { name: "Inativar" }).first());
    await t.passo(5);
    await t.aba("Preferências");
    await t.mostrar("Prazo padrão de pagamento (dias)");
  },

  relatorios: async t => {
    await t.passo(1);
    await t.menu("relatorios");
    await t.passo(2);
    await t.escolher("Filtrar obra", 1);
    await t.passo(3);
    await t.page.mouse.wheel(0, 300);
    await t.pausa(1200);
    await t.page.mouse.wheel(0, -300);
    await t.passo(4);
    await t.aba("Cronograma (Gantt)");
    await t.pausa(1500);
    await t.passo(5);
    await t.mostrar(t.page.getByRole("button", { name: "CSV" }));
    await t.mostrar(t.page.getByRole("button", { name: "PDF" }));
  },

  usuarios: async t => {
    await t.passo(1);
    await t.menu("usuarios");
    await t.passo(2);
    await t.botao("Novo usuário");
    if (await t.page.getByRole("alertdialog").isVisible()) {
      await t.legenda("O plano atual atingiu o limite de usuários: faça upgrade em Alterar plano.");
      await t.pausa(2500);
      await t.page.keyboard.press("Escape");
      return;
    }
    await t.digitar("Nome", "Maria Souza");
    await t.digitar("E-mail", "maria@empresa.com.br");
    await t.passo(3);
    await t.clicar(t.modal().getByText("Obras", { exact: true }));
    await t.clicar(t.modal().getByText("Estoque", { exact: true }));
    await t.passo(4);
    await t.mostrar(t.modal().getByRole("button", { name: "Salvar usuário" }));
    await t.cancelar();
    await t.passo(5);
    await t.mostrar(t.page.getByRole("button", { name: "Alterar plano" }));
  },
};
