import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "../../design-system/styles.css";
import createApi from "../utils/api.js";
import AvisoModal from "../components/AvisoModal";
import Login from "./Login";
import TrocarSenha from "./TrocarSenha";
import Casca from "./Casca";

// A sessão do painel mora numa chave própria; o endereço (painel.*) já a separa da sessão do cliente
const CHAVE = "painel-sessao";
const irParaLogin = () => { window.location.href = "/login"; };
const lerSessao = () => { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch { return null; } };

/** Painel interno da equipe: outro sistema, com login, permissões e API (/api/painel) próprios. */
export default function PainelApp() {
  const navigate = useNavigate();
  const [sessao, setSessao] = useState(lerSessao);

  const guardar = useCallback(nova => {
    setSessao(nova);
    if (nova) localStorage.setItem(CHAVE, JSON.stringify(nova)); else localStorage.removeItem(CHAVE);
  }, []);
  const api = useMemo(() => createApi(sessao?.token, { chaveSessao: CHAVE, rotaRefresh: "/painel/auth/refresh", aoExpirar: irParaLogin }), [sessao?.token]);

  const sair = useCallback(async () => {
    const refreshToken = sessao?.refreshToken;
    guardar(null);
    navigate("/login");
    if (refreshToken) fetch("/api/painel/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) }).catch(() => {});
  }, [sessao?.refreshToken, guardar, navigate]);

  // O token e a equipe (permissões) mudam por fora quando o servidor renova ou o administrador altera o acesso
  useEffect(() => {
    const aoMudar = e => { if (e.key === CHAVE) setSessao(lerSessao()); };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  return (
    <>
      <AvisoModal />
      <Routes>
        <Route path="/login" element={sessao ? <Navigate to="/" replace /> : <Login onEntrou={guardar} />} />
        <Route path="/*" element={!sessao ? <Navigate to="/login" replace /> : sessao.equipe.trocarSenha
          ? <TrocarSenha obrigatoria api={api} onTrocou={guardar} />
          : <Casca sessao={sessao} api={api} guardar={guardar} onSair={sair} />} />
      </Routes>
    </>
  );
}
