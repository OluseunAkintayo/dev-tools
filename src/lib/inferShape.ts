import { isPlainObject } from "@/lib/utils";

/**
 * The inferred type of a JSON sample, shared by the TypeScript and Zod generators.
 * Arrays merge every item, so a key missing from some objects becomes optional and a
 * key whose type varies becomes a union.
 */

export type StringFormat = "email" | "url" | "uuid" | "datetime" | "date";

export type Shape =
  | { kind: "string"; format?: StringFormat }
  /** `integer` is false for decimals; `wide` marks whole numbers too big for 32 bits. */
  | { kind: "number"; integer: boolean; wide: boolean }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "unknown" } // items of an empty array
  | { kind: "array"; item: Shape }
  | { kind: "object"; fields: Field[] }
  | { kind: "union"; options: Shape[] };

export interface Field {
  key: string;
  shape: Shape;
  /** Missing from at least one of the objects merged into this shape. */
  optional: boolean;
}

const FORMATS: [StringFormat, RegExp][] = [
  ["uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
  ["datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/],
  ["date", /^\d{4}-\d{2}-\d{2}$/],
  ["email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
  ["url", /^https?:\/\/[^\s/$.?#][^\s]*$/i],
];

const stringFormat = (value: string): StringFormat | undefined => FORMATS.find(([, pattern]) => pattern.test(value))?.[0];

/** Union members of the same kind are merged, so each kind appears at most once. */
const slot = (shape: Shape) => shape.kind;

const addOption = (options: Shape[], shape: Shape): Shape[] => {
  if (shape.kind === "union") return shape.options.reduce(addOption, options);
  if (shape.kind === "unknown") return options;
  const index = options.findIndex((option) => slot(option) === slot(shape));
  if (index === -1) return [...options, shape];
  return options.map((option, i) => (i === index ? merge(option, shape) : option));
};

const mergeFields = (a: Field[], b: Field[]): Field[] => {
  const byKey = new Map(b.map((field) => [field.key, field]));
  const merged = a.map((field) => {
    const other = byKey.get(field.key);
    return other ? { key: field.key, shape: merge(field.shape, other.shape), optional: field.optional || other.optional } : { ...field, optional: true };
  });
  const seen = new Set(a.map((field) => field.key));
  return [...merged, ...b.filter((field) => !seen.has(field.key)).map((field) => ({ ...field, optional: true }))];
};

export const merge = (a: Shape, b: Shape): Shape => {
  if (a.kind === "unknown") return b;
  if (b.kind === "unknown") return a;
  if (a.kind === "union" || b.kind === "union" || a.kind !== b.kind) {
    const options = addOption(addOption([], a), b);
    return options.length === 1 ? options[0] : { kind: "union", options };
  }
  switch (a.kind) {
    case "string":
      return a.format && a.format === (b as typeof a).format ? a : { kind: "string" };
    case "number": {
      const other = b as typeof a;
      return { kind: "number", integer: a.integer && other.integer, wide: a.wide || other.wide };
    }
    case "array":
      return { kind: "array", item: merge(a.item, (b as typeof a).item) };
    case "object":
      return { kind: "object", fields: mergeFields(a.fields, (b as typeof a).fields) };
    default:
      return a;
  }
};

export const inferShape = (value: unknown): Shape => {
  if (value === null) return { kind: "null" };
  if (typeof value === "string") {
    const format = stringFormat(value);
    return format ? { kind: "string", format } : { kind: "string" };
  }
  if (typeof value === "number") {
    // JSON cannot tell 1 from 1.0, and a whole number beyond 64 bits is stored as a decimal.
    const integer = Number.isInteger(value) && Math.abs(value) < 2 ** 63;
    return { kind: "number", integer, wide: integer && Math.abs(value) > 2_147_483_647 };
  }
  if (typeof value === "boolean") return { kind: "boolean" };
  if (Array.isArray(value)) return { kind: "array", item: value.map(inferShape).reduce<Shape>(merge, { kind: "unknown" }) };
  if (isPlainObject(value)) return { kind: "object", fields: Object.entries(value).map(([key, item]) => ({ key, shape: inferShape(item), optional: false })) };
  return { kind: "unknown" };
};

/** Quote keys that are not valid identifiers. */
export const formatKey = (key: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key));

/**
 * "user profile" → "UserProfile", "order_item" → "OrderItem". Only the first letter of each
 * part changes, so "MyAPI" stays as typed. Leading digits are dropped.
 */
export const toTypeName = (name: string): string =>
  name
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/^\p{N}+/u, "");
