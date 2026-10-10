import { useCallback, useEffect, useState } from "react";

/**
 * Resumo do suporte do cliente: chamados com resposta nova (sino) e o chat em andamento, que mora no shell.
 * Relê ao trocar de tela (`rota`) e a cada minuto, e volta ao chat se a página foi recarregada no meio dele.
 */
export function useResumoSuporte(api, { ativo = true, rota } = {}) {
  const [resumoSup, setResumoSup] = useState(null);
  const [chatId, setChatId] = useState(null);
  const atualizar = useCallback(() => api.get("/suporte/resumo").then(r => {
    setResumoSup(r);
    setChatId(atual => atual ?? r.chatAtivo?.id ?? null);
  }).catch(() => {}), []); // eslint-disable-line
  useEffect(() => { if (ativo) atualizar(); }, [ativo, rota]); // eslint-disable-line
  useEffect(() => { const t = setInterval(atualizar, 60000); return () => clearInterval(t); }, []); // eslint-disable-line
  return { resumoSup, chatId, setChatId, atualizar };
}
