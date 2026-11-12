import { runRegex, type RegexWorkerRequest, type RegexWorkerResponse } from "@/lib/regex";

// Typed loosely so this file does not need the WebWorker lib, which conflicts with DOM types.
const scope = self as unknown as {
  postMessage: (message: RegexWorkerResponse) => void;
  onmessage: ((event: MessageEvent<RegexWorkerRequest>) => void) | null;
};

/** Runs one pattern. A runaway pattern blocks only this worker, which the page terminates. */
scope.onmessage = (event) => {
  const { id, source, flags, text, replacement } = event.data;
  try {
    scope.postMessage({ id, result: runRegex(source, flags, text, replacement) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : "The pattern could not run." });
  }
};
