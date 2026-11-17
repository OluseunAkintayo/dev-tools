import React from "react";
import { toToolError, type ToolError } from "@/lib/toolError";

/** Larger inputs run only on demand to keep typing responsive. */
export const LIVE_LIMIT = 200_000;
const ERROR_DELAY_MS = 600;

export type Outcome<T> = { kind: "empty" } | { kind: "ok"; value: T } | { kind: "error"; error: ToolError };

export interface ToolRunner<T> {
  outcome: Outcome<T>;
  lastValue: T | null;
  visibleError: ToolError | null;
  stale: boolean;
  live: boolean;
  run: () => void;
}

/** Computes as the user types (deferred); errors show once typing pauses. */
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
