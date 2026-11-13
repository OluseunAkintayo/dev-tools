import React from "react";
import { toToolError, type ToolError } from "@/lib/toolError";

export interface JobResult {
  /** The text to show. */
  output: string;
  /** What did the work, e.g. "AES-256-GCM". */
  label: string;
  /** Size of the encrypted data in bytes. */
  size: number;
}

export type Job = { kind: "idle" } | { kind: "working" } | ({ kind: "done" } & JobResult) | { kind: "error"; error: ToolError };

/**
 * Runs one encrypt or decrypt at a time, on demand. Key derivation is deliberately slow,
 * and each encryption is different, so unlike the other tools this does not re-run as you type.
 * A newer run, or a reset, makes an older one's result be ignored.
 */
export const useCryptoJob = () => {
  const [job, setJob] = React.useState<Job>({ kind: "idle" });
  const latest = React.useRef(0);

  const run = React.useCallback(async (work: () => Promise<JobResult>) => {
    const id = ++latest.current;
    setJob({ kind: "working" });
    try {
      const result = await work();
      if (id === latest.current) setJob({ kind: "done", ...result });
    } catch (err) {
      if (id === latest.current) setJob({ kind: "error", error: toToolError(err) });
    }
  }, []);

  const reset = React.useCallback(() => {
    latest.current++;
    setJob({ kind: "idle" });
  }, []);

  return { job, run, reset };
};
