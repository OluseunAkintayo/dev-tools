import React from "react";
import { useNavigate } from "react-router-dom";
import { Check, CornerDownLeft, Search, X } from "lucide-react";
import { detectFormat, looksLikeSearch, type Detection } from "@/lib/detect";
import type { Handoff } from "@/lib/handoff";
import { modKey } from "@/lib/platform";
import { getTool, searchTools, type Tool, type ToolId } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface Option {
  tool: Tool;
  hint?: string;
  handoff?: Handoff;
}

const POPULAR: ToolId[] = ["json-formatter", "csv-to-json", "json-to-code", "base64"];
const MAX_ROWS = 7;
const LINE_HEIGHT = 24;

type Mode = { kind: "empty" } | { kind: "search"; query: string } | { kind: "data"; detection: Detection } | { kind: "text" };

const resolveMode = (value: string): Mode => {
  if (!value.trim()) return { kind: "empty" };
  const detection = detectFormat(value);
  // A JWT, URL, UUID or timestamp is never a search query, however short.
  if (detection?.strong) return { kind: "data", detection };
  if (looksLikeSearch(value) && searchTools(value).length > 0) return { kind: "search", query: value };
  if (detection) return { kind: "data", detection };
  return looksLikeSearch(value) ? { kind: "search", query: value } : { kind: "text" };
};

/**
 * One box for both jobs: type to search tools, or paste data to get the
 * right tool suggested. Enter opens the highlighted option with the data.
 */
export const SmartPaste = () => {
  const navigate = useNavigate();
  const [value, setValue] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const deferred = React.useDeferredValue(value);

  const mode = React.useMemo(() => resolveMode(deferred), [deferred]);

  const { heading, options } = React.useMemo((): { heading: string; options: Option[] } => {
    switch (mode.kind) {
      case "empty":
        return { heading: "Popular tools", options: POPULAR.map((id) => ({ tool: getTool(id) })) };
      case "search":
        return {
          heading: "Tools",
          options: searchTools(mode.query)
            .slice(0, 5)
            .map((tool) => ({ tool, hint: tool.status === "soon" ? "In progress" : undefined })),
        };
      case "data":
        return {
          heading: "Suggested for this data",
          options: mode.detection.suggestions.map((suggestion) => ({
            tool: getTool(suggestion.id),
            hint: suggestion.hint,
            handoff: { input: deferred, options: suggestion.options },
          })),
        };
      case "text":
        return {
          heading: "Suggested for this text",
          options: [{ tool: getTool("base64"), hint: "encode to Base64", handoff: { input: deferred, options: { mode: "encode" } } }],
        };
    }
  }, [mode, deferred]);

  React.useEffect(() => setActive(0), [options]);

  // Grow with content up to MAX_ROWS, then scroll.
  React.useLayoutEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_ROWS * LINE_HEIGHT)}px`;
  }, [value]);

  const open = (option: Option | undefined) => {
    if (option) navigate(option.tool.link, { state: option.handoff });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!options.length) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      open(options[active]);
    } else if (event.key === "Escape" && value) {
      event.preventDefault();
      setValue("");
    }
  };

  const isData = mode.kind === "data" || mode.kind === "text" || value.includes("\n");

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
      <div className="flex items-start gap-3 border-b border-line px-4 py-[13px]">
        <Search className="mt-1 h-4 w-4 shrink-0 text-ink-3" />
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search tools or paste anything"
          aria-label="Search tools or paste data"
          aria-controls="smart-paste-options"
          aria-activedescendant={options[active] ? `smart-option-${active}` : undefined}
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          spellCheck={false}
          className={cn(
            "min-w-0 flex-1 resize-none bg-transparent leading-6 text-ink outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-ink-3",
            isData ? "whitespace-pre font-mono text-[13px] text-ink-2" : "text-[15px]"
          )}
        />
        {mode.kind === "data" ? (
          <span className="mt-px inline-flex h-6 shrink-0 animate-fade-in items-center gap-1.5 rounded-full bg-brand/10 px-2.5 text-[12px] font-medium text-brand">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            {mode.detection.label}
          </span>
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="press mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sunken text-ink-3 hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="kbd mt-0.5 hidden sm:inline-flex">{modKey}V</kbd>
        )}
      </div>

      <div className="px-2 pb-2 pt-1">
        <p className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-ink-3">{heading}</p>
        <div id="smart-paste-options" role="listbox" aria-label={heading}>
          {options.length === 0 && <p className="px-2.5 py-3 text-sm text-ink-3">No tools match. Paste data to get a suggestion.</p>}
          {options.map((option, index) => {
            const Icon = option.tool.icon;
            const selected = index === active;
            return (
              <div
                key={`${option.tool.id}-${index}`}
                id={`smart-option-${index}`}
                role="option"
                aria-selected={selected}
                onMouseMove={() => !selected && setActive(index)}
                onClick={() => open(option)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-sm text-ink", selected && "bg-sunken")}
              >
                <span
                  className={cn(
                    "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg transition-colors duration-150",
                    selected ? "bg-primary text-primary-foreground" : "bg-sunken text-ink-2"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {option.tool.title}
                  {option.hint && <span className="ml-2 text-[13px] text-ink-3">{option.hint}</span>}
                </span>
                {selected && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
