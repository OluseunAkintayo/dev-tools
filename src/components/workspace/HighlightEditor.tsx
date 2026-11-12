import React from "react";
import { cn } from "@/lib/utils";

export interface HighlightRange {
  start: number;
  end: number;
  /** Alternate tints so neighbouring matches stay distinguishable. */
  tone: 0 | 1;
  /** Emphasise one range, e.g. the match selected in a list. */
  active?: boolean;
}

interface HighlightEditorProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Sorted, non-overlapping ranges to tint behind the text. */
  ranges: HighlightRange[];
  placeholder?: string;
  autoFocus?: boolean;
}

// Shared by the backdrop and the textarea so their text lays out identically.
// scrollbar-gutter keeps the wrap width equal whether or not the textarea shows a scrollbar.
const TEXT = "px-4 py-3.5 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [scrollbar-gutter:stable]";

/**
 * A soft-wrapping textarea with highlighted ranges. The textarea's text is transparent and
 * a backdrop renders the same text with <mark>s underneath, scrolled in sync.
 */
export const HighlightEditor = ({ id, label, value, onChange, ranges, placeholder, autoFocus }: HighlightEditorProps) => {
  const backdrop = React.useRef<HTMLDivElement>(null);

  const content = React.useMemo(() => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    ranges.forEach((range, index) => {
      if (range.end <= range.start || range.start < last) return;
      if (range.start > last) parts.push(value.slice(last, range.start));
      parts.push(
        <mark
          key={index}
          className={cn(
            "rounded-[3px] text-transparent",
            range.tone === 0 ? "bg-brand/20" : "bg-code-blue/20",
            range.active && "outline outline-2 outline-offset-0 outline-brand/70"
          )}
        >
          {value.slice(range.start, range.end)}
        </mark>
      );
      last = range.end;
    });
    parts.push(value.slice(last));
    // A trailing newline needs a character after it, or the backdrop is one line short.
    parts.push("\u200b");
    return parts;
  }, [value, ranges]);

  return (
    <div className="relative h-full min-h-0">
      <div ref={backdrop} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden text-transparent", TEXT)}>
        {content}
      </div>
      <textarea
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (backdrop.current) backdrop.current.scrollTop = event.currentTarget.scrollTop;
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className={cn(
          "relative block h-full w-full resize-none bg-transparent text-ink-2 caret-brand outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-ink-3",
          TEXT
        )}
      />
    </div>
  );
};
