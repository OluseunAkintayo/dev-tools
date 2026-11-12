import { parseCsv } from "@/lib/csv";
import { decodeFromBase64, isValidBase64, normalizeBase64 } from "@/lib/base64";
import { decodeJwt, relativeTime, timeState } from "@/lib/jwt";
import { parseTimestamp } from "@/lib/time";
import type { ToolId } from "@/lib/tools";

export type DataFormat = "json" | "csv" | "xml" | "yaml" | "base64" | "jwt" | "url" | "percent" | "timestamp" | "uuid";

export interface Detection {
  format: DataFormat;
  label: string;
  /** Tools to suggest for this data, best first. */
  suggestions: { id: ToolId; hint?: string; options?: Record<string, string> }[];
  /**
   * Unambiguous formats (a JWT, a URL, a UUID) win over tool search even when the
   * pasted text is short enough to look like a search query.
   */
  strong?: boolean;
}

const MAX_DETECT_LENGTH = 2_000_000;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const detectJson = (text: string): Detection | null => {
  const first = text[0];
  if (first !== "{" && first !== "[") return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const isArray = Array.isArray(value);
  const isObjectList = isArray && (value as unknown[]).length > 0 && (value as unknown[]).every((item) => typeof item === "object" && item !== null && !Array.isArray(item));
  const isObject = !isArray && typeof value === "object" && value !== null;
  const label = isArray ? `JSON array, ${plural((value as unknown[]).length, "item")}` : `JSON object, ${plural(Object.keys(value as object).length, "key")}`;

  const suggestions: Detection["suggestions"] = [{ id: "json-formatter", hint: "pretty print and validate" }];
  if (isObject || isObjectList) suggestions.push({ id: "json-to-interface", hint: "infer types" }, { id: "json-to-zod", hint: "validation schema" });
  if (isObject || isObjectList) suggestions.push({ id: "json-to-csv", hint: isObjectList ? plural((value as unknown[]).length, "row") : "1 row" });
  suggestions.push({ id: "json-to-yaml" });
  if (isObject) suggestions.push({ id: "json-to-xml" });
  return { format: "json", label, suggestions };
};

const detectXml = (text: string): Detection | null => {
  if (!text.startsWith("<")) return null;
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  const root = doc.documentElement?.nodeName ?? "root";
  return { format: "xml", label: `XML, <${root}> root`, suggestions: [{ id: "xml-to-json" }] };
};

/** "key: value", "- item" or "- key: value" at the start of a line. */
const YAML_LINE = /^\s*(?:-\s+)?(?:"[^"]*"|'[^']*'|[A-Za-z_$][\w$.-]*)\s*:(?:\s|$)|^\s*-\s+\S|^\s*-$/;

/**
 * A heuristic, so the YAML library stays out of the home page bundle: at least two
 * content lines (or a leading ---), nearly all of them keys or list items, and at least
 * one "key:" line. Comments and blank lines are ignored; indented lines continue a value.
 */
