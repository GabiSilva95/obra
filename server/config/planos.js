/**
 * Limites por plano. Use Infinity para recursos ilimitados.
 *
 * Somente dois recursos são limitados, conforme a oferta comercial em
 * src/constants/data.js:
 *   obras    — número de obras cadastradas
 *   usuarios — usuários da conta
 *
 * Máquinas, insumos e funcionários são ilimitados em todos os planos: nunca
 * fizeram parte da oferta e não devem bloquear cadastro.
 */
export const PLANOS = {
  starter: {
    label: "Starter",
    obras:    5,
    usuarios: 2,
  },
  pro: {
    label: "Business",
    obras:    15,
    usuarios: 5,
  },
  enterprise: {
    label: "Professional",
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
