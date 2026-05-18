import { useEffect, useState } from "react";

const LABELS = {
  obras: "obras",
  funcionarios: "funcionários",
  usuarios: "usuários",
  maquinas: "máquinas",
  insumos: "insumos",
};

export default function PlanoBanner({ api }) {
  const [uso, setUso] = useState(null);

  useEffect(() => {
    if (!api) return;
    api.get("/plano/uso").then(setUso).catch(() => {});
  }, [api]);

  if (!uso) return null;

  // Recursos que atingiram ≥ 80% do limite (ignora Infinity)
  const alertas = Object.keys(LABELS)
    .filter((key) => {
      const limite = uso.limites[key];
      if (limite === null || limite >= 1e15) return false; // Infinity serializa como null ou número gigante
      return uso.uso[key] / limite >= 0.8;
    })
    .map((key) => ({
      key,
      label: LABELS[key],
      atual: uso.uso[key],
      limite: uso.limites[key],
      pct: Math.round((uso.uso[key] / uso.limites[key]) * 100),
      esgotado: uso.uso[key] >= uso.limites[key],
    }));

  if (alertas.length === 0) return null;

  const temEsgotado = alertas.some((a) => a.esgotado);

  return (
    <div
      style={{
        background: temEsgotado ? "#fef2f2" : "#fffbeb",
        borderBottom: `1px solid ${temEsgotado ? "#fca5a5" : "#fcd34d"}`,
        padding: "8px 20px",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontWeight: 600, color: temEsgotado ? "#dc2626" : "#b45309" }}>
        {temEsgotado ? "⛔ Limite atingido" : "⚠️ Limite próximo"} — Plano {uso.plano}
      </span>

      {alertas.map((a) => (
        <span key={a.key} style={{ color: a.esgotado ? "#dc2626" : "#92400e" }}>
          {a.label}: {a.atual}/{a.limite} ({a.pct}%)
        </span>
      ))}

      <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 12 }}>
        Faça upgrade do plano para aumentar os limites.
      </span>
    </div>
  );
}
