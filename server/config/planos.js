/**
 * Limites por plano. Use Infinity para recursos ilimitados.
 *
 * Recursos controlados:
 *   obras        — número de obras ativas
 *   funcionarios — funcionários cadastrados
 *   usuarios     — usuários da conta (excluindo o admin)
 *   maquinas     — equipamentos cadastrados
 *   insumos      — insumos no catálogo
 */
export const PLANOS = {
  starter: {
    label: "Starter",
    obras:        3,
    funcionarios: 10,
    usuarios:     2,
    maquinas:     5,
    insumos:      20,
  },
  pro: {
    label: "Pro",
    obras:        20,
    funcionarios: 50,
    usuarios:     10,
    maquinas:     30,
    insumos:      150,
  },
  enterprise: {
    label: "Enterprise",
    obras:        Infinity,
    funcionarios: Infinity,
    usuarios:     Infinity,
    maquinas:     Infinity,
    insumos:      Infinity,
  },
};

/** Retorna os limites do plano, caindo em starter se desconhecido. */
export function getLimites(plano) {
  return PLANOS[plano] ?? PLANOS.starter;
}
