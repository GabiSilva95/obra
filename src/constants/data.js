export const TIPOS_ETAPA = [
  {id:1,nome:"Terraplanagem",icon:"excavator"},{id:2,nome:"Fundação",icon:"building"},
  {id:3,nome:"Estrutura de Concreto",icon:"building"},{id:4,nome:"Estrutura Metálica",icon:"excavator"},
  {id:5,nome:"Alvenaria",icon:"warehouse"},{id:6,nome:"Cobertura",icon:"building"},
  {id:7,nome:"Instalações Hidráulicas",icon:"cube"},{id:8,nome:"Instalações Elétricas",icon:"link"},
  {id:9,nome:"Instalações de HVAC",icon:"cube"},{id:10,nome:"Revestimento Interno",icon:"checklist"},
  {id:11,nome:"Revestimento Externo",icon:"building"},{id:12,nome:"Esquadrias",icon:"checklist"},
  {id:13,nome:"Pintura",icon:"checklist"},{id:14,nome:"Pavimentação",icon:"excavator"},
  {id:15,nome:"Paisagismo",icon:"pin"},{id:16,nome:"Acabamento Final",icon:"check"},
  {id:17,nome:"Comissionamento",icon:"file"},{id:18,nome:"Entrega",icon:"key"},
];

export const PLANOS = [
  {
    id:"starter", nome:"Starter", cor:"#60a5fa", corGlow:"rgba(96,165,250,0.18)",
    preco:{mensal:149, anual:119},
    usuarios:2, obras:5,
    desc:"Ideal para pequenas construtoras",
    features:["Até 2 usuários","Até 5 obras simultâneas","Dashboard e relatórios","Controle de estoque","Suporte por e-mail"],
    suporte:["email"],
  },
  {
    id:"business", nome:"Business", cor:"#f97316", corGlow:"rgba(249,115,22,0.22)",
    preco:{mensal:349, anual:279},
    usuarios:5, obras:15,
    popular:true,
    desc:"Para empresas em crescimento",
    features:["Até 5 usuários","Até 15 obras simultâneas","Todas as funcionalidades","Controle de estoque avançado","Alocação de máquinas e insumos","Suporte por e-mail e WhatsApp"],
    suporte:["email","whatsapp"],
  },
  {
    id:"professional", nome:"Professional", cor:"#a78bfa", corGlow:"rgba(167,139,250,0.18)",
    preco:{mensal:749, anual:599},
    usuarios:999, obras:999,
    desc:"Sem limites, suporte dedicado",
    features:["Usuários ilimitados","Obras ilimitadas","Todas as funcionalidades","Importação de NF-e / XML","Relatórios avançados","Suporte prioritário por e-mail e WhatsApp"],
    suporte:["email","whatsapp"],
  },
];

