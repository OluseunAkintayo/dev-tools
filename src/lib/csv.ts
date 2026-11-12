export const parseCsv = (text: string, delimiter = ","): string[][] => {
  if (delimiter.length !== 1) {
    throw new Error("Delimiter must be a single character.");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const pushField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };

  const pushRow = () => {
    pushField();
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += char;
      fieldStarted = true;
    }
  }

  if (inQuotes) {
    throw new Error("Invalid CSV: a quoted field is missing its closing quote.");
  }

  if (field !== "" || fieldStarted || row.length > 0) pushRow();

  return rows;
};

export const csvToObjects = (text: string, delimiter = ","): Record<string, string>[] => {
  const [headers, ...rows] = parseCsv(text, delimiter);
  if (!headers) throw new Error("The CSV data is empty.");

  return rows.map((values) =>
    headers.reduce<Record<string, string>>((obj, header, index) => {
      obj[header] = values[index] ?? "";
      return obj;
    }, {})
  );
};

export type ColumnType = "number" | "boolean" | "string";

/** Plain decimal numbers only. Leading zeros ("007", zip codes) and "+1" stay text. */
const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const BOOLEAN = /^(?:true|false)$/i;
const NULL = /^null$/i;

const isNumberCell = (value: string) => {
  if (!NUMBER.test(value)) return false;
  const number = Number(value);
  // Keep long integer IDs as text so they are not rounded.
  return Number.isFinite(number) && (!/^-?\d+$/.test(value) || Number.isSafeInteger(number));
};

/**
 * Detect a type per column: a column becomes number or boolean only when every non-empty
 * cell parses as that type. Empty cells and "null" in a typed column become null; columns
 * with any other text are left as strings so each key keeps one consistent type.
 */
export const inferColumnTypes = (rows: Record<string, string>[]): { rows: Record<string, unknown>[]; types: Record<string, ColumnType> } => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const types: Record<string, ColumnType> = {};

  for (const header of headers) {
    const cells = rows.map((row) => row[header]).filter((value) => value !== "" && !NULL.test(value));
    if (cells.length === 0) types[header] = "string";
    else if (cells.every(isNumberCell)) types[header] = "number";
    else if (cells.every((value) => BOOLEAN.test(value))) types[header] = "boolean";
    else types[header] = "string";
  }

  const convert = (value: string, type: ColumnType): unknown => {
    if (type === "string") return value;
    if (value === "" || NULL.test(value)) return null;
    return type === "number" ? Number(value) : value.toLowerCase() === "true";
  };

  return {
    rows: rows.map((row) => Object.fromEntries(headers.map((header) => [header, convert(row[header], types[header])]))),
    types,
  };
};

/** e.g. "Typed: 2 number, 1 boolean"; null when type detection is off. */
export const typeSummary = (types: Record<string, ColumnType> | null) => {
  if (!types) return null;
  const counts = Object.values(types).reduce<Record<string, number>>((acc, type) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }), {});
  const parts = (["number", "boolean"] as const).filter((type) => counts[type]).map((type) => `${counts[type]} ${type}`);
  return parts.length ? `Typed: ${parts.join(", ")}` : "All text";
};

/**
 * Turn dotted headers ("address.city") into nested objects, the reverse of how JSON to CSV
 * flattens them. A header stays flat when nesting would be ambiguous: empty segments
 * ("a..b", ".a") or a clash with another column ("a" next to "a.b").
 */
export const nestDottedKeys = (rows: Record<string, unknown>[]): { rows: Record<string, unknown>[]; nested: number } => {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const headerSet = new Set(headers);

  const paths = new Map<string, string[] | null>();
  for (const header of headers) {
    const parts = header.split(".");
    const valid = parts.length > 1 && parts.every((part) => part !== "");
    const clashes = valid && parts.slice(0, -1).some((_, index) => headerSet.has(parts.slice(0, index + 1).join(".")));
    paths.set(header, valid && !clashes ? parts : null);
  }

  const nested = [...paths.values()].filter(Boolean).length;
  if (nested === 0) return { rows, nested };

  const nestRow = (row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const header of headers) {
      const path = paths.get(header);
      if (!path) {
        result[header] = row[header];
        continue;
      }
      let target = result;
      for (const part of path.slice(0, -1)) {
        const next = target[part];
        if (typeof next !== "object" || next === null || Array.isArray(next)) target[part] = {};
        target = target[part] as Record<string, unknown>;
      }
      target[path[path.length - 1]] = row[header];
    }
    return result;
  };

  return { rows: rows.map(nestRow), nested };
};

export const escapeCsvValue = (value: string, delimiter = ","): string => {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const toCsv = (headers: string[], rows: string[][], delimiter = ","): string =>
  [headers, ...rows].map((row) => row.map((value) => escapeCsvValue(value, delimiter)).join(delimiter)).join("\n");
