import React from "react";
import { toToolError, type ToolError } from "@/lib/toolError";

/** Inputs larger than this run only on demand (button or ⌘↵) to keep typing responsive. */
export const LIVE_LIMIT = 200_000;
/** How long typing must pause before an error is shown. */
const ERROR_DELAY_MS = 600;

export type Outcome<T> = { kind: "empty" } | { kind: "ok"; value: T } | { kind: "error"; error: ToolError };

export interface ToolRunner<T> {
  outcome: Outcome<T>;
  /** The most recent successful value, kept on screen while the input is mid-edit. */
  lastValue: T | null;
  /** Error to display now (null while the user is still typing). */
  visibleError: ToolError | null;
  /** True when the input is too large for live mode and has changed since the last run. */
  stale: boolean;
  live: boolean;
  run: () => void;
}

/**
 * Runs `compute` on the input as the user types (deferred, so typing never blocks),
 * and delays error messages until typing pauses. `deps` re-run the computation
 * when options such as indentation change.
 */
export function useToolRunner<T>(input: string, compute: (input: string) => T, deps: React.DependencyList): ToolRunner<T> {
  const live = input.length <= LIVE_LIMIT;
  const deferredInput = React.useDeferredValue(input);
  const [manualInput, setManualInput] = React.useState<string | null>(null);
  const [errorRevealed, setErrorRevealed] = React.useState(false);

  const source = live ? deferredInput : manualInput ?? "";

  const computeRef = React.useRef(compute);
  computeRef.current = compute;

  const outcome = React.useMemo<Outcome<T>>(() => {
    if (!source.trim()) return { kind: "empty" };
    try {
      return { kind: "ok", value: computeRef.current(source) };
    } catch (err) {
      return { kind: "error", error: toToolError(err) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, ...deps]);

  const lastValueRef = React.useRef<T | null>(null);
  if (outcome.kind === "ok") lastValueRef.current = outcome.value;
  if (outcome.kind === "empty") lastValueRef.current = null;

  React.useEffect(() => {
    setErrorRevealed(false);
    const timer = window.setTimeout(() => setErrorRevealed(true), ERROR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const run = React.useCallback(() => {
    setManualInput(input);
    setErrorRevealed(true);
  }, [input]);

  return {
    outcome,
    lastValue: lastValueRef.current,
    visibleError: outcome.kind === "error" && errorRevealed ? outcome.error : null,
    stale: !live && manualInput !== input,
    live,
    run,
  };
}
