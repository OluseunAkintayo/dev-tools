import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

export const modKey = isMac ? "⌘" : "Ctrl";

export const isModPressed = (event: KeyboardEvent | ReactKeyboardEvent) => (isMac ? event.metaKey : event.ctrlKey);
