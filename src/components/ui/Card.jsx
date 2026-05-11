import { useState } from "react";
import { C } from "../../constants/tokens";

export default function Card({ children, style = {}, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ background: C.surface, border: `1px solid ${h && onClick ? C.orange : C.border}`, borderRadius: 14, padding: 18, transition: "all .2s", cursor: onClick ? "pointer" : "default", ...style }}
    >
      {children}
    </div>
  );
}