const INIT_TENANTS = [
  {
    id:"t1",
    razaoSocial:"Construtora Aurora Ltda",
    cnpj:"12.345.678/0001-90",
    email:"contato@aurora.com.br",
    plano:"professional",
    ativo:true,
    criadoEm:"2024-01-10",
    users:[
      {id:1,tenantId:"t1",nome:"João Silva",email:"admin@aurora.com",senha:"admin123",role:"tenant_admin",ativo:true,permissoes:[],obrasAcesso:[]},
      {id:2,tenantId:"t1",nome:"Maria Santos",email:"maria@aurora.com",senha:"1234",role:"user",ativo:true,permissoes:["obras","estoque","relatorios"],obrasAcesso:[1]},
      {id:3,tenantId:"t1",nome:"Carlos Lima",email:"carlos@aurora.com",senha:"1234",role:"user",ativo:true,permissoes:["obras","maquinas","alocacao"],obrasAcesso:[]},
    ],
    obras:[
      {id:1,nome:"Edifício Aurora",local:"Av. Paulista, 1500 — SP",inicio:"2024-01-15",previsaoFim:"2025-06-30",orcamento:2500000,status:"Em andamento",responsavel:"João Silva",descricao:"Edifício residencial 12 andares."},
      {id:2,nome:"Ponte Rio Verde",local:"Rodovia SP-330, km 45",inicio:"2024-03-01",previsaoFim:"2025-03-01",orcamento:800000,status:"Em andamento",responsavel:"Maria Santos",descricao:"Ponte de concreto armado 80m."},
      {id:3,nome:"Galpão Industrial Norte",local:"Distrito Industrial, Lote 22",inicio:"2023-08-10",previsaoFim:"2024-08-10",orcamento:450000,status:"Concluída",responsavel:"Carlos Lima",descricao:"Galpão 2000m²."},
    ],
    etapasObra:[
      {id:1,obraId:1,tipoEtapaId:2,dataInicioP:"2024-01-15",dataFimP:"2024-03-30",dataInicioR:"2024-01-18",dataFimR:null,progresso:100,status:"Concluída"},
      {id:2,obraId:1,tipoEtapaId:3,dataInicioP:"2024-04-01",dataFimP:"2024-09-30",dataInicioR:"2024-04-05",dataFimR:null,progresso:75,status:"Em andamento"},
      {id:3,obraId:1,tipoEtapaId:5,dataInicioP:"2024-07-01",dataFimP:"2025-01-30",dataInicioR:"2024-07-10",dataFimR:null,progresso:40,status:"Em andamento"},
      {id:4,obraId:1,tipoEtapaId:7,dataInicioP:"2024-09-01",dataFimP:"2025-03-30",dataInicioR:null,dataFimR:null,progresso:10,status:"Atrasada"},
      {id:5,obraId:1,tipoEtapaId:16,dataInicioP:"2025-02-01",dataFimP:"2025-06-30",dataInicioR:null,dataFimR:null,progresso:0,status:"Pendente"},
      {id:6,obraId:2,tipoEtapaId:1,dataInicioP:"2024-03-01",dataFimP:"2024-04-30",dataInicioR:"2024-03-05",dataFimR:"2024-05-15",progresso:100,status:"Concluída"},
      {id:7,obraId:2,tipoEtapaId:3,dataInicioP:"2024-05-01",dataFimP:"2024-12-30",dataInicioR:"2024-05-20",dataFimR:null,progresso:65,status:"Em andamento"},
      {id:8,obraId:2,tipoEtapaId:14,dataInicioP:"2024-10-01",dataFimP:"2025-03-01",dataInicioR:null,dataFimR:null,progresso:20,status:"Atrasada"},
      {id:9,obraId:3,tipoEtapaId:2,dataInicioP:"2023-08-10",dataFimP:"2023-10-30",dataInicioR:"2023-08-12",dataFimR:"2023-10-28",progresso:100,status:"Concluída"},
      {id:10,obraId:3,tipoEtapaId:4,dataInicioP:"2023-11-01",dataFimP:"2024-03-30",dataInicioR:"2023-11-05",dataFimR:"2024-03-25",progresso:100,status:"Concluída"},
      {id:11,obraId:3,tipoEtapaId:6,dataInicioP:"2024-04-01",dataFimP:"2024-08-10",dataInicioR:"2024-04-03",dataFimR:"2024-08-08",progresso:100,status:"Concluída"},
    ],
    maquinas:[
      {id:1,nome:"Escavadeira CAT 320",tipo:"Escavadeira",placa:"ABC-1234",custoHora:350},
      {id:2,nome:"Betoneira 400L",tipo:"Betoneira",placa:"N/A",custoHora:85},
      {id:3,nome:"Guindaste Liebherr LTM",tipo:"Guindaste",placa:"DEF-5678",custoHora:650},
    ],
    funcionarios:[
      {id:1,nome:"José Ferreira",tipo:"Funcionário",cargo:"Pedreiro",cpf:"123.456.789-00",salarioDia:180,ativo:true},
      {id:2,nome:"Ana Oliveira",tipo:"Funcionário",cargo:"Engenheira Civil",cpf:"987.654.321-00",salarioDia:450,ativo:true},
      {id:3,nome:"TechBuild Ltda",tipo:"Prestador",cargo:"Instalações Elétricas",cpf:"12.345.678/0001-90",salarioDia:1200,ativo:true},
    ],
    insumos:[
      {id:1,nome:"Cimento CP-II",unidade:"saco 50kg",custoUnit:38,categoria:"Material",fornecedor:"CimentosBR"},
      {id:2,nome:"Areia Média",unidade:"m³",custoUnit:95,categoria:"Material",fornecedor:"Pedreira Norte"},
      {id:3,nome:"Vergalhão CA-50 10mm",unidade:"barra 12m",custoUnit:42,categoria:"Material",fornecedor:"AçosBR"},
      {id:4,nome:"Concreto Usinado FCK 25",unidade:"m³",custoUnit:320,categoria:"Material",fornecedor:"ConcreMix"},
    ],
    estoques:[
      {id:1,obraId:1,insumoId:1,quantEntrada:500,quantUtilizado:320,dataMov:"2024-02-01",origem:"Manual"},
      {id:2,obraId:1,insumoId:2,quantEntrada:80,quantUtilizado:55,dataMov:"2024-02-01",origem:"Manual"},
      {id:3,obraId:1,insumoId:3,quantEntrada:200,quantUtilizado:140,dataMov:"2024-03-15",origem:"Manual"},
      {id:4,obraId:2,insumoId:1,quantEntrada:150,quantUtilizado:90,dataMov:"2024-04-01",origem:"Manual"},
    ],
    alocacoes:[
      {id:1,obraId:1,tipo:"maquina",referenciaId:1,quantidade:80,data:"2024-02-10",obs:"Escavação fundação"},
      {id:2,obraId:1,tipo:"maquina",referenciaId:2,quantidade:200,data:"2024-04-01",obs:"Concretagem"},
      {id:3,obraId:2,tipo:"maquina",referenciaId:1,quantidade:120,data:"2024-03-15",obs:"Escavação pilares"},
    ],
    funcionarioObra:[
      {id:1,obraId:1,funcionarioId:1,dias:90},{id:2,obraId:1,funcionarioId:2,dias:120},
      {id:3,obraId:2,funcionarioId:2,dias:60},{id:4,obraId:2,funcionarioId:3,dias:15},
    ],
    tiposEtapa: JSON.parse(JSON.stringify(TIPOS_ETAPA)),
  },
];

export const globalTenants = JSON.parse(JSON.stringify(INIT_TENANTS));
