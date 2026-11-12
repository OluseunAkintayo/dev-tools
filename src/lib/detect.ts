import { parseCsv } from "@/lib/csv";
import { isValidBase64, normalizeBase64 } from "@/lib/base64";
import type { ToolId } from "@/lib/tools";

export type DataFormat = "json" | "csv" | "xml" | "base64";

export interface Detection {
  format: DataFormat;
  label: string;
  /** Tools to suggest for this data, best first. */
  suggestions: { id: ToolId; hint?: string; options?: Record<string, string> }[];
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
  if (isObject || isObjectList) suggestions.push({ id: "json-to-interface", hint: "infer types" });
  if (isObject || isObjectList) suggestions.push({ id: "json-to-csv", hint: isObjectList ? plural((value as unknown[]).length, "row") : "1 row" });
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

const detectBase64 = (text: string): Detection | null => {
  if (text.length < 8 || /\s/.test(text.trim())) return null;
  const normalized = normalizeBase64(text);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || !isValidBase64(normalized).isValid) return null;
  // Require a mix of character classes so plain words are not mistaken for Base64.
  if (!/[0-9+/=]/.test(normalized) && !/[a-z][A-Z]|[A-Z][a-z].*[A-Z]/.test(normalized)) return null;
  return { format: "base64", label: "Looks like Base64", suggestions: [{ id: "base64", hint: "decode to text", options: { mode: "decode" } }] };
};

/** Best guess at what kind of data was pasted. Returns null for search-like text. */
export const detectFormat = (input: string): Detection | null => {
  const text = input.trim();
  if (!text || text.length > MAX_DETECT_LENGTH) return null;
  return detectJson(text) ?? detectXml(text) ?? detectCsv(text) ?? detectBase64(text);
};

/** Short single-line text is treated as a search query rather than data. */
export const looksLikeSearch = (input: string) => !input.includes("\n") && input.trim().length <= 48 && !/^[{[<]/.test(input.trim());
