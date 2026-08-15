import { useEffect, useState, useRef } from "react";
import { C, F } from "../constants/tokens";
import { registrarAviso } from "../utils/aviso";

/**
 * Pop-up centralizado para avisos do sistema.
 *
 * Estrutura conforme o modelo: fundo escurecido e desfocado, cartão ao centro,
 * ícone circular, título, mensagem e botão de ação em destaque. As cores seguem
 * o tema escuro do app; o círculo e o botão usam a cor do tipo do aviso.
 */

const TIPOS = {
  sucesso: {
    cor: "#22c55e", fundo: "rgba(34,197,94,.13)", borda: "rgba(34,197,94,.28)",
    icone: <polyline points="20 6 9 17 4 12" />,
  },
  erro: {
    cor: "#ef4444", fundo: "rgba(239,68,68,.13)", borda: "rgba(239,68,68,.28)",
    icone: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  },
  alerta: {
    cor: "#fbbf24", fundo: "rgba(251,191,36,.13)", borda: "rgba(251,191,36,.28)",
    icone: <><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  },
  info: {
    cor: "#60a5fa", fundo: "rgba(96,165,250,.13)", borda: "rgba(96,165,250,.28)",
    icone: <><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="7" x2="12.01" y2="7" /></>,
  },
};

export default function AvisoModal() {
  const [aviso, setAviso] = useState(null);
  const botaoRef = useRef(null);

  useEffect(() => registrarAviso(setAviso), []);

  // Foco no botão principal e fechamento pelo Esc
  useEffect(() => {
    if (!aviso) return;
    botaoRef.current?.focus();
    const onKey = e => {
      if (e.key === "Escape") fechar(false);
      if (e.key === "Enter" && document.activeElement === botaoRef.current) fechar(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aviso]); // eslint-disable-line

  if (!aviso) return null;

  const t = TIPOS[aviso.tipo] || TIPOS.info;
  const ehConfirmacao = !!aviso.confirmacao;

  const fechar = (confirmou) => {
    aviso.confirmacao?.resolve(!!confirmou);
    aviso.acao && confirmou && aviso.acao.onClick?.();
    setAviso(null);
  };

  const corBotao = ehConfirmacao && aviso.confirmacao.perigo ? "#ef4444" : t.cor;

  return (
    <>
      <style>{`
        @keyframes aviso-fundo { from { opacity: 0 } to { opacity: 1 } }
        @keyframes aviso-card  { from { opacity: 0; transform: translateY(12px) scale(.96) }
                                 to   { opacity: 1; transform: translateY(0) scale(1) } }
        @media (prefers-reduced-motion: reduce) {
          .aviso-fundo, .aviso-card { animation: none !important }
        }
      `}</style>

      <div
        className="aviso-fundo"
        role="dialog"
        aria-modal="true"
        onClick={() => fechar(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(6,8,16,.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          animation: "aviso-fundo .16s ease both",
        }}
      >
        <div
          className="aviso-card"
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 380,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "34px 30px 26px",
            textAlign: "center",
            boxShadow: "0 28px 70px rgba(0,0,0,.6)",
            animation: "aviso-card .22s cubic-bezier(.34,1.2,.64,1) both",
            ...F,
          }}
        >
          {/* Ícone circular */}
          <div style={{
            width: 66, height: 66, borderRadius: "50%", margin: "0 auto 18px",
            background: t.fundo, border: `1px solid ${t.borda}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.cor}
                 strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              {t.icone}
            </svg>
          </div>

          {aviso.titulo && (
            <div style={{
              fontSize: 19, fontWeight: 800, color: C.text,
              letterSpacing: "-0.025em", marginBottom: 9, textWrap: "balance",
            }}>
              {aviso.titulo}
            </div>
          )}

          {aviso.mensagem && (
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
              {aviso.mensagem}
            </div>
          )}

          <div style={{ display: "flex", gap: 9, flexDirection: ehConfirmacao ? "row" : "column" }}>
            {ehConfirmacao && (
              <button
                onClick={() => fechar(false)}
                style={{
                  flex: 1, padding: "13px 18px", borderRadius: 12,
                  background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`,
                  color: C.muted, fontSize: 13.5, fontWeight: 700, cursor: "pointer", ...F,
                }}
              >
                Cancelar
              </button>
            )}

            <button
              ref={botaoRef}
              onClick={() => fechar(true)}
              style={{
                flex: 1, padding: "13px 18px", borderRadius: 12, border: "none",
                background: corBotao, color: "#0a0a0a",
                fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                letterSpacing: "-0.01em", ...F,
              }}
            >
              {ehConfirmacao ? aviso.confirmacao.rotulo : (aviso.acao?.rotulo || aviso.botao || "Entendi")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
