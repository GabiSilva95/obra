import { useState, useEffect } from "react";
import { C, F, FONT_URL } from "../constants/tokens";
import { PLANOS } from "../constants/data";
import Icon from "../components/ui/Icon";

export default function PlanosPage({ onEscolher, onLogin }) {
  const [ciclo, setCiclo] = useState("mensal");
  const [hov, setHov] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const anual = ciclo === "anual";

  const IcoEmail = ({ c = "currentColor", s = 13 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" /></svg>;
  const IcoWpp = ({ c = "currentColor", s = 13 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>;
  const IcoChk = ({ c }) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
  const IcoChev = ({ open }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}><polyline points="6 9 12 15 18 9" /></svg>;

  const ANIM_CSS = `
@keyframes obg-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes obg-row{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes obg-bar{from{width:0}to{width:var(--w)}}
@keyframes obg-pulse{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes obg-pop{0%{transform:scale(.82);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes obg-cursor{0%,100%{transform:translate(0,0)}25%{transform:translate(60px,14px)}50%{transform:translate(120px,0px)}75%{transform:translate(60px,-10px)}}
@keyframes obg-type{from{width:0}to{width:100%}}
@keyframes obg-blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes obg-kpi{from{opacity:.3;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes obg-drop{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes obg-badge{from{transform:scale(0) rotate(-15deg);opacity:0}to{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes obg-scan{0%{top:0}100%{top:100%}}
`;

  const DemoAlocacao = () => {
    const [phase, setPhase] = useState(0);
    const [typed, setTyped] = useState("");
    const [horasTyped, setHorasTyped] = useState("");

    useEffect(() => {
      const next = { 0: [1200, () => setPhase(1)], 1: [700, () => setPhase(2)], 2: [900, () => setPhase(3)], 3: [700, () => setPhase(4)], 4: [900, () => setPhase(5)], 5: [1400, () => setPhase(6)], 6: [800, () => setPhase(7)], 7: [3200, () => { setTyped(""); setHorasTyped(""); setPhase(0); }] };
      if (next[phase]) { const [ms, fn] = next[phase]; const t = setTimeout(fn, ms); return () => clearTimeout(t); }
    }, [phase]);

    useEffect(() => {
      if (phase === 2) {
        const str = "Edifício Aurora"; let i = 0;
        const iv = setInterval(() => { i++; setTyped(str.slice(0, i)); if (i >= str.length) clearInterval(iv); }, 60);
        return () => clearInterval(iv);
      }
    }, [phase]);

    useEffect(() => {
      if (phase === 5) {
        const str = "120"; let i = 0;
        const iv = setInterval(() => { i++; setHorasTyped(str.slice(0, i)); if (i >= str.length) clearInterval(iv); }, 120);
        return () => clearInterval(iv);
      }
    }, [phase]);

    const rows = [
      { obra: "Edifício Aurora", tipo: "Máquina", ref: "Escavadeira CAT 320", qtd: "80 h", data: "10/02", cor: "#60a5fa" },
      { obra: "Edifício Aurora", tipo: "Máquina", ref: "Betoneira 400L", qtd: "200 h", data: "01/04", cor: "#60a5fa" },
      { obra: "Ponte Rio Verde", tipo: "Insumo", ref: "Cimento CP-II", qtd: "150 sc", data: "10/04", cor: "#f97316" },
    ];
    const newRow = { obra: "Edifício Aurora", tipo: "Máquina", ref: "Retroescavadeira JD", qtd: "120 h", data: "hoje", cor: "#60a5fa" };

    const S = {
      wrap: { background: "#0d0d0d", borderRadius: 0, fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden", userSelect: "none" },
      sidebar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 42, background: "#111", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 6 },
      sideIcon: (active) => ({ width: 22, height: 22, borderRadius: 5, background: active ? "rgba(249,115,22,.15)" : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }),
      main: { marginLeft: 42, padding: "12px 14px", height: "100%" },
      hdr: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
      kpiRow: { display: "flex", gap: 8, marginBottom: 10 },
      kpi: (cor, bg) => ({ flex: 1, background: bg, border: `1px solid ${cor}35`, borderRadius: 8, padding: "7px 10px" }),
      tblHdr: { display: "grid", gridTemplateColumns: "1fr 70px 1.4fr 70px 50px", gap: 6, padding: "5px 8px", background: "rgba(255,255,255,.025)", borderRadius: 5, marginBottom: 3, fontSize: 9, color: "#5a5a5a", letterSpacing: "0.05em" },
      row: (hi) => ({ display: "grid", gridTemplateColumns: "1fr 70px 1.4fr 70px 50px", gap: 6, padding: "6px 8px", borderRadius: 5, background: hi ? "rgba(249,115,22,.07)" : "rgba(255,255,255,.02)", border: `1px solid ${hi ? "rgba(249,115,22,.2)" : "transparent"}`, fontSize: 10, color: "#d0d0d0", alignItems: "center", marginBottom: 2, transition: "all .3s" }),
      badge: (cor) => ({ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 20, background: `${cor}18`, border: `1px solid ${cor}40`, fontSize: 8.5, color: cor, fontWeight: 600 }),
      dot: (cor) => ({ width: 4, height: 30, borderRadius: 2, background: cor, flexShrink: 0 }),
    };

    const modalOpen = phase >= 1 && phase <= 6;
    const custoMaq = phase === 7 ? "R$ 63.450" : "R$ 47.450";
    const pct = phase === 7 ? 76 : 56;

    return <div style={{ ...S.wrap, height: 310 }}>
      <style>{ANIM_CSS}</style>
      <div style={S.sidebar}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(249,115,22,.15)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        </div>
        {["M", "O", "P", "A", "E", "R"].map((l, i) => <div key={i} style={{ ...S.sideIcon(i === 3), fontSize: 9, color: i === 3 ? "#f97316" : "#333", fontWeight: 700 }}>{l}</div>)}
      </div>
      <div style={S.main}>
        <div style={S.hdr}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.03em" }}>Alocações</div>
            <div style={{ fontSize: 9, color: "#555" }}>Edifício Aurora · 3 máquinas · 2 insumos</div>
          </div>
          <button style={{ background: phase >= 1 && phase <= 6 ? "rgba(249,115,22,.25)" : "#f97316", border: "none", borderRadius: 7, padding: "5px 11px", fontSize: 9, fontWeight: 700, color: phase >= 1 && phase <= 6 ? "#f97316" : "#0a0a0a", cursor: "default", display: "flex", alignItems: "center", gap: 5, transition: "all .3s", boxShadow: phase === 0 ? "0 2px 12px rgba(249,115,22,.35)" : "none" }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>+</span> Nova Alocação
          </button>
        </div>
        <div style={S.kpiRow}>
          <div style={S.kpi("#60a5fa", "rgba(96,165,250,.06)")}>
            <div style={{ fontSize: 8, color: "#60a5fa", opacity: .8, marginBottom: 3 }}>Custo Máquinas</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa", letterSpacing: "-0.03em", transition: "all .5s", animation: phase === 7 ? "obg-kpi .5s ease" : "none" }}>{custoMaq}</div>
            <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: "rgba(96,165,250,.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#60a5fa", width: `${pct}%`, transition: "width 1s ease" }} />
            </div>
          </div>
          <div style={S.kpi("#f97316", "rgba(249,115,22,.06)")}>
            <div style={{ fontSize: 8, color: "#f97316", opacity: .8, marginBottom: 3 }}>Custo Insumos</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f97316", letterSpacing: "-0.03em" }}>R$ 18.200</div>
            <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: "rgba(249,115,22,.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#f97316", width: "28%" }} />
            </div>
          </div>
        </div>
        <div style={S.tblHdr}><span>OBRA</span><span>TIPO</span><span>REFERÊNCIA</span><span>QTD/H</span><span>DATA</span></div>
        {rows.map((r, i) => (
          <div key={i} style={{ ...S.row(false), animation: `obg-row .4s ease ${i * 0.08}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={S.dot(r.cor)} />
              <span style={{ fontSize: 9.5 }}>{r.obra}</span>
            </div>
            <span style={S.badge(r.cor)}>{r.tipo}</span>
            <span style={{ fontSize: 9, color: "#aaa" }}>{r.ref}</span>
            <span style={{ fontWeight: 700, fontSize: 9.5 }}>{r.qtd}</span>
            <span style={{ fontSize: 9, color: "#555" }}>{r.data}</span>
          </div>
        ))}
        {phase === 7 && <div style={{ ...S.row(true), animation: "obg-row .45s cubic-bezier(.34,1.56,.64,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={S.dot("#60a5fa")} />
            <span style={{ fontSize: 9.5 }}>{newRow.obra}</span>
          </div>
          <span style={S.badge("#60a5fa")}>{newRow.tipo}</span>
          <span style={{ fontSize: 9, color: "#aaa" }}>{newRow.ref}</span>
          <span style={{ fontWeight: 700, fontSize: 9.5, color: "#60a5fa" }}>{newRow.qtd}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#22c55e" }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            {newRow.data}
          </span>
        </div>}
      </div>

      {modalOpen && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", animation: "obg-fadein .2s ease", zIndex: 10 }}>
        <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14, padding: "18px 20px", width: 260, boxShadow: "0 32px 80px rgba(0,0,0,.8)", animation: "obg-drop .25s cubic-bezier(.34,1.56,.64,1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#f0f0f0" }}>Nova Alocação</span>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555" }}>✕</div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Obra</div>
            <div style={{ background: phase >= 2 ? "rgba(249,115,22,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${phase >= 2 ? "rgba(249,115,22,.35)" : "#252525"}`, borderRadius: 7, padding: "6px 9px", fontSize: 10, color: phase >= 2 ? "#f0f0f0" : "#444", minHeight: 24, display: "flex", alignItems: "center", transition: "all .2s" }}>
              {phase >= 2 ? typed : <span style={{ color: "#333" }}>Selecione a obra…</span>}
              {phase === 2 && <span style={{ width: 1, height: 11, background: "#f97316", marginLeft: 1, animation: "obg-blink 1s infinite", display: "inline-block" }} />}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tipo</div>
            <div style={{ background: phase >= 3 ? "rgba(96,165,250,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${phase >= 3 ? "rgba(96,165,250,.35)" : "#252525"}`, borderRadius: 7, padding: "6px 9px", fontSize: 10, display: "flex", alignItems: "center", gap: 6, transition: "all .2s" }}>
              {phase >= 3 ? <><span style={S.badge("#60a5fa")}>Máquina</span><span style={{ fontSize: 9, color: "#888" }}>selecionado</span></> : <span style={{ color: "#333" }}>Tipo de alocação…</span>}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Máquina / Insumo</div>
            <div style={{ background: phase >= 4 ? "rgba(96,165,250,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${phase >= 4 ? "rgba(96,165,250,.35)" : "#252525"}`, borderRadius: 7, padding: "6px 9px", fontSize: 10, color: phase >= 4 ? "#f0f0f0" : "#444", transition: "all .2s" }}>
              {phase >= 4 ? "Retroescavadeira JD" : <span style={{ color: "#333" }}>Selecione…</span>}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Horas / Qtd</div>
            <div style={{ background: phase >= 5 ? "rgba(96,165,250,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${phase >= 5 ? "rgba(96,165,250,.35)" : "#252525"}`, borderRadius: 7, padding: "6px 9px", fontSize: 10, color: phase >= 5 ? "#f0f0f0" : "#444", display: "flex", alignItems: "center", transition: "all .2s" }}>
              {phase >= 5 ? <>{horasTyped}<span style={{ color: "#555" }}> h</span>{phase === 5 && <span style={{ width: 1, height: 11, background: "#60a5fa", marginLeft: 1, animation: "obg-blink 1s infinite", display: "inline-block" }} />}</> : <span style={{ color: "#333" }}>0</span>}
            </div>
          </div>
          <button style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: phase === 6 ? "rgba(34,197,94,.15)" : "linear-gradient(90deg,#f97316,#ea6c0a)", color: phase === 6 ? "#22c55e" : "#0a0a0a", fontWeight: 700, fontSize: 11, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .3s", boxShadow: phase < 6 ? "0 4px 16px rgba(249,115,22,.35)" : "none" }}>
            {phase === 6 ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>Salvo!</> : "Salvar Alocação"}
          </button>
        </div>
      </div>}
    </div>;
  };

  const DemoEstoque = () => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
      const next = { 0: [1000, 1], 1: [700, 2], 2: [700, 3], 3: [1400, 4], 4: [1400, 5], 5: [900, 6], 6: [3800, 0] };
      if (next[phase]) { const [ms, p] = next[phase]; const t = setTimeout(() => setPhase(p), ms); return () => clearTimeout(t); }
    }, [phase]);

    const INSUMOS = [
      { nome: "Cimento CP-II", unid: "sc", ent: 500, util: 320, cor: "#f97316", base: 64 },
      { nome: "Areia Média", unid: "m³", ent: 80, util: 55, cor: "#f97316", base: 69 },
      { nome: "Vergalhão CA-50", unid: "br", ent: 200, util: 140, cor: "#ef4444", base: 70 },
      { nome: "Concreto FCK 25", unid: "m³", ent: 120, util: 88, cor: "#ef4444", base: 73 },
    ];
    const getEnt = (i, p) => { if (p === 6) { return i === 0 ? 600 : i === 1 ? 120 : INSUMOS[i].ent; } return INSUMOS[i].ent; };
    const getUtil = (i, p) => { if (p === 6) { return i === 0 ? 320 : i === 1 ? 55 : i === 2 ? 140 : 88; } return INSUMOS[i].util; };
    const getPct = (i, p) => { const e = getEnt(i, p); const u = getUtil(i, p); return Math.round(u / e * 100); };

    const S2 = {
      tab: (a) => ({ flex: 1, padding: "5px 0", textAlign: "center", fontSize: 9.5, fontWeight: a ? 700 : 400, color: a ? "#0a0a0a" : "#555", background: a ? "#f97316" : "transparent", borderRadius: 6, cursor: "default", transition: "all .2s" }),
    };
    const activeTab = phase <= 0 || phase === 6 ? "pos" : "ent";

    return <div style={{ background: "#0d0d0d", borderRadius: 0, fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden", height: 310, userSelect: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 42, background: "#111", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(249,115,22,.15)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        </div>
        {["M", "O", "P", "A", "E", "R"].map((l, i) => <div key={i} style={{ width: 22, height: 22, borderRadius: 5, background: i === 4 ? "rgba(249,115,22,.15)" : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: i === 4 ? "#f97316" : "#333", fontWeight: 700 }}>{l}</div>)}
      </div>
      <div style={{ marginLeft: 42, padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.03em" }}>Estoque</div>
          <div style={{ fontSize: 9, color: "#555" }}>Edifício Aurora · posição atual</div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,.03)", borderRadius: 8, padding: 3, marginBottom: 9 }}>
          <div style={S2.tab(activeTab === "ent")}>Entrada de Insumos</div>
          <div style={S2.tab(activeTab === "pos")}>Estoque (Posição)</div>
        </div>

        {(phase >= 1 && phase <= 5) && <>
          {phase <= 2 && <div style={{ flex: 1, border: `2px dashed ${phase === 2 ? "#f97316" : "#2a2a2a"}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: phase === 2 ? "rgba(249,115,22,.05)" : "transparent", transition: "all .3s", animation: phase === 1 ? "obg-fadein .3s ease" : "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: phase === 2 ? "rgba(249,115,22,.12)" : "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={phase === 2 ? "#f97316" : "#444"} strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: phase === 2 ? "#f97316" : "#444", transition: "color .3s" }}>{phase === 2 ? "Solte o arquivo aqui" : "Arraste NF-e XML, PDF ou Excel"}</div>
            <div style={{ fontSize: 9, color: "#333" }}>ou clique para selecionar</div>
          </div>}
          {phase === 3 && <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, animation: "obg-fadein .3s ease" }}>
            <div style={{ width: 52, height: 64, background: "rgba(255,255,255,.04)", border: "1px solid #2a2a2a", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#f97316,transparent)", animation: "obg-scan 1.2s ease-in-out infinite" }} />
              <svg width="20" height="24" viewBox="0 0 24 32" fill="none" stroke="#444" strokeWidth="1.5"><rect x="2" y="2" width="20" height="28" rx="2" /><path d="M7 8h10M7 13h10M7 18h7" /></svg>
            </div>
            <div style={{ fontSize: 10, color: "#888", animation: "obg-pulse 1.5s infinite" }}>Lendo NF_Aurora_0342.xml…</div>
            <div style={{ width: 120, height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#f97316", borderRadius: 2, animation: "obg-bar 1.4s ease forwards", "--w": "100%" }} />
            </div>
          </div>}
          {(phase === 4 || phase === 5) && <div style={{ flex: 1, animation: "obg-fadein .25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <span style={{ fontSize: 9.5, color: "#22c55e", fontWeight: 600 }}>2 itens encontrados · NF 0342</span>
              </div>
              <span style={{ fontSize: 8, color: "#444" }}>Emissão 08/03/2025</span>
            </div>
            {[{ nome: "Cimento CP-II", unid: "sc 50kg", qtd: "100", val: "R$ 38,00", total: "R$ 3.800" }, { nome: "Areia Média", unid: "m³", qtd: "40", val: "R$ 95,00", total: "R$ 3.800" }].map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(34,197,94,.04)", border: "1px solid rgba(34,197,94,.15)", borderRadius: 7, marginBottom: 4, animation: `obg-row .3s ease ${i * .1}s both` }}>
                <div style={{ width: 4, height: 28, borderRadius: 2, background: "#22c55e", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#f0f0f0" }}>{it.nome}</div>
                  <div style={{ fontSize: 8.5, color: "#555" }}>{it.unid} · {it.qtd} un · {it.val}/un</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>{it.total}</div>
              </div>
            ))}
            <button style={{ width: "100%", marginTop: 7, padding: "8px", borderRadius: 7, border: "none", background: phase === 5 ? "rgba(34,197,94,.15)" : "linear-gradient(90deg,#f97316,#ea6c0a)", color: phase === 5 ? "#22c55e" : "#0a0a0a", fontWeight: 700, fontSize: 10, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all .3s" }}>
              {phase === 5 ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>Lançado no estoque!</> : "Confirmar e lançar no estoque"}
            </button>
          </div>}
        </>}

        {(phase === 0 || phase === 6) && <div style={{ flex: 1, animation: "obg-fadein .35s ease" }}>
          <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
            <div style={{ flex: 1, background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 7, padding: "6px 9px" }}>
              <div style={{ fontSize: 8, color: "#22c55e", marginBottom: 2 }}>Valor em Estoque</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", letterSpacing: "-0.03em", transition: "all .8s" }}>{phase === 6 ? "R$ 35.730" : "R$ 28.450"}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.25)", borderRadius: 7, padding: "6px 9px" }}>
              <div style={{ fontSize: 8, color: "#f97316", marginBottom: 2 }}>Consumido</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f97316", letterSpacing: "-0.03em" }}>R$ 54.820</div>
            </div>
          </div>
          {INSUMOS.map((ins, i) => {
            const ent = getEnt(i, phase); const util = getUtil(i, phase); const disp = ent - util; const pct = getPct(i, phase);
            return <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 38px 28px 28px 56px", gap: 5, padding: "5px 6px", borderRadius: 5, background: i % 2 === 0 ? "rgba(255,255,255,.02)" : "transparent", alignItems: "center", marginBottom: 2, animation: phase === 6 && i <= 1 ? "obg-kpi .5s ease" : "none" }}>
              <span style={{ fontSize: 9.5, color: "#ccc", fontWeight: 500 }}>{ins.nome}</span>
              <span style={{ fontSize: 8.5, color: "#22c55e", fontWeight: 700, transition: "all .5s" }}>{disp}</span>
              <span style={{ fontSize: 8, color: "#444" }}>{ins.unid}</span>
              <span style={{ fontSize: 8, color: pct > 70 ? "#ef4444" : "#f97316", fontWeight: 600 }}>{pct}%</span>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: pct > 70 ? "#ef4444" : "#f97316", width: `${pct}%`, transition: "width 1s ease" }} />
              </div>
            </div>;
          })}
        </div>}
      </div>
    </div>;
  };

  const DemoPessoas = () => {
    const [phase, setPhase] = useState(0);
    const [tNome, setTNome] = useState("");
    const [tCargo, setTCargo] = useState("");

    useEffect(() => {
      const next = { 0: [1000, () => setPhase(1)], 1: [800, () => setPhase(2)], 2: [1100, () => setPhase(3)], 3: [1000, () => setPhase(4)], 4: [900, () => setPhase(5)], 5: [800, () => setPhase(6)], 6: [700, () => setPhase(7)], 7: [3200, () => { setTNome(""); setTCargo(""); setPhase(0); }] };
      if (next[phase]) { const [ms, fn] = next[phase]; const t = setTimeout(fn, ms); return () => clearTimeout(t); }
    }, [phase]);

    useEffect(() => {
      if (phase === 2) { const s = "Carlos Menezes"; let i = 0; const iv = setInterval(() => { i++; setTNome(s.slice(0, i)); if (i >= s.length) clearInterval(iv); }, 55); return () => clearInterval(iv); }
    }, [phase]);

    useEffect(() => {
      if (phase === 3) { const s = "Eletricista"; let i = 0; const iv = setInterval(() => { i++; setTCargo(s.slice(0, i)); if (i >= s.length) clearInterval(iv); }, 65); return () => clearInterval(iv); }
    }, [phase]);

    const pessoas = [
      { ini: "J", nome: "José Ferreira", cargo: "Pedreiro", tipo: "Funcionário", val: "R$ 180", obras: 2, cor: "#60a5fa" },
      { ini: "A", nome: "Ana Oliveira", cargo: "Eng. Civil", tipo: "Funcionário", val: "R$ 450", obras: 3, cor: "#60a5fa" },
      { ini: "T", nome: "TechBuild Ltda", cargo: "Inst. Elétricas", tipo: "Prestador", val: "R$ 1.200", obras: 1, cor: "#a78bfa" },
    ];
    const nova = { ini: "C", nome: "Carlos Menezes", cargo: "Eletricista", tipo: "Funcionário", val: "R$ 210", obras: 1, cor: "#60a5fa" };

    const Sb = {
      row: (hi) => ({ display: "grid", gridTemplateColumns: "26px 1fr 72px 70px 50px 34px", gap: 6, padding: "6px 8px", borderRadius: 6, background: hi ? "rgba(96,165,250,.06)" : "rgba(255,255,255,.02)", border: `1px solid ${hi ? "rgba(96,165,250,.2)" : "transparent"}`, alignItems: "center", marginBottom: 3, transition: "all .3s" }),
      badge: (cor) => ({ display: "inline-flex", padding: "2px 7px", borderRadius: 20, background: `${cor}18`, border: `1px solid ${cor}40`, fontSize: 8, color: cor, fontWeight: 600, whiteSpace: "nowrap" }),
      avatar: (cor) => ({ width: 22, height: 22, borderRadius: 6, background: `${cor}20`, border: `1px solid ${cor}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: cor, flexShrink: 0 }),
    };

    return <div style={{ background: "#0d0d0d", borderRadius: 0, fontFamily: "'Sora',sans-serif", position: "relative", overflow: "hidden", height: 310, userSelect: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 42, background: "#111", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(249,115,22,.15)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        </div>
        {["M", "O", "P", "A", "E", "R"].map((l, i) => <div key={i} style={{ width: 22, height: 22, borderRadius: 5, background: i === 2 ? "rgba(167,139,250,.15)" : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: i === 2 ? "#a78bfa" : "#333", fontWeight: 700 }}>{l}</div>)}
      </div>
      <div style={{ marginLeft: 42, padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.03em" }}>Pessoas & Equipes</div>
            <div style={{ fontSize: 9, color: "#555" }}>{phase === 7 ? 4 : 3} colaboradores cadastrados</div>
          </div>
          <button style={{ background: phase >= 1 && phase <= 6 ? "rgba(167,139,250,.2)" : "#a78bfa", border: "none", borderRadius: 7, padding: "5px 11px", fontSize: 9, fontWeight: 700, color: phase >= 1 && phase <= 6 ? "#a78bfa" : "#0a0a0a", cursor: "default", display: "flex", alignItems: "center", gap: 5, transition: "all .3s" }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>+</span> Nova Pessoa
          </button>
        </div>
        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,.03)", borderRadius: 8, padding: 3, marginBottom: 8 }}>
          {["Tipos de Etapa", "Pessoas"].map((t, i) => <div key={i} style={{ flex: 1, padding: "4px 0", textAlign: "center", fontSize: 9, fontWeight: i === 1 ? 700 : 400, color: i === 1 ? "#0a0a0a" : "#555", background: i === 1 ? "#f97316" : "transparent", borderRadius: 5, cursor: "default" }}>{t}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 72px 70px 50px 34px", gap: 6, padding: "4px 8px", fontSize: 8.5, color: "#3a3a3a", letterSpacing: "0.05em", marginBottom: 4 }}>
          <span /><span>NOME</span><span>CARGO</span><span>TIPO</span><span>VAL/DIA</span><span>OBR</span>
        </div>
        {pessoas.map((p, i) => (
          <div key={i} style={{ ...Sb.row(false), animation: `obg-row .4s ease ${i * .07}s both` }}>
            <div style={Sb.avatar(p.cor)}>{p.ini}</div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "#e0e0e0", lineHeight: 1.2 }}>{p.nome}</div>
              <div style={{ fontSize: 8, color: "#555" }}>{p.cargo}</div>
            </div>
            <span style={Sb.badge(p.cor)}>{p.tipo}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#ccc" }}>{p.val}</span>
            <span style={{ fontSize: 9, color: "#555" }}>{p.obras}×</span>
            <div style={{ width: 24, height: 18, borderRadius: 4, background: "rgba(255,255,255,.04)", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </div>
          </div>
        ))}
        {phase === 7 && <div style={{ ...Sb.row(true), animation: "obg-row .4s cubic-bezier(.34,1.56,.64,1) both" }}>
          <div style={Sb.avatar("#60a5fa")}>{nova.ini}</div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "#e0e0e0", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 5 }}>
              {nova.nome}
              <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 8, background: "rgba(34,197,94,.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,.3)", animation: "obg-badge .4s cubic-bezier(.34,1.56,.64,1)" }}>novo</span>
            </div>
            <div style={{ fontSize: 8, color: "#555" }}>{nova.cargo}</div>
          </div>
          <span style={Sb.badge("#60a5fa")}>{nova.tipo}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa" }}>{nova.val}</span>
          <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 600 }}>1×</span>
          <div style={{ width: 24, height: 18, borderRadius: 4, background: "rgba(96,165,250,.08)", border: "1px solid rgba(96,165,250,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </div>
        </div>}
      </div>

      {(phase >= 1 && phase <= 6) && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, animation: "obg-fadein .2s ease" }}>
        <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14, padding: "18px 20px", width: 255, boxShadow: "0 32px 80px rgba(0,0,0,.8)", animation: "obg-drop .25s cubic-bezier(.34,1.56,.64,1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#f0f0f0" }}>Nova Pessoa</span>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555" }}>✕</div>
          </div>
          {[
            { label: "Nome completo", ph: "Digite o nome…", val: phase >= 2 ? tNome : "", active: phase === 2, cor: "#a78bfa" },
            { label: "Cargo", ph: "Ex: Pedreiro, Engenheiro…", val: phase >= 3 ? tCargo : "", active: phase === 3, cor: "#a78bfa" },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ fontSize: 9, color: "#555", marginBottom: 3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{f.label}</div>
              <div style={{ background: phase > i + 1 ? "rgba(167,139,250,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${phase > i + 1 ? f.cor + "40" : "#252525"}`, borderRadius: 7, padding: "6px 9px", fontSize: 10, color: phase > i + 1 ? "#f0f0f0" : "#444", display: "flex", alignItems: "center", transition: "all .2s", minHeight: 26 }}>
                {f.val || <span style={{ color: "#333" }}>{f.ph}</span>}
                {f.active && <span style={{ width: 1, height: 11, background: f.cor, marginLeft: 1, animation: "obg-blink 1s infinite", display: "inline-block" }} />}
              </div>
            </div>
          ))}
          <div style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tipo</div>
            <div style={{ display: "flex", gap: 5 }}>
              {["Funcionário", "Prestador"].map((t, i) => (
                <div key={i} style={{ flex: 1, padding: "5px", borderRadius: 6, border: `1px solid ${i === 0 && phase >= 4 ? "rgba(96,165,250,.5)" : "#252525"}`, background: i === 0 && phase >= 4 ? "rgba(96,165,250,.08)" : "rgba(255,255,255,.03)", textAlign: "center", fontSize: 9, color: i === 0 && phase >= 4 ? "#60a5fa" : "#444", fontWeight: i === 0 && phase >= 4 ? 700 : 400, cursor: "default", transition: "all .2s" }}>{t}</div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Valor / Dia</div>
            <div style={{ background: phase >= 5 ? "rgba(96,165,250,.06)" : "rgba(255,255,255,.04)", border: `1px solid ${phase >= 5 ? "rgba(96,165,250,.35)" : "#252525"}`, borderRadius: 7, padding: "6px 9px", fontSize: 10, color: phase >= 5 ? "#f0f0f0" : "#444", transition: "all .2s" }}>
              {phase >= 5 ? "R$ 210,00" : <span style={{ color: "#333" }}>R$ 0,00</span>}
            </div>
          </div>
          <button style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: phase === 6 ? "rgba(34,197,94,.15)" : "linear-gradient(90deg,#a78bfa,#7c5cbf)", color: phase === 6 ? "#22c55e" : "#fff", fontWeight: 700, fontSize: 11, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all .3s" }}>
            {phase === 6 ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>Pessoa cadastrada!</> : "Cadastrar Pessoa"}
          </button>
        </div>
      </div>}
    </div>;
  };

  const FEATURES = [
    {
      id: "alocacao", tag: "Alocação", cor: "#60a5fa",
      title: "Aloque máquinas, insumos e equipes por obra",
      desc: "Registre cada alocação vinculada a uma obra específica. Acompanhe custo por categoria (máquinas vs insumos), histórico de uso e observações. Controle total sobre o que está sendo consumido em cada frente.",
      bullets: ["Vínculo direto por obra", "KPIs de custo em tempo real", "Histórico completo de alocações", "Distingue máquinas de insumos"],
      screen: <DemoAlocacao />,
    },
    {
      id: "estoque", tag: "Estoque", cor: "#f97316",
      title: "Posição de estoque em tempo real por obra",
      desc: "Acompanhe entrada, consumo e saldo disponível de cada insumo. Barra de progresso visual indica o percentual utilizado. Veja o valor financeiro do estoque disponível e consumido filtrado por obra.",
      bullets: ["Saldo por insumo e por obra", "Barra de consumo visual", "Valor financeiro em estoque", "Importação de NF-e / XML"],
      screen: <DemoEstoque />,
    },
    {
      id: "pessoas", tag: "Pessoas & Equipes", cor: "#a78bfa",
      title: "Gerencie equipes, prestadores e mão de obra",
      desc: "Cadastre funcionários e prestadores de serviço, vincule-os às obras em que atuam e defina o valor por dia. O custo de mão de obra é calculado automaticamente nos relatórios de cada obra.",
      bullets: ["Funcionários CLT e prestadores", "Vínculo por obra", "Custo de mão de obra por projeto", "Controle de ativação e inativação"],
      screen: <DemoPessoas />,
    },
  ];

  const FAQS = [
    { q: "Como funciona a alocação de máquinas?", a: "Você registra cada uso de máquina vinculado a uma obra: seleciona a máquina, informa as horas trabalhadas e a data. O sistema calcula automaticamente o custo com base no valor/hora cadastrado para cada equipamento." },
    { q: "Posso controlar o estoque de mais de uma obra ao mesmo tempo?", a: "Sim. Cada entrada de insumo é vinculada a uma obra específica. Você pode filtrar a posição de estoque por obra ou visualizar tudo consolidado no dashboard principal." },
    { q: "Como importar notas fiscais para o estoque?", a: "No módulo Estoque > Entrada de Insumos, clique em 'Importar NF'. Arraste o arquivo XML, PDF ou Excel. O sistema faz o parsing automático e apresenta os itens para você confirmar antes de lançar no estoque da obra." },
    { q: "Posso alocar a mesma máquina em obras diferentes?", a: "Sim. Cada registro de alocação é independente — você pode alocar a mesma máquina em múltiplas obras em datas diferentes. O histórico fica separado por obra." },
    { q: "Quem pode cadastrar usuários e definir permissões?", a: "Apenas o administrador da sua empresa pode criar, editar e desativar usuários, além de definir quais telas e obras cada colaborador pode acessar." },
    { q: "O que acontece se eu atingir o limite de usuários do meu plano?", a: "O sistema bloqueia a criação de novos usuários e exibe um aviso de limite atingido com botão de upgrade. Nenhum dado é perdido. O upgrade de plano é feito diretamente dentro do sistema." },
    { q: "Posso mudar de plano depois de contratar?", a: "Sim. A migração é feita diretamente na tela de Usuários > Alterar Plano. No upgrade, o acesso é liberado imediatamente. No downgrade, os dados são preservados mas funcionalidades excedentes são limitadas." },
    { q: "Como funciona o cancelamento?", a: "Planos mensais podem ser cancelados a qualquer momento, sem multa e sem fidelidade mínima. Seus dados ficam disponíveis por 30 dias após o cancelamento para exportação. No plano anual, o cancelamento encerra o acesso ao fim do período já pago, sem reembolso proporcional." },
    { q: "Meus dados ficam seguros após o cancelamento?", a: "Todos os dados são isolados por empresa. Após o cancelamento, você tem 30 dias para exportar relatórios e dados. Após esse prazo, os dados são removidos permanentemente de nossos servidores." },
    { q: "O sistema funciona no celular?", a: "A interface funciona em navegadores mobile. Para uso intensivo em campo, recomendamos tablets ou notebooks para aproveitar melhor dashboards e tabelas com muitas colunas." },
  ];

  const GridBg = () => <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
    <div style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: "radial-gradient(ellipse at center, rgba(249,115,22,.06) 0%, transparent 65%)" }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: .05 }} preserveAspectRatio="xMidYMid slice">
      <defs><pattern id="pg" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M 52 0 L 0 0 0 52" fill="none" stroke="#f97316" strokeWidth="0.5" /></pattern></defs>
      <rect width="100%" height="100%" fill="url(#pg)" />
    </svg>
  </div>;

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return <>
    <link href={FONT_URL} rel="stylesheet" />
    <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#060810;overflow-x:hidden}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#252525;border-radius:8px}`}</style>
    <div style={{ minHeight: "100vh", background: "#060810", ...F }}>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 52px", borderBottom: "1px solid rgba(255,255,255,.05)", position: "sticky", top: 0, background: "rgba(6,8,16,.92)", backdropFilter: "blur(20px)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 29, height: 29, borderRadius: 8, background: "linear-gradient(135deg,#f97316,#ea6c0a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="building" size={14} color="#0a0a0a" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#f97316", letterSpacing: "-0.05em" }}>obrasgest</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[["Funcionalidades", "sec-features"], ["Planos", "sec-pricing"], ["FAQ", "sec-faq"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a7a7a", fontSize: 12, ...F, transition: "color .15s", padding: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = "#f0f0f0"} onMouseLeave={e => e.currentTarget.style.color = "#7a7a7a"}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <button onClick={onLogin} style={{ background: "none", border: "1px solid #252525", cursor: "pointer", fontSize: 12, color: "#7a7a7a", ...F, padding: "7px 15px", borderRadius: 8, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f0f0f0"; e.currentTarget.style.borderColor = "#444"; }} onMouseLeave={e => { e.currentTarget.style.color = "#7a7a7a"; e.currentTarget.style.borderColor = "#252525"; }}>
            Entrar
          </button>
          <button onClick={onLogin} style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.35)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#f97316", ...F, padding: "7px 17px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7, transition: "all .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(249,115,22,.22)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(249,115,22,.12)"}>
            <Icon n="eye" size={13} color="#f97316" />Acessar Demo
          </button>
        </div>
      </nav>

      <div style={{ position: "relative", textAlign: "center", padding: "88px 24px 80px", overflow: "hidden" }}>
        <GridBg />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.22)", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} />
            <span style={{ fontSize: 11, color: "#f97316", fontWeight: 600, letterSpacing: "0.04em" }}>Gestão de obras simplificada</span>
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#f0f0f0", lineHeight: 1.08, letterSpacing: "-0.055em", marginBottom: 20, ...F }}>
            Controle total da sua<br />
            <span style={{ background: "linear-gradient(90deg,#f97316,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              obra, do início ao fim
            </span>
          </h1>
          <p style={{ fontSize: 15, color: "#7a7a7a", maxWidth: 500, margin: "0 auto 44px", lineHeight: 1.78 }}>
            Estoque, alocação de máquinas, equipes e relatórios — tudo em um só lugar. Sem planilhas, sem retrabalho.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onLogin} style={{ padding: "14px 30px", borderRadius: 11, border: "none", background: "linear-gradient(90deg,#f97316,#ea6c0a)", color: "#0a0a0a", fontWeight: 800, fontSize: 14, cursor: "pointer", ...F, display: "flex", alignItems: "center", gap: 9, boxShadow: "0 8px 32px rgba(249,115,22,.38)" }}>
              <Icon n="eye" size={15} color="#0a0a0a" />Acessar Demo Gratuito
            </button>
            <button onClick={() => scrollTo("sec-features")} style={{ padding: "14px 28px", borderRadius: 11, border: "1px solid #252525", background: "rgba(255,255,255,.04)", color: "#f0f0f0", fontWeight: 600, fontSize: 14, cursor: "pointer", ...F }}>
              Ver Funcionalidades ↓
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#444", marginTop: 18 }}>Dados demo pré-carregados · Sem cadastro necessário</p>
        </div>
      </div>

      <div id="sec-features" style={{ padding: "20px 52px 88px", maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "5px 14px", marginBottom: 18 }}>
            <Icon n="checklist" size={12} color="#7a7a7a" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#7a7a7a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Funcionalidades</span>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.045em", marginBottom: 12, ...F }}>Tudo que sua obra precisa</h2>
          <p style={{ fontSize: 13, color: "#7a7a7a", maxWidth: 420, margin: "0 auto", lineHeight: 1.72 }}>Prints reais do sistema. O que você vê abaixo é exatamente o que você usa.</p>
        </div>

        {FEATURES.map((f, i) => {
          const flip = i % 2 !== 0;
          return (
            <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", marginBottom: i < FEATURES.length - 1 ? 88 : 0 }}>
              <div style={{ order: flip ? 2 : 1 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${f.cor}12`, border: `1px solid ${f.cor}30`, borderRadius: 20, padding: "4px 12px", marginBottom: 18 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: f.cor }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: f.cor, letterSpacing: "0.08em", textTransform: "uppercase" }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: 26, fontWeight: 800, color: "#f0f0f0", lineHeight: 1.22, letterSpacing: "-0.035em", marginBottom: 14, ...F }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: "#7a7a7a", lineHeight: 1.78, marginBottom: 24 }}>{f.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {f.bullets.map(b => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 19, height: 19, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${f.cor}14`, border: `1px solid ${f.cor}35` }}>
                        <IcoChk c={f.cor} />
                      </div>
                      <span style={{ fontSize: 13, color: "#7a7a7a", ...F }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ order: flip ? 1 : 2 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", inset: -1, borderRadius: 16, background: `radial-gradient(ellipse at 50% 100%, ${f.cor}18 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "relative", zIndex: 1, borderRadius: 14, overflow: "hidden", border: `1px solid ${f.cor}30`, boxShadow: `0 28px 72px rgba(0,0,0,.65), 0 0 40px ${f.cor}12` }}>
                    <div style={{ background: "#161616", padding: "8px 12px", display: "flex", alignItems: "center", gap: 7, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                      {["#ef4444", "#fbbf24", "#22c55e"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: .8 }} />)}
                      <div style={{ flex: 1, margin: "0 8px", background: "rgba(255,255,255,.05)", borderRadius: 4, height: 14, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                        <span style={{ fontSize: 8, color: "#3a3a3a", fontFamily: "monospace" }}>app.obrasgest.com.br</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 10, background: `${f.cor}15`, border: `1px solid ${f.cor}30` }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: f.cor, animation: "obg-pulse 1.5s infinite" }} />
                        <span style={{ fontSize: 7, color: f.cor, fontWeight: 700, letterSpacing: "0.05em" }}>AO VIVO</span>
                      </div>
                    </div>
                    {f.screen}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div id="sec-pricing" style={{ position: "relative", padding: "80px 24px 88px", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <GridBg />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "5px 14px", marginBottom: 18 }}>
              <Icon n="shield" size={12} color="#7a7a7a" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#7a7a7a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Planos & Preços</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.045em", marginBottom: 12, ...F }}>Preços flexíveis para<br /><span style={{ color: "#f97316" }}>construtoras de todo porte</span></h2>
            <p style={{ fontSize: 13, color: "#7a7a7a", marginBottom: 34, lineHeight: 1.7 }}>Sem taxas ocultas. Cancele quando quiser.</p>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 100, padding: 5, gap: 2 }}>
              {[{ id: "mensal", label: "Mensal" }, { id: "anual", label: "Anual", tag: "−20%" }].map(t => {
                const a = ciclo === t.id;
                return <button key={t.id} onClick={() => setCiclo(t.id)} style={{ padding: "8px 24px", borderRadius: 100, border: "none", cursor: "pointer", fontSize: 12, fontWeight: a ? 700 : 400, background: a ? "#f97316" : "transparent", color: a ? "#0a0a0a" : "#7a7a7a", display: "flex", alignItems: "center", gap: 7, transition: "all .2s", ...F }}>
                  {t.label}{t.tag && <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20, background: a ? "rgba(0,0,0,.2)" : "rgba(34,197,94,.15)", color: a ? "rgba(0,0,0,.65)" : "#22c55e" }}>{t.tag}</span>}
                </button>;
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, alignItems: "start" }}>
            {PLANOS.map((p, i) => {
              const mid = i === 1; const h = hov === p.id;
              const preco = anual ? p.preco.anual : p.preco.mensal;
              const economiaAno = (p.preco.mensal - p.preco.anual) * 12;
              return (
                <div key={p.id} onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)}
                  style={{ position: "relative", marginTop: mid ? 0 : 20, transition: "transform .25s", transform: h && !mid ? "translateY(-4px)" : "translateY(0)" }}>
                  {mid && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#f97316,#fbbf24)", color: "#0a0a0a", fontSize: 10, fontWeight: 800, padding: "4px 18px", borderRadius: 20, letterSpacing: "0.07em", whiteSpace: "nowrap", zIndex: 5, boxShadow: "0 4px 18px rgba(249,115,22,.5)" }}>★ MAIS POPULAR</div>}
                  <div style={{ borderRadius: 20, overflow: "hidden", border: `1.5px solid ${mid ? "#f97316" : h ? p.cor + "90" : "#252525"}`, background: mid ? "linear-gradient(160deg,rgba(249,115,22,.08),rgba(249,115,22,.03))" : "rgba(255,255,255,.025)", backdropFilter: "blur(12px)", boxShadow: mid ? "0 0 50px rgba(249,115,22,.18),0 24px 60px rgba(0,0,0,.6)" : h ? "0 16px 48px rgba(0,0,0,.5)" : "none", transition: "all .25s" }}>
                    <div style={{ height: 3, background: mid ? "linear-gradient(90deg,#f97316,#fbbf24)" : `linear-gradient(90deg,${p.cor}80,transparent)` }} />
                    <div style={{ padding: "26px 24px 24px" }}>
                      <div style={{ width: 50, height: 50, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: mid ? "linear-gradient(135deg,#f97316,#ea6c0a)" : `linear-gradient(135deg,${p.cor}30,${p.cor}10)`, border: `2px solid ${mid ? "#ea6c0a" : p.cor}50`, boxShadow: mid ? "0 0 24px rgba(249,115,22,.4)" : h ? `0 0 18px ${p.cor}40` : "none", transition: "box-shadow .25s" }}>
                        <Icon n={i === 0 ? "building" : i === 1 ? "barchart" : "shield"} size={20} color={mid ? "#0a0a0a" : p.cor} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: p.cor, border: `1px solid ${p.cor}40`, padding: "3px 12px", borderRadius: 20, ...F }}>{p.nome}</span>
                      </div>
                      <div style={{ textAlign: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-0.05em", ...F, color: mid ? "#f97316" : "#f0f0f0", lineHeight: 1 }}>R${preco}</span>
                        <span style={{ fontSize: 12, color: "#7a7a7a" }}> / mês</span>
                      </div>
                      <div style={{ textAlign: "center", marginBottom: 16, minHeight: 16 }}>
                        {anual ? <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Economia de R${economiaAno}/ano</span>
                          : <span style={{ fontSize: 11, color: "#444" }}>ou R${p.preco.anual}/mês no anual</span>}
                      </div>
                      <div style={{ height: "1px", background: `linear-gradient(90deg,transparent,${mid ? "#f97316" : p.cor}30,transparent)`, marginBottom: 18 }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
                        {p.features.map(ff => (
                          <div key={ff} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${p.cor}18`, border: `1px solid ${p.cor}40` }}><IcoChk c={p.cor} /></div>
                            <span style={{ fontSize: 11.5, color: "#7a7a7a", ...F, lineHeight: 1.3 }}>{ff}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                        {p.suporte.includes("email") && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 20, background: "rgba(96,165,250,.08)", border: "1px solid rgba(96,165,250,.25)", fontSize: 10, color: "#60a5fa", fontWeight: 600 }}><IcoEmail c="#60a5fa" s={10} />E-mail</div>}
                        {p.suporte.includes("whatsapp") && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 20, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.25)", fontSize: 10, color: "#22c55e", fontWeight: 600 }}><IcoWpp c="#22c55e" s={10} />WhatsApp</div>}
                      </div>
                      <button onClick={() => onEscolher(p.id)} style={{ width: "100%", padding: "12px", borderRadius: 11, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 12, fontWeight: 700, ...F, transition: "all .2s", background: mid ? "linear-gradient(90deg,#f97316,#ea6c0a)" : "rgba(255,255,255,.06)", color: mid ? "#0a0a0a" : p.cor, boxShadow: mid ? "0 6px 28px rgba(249,115,22,.45)" : "none", ...(h && !mid ? { background: `${p.cor}18` } : {}) }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${mid ? "rgba(0,0,0,.3)" : p.cor + "60"}`, background: mid ? "rgba(0,0,0,.12)" : "transparent" }}>
                          <Icon n={i === 0 ? "building" : i === 1 ? "barchart" : "shield"} size={10} color={mid ? "#0a0a0a" : p.cor} />
                        </div>
                        COMEÇAR AGORA
                      </button>
                      {mid && anual && <p style={{ textAlign: "center", fontSize: 10, color: "#444", marginTop: 8 }}>— Oferta por tempo limitado —</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {anual && <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#444", opacity: .7 }}>* Valores cobrados anualmente. Sem renovação automática sem aviso prévio.</p>}
        </div>
      </div>

      <div id="sec-faq" style={{ padding: "80px 52px 88px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "5px 14px", marginBottom: 18 }}>
            <Icon n="alert" size={12} color="#7a7a7a" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#7a7a7a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Dúvidas Frequentes</span>
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.045em", ...F }}>Tudo que você precisa saber</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((f, i) => {
            const open = faqOpen === i;
            return (
              <div key={i} onClick={() => setFaqOpen(open ? null : i)}
                style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${open ? "rgba(249,115,22,.32)" : "rgba(255,255,255,.07)"}`, borderRadius: 13, overflow: "hidden", cursor: "pointer", transition: "border-color .2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", gap: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: open ? 700 : 500, color: open ? "#f97316" : "#f0f0f0", ...F, lineHeight: 1.4, flex: 1 }}>{f.q}</span>
                  <div style={{ color: open ? "#f97316" : "#7a7a7a", flexShrink: 0, transition: "color .2s" }}><IcoChev open={open} /></div>
                </div>
                {open && <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                  <p style={{ fontSize: 12.5, color: "#7a7a7a", lineHeight: 1.78, marginTop: 14 }}>{f.a}</p>
                </div>}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 52, padding: "28px 32px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0", marginBottom: 5, ...F, letterSpacing: "-0.03em" }}>Ainda tem dúvidas?</div>
            <div style={{ fontSize: 12, color: "#7a7a7a" }}>Fale com a gente por e-mail ou WhatsApp — respondemos em até 24h.</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: "rgba(96,165,250,.1)", border: "1px solid rgba(96,165,250,.25)", fontSize: 12, color: "#60a5fa", fontWeight: 600, cursor: "default" }}><IcoEmail c="#60a5fa" s={13} />suporte@obrasgest.com.br</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", fontSize: 12, color: "#22c55e", fontWeight: 600, cursor: "default" }}><IcoWpp c="#22c55e" s={13} />(11) 9 9999-0000</div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "22px 52px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#f97316,#ea6c0a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="building" size={11} color="#0a0a0a" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#f97316", letterSpacing: "-0.04em" }}>obrasgest</span>
          <span style={{ fontSize: 11, color: "#444" }}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7a7a7a" }}><IcoEmail c="#7a7a7a" s={11} />suporte@obrasgest.com.br</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7a7a7a" }}><IcoWpp c="#7a7a7a" s={11} />WhatsApp: (11) 9 9999-0000</div>
        </div>
        <button onClick={onLogin} style={{ background: "linear-gradient(90deg,#f97316,#ea6c0a)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#0a0a0a", ...F, padding: "9px 18px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 16px rgba(249,115,22,.3)" }}>
          <Icon n="eye" size={13} color="#0a0a0a" />Acessar Demo
        </button>
      </div>

    </div>
  </>;
}
