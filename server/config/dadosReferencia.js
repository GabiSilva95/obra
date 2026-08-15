/**
 * Dados de referência aplicados a todo tenant novo.
 *
 * Usado em dois lugares:
 *   - server/routes/auth.js  → no registro, para a conta nascer utilizável
 *   - prisma/seed.js         → para o tenant de demonstração
 *
 * Mantenha as listas aqui: alterar em um lugar reflete nos dois.
 */

export const CATEGORIAS_MAQUINA = [
  "Escavadeira",
  "Retroescavadeira",
  "Mini Escavadeira",
  "Pá Carregadeira",
  "Motoniveladora",
  "Rolo Compactador",
  "Trator",
  "Caminhão Basculante",
  "Caminhão Munck",
  "Betoneira",
  "Perfuratriz",
  "Compactador de Solo",
  "Gerador",
  "Compressor",
  "Plataforma Elevatória",
  "Guincho",
  "Empilhadeira",
  "Andaime Motorizado",
  "Equipamento de Corte",
  "Outros",
];

// Etapas na sequência construtiva — [nome, ordem, tempoPadrao em dias]
// O tempoPadrao alimenta o cronograma em cascata na criação da obra.
export const TIPOS_ETAPA = [
  // Planejamento
  ["Levantamento Inicial",        1,   5],
  ["Estudo de Viabilidade",       2,   7],
  ["Planejamento Executivo",      3,  10],
  ["Aprovações e Licenças",       4,  30],
  // Serviços Preliminares
  ["Limpeza do Terreno",          5,   3],
  ["Locação da Obra",             6,   2],
  ["Instalações Provisórias",     7,   5],
  ["Tapumes e Cercamento",        8,   3],
  // Terraplanagem
  ["Corte",                       9,   5],
  ["Aterro",                     10,   5],
  ["Compactação",                11,   3],
  ["Regularização",              12,   3],
  // Fundação
  ["Escavações",                 13,   5],
  ["Brocas",                     14,   4],
  ["Estacas",                    15,   7],
  ["Sapatas",                    16,   7],
  ["Baldrames",                  17,   7],
  ["Impermeabilização",          18,   3],
  // Estrutura
  ["Pilares",                    19,  10],
  ["Vigas",                      20,  10],
  ["Lajes",                      21,  12],
  ["Escadas",                    22,   5],
  ["Estruturas Metálicas",       23,  10],
  // Alvenaria
  ["Alvenaria Externa",          24,  15],
  ["Alvenaria Interna",          25,  12],
  ["Vergas e Contravergas",      26,   4],
  // Cobertura
  ["Estrutura de Cobertura",     27,   7],
  ["Telhamento",                 28,   5],
  ["Calhas",                     29,   3],
  ["Rufos",                      30,   2],
  // Instalações Hidráulicas
  ["Água Fria",                  31,   7],
  ["Água Quente",                32,   5],
  ["Esgoto",                     33,   7],
  ["Drenagem",                   34,   5],
  // Instalações Elétricas
  ["Infraestrutura Elétrica",    35,   7],
  ["Fiação",                     36,   7],
  ["Quadros Elétricos",          37,   3],
  ["Iluminação",                 38,   4],
  // Revestimentos
  ["Chapisco",                   39,   5],
  ["Emboço",                     40,   8],
  ["Reboco",                     41,   8],
  ["Gesso",                      42,   7],
  // Pisos e Acabamentos
  ["Contrapiso",                 43,   6],
  ["Piso Cerâmico",              44,   8],
  ["Piso Porcelanato",           45,   8],
  ["Rodapés",                    46,   3],
  // Esquadrias
  ["Portas",                     47,   5],
  ["Janelas",                    48,   5],
  ["Portões",                    49,   3],
  // Pintura
  ["Selador",                    50,   4],
  ["Massa Corrida",              51,   6],
  ["Pintura Interna",            52,   8],
  ["Pintura Externa",            53,   8],
  // Urbanização
  ["Calçadas",                   54,   5],
  ["Paisagismo",                 55,   5],
  ["Muros",                      56,   7],
  ["Pavimentação",               57,   7],
  // Entrega
  ["Limpeza Final",              58,   3],
  ["Vistoria",                   59,   2],
  ["Correções",                  60,   5],
  ["Entrega Técnica",            61,   2],
];

