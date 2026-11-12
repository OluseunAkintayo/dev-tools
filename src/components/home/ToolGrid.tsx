import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { categories, countByCategory, getCategory, tools, type CategoryId, type Tool } from "@/lib/tools";
import { categoryStyles } from "@/lib/categoryStyles";
import { cn } from "@/lib/utils";

type Filter = "all" | CategoryId;

/* Small, real input/output samples shown on the larger tiles. */

const FormatterSample = () => (
  <div className="mt-6 grid grid-cols-1 items-center gap-3 font-mono text-[12.5px] leading-[1.65] sm:grid-cols-[1fr_auto_1fr]">
    <pre className="overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.06] p-3.5 text-white/60">
      <span className="text-white/45">{"{"}</span>
      <span className="text-white">"id"</span>
      <span className="text-white/45">:</span>
      <span className="text-[#F2B880]">7</span>
      <span className="text-white/45">,</span>
      <span className="text-white">"tags"</span>
      <span className="text-white/45">:[</span>
      <span className="text-[#7FD4AE]">"api"</span>
      <span className="text-white/45">,</span>
      <span className="text-[#7FD4AE]">"v2"</span>
      <span className="text-white/45">],</span>
      <span className="text-white">"live"</span>
      <span className="text-white/45">:</span>
      <span className="text-[#F2B880]">true</span>
      <span className="text-white/45">{"}"}</span>
    </pre>
    <ArrowRight className="mx-auto hidden h-4 w-4 text-white/40 sm:block" />
    <pre className="overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.06] p-3.5 text-white/60">
      {"{\n"}
      {"  "}
      <span className="text-white">"id"</span>: <span className="text-[#F2B880]">7</span>,{"\n"}
      {"  "}
      <span className="text-white">"tags"</span>: [<span className="text-[#7FD4AE]">"api"</span>, <span className="text-[#7FD4AE]">"v2"</span>],{"\n"}
      {"  "}
      <span className="text-white">"live"</span>: <span className="text-[#F2B880]">true</span>
      {"\n}"}
    </pre>
  </div>
);

const InterfaceSample = () => (
  <pre className="mt-4 overflow-hidden whitespace-pre-wrap rounded-[10px] bg-sunken px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] text-ink-2">
    <span className="font-medium text-brand">interface</span> Order {"{ "}id: <span className="text-warn">string</span>; total: <span className="text-warn">number</span>; paid:{" "}
    <span className="text-warn">boolean</span>
    {" }"}
  </pre>
);

const Base64Sample = () => (
  <pre className="mt-4 overflow-hidden rounded-[10px] bg-sunken px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] text-ink-2">
    hello, world <span className="px-1 text-ink-3">⇄</span> aGVsbG8sIHdvcmxk
  </pre>
);

const samples: Partial<Record<Tool["id"], React.FC>> = {
  "json-formatter": FormatterSample,
  "json-to-interface": InterfaceSample,
  base64: Base64Sample,
};

const tileBase =
  "group relative flex flex-col rounded-2xl border p-[22px] transition-[transform,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-[0.99]";

const GoArrow = ({ className }: { className?: string }) => (
  <ArrowRight
    aria-hidden="true"
    className={cn(
      "absolute right-[22px] h-4 w-4 -translate-x-1 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100",
      className
    )}
  />
);

const ToolTile = ({ tool, compact }: { tool: Tool; compact: boolean }) => {
  const Icon = tool.icon;
  const size = compact && tool.size !== "banner" ? "normal" : tool.size;
  const Sample = size === "feature" || size === "wide" ? samples[tool.id] : undefined;
  const category = getCategory(tool.category).label;
  const tone = categoryStyles[tool.category];

  const badge = (
    <span className={cn("shrink-0 rounded-full border px-2.5 py-[3px] text-[12px] font-medium leading-4", tone.badge)}>{category}</span>
  );

  if (size === "banner") {
    return (
      <Link
        to={tool.link}
        className={cn(tileBase, "flex-row items-center gap-4 border-dashed border-line-strong bg-transparent py-[18px] hover:border-ink/25 sm:col-span-2 lg:col-span-4")}
      >
        <span className={cn("grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px]", tone.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-[-0.01em]">{tool.title}</span>
          <span className="block text-sm text-ink-3">{tool.description}</span>
        </span>
        <span className="hidden sm:inline-flex">{badge}</span>
        <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-[3px] text-[12px] font-medium leading-4 text-ink-3">In progress</span>
      </Link>
    );
  }

  const feature = size === "feature";
  return (
    <Link
      to={tool.link}
      className={cn(
        tileBase,
        "min-h-[164px] hover:-translate-y-0.5",
        feature
          ? "border-transparent bg-feature text-white sm:col-span-2 lg:row-span-2 dark:text-ink"
          : "border-line bg-surface hover:border-line-strong hover:shadow-lift",
        size === "wide" && "sm:col-span-2"
      )}
    >
      {/* The feature tile is dark in both themes, so ".dark" scopes its category tokens to the dark-theme hues. */}
      <span className={cn("flex items-start justify-between gap-3", feature && "dark")}>
        <span className={cn("grid h-[34px] w-[34px] place-items-center rounded-[9px]", tone.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        {badge}
      </span>
      <GoArrow className={cn("bottom-[22px]", feature ? "text-white/60" : "text-ink-3")} />
      {Sample && <Sample />}
      {tool.pair && (
        <span className="mt-3.5 flex items-center gap-1.5 font-mono text-[12px] font-medium text-ink-3">
          <span className="rounded-md border border-line-strong bg-paper px-[7px] py-[3px]">{tool.pair[0]}</span>→
          <span className="rounded-md border border-line-strong bg-paper px-[7px] py-[3px]">{tool.pair[1]}</span>
        </span>
      )}
      <h3 className="mt-auto pr-6 pt-[18px] font-semibold tracking-[-0.01em]">{tool.title}</h3>
      <p className={cn("mt-1 max-w-[44ch] pr-6 text-sm leading-normal", feature ? "text-white/65" : "text-ink-3")}>{tool.description}</p>
    </Link>
  );
};

export const ToolGrid = () => {
  const [filter, setFilter] = React.useState<Filter>("all");
  const visible = filter === "all" ? tools : tools.filter((tool) => tool.category === filter);

  const chips: { id: Filter; label: string; count: number; icon?: React.ElementType; tone?: string }[] = [
    { id: "all", label: "All", count: tools.length },
    ...categories.map((category) => ({
      id: category.id,
      label: category.label,
      count: countByCategory(category.id),
      icon: category.icon,
      tone: categoryStyles[category.id].text,
    })),
  ];

  return (
    <>
      <div role="group" aria-label="Filter tools by category" className="mt-9 flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const selected = chip.id === filter;
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(chip.id)}
              className={cn(
                "press inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                selected ? "border-transparent bg-primary text-primary-foreground" : "border-line-strong text-ink-2 hover:border-ink/25 hover:text-ink"
              )}
            >
              {Icon && <Icon className={cn("h-3.5 w-3.5", !selected && chip.tone)} />}
              {chip.label}
              <span className={cn("font-mono text-[11px]", selected ? "text-primary-foreground/60" : "text-ink-3")}>{chip.count}</span>
            </button>
          );
        })}
      </div>

      <div key={filter} className="mt-5 grid animate-fade-in grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((tool) => (
          <ToolTile key={tool.id} tool={tool} compact={filter !== "all"} />
        ))}
      </div>
    </>
  );
};
