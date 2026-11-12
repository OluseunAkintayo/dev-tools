import { toCsv } from "@/lib/csv";
import { flattenNestedObject } from "@/lib/flattenNestedObject";
import { parseJson } from "@/lib/toolError";
import { isPlainObject } from "@/lib/utils";

export interface CsvResult {
  headers: string[];
  rows: string[][];
  csv: string;
}

const toCell = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/** Convert a JSON object or array of objects to CSV. Nested keys become dotted columns. */
export const jsonToCsv = (text: string): CsvResult => {
  const parsed = parseJson(text);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0 || !items.every(isPlainObject)) {
    throw new Error("JSON must be an object or a non-empty array of objects.");
  }
  const flattened = items.map((item) => flattenNestedObject(item));
  const headers = Array.from(new Set(flattened.flatMap((item) => Object.keys(item))));
  const rows = flattened.map((item) => headers.map((header) => toCell(item[header])));
  return { headers, rows, csv: toCsv(headers, rows) };
};
