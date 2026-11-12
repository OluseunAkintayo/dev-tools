import React from "react";
import { highlight, type CodeLanguage } from "@/lib/highlight";
import { cn } from "@/lib/utils";

interface CodeViewProps {
  code: string;
  language: CodeLanguage;
  label: string;
  /** Soft-wrap long lines and hide line numbers. */
  wrap?: boolean;
  /** Fade the output while it no longer matches the input (e.g. during an error). */
  dimmed?: boolean;
}

/** Read-only, syntax-highlighted output with sticky line numbers. */
export const CodeView = React.memo(({ code, language, label, wrap = false, dimmed = false }: CodeViewProps) => {
  const lines = React.useMemo(() => code.split("\n").length, [code]);
  const numbers = React.useMemo(() => Array.from({ length: lines }, (_, i) => i + 1).join("\n"), [lines]);
  const content = React.useMemo(() => highlight(code, language), [code, language]);

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "h-full overflow-auto outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30",
        dimmed && "opacity-45"
      )}
    >
      <div className={cn("grid min-h-full", wrap ? "grid-cols-1" : "w-max min-w-full grid-cols-[auto_1fr]")}>
        {!wrap && (
          <pre
            aria-hidden="true"
            className="sticky left-0 select-none border-r border-line bg-gutter py-3.5 pl-3 pr-3 text-right font-mono text-[12px] leading-6 text-ink-4"
            style={{ minWidth: "2.75rem" }}
          >
            {numbers}
          </pre>
        )}
        <pre
          className={cn(
            "px-4 py-3.5 font-mono text-[13px] leading-6 text-ink-2",
            wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
          )}
        >
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
});
CodeView.displayName = "CodeView";