// Insumos: [nome, unidade, categoria]
export const INSUMOS = [
  // Cimento e Argamassas
  ["Cimento CP-II",       "sc 50kg", "Cimento e Argamassas"],
  ["Cimento CP-III",      "sc 50kg", "Cimento e Argamassas"],
  ["Argamassa AC-I",      "sc 20kg", "Cimento e Argamassas"],
  ["Argamassa AC-II",     "sc 20kg", "Cimento e Argamassas"],
  ["Argamassa AC-III",    "sc 20kg", "Cimento e Argamassas"],
  ["Rejunte",             "kg",      "Cimento e Argamassas"],
  // Agregados
  ["Areia Fina",          "m³",      "Agregados"],
  ["Areia Média",         "m³",      "Agregados"],
  ["Areia Grossa",        "m³",      "Agregados"],
  ["Brita 0",             "m³",      "Agregados"],
  ["Brita 1",             "m³",      "Agregados"],
  ["Brita 2",             "m³",      "Agregados"],
  ["Pedrisco",            "m³",      "Agregados"],
  // Estruturas
  ["Vergalhão CA-50",     "kg",      "Estruturas"],
  ["Vergalhão CA-60",     "kg",      "Estruturas"],
  ["Tela Soldada",        "m²",      "Estruturas"],
  ["Arame Recozido",      "kg",      "Estruturas"],
  // Alvenaria
  ["Tijolo Cerâmico",     "un",      "Alvenaria"],
  ["Bloco de Concreto",   "un",      "Alvenaria"],
  ["Canaleta",            "un",      "Alvenaria"],
  ["Meio Bloco",          "un",      "Alvenaria"],
  // Hidráulica
  ["Tubo PVC Água Fria",  "m",       "Hidráulica"],
  ["Tubo PVC Esgoto",     "m",       "Hidráulica"],
  ["Conexões PVC",        "un",      "Hidráulica"],
  ["Registro de Gaveta",  "un",      "Hidráulica"],
  ["Registro de Pressão", "un",      "Hidráulica"],
  // Elétrica
  ["Cabo Flexível",       "m",       "Elétrica"],
  ["Eletroduto Corrugado","m",       "Elétrica"],
  ["Disjuntor",           "un",      "Elétrica"],
  ["Quadro de Distribuição","un",    "Elétrica"],
  ["Tomadas",             "un",      "Elétrica"],
  ["Interruptores",       "un",      "Elétrica"],
  // Revestimentos
  ["Piso Cerâmico",       "m²",      "Revestimentos"],
  ["Porcelanato",         "m²",      "Revestimentos"],
  ["Azulejo",             "m²",      "Revestimentos"],
  ["Pastilha",            "m²",      "Revestimentos"],
  // Pintura
  ["Selador",             "L",       "Pintura"],
  ["Tinta Acrílica",      "L",       "Pintura"],
  ["Massa Corrida",       "L",       "Pintura"],
  ["Fundo Preparador",    "L",       "Pintura"],
  // Cobertura
  ["Telha Cerâmica",      "un",      "Cobertura"],
  ["Telha Metálica",      "m²",      "Cobertura"],
  ["Manta Térmica",       "m²",      "Cobertura"],
  ["Cumeeira",            "un",      "Cobertura"],
  // Esquadrias
  ["Porta de Madeira",    "un",      "Esquadrias"],
  ["Porta Metálica",      "un",      "Esquadrias"],
  ["Janela de Alumínio",  "un",      "Esquadrias"],
  ["Fechaduras",          "un",      "Esquadrias"],
];

/**
 * Popula um tenant com as listas acima.
 *
 * Idempotente por nome: compara com o que o tenant já tem e insere só o que
 * falta. Os modelos não têm constraint única de (tenantId, nome), então o
 * filtro é feito aqui — `skipDuplicates` não teria efeito.
 *
 * São 3 SELECTs + até 3 createMany, o que mantém o registro rápido mesmo com
 * as ~130 linhas de referência.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string} tenantId
 * @returns {Promise<{categorias:number, tiposEtapa:number, insumos:number}>}
 */
export async function popularDadosReferencia(prisma, tenantId) {
  const [catsExist, etapasExist, insumosExist] = await Promise.all([
    prisma.categoriaMaquina.findMany({ where: { tenantId }, select: { nome: true } }),
    prisma.tipoEtapa.findMany({ where: { tenantId }, select: { nome: true } }),
    prisma.insumo.findMany({ where: { tenantId }, select: { nome: true } }),
  ]);

  const temCat    = new Set(catsExist.map(c => c.nome));
  const temEtapa  = new Set(etapasExist.map(e => e.nome));
  const temInsumo = new Set(insumosExist.map(i => i.nome));

  const novasCategorias = CATEGORIAS_MAQUINA
    .filter(nome => !temCat.has(nome))
    .map(nome => ({ tenantId, nome }));

  const novosTiposEtapa = TIPOS_ETAPA
    .filter(([nome]) => !temEtapa.has(nome))
    .map(([nome, ordem, tempoPadrao]) => ({ tenantId, nome, ordem, tempoPadrao }));

  const novosInsumos = INSUMOS
    .filter(([nome]) => !temInsumo.has(nome))
    .map(([nome, unidade, categoria]) => ({ tenantId, nome, unidade, categoria, custoUnit: 0 }));

  await Promise.all([
    novasCategorias.length ? prisma.categoriaMaquina.createMany({ data: novasCategorias }) : null,
    novosTiposEtapa.length ? prisma.tipoEtapa.createMany({ data: novosTiposEtapa })         : null,
    novosInsumos.length    ? prisma.insumo.createMany({ data: novosInsumos })               : null,
  ].filter(Boolean));

  return {
    categorias: novasCategorias.length,
    tiposEtapa: novosTiposEtapa.length,
    insumos:    novosInsumos.length,
  };
}
