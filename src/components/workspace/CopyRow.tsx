import React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

interface CopyRowProps {
  label: string;
  value: string;
  dimmed?: boolean;
  /** Short text after the label, e.g. a warning or a "Matches" badge. */
  note?: React.ReactNode;
  /** Tint the row, e.g. to mark the value that matches a pasted checksum. */
  highlighted?: boolean;
}

/** A label above a monospace value, with an icon copy button that confirms inline. */
export const CopyRow = ({ label, value, dimmed = false, note, highlighted = false }: CopyRowProps) => {
  const copy = useCopy();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number>();

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    if (!(await copy(value))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 border-b border-line px-4 py-2.5 transition-[opacity,background-color] duration-200 last:border-b-0",
        dimmed && "opacity-45",
        highlighted && "bg-brand/[0.07] shadow-[inset_2px_0_0_hsl(var(--brand))]"
      )}
    >
      <div className="min-w-0 flex-1">
        <dt className="flex items-center gap-2 text-[12px] text-ink-3">
          {label}
          {note}
        </dt>
        <dd className="mt-0.5 break-all font-mono text-[13px] text-ink">{value}</dd>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={copied ? `Copied ${label}` : `Copy ${label}`} onClick={onCopy}>
        <span className="relative grid h-4 w-4 place-items-center">
          <Copy className={cn("absolute transition-[opacity,filter,transform] duration-200", copied ? "scale-75 opacity-0 blur-[2px]" : "opacity-100")} />
          <Check className={cn("absolute text-brand transition-[opacity,filter,transform] duration-200", copied ? "opacity-100" : "scale-75 opacity-0 blur-[2px]")} />
        </span>
      </Button>
    </div>
  );
};
