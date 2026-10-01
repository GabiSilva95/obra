import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

// The shell renders one design-system Header; pages send their actions to its `actions` slot through this portal.
export const PageActionsContext = createContext(null);

export function PageActions({ children }) {
  const target = useContext(PageActionsContext);
  return target ? createPortal(children, target) : null;
}
