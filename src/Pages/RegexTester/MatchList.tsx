import React from "react";
import type { RegexMatch } from "@/lib/regex";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 200;

interface MatchListProps {
  matches: RegexMatch[];
  active: number | null;
  onSelect: (index: number) => void;
}

/** Each match with its position and capture groups. Selecting one outlines it in the text. */
export const MatchList = ({ matches, active, onSelect }: MatchListProps) => {
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  React.useEffect(() => setLimit(PAGE_SIZE), [matches]);

  return (
    <div>
      <ol>
        {matches.slice(0, limit).map((match, index) => (
          <li key={`${match.index}-${index}`} className="border-b border-line last:border-b-0">
            <button
              type="button"
              aria-pressed={active === index}
              onClick={() => onSelect(index)}
              className={cn("w-full px-4 py-2.5 text-left transition-colors hover:bg-sunken/50 focus-visible:bg-sunken/60 focus-visible:outline-none", active === index && "bg-brand/[0.06]")}
            >
              <span className="flex items-baseline gap-3">
                <span className="w-8 shrink-0 font-mono text-[12px] text-ink-4">{index + 1}</span>
                <code className={cn("min-w-0 flex-1 break-all rounded px-1 font-mono text-[13px] text-ink", index % 2 === 0 ? "bg-brand/[0.12]" : "bg-code-blue/[0.12]")}>
                  {match.text === "" ? <span className="italic text-ink-3">empty match</span> : match.text}
                </code>
                <span className="shrink-0 font-mono text-[12px] text-ink-3">
                  {match.index}–{match.end}
                </span>
              </span>
              {match.groups.length > 0 && (
                <dl className="ml-11 mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px]">
                  {match.groups.map((group) => (
                    <React.Fragment key={group.label}>
                      <dt className="font-mono text-ink-3">{/^\d+$/.test(group.label) ? `$${group.label}` : `<${group.label}>`}</dt>
                      <dd className="break-all font-mono text-ink-2">{group.value === undefined ? <span className="italic text-ink-4">not matched</span> : JSON.stringify(group.value)}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              )}
            </button>
          </li>
        ))}
      </ol>
      {matches.length > limit && (
        <div className="border-t border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE * 5)}
            className="rounded-[4px] text-[13px] text-ink-3 underline decoration-line-strong underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Show {Math.min(PAGE_SIZE * 5, matches.length - limit).toLocaleString()} more
          </button>
        </div>
      )}
    </div>
  );
};
