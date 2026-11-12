import React from "react";
import { digestAll, MAX_FILE_BYTES, type Digests, type HashWorkerRequest, type HashWorkerResponse } from "@/lib/hash";
import { formatBytes } from "@/lib/text";

export type HashState =
  | { kind: "idle" }
  | { kind: "working"; loaded?: number; total?: number }
  | { kind: "done"; digests: Digests; bytes: number }
  | { kind: "error"; message: string };

/**
 * Hashes a file (in a Web Worker, with progress) or text (UTF-8, on the main thread).
 * A file takes priority over text. `key` switches every algorithm to HMAC.
 */
export const useHashes = (text: string, file: File | null, key: Uint8Array | undefined): HashState => {
  const [state, setState] = React.useState<HashState>({ kind: "idle" });
  const deferredText = React.useDeferredValue(text);

  React.useEffect(() => {
    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        setState({ kind: "error", message: `This file is ${formatBytes(file.size)}. Files up to ${formatBytes(MAX_FILE_BYTES)} can be hashed in the browser.` });
        return;
      }
      setState({ kind: "working", loaded: 0, total: file.size });
      const worker = new Worker(new URL("../lib/hash.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<HashWorkerResponse>) => {
        const message = event.data;
        if (message.type === "progress") setState({ kind: "working", loaded: message.loaded, total: file.size });
        else if (message.type === "done") setState({ kind: "done", digests: message.digests, bytes: file.size });
        else setState({ kind: "error", message: message.message });
        if (message.type !== "progress") worker.terminate();
      };
      worker.onerror = () => {
        setState({ kind: "error", message: "Hashing failed. The file may be too large for this browser's memory." });
        worker.terminate();
      };
      worker.postMessage({ file, key } satisfies HashWorkerRequest);
      return () => worker.terminate();
    }

    if (!deferredText) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    const bytes = new TextEncoder().encode(deferredText);
    setState((current) => (current.kind === "done" ? current : { kind: "working" }));
    digestAll(bytes, key).then(
      (digests) => !cancelled && setState({ kind: "done", digests, bytes: bytes.length }),
      (err) => !cancelled && setState({ kind: "error", message: err instanceof Error ? err.message : "Hashing failed." })
    );
    return () => {
      cancelled = true;
    };
  }, [file, deferredText, key]);

  return state;
};
