import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { REGEX_FLAGS, type RegexFlag } from "@/lib/regex";
import { cn } from "@/lib/utils";

interface FlagTogglesProps {
  flags: string;
  onToggle: (flag: RegexFlag) => void;
}

/** One pressable letter per flag, with its name and meaning in a tooltip. */
export const FlagToggles = ({ flags, onToggle }: FlagTogglesProps) => (
  <div role="group" aria-label="Flags" className="inline-flex gap-0.5 rounded-[9px] bg-sunken p-[3px]">
    {REGEX_FLAGS.map(({ flag, name, hint }) => {
      const on = flags.includes(flag);
      return (
        <Tooltip key={flag}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-pressed={on}
              aria-label={`${flag}, ${name}`}
              onClick={() => onToggle(flag)}
              className={cn(
                "h-[26px] w-[26px] rounded-[7px] font-mono text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                on ? "bg-surface text-ink shadow-[0_1px_2px_hsl(var(--shadow)/0.12),0_0_0_0.5px_hsl(var(--line-strong))]" : "text-ink-3 hover:text-ink-2"
              )}
            >
              {flag}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono">{flag}</span> {name}: {hint}
          </TooltipContent>
        </Tooltip>
      );
    })}
  </div>
);
