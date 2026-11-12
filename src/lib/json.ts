/** Copy of a JSON value with object keys sorted alphabetically at every level. */
export const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])])
    );
  }
  return value;
};

/** "2" and "4" are spaces; "min" removes all whitespace. */
export type JsonIndent = "2" | "4" | "tab" | "min";

export const stringifyJson = (value: unknown, indent: JsonIndent) =>
  indent === "min" ? JSON.stringify(value) : JSON.stringify(value, null, indent === "tab" ? "\t" : Number(indent));
