import { runRegex, type RegexWorkerRequest, type RegexWorkerResponse } from "@/lib/regex";

// Typed loosely: the WebWorker lib conflicts with DOM types.
const scope = self as unknown as {
  postMessage: (message: RegexWorkerResponse) => void;
  onmessage: ((event: MessageEvent<RegexWorkerRequest>) => void) | null;
};

scope.onmessage = (event) => {
  const { id, source, flags, text, replacement } = event.data;
  try {
    scope.postMessage({ id, result: runRegex(source, flags, text, replacement) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : "The pattern could not run." });
  }
};
