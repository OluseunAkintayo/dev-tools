import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text on the right, e.g. an offset. */
  hint?: string;
  /** Extra text that search should match but that is not shown. */
  keywords?: string;
}

interface ComboboxProps {
  id: string;
  /** Accessible name, e.g. "Time zone". */
  label: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  /** Shown when nothing matches the search. */
  emptyText?: string;
  className?: string;
}

/**
 * A text field that filters a list as you type (ARIA 1.2 combobox with a listbox popup).
 * ↑/↓ move, Enter picks, Escape restores the current value. Every typed word must match.
 */
export const Combobox = ({ id, label, value, options, onChange, emptyText = "No matches", className }: ComboboxProps) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listId = `${id}-list`;

  const selected = options.find((option) => option.value === value);

  const filtered = React.useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.value} ${option.hint ?? ""} ${option.keywords ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [options, query]);

  // Keep the highlighted option in view while moving with the keyboard.
  React.useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    setOpen(true);
    setQuery("");
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (option: ComboboxOption | undefined) => {
    if (option) onChange(option.value);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => Math.min(Math.max(current + step, 0), Math.max(filtered.length - 1, 0)));
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(Math.max(filtered.length - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      pick(filtered[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${id}-option-${active}` : undefined}
        value={open ? query : selected?.label ?? value}
        placeholder={open ? selected?.label ?? "Search" : undefined}
        onFocus={(event) => {
          openList();
          event.currentTarget.select();
        }}
        onClick={() => !open && openList()}
        onBlur={close}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        className="h-8 w-full rounded-lg border border-line-strong bg-surface pl-2.5 pr-8 text-[13px] text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20"
      />
      <ChevronsUpDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          // Keep focus in the input when clicking an option, so blur does not close the list first.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-72 w-full min-w-[18rem] animate-fade-in overflow-auto rounded-xl border border-line-strong bg-surface p-1 shadow-lift"
        >
          {filtered.length === 0 && <li className="px-2.5 py-2 text-[13px] text-ink-3">{emptyText}</li>}
          {filtered.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onMouseMove={() => index !== active && setActive(index)}
                onClick={() => pick(option)}
                className={cn("flex cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px]", index === active ? "bg-sunken text-ink" : "text-ink-2")}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0 text-brand", !isSelected && "invisible")} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && <span className="shrink-0 font-mono text-[12px] text-ink-3">{option.hint}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
