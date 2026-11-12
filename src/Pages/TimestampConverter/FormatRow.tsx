import React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

interface FormatRowProps {
  label: string;
  value: string;
  dimmed?: boolean;
}

/** One output format: label, monospace value and an icon copy button with inline confirmation. */
export const FormatRow = ({ label, value, dimmed = false }: FormatRowProps) => {
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
    <div className={cn("group flex items-center gap-3 border-b border-line px-4 py-2.5 transition-opacity duration-200 last:border-b-0", dimmed && "opacity-45")}>
      <div className="min-w-0 flex-1">
        <dt className="text-[12px] text-ink-3">{label}</dt>
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
