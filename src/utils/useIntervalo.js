import { useEffect, useRef } from "react";

/**
 * Chama `fn` a cada `ms` enquanto `ativo`. Mais lento quando a aba está escondida (`msEscondida`).
 * A função mais recente é sempre a usada, sem reiniciar o relógio a cada render.
 */
export function useIntervalo(fn, ms, { ativo = true, msEscondida = ms * 5 } = {}) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    if (!ativo) return;
    let t;
    const agendar = () => { t = setTimeout(async () => { try { await ref.current(); } finally { agendar(); } }, document.hidden ? msEscondida : ms); };
    agendar();
    return () => clearTimeout(t);
  }, [ms, msEscondida, ativo]);
}
