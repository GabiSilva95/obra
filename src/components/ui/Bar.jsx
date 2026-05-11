import { C } from "../../constants/tokens";

export default function Bar({ val, color }) {
  const pct = Math.min(100, Math.max(0, val || 0));
  const bg = color || (pct === 100 ? C.green : pct > 70 ? C.orange : C.blue);
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: bg, borderRadius: 6, transition: "width .5s", boxShadow: `0 0 8px ${bg}50` }} />
    </div>
  );
}
