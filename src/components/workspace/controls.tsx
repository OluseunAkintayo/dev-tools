import React from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

/** Radio group styled as a segmented control. Arrow keys move the selection. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex gap-0.5 rounded-[9px] bg-sunken p-[3px]", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "h-[26px] whitespace-nowrap rounded-[7px] px-2.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              selected ? "bg-surface text-ink shadow-[0_1px_2px_hsl(var(--shadow)/0.12),0_0_0_0.5px_hsl(var(--line-strong))]" : "text-ink-3 hover:text-ink-2"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Switch = ({ label, checked, onChange }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="group inline-flex items-center gap-2 rounded-md text-[13px] text-ink-2 focus-visible:outline-none"
  >
    <span
      className={cn(
        "relative inline-block h-[18px] w-[30px] rounded-full transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-brand/40",
        checked ? "bg-brand" : "bg-line-strong"
      )}
    >
      <span
        className={cn(
          "absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out",
          checked && "translate-x-[12px]"
        )}
      />
    </span>
    {label}
  </button>
);

export const Kbd = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <kbd className={cn("kbd", className)}>{children}</kbd>
);
