/**
 * Limites por plano. Use Infinity para recursos ilimitados.
 *
 * Somente dois recursos são limitados, conforme a oferta comercial em
 * src/constants/data.js (os preços também: `preco`, em reais por mês, conferidos por planos.test.js):
 *   obras    — número de obras cadastradas
 *   usuarios — usuários da conta
 *
 * Máquinas, insumos e funcionários são ilimitados em todos os planos: nunca
 * fizeram parte da oferta e não devem bloquear cadastro.
 */
export const PLANOS = {
  starter: {
    label: "Starter",
    preco: { mensal: 149, anual: 119 },
    obras:    5,
    usuarios: 2,
  },
  pro: {
    label: "Business",
    preco: { mensal: 349, anual: 279 },
    obras:    15,
    usuarios: 5,
  },
  enterprise: {
    label: "Professional",
    preco: { mensal: 749, anual: 599 },
    obras:    Infinity,
    usuarios: Infinity,
  },
};

/** Recursos efetivamente controlados. O que não estiver aqui é ilimitado. */
export const RECURSOS_LIMITADOS = ["obras", "usuarios"];

/**
 * Aliases entre os IDs usados pelo frontend/registro e as chaves internas.
 * Frontend usa: "starter" | "business" | "professional"
 * Backend usa:  "starter" | "pro"      | "enterprise"
 */
const ALIASES = {
  business:     "pro",
  professional: "enterprise",
};

/** Retorna os limites do plano, normalizando aliases. Fallback: starter. */
export function getLimites(plano) {
  const normalizado = ALIASES[plano] ?? plano;
  return PLANOS[normalizado] ?? PLANOS.starter;
}

/** Normaliza o ID do plano para a chave interna (resolve aliases). */
export function normalizarPlano(plano) {
  return ALIASES[plano] ?? (PLANOS[plano] ? plano : "starter");
}

/** O plano com esse id (alias incluído), ou null se não existe. Diferente de `normalizarPlano`, que cai no starter: serve para validar entrada. */
export const resolverPlano = plano => { const k = ALIASES[plano] ?? plano; return PLANOS[k] ? k : null; };
