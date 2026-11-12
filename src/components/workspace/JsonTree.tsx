import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

type Container = Record<string, unknown> | unknown[];

const isContainer = (value: unknown): value is Container => typeof value === "object" && value !== null;

const entriesOf = (value: Container): [string | number, unknown][] =>
  Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value);

const summary = (value: Container) => {
  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  const noun = Array.isArray(value) ? "item" : "key";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
};

const Primitive = ({ value }: { value: unknown }) => {
  if (typeof value === "string") return <span className="text-brand">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="text-warn">{String(value)}</span>;
  return <span className="text-code-blue">{String(value)}</span>;
};

const Key = ({ name }: { name: string | number }) =>
  typeof name === "number" ? <span className="text-ink-4">{name}</span> : <span className="text-ink">{JSON.stringify(name)}</span>;

interface NodeProps {
  name?: string | number;
  value: unknown;
  depth: number;
  expandDepth: number;
  last: boolean;
}

const Node = ({ name, value, depth, expandDepth, last }: NodeProps) => {
  const container = isContainer(value);
  const [open, setOpen] = React.useState(depth < expandDepth);
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const comma = last ? null : <span className="text-ink-3">,</span>;
  const label = name === undefined ? null : (
    <>
      <Key name={name} />
      <span className="text-ink-3">: </span>
    </>
  );

  if (!container) {
    return (
      <li className="whitespace-pre pl-[18px]">
        {label}
        <Primitive value={value} />
        {comma}
      </li>
    );
  }

  const isArray = Array.isArray(value);
  const [openBracket, closeBracket] = isArray ? ["[", "]"] : ["{", "}"];
  const entries = open ? entriesOf(value) : [];
  const empty = (isArray ? value.length : Object.keys(value).length) === 0;

  if (empty) {
    return (
      <li className="whitespace-pre pl-[18px]">
        {label}
        <span className="text-ink-3">
          {openBracket}
          {closeBracket}
        </span>
        {comma}
      </li>
    );
  }

  return (
    <li className="whitespace-pre">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group inline-flex items-center rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <ChevronRight className={cn("mr-0.5 h-4 w-4 shrink-0 text-ink-4 transition-transform duration-150 group-hover:text-ink-2", open && "rotate-90")} />
        {label}
        <span className="text-ink-3">{openBracket}</span>
        {!open && (
          <>
            <span className="mx-1 rounded bg-sunken px-1.5 text-[12px] text-ink-3">{summary(value)}</span>
            <span className="text-ink-3">{closeBracket}</span>
            {comma}
          </>
        )}
      </button>
      {open && (
        <>
          <ul className="ml-[7px] border-l border-line pl-[11px]">
            {entries.slice(0, limit).map(([key, child], index, shown) => (
              <Node
                key={key}
                name={key}
                value={child}
                depth={depth + 1}
                expandDepth={expandDepth}
                last={index === shown.length - 1 && entries.length <= limit}
              />
            ))}
            {entries.length > limit && (
              <li className="pl-[18px]">
                <button
                  type="button"
                  onClick={() => setLimit((current) => current + PAGE_SIZE * 5)}
                  className="rounded-[4px] text-[12px] text-ink-3 underline decoration-line-strong underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  Show {Math.min(PAGE_SIZE * 5, entries.length - limit)} more of {entries.length - limit}
                </button>
              </li>
            )}
          </ul>
          <div className="pl-[18px]">
            <span className="text-ink-3">{closeBracket}</span>
            {comma}
          </div>
        </>
      )}
    </li>
  );
};

interface JsonTreeProps {
  data: unknown;
  label: string;
  expandDepth: number;
  dimmed?: boolean;
}

export const JsonTree = React.memo(({ data, label, expandDepth, dimmed = false }: JsonTreeProps) => (
  <div
    role="region"
    aria-label={label}
    tabIndex={0}
    className={cn(
      "h-full overflow-auto outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30",
      dimmed && "opacity-45"
    )}
  >
    <ul className="w-max min-w-full px-3 py-3.5 font-mono text-[13px] leading-6 text-ink-2">
      <Node value={data} depth={0} expandDepth={expandDepth} last />
    </ul>
  </div>
));
JsonTree.displayName = "JsonTree";
