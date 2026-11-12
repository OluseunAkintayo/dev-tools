import type { ToolRunner } from "@/hooks/use-tool-runner";
import { modKey } from "@/lib/platform";
import type { StatusKind } from "@/components/workspace/Workspace";

interface StatusLabels {
  ok: string;
  error: string;
  idle?: string;
  runLabel: string;
}

/** Maps a runner's state onto the status bar's kind and label. */
export function statusFor<T>(runner: ToolRunner<T>, labels: StatusLabels): { kind: StatusKind; label: string } {
  if (runner.stale) return { kind: "stale", label: `Large input. Press ${labels.runLabel} (${modKey}↵) to update` };
  switch (runner.outcome.kind) {
    case "empty":
      return { kind: "idle", label: labels.idle ?? "Waiting for input" };
    case "ok":
      return { kind: "ok", label: labels.ok };
    case "error":
      return runner.visibleError ? { kind: "error", label: labels.error } : { kind: "idle", label: "Editing" };
  }
}

/** Output to show: the latest result, or the last good one while the input is mid-edit. */
export function outputOf<T>(runner: ToolRunner<T>): T | null {
  return runner.outcome.kind === "ok" ? runner.outcome.value : runner.lastValue;
}
