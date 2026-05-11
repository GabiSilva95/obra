import { C, F } from "../../constants/tokens";
import Icon from "./Icon";

export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)", padding: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <style>{`
        @media(min-width:640px){
          .modal-overlay{align-items:center!important;padding:16px!important}
          .modal-sheet{border-radius:18px!important;max-height:88vh!important;border-bottom-left-radius:18px!important;border-bottom-right-radius:18px!important}
        }
        @media(max-width:639px){
          .modal-sheet{border-radius:18px 18px 0 0!important;max-height:92dvh!important;padding-bottom:env(safe-area-inset-bottom,0px)}
        }
      `}</style>
      <div
        className="modal-sheet"
        style={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 18, width: "100%", maxWidth: wide ? 760 : 500, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.9)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${C.borderLight}`, position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text, ...F }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,.05)", border: "none", cursor: "pointer", color: C.muted, width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
          >
            <Icon n="x" size={14} />
          </button>
        </div>
        <div style={{ padding: "18px 22px" }}>{children}</div>
      </div>
    </div>
  );
}
