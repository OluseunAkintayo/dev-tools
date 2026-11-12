import React from "react";
import { compileRegex, REGEX_TIMEOUT_MS, type RegexResult, type RegexWorkerRequest, type RegexWorkerResponse } from "@/lib/regex";

export type RegexState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: RegexResult }
  | { kind: "invalid"; message: string }
  | { kind: "timeout" }
  | { kind: "error"; message: string };

const createWorker = () => new Worker(new URL("../lib/regex.worker.ts", import.meta.url), { type: "module" });

/**
 * Runs the pattern in a Web Worker as the inputs change. If it does not finish within
 * REGEX_TIMEOUT_MS (catastrophic backtracking), the worker is terminated and replaced,
 * so the page never freezes.
 */
export const useRegex = (source: string, flags: string, text: string, replacement: string | undefined): RegexState => {
  const [state, setState] = React.useState<RegexState>({ kind: "idle" });
  const worker = React.useRef<Worker | null>(null);
  const runId = React.useRef(0);
  const deferredText = React.useDeferredValue(text);

  React.useEffect(() => () => worker.current?.terminate(), []);

  React.useEffect(() => {
    if (!source) {
      setState({ kind: "idle" });
      return;
    }
    // Syntax errors are found without running anything.
    const compiled = compileRegex(source, flags);
    if ("error" in compiled) {
      setState({ kind: "invalid", message: compiled.error });
      return;
    }

    const id = ++runId.current;
    worker.current ??= createWorker();
    const current = worker.current;
    setState((previous) => (previous.kind === "done" ? previous : { kind: "running" }));

    const timer = window.setTimeout(() => {
      if (runId.current !== id) return;
      current.terminate();
      worker.current = null;
      setState({ kind: "timeout" });
    }, REGEX_TIMEOUT_MS);

    current.onmessage = (event: MessageEvent<RegexWorkerResponse>) => {
      if (event.data.id !== runId.current) return;
      window.clearTimeout(timer);
      setState("result" in event.data ? { kind: "done", result: event.data.result } : { kind: "error", message: event.data.error });
    };
    current.postMessage({ id, source, flags, text: deferredText, replacement } satisfies RegexWorkerRequest);

    return () => window.clearTimeout(timer);
  }, [source, flags, deferredText, replacement]);

  return state;
};
