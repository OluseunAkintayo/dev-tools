import React from "react";
import { useLocation } from "react-router-dom";
import { useHandoff } from "@/lib/handoff";
import { consumeShare, readSaved, saveField, sharedField } from "@/lib/toolState";

/** Wait this long after the last change before writing to sessionStorage. */
const SAVE_DELAY_MS = 250;

const sameKind = (value: unknown, reference: unknown) =>
  Array.isArray(reference) ? Array.isArray(value) : typeof value === typeof reference && (value === null) === (reference === null);

interface Options<T> {
  /** A value handed over inside the page (e.g. JWT Verify), which wins over everything else. */
  override?: T;
}

/**
 * useState that survives a reload and can be shared as a link. On mount the value comes
 * from, in order:
 *   1. options.override
 *   2. a share link opened for this scope
 *   3. `initial`, when this visit brought a handoff from another tool that hasn't been
 *      applied yet (so Smart Paste and "Next step" links always start fresh)
 *   4. the value saved in this tab
 *   5. `initial`
 * Saved values of the wrong type (an old or edited entry) are ignored.
 */
export function usePersistentState<T>(scope: string, field: string, initial: T | (() => T), options: Options<T> = {}): [T, React.Dispatch<React.SetStateAction<T>>] {
  const location = useLocation();
  const handoff = useHandoff();

  const [value, setValue] = React.useState<T>(() => {
    const fallback = initial instanceof Function ? initial() : initial;
    if (options.override !== undefined) return options.override;
    const shared = sharedField(scope, field);
    if (shared && sameKind(shared.value, fallback)) return shared.value as T;
    const saved = readSaved(scope);
    if (handoff && saved?.key !== location.key) return fallback;
    if (saved && Object.prototype.hasOwnProperty.call(saved.fields, field) && sameKind(saved.fields[field], fallback)) return saved.fields[field] as T;
    return fallback;
  });

  // Once every field of the tool has read the shared values, later mounts use saved state.
  React.useEffect(() => consumeShare(scope), [scope]);

  React.useEffect(() => {
    const save = () => saveField(scope, field, value, location.key);
    const timer = window.setTimeout(save, SAVE_DELAY_MS);
    // A reload right after typing must not lose the last keystrokes.
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [scope, field, value, location.key]);

  return [value, setValue];
}
