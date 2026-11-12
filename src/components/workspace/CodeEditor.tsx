import React from "react";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  /** 1-based line to mark as the error location. */
  errorLine?: number;
  /** Soft-wrap long lines (hides line numbers, which would no longer align). */
  wrap?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

// Keep in sync with the classes below: 24px rows, 14px top padding.
const LINE_HEIGHT = 24;
const PADDING_TOP = 14;

const countLines = (text: string) => {
  let count = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++;
  return count;
};

export const CodeEditor = React.forwardRef<HTMLTextAreaElement, CodeEditorProps>(
  ({ id, value, onChange, placeholder, label, errorLine, wrap = false, autoFocus, disabled }, ref) => {
    const gutterRef = React.useRef<HTMLPreElement>(null);
    const markerRef = React.useRef<HTMLDivElement>(null);

    const lines = React.useMemo(() => countLines(value), [value]);
    const numbers = React.useMemo(() => Array.from({ length: lines }, (_, i) => i + 1).join("\n"), [lines]);

    // Scroll sync writes straight to the DOM; no React state on every scroll frame.
    const onScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
      const { scrollTop } = event.currentTarget;
      if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
      if (markerRef.current) markerRef.current.style.transform = `translateY(${-scrollTop}px)`;
    };

    return (
      <div className={cn("relative grid h-full min-h-0", wrap ? "grid-cols-1" : "grid-cols-[auto_1fr]")}>
        {!wrap && (
          <pre
            ref={gutterRef}
            aria-hidden="true"
            className="select-none overflow-hidden border-r border-line bg-gutter py-3.5 pl-3 pr-3 text-right font-mono text-[12px] leading-6 text-ink-4"
            style={{ minWidth: "2.75rem" }}
          >
            {numbers}
          </pre>
        )}
        <div className="relative min-h-0 min-w-0">
          {errorLine !== undefined && !wrap && (
            <div ref={markerRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0">
              <div
                className="absolute inset-x-0 bg-destructive/10 shadow-[inset_2px_0_0_hsl(var(--danger))]"
                style={{ top: PADDING_TOP + (errorLine - 1) * LINE_HEIGHT, height: LINE_HEIGHT }}
              />
            </div>
          )}
          <textarea
            ref={ref}
            id={id}
            aria-label={label}
            aria-invalid={errorLine !== undefined || undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={onScroll}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap={wrap ? "soft" : "off"}
            className={cn(
              "relative block h-full w-full resize-none bg-transparent px-4 py-3.5 font-mono text-[13px] leading-6 text-ink-2 caret-brand outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-ink-3 disabled:opacity-60",
              wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
            )}
          />
        </div>
      </div>
    );
  }
);
CodeEditor.displayName = "CodeEditor";
