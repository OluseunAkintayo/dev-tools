import React from "react";
import { useLocation } from "react-router-dom";
import { useHandoff } from "@/lib/handoff";
import { consumeShare, readSaved, saveField, sharedField } from "@/lib/toolState";

const SAVE_DELAY_MS = 250;

const sameKind = (value: unknown, reference: unknown) =>
  Array.isArray(reference) ? Array.isArray(value) : typeof value === typeof reference && (value === null) === (reference === null);

interface Options<T> {
  /** A value handed over inside the page (e.g. JWT Verify); wins over everything else. */
  override?: T;
}

/**
 * useState that survives a reload and can be shared. On mount the value is the first of: options.override, a share link for this scope,
 * `initial` when a handoff is pending (so Smart Paste starts fresh), the value saved in this tab, `initial`. Saved values of the wrong type are ignored.
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

  // Once every field has read the shared values, later mounts use saved state.
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
