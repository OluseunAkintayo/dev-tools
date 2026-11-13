import React from "react";
import { toToolError, type ToolError } from "@/lib/toolError";

export interface JobResult {
  output: string;
  label: string;
  size: number;
}

export type Job = { kind: "idle" } | { kind: "working" } | ({ kind: "done" } & JobResult) | { kind: "error"; error: ToolError };

/** Runs one job on demand (key derivation is slow, output differs each time). A newer run or reset discards older results. */
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
