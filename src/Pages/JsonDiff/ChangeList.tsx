import React from "react";
import { previewValue, type Change, type ChangeKind } from "@/lib/jsonDiff";
import { cn } from "@/lib/utils";

/** Rows rendered at once; the rest are reachable through "Show more". */
const PAGE_SIZE = 200;

const BADGE: Record<ChangeKind, { label: string; className: string; sign: string }> = {
  added: { label: "Added", sign: "+", className: "border-brand/25 bg-brand/10 text-brand" },
  removed: { label: "Removed", sign: "−", className: "border-destructive/25 bg-destructive/10 text-destructive" },
  changed: { label: "Changed", sign: "~", className: "border-warn/25 bg-warn/10 text-warn" },
};

/** Differences in document order: kind, JSONPath, and the old and new values. */
export const ChangeList = ({ changes }: { changes: Change[] }) => {
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  React.useEffect(() => setLimit(PAGE_SIZE), [changes]);

  return (
    <div>
      <ul>
        {changes.slice(0, limit).map((change, index) => {
          const badge = BADGE[change.kind];
          return (
            <li key={`${change.kind}${change.path}${index}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 border-b border-line px-4 py-2.5 last:border-b-0 sm:grid-cols-[5.5rem_minmax(10rem,22rem)_minmax(0,1fr)]">
              <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border px-2 py-px text-[12px] font-medium", badge.className)}>
                <span aria-hidden="true" className="font-mono">
                  {badge.sign}
                </span>
                {badge.label}
              </span>
              <code className="break-all font-mono text-[13px] text-ink" title={change.path}>
                {change.path}
              </code>
              <span className="col-span-2 min-w-0 break-all font-mono text-[12.5px] text-ink-2 sm:col-span-1">
                {change.kind === "changed" ? (
                  <>
                    <del className="rounded bg-destructive/[0.08] px-1 text-destructive line-through decoration-destructive/40">{previewValue(change.before)}</del>
                    <span aria-label="becomes" className="px-1.5 text-ink-4">
                      →
                    </span>
                    <ins className="rounded bg-brand/[0.08] px-1 text-brand no-underline">{previewValue(change.after)}</ins>
                  </>
                ) : change.kind === "added" ? (
                  <ins className="rounded bg-brand/[0.08] px-1 text-brand no-underline">{previewValue(change.after)}</ins>
                ) : (
                  <del className="rounded bg-destructive/[0.08] px-1 text-destructive line-through decoration-destructive/40">{previewValue(change.before)}</del>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {changes.length > limit && (
        <div className="border-t border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE * 5)}
            className="rounded-[4px] text-[13px] text-ink-3 underline decoration-line-strong underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Show {Math.min(PAGE_SIZE * 5, changes.length - limit).toLocaleString()} more of {(changes.length - limit).toLocaleString()}
          </button>
        </div>
      )}
    </div>
  );
};
