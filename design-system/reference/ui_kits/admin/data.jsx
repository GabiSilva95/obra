const USER = { name: 'Marina Costa', role: 'Admin' };
const NAV = [
  { id: 'home', label: 'Início', icon: 'layout-grid' },
  { id: 'perfil', label: 'Meu perfil', icon: 'user' },
  { id: 'obras', label: 'Obras', icon: 'building-2' },
  { id: 'pedidos', label: 'Pedidos', icon: 'clipboard-list', badge: 4 },
  { id: 'equipes', label: 'Equipes', icon: 'hard-hat' },
  { id: 'cronograma', label: 'Cronograma', icon: 'calendar' },
  { id: 'financeiro', label: 'Financeiro', icon: 'wallet' },
  { id: 'mensagens', label: 'Mensagens', icon: 'message-circle', badge: 3 },
];
const NAV_FOOT = [
  { id: 'idioma', label: 'Idioma', icon: 'globe', children: [{ id: 'pt', label: 'Português' }, { id: 'en', label: 'English' }, { id: 'es', label: 'Español' }] },
  { id: 'config', label: 'Configurações', icon: 'settings' },
  { id: 'sair', label: 'Sair', icon: 'log-out' },
];
const TABS = [{ id: 'home', label: 'Início', icon: 'layout-grid' }, { id: 'obras', label: 'Obras', icon: 'building-2' }, { id: 'pedidos', label: 'Pedidos', icon: 'clipboard-list' }, { id: 'cronograma', label: 'Agenda', icon: 'calendar' }, { id: 'menu', label: 'Menu', icon: 'menu' }];
const OBRAS = [
  { id: 1, title: 'Residencial Vila Nova — Bloco B', status: 'var(--cp-success-strong)', prazo: '14 meses', local: 'Curitiba | PR', area: '4.200 m²', etapas: [['shovel', 'Fundação'], ['hammer', 'Alvenaria'], ['zap', 'Elétrica']] },
  { id: 2, title: 'Edifício Comercial Aurora', status: 'var(--cp-data-yellow)', prazo: '20 meses', local: 'Joinville | SC', area: '9.800 m²', etapas: [['construction', 'Estrutura'], ['droplets', 'Hidráulica'], ['layers', 'Laje']] },
  { id: 3, title: 'Galpão Logístico Rota 101', status: 'var(--cp-error)', prazo: '8 meses', local: 'Itajaí | SC', area: '12.500 m²', etapas: [['shovel', 'Terraplenagem'], ['wrench', 'Estrutura metálica'], ['paintbrush', 'Acabamento']] },
];
const STATUS = { 'Novo pedido': 'danger', 'Em trânsito': 'neutral', 'Pendente': 'warning', 'Recebido': 'info', 'Pago 100%': 'success', 'Pago 25%': 'success', 'Falhou': 'error' };
const PEDIDOS = [
  { id: 'PC-2052', fornecedor: 'Votoran Materiais', contato: 'vendas@votoran.com.br', obra: 'Vila Nova · Bloco B', item: 'Cimento CP-II 50kg × 400', cat: 'Estrutural', data: '26 nov', valor: 'R$ 15.200', status: 'Pago 100%' },
  { id: 'PC-2053', fornecedor: 'Aço Forte', contato: 'pedidos@acoforte.com', obra: 'Ed. Aurora', item: 'Vergalhão 10mm × 1.200', cat: 'Estrutural', data: '26 nov', valor: 'R$ 62.400', status: 'Pendente' },
  { id: 'PC-2054', fornecedor: 'Cerâmica Sul', contato: 'comercial@ceramicasul.com', obra: 'Vila Nova · Bloco B', item: 'Bloco cerâmico × 18.000', cat: 'Alvenaria', data: '27 nov', valor: 'R$ 21.600', status: 'Em trânsito' },
  { id: 'PC-2055', fornecedor: 'HidroMax', contato: 'contato@hidromax.com', obra: 'Galpão Rota 101', item: 'Tubo PVC 100mm × 300', cat: 'Hidráulica', data: '28 nov', valor: 'R$ 8.940', status: 'Novo pedido' },
  { id: 'PC-2056', fornecedor: 'Elétrica Brasil', contato: 'vendas@eletbr.com', obra: 'Ed. Aurora', item: 'Cabo 6mm × 5.000 m', cat: 'Elétrica', data: '28 nov', valor: 'R$ 17.500', status: 'Recebido' },
  { id: 'PC-2057', fornecedor: 'Areial Itajaí', contato: 'areial@itajai.com', obra: 'Galpão Rota 101', item: 'Areia média × 80 m³', cat: 'Agregados', data: '29 nov', valor: 'R$ 11.200', status: 'Falhou' },
];
const MSGS = [
  { id: 1, name: 'Carlos Mendes', preview: 'Olá! Gostaria de confirmar a entrega do concreto…', time: 'Agora', unread: 3, online: true },
  { id: 2, name: 'Ana Ribeiro', preview: 'Segue a medição do bloco B em anexo.', time: '14:36', unread: 1 },
  { id: 3, name: 'João Pereira', preview: 'A equipe de elétrica chega às 8h.', time: 'Ontem' },
  { id: 4, name: 'Fernanda Lima', preview: 'Podemos antecipar a vistoria?', time: 'Terça' },
];
Object.assign(window, { USER, NAV, NAV_FOOT, TABS, OBRAS, STATUS, PEDIDOS, MSGS });
