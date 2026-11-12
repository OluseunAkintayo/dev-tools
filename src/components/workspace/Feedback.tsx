import React from "react";
import { CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ToolError } from "@/lib/toolError";

interface ErrorNoticeProps {
  error: ToolError;
  onFix?: () => void;
}

/** Inline, located error with an optional one-click fix. Sits at the bottom of the input pane. */
export const ErrorNotice = ({ error, onFix }: ErrorNoticeProps) => (
  <div
    role="alert"
    className="absolute inset-x-3 bottom-3 flex animate-rise items-start gap-2.5 rounded-xl border border-destructive/20 bg-surface/95 px-3.5 py-3 text-[13px] leading-5 text-destructive shadow-lift backdrop-blur-sm"
  >
    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
    <p className="min-w-0 flex-1">{error.message}</p>
    {error.fix && onFix && (
      <button
        type="button"
        onClick={onFix}
        className="press shrink-0 rounded-md px-1.5 font-medium text-ink-2 underline decoration-line-strong underline-offset-[3px] hover:text-ink hover:decoration-ink-3"
      >
        {error.fix.label}
      </button>
    )}
  </div>
);

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon: Icon, title, children, action }: EmptyStateProps) => (
  <div className="absolute inset-4 grid place-items-center rounded-xl border-[1.5px] border-dashed border-line-strong p-6 text-center">
    <div className="max-w-[30ch]">
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-sunken text-ink-2">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="mt-1 text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  </div>
);