const detectYaml = (text: string): Detection | null => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));
  const documentStart = lines[0]?.trim() === "---";
  const content = documentStart ? lines.slice(1) : lines;
  if (content.length < 2 && !(documentStart && content.length >= 1)) return null;
  const topLevel = content.filter((line) => !/^\s/.test(line) || /^\s*-/.test(line));
  const structured = topLevel.filter((line) => YAML_LINE.test(line)).length;
  const hasKey = content.some((line) => /^\s*(?:-\s+)?[\w"'$.-]+\s*:(?:\s|$)/.test(line));
  if (!hasKey || structured / Math.max(topLevel.length, 1) < 0.9) return null;
  const keys = new Set(content.filter((line) => /^[\w"'$.-]+\s*:/.test(line)).map((line) => line.split(":")[0].trim()));
  return {
    format: "yaml",
    label: keys.size ? `YAML, ${plural(keys.size, "top-level key")}` : "YAML",
    suggestions: [{ id: "yaml-to-json", hint: "convert to JSON" }],
  };
};

const DELIMITERS = [",", ";", "\t", "|"];

const detectCsv = (text: string): Detection | null => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return null;
  for (const delimiter of DELIMITERS) {
    if (!lines[0].includes(delimiter)) continue;
    let rows: string[][];
    try {
      rows = parseCsv(text, delimiter);
    } catch {
      continue;
    }
    const width = rows[0]?.length ?? 0;
    if (width < 2) continue;
    const consistent = rows.slice(0, 50).filter((row) => row.length === width).length;
    if (consistent / Math.min(rows.length, 50) < 0.9) continue;
    const rowCount = rows.length - 1;
    const name = delimiter === "\t" ? "TSV" : "CSV";
    return {
      format: "csv",
      label: `${name}, ${plural(width, "column")}`,
      suggestions: [{ id: "csv-to-json", hint: `array of ${plural(rowCount, "object")}`, options: { delimiter } }],
    };
  }
  return null;
};

/** A three-part token whose header and payload both decode to JSON. */
const detectJwt = (text: string): Detection | null => {
  if (!/^(?:bearer\s+)?eyJ[\w-]*\.[\w-]+\.[\w-]*$/i.test(text)) return null;
  let token: ReturnType<typeof decodeJwt>;
  try {
    token = decodeJwt(text);
  } catch {
    return null;
  }
  const payload = token.payload as Record<string, unknown> | null;
  const state = timeState(token.payload);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  const hint = state === "expired" && exp ? `expired ${relativeTime(exp)}` : state === "valid" && exp ? `expires ${relativeTime(exp)}` : "decode and verify";
  return { format: "jwt", label: `JWT, ${token.alg || "no alg"}`, strong: true, suggestions: [{ id: "jwt", hint, options: { mode: "decode" } }] };
};

/** A single http(s) URL. Percent escapes also suggest decoding it. */
const detectUrl = (text: string): Detection | null => {
  if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(text)) return null;
  try {
    new URL(text);
  } catch {
    return null;
  }
  const suggestions: Detection["suggestions"] = [{ id: "url", hint: "split into parts and query", options: { mode: "parse" } }];
  if (/%[0-9A-Fa-f]{2}/.test(text)) suggestions.push({ id: "url", hint: "decode %-escapes", options: { mode: "decode" } });
  return { format: "url", label: "URL", strong: true, suggestions };
};

/** Text with %XX escapes that decodes to something different, e.g. "S%C3%A3o%20Paulo". */
const detectPercentEncoded = (text: string): Detection | null => {
  const escapes = text.match(/%[0-9A-Fa-f]{2}/g)?.length ?? 0;
  if (escapes < 1 || /\s/.test(text)) return null;
  try {
    if (decodeURIComponent(text) === text) return null;
  } catch {
    return null;
  }
  return { format: "percent", label: plural(escapes, "%-escape"), strong: true, suggestions: [{ id: "url", hint: "decode", options: { mode: "decode" } }] };
};

/** Unix seconds or milliseconds between 2001 and 2286, or an ISO 8601 date-time. */
const detectTimestamp = (text: string): Detection | null => {
  const numeric = /^\d{10}$|^\d{13}$/.test(text);
  const iso = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i.test(text);
  if (!numeric && !iso) return null;
  let ms: number;
  try {
    ms = parseTimestamp(text, "auto", "UTC").ms;
  } catch {
    return null;
  }
  const date = new Date(ms).toISOString().replace("T", " ").replace(/\.000Z$|Z$/, " UTC");
  const label = numeric ? `Unix timestamp, ${text.length === 10 ? "seconds" : "milliseconds"}` : "ISO date";
  return { format: "timestamp", label, strong: true, suggestions: [{ id: "timestamp", hint: numeric ? date : "convert to Unix time and other formats" }] };
};

const detectUuid = (text: string): Detection | null => {
  const match = /^(?:urn:uuid:)?\{?([0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f])[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12})\}?$/i.exec(text);
  if (!match) return null;
  const version = parseInt(match[2], 16);
  return {
    format: "uuid",
    label: version >= 1 && version <= 8 ? `UUID v${version}` : "UUID",
    strong: true,
    suggestions: [{ id: "uuid", hint: version === 1 || version === 6 || version === 7 ? "see when it was created" : "inspect version and variant" }],
  };
};

const detectBase64 = (text: string): Detection | null => {
  if (text.length < 8 || /\s/.test(text.trim())) return null;
  const normalized = normalizeBase64(text);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || !isValidBase64(normalized).isValid) return null;
  // Require a mix of character classes so plain words are not mistaken for Base64.
  if (!/[0-9+/=]/.test(normalized) && !/[a-z][A-Z]|[A-Z][a-z].*[A-Z]/.test(normalized)) return null;
  // The suggestion is "decode to text", so the result must be readable: valid UTF-8 and
  // almost all printable. Numbers, dates and IDs decode to binary noise and are skipped.
  let decoded: string;
  try {
    decoded = decodeFromBase64(normalized);
  } catch {
    return null;
  }
  const printable = decoded.replace(/[^\P{C}\t\n\r]/gu, "").length;
  if (!decoded || printable / decoded.length < 0.95) return null;
  return { format: "base64", label: "Looks like Base64", suggestions: [{ id: "base64", hint: "decode to text", options: { mode: "decode" } }] };
};

/**
 * Best guess at what kind of data was pasted. Returns null for search-like text.
 * Order matters: specific single-value formats are checked before the looser
 * structured ones, and Base64 (the loosest) comes last.
 */
export const detectFormat = (input: string): Detection | null => {
  const text = input.trim();
  if (!text || text.length > MAX_DETECT_LENGTH) return null;
  return (
    detectJson(text) ??
    detectXml(text) ??
    detectJwt(text) ??
    detectUrl(text) ??
    detectUuid(text) ??
    detectTimestamp(text) ??
    detectPercentEncoded(text) ??
    detectYaml(text) ??
    detectCsv(text) ??
    detectBase64(text)
  );
};

/** Short single-line text is treated as a search query rather than data. */
export const looksLikeSearch = (input: string) => !input.includes("\n") && input.trim().length <= 48 && !/^[{[<]/.test(input.trim());
