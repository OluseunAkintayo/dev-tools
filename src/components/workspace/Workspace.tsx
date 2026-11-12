import React from "react";
import { Check, CircleAlert, FileUp, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Toolbar ---------- */

export const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-2xl border border-b-0 border-line bg-surface p-2.5">{children}</div>
);

export const ToolbarLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="pl-1 text-[13px] text-ink-3">
    {children}
  </label>
);

export const ToolbarGroup = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-2">{children}</div>;

export const ToolbarSpacer = () => <div className="hidden flex-1 sm:block" />;

/* ---------- Panes ---------- */

interface PanesProps {
  children: React.ReactNode;
  roundedTop?: boolean;
  /** Overrides, e.g. a shorter desktop height when something sits below the panes. */
  className?: string;
}

export const Panes = ({ children, roundedTop = false, className }: PanesProps) => (
  <div
    className={cn(
      "grid overflow-hidden border border-line bg-surface md:h-[min(64vh,640px)] md:grid-cols-2",
      "[&>section]:h-[360px] md:[&>section]:h-auto [&>section+section]:border-t [&>section+section]:border-line md:[&>section+section]:border-l md:[&>section+section]:border-t-0",
      roundedTop && "rounded-t-2xl",
      className
    )}
  >
    {children}
  </div>
);

interface PaneProps {
  title: string;
  titleId?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Accept a dropped file (e.g. a .json export). */
  onFileDrop?: (file: File) => void;
}

export const Pane = ({ title, titleId, meta, actions, children, onFileDrop }: PaneProps) => {
  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);

  const dropHandlers = onFileDrop
    ? {
        onDragEnter: (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        },
        onDragOver: (event: React.DragEvent) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        },
        onDragLeave: () => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onFileDrop(file);
        },
      }
    : {};

  return (
    <section aria-labelledby={titleId} className="flex min-h-0 min-w-0 flex-col" {...dropHandlers}>
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line pl-4 pr-2">
        <h2 id={titleId} className="text-[13px] font-medium text-ink">
          {title}
        </h2>
        {meta && <span className="ml-1 truncate text-[12px] text-ink-3">{meta}</span>}
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </header>
      <div className="relative min-h-0 flex-1">
        {children}
        {dragging && (
          <div className="pointer-events-none absolute inset-2 grid animate-fade-in place-items-center rounded-xl border-[1.5px] border-dashed border-brand/60 bg-brand/[0.06] text-sm font-medium text-brand">
            <span className="flex items-center gap-2">
              <FileUp className="h-4 w-4" /> Drop to open
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

/* ---------- Status bar ---------- */

export type StatusKind = "ok" | "error" | "idle" | "stale" | "working";

interface StatusBarProps {
  kind: StatusKind;
  label: string;
  items?: (string | null | undefined | false)[];
}

export const StatusBar = ({ kind, label, items = [] }: StatusBarProps) => (
  <div
    role="status"
    aria-live="polite"
    className="flex h-[38px] items-center gap-4 overflow-hidden rounded-b-2xl border border-t-0 border-line bg-gutter px-4 font-mono text-[12px] text-ink-3"
  >
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 font-medium",
        kind === "ok" && "text-brand",
        kind === "error" && "text-destructive",
        kind === "stale" && "text-warn"
      )}
    >
      {kind === "ok" && <Check className="h-3.5 w-3.5" />}
      {kind === "error" && <CircleAlert className="h-3.5 w-3.5" />}
      {kind === "working" && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </span>
    {items.filter(Boolean).map((item) => (
      <span key={item as string} className="hidden shrink-0 sm:inline">
        {item}
      </span>
    ))}
    <span className="ml-auto hidden shrink-0 md:inline">Processed locally</span>
  </div>
);
