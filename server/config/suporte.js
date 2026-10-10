// Regras do suporte que o servidor e as telas (cliente e painel) precisam enxergar iguais. Arquivo puro.

/** Área do sistema onde está o problema. O cliente escolhe ao abrir o chamado ou entrar na fila; a equipe pode reclassificar. */
export const SETORES = [
  { id: "obras", rotulo: "Obras" },
  { id: "cadastros", rotulo: "Cadastros" },
  { id: "estoque_compras", rotulo: "Estoque e Compras" },
  { id: "alocacao_maquinas", rotulo: "Alocação e Máquinas" },
  { id: "financeiro", rotulo: "Financeiro" },
  { id: "relatorios", rotulo: "Relatórios" },
  { id: "usuarios_acesso", rotulo: "Usuários e acesso" },
  { id: "assinatura", rotulo: "Assinatura e cobrança" },
  { id: "outro", rotulo: "Outro" },
];
export const rotuloSetor = id => SETORES.find(s => s.id === id)?.rotulo || "Outro";
export const setorValido = id => SETORES.some(s => s.id === id);

export const PRIORIDADES = [
  { id: "baixa", rotulo: "Baixa" }, { id: "normal", rotulo: "Normal" }, { id: "alta", rotulo: "Alta" }, { id: "urgente", rotulo: "Urgente" },
];

/** Estados do chamado. `na_fila` e `abandonado` só existem no chat ao vivo. */
export const STATUS_TICKET = [
  { id: "na_fila", rotulo: "Na fila", tom: "warning" },
  { id: "aberto", rotulo: "Aberto", tom: "info" },
  { id: "em_atendimento", rotulo: "Em atendimento", tom: "accent" },
  { id: "aguardando_cliente", rotulo: "Aguardando você", tom: "warning" },
  { id: "resolvido", rotulo: "Resolvido", tom: "success" },
  { id: "fechado", rotulo: "Fechado", tom: "neutral" },
  { id: "abandonado", rotulo: "Abandonado", tom: "neutral" },
];
export const rotuloStatus = id => STATUS_TICKET.find(s => s.id === id)?.rotulo || id;
export const STATUS_ABERTOS = ["aberto", "em_atendimento", "aguardando_cliente"];

/** Prazo para a primeira resposta de um chamado, em horas corridas, pelo plano (chaves internas de server/config/planos.js). */
export const PRAZO_RESPOSTA_HORAS = { starter: 48, pro: 24, enterprise: 8 };

export const LIMITES_SUPORTE = {
  assuntoMax: 120,
  textoMax: 5000,
  chamadosAbertosPorUsuario: 10,
  chamadosAbertosPorEmpresa: 20,
};

/** Chat ao vivo: tempos em segundos (o sinal vem das consultas curtas que cada ponta faz). */
export const CHAT = {
  clienteSumiuSeg: 60,       // na fila, sem sinal por 1 min: sai da fila
  clienteSumiuEmAtendimentoSeg: 300, // em conversa, sem sinal por 5 min: encerra
  atendenteSumiuSeg: 90,     // atendente sem sinal por 1,5 min: o chat volta à fila na posição original
  mediaPadraoMin: 10,        // espera por atendimento quando ainda não há histórico
  capacidadePadrao: 3,       // chats ao mesmo tempo por atendente
};

/** Horário padrão do chat (fuso de São Paulo): dia da semana (0 = domingo) para [início, fim). Editável no painel. */
export const HORARIO_CHAT_PADRAO = { 1: ["08:00", "18:00"], 2: ["08:00", "18:00"], 3: ["08:00", "18:00"], 4: ["08:00", "18:00"], 5: ["08:00", "18:00"] };
export const FUSO = "America/Sao_Paulo";

/** Anexos do chamado: poucas extensões, 3 MB (a Vercel corta o corpo em 4,5 MB e o base64 incha o arquivo em um terço). */
export const LIMITE_ANEXO_SUPORTE = 3 * 1024 * 1024;
export const TIPOS_ANEXO_SUPORTE = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".pdf": "application/pdf", ".txt": "text/plain", ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
