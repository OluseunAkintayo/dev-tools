import { ToolInputError } from "@/lib/toolError";

/**
 * A small JSONPath evaluator covering the common syntax:
 *   $                 root
 *   .key  ['key']     child by name (bracket form allows any characters)
 *   .*  [*]           all children
 *   ..key  ..*        recursive descent
 *   [0]  [-1]         array index (negative counts from the end)
 *   [1:3]  [::2]      array slice (start:end:step)
 *   [0,2]  ['a','b']  unions
 * Filter expressions ([?(...)]) and script expressions are not supported.
 */

type Selector =
  | { kind: "name"; name: string }
  | { kind: "wildcard" }
  | { kind: "index"; index: number }
  | { kind: "slice"; start?: number; end?: number; step?: number };

interface Segment {
  recursive: boolean;
  selectors: Selector[];
}

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

const IDENTIFIER = /^[A-Za-z_$][\w$-]*/;
const INTEGER = /^-?\d+$/;

const parseBracket = (body: string, column: number): Selector[] => {
  const trimmed = body.trim();
  if (!trimmed) fail(`Empty brackets at column ${column}.`);
  if (trimmed.startsWith("?") || trimmed.startsWith("(")) fail("Filter and script expressions are not supported. Use names, indexes, slices and wildcards.");
  if (trimmed === "*") return [{ kind: "wildcard" }];

  // Split on commas that are outside quotes.
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (quote) {
      current += char;
      if (char === "\\" && i + 1 < trimmed.length) current += trimmed[++i];
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"') {
      quote = char;
      current += char;
    } else if (char === ",") {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (quote) fail(`Unclosed quote at column ${column}.`);
  parts.push(current.trim());

  return parts.map((part): Selector => {
    if (!part) fail(`Empty entry in brackets at column ${column}.`);
    const quoted = /^(['"])((?:\\.|(?!\1).)*)\1$/.exec(part);
    if (quoted) return { kind: "name", name: quoted[2].replace(/\\(.)/g, "$1") };
    if (part === "*") return { kind: "wildcard" };
    if (INTEGER.test(part)) return { kind: "index", index: Number(part) };
    if (part.includes(":")) {
      const pieces = part.split(":");
      if (pieces.length > 3 || pieces.some((piece) => piece.trim() !== "" && !INTEGER.test(piece.trim()))) fail(`Invalid slice "${part}" at column ${column}.`);
      const [start, end, step] = pieces.map((piece) => (piece.trim() === "" ? undefined : Number(piece.trim())));
      if (step === 0) fail("Slice step cannot be 0.");
      return { kind: "slice", start, end, step };
    }
    return fail(`Unexpected "${part}" in brackets at column ${column}. Quote names, e.g. ['${part}'].`);
  });
};

export const parseJsonPath = (path: string): Segment[] => {
  const text = path.trim();
  if (!text.startsWith("$")) fail("A query starts with $, e.g. $.items[*].name");
  const segments: Segment[] = [];
  let i = 1;

  while (i < text.length) {
    const column = i + 1;
    let recursive = false;

    if (text.startsWith("..", i)) {
      recursive = true;
      i += 2;
    } else if (text[i] === ".") {
      i += 1;
    } else if (text[i] !== "[") {
      fail(`Unexpected "${text[i]}" at column ${column}. Use .key or ['key'].`);
    }

    if (text[i] === "[") {
      let j = i + 1;
      let quote: string | null = null;
      for (; j < text.length; j++) {
        const char = text[j];
        if (quote) {
          if (char === "\\") j++;
          else if (char === quote) quote = null;
        } else if (char === "'" || char === '"') quote = char;
        else if (char === "]") break;
      }
      if (j >= text.length) fail(`Missing ] for the bracket at column ${i + 1}.`);
      segments.push({ recursive, selectors: parseBracket(text.slice(i + 1, j), i + 1) });
      i = j + 1;
    } else if (text[i] === "*") {
      segments.push({ recursive, selectors: [{ kind: "wildcard" }] });
      i += 1;
    } else {
      const match = IDENTIFIER.exec(text.slice(i));
      if (!match) fail(i >= text.length ? "The query ends after a dot. Add a key name." : `Expected a key name at column ${i + 1}.`);
      segments.push({ recursive, selectors: [{ kind: "name", name: match![0] }] });
      i += match![0].length;
    }
  }
  return segments;
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const sliceArray = (items: unknown[], { start, end, step = 1 }: { start?: number; end?: number; step?: number }) => {
  const length = items.length;
  const normalize = (n: number) => (n < 0 ? Math.max(length + n, step > 0 ? 0 : -1) : Math.min(n, step > 0 ? length : length - 1));
  const result: unknown[] = [];
  if (step > 0) {
    const from = start === undefined ? 0 : normalize(start);
    const to = end === undefined ? length : normalize(end);
    for (let k = from; k < to; k += step) result.push(items[k]);
  } else {
    const from = start === undefined ? length - 1 : normalize(start);
    const to = end === undefined ? -1 : normalize(end);
    for (let k = from; k > to; k += step) result.push(items[k]);
  }
  return result;
};

const select = (value: unknown, selector: Selector): unknown[] => {
  switch (selector.kind) {
    case "name":
      return isObject(value) && Object.prototype.hasOwnProperty.call(value, selector.name) ? [value[selector.name]] : [];
    case "wildcard":
      return Array.isArray(value) ? value : isObject(value) ? Object.values(value) : [];
    case "index": {
      if (!Array.isArray(value)) return [];
      const index = selector.index < 0 ? value.length + selector.index : selector.index;
      return index >= 0 && index < value.length ? [value[index]] : [];
    }
    case "slice":
      return Array.isArray(value) ? sliceArray(value, selector) : [];
  }
};

const descendants = (value: unknown, out: unknown[] = []): unknown[] => {
  out.push(value);
  if (Array.isArray(value)) value.forEach((item) => descendants(item, out));
  else if (isObject(value)) Object.values(value).forEach((item) => descendants(item, out));
  return out;
};

/** Evaluate a JSONPath query. Always returns the list of matches (possibly empty). */
export const queryJsonPath = (data: unknown, path: string): unknown[] => {
  let nodes: unknown[] = [data];
  for (const segment of parseJsonPath(path)) {
    const sources = segment.recursive ? nodes.flatMap((node) => descendants(node)) : nodes;
    nodes = sources.flatMap((node) => segment.selectors.flatMap((selector) => select(node, selector)));
  }
  return nodes;
};
