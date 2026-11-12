import React from "react";
import { isModPressed } from "@/lib/platform";

interface ShortcutOptions {
  key: string;
  mod?: boolean;
  shift?: boolean;
  enabled?: boolean;
}

/** Window-level keyboard shortcut. The latest handler is always used. */
export const useShortcut = ({ key, mod = false, shift = false, enabled = true }: ShortcutOptions, handler: (event: KeyboardEvent) => void) => {
  const handlerRef = React.useRef(handler);
  React.useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  React.useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (mod !== isModPressed(event)) return;
      if (shift !== event.shiftKey) return;
      if (event.altKey) return;
      event.preventDefault();
      handlerRef.current(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, mod, shift, enabled]);
};
